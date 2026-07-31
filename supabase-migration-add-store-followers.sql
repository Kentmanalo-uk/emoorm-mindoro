-- ============================================================
-- Store Followers Feature Migration
-- Creates store_followers table with RLS for follow/unfollow
-- ============================================================

-- 1. Create the store_followers table
CREATE TABLE IF NOT EXISTS store_followers (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  "storeId" text NOT NULL,
  "userId" text NOT NULL,
  "createdAt" timestamptz DEFAULT now(),
  UNIQUE("storeId", "userId")
);

-- 2. Add followerCount column to stores if missing
ALTER TABLE stores ADD COLUMN IF NOT EXISTS "followerCount" integer DEFAULT 0;

-- 3. Enable RLS
ALTER TABLE store_followers ENABLE ROW LEVEL SECURITY;

-- Anyone can view followers (public follow counts)
DROP POLICY IF EXISTS "Anyone can view followers" ON store_followers;
CREATE POLICY "Anyone can view followers"
  ON store_followers FOR SELECT
  USING (true);

-- Users can follow stores (insert their own rows)
DROP POLICY IF EXISTS "Users can follow stores" ON store_followers;
CREATE POLICY "Users can follow stores"
  ON store_followers FOR INSERT
  WITH CHECK (auth.uid()::text = "userId"::text);

-- Users can unfollow stores (delete their own rows)
DROP POLICY IF EXISTS "Users can unfollow stores" ON store_followers;
CREATE POLICY "Users can unfollow stores"
  ON store_followers FOR DELETE
  USING (auth.uid()::text = "userId"::text);

-- Admin full access
DROP POLICY IF EXISTS "Admins full access on store_followers" ON store_followers;
CREATE POLICY "Admins full access on store_followers"
  ON store_followers FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE users.id::text = auth.uid()::text AND users.role = 'admin'
    )
  );

-- 4. Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE store_followers;
