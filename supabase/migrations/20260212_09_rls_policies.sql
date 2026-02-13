-- =====================================================
-- SCHRITT 9: ROW LEVEL SECURITY POLICIES
-- Migration: 20260212_09_rls_policies.sql
-- =====================================================

-- RLS aktivieren
ALTER TABLE tours ENABLE ROW LEVEL SECURITY;
ALTER TABLE tour_protocols ENABLE ROW LEVEL SECURITY;
ALTER TABLE tour_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE tour_damages ENABLE ROW LEVEL SECURITY;
ALTER TABLE tour_damage_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE tour_signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE pdf_exports ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Prüft ob User Admin oder Disponent ist
CREATE OR REPLACE FUNCTION is_admin_or_disponent()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'disponent')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Holt die fahrer.id für den aktuellen User
CREATE OR REPLACE FUNCTION get_current_fahrer_id()
RETURNS UUID AS $$
BEGIN
  RETURN (
    SELECT id FROM fahrer
    WHERE user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Prüft ob Fahrer der Tour zugewiesen ist
CREATE OR REPLACE FUNCTION is_assigned_driver(p_tour_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM tours
    WHERE id = p_tour_id
    AND assigned_driver_id = get_current_fahrer_id()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Prüft ob Tour in aktiver Phase für Fahrer änderbar ist
CREATE OR REPLACE FUNCTION can_driver_modify_tour(p_tour_id UUID, p_phase protocol_phase)
RETURNS BOOLEAN AS $$
DECLARE
  v_tour_status tour_status;
BEGIN
  SELECT status INTO v_tour_status
  FROM tours
  WHERE id = p_tour_id;

  -- Fahrer kann nur in entsprechender Phase ändern
  IF p_phase = 'pickup' AND v_tour_status = 'uebernahme_offen' THEN
    RETURN TRUE;
  ELSIF p_phase = 'dropoff' AND v_tour_status = 'abgabe_offen' THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =====================================================
-- TOURS POLICIES
-- =====================================================

-- Admin/Disponent: Vollzugriff
DROP POLICY IF EXISTS "admin_tours_all" ON tours;
CREATE POLICY "admin_tours_all" ON tours
  FOR ALL
  USING (is_admin_or_disponent())
  WITH CHECK (is_admin_or_disponent());

-- Fahrer: Nur eigene zugewiesene Touren lesen
DROP POLICY IF EXISTS "fahrer_tours_select" ON tours;
CREATE POLICY "fahrer_tours_select" ON tours
  FOR SELECT
  USING (
    assigned_driver_id = get_current_fahrer_id()
    OR is_admin_or_disponent()
  );

-- Fahrer können KEINE Auftragsdaten ändern (nur Status über Protokoll)


-- =====================================================
-- TOUR_PROTOCOLS POLICIES
-- =====================================================

-- Admin: Vollzugriff
DROP POLICY IF EXISTS "admin_protocols_all" ON tour_protocols;
CREATE POLICY "admin_protocols_all" ON tour_protocols
  FOR ALL
  USING (is_admin_or_disponent())
  WITH CHECK (is_admin_or_disponent());

-- Fahrer: Eigene Protokolle lesen
DROP POLICY IF EXISTS "fahrer_protocols_select" ON tour_protocols;
CREATE POLICY "fahrer_protocols_select" ON tour_protocols
  FOR SELECT
  USING (
    is_assigned_driver(tour_id)
    OR is_admin_or_disponent()
  );

-- Fahrer: Protokoll erstellen nur wenn zugewiesen
DROP POLICY IF EXISTS "fahrer_protocols_insert" ON tour_protocols;
CREATE POLICY "fahrer_protocols_insert" ON tour_protocols
  FOR INSERT
  WITH CHECK (
    is_assigned_driver(tour_id)
    AND can_driver_modify_tour(tour_id, phase)
  );

-- Fahrer: Protokoll ändern nur in aktiver Phase
DROP POLICY IF EXISTS "fahrer_protocols_update" ON tour_protocols;
CREATE POLICY "fahrer_protocols_update" ON tour_protocols
  FOR UPDATE
  USING (
    is_assigned_driver(tour_id)
    AND can_driver_modify_tour(tour_id, phase)
  )
  WITH CHECK (
    is_assigned_driver(tour_id)
    AND can_driver_modify_tour(tour_id, phase)
  );


-- =====================================================
-- TOUR_PHOTOS POLICIES
-- =====================================================

-- Admin: Vollzugriff
DROP POLICY IF EXISTS "admin_photos_all" ON tour_photos;
CREATE POLICY "admin_photos_all" ON tour_photos
  FOR ALL
  USING (is_admin_or_disponent())
  WITH CHECK (is_admin_or_disponent());

-- Fahrer: Lesen
DROP POLICY IF EXISTS "fahrer_photos_select" ON tour_photos;
CREATE POLICY "fahrer_photos_select" ON tour_photos
  FOR SELECT
  USING (
    is_assigned_driver(tour_id)
    OR is_admin_or_disponent()
  );

-- Fahrer: Erstellen in aktiver Phase
DROP POLICY IF EXISTS "fahrer_photos_insert" ON tour_photos;
CREATE POLICY "fahrer_photos_insert" ON tour_photos
  FOR INSERT
  WITH CHECK (
    is_assigned_driver(tour_id)
    AND can_driver_modify_tour(tour_id, phase)
  );

-- Fahrer: Löschen in aktiver Phase
DROP POLICY IF EXISTS "fahrer_photos_delete" ON tour_photos;
CREATE POLICY "fahrer_photos_delete" ON tour_photos
  FOR DELETE
  USING (
    is_assigned_driver(tour_id)
    AND can_driver_modify_tour(tour_id, phase)
  );


-- =====================================================
-- TOUR_DAMAGES POLICIES
-- =====================================================

-- Admin: Vollzugriff
DROP POLICY IF EXISTS "admin_damages_all" ON tour_damages;
CREATE POLICY "admin_damages_all" ON tour_damages
  FOR ALL
  USING (is_admin_or_disponent())
  WITH CHECK (is_admin_or_disponent());

-- Fahrer: Lesen
DROP POLICY IF EXISTS "fahrer_damages_select" ON tour_damages;
CREATE POLICY "fahrer_damages_select" ON tour_damages
  FOR SELECT
  USING (
    is_assigned_driver(tour_id)
    OR is_admin_or_disponent()
  );

-- Fahrer: Erstellen in aktiver Phase
DROP POLICY IF EXISTS "fahrer_damages_insert" ON tour_damages;
CREATE POLICY "fahrer_damages_insert" ON tour_damages
  FOR INSERT
  WITH CHECK (
    is_assigned_driver(tour_id)
    AND can_driver_modify_tour(tour_id, phase)
  );

-- Fahrer: Ändern in aktiver Phase
DROP POLICY IF EXISTS "fahrer_damages_update" ON tour_damages;
CREATE POLICY "fahrer_damages_update" ON tour_damages
  FOR UPDATE
  USING (
    is_assigned_driver(tour_id)
    AND can_driver_modify_tour(tour_id, phase)
  );

-- Fahrer: Löschen in aktiver Phase
DROP POLICY IF EXISTS "fahrer_damages_delete" ON tour_damages;
CREATE POLICY "fahrer_damages_delete" ON tour_damages
  FOR DELETE
  USING (
    is_assigned_driver(tour_id)
    AND can_driver_modify_tour(tour_id, phase)
  );


-- =====================================================
-- TOUR_DAMAGE_PHOTOS POLICIES
-- =====================================================

-- Admin: Vollzugriff
DROP POLICY IF EXISTS "admin_damage_photos_all" ON tour_damage_photos;
CREATE POLICY "admin_damage_photos_all" ON tour_damage_photos
  FOR ALL
  USING (is_admin_or_disponent())
  WITH CHECK (is_admin_or_disponent());

-- Fahrer: Lesen
DROP POLICY IF EXISTS "fahrer_damage_photos_select" ON tour_damage_photos;
CREATE POLICY "fahrer_damage_photos_select" ON tour_damage_photos
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tour_damages d
      WHERE d.id = tour_damage_photos.damage_id
      AND is_assigned_driver(d.tour_id)
    )
    OR is_admin_or_disponent()
  );

