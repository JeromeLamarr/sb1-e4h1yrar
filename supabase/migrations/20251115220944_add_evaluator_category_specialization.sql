/*
  # Add Evaluator Category Specialization

  ## Changes
  1. Add `category_specialization` column to users table
     - Stores which IP category an evaluator specializes in
     - Only applicable to evaluator role
     - Options: patent, copyright, trademark, design, utility_model, other
  
  2. Update Assignment Management
     - Ensure evaluators are only assigned to their specialized category
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'category_specialization'
  ) THEN
    ALTER TABLE public.users
    ADD COLUMN category_specialization text;
    
    COMMENT ON COLUMN public.users.category_specialization IS 'IP category specialization for evaluators';
  END IF;
END $$;