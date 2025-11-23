/*
  # Fix Security and Performance Issues - Part 1

  1. Add Missing Indexes on Foreign Keys
  2. Optimize RLS Policies with SELECT auth.uid()

  This migration improves query performance and security.
*/

-- =====================================================
-- ADD MISSING INDEXES ON FOREIGN KEYS
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_evaluator_assignments_assigned_by 
ON evaluator_assignments(assigned_by);

CREATE INDEX IF NOT EXISTS idx_generated_pdfs_issued_by 
ON generated_pdfs(issued_by);

CREATE INDEX IF NOT EXISTS idx_generated_pdfs_template_id 
ON generated_pdfs(template_id);

CREATE INDEX IF NOT EXISTS idx_supervisor_assignments_assigned_by 
ON supervisor_assignments(assigned_by);

CREATE INDEX IF NOT EXISTS idx_templates_created_by 
ON templates(created_by);

-- =====================================================
-- DROP AND RECREATE RLS POLICIES WITH OPTIMIZED auth.uid()
-- =====================================================

-- USERS TABLE POLICIES
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Admins can view all users" ON users;
DROP POLICY IF EXISTS "Admins can update any user" ON users;
DROP POLICY IF EXISTS "Admins can delete users" ON users;
DROP POLICY IF EXISTS "Admins can create users" ON users;

CREATE POLICY "Users can view own profile" ON users
FOR SELECT TO authenticated
USING (auth_user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update own profile" ON users
FOR UPDATE TO authenticated
USING (auth_user_id = (SELECT auth.uid()));

CREATE POLICY "Admins can view all users" ON users
FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM users 
  WHERE auth_user_id = (SELECT auth.uid()) AND role = 'admin'
));

CREATE POLICY "Admins can update any user" ON users
FOR UPDATE TO authenticated
USING (EXISTS (
  SELECT 1 FROM users 
  WHERE auth_user_id = (SELECT auth.uid()) AND role = 'admin'
));

CREATE POLICY "Admins can delete users" ON users
FOR DELETE TO authenticated
USING (EXISTS (
  SELECT 1 FROM users 
  WHERE auth_user_id = (SELECT auth.uid()) AND role = 'admin'
));

CREATE POLICY "Admins can create users" ON users
FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM users 
  WHERE auth_user_id = (SELECT auth.uid()) AND role = 'admin'
));

-- IP_RECORDS TABLE POLICIES
DROP POLICY IF EXISTS "Applicants view own records" ON ip_records;
DROP POLICY IF EXISTS "Applicants create records" ON ip_records;
DROP POLICY IF EXISTS "Applicants update own records" ON ip_records;
DROP POLICY IF EXISTS "Supervisors view assigned records" ON ip_records;
DROP POLICY IF EXISTS "Supervisors update assigned" ON ip_records;
DROP POLICY IF EXISTS "Evaluators view assigned records" ON ip_records;
DROP POLICY IF EXISTS "Evaluators update assigned" ON ip_records;
DROP POLICY IF EXISTS "Admins view all records" ON ip_records;
DROP POLICY IF EXISTS "Admins update any record" ON ip_records;
DROP POLICY IF EXISTS "Admins delete records" ON ip_records;

CREATE POLICY "Applicants view own records" ON ip_records
FOR SELECT TO authenticated
USING (applicant_id = (SELECT id FROM users WHERE auth_user_id = (SELECT auth.uid())));

CREATE POLICY "Applicants create records" ON ip_records
FOR INSERT TO authenticated
WITH CHECK (applicant_id = (SELECT id FROM users WHERE auth_user_id = (SELECT auth.uid())));

CREATE POLICY "Applicants update own records" ON ip_records
FOR UPDATE TO authenticated
USING (applicant_id = (SELECT id FROM users WHERE auth_user_id = (SELECT auth.uid())));

CREATE POLICY "Supervisors view assigned records" ON ip_records
FOR SELECT TO authenticated
USING (supervisor_id = (SELECT id FROM users WHERE auth_user_id = (SELECT auth.uid())));

CREATE POLICY "Supervisors update assigned" ON ip_records
FOR UPDATE TO authenticated
USING (supervisor_id = (SELECT id FROM users WHERE auth_user_id = (SELECT auth.uid())));

CREATE POLICY "Evaluators view assigned records" ON ip_records
FOR SELECT TO authenticated
USING (evaluator_id = (SELECT id FROM users WHERE auth_user_id = (SELECT auth.uid())));

CREATE POLICY "Evaluators update assigned" ON ip_records
FOR UPDATE TO authenticated
USING (evaluator_id = (SELECT id FROM users WHERE auth_user_id = (SELECT auth.uid())));

