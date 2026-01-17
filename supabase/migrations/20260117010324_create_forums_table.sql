/*
  # Create forums table

  1. New Tables
    - `forums`
      - `id` (uuid, primary key)
      - `name` (text) - Forum event name
      - `brand` (text) - Brand name
      - `date` (date) - Event date
      - `city` (text) - City location
      - `venue` (text) - Venue name
      - `created_at` (timestamptz) - Record creation timestamp
      - `updated_at` (timestamptz) - Record update timestamp

  2. Security
    - Enable RLS on `forums` table
    - Add policies for authenticated users to manage forums

  3. Foreign Keys
    - Update attendees table to reference forums
    - Update forum_settings table to reference forums
*/

CREATE TABLE IF NOT EXISTS forums (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  brand text NOT NULL DEFAULT '',
  date date NOT NULL,
  city text NOT NULL DEFAULT '',
  venue text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE forums ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view all forums"
  ON forums FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert forums"
  ON forums FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update forums"
  ON forums FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete forums"
  ON forums FOR DELETE
  TO authenticated
  USING (true);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'attendees_forum_id_fkey'
  ) THEN
    ALTER TABLE attendees 
      ADD CONSTRAINT attendees_forum_id_fkey 
      FOREIGN KEY (forum_id) REFERENCES forums(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'forum_settings_forum_id_fkey'
  ) THEN
    ALTER TABLE forum_settings 
      ADD CONSTRAINT forum_settings_forum_id_fkey 
      FOREIGN KEY (forum_id) REFERENCES forums(id) ON DELETE CASCADE;
  END IF;
END $$;
