-- =====================================================
-- TRANSNEXT LOGISTIK - GEHÄRTETE RLS POLICIES
-- Migration: 20260212_RLS_HARDENED.sql
-- =====================================================
-- Sicherheitsanforderungen:
-- 1. Fahrer: Nur eigene Touren, keine abgeschlossenen bearbeiten
-- 2. Admin: Vollzugriff
-- 3. Audit-Log: Nur serverseitig (Service Role)
-- =====================================================

BEGIN;

-- =====================================================
-- HILFSFUNKTIONEN
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
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Holt fahrer.id für aktuellen User
CREATE OR REPLACE FUNCTION get_current_fahrer_id()
RETURNS UUID AS $$
BEGIN
  RETURN (
    SELECT id FROM fahrer
    WHERE user_id = auth.uid()
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Prüft ob User der zugewiesene Fahrer einer Tour ist
CREATE OR REPLACE FUNCTION is_assigned_driver(p_tour_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM tours
    WHERE id = p_tour_id
    AND assigned_driver_id = get_current_fahrer_id()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Prüft ob Tour NICHT abgeschlossen ist
CREATE OR REPLACE FUNCTION is_tour_not_completed(p_tour_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM tours
    WHERE id = p_tour_id
    AND status != 'abgeschlossen'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Kombinierte Prüfung: Ist zugewiesener Fahrer UND Tour nicht abgeschlossen
CREATE OR REPLACE FUNCTION can_driver_modify_tour(p_tour_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM tours
    WHERE id = p_tour_id
    AND assigned_driver_id = get_current_fahrer_id()
    AND status != 'abgeschlossen'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;


-- =====================================================
-- RLS AKTIVIEREN
-- =====================================================

ALTER TABLE tours ENABLE ROW LEVEL SECURITY;
ALTER TABLE tour_protocols ENABLE ROW LEVEL SECURITY;
ALTER TABLE tour_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE tour_damages ENABLE ROW LEVEL SECURITY;
ALTER TABLE tour_damage_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE tour_signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE pdf_exports ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;


-- =====================================================
-- TOURS TABELLE
-- =====================================================
-- Begründung:
-- - Admin hat Vollzugriff
-- - Fahrer darf NUR SELECT auf eigene Touren
-- - Fahrer darf tours Tabelle NICHT direkt updaten
-- =====================================================

DROP POLICY IF EXISTS "tours_admin_all" ON tours;
DROP POLICY IF EXISTS "tours_driver_select" ON tours;
DROP POLICY IF EXISTS "admin_tours_all" ON tours;
DROP POLICY IF EXISTS "driver_tours_select" ON tours;

-- Admin: Vollzugriff (SELECT, INSERT, UPDATE, DELETE)
CREATE POLICY "tours_admin_all" ON tours
  FOR ALL
  USING (is_admin_or_disponent())
  WITH CHECK (is_admin_or_disponent());

-- Fahrer: NUR SELECT auf zugewiesene Touren
-- Begründung: Fahrer darf tours Tabelle nicht direkt ändern
CREATE POLICY "tours_driver_select_only" ON tours
  FOR SELECT
  USING (
    assigned_driver_id = get_current_fahrer_id()
  );


-- =====================================================
-- TOUR_PROTOCOLS TABELLE
-- =====================================================
-- Begründung:
-- - Admin hat Vollzugriff
-- - Fahrer: SELECT auf eigene Touren
-- - Fahrer: INSERT/UPDATE nur wenn zugewiesen UND nicht abgeschlossen
-- - Fahrer: Kein DELETE
-- =====================================================

DROP POLICY IF EXISTS "protocols_admin_all" ON tour_protocols;
DROP POLICY IF EXISTS "protocols_driver_select" ON tour_protocols;
DROP POLICY IF EXISTS "protocols_driver_insert" ON tour_protocols;
DROP POLICY IF EXISTS "protocols_driver_update" ON tour_protocols;
DROP POLICY IF EXISTS "admin_protocols_all" ON tour_protocols;
DROP POLICY IF EXISTS "fahrer_protocols_select" ON tour_protocols;
DROP POLICY IF EXISTS "fahrer_protocols_insert" ON tour_protocols;
DROP POLICY IF EXISTS "fahrer_protocols_update" ON tour_protocols;

-- Admin: Vollzugriff
CREATE POLICY "protocols_admin_all" ON tour_protocols
  FOR ALL
  USING (is_admin_or_disponent())
  WITH CHECK (is_admin_or_disponent());

-- Fahrer: SELECT auf Protokolle eigener Touren
CREATE POLICY "protocols_driver_select" ON tour_protocols
  FOR SELECT
  USING (is_assigned_driver(tour_id));

-- Fahrer: INSERT nur wenn zugewiesen UND Tour nicht abgeschlossen
-- Begründung: Verhindert Protokoll-Erstellung nach Abschluss
CREATE POLICY "protocols_driver_insert" ON tour_protocols
  FOR INSERT
  WITH CHECK (
    can_driver_modify_tour(tour_id)
  );

-- Fahrer: UPDATE nur wenn zugewiesen UND Tour nicht abgeschlossen
-- Begründung: Verhindert Änderungen an abgeschlossenen Protokollen
CREATE POLICY "protocols_driver_update" ON tour_protocols
  FOR UPDATE
  USING (can_driver_modify_tour(tour_id))
  WITH CHECK (can_driver_modify_tour(tour_id));


-- =====================================================
-- TOUR_PHOTOS TABELLE
-- =====================================================
-- Begründung:
-- - Admin hat Vollzugriff
-- - Fahrer: SELECT auf eigene Touren
-- - Fahrer: INSERT nur wenn zugewiesen UND nicht abgeschlossen
-- - Fahrer: DELETE nur eigene Fotos vor Abschluss
-- =====================================================

DROP POLICY IF EXISTS "photos_admin_all" ON tour_photos;
DROP POLICY IF EXISTS "photos_driver_select" ON tour_photos;
DROP POLICY IF EXISTS "photos_driver_insert" ON tour_photos;
DROP POLICY IF EXISTS "photos_driver_delete" ON tour_photos;
DROP POLICY IF EXISTS "admin_photos_all" ON tour_photos;
DROP POLICY IF EXISTS "driver_photos_access" ON tour_photos;
DROP POLICY IF EXISTS "fahrer_photos_select" ON tour_photos;
DROP POLICY IF EXISTS "fahrer_photos_insert" ON tour_photos;

-- Admin: Vollzugriff
CREATE POLICY "photos_admin_all" ON tour_photos
  FOR ALL
  USING (is_admin_or_disponent())
  WITH CHECK (is_admin_or_disponent());

-- Fahrer: SELECT auf Fotos eigener Touren
CREATE POLICY "photos_driver_select" ON tour_photos
  FOR SELECT
  USING (is_assigned_driver(tour_id));

-- Fahrer: INSERT nur wenn zugewiesen UND nicht abgeschlossen
CREATE POLICY "photos_driver_insert" ON tour_photos
  FOR INSERT
  WITH CHECK (can_driver_modify_tour(tour_id));

-- Fahrer: DELETE nur wenn zugewiesen UND nicht abgeschlossen
-- Begründung: Erlaubt Foto-Austausch während Protokoll-Erstellung
CREATE POLICY "photos_driver_delete" ON tour_photos
  FOR DELETE
  USING (can_driver_modify_tour(tour_id));


-- =====================================================
-- TOUR_DAMAGES TABELLE
-- =====================================================
-- Begründung:
-- - Admin hat Vollzugriff
-- - Fahrer: SELECT auf eigene Touren (inkl. Vorschäden)
-- - Fahrer: INSERT/UPDATE/DELETE nur wenn zugewiesen UND nicht abgeschlossen
-- =====================================================

DROP POLICY IF EXISTS "damages_admin_all" ON tour_damages;
DROP POLICY IF EXISTS "damages_driver_select" ON tour_damages;
DROP POLICY IF EXISTS "damages_driver_insert" ON tour_damages;
DROP POLICY IF EXISTS "damages_driver_update" ON tour_damages;
DROP POLICY IF EXISTS "damages_driver_delete" ON tour_damages;
DROP POLICY IF EXISTS "admin_damages_all" ON tour_damages;
DROP POLICY IF EXISTS "driver_damages_access" ON tour_damages;
DROP POLICY IF EXISTS "fahrer_damages_select" ON tour_damages;
DROP POLICY IF EXISTS "fahrer_damages_insert" ON tour_damages;

-- Admin: Vollzugriff
CREATE POLICY "damages_admin_all" ON tour_damages
  FOR ALL
  USING (is_admin_or_disponent())
  WITH CHECK (is_admin_or_disponent());

-- Fahrer: SELECT auf Schäden eigener Touren
CREATE POLICY "damages_driver_select" ON tour_damages
  FOR SELECT
  USING (is_assigned_driver(tour_id));

-- Fahrer: INSERT nur wenn zugewiesen UND nicht abgeschlossen
CREATE POLICY "damages_driver_insert" ON tour_damages
  FOR INSERT
  WITH CHECK (can_driver_modify_tour(tour_id));

-- Fahrer: UPDATE nur wenn zugewiesen UND nicht abgeschlossen
CREATE POLICY "damages_driver_update" ON tour_damages
  FOR UPDATE
  USING (can_driver_modify_tour(tour_id))
  WITH CHECK (can_driver_modify_tour(tour_id));

-- Fahrer: DELETE nur wenn zugewiesen UND nicht abgeschlossen
CREATE POLICY "damages_driver_delete" ON tour_damages
  FOR DELETE
  USING (can_driver_modify_tour(tour_id));


-- =====================================================
-- TOUR_DAMAGE_PHOTOS TABELLE
-- =====================================================
-- Begründung:
-- - Zugriff über Parent-Damage validiert
-- - Fahrer muss Zugriff auf den Schaden haben
-- =====================================================

DROP POLICY IF EXISTS "damage_photos_admin_all" ON tour_damage_photos;
DROP POLICY IF EXISTS "damage_photos_driver_select" ON tour_damage_photos;
DROP POLICY IF EXISTS "damage_photos_driver_insert" ON tour_damage_photos;
DROP POLICY IF EXISTS "damage_photos_driver_delete" ON tour_damage_photos;
DROP POLICY IF EXISTS "admin_damage_photos_all" ON tour_damage_photos;
DROP POLICY IF EXISTS "driver_damage_photos_access" ON tour_damage_photos;
DROP POLICY IF EXISTS "fahrer_damage_photos_select" ON tour_damage_photos;

-- Admin: Vollzugriff
CREATE POLICY "damage_photos_admin_all" ON tour_damage_photos
  FOR ALL
  USING (is_admin_or_disponent())
  WITH CHECK (is_admin_or_disponent());

-- Fahrer: SELECT wenn Zugriff auf Parent-Damage
CREATE POLICY "damage_photos_driver_select" ON tour_damage_photos
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tour_damages d
      WHERE d.id = damage_id
      AND is_assigned_driver(d.tour_id)
    )
  );

-- Fahrer: INSERT wenn Parent-Damage modifizierbar
CREATE POLICY "damage_photos_driver_insert" ON tour_damage_photos
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tour_damages d
      WHERE d.id = damage_id
      AND can_driver_modify_tour(d.tour_id)
    )
  );

