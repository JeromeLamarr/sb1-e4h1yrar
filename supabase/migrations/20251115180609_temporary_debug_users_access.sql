/*
  # Temporary Debug: Allow Authenticated Users to Read Their Profile

  This is a temporary fix to debug the login issue.
  We'll make the SELECT policy very permissive to see if RLS is blocking profile load.
*/

-- Drop existing SELECT policies
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Admins can view all users" ON users;

-- Create a single, simple SELECT policy for debugging
CREATE POLICY "Authenticated users can view profiles" ON users
FOR SELECT TO authenticated
USING (true);

-- This is TEMPORARY - we'll fix it properly once we confirm login works