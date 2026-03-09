-- Migration: Restructure assets + add parent_creative_id for resize tracking
-- Run this in Supabase SQL Editor

-- 1. Add parent_creative_id and aspect_ratio to creatives table
ALTER TABLE creatives
  ADD COLUMN IF NOT EXISTS parent_creative_id UUID REFERENCES creatives(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS aspect_ratio TEXT;

CREATE INDEX IF NOT EXISTS idx_creatives_parent_id ON creatives(parent_creative_id);

-- 2. Add assets_data JSONB column to clients table
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS assets_data JSONB DEFAULT '{"logos":[],"creatives_reference":[],"landing_pages_reference":[]}';

-- 3. Migrate existing assets array data into assets_data.logos
UPDATE clients
SET assets_data = jsonb_build_object(
  'logos', COALESCE(array_to_json(assets)::jsonb, '[]'::jsonb),
  'creatives_reference', '[]'::jsonb,
  'landing_pages_reference', '[]'::jsonb
)
WHERE assets IS NOT NULL AND array_length(assets, 1) > 0;

-- 4. Drop the old assets column
ALTER TABLE clients DROP COLUMN IF EXISTS assets;
