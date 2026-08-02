-- Fix: Public read access for facilities (products) so store detail pages
-- and the home browse grid work for anonymous / non-owner visitors.
-- Sellers keep write access to their own rows; admins retain full access.

-- 1. Enable RLS (safe if already enabled)
ALTER TABLE facilities ENABLE ROW LEVEL SECURITY;

-- 2. Clean slate — drop any legacy / conflicting policies
DROP POLICY IF EXISTS "Anyone can view facilities" ON facilities;
DROP POLICY IF EXISTS "Public read access to facilities" ON facilities;
DROP POLICY IF EXISTS "Sellers manage own facilities" ON facilities;
DROP POLICY IF EXISTS "Sellers can insert own facilities" ON facilities;
DROP POLICY IF EXISTS "Sellers can update own facilities" ON facilities;
DROP POLICY IF EXISTS "Sellers can delete own facilities" ON facilities;
DROP POLICY IF EXISTS "Admins full access on facilities" ON facilities;

-- 3. Public read (anon + authenticated)
CREATE POLICY "Anyone can view facilities"
  ON facilities FOR SELECT
  TO public
  USING (true);

-- 4. Sellers can create their own products
CREATE POLICY "Sellers can insert own facilities"
  ON facilities FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid()::text = "sellerId"::text
    OR auth.uid()::text = "storeId"::text
  );

-- 5. Sellers can update their own products (admins also allowed via policy #7)
CREATE POLICY "Sellers can update own facilities"
  ON facilities FOR UPDATE
  TO authenticated
  USING (
    auth.uid()::text = "sellerId"::text
    OR auth.uid()::text = "storeId"::text
  )
  WITH CHECK (
    auth.uid()::text = "sellerId"::text
    OR auth.uid()::text = "storeId"::text
  );

-- 6. Sellers can delete their own products
CREATE POLICY "Sellers can delete own facilities"
  ON facilities FOR DELETE
  TO authenticated
  USING (
    auth.uid()::text = "sellerId"::text
    OR auth.uid()::text = "storeId"::text
  );

-- 7. Admin override
CREATE POLICY "Admins full access on facilities"
  ON facilities FOR ALL
  TO authenticated
  USING (
    (SELECT role FROM users WHERE id::text = auth.uid()::text) = 'admin'
  )
  WITH CHECK (
    (SELECT role FROM users WHERE id::text = auth.uid()::text) = 'admin'
  );

-- 8. Backfill any legacy rows that only have one of the two ownership columns
--    (products created before both columns were consistently written).
UPDATE facilities
SET "storeId" = "sellerId"
WHERE "storeId" IS NULL AND "sellerId" IS NOT NULL;

UPDATE facilities
SET "sellerId" = "storeId"
WHERE "sellerId" IS NULL AND "storeId" IS NOT NULL;

-- 9. Make sure realtime broadcasts include facilities (idempotent)
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE facilities;
  EXCEPTION WHEN duplicate_object THEN
    -- already in publication, ignore
    NULL;
  END;
END $$;

-- 10. Verify
SELECT
  tablename,
  (SELECT string_agg(policyname, ', ')
     FROM pg_policies
     WHERE tablename = t.tablename) AS policies
FROM pg_tables t
WHERE tablename = 'facilities';