-- Fahrer: Erstellen
DROP POLICY IF EXISTS "fahrer_damage_photos_insert" ON tour_damage_photos;
CREATE POLICY "fahrer_damage_photos_insert" ON tour_damage_photos
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tour_damages d
      WHERE d.id = tour_damage_photos.damage_id
      AND is_assigned_driver(d.tour_id)
      AND can_driver_modify_tour(d.tour_id, d.phase)
    )
  );


-- =====================================================
-- TOUR_SIGNATURES POLICIES
-- =====================================================

-- Admin: Vollzugriff
DROP POLICY IF EXISTS "admin_signatures_all" ON tour_signatures;
CREATE POLICY "admin_signatures_all" ON tour_signatures
  FOR ALL
  USING (is_admin_or_disponent())
  WITH CHECK (is_admin_or_disponent());

-- Fahrer: Lesen
DROP POLICY IF EXISTS "fahrer_signatures_select" ON tour_signatures;
CREATE POLICY "fahrer_signatures_select" ON tour_signatures
  FOR SELECT
  USING (
    is_assigned_driver(tour_id)
    OR is_admin_or_disponent()
  );

-- Fahrer: Erstellen in aktiver Phase
DROP POLICY IF EXISTS "fahrer_signatures_insert" ON tour_signatures;
CREATE POLICY "fahrer_signatures_insert" ON tour_signatures
  FOR INSERT
  WITH CHECK (
    is_assigned_driver(tour_id)
    AND can_driver_modify_tour(tour_id, phase)
  );


