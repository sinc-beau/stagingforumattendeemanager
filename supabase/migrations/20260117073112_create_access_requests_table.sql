/*
  # Create access requests table

  1. New Tables
    - `access_requests`
      - `id` (uuid, primary key)
      - `first_name` (text)
      - `last_name` (text)
      - `email` (text, unique)
      - `status` (text) - pending, approved, denied
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      - `reviewed_at` (timestamptz, nullable)
      - `reviewed_by` (uuid, nullable) - references users table
      - `notes` (text, nullable)

  2. Security
    - Enable RLS on `access_requests` table
    - Add policy for anonymous users to create requests
    - Add policy for authenticated users to read all requests
    - Add policy for authenticated users to update requests
*/

CREATE TABLE IF NOT EXISTS access_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES users(id),
  notes text,
  CONSTRAINT valid_status CHECK (status IN ('pending', 'approved', 'denied'))
);

ALTER TABLE access_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can create access requests"
  ON access_requests FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Authenticated users can view access requests"
  ON access_requests FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can update access requests"
  ON access_requests FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_access_requests_status ON access_requests(status);
CREATE INDEX IF NOT EXISTS idx_access_requests_email ON access_requests(email);
CREATE INDEX IF NOT EXISTS idx_access_requests_created_at ON access_requests(created_at DESC);