-- Fahrer: DELETE wenn Parent-Damage modifizierbar
CREATE POLICY "damage_photos_driver_delete" ON tour_damage_photos
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM tour_damages d
      WHERE d.id = damage_id
      AND can_driver_modify_tour(d.tour_id)
    )
  );


-- =====================================================
-- TOUR_SIGNATURES TABELLE
-- =====================================================
-- Begründung:
-- - Unterschriften sind besonders sensibel
-- - Fahrer: INSERT/UPDATE nur wenn zugewiesen UND nicht abgeschlossen
-- - Kein DELETE für Fahrer (Unterschriften sind permanent)
-- =====================================================

DROP POLICY IF EXISTS "signatures_admin_all" ON tour_signatures;
DROP POLICY IF EXISTS "signatures_driver_select" ON tour_signatures;
DROP POLICY IF EXISTS "signatures_driver_insert" ON tour_signatures;
DROP POLICY IF EXISTS "signatures_driver_update" ON tour_signatures;
DROP POLICY IF EXISTS "admin_signatures_all" ON tour_signatures;
DROP POLICY IF EXISTS "driver_signatures_access" ON tour_signatures;
DROP POLICY IF EXISTS "fahrer_signatures_select" ON tour_signatures;
DROP POLICY IF EXISTS "fahrer_signatures_insert" ON tour_signatures;

