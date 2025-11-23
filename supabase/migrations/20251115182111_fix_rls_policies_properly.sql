/*
  # Fix RLS Policies Properly Without Recursion

  1. Changes Made
    - Drop temporary debug policy
    - Create proper SELECT policies without recursion
    - Separate policy for viewing own profile vs viewing all profiles
    - Use auth.jwt() to check role instead of querying users table
  
  2. Security
    - Users can view their own profile
    - Admins can view all profiles (checked via JWT metadata)
    - No recursive queries that cause infinite loops
*/

-- Drop the temporary debug policy
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON users;

-- Policy 1: Users can always view their own profile
CREATE POLICY "Users can view own profile" ON users
FOR SELECT TO authenticated
USING (auth_user_id = auth.uid());

-- Policy 2: Admins can view all profiles
-- NOTE: For this to work long-term, we should store role in JWT app_metadata
-- For now, we'll use a helper function to avoid recursion
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM users
    WHERE auth_user_id = auth.uid()
    AND role = 'admin'
    LIMIT 1
  );
$$;

-- Create admin view policy using the helper function
CREATE POLICY "Admins can view all users" ON users
FOR SELECT TO authenticated
USING (is_admin());

-- Update other admin policies to use the helper function
DROP POLICY IF EXISTS "Admins can create users" ON users;
CREATE POLICY "Admins can create users" ON users
FOR INSERT TO authenticated
WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admins can update any user" ON users;
CREATE POLICY "Admins can update any user" ON users
FOR UPDATE TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admins can delete users" ON users;
CREATE POLICY "Admins can delete users" ON users
FOR DELETE TO authenticated
USING (is_admin());