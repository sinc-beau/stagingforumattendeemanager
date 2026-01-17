/*
  # Add Denial Reason to Attendees

  1. Changes
    - Add `denial_reason` text column to `attendees` table
    - This will store the reason when an attendee is denied
    - Minimum 10 characters required at application level

  2. Notes
    - Column is nullable since only denied attendees will have this value
    - No RLS changes needed as it inherits existing table policies
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'attendees' AND column_name = 'denial_reason'
  ) THEN
    ALTER TABLE attendees ADD COLUMN denial_reason text;
  END IF;
END $$;
