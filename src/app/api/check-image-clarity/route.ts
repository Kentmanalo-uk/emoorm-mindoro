import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';

/**
 * POST /api/check-image-clarity
 *
 * Accepts a multipart form with an "image" field.
 * Converts the image to grayscale, computes the Laplacian variance
 * (a standard measure of image sharpness), and returns { isClear, score }.
 *
 * Images with a variance below the threshold are considered blurry.
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('image') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // ------------------------------------------------------------------
    // Blur detection via Laplacian variance
    // 1. Convert to grayscale and resize to a manageable size for speed
    // 2. Apply a Laplacian-like convolution (edge-detect kernel)
    // 3. Compute the variance of the result — low variance = blurry
    // ------------------------------------------------------------------

    const RESIZE_DIM = 512; // work on a consistent resolution

    const grayscale = await sharp(buffer)
      .resize(RESIZE_DIM, RESIZE_DIM, { fit: 'inside' })
      .grayscale()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const { data: grayData, info } = grayscale;
    const { width, height } = info;

    // Apply a 3×3 Laplacian kernel:  [0, 1, 0]
    //                                  [1,-4, 1]
    //                                  [0, 1, 0]
    // and compute the variance of the output.
    let sum = 0;
    let sumSq = 0;
    let count = 0;

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = y * width + x;
        const laplacian =
          grayData[idx - width] +          // top
          grayData[idx - 1] +              // left
          -4 * grayData[idx] +             // center
          grayData[idx + 1] +              // right
          grayData[idx + width];           // bottom

        sum += laplacian;
        sumSq += laplacian * laplacian;
        count++;
      }
    }

    const mean = sum / count;
    const variance = sumSq / count - mean * mean;

    // Threshold — tuned for typical ID photos.
    // Higher = sharper. Typical clear photos score 500–3000+.
    // Blurry photos usually fall below 100.
    const BLUR_THRESHOLD = 100;
    const isClear = variance >= BLUR_THRESHOLD;

    return NextResponse.json({
      isClear,
      score: Math.round(variance),
      threshold: BLUR_THRESHOLD,
    });
  } catch (err: unknown) {
    console.error('[check-image-clarity] Error:', err);
    return NextResponse.json(
      { error: 'Failed to process image' },
      { status: 500 },
    );
  }
}
