-- Add fulfillmentMethod column to bookings table for delivery/pickup support
ALTER TABLE bookings ADD COLUMN fulfillmentMethod text;