-- Admin: Vollzugriff
CREATE POLICY "signatures_admin_all" ON tour_signatures
  FOR ALL
  USING (is_admin_or_disponent())
  WITH CHECK (is_admin_or_disponent());

-- Fahrer: SELECT auf Unterschriften eigener Touren
CREATE POLICY "signatures_driver_select" ON tour_signatures
  FOR SELECT
  USING (is_assigned_driver(tour_id));

-- Fahrer: INSERT nur wenn zugewiesen UND nicht abgeschlossen
CREATE POLICY "signatures_driver_insert" ON tour_signatures
  FOR INSERT
  WITH CHECK (can_driver_modify_tour(tour_id));

-- Fahrer: UPDATE (Upsert) nur wenn zugewiesen UND nicht abgeschlossen
-- Begründung: Erlaubt Korrektur der Unterschrift vor Abschluss
CREATE POLICY "signatures_driver_update" ON tour_signatures
  FOR UPDATE
  USING (can_driver_modify_tour(tour_id))
  WITH CHECK (can_driver_modify_tour(tour_id));

-- KEIN DELETE für Fahrer - Unterschriften sind permanent


-- =====================================================
-- PDF_EXPORTS TABELLE
-- =====================================================
-- Begründung:
-- - PDFs werden serverseitig generiert
-- - Fahrer darf nur lesen
-- - INSERT/UPDATE nur für Admin oder Service Role
-- =====================================================

