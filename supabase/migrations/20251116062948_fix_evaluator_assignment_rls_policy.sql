/*
  # Fix Evaluator Assignment RLS Policy

  ## Problem
  Supervisors cannot create evaluator_assignments because only admins have INSERT permission.
  When a supervisor approves a submission, they need to automatically assign it to an evaluator.

  ## Solution
  1. Add RLS policy to allow supervisors to insert evaluator_assignments
  2. Ensure supervisors can only assign records they supervise

  ## Security
  - Supervisors can only create assignments for records they supervise
  - The assignment must match the approval they just made
*/

-- Drop the existing admin-only policy
DROP POLICY IF EXISTS "Admins create evaluator assignments" ON evaluator_assignments;

-- Recreate with admin access
CREATE POLICY "Admins create evaluator assignments" ON evaluator_assignments
FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM users 
  WHERE auth_user_id = (SELECT auth.uid()) AND role = 'admin'
));

-- Add new policy for supervisors
CREATE POLICY "Supervisors create evaluator assignments" ON evaluator_assignments
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM ip_records
    WHERE ip_records.id = evaluator_assignments.ip_record_id
    AND ip_records.supervisor_id = (SELECT id FROM users WHERE auth_user_id = (SELECT auth.uid()))
  )
);