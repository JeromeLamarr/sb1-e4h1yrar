/*
  # Fix Function Search Paths

  Recreate functions with proper search_path settings for security.
*/

-- Drop and recreate update_updated_at_column with CASCADE
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Recreate all triggers that depend on the function
CREATE TRIGGER update_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ip_records_updated_at
BEFORE UPDATE ON ip_records
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ip_documents_updated_at
BEFORE UPDATE ON ip_documents
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_generated_pdfs_updated_at
BEFORE UPDATE ON generated_pdfs
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_supervisor_assignments_updated_at
BEFORE UPDATE ON supervisor_assignments
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_evaluator_assignments_updated_at
BEFORE UPDATE ON evaluator_assignments
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_evaluations_updated_at
BEFORE UPDATE ON evaluations
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_system_settings_updated_at
BEFORE UPDATE ON system_settings
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_templates_updated_at
BEFORE UPDATE ON templates
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Update other helper functions with proper search_path
CREATE OR REPLACE FUNCTION get_user_by_email(user_email TEXT)
RETURNS TABLE (
  id UUID,
  email TEXT,
  role user_role,
  full_name TEXT,
  is_verified BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT u.id, u.email, u.role, u.full_name, u.is_verified
  FROM users u
  WHERE u.email = user_email;
END;
$$;

CREATE OR REPLACE FUNCTION make_user_admin(user_email TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected_rows INTEGER;
BEGIN
  UPDATE users
  SET role = 'admin', is_verified = true
  WHERE email = user_email;

  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  RETURN affected_rows > 0;
END;
$$;

CREATE OR REPLACE FUNCTION get_submission_stats()
RETURNS TABLE (
  total_submissions BIGINT,
  pending_review BIGINT,
  approved BIGINT,
  rejected BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) as total_submissions,
    COUNT(*) FILTER (WHERE status IN ('submitted', 'waiting_supervisor', 'waiting_evaluation')) as pending_review,
    COUNT(*) FILTER (WHERE status IN ('supervisor_approved', 'evaluator_approved', 'ready_for_filing')) as approved,
    COUNT(*) FILTER (WHERE status = 'rejected') as rejected
  FROM ip_records;
END;
$$;

CREATE OR REPLACE FUNCTION get_user_stats()
RETURNS TABLE (
  total_users BIGINT,
  applicants BIGINT,
  supervisors BIGINT,
  evaluators BIGINT,
  admins BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;