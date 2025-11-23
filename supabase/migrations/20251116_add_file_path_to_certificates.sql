/*
  # Add file_path column to certificates table

  1. Changes
    - Add file_path column to store the storage path of the PDF file
    - This allows us to construct proper URLs for certificate downloads

  2. Notes
    - Existing certificates without file_path will need to be regenerated
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'certificates' AND column_name = 'file_path'
  ) THEN
    ALTER TABLE certificates ADD COLUMN file_path TEXT;
  END IF;
END $$;
