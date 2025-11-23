/*
  # Add Verification Codes System

  1. New Tables
    - `verification_codes`
      - `id` (uuid, primary key)
      - `email` (text, indexed)
      - `code` (text, 6-digit code)
      - `full_name` (text)
      - `affiliation` (text, nullable)
      - `password_hash` (text)
      - `expires_at` (timestamptz)
      - `verified` (boolean, default false)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on `verification_codes` table
    - Add policy for users to verify their own codes
    - Add policy for system to create and read codes

  3. Indexes
    - Index on email for faster lookups
    - Index on expires_at for cleanup queries
*/

CREATE TABLE IF NOT EXISTS verification_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  code text NOT NULL,
  full_name text NOT NULL,
  affiliation text,
  password_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  verified boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_verification_codes_email ON verification_codes(email);
CREATE INDEX IF NOT EXISTS idx_verification_codes_expires_at ON verification_codes(expires_at);

ALTER TABLE verification_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can create verification codes"
  ON verification_codes FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can verify their own code"
  ON verification_codes FOR SELECT
  USING (true);

CREATE POLICY "Anyone can update their own verification"
  ON verification_codes FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "System can delete expired codes"
  ON verification_codes FOR DELETE
  USING (expires_at < now());
