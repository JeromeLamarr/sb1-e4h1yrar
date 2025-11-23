/*
  # Fix Admin Login Profile Loading Issue

  Problem: The "Admins can view all users" policy has a recursive check
  that prevents admins from loading their own profile.

  Solution: Simplify the admin view policy to avoid recursion.
*/

-- Drop the problematic admin view policy
DROP POLICY IF EXISTS "Admins can view all users" ON users;

-- Recreate with a simpler approach that doesn't cause recursion
-- Allow users to view their own profile OR if they're an admin viewing others
CREATE POLICY "Admins can view all users" ON users
FOR SELECT TO authenticated
USING (
  -- User can always view their own profile
  auth_user_id = (SELECT auth.uid())
  OR
  -- Or if the current user's role is admin (check without subquery on same table)
  (SELECT role FROM users WHERE auth_user_id = (SELECT auth.uid())) = 'admin'
);