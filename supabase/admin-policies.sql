-- ============================================================
-- Admin RLS policies — allows back-office operations
-- Run AFTER schema.sql
-- ============================================================

-- Sessions: admin can insert/update all sessions
create policy "Sessions insertable by all"
  on sessions for insert
  with check (true);

create policy "Sessions updatable by all"
  on sessions for update
  using (true);

-- Allow reading ALL sessions (not just active) for admin
create policy "All sessions readable for admin"
  on sessions for select
  using (true);

-- Objects: admin CRUD
create policy "Objects insertable by all"
  on objects for insert
  with check (true);

create policy "Objects updatable by all"
  on objects for update
  using (true);

create policy "Objects deletable by all"
  on objects for delete
  using (true);

-- Steps: admin CRUD
create policy "Steps insertable by all"
  on steps for insert
  with check (true);

create policy "Steps updatable by all"
  on steps for update
  using (true);

create policy "Steps deletable by all"
  on steps for delete
  using (true);

-- Staff: admin CRUD
create policy "Staff insertable by all"
  on staff_members for insert
  with check (true);

create policy "Staff updatable by all"
  on staff_members for update
  using (true);

create policy "Staff deletable by all"
  on staff_members for delete
  using (true);

-- Scoring config: admin CRUD
create policy "Scoring config insertable by all"
  on scoring_config for insert
  with check (true);

create policy "Scoring config updatable by all"
  on scoring_config for update
  using (true);

-- Organizations: admin insert
create policy "Organizations insertable by all"
  on organizations for insert
  with check (true);
