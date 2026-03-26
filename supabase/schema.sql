-- ============================================================
-- The Quest — Schéma Supabase
-- ============================================================

-- Extensions
create extension if not exists "uuid-ossp";

-- ─── Organizations (clients white-label) ─────────────────────
create table organizations (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  slug        text not null unique,
  logo_url    text,
  primary_color text not null default '#7C3AED',
  created_at  timestamptz not null default now()
);

-- ─── Sessions (chasses au trésor) ────────────────────────────
create type session_status as enum ('draft', 'active', 'paused', 'completed');

create table sessions (
  id              uuid primary key default uuid_generate_v4(),
  org_id          uuid not null references organizations(id) on delete cascade,
  name            text not null,
  code            text not null unique,
  status          session_status not null default 'draft',
  theme           text,
  duration_minutes integer not null default 60,
  logo_url        text,
  primary_color   text,
  created_at      timestamptz not null default now(),
  started_at      timestamptz
);

create index idx_sessions_code on sessions(code);
create index idx_sessions_org on sessions(org_id);

-- ─── Objects (objets physiques avec QR) ──────────────────────
create table objects (
  id          uuid primary key default uuid_generate_v4(),
  session_id  uuid not null references sessions(id) on delete cascade,
  name        text not null,
  qr_code_id  text not null unique,
  "order"     integer not null default 0,
  description text,
  model_url   text,
  created_at  timestamptz not null default now()
);

create index idx_objects_session on objects(session_id);
create index idx_objects_qr on objects(qr_code_id);

-- ─── Steps (étapes d'une quête) ──────────────────────────────
create type step_type as enum ('enigme', 'epreuve', 'navigation');

create table steps (
  id              uuid primary key default uuid_generate_v4(),
  object_id       uuid not null references objects(id) on delete cascade,
  text_narratif   text not null default '',
  enigme          text,
  answer          text,
  photo_indice_url text,
  type            step_type not null default 'enigme',
  "order"         integer not null default 0,
  created_at      timestamptz not null default now()
);

create index idx_steps_object on steps(object_id);

-- ─── Teams (équipes de joueurs) ──────────────────────────────
create type team_status as enum ('waiting', 'playing', 'finished');
create type team_rank as enum ('bronze', 'silver', 'gold', 'platinum', 'diamond');

create table teams (
  id              uuid primary key default uuid_generate_v4(),
  session_id      uuid not null references sessions(id) on delete cascade,
  name            text not null,
  character       text,
  avatar_url      text,
  status          team_status not null default 'waiting',
  final_score     integer,
  rank            team_rank,
  rank_label      text,
  completion_time integer, -- secondes
  certificate_url text,
  created_at      timestamptz not null default now()
);

create index idx_teams_session on teams(session_id);

-- ─── Team Progress (progression par étape) ───────────────────
create type progress_status as enum ('locked', 'active', 'completed', 'skipped');
create type hint_type as enum ('narratif', 'photo', 'direct');

create table team_progress (
  id              uuid primary key default uuid_generate_v4(),
  team_id         uuid not null references teams(id) on delete cascade,
  step_id         uuid not null references steps(id) on delete cascade,
  status          progress_status not null default 'locked',
  hints_used      integer not null default 0,
  hint_types      hint_type[] not null default '{}',
  time_on_step    integer, -- secondes
  epreuve_attempts integer not null default 0,
  epreuve_success boolean,
  completed_at    timestamptz,
  created_at      timestamptz not null default now(),
  unique(team_id, step_id)
);

create index idx_progress_team on team_progress(team_id);
create index idx_progress_step on team_progress(step_id);

-- ─── Staff Members ───────────────────────────────────────────
create type staff_role as enum ('gardien', 'animateur', 'admin');

create table staff_members (
  id              uuid primary key default uuid_generate_v4(),
  session_id      uuid not null references sessions(id) on delete cascade,
  user_id         uuid,
  name            text not null,
  role            staff_role not null default 'gardien',
  assigned_step_id uuid references steps(id) on delete set null,
  created_at      timestamptz not null default now()
);

create index idx_staff_session on staff_members(session_id);

-- ─── Scoring Config (paramètres de scoring par session) ──────
create table scoring_config (
  id                    uuid primary key default uuid_generate_v4(),
  session_id            uuid not null unique references sessions(id) on delete cascade,
  base_score            integer not null default 1000,
  penalty_per_minute    integer not null default 1,
  penalty_per_hint      integer not null default 15,
  bonus_epreuve_success integer not null default 50,
  rank_thresholds       jsonb not null default '{"diamond": 950, "platinum": 850, "gold": 700, "silver": 500, "bronze": 0}',
  rank_labels           jsonb not null default '{"diamond": "Diamant", "platinum": "Platine", "gold": "Or", "silver": "Argent", "bronze": "Bronze"}',
  created_at            timestamptz not null default now()
);

-- ─── RLS (Row Level Security) ────────────────────────────────
alter table organizations enable row level security;
alter table sessions enable row level security;
alter table objects enable row level security;
alter table steps enable row level security;
alter table teams enable row level security;
alter table team_progress enable row level security;
alter table staff_members enable row level security;
alter table scoring_config enable row level security;

-- ─── Organizations ──────────────────────────────────────────
create policy "Organizations readable by all"
  on organizations for select
  using (true);

-- ─── Sessions ───────────────────────────────────────────────
-- Players can read active sessions (join by code)
create policy "Active sessions readable by all"
  on sessions for select
  using (status = 'active');

-- ─── Objects ────────────────────────────────────────────────
-- Players need to read objects for their session (scan flow)
create policy "Objects readable by all"
  on objects for select
  using (true);

-- ─── Steps ──────────────────────────────────────────────────
-- Players need to read steps (gameplay, answer checking)
create policy "Steps readable by all"
  on steps for select
  using (true);

-- ─── Teams ──────────────────────────────────────────────────
-- Anyone can read teams (rankings, own team)
create policy "Teams readable by all"
  on teams for select
  using (true);

-- Anyone can create a team (join flow)
create policy "Teams creatable by all"
  on teams for insert
  with check (true);

-- Teams can be updated (status, score, rank)
create policy "Teams updatable by all"
  on teams for update
  using (true);

-- ─── Team Progress ──────────────────────────────────────────
-- Players need to read their progress
create policy "Progress readable by all"
  on team_progress for select
  using (true);

-- Progress entries created when team joins
create policy "Progress creatable by all"
  on team_progress for insert
  with check (true);

-- Progress updated on answer/hint/validation
create policy "Progress updatable by all"
  on team_progress for update
  using (true);

-- ─── Staff Members ──────────────────────────────────────────
-- Staff list readable (for staff dashboard)
create policy "Staff readable by all"
  on staff_members for select
  using (true);

-- ─── Scoring Config ─────────────────────────────────────────
-- Score config readable (game needs scoring params)
create policy "Scoring config readable by all"
  on scoring_config for select
  using (true);

-- ─── Realtime ───────────────────────────────────────────────
-- Enable realtime on team_progress for staff validation
alter publication supabase_realtime add table team_progress;
alter publication supabase_realtime add table teams;
