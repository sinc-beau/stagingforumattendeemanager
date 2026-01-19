/*
  # Add deal code to forum settings

  1. Changes
    - Add `deal_code` column to `forum_settings` table
      - Type: text
      - Nullable: true (optional field)
      - Description: HubSpot deal code for the forum
  
  2. Notes
    - This field will be used to store the deal code for creating HubSpot deals
    - The field is optional and can be added later
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'forum_settings' AND column_name = 'deal_code'
  ) THEN
    ALTER TABLE forum_settings ADD COLUMN deal_code text;
  END IF;
END $$;