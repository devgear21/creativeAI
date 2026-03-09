-- CreativeAI Database Schema
-- Run this SQL in the Supabase SQL Editor to set up the database

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Clients table
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  industry TEXT,
  brand_colors TEXT,
  font_style TEXT,
  tone_of_voice TEXT,
  logo_url TEXT,
  brand_book_url TEXT,
  assets_data JSONB DEFAULT '{"logos":[],"creatives_reference":[],"landing_pages_reference":[]}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Campaigns table
CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  headline TEXT NOT NULL,
  ad_copy TEXT,
  platform TEXT NOT NULL CHECK (platform IN ('instagram', 'facebook', 'linkedin', 'twitter')),
  aspect_ratio TEXT NOT NULL DEFAULT '1:1',
  scheduled_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Creatives table
CREATE TABLE creatives (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  image_url TEXT,
  prompt_used TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'generating' CHECK (status IN ('generating', 'completed', 'failed')),
  task_id TEXT,
  parent_creative_id UUID REFERENCES creatives(id) ON DELETE SET NULL,
  aspect_ratio TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_campaigns_client_id ON campaigns(client_id);
CREATE INDEX idx_creatives_client_id ON creatives(client_id);
CREATE INDEX idx_creatives_campaign_id ON creatives(campaign_id);
CREATE INDEX idx_creatives_status ON creatives(status);
CREATE INDEX idx_creatives_parent_id ON creatives(parent_creative_id);

-- Storage buckets (create these in the Supabase Dashboard > Storage):
-- 1. Bucket name: "creatives" (public)
-- 2. Bucket name: "brand-books" (public)
-- 3. Bucket name: "assets" (public)
--
-- Or run these via SQL:
-- INSERT INTO storage.buckets (id, name, public) VALUES ('creatives', 'creatives', true);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('brand-books', 'brand-books', true);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('assets', 'assets', true);

-- RLS Policies (permissive for internal tool - no auth)
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE creatives ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on clients" ON clients FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on campaigns" ON campaigns FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on creatives" ON creatives FOR ALL USING (true) WITH CHECK (true);
