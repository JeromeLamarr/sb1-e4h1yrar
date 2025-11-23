/*
  # University IP Management System - Complete Database Schema

  ## Overview
  This migration creates the complete database infrastructure for the University IP Management and Evaluation System.

  ## 1. New Tables
  - users: Core user management
  - ip_records: Intellectual property submissions
  - ip_documents: Document uploads
  - generated_pdfs: System-generated documents
  - activity_logs: Audit trail
  - notifications: User notifications
  - supervisor_assignments: Supervisor workflow
  - evaluator_assignments: Evaluator assignments
  - evaluations: Evaluation results
  - system_settings: Global configuration
  - templates: Document templates

  ## 2. Security
  - RLS enabled on all tables
  - Role-based access control
  - Authentication required

  ## 3. Important Notes
  - UUIDs for all primary keys
  - Timestamps on all records
  - JSONB for flexible data
  - Foreign key constraints
*/

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create ENUM types
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('applicant', 'supervisor', 'evaluator', 'admin');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE ip_category AS ENUM ('patent', 'copyright', 'trademark', 'design', 'utility_model', 'other');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE ip_status AS ENUM (
    'submitted',
    'waiting_supervisor',
    'supervisor_revision',
    'supervisor_approved',
    'waiting_evaluation',
    'evaluator_revision',
    'evaluator_approved',
    'preparing_legal',
    'ready_for_filing',
    'rejected'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE assignment_status AS ENUM ('pending', 'accepted', 'rejected');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE evaluation_decision AS ENUM ('approved', 'revision', 'rejected');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE document_type AS ENUM ('disclosure', 'attachment', 'evidence', 'draft', 'generated_pdf', 'other');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE template_type AS ENUM ('pdf', 'email', 'form');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- =====================================================
-- 1. USERS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  role user_role NOT NULL DEFAULT 'applicant',
  full_name TEXT NOT NULL,
  affiliation TEXT,
  is_verified BOOLEAN DEFAULT false,
  verification_token TEXT,
  temp_password BOOLEAN DEFAULT false,
  last_login_at TIMESTAMPTZ,
  profile_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_auth_user_id ON users(auth_user_id);

-- =====================================================
-- 2. TEMPLATES TABLE (created before ip_records due to FK)
-- =====================================================
CREATE TABLE IF NOT EXISTS templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  type template_type NOT NULL,
  content TEXT NOT NULL,
  variables JSONB DEFAULT '[]',
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_templates_type ON templates(type);
CREATE INDEX IF NOT EXISTS idx_templates_active ON templates(is_active);

-- =====================================================
-- 3. IP RECORDS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS ip_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  applicant_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category ip_category NOT NULL,
  title TEXT NOT NULL,
  abstract TEXT,
  details JSONB DEFAULT '{}',
  status ip_status NOT NULL DEFAULT 'submitted',
  supervisor_id UUID REFERENCES users(id) ON DELETE SET NULL,
  evaluator_id UUID REFERENCES users(id) ON DELETE SET NULL,
  current_stage TEXT DEFAULT 'Submitted',
  assigned_at TIMESTAMPTZ,
  deadline_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ip_records_applicant ON ip_records(applicant_id);
CREATE INDEX IF NOT EXISTS idx_ip_records_supervisor ON ip_records(supervisor_id);
CREATE INDEX IF NOT EXISTS idx_ip_records_evaluator ON ip_records(evaluator_id);
CREATE INDEX IF NOT EXISTS idx_ip_records_status ON ip_records(status);
CREATE INDEX IF NOT EXISTS idx_ip_records_category ON ip_records(category);

-- =====================================================
-- 4. IP DOCUMENTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS ip_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ip_record_id UUID NOT NULL REFERENCES ip_records(id) ON DELETE CASCADE,
  uploader_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  mime_type TEXT,
  size_bytes BIGINT,
  doc_type document_type NOT NULL DEFAULT 'attachment',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ip_documents_record ON ip_documents(ip_record_id);
CREATE INDEX IF NOT EXISTS idx_ip_documents_uploader ON ip_documents(uploader_id);

-- =====================================================
-- 5. GENERATED PDFS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS generated_pdfs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ip_record_id UUID NOT NULL REFERENCES ip_records(id) ON DELETE CASCADE,
  template_id UUID REFERENCES templates(id) ON DELETE SET NULL,
  file_path TEXT NOT NULL,
  qr_code_value TEXT NOT NULL,
  watermark_applied BOOLEAN DEFAULT true,
  issued_by UUID REFERENCES users(id) ON DELETE SET NULL,
  issued_at TIMESTAMPTZ DEFAULT now(),
  hash TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_generated_pdfs_record ON generated_pdfs(ip_record_id);
CREATE INDEX IF NOT EXISTS idx_generated_pdfs_qr ON generated_pdfs(qr_code_value);

-- =====================================================
-- 6. ACTIVITY LOGS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  ip_record_id UUID REFERENCES ip_records(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_user ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_record ON activity_logs(ip_record_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON activity_logs(created_at DESC);

-- =====================================================
-- 7. NOTIFICATIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  payload JSONB DEFAULT '{}',
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(user_id, is_read);

-- =====================================================
-- 8. SUPERVISOR ASSIGNMENTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS supervisor_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ip_record_id UUID NOT NULL REFERENCES ip_records(id) ON DELETE CASCADE,
  supervisor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES users(id) ON DELETE SET NULL,
  status assignment_status DEFAULT 'pending',
  remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_supervisor_assignments_record ON supervisor_assignments(ip_record_id);
CREATE INDEX IF NOT EXISTS idx_supervisor_assignments_supervisor ON supervisor_assignments(supervisor_id);

-- =====================================================
-- 9. EVALUATOR ASSIGNMENTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS evaluator_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ip_record_id UUID NOT NULL REFERENCES ip_records(id) ON DELETE CASCADE,
  evaluator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category ip_category NOT NULL,
  assigned_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_evaluator_assignments_record ON evaluator_assignments(ip_record_id);
CREATE INDEX IF NOT EXISTS idx_evaluator_assignments_evaluator ON evaluator_assignments(evaluator_id);
CREATE INDEX IF NOT EXISTS idx_evaluator_assignments_category ON evaluator_assignments(category);

-- =====================================================
-- 10. EVALUATIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS evaluations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ip_record_id UUID NOT NULL REFERENCES ip_records(id) ON DELETE CASCADE,
  evaluator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  score JSONB DEFAULT '{}',
  grade TEXT,
  remarks TEXT,
  decision evaluation_decision NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_evaluations_record ON evaluations(ip_record_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_evaluator ON evaluations(evaluator_id);

-- =====================================================
-- 11. SYSTEM SETTINGS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS system_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL DEFAULT '{}',
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_system_settings_key ON system_settings(key);

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE ip_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE ip_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_pdfs ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE supervisor_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluator_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view own profile" ON users FOR SELECT TO authenticated
  USING (auth.uid() = auth_user_id);

CREATE POLICY "Admins can view all users" ON users FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE users.auth_user_id = auth.uid() AND users.role = 'admin'));

CREATE POLICY "Users can update own profile" ON users FOR UPDATE TO authenticated
  USING (auth.uid() = auth_user_id) WITH CHECK (auth.uid() = auth_user_id);

CREATE POLICY "Admins can create users" ON users FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM users WHERE users.auth_user_id = auth.uid() AND users.role = 'admin'));

