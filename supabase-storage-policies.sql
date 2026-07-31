-- ============================================
-- Run this in Supabase Dashboard → SQL Editor
-- Creates storage buckets + RLS policies
-- ============================================

-- 1. Create buckets (if they don't exist)
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT (id) DO UPDATE SET public = true;
INSERT INTO storage.buckets (id, name, public) VALUES ('stores', 'stores', true) ON CONFLICT (id) DO UPDATE SET public = true;
INSERT INTO storage.buckets (id, name, public) VALUES ('products', 'products', true) ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload avatars"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "Authenticated users can upload store images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'stores');

CREATE POLICY "Authenticated users can upload product images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'products');

-- 3. Allow authenticated users to update (overwrite) their uploads
CREATE POLICY "Authenticated users can update avatars"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'avatars');

CREATE POLICY "Authenticated users can update store images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'stores');

CREATE POLICY "Authenticated users can update product images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'products');

-- 4. Allow anyone to read/view images (public buckets)
CREATE POLICY "Public read access for avatars"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');

CREATE POLICY "Public read access for store images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'stores');

CREATE POLICY "Public read access for product images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'products');

-- 5. Allow authenticated users to delete their own uploads
CREATE POLICY "Authenticated users can delete avatars"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'avatars');

CREATE POLICY "Authenticated users can delete store images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'stores');

CREATE POLICY "Authenticated users can delete product images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'products');
