/*
  # Fix process_tracking trigger to use correct user ID

  1. Changes
    - Update track_ip_record_status_change function to look up users.id from auth.uid()
    - auth.uid() returns auth_user_id, but foreign key references users.id

  2. Technical Details
    - The foreign key constraint was failing because auth.uid() returns the auth system's user ID
    - We need to map this to the actual users table ID via the auth_user_id column
*/

CREATE OR REPLACE FUNCTION track_ip_record_status_change()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id uuid;
BEGIN
  IF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) THEN
    SELECT id INTO v_user_id 
    FROM users 
    WHERE auth_user_id = auth.uid();
    
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
      NEW.status::text,
      v_user_id,
      'status_change',
      'Status changed from ' || COALESCE(OLD.status::text, 'none') || ' to ' || NEW.status::text
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
