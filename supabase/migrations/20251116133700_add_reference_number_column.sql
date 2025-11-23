/*
  # Add Reference Number Column to IP Records

  1. Changes
    - Add `reference_number` column to `ip_records` table
    - Auto-generate reference numbers for existing records
    - Add unique index on reference_number

  2. Security
    - No RLS changes needed (inherits from table)
*/

-- Add reference_number column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ip_records' AND column_name = 'reference_number'
  ) THEN
    ALTER TABLE ip_records ADD COLUMN reference_number TEXT;
  END IF;
END $$;

-- Generate reference numbers for existing records
UPDATE ip_records
SET reference_number = 'IP-' || TO_CHAR(created_at, 'YYYY') || '-' || LPAD(ROW_NUMBER() OVER (ORDER BY created_at)::TEXT, 5, '0')
WHERE reference_number IS NULL;

-- Make it NOT NULL after backfilling
ALTER TABLE ip_records ALTER COLUMN reference_number SET NOT NULL;

-- Add unique constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ip_records_reference_number_key'
  ) THEN
    ALTER TABLE ip_records ADD CONSTRAINT ip_records_reference_number_key UNIQUE (reference_number);
  END IF;
END $$;

-- Create function to auto-generate reference number
CREATE OR REPLACE FUNCTION generate_reference_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.reference_number IS NULL THEN
    NEW.reference_number := 'IP-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(NEXTVAL('ip_records_ref_seq')::TEXT, 5, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create sequence for reference numbers
CREATE SEQUENCE IF NOT EXISTS ip_records_ref_seq START 1;

-- Create trigger
DROP TRIGGER IF EXISTS generate_reference_number_trigger ON ip_records;
CREATE TRIGGER generate_reference_number_trigger
  BEFORE INSERT ON ip_records
  FOR EACH ROW
  EXECUTE FUNCTION generate_reference_number();