CREATE POLICY "Admins can update any user" ON users FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE users.auth_user_id = auth.uid() AND users.role = 'admin'));

CREATE POLICY "Admins can delete users" ON users FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE users.auth_user_id = auth.uid() AND users.role = 'admin'));

-- IP Records policies
CREATE POLICY "Applicants view own records" ON ip_records FOR SELECT TO authenticated
  USING (applicant_id = (SELECT id FROM users WHERE auth_user_id = auth.uid()));

CREATE POLICY "Supervisors view assigned records" ON ip_records FOR SELECT TO authenticated
  USING (supervisor_id = (SELECT id FROM users WHERE auth_user_id = auth.uid()));

CREATE POLICY "Evaluators view assigned records" ON ip_records FOR SELECT TO authenticated
  USING (evaluator_id = (SELECT id FROM users WHERE auth_user_id = auth.uid()));

CREATE POLICY "Admins view all records" ON ip_records FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE users.auth_user_id = auth.uid() AND users.role = 'admin'));

CREATE POLICY "Applicants create records" ON ip_records FOR INSERT TO authenticated
  WITH CHECK (applicant_id = (SELECT id FROM users WHERE auth_user_id = auth.uid()));

CREATE POLICY "Applicants update own records" ON ip_records FOR UPDATE TO authenticated
  USING (applicant_id = (SELECT id FROM users WHERE auth_user_id = auth.uid()))
  WITH CHECK (applicant_id = (SELECT id FROM users WHERE auth_user_id = auth.uid()));

