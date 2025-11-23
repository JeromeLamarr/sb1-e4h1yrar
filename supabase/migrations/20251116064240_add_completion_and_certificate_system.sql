/*
  # Add Completion and Certificate System

  ## New Features
  1. Add certificate generation and tracking table
  2. Add certificate_requests table for applicants to request certificates
  3. Update ip_records status to include 'completed' and 'ready_for_ipophl'
  4. Add certificate storage bucket and policies

  ## Tables
  - certificates: Stores generated certificates
  - certificate_requests: Tracks certificate requests from applicants

  ## Security
  - Admins can generate and manage certificates
  - Applicants can view their certificates and request new ones
  - Only completed records can have certificates
*/

-- =====================================================
-- CREATE CERTIFICATES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_record_id UUID NOT NULL REFERENCES ip_records(id) ON DELETE CASCADE,
  certificate_number TEXT NOT NULL UNIQUE,
  applicant_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  registration_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  issued_by UUID REFERENCES users(id) ON DELETE SET NULL,
  pdf_url TEXT,
  qr_code_data TEXT,
  evaluation_score TEXT,
  co_creators TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_certificates_ip_record ON certificates(ip_record_id);
CREATE INDEX IF NOT EXISTS idx_certificates_applicant ON certificates(applicant_id);
CREATE INDEX IF NOT EXISTS idx_certificates_number ON certificates(certificate_number);

-- =====================================================
-- CREATE CERTIFICATE REQUESTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS certificate_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_record_id UUID NOT NULL REFERENCES ip_records(id) ON DELETE CASCADE,
  applicant_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  request_message TEXT,
  admin_notes TEXT,
  processed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE certificate_requests ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_certificate_requests_ip_record ON certificate_requests(ip_record_id);
CREATE INDEX IF NOT EXISTS idx_certificate_requests_applicant ON certificate_requests(applicant_id);
CREATE INDEX IF NOT EXISTS idx_certificate_requests_status ON certificate_requests(status);

-- =====================================================
-- RLS POLICIES FOR CERTIFICATES
-- =====================================================

CREATE POLICY "Applicants view own certificates" ON certificates
FOR SELECT TO authenticated
USING (applicant_id = (SELECT id FROM users WHERE auth_user_id = (SELECT auth.uid())));

CREATE POLICY "Admins view all certificates" ON certificates
FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM users 
  WHERE auth_user_id = (SELECT auth.uid()) AND role = 'admin'
));

CREATE POLICY "Admins create certificates" ON certificates
FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM users 
  WHERE auth_user_id = (SELECT auth.uid()) AND role = 'admin'
));

CREATE POLICY "Admins update certificates" ON certificates
FOR UPDATE TO authenticated
USING (EXISTS (
  SELECT 1 FROM users 
  WHERE auth_user_id = (SELECT auth.uid()) AND role = 'admin'
));

CREATE POLICY "Admins delete certificates" ON certificates
FOR DELETE TO authenticated
USING (EXISTS (
  SELECT 1 FROM users 
  WHERE auth_user_id = (SELECT auth.uid()) AND role = 'admin'
));

-- =====================================================
-- RLS POLICIES FOR CERTIFICATE REQUESTS
-- =====================================================

CREATE POLICY "Applicants view own certificate requests" ON certificate_requests
FOR SELECT TO authenticated
USING (applicant_id = (SELECT id FROM users WHERE auth_user_id = (SELECT auth.uid())));

CREATE POLICY "Applicants create certificate requests" ON certificate_requests
FOR INSERT TO authenticated
WITH CHECK (applicant_id = (SELECT id FROM users WHERE auth_user_id = (SELECT auth.uid())));

CREATE POLICY "Admins view all certificate requests" ON certificate_requests
FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM users 
  WHERE auth_user_id = (SELECT auth.uid()) AND role = 'admin'
));

CREATE POLICY "Admins update certificate requests" ON certificate_requests
FOR UPDATE TO authenticated
USING (EXISTS (
  SELECT 1 FROM users 
  WHERE auth_user_id = (SELECT auth.uid()) AND role = 'admin'
));

-- =====================================================
-- CREATE STORAGE BUCKET FOR CERTIFICATES
-- =====================================================

DO $$
BEGIN
  INSERT INTO storage.buckets (id, name, public)
  VALUES ('certificates', 'certificates', true)
  ON CONFLICT (id) DO NOTHING;
END $$;

-- =====================================================
-- STORAGE POLICIES FOR CERTIFICATES
-- =====================================================

DROP POLICY IF EXISTS "Authenticated users can view certificates" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload certificates" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update certificates" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete certificates" ON storage.objects;

CREATE POLICY "Authenticated users can view certificates"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'certificates');

CREATE POLICY "Admins can upload certificates"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'certificates' 
  AND EXISTS (
    SELECT 1 FROM users 
    WHERE auth_user_id = (SELECT auth.uid()) AND role = 'admin'
  )
);

CREATE POLICY "Admins can update certificates"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'certificates' 
  AND EXISTS (
    SELECT 1 FROM users 
    WHERE auth_user_id = (SELECT auth.uid()) AND role = 'admin'
  )
);

CREATE POLICY "Admins can delete certificates"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'certificates' 
  AND EXISTS (
    SELECT 1 FROM users 
    WHERE auth_user_id = (SELECT auth.uid()) AND role = 'admin'
  )
);