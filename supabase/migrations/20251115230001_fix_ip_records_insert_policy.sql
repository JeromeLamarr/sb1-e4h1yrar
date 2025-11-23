/*
  # Fix IP Records Insert Policy

  1. Purpose
    - Fix RLS policy for applicants creating IP records
    - Simplify the policy to properly check authenticated user

  2. Changes
    - Drop existing "Applicants create records" policy
    - Create new policy with proper WITH CHECK clause
    - Ensure applicants can insert their own records

  3. Security
    - Maintains data security by checking applicant_id matches current user
    - Uses proper authentication check
*/

-- Drop the existing insert policy
DROP POLICY IF EXISTS "Applicants create records" ON public.ip_records;

-- Create new insert policy with proper check
CREATE POLICY "Applicants create records"
  ON public.ip_records
  FOR INSERT
  TO authenticated
  WITH CHECK (
    applicant_id IN (
      SELECT id FROM public.users WHERE auth_user_id = auth.uid()
    )
  );