CREATE POLICY "Supervisors update assigned" ON ip_records FOR UPDATE TO authenticated
  USING (supervisor_id = (SELECT id FROM users WHERE auth_user_id = auth.uid()));

CREATE POLICY "Evaluators update assigned" ON ip_records FOR UPDATE TO authenticated
  USING (evaluator_id = (SELECT id FROM users WHERE auth_user_id = auth.uid()));

CREATE POLICY "Admins update any record" ON ip_records FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE users.auth_user_id = auth.uid() AND users.role = 'admin'));

CREATE POLICY "Admins delete records" ON ip_records FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE users.auth_user_id = auth.uid() AND users.role = 'admin'));

-- Documents policies
CREATE POLICY "View accessible documents" ON ip_documents FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM ip_records WHERE ip_records.id = ip_documents.ip_record_id AND (
      ip_records.applicant_id = (SELECT id FROM users WHERE auth_user_id = auth.uid()) OR
      ip_records.supervisor_id = (SELECT id FROM users WHERE auth_user_id = auth.uid()) OR
      ip_records.evaluator_id = (SELECT id FROM users WHERE auth_user_id = auth.uid()) OR
      EXISTS (SELECT 1 FROM users WHERE auth_user_id = auth.uid() AND role = 'admin')
    )
  ));

CREATE POLICY "Upload documents" ON ip_documents FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM ip_records WHERE ip_records.id = ip_documents.ip_record_id
    AND ip_records.applicant_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
  ));

CREATE POLICY "Admins delete documents" ON ip_documents FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE users.auth_user_id = auth.uid() AND users.role = 'admin'));

-- Generated PDFs policies
CREATE POLICY "View accessible PDFs" ON generated_pdfs FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM ip_records WHERE ip_records.id = generated_pdfs.ip_record_id AND (
      ip_records.applicant_id = (SELECT id FROM users WHERE auth_user_id = auth.uid()) OR
      EXISTS (SELECT 1 FROM users WHERE auth_user_id = auth.uid() AND role = 'admin')
    )
  ));

CREATE POLICY "Admins create PDFs" ON generated_pdfs FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM users WHERE users.auth_user_id = auth.uid() AND users.role = 'admin'));

-- Activity logs policies
CREATE POLICY "View own logs" ON activity_logs FOR SELECT TO authenticated
  USING (user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid()));

CREATE POLICY "Admins view all logs" ON activity_logs FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE users.auth_user_id = auth.uid() AND users.role = 'admin'));

CREATE POLICY "Create logs" ON activity_logs FOR INSERT TO authenticated WITH CHECK (true);

-- Notifications policies
CREATE POLICY "View own notifications" ON notifications FOR SELECT TO authenticated
  USING (user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid()));

CREATE POLICY "Update own notifications" ON notifications FOR UPDATE TO authenticated
  USING (user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid()))
  WITH CHECK (user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid()));

CREATE POLICY "Create notifications" ON notifications FOR INSERT TO authenticated WITH CHECK (true);

-- Supervisor assignments policies
CREATE POLICY "Supervisors view assignments" ON supervisor_assignments FOR SELECT TO authenticated
  USING (supervisor_id = (SELECT id FROM users WHERE auth_user_id = auth.uid()));

CREATE POLICY "Admins view all assignments" ON supervisor_assignments FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE users.auth_user_id = auth.uid() AND users.role = 'admin'));

CREATE POLICY "Create assignments" ON supervisor_assignments FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM ip_records WHERE ip_records.id = supervisor_assignments.ip_record_id
    AND ip_records.applicant_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
  ));

CREATE POLICY "Supervisors update assignments" ON supervisor_assignments FOR UPDATE TO authenticated
  USING (supervisor_id = (SELECT id FROM users WHERE auth_user_id = auth.uid()));

-- Evaluator assignments policies
CREATE POLICY "Evaluators view assignments" ON evaluator_assignments FOR SELECT TO authenticated
  USING (evaluator_id = (SELECT id FROM users WHERE auth_user_id = auth.uid()));

CREATE POLICY "Admins view evaluator assignments" ON evaluator_assignments FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE users.auth_user_id = auth.uid() AND users.role = 'admin'));

