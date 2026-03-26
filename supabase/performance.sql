-- ============================================================
-- Performance indexes for 100+ concurrent teams
-- Run in Supabase SQL Editor
-- ============================================================

-- Composite index for team lookup by session + status
CREATE INDEX IF NOT EXISTS idx_teams_session_status
ON teams(session_id, status);

-- Composite index for progress lookup by team + status
CREATE INDEX IF NOT EXISTS idx_progress_team_status
ON team_progress(team_id, status);

-- Composite index for session code lookup with status
CREATE INDEX IF NOT EXISTS idx_sessions_code_status
ON sessions(code, status);

-- Composite index for ordered objects per session
CREATE INDEX IF NOT EXISTS idx_objects_session_order
ON objects(session_id, "order");

-- Index for step ordering within an object
CREATE INDEX IF NOT EXISTS idx_steps_object_order
ON steps(object_id, "order");
