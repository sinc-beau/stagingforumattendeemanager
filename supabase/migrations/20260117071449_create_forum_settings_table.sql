-- Create forum_settings table
-- This table stores configuration for each forum including form IDs and email template IDs

CREATE TABLE IF NOT EXISTS forum_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  forum_id uuid NOT NULL,
  initial_registration_form_id text DEFAULT '',
  executive_profile_form_id text DEFAULT '',
  approved_email_template_id text DEFAULT '',
  denied_email_template_id text DEFAULT '',
  waitlisted_email_template_id text DEFAULT '',
  preliminary_approved_email_template_id text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(forum_id)
);

-- Enable RLS
ALTER TABLE forum_settings ENABLE ROW LEVEL SECURITY;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_forum_settings_forum_id ON forum_settings(forum_id);

-- Add trigger for updated_at
DROP TRIGGER IF EXISTS update_forum_settings_updated_at ON forum_settings;
CREATE TRIGGER update_forum_settings_updated_at
  BEFORE UPDATE ON forum_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();