DROP POLICY IF EXISTS "pdf_exports_admin_all" ON pdf_exports;
DROP POLICY IF EXISTS "pdf_exports_driver_select" ON pdf_exports;
DROP POLICY IF EXISTS "admin_pdf_exports_all" ON pdf_exports;
DROP POLICY IF EXISTS "driver_pdf_exports_select" ON pdf_exports;
DROP POLICY IF EXISTS "fahrer_pdf_exports_select" ON pdf_exports;

-- Admin: Vollzugriff
CREATE POLICY "pdf_exports_admin_all" ON pdf_exports
  FOR ALL
  USING (is_admin_or_disponent())
  WITH CHECK (is_admin_or_disponent());

-- Fahrer: NUR SELECT auf PDFs eigener Touren
CREATE POLICY "pdf_exports_driver_select" ON pdf_exports
  FOR SELECT
  USING (is_assigned_driver(tour_id));


-- =====================================================
-- AUDIT_LOG TABELLE
-- =====================================================
-- Begründung:
-- - Audit-Log ist hochsensibel
-- - NUR Service Role (serverseitig) darf schreiben
-- - Admin darf lesen
-- - Fahrer darf NICHT lesen oder schreiben
-- =====================================================

DROP POLICY IF EXISTS "audit_log_admin_select" ON audit_log;
DROP POLICY IF EXISTS "admin_audit_log_select" ON audit_log;

-- Admin: NUR SELECT (kein INSERT/UPDATE/DELETE über Client)
-- Begründung: Audit-Logs werden nur serverseitig geschrieben
CREATE POLICY "audit_log_admin_select_only" ON audit_log
  FOR SELECT
  USING (is_admin_or_disponent());

-- KEIN INSERT/UPDATE/DELETE für irgendwen über Client
-- Schreiben nur via Service Role (SECURITY DEFINER Funktionen)


-- =====================================================
-- ZUSÄTZLICHE SICHERHEIT: Block abgeschlossene Touren
-- =====================================================
-- Expliziter Block für alle Modifikationen an abgeschlossenen Touren
-- Dies ist ein Defense-in-Depth Ansatz

-- Trigger-Funktion die Modifikationen an abgeschlossenen Touren blockiert
CREATE OR REPLACE FUNCTION block_completed_tour_modifications()
RETURNS TRIGGER AS $$
DECLARE
  v_tour_status TEXT;
  v_is_admin BOOLEAN;
BEGIN
  -- Admin darf immer
  SELECT is_admin_or_disponent() INTO v_is_admin;
  IF v_is_admin THEN
    RETURN NEW;
  END IF;

  -- Tour-Status prüfen
  SELECT status INTO v_tour_status
  FROM tours
  WHERE id = NEW.tour_id;

  IF v_tour_status = 'abgeschlossen' THEN
    RAISE EXCEPTION 'Modifikationen an abgeschlossenen Touren sind nicht erlaubt';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger für tour_protocols
DROP TRIGGER IF EXISTS block_completed_protocols ON tour_protocols;
CREATE TRIGGER block_completed_protocols
  BEFORE INSERT OR UPDATE ON tour_protocols
  FOR EACH ROW
  EXECUTE FUNCTION block_completed_tour_modifications();

