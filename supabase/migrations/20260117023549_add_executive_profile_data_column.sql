/*
  # Add Executive Profile Data Column

  1. Changes
    - Add `executive_profile_data` JSONB column to `attendees` table
    - This will store the complete executive profile responses with full question text and answer labels
    - Allows for flexible storage of form responses without changing schema for new questions

  2. Notes
    - JSONB allows efficient querying and indexing if needed later
    - Default NULL for attendees who haven't submitted executive profiles yet
*/

-- Add executive_profile_data column to store complete executive profile responses
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'attendees' AND column_name = 'executive_profile_data'
  ) THEN
    ALTER TABLE attendees ADD COLUMN executive_profile_data JSONB DEFAULT NULL;
  END IF;
END $$;