-- ============================================================
-- RALLYE TARENTI — Migration complète
-- Coller dans : Dashboard Supabase → SQL Editor → Run
-- ⚠️  Supprime toutes les anciennes tables The Quest
-- ============================================================

-- ─── 1. Suppression des anciennes tables (ordre FK) ──────────
DROP TABLE IF EXISTS team_messages   CASCADE;
DROP TABLE IF EXISTS team_progress   CASCADE;
DROP TABLE IF EXISTS staff_members   CASCADE;
DROP TABLE IF EXISTS scoring_config  CASCADE;
DROP TABLE IF EXISTS photos          CASCADE;
DROP TABLE IF EXISTS teams           CASCADE;
DROP TABLE IF EXISTS steps           CASCADE;
DROP TABLE IF EXISTS objects         CASCADE;
DROP TABLE IF EXISTS sessions        CASCADE;
DROP TABLE IF EXISTS organizations   CASCADE;

-- ─── 2. Suppression des anciens types ────────────────────────
DROP TYPE IF EXISTS session_status  CASCADE;
DROP TYPE IF EXISTS step_type       CASCADE;
DROP TYPE IF EXISTS team_status     CASCADE;
DROP TYPE IF EXISTS team_rank       CASCADE;
DROP TYPE IF EXISTS progress_status CASCADE;
DROP TYPE IF EXISTS hint_type       CASCADE;
DROP TYPE IF EXISTS staff_role      CASCADE;

-- ─── 3. Extensions ───────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── 4. Nouveau schéma ───────────────────────────────────────

CREATE TYPE session_status  AS ENUM ('draft', 'active', 'paused', 'completed');
CREATE TYPE team_status     AS ENUM ('waiting', 'playing', 'finished');
CREATE TYPE progress_status AS ENUM ('locked', 'active', 'completed', 'skipped');

-- Sessions
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

