-- ============================================================
-- Staff system — validation codes + login support
-- Run in Supabase SQL Editor
-- ============================================================

-- Add validation_code column to staff_members
ALTER TABLE staff_members
  ADD COLUMN IF NOT EXISTS validation_code text;

-- Generate codes for existing staff without one
UPDATE staff_members
SET validation_code = LPAD(FLOOR(RANDOM() * 9000 + 1000)::text, 4, '0')
WHERE validation_code IS NULL;

-- Add teams_validated counter
ALTER TABLE staff_members
  ADD COLUMN IF NOT EXISTS teams_validated integer DEFAULT 0;

-- Index for staff login lookup
CREATE INDEX IF NOT EXISTS idx_staff_session_name
  ON staff_members(session_id, name);