CREATE POLICY "Admins view all records" ON ip_records
FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM users 
  WHERE auth_user_id = (SELECT auth.uid()) AND role = 'admin'
));

CREATE POLICY "Admins update any record" ON ip_records
FOR UPDATE TO authenticated
USING (EXISTS (
  SELECT 1 FROM users 
  WHERE auth_user_id = (SELECT auth.uid()) AND role = 'admin'
));

CREATE POLICY "Admins delete records" ON ip_records
FOR DELETE TO authenticated
USING (EXISTS (
  SELECT 1 FROM users 
  WHERE auth_user_id = (SELECT auth.uid()) AND role = 'admin'
));

-- IP_DOCUMENTS TABLE POLICIES
DROP POLICY IF EXISTS "View accessible documents" ON ip_documents;
DROP POLICY IF EXISTS "Upload documents" ON ip_documents;
DROP POLICY IF EXISTS "Admins delete documents" ON ip_documents;

CREATE POLICY "View accessible documents" ON ip_documents
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM ip_records
    WHERE ip_records.id = ip_documents.ip_record_id
    AND (
      ip_records.applicant_id = (SELECT id FROM users WHERE auth_user_id = (SELECT auth.uid()))
      OR ip_records.supervisor_id = (SELECT id FROM users WHERE auth_user_id = (SELECT auth.uid()))
      OR ip_records.evaluator_id = (SELECT id FROM users WHERE auth_user_id = (SELECT auth.uid()))
      OR EXISTS (SELECT 1 FROM users WHERE auth_user_id = (SELECT auth.uid()) AND role = 'admin')
    )
  )
);

CREATE POLICY "Upload documents" ON ip_documents
FOR INSERT TO authenticated
WITH CHECK (
  uploader_id = (SELECT id FROM users WHERE auth_user_id = (SELECT auth.uid()))
);

CREATE POLICY "Admins delete documents" ON ip_documents
FOR DELETE TO authenticated
USING (EXISTS (
  SELECT 1 FROM users 
  WHERE auth_user_id = (SELECT auth.uid()) AND role = 'admin'
));

-- GENERATED_PDFS TABLE POLICIES
DROP POLICY IF EXISTS "View accessible PDFs" ON generated_pdfs;
DROP POLICY IF EXISTS "Admins create PDFs" ON generated_pdfs;

CREATE POLICY "View accessible PDFs" ON generated_pdfs
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM ip_records
    WHERE ip_records.id = generated_pdfs.ip_record_id
    AND (
      ip_records.applicant_id = (SELECT id FROM users WHERE auth_user_id = (SELECT auth.uid()))
      OR EXISTS (SELECT 1 FROM users WHERE auth_user_id = (SELECT auth.uid()) AND role = 'admin')
    )
  )
);

CREATE POLICY "Admins create PDFs" ON generated_pdfs
FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM users 
  WHERE auth_user_id = (SELECT auth.uid()) AND role = 'admin'
));

-- ACTIVITY_LOGS TABLE POLICIES
DROP POLICY IF EXISTS "View own logs" ON activity_logs;
DROP POLICY IF EXISTS "Admins view all logs" ON activity_logs;

CREATE POLICY "View own logs" ON activity_logs
FOR SELECT TO authenticated
USING (user_id = (SELECT id FROM users WHERE auth_user_id = (SELECT auth.uid())));

CREATE POLICY "Admins view all logs" ON activity_logs
FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM users 
  WHERE auth_user_id = (SELECT auth.uid()) AND role = 'admin'
));

-- NOTIFICATIONS TABLE POLICIES
DROP POLICY IF EXISTS "View own notifications" ON notifications;
DROP POLICY IF EXISTS "Update own notifications" ON notifications;

CREATE POLICY "View own notifications" ON notifications
FOR SELECT TO authenticated
USING (user_id = (SELECT id FROM users WHERE auth_user_id = (SELECT auth.uid())));

CREATE POLICY "Update own notifications" ON notifications
FOR UPDATE TO authenticated
USING (user_id = (SELECT id FROM users WHERE auth_user_id = (SELECT auth.uid())));

-- SUPERVISOR_ASSIGNMENTS TABLE POLICIES
DROP POLICY IF EXISTS "Supervisors view assignments" ON supervisor_assignments;
DROP POLICY IF EXISTS "Supervisors update assignments" ON supervisor_assignments;
DROP POLICY IF EXISTS "Create assignments" ON supervisor_assignments;
DROP POLICY IF EXISTS "Admins view all assignments" ON supervisor_assignments;

CREATE POLICY "Supervisors view assignments" ON supervisor_assignments
FOR SELECT TO authenticated
USING (supervisor_id = (SELECT id FROM users WHERE auth_user_id = (SELECT auth.uid())));