-- Trigger für tour_photos
DROP TRIGGER IF EXISTS block_completed_photos ON tour_photos;
CREATE TRIGGER block_completed_photos
  BEFORE INSERT OR UPDATE ON tour_photos
  FOR EACH ROW
  EXECUTE FUNCTION block_completed_tour_modifications();

-- Trigger für tour_damages
DROP TRIGGER IF EXISTS block_completed_damages ON tour_damages;
CREATE TRIGGER block_completed_damages
  BEFORE INSERT OR UPDATE ON tour_damages
  FOR EACH ROW
  EXECUTE FUNCTION block_completed_tour_modifications();

-- Trigger für tour_signatures
DROP TRIGGER IF EXISTS block_completed_signatures ON tour_signatures;
CREATE TRIGGER block_completed_signatures
  BEFORE INSERT OR UPDATE ON tour_signatures
  FOR EACH ROW
  EXECUTE FUNCTION block_completed_tour_modifications();


-- =====================================================
-- AUDIT-LOG FUNKTION (nur Service Role)
-- =====================================================

-- Diese Funktion kann nur serverseitig aufgerufen werden
CREATE OR REPLACE FUNCTION create_audit_entry(
  p_entity TEXT,
  p_entity_id UUID,
  p_action TEXT,
  p_before_json JSONB DEFAULT NULL,
  p_after_json JSONB DEFAULT NULL,
  p_changed_fields TEXT[] DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_audit_id UUID;
  v_actor_role TEXT;
BEGIN
  -- Actor Role ermitteln
  SELECT role INTO v_actor_role
  FROM profiles
  WHERE id = auth.uid();

  INSERT INTO audit_log (
    entity, entity_id, action,
    before_json, after_json, changed_fields,
    actor_id, actor_role
  ) VALUES (
    p_entity, p_entity_id, p_action::audit_action,
    p_before_json, p_after_json, p_changed_fields,
    auth.uid(), v_actor_role
  )
  RETURNING id INTO v_audit_id;

  RETURN v_audit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Revoke direkten Zugriff, nur über Funktion
REVOKE ALL ON audit_log FROM authenticated;
GRANT SELECT ON audit_log TO authenticated; -- Nur für Admin via RLS


COMMIT;

-- =====================================================
-- ZUSAMMENFASSUNG DER RLS POLICIES
-- =====================================================
--
-- TOURS:
-- - tours_admin_all: Admin Vollzugriff
-- - tours_driver_select_only: Fahrer NUR SELECT eigene Touren
--
-- TOUR_PROTOCOLS:
-- - protocols_admin_all: Admin Vollzugriff
-- - protocols_driver_select: Fahrer SELECT eigene
-- - protocols_driver_insert: Fahrer INSERT wenn nicht abgeschlossen
-- - protocols_driver_update: Fahrer UPDATE wenn nicht abgeschlossen
--
-- TOUR_PHOTOS:
-- - photos_admin_all: Admin Vollzugriff
-- - photos_driver_select: Fahrer SELECT eigene
-- - photos_driver_insert: Fahrer INSERT wenn nicht abgeschlossen
-- - photos_driver_delete: Fahrer DELETE wenn nicht abgeschlossen
--
-- TOUR_DAMAGES:
-- - damages_admin_all: Admin Vollzugriff
-- - damages_driver_select: Fahrer SELECT eigene
-- - damages_driver_insert/update/delete: Wenn nicht abgeschlossen
--
-- TOUR_DAMAGE_PHOTOS:
-- - damage_photos_admin_all: Admin Vollzugriff
-- - damage_photos_driver_*: Via Parent-Damage validiert
--
-- TOUR_SIGNATURES:
-- - signatures_admin_all: Admin Vollzugriff
-- - signatures_driver_select: Fahrer SELECT eigene
-- - signatures_driver_insert/update: Wenn nicht abgeschlossen
-- - KEIN DELETE für Fahrer (Unterschriften permanent)
--
-- PDF_EXPORTS:
-- - pdf_exports_admin_all: Admin Vollzugriff
-- - pdf_exports_driver_select: Fahrer NUR SELECT eigene
--
-- AUDIT_LOG:
-- - audit_log_admin_select_only: Admin NUR SELECT
-- - Schreiben NUR via Service Role
--
-- ZUSÄTZLICHE TRIGGER:
-- - block_completed_tour_modifications: Defense-in-Depth
-- =====================================================
