/*
  # Add Attendance Tracking to Attendees Table

  1. Changes
    - Add `forums_registered_count` (integer) - tracks total forums registered for
    - Add `forums_attended_count` (integer) - tracks total forums attended
    - Add `percent_attendance` (numeric) - stores attendance percentage as a number (50 = 50%)
  
  2. Notes
    - All fields default to 0
    - percent_attendance should be updated when attendance counts change
    - Stored as regular number, not percentage (50% = 50)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'attendees' AND column_name = 'forums_registered_count'
  ) THEN
    ALTER TABLE attendees ADD COLUMN forums_registered_count integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'attendees' AND column_name = 'forums_attended_count'
  ) THEN
    ALTER TABLE attendees ADD COLUMN forums_attended_count integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'attendees' AND column_name = 'percent_attendance'
  ) THEN
    ALTER TABLE attendees ADD COLUMN percent_attendance numeric(5,2) DEFAULT 0;
  END IF;
END $$;