CREATE POLICY "Supervisors update assignments" ON supervisor_assignments
FOR UPDATE TO authenticated
USING (supervisor_id = (SELECT id FROM users WHERE auth_user_id = (SELECT auth.uid())));

CREATE POLICY "Create assignments" ON supervisor_assignments
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM ip_records
    WHERE ip_records.id = supervisor_assignments.ip_record_id
    AND ip_records.applicant_id = (SELECT id FROM users WHERE auth_user_id = (SELECT auth.uid()))
  )
);

CREATE POLICY "Admins view all assignments" ON supervisor_assignments
FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM users 
  WHERE auth_user_id = (SELECT auth.uid()) AND role = 'admin'
));

-- EVALUATOR_ASSIGNMENTS TABLE POLICIES
DROP POLICY IF EXISTS "Evaluators view assignments" ON evaluator_assignments;
DROP POLICY IF EXISTS "Admins view evaluator assignments" ON evaluator_assignments;
DROP POLICY IF EXISTS "Admins create evaluator assignments" ON evaluator_assignments;

CREATE POLICY "Evaluators view assignments" ON evaluator_assignments
FOR SELECT TO authenticated
USING (evaluator_id = (SELECT id FROM users WHERE auth_user_id = (SELECT auth.uid())));

CREATE POLICY "Admins view evaluator assignments" ON evaluator_assignments
FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM users 
  WHERE auth_user_id = (SELECT auth.uid()) AND role = 'admin'
));

CREATE POLICY "Admins create evaluator assignments" ON evaluator_assignments
FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM users 
  WHERE auth_user_id = (SELECT auth.uid()) AND role = 'admin'
));

-- EVALUATIONS TABLE POLICIES
DROP POLICY IF EXISTS "Evaluators view evaluations" ON evaluations;
DROP POLICY IF EXISTS "Evaluators create evaluations" ON evaluations;
DROP POLICY IF EXISTS "Evaluators update evaluations" ON evaluations;
DROP POLICY IF EXISTS "Applicants view their evaluations" ON evaluations;
DROP POLICY IF EXISTS "Admins view all evaluations" ON evaluations;

CREATE POLICY "Evaluators view evaluations" ON evaluations
FOR SELECT TO authenticated
USING (evaluator_id = (SELECT id FROM users WHERE auth_user_id = (SELECT auth.uid())));

CREATE POLICY "Evaluators create evaluations" ON evaluations
FOR INSERT TO authenticated
WITH CHECK (evaluator_id = (SELECT id FROM users WHERE auth_user_id = (SELECT auth.uid())));

CREATE POLICY "Evaluators update evaluations" ON evaluations
FOR UPDATE TO authenticated
USING (evaluator_id = (SELECT id FROM users WHERE auth_user_id = (SELECT auth.uid())));

CREATE POLICY "Applicants view their evaluations" ON evaluations
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM ip_records
    WHERE ip_records.id = evaluations.ip_record_id
    AND ip_records.applicant_id = (SELECT id FROM users WHERE auth_user_id = (SELECT auth.uid()))
  )
);

CREATE POLICY "Admins view all evaluations" ON evaluations
FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM users 
  WHERE auth_user_id = (SELECT auth.uid()) AND role = 'admin'
));

-- TEMPLATES TABLE POLICIES
DROP POLICY IF EXISTS "View active templates" ON templates;
DROP POLICY IF EXISTS "Admins view all templates" ON templates;
DROP POLICY IF EXISTS "Admins manage templates" ON templates;

CREATE POLICY "View active templates" ON templates
FOR SELECT TO authenticated
USING (is_active = true);

CREATE POLICY "Admins view all templates" ON templates
FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM users 
  WHERE auth_user_id = (SELECT auth.uid()) AND role = 'admin'
));

CREATE POLICY "Admins manage templates" ON templates
FOR ALL TO authenticated
USING (EXISTS (
  SELECT 1 FROM users 
  WHERE auth_user_id = (SELECT auth.uid()) AND role = 'admin'
))
WITH CHECK (EXISTS (
  SELECT 1 FROM users 
  WHERE auth_user_id = (SELECT auth.uid()) AND role = 'admin'
));

-- SYSTEM_SETTINGS TABLE POLICIES
DROP POLICY IF EXISTS "View system settings" ON system_settings;
DROP POLICY IF EXISTS "Admins modify settings" ON system_settings;

CREATE POLICY "View system settings" ON system_settings
FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Admins modify settings" ON system_settings
FOR ALL TO authenticated
USING (EXISTS (
  SELECT 1 FROM users 
  WHERE auth_user_id = (SELECT auth.uid()) AND role = 'admin'
))
WITH CHECK (EXISTS (
  SELECT 1 FROM users 
  WHERE auth_user_id = (SELECT auth.uid()) AND role = 'admin'
));