-- ============================================================
-- Admin Actions — migrations for live dashboard features
-- Run in Supabase SQL Editor
-- ============================================================

-- 1. Team messages table
CREATE TABLE IF NOT EXISTS team_messages (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id uuid REFERENCES sessions(id) ON DELETE CASCADE,
  team_id uuid REFERENCES teams(id) ON DELETE CASCADE,
  message text NOT NULL,
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE team_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Messages readable by all"
  ON team_messages FOR SELECT USING (true);

CREATE POLICY "Messages creatable by all"
  ON team_messages FOR INSERT WITH CHECK (true);

CREATE POLICY "Messages updatable by all"
  ON team_messages FOR UPDATE USING (true);

-- Enable realtime on messages
ALTER PUBLICATION supabase_realtime ADD TABLE team_messages;

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_messages_team
  ON team_messages(team_id, created_at DESC);

-- 2. Time bonus column on teams
ALTER TABLE teams ADD COLUMN IF NOT EXISTS time_bonus integer DEFAULT 0;

-- 3. Sessions deletable policy
CREATE POLICY "Sessions deletable by all"
  ON sessions FOR DELETE USING (status != 'active');
