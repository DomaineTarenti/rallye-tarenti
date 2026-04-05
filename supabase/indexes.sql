-- ============================================================
-- Index de performance — Rallye Tarenti
-- À exécuter dans Supabase SQL Editor (une seule fois)
-- ============================================================

-- team_progress : requêtes fréquentes par team_id et status
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_team_progress_team_id
  ON team_progress(team_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_team_progress_team_status
  ON team_progress(team_id, status);

-- photos : chargement par équipe et par étape
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_photos_team_id
  ON photos(team_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_photos_step_id
  ON photos(step_id);

-- team_messages : chargement des messages par équipe
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_team_messages_team_id
  ON team_messages(team_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_team_messages_created_at
  ON team_messages(team_id, created_at DESC);

-- teams : chargement par session et code d'accès
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_teams_session_id
  ON teams(session_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_teams_access_code
  ON teams(access_code);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_teams_status
  ON teams(status);

-- Contrainte unicité sur access_code (évite deux équipes avec le même code)
ALTER TABLE teams
  ADD CONSTRAINT IF NOT EXISTS teams_access_code_unique UNIQUE (access_code);