-- =====================================================
-- PDF_EXPORTS POLICIES
-- =====================================================

-- Admin: Vollzugriff
DROP POLICY IF EXISTS "admin_pdf_exports_all" ON pdf_exports;
CREATE POLICY "admin_pdf_exports_all" ON pdf_exports
  FOR ALL
  USING (is_admin_or_disponent())
  WITH CHECK (is_admin_or_disponent());

-- Fahrer: Nur Lesen eigener Tour-PDFs
DROP POLICY IF EXISTS "fahrer_pdf_exports_select" ON pdf_exports;
CREATE POLICY "fahrer_pdf_exports_select" ON pdf_exports
  FOR SELECT
  USING (
    is_assigned_driver(tour_id)
    OR is_admin_or_disponent()
  );


-- =====================================================
-- AUDIT_LOG POLICIES
-- =====================================================

-- Nur Admin kann Audit-Log lesen
DROP POLICY IF EXISTS "admin_audit_log_select" ON audit_log;
CREATE POLICY "admin_audit_log_select" ON audit_log
  FOR SELECT
  USING (is_admin_or_disponent());

-- Audit-Log wird nur über SECURITY DEFINER Funktionen geschrieben
-- Kein direkter Insert erlaubt


COMMENT ON FUNCTION is_admin_or_disponent() IS 'Prüft ob aktueller User Admin oder Disponent ist';
COMMENT ON FUNCTION get_current_fahrer_id() IS 'Gibt die fahrer.id des aktuellen Users zurück';
COMMENT ON FUNCTION is_assigned_driver(UUID) IS 'Prüft ob aktueller Fahrer der Tour zugewiesen ist';
COMMENT ON FUNCTION can_driver_modify_tour(UUID, protocol_phase) IS 'Prüft ob Fahrer die Tour in dieser Phase ändern darf';
