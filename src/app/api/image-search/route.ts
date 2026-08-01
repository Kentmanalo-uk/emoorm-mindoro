/**
 * POST /api/image-search
 *
 * Traditional Computer Vision image similarity search.
 * NO AI, NO ML, NO embeddings.
 *
 * Algorithm:
 *   1. Convert query image to HSV color space using sharp (raw pixels)
 *   2. Build a normalised H+S histogram (18 hue bins × 8 sat bins = 144 dims)
 *   3. Fetch all product image URLs from Supabase
 *   4. For each product image: download → histogram → Bhattacharyya distance
 *   5. Return top-N product IDs sorted by similarity (lowest distance = best match)
 *
 * Why HSV histograms?
 *   Colour distributions are the most robust traditional CV signal for
 *   product similarity — a red tomato and a ripe mango look very different
 *   in HSV space, while two tomatoes from different angles match well.
 *   Bhattacharyya distance is the standard metric for histogram comparison
 *   (used in OpenCV's compareHist with HISTCMP_BHATTACHARYYA).
 */

import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { supabaseConfig } from "@/supabase/config";

export const dynamic = "force-dynamic";

// ── Supabase (service-role for reading facilities) ───────────────────────────
let _supabase: SupabaseClient | null = null;
function getSupabase(): SupabaseClient {
  if (_supabase) return _supabase;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || supabaseConfig.url;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    supabaseConfig.anonKey;
  _supabase = createClient(url, key);
  return _supabase;
}

// ── Histogram parameters ─────────────────────────────────────────────────────
const HUE_BINS = 18;   // 0-360 → 18 bins of 20° each
const SAT_BINS = 8;    // 0-255 → 8 bins
const RESIZE = 128;    // work on 128×128 for speed
const TOP_N = 12;      // max results to return
const MAX_PRODUCTS = 200; // cap to avoid timeout
// Bhattacharyya distance threshold — above this = too different to be relevant.
// 0 = identical colours, 1 = completely different.
// 0.40 keeps products that share a clear colour family (e.g. green vegetables,
// red fruits, brown handicrafts) and cuts off unrelated products.
const SIMILARITY_THRESHOLD = 0.40;

// ── RGB → HSV conversion (pure math, no libs) ────────────────────────────────
function rgbToHsv(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;

  let h = 0;
  if (delta !== 0) {
    if (max === rn) h = 60 * (((gn - bn) / delta) % 6);
    else if (max === gn) h = 60 * ((bn - rn) / delta + 2);
    else h = 60 * ((rn - gn) / delta + 4);
    if (h < 0) h += 360;
  }

  const s = max === 0 ? 0 : delta / max;
  return [h, s, max];
}

// ── Build normalised H+S 2-D histogram (flattened to 1-D) ───────────────────
async function buildHistogram(imageBuffer: Buffer): Promise<Float32Array> {
  const { data, info } = await sharp(imageBuffer)
    .resize(RESIZE, RESIZE, { fit: "fill" })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const bins = new Float32Array(HUE_BINS * SAT_BINS);
  const pixelCount = info.width * info.height;

  for (let i = 0; i < pixelCount; i++) {
    const r = data[i * 3];
    const g = data[i * 3 + 1];
    const b = data[i * 3 + 2];
    const [h, s] = rgbToHsv(r, g, b);
    const hBin = Math.min(Math.floor(h / (360 / HUE_BINS)), HUE_BINS - 1);
    const sBin = Math.min(Math.floor(s * SAT_BINS), SAT_BINS - 1);
    bins[hBin * SAT_BINS + sBin]++;
  }

  // Normalise
  for (let i = 0; i < bins.length; i++) bins[i] /= pixelCount;
  return bins;
}

// ── Bhattacharyya distance (same formula as OpenCV HISTCMP_BHATTACHARYYA) ────
function bhattacharyya(h1: Float32Array, h2: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < h1.length; i++) sum += Math.sqrt(h1[i] * h2[i]);
  // Clamp to avoid NaN from floating point noise
  const clamped = Math.min(Math.max(sum, 0), 1);
  return Math.sqrt(Math.max(0, 1 - clamped));
}

// ── Fetch image buffer with timeout ─────────────────────────────────────────
async function fetchImageBuffer(url: string, timeoutMs = 4000): Promise<Buffer | null> {
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(id);
    if (!res.ok) return null;
    const ab = await res.arrayBuffer();
    return Buffer.from(ab);
  } catch {
    return null;
  }
}

// ── Main handler ─────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("image") as File | null;
    if (!file) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    // 1. Build query histogram
    const queryBuffer = Buffer.from(await file.arrayBuffer());
    const queryHist = await buildHistogram(queryBuffer);

    // 2. Fetch product list from Supabase
    const { data: products, error } = await getSupabase()
      .from("facilities")
      .select("id, name, imageUrl, category")
      .not("imageUrl", "is", null)
      .limit(MAX_PRODUCTS);

    if (error || !products || products.length === 0) {
      return NextResponse.json({ ids: [], error: "No products found" }, { status: 200 });
    }

    // 3. Compare histograms in parallel (batched to avoid timeout)
    const BATCH = 20;
    const results: { id: string; distance: number; name: string; category: string }[] = [];

    for (let i = 0; i < products.length; i += BATCH) {
      const batch = products.slice(i, i + BATCH);
      const distances = await Promise.all(
        batch.map(async (p) => {
          const buf = await fetchImageBuffer(p.imageUrl);
          if (!buf) return { id: p.id, distance: 1, name: p.name, category: p.category };
          try {
            const hist = await buildHistogram(buf);
            const distance = bhattacharyya(queryHist, hist);
            return { id: p.id, distance, name: p.name, category: p.category };
          } catch {
            return { id: p.id, distance: 1, name: p.name, category: p.category };
          }
        }),
      );
      results.push(...distances);
    }

    // 4. Sort by distance ascending, apply threshold, cap at TOP_N
    results.sort((a, b) => a.distance - b.distance);

    const top = results
      .filter((r) => r.distance <= SIMILARITY_THRESHOLD)
      .slice(0, TOP_N);

    const ids = top.map((r) => r.id);

    // Derive a dominant category from the top matches for the URL
    const catCounts: Record<string, number> = {};
    top.slice(0, 5).forEach((r) => {
      if (r.category) catCounts[r.category] = (catCounts[r.category] || 0) + 1;
    });
    const topCategory = Object.entries(catCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";

    return NextResponse.json({ ids, category: topCategory });
  } catch (err) {
    console.error("[image-search] Error:", err);
    return NextResponse.json({ error: "Failed to process image" }, { status: 500 });
  }
}
