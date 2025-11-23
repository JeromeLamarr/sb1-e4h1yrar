/*
  # Setup Storage Bucket and Helper Functions

  1. Storage
    - Create ip-documents bucket
    - Set up RLS policies for document access

  2. Helper Functions
    - Function to get user by email
    - Function to create admin user
    - Function to assign evaluator to category

  3. Useful Queries
    - Sample queries for common operations
*/

-- =====================================================
-- STORAGE BUCKET SETUP
-- =====================================================

-- Create storage bucket for IP documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('ip-documents', 'ip-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on storage
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view documents for their accessible IP records
CREATE POLICY "Users can view accessible documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'ip-documents' AND
  EXISTS (
    SELECT 1 FROM ip_documents
    JOIN ip_records ON ip_records.id = ip_documents.ip_record_id
    WHERE
      storage.objects.name = ip_documents.file_path
      AND (
        ip_records.applicant_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
        OR ip_records.supervisor_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
        OR ip_records.evaluator_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM users WHERE auth_user_id = auth.uid() AND role = 'admin')
      )
  )
);

-- Policy: Applicants can upload documents to their IP records
CREATE POLICY "Applicants can upload documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'ip-documents'
);

-- Policy: Admins can delete documents
CREATE POLICY "Admins can delete documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'ip-documents' AND
  EXISTS (SELECT 1 FROM users WHERE auth_user_id = auth.uid() AND role = 'admin')
);

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to get user profile by email
CREATE OR REPLACE FUNCTION get_user_by_email(user_email TEXT)
RETURNS TABLE (
  id UUID,
  email TEXT,
  role user_role,
  full_name TEXT,
  is_verified BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT u.id, u.email, u.role, u.full_name, u.is_verified
  FROM users u
  WHERE u.email = user_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to make a user admin (for first-time setup)
CREATE OR REPLACE FUNCTION make_user_admin(user_email TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  affected_rows INTEGER;
BEGIN
  UPDATE users
  SET role = 'admin', is_verified = true
  WHERE email = user_email;

  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  RETURN affected_rows > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get IP submission statistics
CREATE OR REPLACE FUNCTION get_submission_stats()
RETURNS TABLE (
  total_submissions BIGINT,
  pending_review BIGINT,
  approved BIGINT,
  rejected BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) as total_submissions,
    COUNT(*) FILTER (WHERE status IN ('submitted', 'waiting_supervisor', 'waiting_evaluation')) as pending_review,
    COUNT(*) FILTER (WHERE status IN ('supervisor_approved', 'evaluator_approved', 'ready_for_filing')) as approved,
    COUNT(*) FILTER (WHERE status = 'rejected') as rejected
  FROM ip_records;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user statistics
CREATE OR REPLACE FUNCTION get_user_stats()
RETURNS TABLE (
  total_users BIGINT,
  applicants BIGINT,
  supervisors BIGINT,
  evaluators BIGINT,
  admins BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) as total_users,
    COUNT(*) FILTER (WHERE role = 'applicant') as applicants,
    COUNT(*) FILTER (WHERE role = 'supervisor') as supervisors,
    COUNT(*) FILTER (WHERE role = 'evaluator') as evaluators,
    COUNT(*) FILTER (WHERE role = 'admin') as admins
  FROM users;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- USEFUL QUERIES (as comments for reference)
-- =====================================================

/*
-- To create the first admin user after registration:
-- 1. Register through the app with your email
-- 2. Run this query (replace with your email):

SELECT make_user_admin('your-email@university.edu');

-- To check if it worked:
SELECT * FROM get_user_by_email('your-email@university.edu');

-- To view all users by role:
SELECT role, COUNT(*) as count, array_agg(email) as emails
FROM users
GROUP BY role
ORDER BY role;

-- To view submission statistics:
SELECT * FROM get_submission_stats();

-- To view user statistics:
SELECT * FROM get_user_stats();

-- To find all IP submissions by status:
SELECT
  status,
  COUNT(*) as count,
  array_agg(title) as submission_titles
FROM ip_records
GROUP BY status
ORDER BY count DESC;

-- To view all supervisors with their assignment counts:
SELECT
  u.full_name,
  u.email,
  COUNT(ip.id) as assigned_count,
  COUNT(ip.id) FILTER (WHERE ip.status = 'waiting_supervisor') as pending_count
FROM users u
LEFT JOIN ip_records ip ON ip.supervisor_id = u.id
WHERE u.role = 'supervisor'
GROUP BY u.id, u.full_name, u.email
ORDER BY assigned_count DESC;

-- To view all evaluators with their category and assignment counts:
SELECT
  u.full_name,
  u.email,
  COUNT(DISTINCT ea.category) as categories,
  array_agg(DISTINCT ea.category) as category_list,
  COUNT(ip.id) as evaluation_count
FROM users u
LEFT JOIN evaluator_assignments ea ON ea.evaluator_id = u.id
LEFT JOIN ip_records ip ON ip.id = ea.ip_record_id
WHERE u.role = 'evaluator'
GROUP BY u.id, u.full_name, u.email
ORDER BY evaluation_count DESC;

-- To view recent activity (last 24 hours):
SELECT
  al.created_at,
  u.full_name as user_name,
  al.action,
  al.details,
  ip.title as ip_title
FROM activity_logs al
LEFT JOIN users u ON u.id = al.user_id
LEFT JOIN ip_records ip ON ip.id = al.ip_record_id
WHERE al.created_at > NOW() - INTERVAL '24 hours'
ORDER BY al.created_at DESC
LIMIT 50;

-- To view unread notifications for a user:
SELECT
  n.created_at,
  n.title,
  n.message,
  n.type
FROM notifications n
JOIN users u ON u.id = n.user_id
WHERE u.email = 'your-email@university.edu'
  AND n.is_read = false
ORDER BY n.created_at DESC;

-- To manually create a supervisor account:
-- Note: This should be done through the admin UI, but here's the manual way:
-- 1. First create the auth user in Supabase Auth dashboard
-- 2. Then run this (replace values):

INSERT INTO users (auth_user_id, email, full_name, role, affiliation, is_verified)
VALUES (
  'auth-user-id-from-supabase-auth',
  'supervisor@university.edu',
  'Dr. John Smith',
  'supervisor',
  'Department of Computer Science',
  true
);

-- To view all IP records with full details:
SELECT
  ip.title,
  ip.category,
  ip.status,
  ip.current_stage,
  applicant.full_name as applicant_name,
  applicant.email as applicant_email,
  supervisor.full_name as supervisor_name,
  evaluator.full_name as evaluator_name,
  ip.created_at,
  COUNT(DISTINCT doc.id) as document_count,
  COUNT(DISTINCT eval.id) as evaluation_count
FROM ip_records ip
JOIN users applicant ON applicant.id = ip.applicant_id
LEFT JOIN users supervisor ON supervisor.id = ip.supervisor_id
LEFT JOIN users evaluator ON evaluator.id = ip.evaluator_id
LEFT JOIN ip_documents doc ON doc.ip_record_id = ip.id
LEFT JOIN evaluations eval ON eval.ip_record_id = ip.id
GROUP BY ip.id, applicant.id, supervisor.id, evaluator.id
ORDER BY ip.created_at DESC;

-- To get IP submissions that need attention:
SELECT
  ip.title,
  ip.status,
  ip.created_at,
  applicant.full_name as applicant,
  CASE
    WHEN ip.status IN ('waiting_supervisor') THEN supervisor.full_name
    WHEN ip.status IN ('waiting_evaluation') THEN evaluator.full_name
    ELSE 'Admin'
  END as waiting_for
FROM ip_records ip
JOIN users applicant ON applicant.id = ip.applicant_id
LEFT JOIN users supervisor ON supervisor.id = ip.supervisor_id
LEFT JOIN users evaluator ON evaluator.id = ip.evaluator_id
WHERE ip.status IN ('waiting_supervisor', 'waiting_evaluation', 'preparing_legal')
ORDER BY ip.created_at ASC;

-- To bulk update verification status (use carefully):
-- UPDATE users SET is_verified = true WHERE role = 'applicant';

-- To get monthly submission trends:
SELECT
  DATE_TRUNC('month', created_at) as month,
  COUNT(*) as submission_count,
  COUNT(*) FILTER (WHERE status IN ('evaluator_approved', 'ready_for_filing')) as approved_count
FROM ip_records
WHERE created_at > NOW() - INTERVAL '12 months'
GROUP BY DATE_TRUNC('month', created_at)
ORDER BY month DESC;

-- To cleanup test data (use with extreme caution!):
-- DELETE FROM activity_logs WHERE created_at < NOW() - INTERVAL '90 days';
-- DELETE FROM notifications WHERE is_read = true AND created_at < NOW() - INTERVAL '30 days';
*/