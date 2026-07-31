-- Add fulfillment option columns to stores table
ALTER TABLE stores ADD COLUMN IF NOT EXISTS "offersDelivery" boolean DEFAULT true;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS "offersPickup" boolean DEFAULT true;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS "qrphUrl" text;

-- Add fulfillment method column to bookings table
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS "fulfillmentMethod" text;

-- Add GCash payment proof columns to bookings table
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS "gcashProofUrl" text;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS "gcashRef" text;
