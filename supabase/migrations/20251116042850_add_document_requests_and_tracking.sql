/*
  # Add Document Request System and Process Tracking

  ## New Tables

  1. `document_requests`
    - Tracks requests for additional documents (disclosure forms, certificates, etc.)
    - Links to IP records and requesting users
    - Tracks status (pending, fulfilled, cancelled)

  2. `generated_documents`
    - Stores system-generated documents (evaluation results, certificates)
    - Links to IP records
    - Tracks document type and generation status

  3. `process_tracking`
    - Comprehensive tracking of all process steps
    - Records timestamps, actors, and detailed status

  ## Security
  - RLS enabled on all tables
  - Applicants can view their own requests/tracking
  - Staff can manage all records
*/

-- Document Requests Table
CREATE TABLE IF NOT EXISTS document_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_record_id uuid REFERENCES ip_records(id) ON DELETE CASCADE NOT NULL,
  requested_by uuid REFERENCES users(id) NOT NULL,
  document_type text NOT NULL,
  description text,
  status text DEFAULT 'pending' NOT NULL,
  due_date timestamptz,
  fulfilled_at timestamptz,
  fulfilled_document_id uuid,
  notes text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Generated Documents Table
CREATE TABLE IF NOT EXISTS generated_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_record_id uuid REFERENCES ip_records(id) ON DELETE CASCADE NOT NULL,
  document_type text NOT NULL,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_url text,
  size_bytes bigint NOT NULL,
  generated_by uuid REFERENCES users(id),
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Process Tracking Table
CREATE TABLE IF NOT EXISTS process_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_record_id uuid REFERENCES ip_records(id) ON DELETE CASCADE NOT NULL,
  stage text NOT NULL,
  status text NOT NULL,
  actor_id uuid REFERENCES users(id),
  actor_name text,
  actor_role text,
  action text NOT NULL,
  description text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_document_requests_record ON document_requests(ip_record_id);
CREATE INDEX IF NOT EXISTS idx_document_requests_status ON document_requests(status);
CREATE INDEX IF NOT EXISTS idx_generated_documents_record ON generated_documents(ip_record_id);
CREATE INDEX IF NOT EXISTS idx_generated_documents_type ON generated_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_process_tracking_record ON process_tracking(ip_record_id);
CREATE INDEX IF NOT EXISTS idx_process_tracking_created ON process_tracking(created_at);

-- Enable RLS
ALTER TABLE document_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE process_tracking ENABLE ROW LEVEL SECURITY;

-- RLS Policies for document_requests

CREATE POLICY "Users can view document requests for their submissions"
  ON document_requests FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM ip_records
      WHERE ip_records.id = document_requests.ip_record_id
      AND ip_records.applicant_id = auth.uid()
    )
  );

CREATE POLICY "Staff can view all document requests"
  ON document_requests FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'supervisor', 'evaluator')
    )
  );

CREATE POLICY "Staff can create document requests"
  ON document_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'supervisor', 'evaluator')
    )
  );

CREATE POLICY "Staff can update document requests"
  ON document_requests FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'supervisor', 'evaluator')
    )
  );

CREATE POLICY "Applicants can update their document request status"
  ON document_requests FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM ip_records
      WHERE ip_records.id = document_requests.ip_record_id
      AND ip_records.applicant_id = auth.uid()
    )
  );

-- RLS Policies for generated_documents

CREATE POLICY "Users can view generated documents for their submissions"
  ON generated_documents FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM ip_records
      WHERE ip_records.id = generated_documents.ip_record_id
      AND ip_records.applicant_id = auth.uid()
    )
  );

CREATE POLICY "Staff can view all generated documents"
  ON generated_documents FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'supervisor', 'evaluator')
    )
  );

CREATE POLICY "Staff can create generated documents"
  ON generated_documents FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'supervisor', 'evaluator')
    )
  );

-- RLS Policies for process_tracking

CREATE POLICY "Users can view process tracking for their submissions"
  ON process_tracking FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM ip_records
      WHERE ip_records.id = process_tracking.ip_record_id
      AND ip_records.applicant_id = auth.uid()
    )
  );

CREATE POLICY "Staff can view all process tracking"
  ON process_tracking FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'supervisor', 'evaluator')
    )
  );

CREATE POLICY "Authenticated users can create process tracking"
  ON process_tracking FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Function to automatically track status changes
CREATE OR REPLACE FUNCTION track_ip_record_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) THEN
    INSERT INTO process_tracking (
      ip_record_id,
      stage,
      status,
      actor_id,
      action,
      description
    ) VALUES (
      NEW.id,
      NEW.current_stage,
      NEW.status,
      auth.uid(),
      'status_change',
      'Status changed from ' || COALESCE(OLD.status, 'none') || ' to ' || NEW.status
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to track status changes
DROP TRIGGER IF EXISTS track_status_changes ON ip_records;
CREATE TRIGGER track_status_changes
  AFTER UPDATE ON ip_records
  FOR EACH ROW
  EXECUTE FUNCTION track_ip_record_status_change();

-- Function to update document_requests updated_at
CREATE OR REPLACE FUNCTION update_document_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for document_requests
DROP TRIGGER IF EXISTS update_document_requests_timestamp ON document_requests;
CREATE TRIGGER update_document_requests_timestamp
  BEFORE UPDATE ON document_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_document_requests_updated_at();
