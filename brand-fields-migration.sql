-- Migration: Add comprehensive brand document fields to clients table
-- Run this in Supabase SQL Editor

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS brand_description TEXT,
  ADD COLUMN IF NOT EXISTS target_audience TEXT,
  ADD COLUMN IF NOT EXISTS visual_vibe TEXT,
  ADD COLUMN IF NOT EXISTS primary_color TEXT,
  ADD COLUMN IF NOT EXISTS secondary_color TEXT,
  ADD COLUMN IF NOT EXISTS other_colors TEXT,
  ADD COLUMN IF NOT EXISTS gradient_variations TEXT,
  ADD COLUMN IF NOT EXISTS heading_font TEXT,
  ADD COLUMN IF NOT EXISTS body_font TEXT,
  ADD COLUMN IF NOT EXISTS style_font TEXT,
  ADD COLUMN IF NOT EXISTS imagery_style TEXT,
  ADD COLUMN IF NOT EXISTS what_to_avoid TEXT,
  ADD COLUMN IF NOT EXISTS dos_and_donts TEXT;
