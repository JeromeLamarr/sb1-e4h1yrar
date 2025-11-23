/*
  # Allow Applicants to View Supervisors

  1. Purpose
    - Allow applicants to view supervisor list for submission assignments
    - Allow applicants to view evaluators for transparency

  2. Changes
    - Add policy for authenticated users to view supervisors
    - Add policy for authenticated users to view evaluators

  3. Security
    - Only allows viewing, not modifying
    - Limited to role-based visibility (supervisors and evaluators only)
    - Maintains user privacy by not exposing all users
*/

-- Allow authenticated users to view supervisors
CREATE POLICY "Authenticated users can view supervisors"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (role = 'supervisor');

-- Allow authenticated users to view evaluators
CREATE POLICY "Authenticated users can view evaluators"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (role = 'evaluator');
