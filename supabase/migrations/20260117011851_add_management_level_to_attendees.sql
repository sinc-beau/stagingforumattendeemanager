/*
  # Add management_level field to attendees table

  1. Changes
    - Add `management_level` column to `attendees` table
      - Stores the management level of the attendee (manager, director, vp, cxo)
      - Optional field with default empty string
  
  2. Notes
    - This field will be automatically populated from job titles in the executive profile form
    - Values: 'manager', 'director', 'vp', 'cxo', or empty string if cannot be determined
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'attendees' AND column_name = 'management_level'
  ) THEN
    ALTER TABLE attendees ADD COLUMN management_level text DEFAULT '';
  END IF;
END $$;