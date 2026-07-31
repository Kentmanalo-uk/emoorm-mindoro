-- Migration: Add 'sold' column to 'facilities' table for product sold count
ALTER TABLE facilities ADD COLUMN sold integer NOT NULL DEFAULT 0;