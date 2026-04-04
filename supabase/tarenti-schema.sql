-- ============================================================
-- Rallye Tarenti — Schéma Supabase (v1)
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── Sessions (une journée / un événement rallye) ─────────────
CREATE TYPE session_status AS ENUM ('draft', 'active', 'paused', 'completed');

CREATE TABLE sessions (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          text NOT NULL,
  code          text NOT NULL UNIQUE,
  status        session_status NOT NULL DEFAULT 'draft',
  logo_url      text,
  primary_color text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  started_at    timestamptz
);

CREATE INDEX idx_sessions_code ON sessions(code);

-- ─── Objects (animaux / points d'intérêt) ────────────────────
CREATE TABLE objects (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id  uuid NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  name        text NOT NULL,
  emoji       text NOT NULL DEFAULT '🐾',
  "order"     integer NOT NULL DEFAULT 0,
  description text,            -- indice narratif pendant la navigation
  latitude    double precision NOT NULL,
  longitude   double precision NOT NULL,
  is_final    boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_objects_session ON objects(session_id);

-- ─── Steps (1 question par objet) ────────────────────────────
CREATE TABLE steps (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  object_id   uuid NOT NULL REFERENCES objects(id) ON DELETE CASCADE,
  intro_text  text,            -- texte affiché à l'arrivée
  question    text NOT NULL,
  answer      text NOT NULL,
  hint        text,            -- 1 seul indice possible
  fun_fact    text NOT NULL DEFAULT '',
  "order"     integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_steps_object ON steps(object_id);

-- ─── Teams ───────────────────────────────────────────────────
CREATE TYPE team_status AS ENUM ('waiting', 'playing', 'finished');

CREATE TABLE teams (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id      uuid NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  name            text NOT NULL,
  status          team_status NOT NULL DEFAULT 'waiting',
  completion_time integer,     -- secondes
  locked          boolean NOT NULL DEFAULT false,
  access_code     text UNIQUE,
  is_precreated   boolean NOT NULL DEFAULT false,
  started_at      timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_teams_session ON teams(session_id);
CREATE INDEX idx_teams_access_code ON teams(access_code);

-- ─── Team Progress ───────────────────────────────────────────
CREATE TYPE progress_status AS ENUM ('locked', 'active', 'completed', 'skipped');

CREATE TABLE team_progress (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id       uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  step_id       uuid NOT NULL REFERENCES steps(id) ON DELETE CASCADE,
  status        progress_status NOT NULL DEFAULT 'locked',
  hints_used    integer NOT NULL DEFAULT 0,
  completed_at  timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE(team_id, step_id)
);

CREATE INDEX idx_progress_team ON team_progress(team_id);
CREATE INDEX idx_progress_step ON team_progress(step_id);

-- ─── Photos ──────────────────────────────────────────────────
CREATE TABLE photos (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id     uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  step_id     uuid REFERENCES steps(id) ON DELETE SET NULL,
  object_id   uuid REFERENCES objects(id) ON DELETE SET NULL,
  storage_url text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_photos_team ON photos(team_id);

-- ─── Team Messages (chat Game Master) ────────────────────────
CREATE TABLE team_messages (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id     uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  session_id  uuid REFERENCES sessions(id) ON DELETE CASCADE,
  message     text NOT NULL,
  type        text NOT NULL DEFAULT 'message',
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_messages_team ON team_messages(team_id);

-- ─── RLS (Row Level Security) ────────────────────────────────
ALTER TABLE sessions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE objects       ENABLE ROW LEVEL SECURITY;
ALTER TABLE steps         ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams         ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE photos        ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_messages ENABLE ROW LEVEL SECURITY;

-- Sessions : lecture publique
CREATE POLICY "Sessions readable by all"
  ON sessions FOR SELECT USING (true);

-- Objects : lecture publique
CREATE POLICY "Objects readable by all"
  ON objects FOR SELECT USING (true);

-- Steps : lecture publique
CREATE POLICY "Steps readable by all"
  ON steps FOR SELECT USING (true);

-- Teams
CREATE POLICY "Teams readable by all"
  ON teams FOR SELECT USING (true);
CREATE POLICY "Teams insertable by all"
  ON teams FOR INSERT WITH CHECK (true);
CREATE POLICY "Teams updatable by all"
  ON teams FOR UPDATE USING (true);

-- Team Progress
CREATE POLICY "Progress readable by all"
  ON team_progress FOR SELECT USING (true);
CREATE POLICY "Progress insertable by all"
  ON team_progress FOR INSERT WITH CHECK (true);
CREATE POLICY "Progress updatable by all"
  ON team_progress FOR UPDATE USING (true);

-- Photos
CREATE POLICY "Photos readable by all"
  ON photos FOR SELECT USING (true);
CREATE POLICY "Photos insertable by all"
  ON photos FOR INSERT WITH CHECK (true);

-- Team Messages
CREATE POLICY "Messages readable by all"
  ON team_messages FOR SELECT USING (true);
CREATE POLICY "Messages insertable by all"
  ON team_messages FOR INSERT WITH CHECK (true);

-- ─── Realtime ─────────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE team_progress;
ALTER PUBLICATION supabase_realtime ADD TABLE teams;
ALTER PUBLICATION supabase_realtime ADD TABLE team_messages;

-- ─── Storage bucket (à créer dans le dashboard Supabase) ──────
-- Bucket : team-photos
-- Accès : public (pour affichage des photos)
-- INSERT allowed for authenticated + anon (players)
-- Créer via : Storage → New bucket → "team-photos" → Public
