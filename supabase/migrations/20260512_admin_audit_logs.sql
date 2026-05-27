-- =====================================================
-- ADMIN AUDIT LOGS
-- Migration: 20260512_admin_audit_logs.sql
--
-- Protokolliert sensible Aktionen im Admin-Portal.
-- Getrennt von der bestehenden audit_log Tabelle
-- (die für tours/tour_protocols Trigger verwendet wird).
--
-- Keine bestehenden Daten werden verändert.
-- =====================================================

-- =====================================================
-- 1. TABELLE ERSTELLEN
-- =====================================================

CREATE TABLE IF NOT EXISTS admin_audit_logs (
  -- Primärschlüssel
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Zeitstempel (unveränderlich)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Akteur-Informationen
  actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_name TEXT,                       -- Anzeige-Name zum Zeitpunkt der Aktion
  actor_role TEXT,                       -- 'admin', 'gf', 'disponent', 'system'

  -- Aktion
  action TEXT NOT NULL,                  -- z.B. 'pricing_version_created', 'fahrer_deactivated'

  -- Betroffene Entität
  entity_type TEXT NOT NULL,             -- z.B. 'pricing_table', 'fahrer', 'customer'
  entity_id TEXT,                        -- ID als TEXT (für UUID und INTEGER IDs)
  entity_label TEXT,                     -- Anzeige-Name der Entität (z.B. Fahrername, Kundenname)

  -- Quelle der Aktion
  source TEXT NOT NULL DEFAULT 'admin',  -- 'admin', 'dispo', 'system', 'driver_portal'

  -- Schweregrad
  severity TEXT NOT NULL DEFAULT 'info', -- 'info', 'warning', 'critical'

  -- Daten vor/nach der Änderung (sensibel - für Dispo gefiltert)
  before_data JSONB,                     -- Zustand vor der Änderung
  after_data JSONB,                      -- Zustand nach der Änderung
  metadata JSONB,                        -- Zusätzliche Kontext-Informationen

  -- Finanz-Markierung für Dispo-Filterung
  is_financial BOOLEAN NOT NULL DEFAULT FALSE,

  -- Optional: Browser/Netzwerk-Info (falls verfügbar)
  ip_address TEXT,
  user_agent TEXT
);

-- Kommentare
COMMENT ON TABLE admin_audit_logs IS 'Protokolliert sensible Admin-Aktionen für Nachvollziehbarkeit';
COMMENT ON COLUMN admin_audit_logs.action IS 'Aktion z.B. pricing_version_created, fahrer_deactivated, invoice_locked';
COMMENT ON COLUMN admin_audit_logs.entity_type IS 'Entitätstyp z.B. pricing_table, fahrer, customer, arbeitsnachweis';
COMMENT ON COLUMN admin_audit_logs.entity_id IS 'ID der Entität als TEXT (unterstützt UUID und INTEGER)';
COMMENT ON COLUMN admin_audit_logs.is_financial IS 'TRUE wenn Aktion Finanzdaten enthält - Dispo sieht diese nicht';
COMMENT ON COLUMN admin_audit_logs.before_data IS 'Sensibel: Zustand vor Änderung - für Dispo bereinigt';
COMMENT ON COLUMN admin_audit_logs.after_data IS 'Sensibel: Zustand nach Änderung - für Dispo bereinigt';

-- =====================================================
-- 2. INDEXES ERSTELLEN
-- =====================================================

-- Schnelle Abfrage nach Zeitraum (häufigste Abfrage)
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created_at
  ON admin_audit_logs(created_at DESC);

-- Abfrage nach Akteur
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_actor
  ON admin_audit_logs(actor_user_id);

-- Abfrage nach Aktion
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_action
  ON admin_audit_logs(action);

-- Abfrage nach Entität
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_entity
  ON admin_audit_logs(entity_type, entity_id);

-- Abfrage nach Schweregrad
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_severity
  ON admin_audit_logs(severity);

-- Filter für Dispo (nicht-finanzielle Einträge)
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_not_financial
  ON admin_audit_logs(is_financial)
  WHERE is_financial = FALSE;

-- =====================================================
-- 3. ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper-Funktion: Prüft ob User Admin/GF ist
-- (Nutzt bestehende Funktion falls vorhanden, sonst eigene)
CREATE OR REPLACE FUNCTION is_admin_or_gf()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'gf')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper-Funktion: Prüft ob User Disponent ist
CREATE OR REPLACE FUNCTION is_disponent()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'disponent'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Policy: Admin/GF kann ALLE Logs lesen
DROP POLICY IF EXISTS "admin_gf_read_all_audit_logs" ON admin_audit_logs;
CREATE POLICY "admin_gf_read_all_audit_logs"
  ON admin_audit_logs
  FOR SELECT
  USING (is_admin_or_gf());

-- Policy: Disponent kann nur nicht-finanzielle Logs lesen
DROP POLICY IF EXISTS "disponent_read_non_financial_audit_logs" ON admin_audit_logs;
CREATE POLICY "disponent_read_non_financial_audit_logs"
  ON admin_audit_logs
  FOR SELECT
  USING (
    is_disponent()
    AND is_financial = FALSE
  );

