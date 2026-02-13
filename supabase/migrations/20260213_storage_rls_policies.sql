-- =====================================================
-- TRANSNEXT LOGISTIK - Storage RLS Policies
-- Migration: 20260213_storage_rls_policies.sql
-- =====================================================
-- Bucket: belege
-- Pfad-Format: tours/<tour_uuid>/(pickup|dropoff)/photos/...
-- =====================================================
-- Helper: Lesezugriff prüfen
CREATE OR REPLACE FUNCTION public.can_access_tour_storage(object_name text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tour_id uuid;
  v_fahrer_id uuid;
  v_can_access boolean := false;
BEGIN
  IF is_admin_or_disponent() THEN RETURN true; END IF;
  IF object_name ~ '^tours/[0-9a-f-]{36}/' THEN
    v_tour_id := (regexp_match(object_name, '^tours/([0-9a-f-]{36})/'))[1]::uuid;
  ELSE
    RETURN false;
  END IF;
  SELECT id INTO v_fahrer_id FROM fahrer WHERE user_id = auth.uid() LIMIT 1;
  IF v_fahrer_id IS NULL THEN RETURN false; END IF;
  SELECT true INTO v_can_access FROM tours t
  WHERE t.id = v_tour_id AND t.assigned_driver_id = v_fahrer_id;
  RETURN COALESCE(v_can_access, false);
END;
$$;
-- Helper: Schreibzugriff prüfen (nur offene Touren)
CREATE OR REPLACE FUNCTION public.can_write_tour_storage(object_name text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tour_id uuid;
  v_fahrer_id uuid;
  v_can_write boolean := false;
BEGIN
  IF is_admin_or_disponent() THEN RETURN true; END IF;
  IF object_name ~ '^tours/[0-9a-f-]{36}/' THEN
    v_tour_id := (regexp_match(object_name, '^tours/([0-9a-f-]{36})/'))[1]::uuid;
  ELSE
    RETURN false;
  END IF;
  SELECT id INTO v_fahrer_id FROM fahrer WHERE user_id = auth.uid() LIMIT 1;
  IF v_fahrer_id IS NULL THEN RETURN false; END IF;
  SELECT true INTO v_can_write FROM tours t
  WHERE t.id = v_tour_id 
    AND t.assigned_driver_id = v_fahrer_id 
    AND t.status <> 'abgeschlossen';
  RETURN COALESCE(v_can_write, false);
END;
$$;
GRANT EXECUTE ON FUNCTION public.can_access_tour_storage(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_write_tour_storage(text) TO authenticated;
-- Storage Policies (auf storage.objects)
-- INSERT
CREATE POLICY "belege_insert" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'belege' AND public.can_write_tour_storage(name));
-- SELECT
CREATE POLICY "belege_select" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'belege' AND public.can_access_tour_storage(name));
-- UPDATE (für upsert: true)
CREATE POLICY "belege_update" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'belege' AND public.can_write_tour_storage(name))
WITH CHECK (bucket_id = 'belege' AND public.can_write_tour_storage(name));
-- DELETE (nur Admin)
CREATE POLICY "belege_delete" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'belege' AND public.is_admin_or_disponent());
