-- ============================================================
-- The Quest — All pending migrations (idempotent)
-- Safe to run multiple times
-- ============================================================

-- ─── Navigation columns ─────────────────────────────────────
ALTER TABLE objects ADD COLUMN IF NOT EXISTS latitude decimal(10,8);
ALTER TABLE objects ADD COLUMN IF NOT EXISTS longitude decimal(11,8);
ALTER TABLE objects ADD COLUMN IF NOT EXISTS is_final boolean DEFAULT false;
ALTER TABLE objects ADD COLUMN IF NOT EXISTS physical_id text;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS intro_text text;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS object_order text[] DEFAULT '{}';
ALTER TABLE teams ADD COLUMN IF NOT EXISTS time_bonus integer DEFAULT 0;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS locked boolean DEFAULT false;
ALTER TABLE staff_members ADD COLUMN IF NOT EXISTS validation_code text;
ALTER TABLE staff_members ADD COLUMN IF NOT EXISTS teams_validated integer DEFAULT 0;
ALTER TABLE objects ADD COLUMN IF NOT EXISTS narrative_name text;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS intro_enigme text;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS intro_answer text;
ALTER TABLE objects ADD COLUMN IF NOT EXISTS hidden_letter char(1);
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS secret_word text DEFAULT 'LABYRINTH';
ALTER TABLE teams ADD COLUMN IF NOT EXISTS collected_letters jsonb DEFAULT '{}';
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS team_count integer DEFAULT 0;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS access_code text;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS is_precreated boolean DEFAULT false;
CREATE UNIQUE INDEX IF NOT EXISTS idx_teams_access_code ON teams(access_code) WHERE access_code IS NOT NULL;

-- ─── Team messages table ────────────────────────────────────
CREATE TABLE IF NOT EXISTS team_messages (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id uuid REFERENCES sessions(id) ON DELETE CASCADE,
  team_id uuid REFERENCES teams(id) ON DELETE CASCADE,
  message text NOT NULL,
  read boolean DEFAULT false,
  type text DEFAULT 'message',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE team_messages ENABLE ROW LEVEL SECURITY;

-- ─── Indexes ────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_objects_physical_id ON objects(physical_id);
CREATE INDEX IF NOT EXISTS idx_objects_final ON objects(session_id, is_final);
CREATE INDEX IF NOT EXISTS idx_teams_session_status ON teams(session_id, status);
CREATE INDEX IF NOT EXISTS idx_progress_team_status ON team_progress(team_id, status);
CREATE INDEX IF NOT EXISTS idx_sessions_code_status ON sessions(code, status);
CREATE INDEX IF NOT EXISTS idx_objects_session_order ON objects(session_id, "order");
CREATE INDEX IF NOT EXISTS idx_steps_object_order ON steps(object_id, "order");
CREATE INDEX IF NOT EXISTS idx_messages_team ON team_messages(team_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_staff_session_name ON staff_members(session_id, name);

-- ─── RLS Policies (drop + recreate for idempotency) ────────

-- Sessions
DROP POLICY IF EXISTS "Sessions insertable by all" ON sessions;
DROP POLICY IF EXISTS "Sessions updatable by all" ON sessions;
DROP POLICY IF EXISTS "All sessions readable for admin" ON sessions;
DROP POLICY IF EXISTS "Sessions deletable by all" ON sessions;
DROP POLICY IF EXISTS "Sessions deletable by admin" ON sessions;
DROP POLICY IF EXISTS "Sessions deletable" ON sessions;
CREATE POLICY "Sessions insertable by all" ON sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "Sessions updatable by all" ON sessions FOR UPDATE USING (true);
CREATE POLICY "All sessions readable for admin" ON sessions FOR SELECT USING (true);
CREATE POLICY "Sessions deletable" ON sessions FOR DELETE USING (true);

-- Objects
DROP POLICY IF EXISTS "Objects insertable by all" ON objects;
DROP POLICY IF EXISTS "Objects updatable by all" ON objects;
DROP POLICY IF EXISTS "Objects deletable by all" ON objects;
CREATE POLICY "Objects insertable by all" ON objects FOR INSERT WITH CHECK (true);
CREATE POLICY "Objects updatable by all" ON objects FOR UPDATE USING (true);
CREATE POLICY "Objects deletable by all" ON objects FOR DELETE USING (true);

-- Steps
DROP POLICY IF EXISTS "Steps insertable by all" ON steps;
DROP POLICY IF EXISTS "Steps updatable by all" ON steps;
DROP POLICY IF EXISTS "Steps deletable by all" ON steps;
CREATE POLICY "Steps insertable by all" ON steps FOR INSERT WITH CHECK (true);
CREATE POLICY "Steps updatable by all" ON steps FOR UPDATE USING (true);
CREATE POLICY "Steps deletable by all" ON steps FOR DELETE USING (true);

-- Staff
DROP POLICY IF EXISTS "Staff insertable by all" ON staff_members;
DROP POLICY IF EXISTS "Staff updatable by all" ON staff_members;
DROP POLICY IF EXISTS "Staff deletable by all" ON staff_members;
CREATE POLICY "Staff insertable by all" ON staff_members FOR INSERT WITH CHECK (true);
CREATE POLICY "Staff updatable by all" ON staff_members FOR UPDATE USING (true);
CREATE POLICY "Staff deletable by all" ON staff_members FOR DELETE USING (true);

-- Scoring config
DROP POLICY IF EXISTS "Scoring config insertable by all" ON scoring_config;
DROP POLICY IF EXISTS "Scoring config updatable by all" ON scoring_config;
CREATE POLICY "Scoring config insertable by all" ON scoring_config FOR INSERT WITH CHECK (true);
CREATE POLICY "Scoring config updatable by all" ON scoring_config FOR UPDATE USING (true);

-- Organizations
DROP POLICY IF EXISTS "Organizations insertable by all" ON organizations;
CREATE POLICY "Organizations insertable by all" ON organizations FOR INSERT WITH CHECK (true);

-- Team messages
DROP POLICY IF EXISTS "Messages readable by all" ON team_messages;
DROP POLICY IF EXISTS "Messages creatable by all" ON team_messages;
DROP POLICY IF EXISTS "Messages updatable by all" ON team_messages;
CREATE POLICY "Messages readable by all" ON team_messages FOR SELECT USING (true);
CREATE POLICY "Messages creatable by all" ON team_messages FOR INSERT WITH CHECK (true);
CREATE POLICY "Messages updatable by all" ON team_messages FOR UPDATE USING (true);

-- ─── Realtime ───────────────────────────────────────────────
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE team_messages;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── Generate validation codes for existing staff ───────────
UPDATE staff_members
SET validation_code = LPAD(FLOOR(RANDOM() * 9000 + 1000)::text, 4, '0')
WHERE validation_code IS NULL;
