-- Create attendees table
-- This table stores all forum attendee information including registration status, contact details, and travel info

CREATE TABLE IF NOT EXISTS attendees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  forum_id uuid NOT NULL,
  stage text NOT NULL DEFAULT 'in_queue' CHECK (stage IN ('in_queue', 'preliminary_approved', 'approved', 'denied', 'waitlisted')),
  approval_date timestamptz,
  pre_event_call_scheduled boolean DEFAULT false,
  intro_email_sent_date timestamptz,
  speaker boolean DEFAULT false,
  wishlist text DEFAULT '',
  rebook boolean DEFAULT false,
  council_member boolean DEFAULT false,
  call_setter text DEFAULT '',
  sinc_rep text DEFAULT '',
  first_name text NOT NULL DEFAULT '',
  last_name text NOT NULL DEFAULT '',
  company text DEFAULT '',
  title text DEFAULT '',
  management_level text DEFAULT '',
  linkedin_title text DEFAULT '',
  email text NOT NULL,
  company_email text DEFAULT '',
  cellphone text DEFAULT '',
  linkedin text DEFAULT '',
  company_size text DEFAULT '',
  industry text DEFAULT '',
  company_based_out_of text DEFAULT '',
  city text DEFAULT '',
  state text DEFAULT '',
  flight text DEFAULT '',
  airport text DEFAULT '',
  hotel text DEFAULT '',
  arriving timestamptz,
  departing timestamptz,
  dietary_notes text DEFAULT '',
  gender text DEFAULT '',
  notes text DEFAULT '',
  denial_reason text,
  executive_profile_received boolean DEFAULT false,
  executive_profile_data jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE attendees ENABLE ROW LEVEL SECURITY;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_attendees_forum_id ON attendees(forum_id);
CREATE INDEX IF NOT EXISTS idx_attendees_stage ON attendees(stage);
CREATE INDEX IF NOT EXISTS idx_attendees_email ON attendees(email);

-- Add trigger for updated_at
DROP TRIGGER IF EXISTS update_attendees_updated_at ON attendees;
CREATE TRIGGER update_attendees_updated_at
  BEFORE UPDATE ON attendees
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();