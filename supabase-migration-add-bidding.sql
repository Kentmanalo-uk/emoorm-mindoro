-- ============================================================
-- Bidding / Auction Feature Migration
-- Adds auction columns to facilities and creates a bids table
-- ============================================================

-- 1. Add auction columns to facilities (products) table
ALTER TABLE facilities ADD COLUMN IF NOT EXISTS "isAuction" boolean DEFAULT false;
ALTER TABLE facilities ADD COLUMN IF NOT EXISTS "startingBid" numeric DEFAULT 0;
ALTER TABLE facilities ADD COLUMN IF NOT EXISTS "currentBid" numeric DEFAULT 0;
ALTER TABLE facilities ADD COLUMN IF NOT EXISTS "currentBidderId" text DEFAULT null;
ALTER TABLE facilities ADD COLUMN IF NOT EXISTS "bidCount" integer DEFAULT 0;
ALTER TABLE facilities ADD COLUMN IF NOT EXISTS "auctionEndDate" timestamptz DEFAULT null;

-- 2. Create the bids table
CREATE TABLE IF NOT EXISTS bids (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  "productId" text NOT NULL,
  "bidderId" text NOT NULL,
  amount numeric NOT NULL,
  "createdAt" timestamptz DEFAULT now()
);

-- 3. Enable RLS on bids
ALTER TABLE bids ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can view bids on products (bid history is public)
DROP POLICY IF EXISTS "Anyone can view bids" ON bids;
CREATE POLICY "Anyone can view bids"
  ON bids FOR SELECT
  USING (true);

-- Users can insert their own bids
DROP POLICY IF EXISTS "Users can place bids" ON bids;
CREATE POLICY "Users can place bids"
  ON bids FOR INSERT
  WITH CHECK (auth.uid()::text = "bidderId"::text);

-- Users can delete their own bids
DROP POLICY IF EXISTS "Users can delete own bids" ON bids;
CREATE POLICY "Users can delete own bids"
  ON bids FOR DELETE
  USING (auth.uid()::text = "bidderId"::text);

-- Admin full access on bids
DROP POLICY IF EXISTS "Admins full access on bids" ON bids;
CREATE POLICY "Admins full access on bids"
  ON bids FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE users.id::text = auth.uid()::text AND users.role = 'admin'
    )
  );

-- 4. Enable realtime on bids table
ALTER PUBLICATION supabase_realtime ADD TABLE bids;
