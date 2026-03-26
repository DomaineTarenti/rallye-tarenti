-- ============================================================
-- Navigation system — GPS, object order, intro text
-- Run in Supabase SQL Editor
-- ============================================================

-- Objects: GPS coordinates + permanent physical ID + final flag
ALTER TABLE objects ADD COLUMN IF NOT EXISTS latitude decimal(10,8);
ALTER TABLE objects ADD COLUMN IF NOT EXISTS longitude decimal(11,8);
ALTER TABLE objects ADD COLUMN IF NOT EXISTS is_final boolean DEFAULT false;
ALTER TABLE objects ADD COLUMN IF NOT EXISTS physical_id text;

-- Sessions: AI-generated intro text
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS intro_text text;

-- Teams: randomized object order per team
ALTER TABLE teams ADD COLUMN IF NOT EXISTS object_order text[] DEFAULT '{}';

-- Index for physical_id lookups
CREATE INDEX IF NOT EXISTS idx_objects_physical_id ON objects(physical_id);

-- Index for final object lookup
CREATE INDEX IF NOT EXISTS idx_objects_final ON objects(session_id, is_final);
