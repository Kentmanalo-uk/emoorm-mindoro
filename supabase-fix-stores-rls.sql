-- Fix: Enable RLS on stores table and add admin policies
-- This ensures only admins can update store verification status

-- Step 1: Check if stores table has RLS enabled
-- If you see "Policies: 0" in Supabase Dashboard, RLS is disabled
-- If you see policies listed, RLS is enabled

-- Step 2: Enable RLS on stores table (if not already enabled)
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;

-- Step 3: Drop existing policies (if any)
DROP POLICY IF EXISTS "Public read access to stores" ON stores;
DROP POLICY IF EXISTS "Users can update own stores" ON stores;
DROP POLICY IF EXISTS "Admins full access on stores" ON stores;
DROP POLICY IF EXISTS "Anyone can view stores" ON stores;

-- Step 4: Create public read policy (anyone can view)
CREATE POLICY "Anyone can view stores"
ON stores FOR SELECT
TO public
USING (true);

-- Step 5: Create policy for sellers to update their own stores
CREATE POLICY "Users can update own stores"
ON stores FOR UPDATE
TO authenticated
USING (auth.uid() = "ownerId" OR
       (SELECT role FROM users WHERE id = auth.uid()) = 'admin')
WITH CHECK (auth.uid() = "ownerId" OR
            (SELECT role FROM users WHERE id = auth.uid()) = 'admin');

-- Step 6: Create policy for admins to update ANY store (especially verified field)
CREATE POLICY "Admins full access on stores"
ON stores FOR ALL
TO authenticated
USING ((SELECT role FROM users WHERE id = auth.uid()) = 'admin')
WITH CHECK ((SELECT role FROM users WHERE id = auth.uid()) = 'admin');

-- Step 7: Allow insertions by authenticated users (for creating new stores)
CREATE POLICY "Authenticated users can insert stores"
ON stores FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = "ownerId");

-- Step 8: Verify the verified column exists and has correct type
-- If this fails, uncomment below to add it
-- ALTER TABLE stores ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT FALSE;
-- ALTER TABLE stores ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;
-- ALTER TABLE stores ADD COLUMN IF NOT EXISTS verified_by_admin_id TEXT DEFAULT NULL;

-- Check current setup
SELECT
  schemaname,
  tablename,
  (SELECT string_agg(policyname, ', ') FROM pg_policies WHERE tablename = t.tablename) as policies
FROM pg_tables t
WHERE tablename = 'stores';
