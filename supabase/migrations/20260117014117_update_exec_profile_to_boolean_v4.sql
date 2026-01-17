/*
  # Update Executive Profile to Boolean Field

  1. Changes
    - Add 'executive_profile_received' as a boolean column on attendees table
    - Update stage check constraint to remove 'executive_profile_received' from allowed values
    - Default value is false for new records
  
  2. New Stage Flow
    - in_queue (initial status)
    - preliminary_approved
    - approved
    - denied
    - waitlisted
  
  3. Notes
    - Executive profile received is now a separate boolean indicator
    - Users can approve without executive profile (will require approval justification in UI)
*/

-- Add executive_profile_received as a boolean column
ALTER TABLE attendees ADD COLUMN IF NOT EXISTS executive_profile_received boolean DEFAULT false;

-- Drop the old check constraint
ALTER TABLE attendees DROP CONSTRAINT IF EXISTS attendees_stage_check;

-- Add new check constraint without 'executive_profile_received' in the stage values
ALTER TABLE attendees 
  ADD CONSTRAINT attendees_stage_check 
  CHECK (stage = ANY (ARRAY['in_queue'::text, 'preliminary_approved'::text, 'approved'::text, 'denied'::text, 'waitlisted'::text]));