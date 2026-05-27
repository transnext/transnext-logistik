-- =====================================================
-- FIX: Storage Policies für Arbeitsnachweise/Auslagennachweise
-- 
-- Problem: Fahrer konnten keine Arbeitsnachweise hochladen
-- Ursache: can_write_tour_storage() erwartete nur tours/<uuid>/... Pfade
-- Lösung: Unterstützung für <user_id>/(arbeitsnachweis|auslagennachweis)/... hinzugefügt
-- =====================================================

-- 1. Aktualisiere can_write_tour_storage
CREATE OR REPLACE FUNCTION can_write_tour_storage(object_name text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_tour_id uuid;
  v_fahrer_id uuid;
  v_path_user_id uuid;
  v_can_write boolean := false;
BEGIN
  -- Admin/Disponent haben immer Zugriff
  IF is_admin_or_disponent() THEN
    RETURN true;
  END IF;

  -- Pfad für Arbeitsnachweise/Auslagennachweise
  -- Format: <user_id>/arbeitsnachweis/... oder <user_id>/auslagennachweis/...
  IF object_name ~ '^[0-9a-f-]{36}/(arbeitsnachweis|auslagennachweis)/' THEN
    v_path_user_id := (regexp_match(object_name, '^([0-9a-f-]{36})/'))[1]::uuid;
    RETURN v_path_user_id = auth.uid();
  END IF;

  -- Bestehende Logik für Tour-Uploads (tours/<uuid>/...)
  IF object_name ~ '^tours/[0-9a-f-]{36}/' THEN
    v_tour_id := (regexp_match(object_name, '^tours/([0-9a-f-]{36})/'))[1]::uuid;
  ELSE
    RETURN false;
  END IF;

  SELECT id INTO v_fahrer_id
  FROM fahrer WHERE user_id = auth.uid() LIMIT 1;

  IF v_fahrer_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT true INTO v_can_write
  FROM tours t
  WHERE t.id = v_tour_id
    AND t.assigned_driver_id = v_fahrer_id
    AND t.status <> 'abgeschlossen';

  RETURN COALESCE(v_can_write, false);
END;
$$;

-- 2. Aktualisiere can_access_tour_storage analog
CREATE OR REPLACE FUNCTION can_access_tour_storage(object_name text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_tour_id uuid;
  v_fahrer_id uuid;
  v_path_user_id uuid;
  v_can_access boolean := false;
BEGIN
  IF is_admin_or_disponent() THEN
    RETURN true;
  END IF;

  IF object_name ~ '^[0-9a-f-]{36}/(arbeitsnachweis|auslagennachweis)/' THEN
    v_path_user_id := (regexp_match(object_name, '^([0-9a-f-]{36})/'))[1]::uuid;
    RETURN v_path_user_id = auth.uid();
  END IF;

  IF object_name ~ '^tours/[0-9a-f-]{36}/' THEN
    v_tour_id := (regexp_match(object_name, '^tours/([0-9a-f-]{36})/'))[1]::uuid;
  ELSE
    RETURN false;
  END IF;

  SELECT id INTO v_fahrer_id
  FROM fahrer WHERE user_id = auth.uid() LIMIT 1;

  IF v_fahrer_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT true INTO v_can_access
  FROM tours t
  WHERE t.id = v_tour_id
    AND t.assigned_driver_id = v_fahrer_id;

  RETURN COALESCE(v_can_access, false);
END;
$$;

COMMENT ON FUNCTION can_write_tour_storage(text) IS 
'Prüft Schreibberechtigung für Storage. Unterstützt: tours/<uuid>/... und <user_id>/(arbeitsnachweis|auslagennachweis)/...';

COMMENT ON FUNCTION can_access_tour_storage(text) IS 
'Prüft Leseberechtigung für Storage. Unterstützt: tours/<uuid>/... und <user_id>/(arbeitsnachweis|auslagennachweis)/...';
