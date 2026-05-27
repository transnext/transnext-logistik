-- =====================================================
-- TRANSNEXT LOGISTIK - Fix RLS Policies
-- Migration: 20260213_fix_rls_policies.sql
-- =====================================================
-- Problem: RLS Policies verwendeten auth.uid() direkt,
-- aber tours.assigned_driver_id enthaelt fahrer.id
-- Loesung: Verwende get_current_fahrer_id() statt auth.uid()
-- =====================================================

-- =====================================================
-- TOUR_PROTOCOLS RLS POLICIES
-- =====================================================

DROP POLICY IF EXISTS "tour_protocols_select_fahrer" ON tour_protocols;
DROP POLICY IF EXISTS "tour_protocols_insert_fahrer" ON tour_protocols;
DROP POLICY IF EXISTS "tour_protocols_update_fahrer" ON tour_protocols;
DROP POLICY IF EXISTS "tour_protocols_all_admin" ON tour_protocols;

-- SELECT fuer Fahrer
CREATE POLICY "tour_protocols_select_fahrer" ON tour_protocols
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM tours t
    WHERE t.id = tour_protocols.tour_id
      AND t.assigned_driver_id = get_current_fahrer_id()
  )
);

-- INSERT fuer Fahrer (nur offene Touren)
CREATE POLICY "tour_protocols_insert_fahrer" ON tour_protocols
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM tours t
    WHERE t.id = tour_id
      AND t.assigned_driver_id = get_current_fahrer_id()
      AND t.status <> 'abgeschlossen'
  )
);

-- UPDATE fuer Fahrer (nur offene Touren)
CREATE POLICY "tour_protocols_update_fahrer" ON tour_protocols
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM tours t
    WHERE t.id = tour_protocols.tour_id
      AND t.assigned_driver_id = get_current_fahrer_id()
      AND t.status <> 'abgeschlossen'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM tours t
    WHERE t.id = tour_protocols.tour_id
      AND t.assigned_driver_id = get_current_fahrer_id()
      AND t.status <> 'abgeschlossen'
  )
);

-- Admin/Disponent Vollzugriff
CREATE POLICY "tour_protocols_all_admin" ON tour_protocols
FOR ALL TO authenticated
USING (is_admin_or_disponent())
WITH CHECK (is_admin_or_disponent());

-- =====================================================
-- GLEICHES MUSTER FUER ANDERE TABELLEN:
-- - tour_photos
-- - tour_damages
-- - tour_damage_photos
-- - tour_signatures
-- =====================================================
-- (Policies wurden via Supabase MCP angewendet)
