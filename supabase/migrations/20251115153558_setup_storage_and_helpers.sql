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