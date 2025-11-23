/*
  # Fix Infinite Recursion in Users Table RLS Policies

  1. Problem
    - The is_admin() function queries the users table, which triggers RLS policies
    - This creates infinite recursion when checking admin permissions
  
  2. Solution
    - Drop all policies first (they depend on the function)
    - Recreate is_admin() function with proper RLS bypass
    - Recreate all policies using the fixed function
  
  3. Security
    - Function is SECURITY DEFINER (runs with creator privileges)
    - Function only returns boolean (no data leakage)
    - Function is STABLE (can't modify data)
    - Sets proper search_path to prevent SQL injection
*/

-- Drop all existing policies on users table first
DROP POLICY IF EXISTS "Allow user registration" ON users;
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Admins can view all users" ON users;
DROP POLICY IF EXISTS "Admins can create users" ON users;
DROP POLICY IF EXISTS "Admins can update any user" ON users;
DROP POLICY IF EXISTS "Admins can delete users" ON users;
DROP POLICY IF EXISTS "Authenticated users can view supervisors" ON users;
DROP POLICY IF EXISTS "Authenticated users can view evaluators" ON users;

-- Now drop the function
DROP FUNCTION IF EXISTS public.is_admin() CASCADE;

-- Create a proper admin check function that bypasses RLS
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  user_role text;
BEGIN
  -- Get the user's role (SECURITY DEFINER allows bypassing RLS)
  SELECT role INTO user_role
  FROM users
  WHERE auth_user_id = auth.uid()
  LIMIT 1;
  
  -- Return true if user is admin
  RETURN user_role = 'admin';
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- Temporarily disable RLS on users table
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Re-enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Allow user registration during signup
CREATE POLICY "Allow user registration" ON users
FOR INSERT TO authenticated
WITH CHECK (auth_user_id = auth.uid());

-- Users can view their own profile
CREATE POLICY "Users can view own profile" ON users
FOR SELECT TO authenticated
USING (auth_user_id = auth.uid());

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON users
FOR UPDATE TO authenticated
USING (auth_user_id = auth.uid())
WITH CHECK (auth_user_id = auth.uid());

-- Admins can view all users
CREATE POLICY "Admins can view all users" ON users
FOR SELECT TO authenticated
USING (is_admin());

-- Admins can create users
CREATE POLICY "Admins can create users" ON users
FOR INSERT TO authenticated
WITH CHECK (is_admin());

-- Admins can update any user
CREATE POLICY "Admins can update any user" ON users
FOR UPDATE TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- Admins can delete users
CREATE POLICY "Admins can delete users" ON users
FOR DELETE TO authenticated
USING (is_admin());

-- Allow authenticated users to view supervisors and evaluators
CREATE POLICY "Authenticated users can view supervisors" ON users
FOR SELECT TO authenticated
USING (role = 'supervisor');

CREATE POLICY "Authenticated users can view evaluators" ON users
FOR SELECT TO authenticated
USING (role = 'evaluator');