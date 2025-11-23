/*
  # Fix track_status_changes trigger to handle enum to text conversion

  1. Changes
    - Update track_ip_record_status_change function to properly cast enum to text
    - This prevents the "invalid input value for enum ip_status: 'none'" error

  2. Technical Details
    - The issue was that concatenating enum values with strings causes PostgreSQL
      to try to cast the string back to enum, which fails for 'none'
    - Solution: Cast enum values to text explicitly before concatenation
*/

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
      NEW.status::text,
      auth.uid(),
      'status_change',
      'Status changed from ' || COALESCE(OLD.status::text, 'none') || ' to ' || NEW.status::text
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