CREATE POLICY "Admins create evaluator assignments" ON evaluator_assignments FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM users WHERE users.auth_user_id = auth.uid() AND users.role = 'admin'));

-- Evaluations policies
CREATE POLICY "Evaluators view evaluations" ON evaluations FOR SELECT TO authenticated
  USING (evaluator_id = (SELECT id FROM users WHERE auth_user_id = auth.uid()));

CREATE POLICY "Applicants view their evaluations" ON evaluations FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM ip_records WHERE ip_records.id = evaluations.ip_record_id
    AND ip_records.applicant_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
  ));

CREATE POLICY "Admins view all evaluations" ON evaluations FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE users.auth_user_id = auth.uid() AND users.role = 'admin'));

CREATE POLICY "Evaluators create evaluations" ON evaluations FOR INSERT TO authenticated
  WITH CHECK (evaluator_id = (SELECT id FROM users WHERE auth_user_id = auth.uid()));

CREATE POLICY "Evaluators update evaluations" ON evaluations FOR UPDATE TO authenticated
  USING (evaluator_id = (SELECT id FROM users WHERE auth_user_id = auth.uid()))
  WITH CHECK (evaluator_id = (SELECT id FROM users WHERE auth_user_id = auth.uid()));

-- System settings policies
CREATE POLICY "View system settings" ON system_settings FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins modify settings" ON system_settings FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE users.auth_user_id = auth.uid() AND users.role = 'admin'));

-- Templates policies
CREATE POLICY "View active templates" ON templates FOR SELECT TO authenticated USING (is_active = true);

CREATE POLICY "Admins view all templates" ON templates FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE users.auth_user_id = auth.uid() AND users.role = 'admin'));

CREATE POLICY "Admins manage templates" ON templates FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE users.auth_user_id = auth.uid() AND users.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM users WHERE users.auth_user_id = auth.uid() AND users.role = 'admin'));

-- =====================================================
-- FUNCTIONS AND TRIGGERS
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TRIGGER update_ip_records_updated_at BEFORE UPDATE ON ip_records
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TRIGGER update_ip_documents_updated_at BEFORE UPDATE ON ip_documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TRIGGER update_generated_pdfs_updated_at BEFORE UPDATE ON generated_pdfs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TRIGGER update_supervisor_assignments_updated_at BEFORE UPDATE ON supervisor_assignments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TRIGGER update_evaluator_assignments_updated_at BEFORE UPDATE ON evaluator_assignments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TRIGGER update_evaluations_updated_at BEFORE UPDATE ON evaluations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TRIGGER update_system_settings_updated_at BEFORE UPDATE ON system_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TRIGGER update_templates_updated_at BEFORE UPDATE ON templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- =====================================================
-- INSERT DEFAULT DATA
-- =====================================================

INSERT INTO system_settings (key, value, description) VALUES
  ('theme', '{"primaryColor": "#2563eb", "secondaryColor": "#10b981", "logo": null}', 'System theme configuration'),
  ('email_config', '{"from_name": "UCC IP Office", "from_email": "noreply@ucc-ip.edu"}', 'Email configuration'),
  ('workflow_config', '{"auto_assign_evaluators": true, "evaluation_deadline_days": 14}', 'Workflow automation settings')
ON CONFLICT (key) DO NOTHING;

INSERT INTO templates (name, type, content, variables) VALUES
  (
    'Welcome Email',
    'email',
    'Hello {{full_name}},\n\nYour account has been created.\n\nLogin: {{email}}\nTemporary password: {{temp_password}}\n\nPlease verify your email: {{verification_link}}\n\nThanks,\nUCC IP Office',
    '["full_name", "email", "temp_password", "verification_link"]'
  ),
  (
    'Submission Received',
    'email',
    'Hi {{full_name}},\n\nWe received your submission "{{ip_title}}".\nCurrent status: Submitted.\n\nYou can track progress here: {{link_to_record}}\n\nRegards,\nUCC IP Office',
    '["full_name", "ip_title", "link_to_record"]'
  ),
  (
    'Certificate Template',
    'pdf',
    '<!DOCTYPE html><html><head><style>body { font-family: Arial; }</style></head><body><h1>Certificate of IP</h1><p>{{applicant_name}}</p><p>{{ip_title}}</p></body></html>',
    '["applicant_name", "ip_title", "ip_id", "issued_at"]'
  )
ON CONFLICT DO NOTHING;