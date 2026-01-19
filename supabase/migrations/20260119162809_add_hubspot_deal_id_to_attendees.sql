/*
  # Add HubSpot Deal ID to attendees table

  1. Changes
    - Add `hubspot_deal_id` column to store the HubSpot deal ID for synced attendees
    - This enables updating deals when attendee status changes instead of creating duplicates
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'attendees' AND column_name = 'hubspot_deal_id'
  ) THEN
    ALTER TABLE attendees ADD COLUMN hubspot_deal_id text;
  END IF;
END $$;
