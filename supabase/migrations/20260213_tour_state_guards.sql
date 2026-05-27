-- =====================================================
-- MIGRATION: Tour State Guards
-- 
-- Implementiert DB-seitige Guards für korrekte Status-Übergänge
-- =====================================================

-- 1. FUNCTION: Prüft ob Pickup abgeschlossen ist
CREATE OR REPLACE FUNCTION is_pickup_completed(p_tour_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM tour_protocols
    WHERE tour_id = p_tour_id
    AND phase = 'pickup'
    AND completed_at IS NOT NULL
  );
END;
$$;

-- 2. FUNCTION: Validiert Dropoff (Pickup muss vorher abgeschlossen sein)
CREATE OR REPLACE FUNCTION validate_dropoff_requires_pickup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Nur bei Dropoff-Phase und wenn completed_at gesetzt wird
  IF NEW.phase = 'dropoff' AND NEW.completed_at IS NOT NULL THEN
    -- Prüfe ob Pickup abgeschlossen
    IF NOT is_pickup_completed(NEW.tour_id) THEN
      RAISE EXCEPTION 'Pickup muss vor Dropoff abgeschlossen sein. Tour-ID: %', NEW.tour_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- 3. TRIGGER: Blockiert Dropoff vor Pickup
DROP TRIGGER IF EXISTS validate_dropoff_requires_pickup_trigger ON tour_protocols;
CREATE TRIGGER validate_dropoff_requires_pickup_trigger
BEFORE INSERT OR UPDATE ON tour_protocols
FOR EACH ROW
EXECUTE FUNCTION validate_dropoff_requires_pickup();

-- 4. FUNCTION: Blockiert Re-Submit von bereits abgeschlossenen Protokollen
CREATE OR REPLACE FUNCTION block_protocol_resubmit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  existing_completed_at timestamptz;
  is_admin boolean;
BEGIN
  -- Admins dürfen immer
  SELECT is_admin_or_disponent() INTO is_admin;
  IF is_admin THEN
    RETURN NEW;
  END IF;

  -- Prüfe ob bereits ein completed_at existiert
  SELECT completed_at INTO existing_completed_at
  FROM tour_protocols
  WHERE tour_id = NEW.tour_id AND phase = NEW.phase;

  -- Wenn bereits abgeschlossen und Fahrer versucht zu updaten
  IF existing_completed_at IS NOT NULL AND TG_OP = 'UPDATE' THEN
    -- Erlaube nur Updates die completed_at nicht ändern (z.B. Metadaten)
    IF OLD.completed_at IS NOT NULL AND NEW.completed_at IS NOT NULL THEN
      RAISE EXCEPTION 'Protokoll % für Tour % bereits abgeschlossen. Änderungen nicht erlaubt.', NEW.phase, NEW.tour_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- 5. TRIGGER: Blockiert Re-Submit
DROP TRIGGER IF EXISTS block_protocol_resubmit_trigger ON tour_protocols;
CREATE TRIGGER block_protocol_resubmit_trigger
BEFORE UPDATE ON tour_protocols
FOR EACH ROW
EXECUTE FUNCTION block_protocol_resubmit();

-- 6. FUNCTION: Aktualisiert Tour-Status nach Protokoll-Abschluss (automatisch)
CREATE OR REPLACE FUNCTION auto_update_tour_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  current_status tour_status;
  new_status tour_status;
BEGIN
  -- Nur wenn completed_at gesetzt wird
  IF NEW.completed_at IS NOT NULL AND (OLD.completed_at IS NULL OR TG_OP = 'INSERT') THEN
    -- Hole aktuellen Tour-Status
    SELECT status INTO current_status FROM tours WHERE id = NEW.tour_id;

    -- Bestimme neuen Status
    IF NEW.phase = 'pickup' THEN
      new_status := 'abgabe_offen';
    ELSIF NEW.phase = 'dropoff' THEN
      new_status := 'abgeschlossen';
    ELSE
      RETURN NEW;
    END IF;

    -- Update Tour-Status
    UPDATE tours SET status = new_status, updated_at = now()
    WHERE id = NEW.tour_id;
  END IF;

  RETURN NEW;
END;
$$;

-- 7. TRIGGER: Auto-Update Tour-Status
DROP TRIGGER IF EXISTS auto_update_tour_status_trigger ON tour_protocols;
CREATE TRIGGER auto_update_tour_status_trigger
AFTER INSERT OR UPDATE ON tour_protocols
FOR EACH ROW
EXECUTE FUNCTION auto_update_tour_status();

-- 8. FUNCTION: Prüft ob Tour abgeschlossen ist
CREATE OR REPLACE FUNCTION is_tour_completed(p_tour_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  tour_status tour_status;
BEGIN
  SELECT status INTO tour_status FROM tours WHERE id = p_tour_id;
  RETURN tour_status = 'abgeschlossen';
END;
$$;

-- 9. Aktualisiere can_write_protocol Function
CREATE OR REPLACE FUNCTION can_write_protocol(p_tour_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Admins/Disponenten haben immer Zugriff
  IF is_admin_or_disponent() THEN
    RETURN true;
  END IF;

  -- Fahrer: Nur wenn zugewiesen UND Tour nicht abgeschlossen
  RETURN (
    is_assigned_driver(p_tour_id)
    AND NOT is_tour_completed(p_tour_id)
  );
END;
$$;

-- 10. COMMENT für Dokumentation
COMMENT ON FUNCTION validate_dropoff_requires_pickup() IS 
'Stellt sicher dass Dropoff nur nach abgeschlossenem Pickup möglich ist';

COMMENT ON FUNCTION block_protocol_resubmit() IS 
'Blockiert Fahrer-Updates auf bereits abgeschlossene Protokolle';

COMMENT ON FUNCTION auto_update_tour_status() IS 
'Aktualisiert tours.status automatisch nach Protokoll-Abschluss';

COMMENT ON FUNCTION is_tour_completed(uuid) IS 
'Prüft ob Tour-Status abgeschlossen ist';

COMMENT ON FUNCTION can_write_protocol(uuid) IS 
'RLS Helper: Prüft Schreibberechtigung für Protokolle';
