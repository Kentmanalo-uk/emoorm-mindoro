'use client';

import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Upload an image file to Supabase Storage and return its public URL.
 *
 * @param supabase  - Supabase client instance
 * @param bucket   - Storage bucket name (e.g. "avatars", "products", "stores")
 * @param file     - File to upload
 * @param pathPrefix - Path prefix inside the bucket (e.g. "user123")
 * @returns The public URL of the uploaded image
 */
export async function uploadImage(
  supabase: SupabaseClient,
  bucket: string,
  file: File,
  pathPrefix: string,
): Promise<string> {
  const ext = file.name.split('.').pop() || 'jpg';
  const filePath = `${pathPrefix}_${Date.now()}.${ext}`;

  const { error } = await supabase.storage
    .from(bucket)
    .upload(filePath, file, { upsert: true });

  if (error) throw error;

  const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
  return data.publicUrl;
}
