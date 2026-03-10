-- Migration: Add client_type column to clients table
-- This enables explicit Product-based vs Service-based client classification
-- instead of keyword-based inference at prompt-build time.

ALTER TABLE clients
ADD COLUMN IF NOT EXISTS client_type TEXT DEFAULT 'product';

-- Add check constraint to restrict values
ALTER TABLE clients
ADD CONSTRAINT clients_client_type_check
CHECK (client_type IN ('product', 'service'));

-- Update RLS policy if needed (existing policies should cover this new column automatically)
