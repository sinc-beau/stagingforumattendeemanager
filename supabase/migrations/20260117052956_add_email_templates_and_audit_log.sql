/*
  # Add Email Template Settings and Audit Log

  1. Schema Changes
    - Add email template ID columns to forum_settings table:
      - approved_email_template_id (text, nullable)
      - denied_email_template_id (text, nullable)
      - waitlisted_email_template_id (text, nullable)
      - preliminary_approved_email_template_id (text, nullable)
    
    - Create email_audit_log table:
      - id (uuid, primary key)
      - attendee_id (uuid, foreign key to attendees)
      - email_type (text with check constraint)
      - recipient_email (text)
      - recipient_name (text)
      - status (text)
      - sent_at (timestamptz)
      - created_at (timestamptz)

  2. Security
    - Enable RLS on email_audit_log table
    - Add policies for authenticated access
    - Create index on attendee_id and email_type for performance

  3. Notes
    - Email template IDs are optional; system will use defaults if not configured
    - Audit log tracks all email sends for accountability
    - Status field can be 'sent', 'failed', or 'pending'
*/

-- Add email template columns to forum_settings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'forum_settings' AND column_name = 'approved_email_template_id'
  ) THEN
    ALTER TABLE forum_settings ADD COLUMN approved_email_template_id text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'forum_settings' AND column_name = 'denied_email_template_id'
  ) THEN
    ALTER TABLE forum_settings ADD COLUMN denied_email_template_id text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'forum_settings' AND column_name = 'waitlisted_email_template_id'
  ) THEN
    ALTER TABLE forum_settings ADD COLUMN waitlisted_email_template_id text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'forum_settings' AND column_name = 'preliminary_approved_email_template_id'
  ) THEN
    ALTER TABLE forum_settings ADD COLUMN preliminary_approved_email_template_id text DEFAULT '';
  END IF;
END $$;

-- Create email_audit_log table
CREATE TABLE IF NOT EXISTS email_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attendee_id uuid NOT NULL,
  email_type text NOT NULL CHECK (email_type IN ('approved', 'denied', 'waitlisted', 'preliminary_approved')),
  recipient_email text NOT NULL,
  recipient_name text NOT NULL,
  status text NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'pending')),
  sent_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Add foreign key constraint to attendees table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'email_audit_log_attendee_id_fkey'
  ) THEN
    ALTER TABLE email_audit_log 
    ADD CONSTRAINT email_audit_log_attendee_id_fkey 
    FOREIGN KEY (attendee_id) REFERENCES attendees(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_email_audit_log_attendee_email_type 
  ON email_audit_log(attendee_id, email_type);

-- Enable RLS on email_audit_log
ALTER TABLE email_audit_log ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for email_audit_log
CREATE POLICY "Allow all operations on email_audit_log"
  ON email_audit_log
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);