-- Policy: Authentifizierte User können Logs erstellen (über API)
-- WICHTIG: Fahrer können theoretisch inserten, aber die API verhindert das
DROP POLICY IF EXISTS "authenticated_insert_audit_logs" ON admin_audit_logs;
CREATE POLICY "authenticated_insert_audit_logs"
  ON admin_audit_logs
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Policy: KEINE Updates erlaubt (Logs sind unveränderlich)
-- Keine UPDATE Policy = kein Update möglich

-- Policy: KEINE Deletes erlaubt (Logs sind unveränderlich)
-- Keine DELETE Policy = kein Delete möglich

-- =====================================================
-- 4. VIEW FÜR DISPONENT (ohne sensible Felder)
-- =====================================================

-- Disponent-View: Filtert Finanzdaten aus before_data/after_data
CREATE OR REPLACE VIEW admin_audit_logs_disponent AS
SELECT
  id,
  created_at,
  actor_user_id,
  actor_name,
  actor_role,
  action,
  entity_type,
  entity_id,
  entity_label,
  source,
  severity,
  -- Entferne sensible Felder aus before_data
  CASE
    WHEN before_data IS NULL THEN NULL
    ELSE before_data - ARRAY[
      'kosten', 'amount', 'customer_amount', 'driver_amount', 'driver_amount_final',
      'estimated_employer_costs', 'ertrag', 'marge', 'margenquote', 'umsatz',
      'fahrerlohn', 'arbeitgeberkosten', 'original_amount', 'corrected_amount',
      'items_amount', 'km_ranges', 'waiting_unit_rate'
    ]
  END AS before_data,
  -- Entferne sensible Felder aus after_data
  CASE
    WHEN after_data IS NULL THEN NULL
    ELSE after_data - ARRAY[
      'kosten', 'amount', 'customer_amount', 'driver_amount', 'driver_amount_final',
      'estimated_employer_costs', 'ertrag', 'marge', 'margenquote', 'umsatz',
      'fahrerlohn', 'arbeitgeberkosten', 'original_amount', 'corrected_amount',
      'items_amount', 'km_ranges', 'waiting_unit_rate'
    ]
  END AS after_data,
  -- Entferne sensible Felder aus metadata
  CASE
    WHEN metadata IS NULL THEN NULL
    ELSE metadata - ARRAY[
      'kosten', 'amount', 'summe', 'betrag', 'marge', 'ertrag'
    ]
  END AS metadata,
  is_financial,
  ip_address,
  user_agent
FROM admin_audit_logs
WHERE is_financial = FALSE;

COMMENT ON VIEW admin_audit_logs_disponent IS 'Audit-Logs für Disponenten ohne Finanzdaten';

-- =====================================================
-- 5. HILFSFUNKTION ZUM ERSTELLEN VON AUDIT-LOGS
-- =====================================================

-- RPC-Funktion zum Erstellen eines Audit-Eintrags
-- Kann von der API aufgerufen werden
CREATE OR REPLACE FUNCTION create_admin_audit_log(
  p_action TEXT,
  p_entity_type TEXT,
  p_entity_id TEXT DEFAULT NULL,
  p_entity_label TEXT DEFAULT NULL,
  p_source TEXT DEFAULT 'admin',
  p_severity TEXT DEFAULT 'info',
  p_before_data JSONB DEFAULT NULL,
  p_after_data JSONB DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL,
  p_is_financial BOOLEAN DEFAULT FALSE
)
RETURNS UUID AS $$
DECLARE
  v_audit_id UUID;
  v_actor_name TEXT;
  v_actor_role TEXT;
BEGIN
  -- Akteur-Informationen aus profiles laden
  SELECT
    full_name,
    role
  INTO v_actor_name, v_actor_role
  FROM profiles
  WHERE id = auth.uid();

  -- Audit-Eintrag erstellen
  INSERT INTO admin_audit_logs (
    actor_user_id,
    actor_name,
    actor_role,
    action,
    entity_type,
    entity_id,
    entity_label,
    source,
    severity,
    before_data,
    after_data,
    metadata,
    is_financial
  )
  VALUES (
    auth.uid(),
    COALESCE(v_actor_name, 'Unbekannt'),
    COALESCE(v_actor_role, 'unknown'),
    p_action,
    p_entity_type,
    p_entity_id,
    p_entity_label,
    p_source,
    p_severity,
    p_before_data,
    p_after_data,
    p_metadata,
    p_is_financial
  )
  RETURNING id INTO v_audit_id;

  RETURN v_audit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION create_admin_audit_log IS 'Erstellt einen Audit-Log-Eintrag für Admin-Aktionen';

-- =====================================================
-- 6. GRANT PERMISSIONS
-- =====================================================

-- Grants für admin_audit_logs Tabelle
GRANT SELECT ON admin_audit_logs TO authenticated;
GRANT INSERT ON admin_audit_logs TO authenticated;
-- KEIN UPDATE/DELETE Grant!

-- Grants für View
GRANT SELECT ON admin_audit_logs_disponent TO authenticated;

-- Grant für RPC-Funktion
GRANT EXECUTE ON FUNCTION create_admin_audit_log TO authenticated;
GRANT EXECUTE ON FUNCTION is_admin_or_gf TO authenticated;
GRANT EXECUTE ON FUNCTION is_disponent TO authenticated;
