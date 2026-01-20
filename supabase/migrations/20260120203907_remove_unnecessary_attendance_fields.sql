/*
  # Remove Unnecessary Attendance Fields

  1. Changes
    - Remove `forums_registered_count` column (not needed)
    - Remove `forums_attended_count` column (not needed)
    - Keep `percent_attendance` column (this is what we need)
  
  2. Notes
    - Only percent_attendance field is needed to track attendance percentage
*/

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'attendees' AND column_name = 'forums_registered_count'
  ) THEN
    ALTER TABLE attendees DROP COLUMN forums_registered_count;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'attendees' AND column_name = 'forums_attended_count'
  ) THEN
    ALTER TABLE attendees DROP COLUMN forums_attended_count;
  END IF;
END $$;