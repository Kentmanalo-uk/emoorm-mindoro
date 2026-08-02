/**
 * POST /api/image-search
 *
 * Smarter traditional-CV image similarity search. NO AI, NO ML, NO embeddings.
 *
 * Signature per image = 3 complementary descriptors:
 *   1. Multi-tile HSV colour histogram  — 2x2 tiles x (18 hue x 8 sat) = 576 dims
 *      Captures spatial colour layout (top vs bottom, left vs right).
 *   2. Sobel edge-magnitude histogram   — 16 bins
 *      Captures shape / texture density (fuzzy fruit vs smooth handicraft).
 *   3. Perceptual dHash                 — 64-bit fingerprint
 *      Captures rough structural layout, invariant to colour shifts.
 *
 * Distance = 0.55 * avg(tile Bhattacharyya)
 *          + 0.25 * edge Bhattacharyya
 *          + 0.20 * (Hamming / 64)
 *
 * Post-ranking:
 *   - Category boost: if one category dominates the top 8, that category's
 *     distances are multiplied by 0.85 so related products cluster.
 *   - Adaptive cut-off: keep matches within (best + 0.18); min 3, max TOP_N.
 *
 * Product signatures are cached in-memory per lambda instance keyed by
 * imageUrl so repeat searches skip the download + hash step.
 */

import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { supabaseConfig } from "@/supabase/config";

export const dynamic = "force-dynamic";

// ── Supabase ─────────────────────────────────────────────────────────────────
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

// ── Parameters ───────────────────────────────────────────────────────────────
const HUE_BINS = 18;
const SAT_BINS = 8;
const EDGE_BINS = 16;
const TILE_GRID = 2;                 // 2x2 spatial grid
const RESIZE = 128;
const HASH_SIZE = 8;                 // dHash: 9x8 grayscale => 64 bits
const TOP_N = 12;
const MAX_PRODUCTS = 250;
const FETCH_TIMEOUT_MS = 4000;

// Combined-distance cutoff. Weights are already normalised to ~[0,1].
const HARD_CUTOFF = 0.55;
const ADAPTIVE_BAND = 0.18;
const MIN_RESULTS = 3;

// Descriptor weights (sum = 1)
const W_COLOR = 0.55;
const W_EDGE  = 0.25;
const W_HASH  = 0.20;

// ── Types ────────────────────────────────────────────────────────────────────
type Signature = {
  tiles: Float32Array[]; // TILE_GRID*TILE_GRID entries of HUE_BINS*SAT_BINS
  edge: Float32Array;    // EDGE_BINS
  hash: bigint;          // 64-bit dHash
};

// ── In-memory signature cache (per lambda instance) ─────────────────────────
const SIG_CACHE = new Map<string, Signature>();
const CACHE_LIMIT = 500;

function cacheGet(url: string): Signature | undefined {
  return SIG_CACHE.get(url);
}
function cacheSet(url: string, sig: Signature) {
  if (SIG_CACHE.size >= CACHE_LIMIT) {
    // drop oldest (Map preserves insertion order)
    const firstKey = SIG_CACHE.keys().next().value;
    if (firstKey) SIG_CACHE.delete(firstKey);
  }
  SIG_CACHE.set(url, sig);
}

// ── RGB → HSV ────────────────────────────────────────────────────────────────
function rgbToHsv(r: number, g: number, b: number): [number, number] {
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
  return [h, s];
}

// ── Build full signature from an image buffer ───────────────────────────────
async function buildSignature(imageBuffer: Buffer): Promise<Signature> {
  // Colour raw @ RESIZE
  const { data: rgb } = await sharp(imageBuffer)
    .resize(RESIZE, RESIZE, { fit: "fill" })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const tileSize = RESIZE / TILE_GRID;
  const tiles: Float32Array[] = [];
  for (let i = 0; i < TILE_GRID * TILE_GRID; i++) tiles.push(new Float32Array(HUE_BINS * SAT_BINS));
  const tilePixelCount = new Uint32Array(TILE_GRID * TILE_GRID);

  for (let y = 0; y < RESIZE; y++) {
    const ty = Math.min(Math.floor(y / tileSize), TILE_GRID - 1);
    for (let x = 0; x < RESIZE; x++) {
      const tx = Math.min(Math.floor(x / tileSize), TILE_GRID - 1);
      const tIdx = ty * TILE_GRID + tx;
      const p = (y * RESIZE + x) * 3;
      const [h, s] = rgbToHsv(rgb[p], rgb[p + 1], rgb[p + 2]);
      const hBin = Math.min(Math.floor(h / (360 / HUE_BINS)), HUE_BINS - 1);
      const sBin = Math.min(Math.floor(s * SAT_BINS), SAT_BINS - 1);
      tiles[tIdx][hBin * SAT_BINS + sBin]++;
      tilePixelCount[tIdx]++;
    }
  }
  for (let t = 0; t < tiles.length; t++) {
    const denom = tilePixelCount[t] || 1;
    for (let i = 0; i < tiles[t].length; i++) tiles[t][i] /= denom;
  }

  // Grayscale @ RESIZE for edges
  const { data: gray } = await sharp(imageBuffer)
    .resize(RESIZE, RESIZE, { fit: "fill" })
    .grayscale()
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const edge = new Float32Array(EDGE_BINS);
  let edgeCount = 0;
  for (let y = 1; y < RESIZE - 1; y++) {
    for (let x = 1; x < RESIZE - 1; x++) {
      const i = y * RESIZE + x;
      // Sobel Gx, Gy on single grayscale channel
      const gx =
        -gray[i - RESIZE - 1] - 2 * gray[i - 1] - gray[i + RESIZE - 1] +
         gray[i - RESIZE + 1] + 2 * gray[i + 1] + gray[i + RESIZE + 1];
      const gy =
        -gray[i - RESIZE - 1] - 2 * gray[i - RESIZE] - gray[i - RESIZE + 1] +
         gray[i + RESIZE - 1] + 2 * gray[i + RESIZE] + gray[i + RESIZE + 1];
      const mag = Math.min(255, Math.hypot(gx, gy) / 4);
      const bin = Math.min(Math.floor((mag / 256) * EDGE_BINS), EDGE_BINS - 1);
      edge[bin]++;
      edgeCount++;
    }
  }
  for (let i = 0; i < edge.length; i++) edge[i] /= edgeCount || 1;

  // dHash: resize to (HASH_SIZE+1) x HASH_SIZE grayscale, compare rows
  const { data: hashPix } = await sharp(imageBuffer)
    .resize(HASH_SIZE + 1, HASH_SIZE, { fit: "fill" })
    .grayscale()
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  let hash = 0n;
  for (let y = 0; y < HASH_SIZE; y++) {
    for (let x = 0; x < HASH_SIZE; x++) {
      const left = hashPix[y * (HASH_SIZE + 1) + x];
      const right = hashPix[y * (HASH_SIZE + 1) + x + 1];
      hash = (hash << 1n) | (left > right ? 1n : 0n);
    }
  }

  return { tiles, edge, hash };
}

