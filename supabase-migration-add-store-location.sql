-- Add latitude and longitude columns to stores table for map pin feature
ALTER TABLE stores ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

-- Optional: add index for geospatial queries
CREATE INDEX IF NOT EXISTS idx_stores_location ON stores (latitude, longitude);
