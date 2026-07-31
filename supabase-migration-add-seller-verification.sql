-- Add seller verification system
-- Adds 'verified' boolean column to stores table to enable admin approval of sellers

ALTER TABLE stores 
ADD COLUMN verified BOOLEAN DEFAULT FALSE,
ADD COLUMN verified_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN verified_by_admin_id TEXT DEFAULT NULL,
ADD COLUMN verification_notes TEXT DEFAULT NULL;

-- Create index for faster filtering
CREATE INDEX idx_stores_verified ON stores(verified);
