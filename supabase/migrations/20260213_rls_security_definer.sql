-- =====================================================
-- TRANSNEXT LOGISTIK - RLS mit SECURITY DEFINER
-- Migration: 20260213_rls_security_definer.sql
-- =====================================================
-- Debug-Funktion (temporär für Diagnose)
CREATE OR REPLACE FUNCTION public.debug_can_write_protocol(_tour_id uuid)
RETURNS TABLE (
  auth_uid uuid,
  input_tour_id uuid,
  tour_exists boolean,
  assigned_driver_id uuid,
  fahrer_id_from_auth uuid,
  is_assigned boolean,
  tour_status text,
  can_write boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tour_exists boolean;
  v_assigned_driver_id uuid;
  v_fahrer_id uuid;
  v_tour_status text;
  v_is_assigned boolean;
  v_can_write boolean;
BEGIN
  SELECT id INTO v_fahrer_id FROM fahrer WHERE user_id = auth.uid() LIMIT 1;
  SELECT true, t.assigned_driver_id, t.status::text
  INTO v_tour_exists, v_assigned_driver_id, v_tour_status
  FROM tours t WHERE t.id = _tour_id;
  v_tour_exists := COALESCE(v_tour_exists, false);
  v_is_assigned := (v_assigned_driver_id IS NOT NULL AND v_assigned_driver_id = v_fahrer_id);
  v_can_write := (v_is_assigned AND v_tour_status IS DISTINCT FROM 'abgeschlossen');
  RETURN QUERY SELECT auth.uid(), _tour_id, v_tour_exists, v_assigned_driver_id, v_fahrer_id, v_is_assigned, v_tour_status, v_can_write;
END;
$$;
-- can_write_protocol: Prüft Schreibzugriff
CREATE OR REPLACE FUNCTION public.can_write_protocol(_tour_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_fahrer_id uuid;
  v_can_write boolean := false;
BEGIN
  SELECT id INTO v_fahrer_id FROM fahrer WHERE user_id = auth.uid() LIMIT 1;
  IF is_admin_or_disponent() THEN RETURN true; END IF;
  SELECT true INTO v_can_write FROM tours t
  WHERE t.id = _tour_id AND t.assigned_driver_id = v_fahrer_id AND t.status <> 'abgeschlossen';
  RETURN COALESCE(v_can_write, false);
END;
$$;
-- can_read_protocol: Prüft Lesezugriff
CREATE OR REPLACE FUNCTION public.can_read_protocol(_tour_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_fahrer_id uuid;
  v_can_read boolean := false;
BEGIN
  SELECT id INTO v_fahrer_id FROM fahrer WHERE user_id = auth.uid() LIMIT 1;
  IF is_admin_or_disponent() THEN RETURN true; END IF;
  SELECT true INTO v_can_read FROM tours t
  WHERE t.id = _tour_id AND t.assigned_driver_id = v_fahrer_id;
  RETURN COALESCE(v_can_read, false);
END;
$$;
-- can_write_damage_photo / can_read_damage_photo
CREATE OR REPLACE FUNCTION public.can_write_damage_photo(_damage_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_tour_id uuid;
BEGIN
  SELECT tour_id INTO v_tour_id FROM tour_damages WHERE id = _damage_id;
  IF v_tour_id IS NULL THEN RETURN false; END IF;
  RETURN can_write_protocol(v_tour_id);
END;
$$;
CREATE OR REPLACE FUNCTION public.can_read_damage_photo(_damage_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_tour_id uuid;
BEGIN
  SELECT tour_id INTO v_tour_id FROM tour_damages WHERE id = _damage_id;
  IF v_tour_id IS NULL THEN RETURN false; END IF;
  RETURN can_read_protocol(v_tour_id);
END;
$$;
-- Grants
GRANT EXECUTE ON FUNCTION public.debug_can_write_protocol(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_write_protocol(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_read_protocol(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_write_damage_photo(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_read_damage_photo(uuid) TO authenticated;
-- Policies wurden via Supabase MCP angewendet (siehe Report)