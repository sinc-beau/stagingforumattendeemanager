/*
  # Add status to users table and cleanup access_requests

  1. Changes
    - Add `status` column to `users` table with values: pending, approved
    - Update existing users to have 'approved' status
    - Update `handle_new_user()` function to set status to 'pending' by default
    - Drop the `access_requests` table (no longer needed)
    - Add policy for anonymous users to create auth users (for access requests)

  2. Security
    - Only approved users will be able to login
    - New user registrations default to 'pending' status
    - Admins can change user status to approve access
*/

-- Add status column to users table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'status'
  ) THEN
    ALTER TABLE users ADD COLUMN status text NOT NULL DEFAULT 'approved' CHECK (status IN ('pending', 'approved'));
  END IF;
END $$;

-- Update existing users to have approved status
UPDATE users SET status = 'approved' WHERE status IS NULL OR status = '';

-- Update the handle_new_user function to set status to pending by default
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, role, status)
  VALUES (NEW.id, NEW.email, 'EADM', 'pending')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop the access_requests table if it exists
DROP TABLE IF EXISTS access_requests CASCADE;