-- Objects (animaux / points d'intérêt)
CREATE TABLE objects (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id  uuid NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  name        text NOT NULL,
  emoji       text NOT NULL DEFAULT '🐾',
  "order"     integer NOT NULL DEFAULT 0,
  description text,
  latitude    double precision NOT NULL,
  longitude   double precision NOT NULL,
  is_final    boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_objects_session ON objects(session_id);

-- Steps (1 question par objet)
CREATE TABLE steps (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  object_id   uuid NOT NULL REFERENCES objects(id) ON DELETE CASCADE,
  intro_text  text,
  question    text NOT NULL,
  answer      text NOT NULL,
  hint        text,
  fun_fact    text NOT NULL DEFAULT '',
  "order"     integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_steps_object ON steps(object_id);

-- Teams
CREATE TABLE teams (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id      uuid NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  name            text NOT NULL,
  status          team_status NOT NULL DEFAULT 'waiting',
  completion_time integer,
  locked          boolean NOT NULL DEFAULT false,
  access_code     text UNIQUE,
  is_precreated   boolean NOT NULL DEFAULT false,
  started_at      timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_teams_session     ON teams(session_id);
CREATE INDEX idx_teams_access_code ON teams(access_code);

-- Team Progress
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

-- Photos
CREATE TABLE photos (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id     uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  step_id     uuid REFERENCES steps(id) ON DELETE SET NULL,
  object_id   uuid REFERENCES objects(id) ON DELETE SET NULL,
  storage_url text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_photos_team ON photos(team_id);

-- Team Messages (chat Game Master)
CREATE TABLE team_messages (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id     uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  session_id  uuid REFERENCES sessions(id) ON DELETE CASCADE,
  message     text NOT NULL,
  type        text NOT NULL DEFAULT 'message',
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_messages_team ON team_messages(team_id);

-- ─── 5. RLS ──────────────────────────────────────────────────
ALTER TABLE sessions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE objects       ENABLE ROW LEVEL SECURITY;
ALTER TABLE steps         ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams         ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE photos        ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sessions readable"         ON sessions      FOR SELECT USING (true);
CREATE POLICY "Objects readable"          ON objects       FOR SELECT USING (true);
CREATE POLICY "Steps readable"            ON steps         FOR SELECT USING (true);
CREATE POLICY "Teams readable"            ON teams         FOR SELECT USING (true);
CREATE POLICY "Teams insertable"          ON teams         FOR INSERT WITH CHECK (true);
CREATE POLICY "Teams updatable"           ON teams         FOR UPDATE USING (true);
CREATE POLICY "Progress readable"         ON team_progress FOR SELECT USING (true);
CREATE POLICY "Progress insertable"       ON team_progress FOR INSERT WITH CHECK (true);
CREATE POLICY "Progress updatable"        ON team_progress FOR UPDATE USING (true);
CREATE POLICY "Photos readable"           ON photos        FOR SELECT USING (true);
CREATE POLICY "Photos insertable"         ON photos        FOR INSERT WITH CHECK (true);
CREATE POLICY "Messages readable"         ON team_messages FOR SELECT USING (true);
CREATE POLICY "Messages insertable"       ON team_messages FOR INSERT WITH CHECK (true);

-- ─── 6. Realtime ─────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE team_progress;
ALTER PUBLICATION supabase_realtime ADD TABLE teams;
ALTER PUBLICATION supabase_realtime ADD TABLE team_messages;

-- ─── 7. Seed — Session ───────────────────────────────────────
INSERT INTO sessions (id, name, code, status, primary_color, started_at)
VALUES (
  'a0000000-0000-4000-8000-000000000001',
  'Rallye Tarenti 2025',
  'TARENTI25',
  'active',
  '#2D7D46',
  now()
);

-- ─── 8. Seed — Animaux (ordre fixe) ──────────────────────────
INSERT INTO objects (id, session_id, name, emoji, "order", description, latitude, longitude, is_final)
VALUES
  ('b0000000-0001-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001',
   'Les Chèvres', '🐐', 1,
   'Suivez le chemin vers l''enclos des chèvres. Ces curieuses vont adorer votre visite !',
   36.68653492692563, 10.210360935921443, false),

  ('b0000000-0002-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001',
   'Les Vaches', '🐄', 2,
   'Direction les vaches ! Ces douces bovines passent leur journée à brouter tranquillement.',
   36.68790732639046, 10.209060248513682, false),

  ('b0000000-0003-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001',
   'L''Âne', '🫏', 3,
   'Un visiteur très patient vous attend... il a de grandes oreilles pour bien vous entendre !',
   36.68630912674403, 10.208415150340297, false),

  ('b0000000-0004-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001',
   'Les Cochons', '🐷', 4,
   'Les cochons fouinent et grognent... ils vous ont sûrement déjà entendu arriver !',
   36.68614330997645, 10.208318093945488, false),

  ('b0000000-0005-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001',
   'Le Champ Aromatique', '🌿', 5,
   'Fermez les yeux et respirez... le champ aromatique du Domaine Tarenti vous attend.',
   36.68417968248825, 10.207979379717381, false),

  ('b0000000-0006-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001',
   'Les Poules', '🐔', 6,
   'Cot cot cot... les poules caquettent pour vous accueillir dans leur enclos !',
   36.68608903628465, 10.209727428427485, false),

  ('b0000000-0007-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001',
   'Le Lapin', '🐇', 7,
   'Cherchez bien... le lapin est peut-être caché dans son terrier ou dans les fourrés !',
   36.68610785682307, 10.209897078132796, false);

-- ─── 9. Seed — Questions ─────────────────────────────────────
INSERT INTO steps (id, object_id, intro_text, question, answer, hint, fun_fact, "order")
VALUES
  (
    'c0000000-0001-4000-8000-000000000001',
    'b0000000-0001-4000-8000-000000000001',
    'Vous avez trouvé les chèvres du Domaine Tarenti ! Observez-les bien avant de répondre.',
    'De quelle forme sont les pupilles d''une chèvre ?',
    'rectangulaire',
    'Regardez attentivement dans leurs yeux... ce n''est pas une forme ronde !',
    'Les chèvres ont des pupilles rectangulaires ! Cette forme leur permet de voir à presque 340° autour d''elles sans bouger la tête. Très pratique pour repérer les prédateurs !',
    1
  ),
  (
    'c0000000-0002-4000-8000-000000000001',
    'b0000000-0002-4000-8000-000000000001',
    'Bienvenue chez les vaches du Domaine Tarenti ! Ces grandes dames passent leur temps à brouter et ruminer.',
    'Combien d''estomacs a une vache ?',
    '4',
    'C''est plus d''un seul... les vaches sont des ruminants !',
    'Les vaches ont 4 estomacs ! Elles avalent l''herbe, la régurgitent pour la mâcher à nouveau — c''est ce qu''on appelle ruminer. Elles passent jusqu''à 8 heures par jour à mâcher !',
    1
  ),
  (
    'c0000000-0003-4000-8000-000000000001',
    'b0000000-0003-4000-8000-000000000001',
    'L''âne du Domaine vous attend avec sa bonne humeur légendaire ! Un animal fidèle et très intelligent.',
    'Comment s''appelle le cri de l''âne ?',
    'braiment',
    'L''âne fait "hi-han"... ce son porte un nom précis !',
    'Le cri de l''âne s''appelle le braiment ! Un hi-han peut s''entendre jusqu''à 3 km de distance. Les ânes s''expriment pour communiquer avec leurs amis ou exprimer leurs émotions !',
    1
  ),
  (
    'c0000000-0004-4000-8000-000000000001',
    'b0000000-0004-4000-8000-000000000001',
    'Les cochons du Domaine grognent pour vous dire bonjour ! Des animaux bien plus intelligents qu''on ne le croit.',
    'Quel est le nom du bébé cochon ?',
    'porcelet',
    'C''est un mot qui ressemble à "cochon"... en version miniature !',
    'Le bébé cochon s''appelle le porcelet ! Les cochons sont parmi les animaux les plus intelligents de la ferme — plus que les chiens selon certaines études. Ils peuvent reconnaître leur prénom !',
    1
  ),
  (
    'c0000000-0005-4000-8000-000000000001',
    'b0000000-0005-4000-8000-000000000001',
    'Bienvenue dans le champ aromatique du Domaine ! Fermez les yeux un instant et respirez profondément.',
    'Pour préparer une tisane à la menthe, quelle partie de la plante utilise-t-on ?',
    'feuilles',
    'C''est la partie verte et parfumée de la plante !',
    'On utilise les feuilles de menthe pour faire la tisane ! La menthe est au cœur de la culture tunisienne : le thé à la menthe est une boisson traditionnelle incontournable !',
    1
  ),
  (
    'c0000000-0006-4000-8000-000000000001',
    'b0000000-0006-4000-8000-000000000001',
    'Les poules caquettent pour vous accueillir ! Ces dames pondeuses travaillent dur chaque jour.',
    'Combien de jours met un œuf de poule pour éclore ?',
    '21',
    'C''est environ 3 semaines... comptez les jours !',
    'Un œuf de poule met exactement 21 jours pour éclore ! La poule retourne ses œufs plusieurs fois par jour. Une poule pond environ 250 à 300 œufs par an. Merci les poules !',
    1
  ),
  (
    'c0000000-0007-4000-8000-000000000001',
    'b0000000-0007-4000-8000-000000000001',
    'Cherchez bien... le lapin est peut-être tapi dans son coin. Un animal vif et adorable !',
    'Comment s''appelle le bébé lapin ?',
    'lapereau',
    'C''est un mot proche de "lapin"... en version bébé !',
    'Le bébé lapin s''appelle le lapereau ! Leurs grandes oreilles servent à détecter les prédateurs... et aussi à réguler leur température en faisant circuler le sang. Pratique sous le soleil tunisien !',
    1
  );

-- ─── 10. Seed — Équipes FAM01–FAM15 ──────────────────────────
INSERT INTO teams (id, session_id, name, status, access_code, is_precreated, locked)
VALUES
  ('d0000000-0001-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Famille 01', 'waiting', 'FAM01', true, false),
  ('d0000000-0002-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Famille 02', 'waiting', 'FAM02', true, false),
  ('d0000000-0003-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Famille 03', 'waiting', 'FAM03', true, false),
  ('d0000000-0004-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Famille 04', 'waiting', 'FAM04', true, false),
  ('d0000000-0005-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Famille 05', 'waiting', 'FAM05', true, false),
  ('d0000000-0006-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Famille 06', 'waiting', 'FAM06', true, false),
  ('d0000000-0007-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Famille 07', 'waiting', 'FAM07', true, false),
  ('d0000000-0008-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Famille 08', 'waiting', 'FAM08', true, false),
  ('d0000000-0009-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Famille 09', 'waiting', 'FAM09', true, false),
  ('d0000000-000a-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Famille 10', 'waiting', 'FAM10', true, false),
  ('d0000000-000b-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Famille 11', 'waiting', 'FAM11', true, false),
  ('d0000000-000c-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Famille 12', 'waiting', 'FAM12', true, false),
  ('d0000000-000d-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Famille 13', 'waiting', 'FAM13', true, false),
  ('d0000000-000e-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Famille 14', 'waiting', 'FAM14', true, false),
  ('d0000000-000f-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Famille 15', 'waiting', 'FAM15', true, false);

-- ─── ✅ Terminé ───────────────────────────────────────────────
-- Session  : TARENTI25 (active)
-- Animaux  : 7 (Chèvres → Lapin)
-- Équipes  : FAM01 → FAM15
--
-- Étape suivante : Storage → New bucket → "team-photos" (public)
