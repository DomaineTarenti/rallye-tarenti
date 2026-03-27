-- Fix 4 priorities — run in Supabase SQL Editor

-- 1. Session DELETE policy (allow all — API checks status)
DROP POLICY IF EXISTS "Sessions deletable by all" ON sessions;
DROP POLICY IF EXISTS "Sessions deletable by admin" ON sessions;
DROP POLICY IF EXISTS "Sessions deletable" ON sessions;
CREATE POLICY "Sessions deletable" ON sessions FOR DELETE USING (true);

-- 2. Message type column for help requests
ALTER TABLE team_messages ADD COLUMN IF NOT EXISTS type text DEFAULT 'message';
