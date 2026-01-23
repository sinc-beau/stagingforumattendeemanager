/*
  # Add RLS Policies for Forum Settings

  1. Security
    - Add SELECT policy for authenticated users to view forum settings
    - Add INSERT policy for authenticated users to create forum settings
    - Add UPDATE policy for authenticated users to update forum settings
    - Add DELETE policy for authenticated users to delete forum settings
  
  2. Notes
    - All policies restrict access to authenticated users only
    - These policies allow any authenticated user to manage forum settings
*/

-- Drop existing policies if any
DROP POLICY IF EXISTS "Authenticated users can view forum settings" ON forum_settings;
DROP POLICY IF EXISTS "Authenticated users can create forum settings" ON forum_settings;
DROP POLICY IF EXISTS "Authenticated users can update forum settings" ON forum_settings;
DROP POLICY IF EXISTS "Authenticated users can delete forum settings" ON forum_settings;

-- SELECT policy
CREATE POLICY "Authenticated users can view forum settings"
  ON forum_settings
  FOR SELECT
  TO authenticated
  USING (true);

-- INSERT policy
CREATE POLICY "Authenticated users can create forum settings"
  ON forum_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- UPDATE policy
CREATE POLICY "Authenticated users can update forum settings"
  ON forum_settings
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- DELETE policy
CREATE POLICY "Authenticated users can delete forum settings"
  ON forum_settings
  FOR DELETE
  TO authenticated
  USING (true);