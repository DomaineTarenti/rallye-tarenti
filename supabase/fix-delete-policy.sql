-- Fix: Allow DELETE on sessions regardless of status
-- The API already checks status != 'active' before deleting
DROP POLICY IF EXISTS "Sessions deletable by all" ON sessions;
CREATE POLICY "Sessions deletable by all"
  ON sessions FOR DELETE USING (true);