// ── Distance helpers ─────────────────────────────────────────────────────────
function bhattacharyya(h1: Float32Array, h2: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < h1.length; i++) sum += Math.sqrt(h1[i] * h2[i]);
  return Math.sqrt(Math.max(0, 1 - Math.min(Math.max(sum, 0), 1)));
}
function hamming64(a: bigint, b: bigint): number {
  let x = a ^ b;
  let count = 0;
  while (x) { x &= x - 1n; count++; }
  return count;
}
function combinedDistance(a: Signature, b: Signature): number {
  let tileSum = 0;
  for (let t = 0; t < a.tiles.length; t++) tileSum += bhattacharyya(a.tiles[t], b.tiles[t]);
  const colorD = tileSum / a.tiles.length;
  const edgeD = bhattacharyya(a.edge, b.edge);
  const hashD = hamming64(a.hash, b.hash) / 64;
  return W_COLOR * colorD + W_EDGE * edgeD + W_HASH * hashD;
}

// ── Fetch with timeout ──────────────────────────────────────────────────────
async function fetchImageBuffer(url: string, timeoutMs = FETCH_TIMEOUT_MS): Promise<Buffer | null> {
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

    // 1. Build query signature
    const queryBuffer = Buffer.from(await file.arrayBuffer());
    const querySig = await buildSignature(queryBuffer);

    // 2. Fetch product list
    const { data: products, error } = await getSupabase()
      .from("facilities")
      .select("id, name, imageUrl, category")
      .not("imageUrl", "is", null)
      .limit(MAX_PRODUCTS);

    if (error || !products || products.length === 0) {
      return NextResponse.json({ ids: [], error: "No products found" }, { status: 200 });
    }

    // 3. Compute distances (batched, uses cache)
    type Scored = { id: string; distance: number; name: string; category: string };
    const BATCH = 20;
    const results: Scored[] = [];

    for (let i = 0; i < products.length; i += BATCH) {
      const batch = products.slice(i, i + BATCH);
      const scored = await Promise.all(
        batch.map(async (p): Promise<Scored> => {
          const fallback: Scored = { id: p.id, distance: 1, name: p.name, category: p.category };
          try {
            let sig = cacheGet(p.imageUrl);
            if (!sig) {
              const buf = await fetchImageBuffer(p.imageUrl);
              if (!buf) return fallback;
              sig = await buildSignature(buf);
              cacheSet(p.imageUrl, sig);
            }
            return { id: p.id, distance: combinedDistance(querySig, sig), name: p.name, category: p.category };
          } catch {
            return fallback;
          }
        }),
      );
      results.push(...scored);
    }

    // 4. Category boost — if one category dominates the top 8, favour it
    results.sort((a, b) => a.distance - b.distance);
    const catCounts: Record<string, number> = {};
    results.slice(0, 8).forEach((r) => {
      if (r.category) catCounts[r.category] = (catCounts[r.category] || 0) + 1;
    });
    const [dominantCat, dominantCount] = Object.entries(catCounts).sort((a, b) => b[1] - a[1])[0] ?? ["", 0];
    if (dominantCat && dominantCount >= 3) {
      for (const r of results) {
        if (r.category === dominantCat) r.distance *= 0.85;
      }
      results.sort((a, b) => a.distance - b.distance);
    }

    // 5. Adaptive cutoff — keep matches within (best + band), respect min/max
    const best = results[0]?.distance ?? 1;
    const bandCutoff = Math.min(HARD_CUTOFF, best + ADAPTIVE_BAND);
    let top = results.filter((r) => r.distance <= bandCutoff);
    if (top.length < MIN_RESULTS) top = results.slice(0, MIN_RESULTS);
    top = top.slice(0, TOP_N);

    // 6. Report dominant category from final top set
    const finalCat: Record<string, number> = {};
    top.slice(0, 5).forEach((r) => { if (r.category) finalCat[r.category] = (finalCat[r.category] || 0) + 1; });
    const topCategory = Object.entries(finalCat).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";

    return NextResponse.json({
      ids: top.map((r) => r.id),
      category: topCategory,
      confidence: Number((1 - best).toFixed(3)),
    });
  } catch (err) {
    console.error("[image-search] Error:", err);
    return NextResponse.json({ error: "Failed to process image" }, { status: 500 });
  }
}
