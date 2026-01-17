/*
  # Create users table and authentication system

  1. New Tables
    - `users`
      - `id` (uuid, primary key) - links to auth.users
      - `email` (text, unique) - user's email address
      - `role` (text) - one of: admin, manager, EADM
      - `created_at` (timestamptz) - when user was created
      - `updated_at` (timestamptz) - when user was last updated
  
  2. Security
    - Enable RLS on `users` table
    - Add policy for authenticated users to read their own data
    - Add policy for admins to manage all users
    - Create helper function to get current user's role
    - Update RLS policies on existing tables to require authentication
  
  3. Functions
    - `get_user_role()` - returns the role of the current authenticated user
    - Trigger to sync auth.users with users table
  
  4. Notes
    - Users table is linked to Supabase auth.users using the same UUID
    - All sensitive operations now require authentication
    - Role-based access is enforced at the database level
*/

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  role text NOT NULL DEFAULT 'EADM' CHECK (role IN ('admin', 'manager', 'EADM')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create function to get current user's role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS text AS $$
  SELECT role FROM users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- RLS Policies for users table
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all users"
  ON users FOR SELECT
  TO authenticated
  USING (get_user_role() = 'admin');

CREATE POLICY "Admins can create users"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "Admins can update users"
  ON users FOR UPDATE
  TO authenticated
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "Admins can delete users"
  ON users FOR DELETE
  TO authenticated
  USING (get_user_role() = 'admin');

-- Update RLS policies for attendees table
DROP POLICY IF EXISTS "Enable all access for service role" ON attendees;

CREATE POLICY "Authenticated users can view attendees"
  ON attendees FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Managers and admins can insert attendees"
  ON attendees FOR INSERT
  TO authenticated
  WITH CHECK (get_user_role() IN ('admin', 'manager'));

CREATE POLICY "All authenticated users can update attendees"
  ON attendees FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admins can delete attendees"
  ON attendees FOR DELETE
  TO authenticated
  USING (get_user_role() = 'admin');

-- Update RLS policies for forums table
DROP POLICY IF EXISTS "Enable all access for service role" ON forums;

CREATE POLICY "Authenticated users can view forums"
  ON forums FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert forums"
  ON forums FOR INSERT
  TO authenticated
  WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "Admins can update forums"
  ON forums FOR UPDATE
  TO authenticated
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "Admins can delete forums"
  ON forums FOR DELETE
  TO authenticated
  USING (get_user_role() = 'admin');

-- Update RLS policies for forum_settings table
DROP POLICY IF EXISTS "Enable all access for service role" ON forum_settings;

CREATE POLICY "Authenticated users can view forum settings"
  ON forum_settings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Managers and admins can insert forum settings"
  ON forum_settings FOR INSERT
  TO authenticated
  WITH CHECK (get_user_role() IN ('admin', 'manager'));

CREATE POLICY "Managers and admins can update forum settings"
  ON forum_settings FOR UPDATE
  TO authenticated
  USING (get_user_role() IN ('admin', 'manager'))
  WITH CHECK (get_user_role() IN ('admin', 'manager'));

CREATE POLICY "Admins can delete forum settings"
  ON forum_settings FOR DELETE
  TO authenticated
  USING (get_user_role() = 'admin');

-- Update RLS policies for email_audit_log table
DROP POLICY IF EXISTS "Enable all access for service role" ON email_audit_log;

CREATE POLICY "Authenticated users can view email audit log"
  ON email_audit_log FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Managers and admins can insert email audit log"
  ON email_audit_log FOR INSERT
  TO authenticated
  WITH CHECK (get_user_role() IN ('admin', 'manager'));

-- Function to automatically create user record when auth user is created
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, role)
  VALUES (NEW.id, NEW.email, 'EADM');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create user record when auth user is created
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at trigger to users table
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();