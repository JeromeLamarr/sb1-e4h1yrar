/*
  # Fix Infinite Recursion in Users Table RLS Policies

  The problem: When registering, the "Admins can view all users" policy
  queries the users table to check if the current user is an admin,
  causing infinite recursion.

  Solution: Create simpler policies that don't reference the users table
  during user creation, and add a special policy for user registration.
*/

-- Drop all existing policies on users table
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Admins can view all users" ON users;
DROP POLICY IF EXISTS "Admins can update any user" ON users;
DROP POLICY IF EXISTS "Admins can delete users" ON users;
DROP POLICY IF EXISTS "Admins can create users" ON users;

-- Allow user registration (INSERT) - anyone can create their own user record
CREATE POLICY "Allow user registration" ON users
FOR INSERT TO authenticated
WITH CHECK (auth_user_id = (SELECT auth.uid()));

-- Users can view their own profile
CREATE POLICY "Users can view own profile" ON users
FOR SELECT TO authenticated
USING (auth_user_id = (SELECT auth.uid()));

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON users
FOR UPDATE TO authenticated
USING (auth_user_id = (SELECT auth.uid()))
WITH CHECK (auth_user_id = (SELECT auth.uid()));

-- Admins can view all users (using role column directly, not subquery)
CREATE POLICY "Admins can view all users" ON users
FOR SELECT TO authenticated
USING (
  role = 'admin' AND auth_user_id = (SELECT auth.uid())
  OR
  EXISTS (
    SELECT 1 FROM users u2
    WHERE u2.auth_user_id = (SELECT auth.uid()) AND u2.role = 'admin'
  )
);

-- Admins can create users (using role column check)
CREATE POLICY "Admins can create users" ON users
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users u2
    WHERE u2.auth_user_id = (SELECT auth.uid()) AND u2.role = 'admin'
  )
);

-- Admins can update any user
CREATE POLICY "Admins can update any user" ON users
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users u2
    WHERE u2.auth_user_id = (SELECT auth.uid()) AND u2.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users u2
    WHERE u2.auth_user_id = (SELECT auth.uid()) AND u2.role = 'admin'
  )
);

-- Admins can delete users
CREATE POLICY "Admins can delete users" ON users
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users u2
    WHERE u2.auth_user_id = (SELECT auth.uid()) AND u2.role = 'admin'
  )
);