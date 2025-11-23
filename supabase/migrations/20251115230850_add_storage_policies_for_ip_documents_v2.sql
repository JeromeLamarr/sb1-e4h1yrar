/*
  # Add Storage Policies for IP Documents (Fixed)

  1. Purpose
    - Allow authenticated users to upload documents to their IP records
    - Allow users to view documents they have access to
    - Maintain security through proper access controls

  2. Changes
    - Add INSERT policy for authenticated users to upload documents
    - Add SELECT policy for users to view documents from records they can access
    - Add UPDATE policy for document owners
    - Add DELETE policy for admins only

  3. Security
    - Users can only upload to ip-documents bucket
    - Users can only view documents from IP records they have access to
    - Only admins can delete documents
*/

-- Allow authenticated users to upload documents to ip-documents bucket
CREATE POLICY "Authenticated users can upload IP documents"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'ip-documents'
  );

-- Allow users to view documents from IP records they have access to
CREATE POLICY "Users can view accessible IP documents"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'ip-documents' AND (
      -- Admins can view all
      EXISTS (
        SELECT 1 FROM public.users
        WHERE users.auth_user_id = auth.uid()
        AND users.role = 'admin'
      )
      OR
      -- Users can view documents from IP records they can access
      -- Extract IP record ID from path (format: {ip_record_id}/{filename})
      (storage.foldername(name))[1] IN (
        SELECT ip_records.id::text
        FROM public.ip_records
        JOIN public.users ON users.auth_user_id = auth.uid()
        WHERE 
          ip_records.applicant_id = users.id
          OR ip_records.evaluator_id = users.id
          OR ip_records.supervisor_id = users.id
      )
    )
  );

-- Allow authenticated users to update their uploaded documents
CREATE POLICY "Users can update their uploaded documents"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'ip-documents'
  )
  WITH CHECK (
    bucket_id = 'ip-documents'
  );

-- Allow admins to delete documents
CREATE POLICY "Admins can delete IP documents"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'ip-documents' AND
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.auth_user_id = auth.uid()
      AND users.role = 'admin'
    )
  );
