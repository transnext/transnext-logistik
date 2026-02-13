-- =====================================================
-- SCHRITT 8: AUDIT_LOG TABELLE
-- Migration: 20260212_08_audit_log.sql
-- =====================================================

-- Audit Log Tabelle
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Entität, die geändert wurde
  entity VARCHAR(50) NOT NULL, -- 'tours', 'tour_protocols', 'tour_damages', etc.
  entity_id UUID NOT NULL,

  -- Aktion
  action audit_action NOT NULL,

  -- Daten vor und nach der Änderung
  before_json JSONB,
  after_json JSONB,

  -- Geänderte Felder (für schnelle Übersicht)
  changed_fields TEXT[],

  -- Wer hat die Änderung gemacht?
  actor_id UUID REFERENCES auth.users(id),
  actor_role VARCHAR(50), -- 'fahrer', 'admin', 'disponent'

  -- Zusätzlicher Kontext
  context JSONB DEFAULT '{}'::jsonb,

  -- IP-Adresse (optional, für Sicherheit)
  ip_address INET,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indizes für schnelle Abfragen
CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON audit_log(entity, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_actor_id ON audit_log(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);

-- Partitionierung nach Monat (für Performance bei großen Datenmengen)
-- Hinweis: Kann später aktiviert werden wenn nötig

-- Funktion zum Erstellen eines Audit-Eintrags
CREATE OR REPLACE FUNCTION create_audit_log(
  p_entity VARCHAR(50),
  p_entity_id UUID,
  p_action audit_action,
  p_before_json JSONB DEFAULT NULL,
  p_after_json JSONB DEFAULT NULL,
  p_changed_fields TEXT[] DEFAULT NULL,
  p_context JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
  v_audit_id UUID;
  v_actor_role VARCHAR(50);
BEGIN
  -- Rolle des aktuellen Benutzers ermitteln
  SELECT role INTO v_actor_role
  FROM profiles
  WHERE id = auth.uid();

  INSERT INTO audit_log (
    entity, entity_id, action,
    before_json, after_json, changed_fields,
    actor_id, actor_role, context
  )
  VALUES (
    p_entity, p_entity_id, p_action,
    p_before_json, p_after_json, p_changed_fields,
    auth.uid(), v_actor_role, p_context
  )
  RETURNING id INTO v_audit_id;

  RETURN v_audit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger-Funktion für automatisches Audit-Logging bei Tours
CREATE OR REPLACE FUNCTION audit_tours_changes()
RETURNS TRIGGER AS $$
DECLARE
  v_changed_fields TEXT[] := '{}';
  v_action audit_action;
BEGIN
  -- Aktion bestimmen
  IF TG_OP = 'INSERT' THEN
    v_action := 'create';
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      v_action := 'status_change';
    ELSE
      v_action := 'update';
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'delete';
  END IF;

  -- Bei UPDATE: geänderte Felder ermitteln
  IF TG_OP = 'UPDATE' THEN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      v_changed_fields := array_append(v_changed_fields, 'status');
    END IF;
    IF OLD.assigned_driver_id IS DISTINCT FROM NEW.assigned_driver_id THEN
      v_changed_fields := array_append(v_changed_fields, 'assigned_driver_id');
    END IF;
    IF OLD.notes IS DISTINCT FROM NEW.notes THEN
      v_changed_fields := array_append(v_changed_fields, 'notes');
    END IF;
    IF OLD.pickup_data IS DISTINCT FROM NEW.pickup_data THEN
      v_changed_fields := array_append(v_changed_fields, 'pickup_data');
    END IF;
    IF OLD.dropoff_data IS DISTINCT FROM NEW.dropoff_data THEN
      v_changed_fields := array_append(v_changed_fields, 'dropoff_data');
    END IF;
  END IF;

  -- Audit-Eintrag erstellen
  IF TG_OP = 'DELETE' THEN
    PERFORM create_audit_log(
      'tours',
      OLD.id,
      v_action,
      to_jsonb(OLD),
      NULL,
      v_changed_fields
    );
    RETURN OLD;
  ELSE
    PERFORM create_audit_log(
      'tours',
      NEW.id,
      v_action,
      CASE WHEN TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE NULL END,
      to_jsonb(NEW),
      v_changed_fields
    );
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger für tours
DROP TRIGGER IF EXISTS audit_tours_trigger ON tours;
CREATE TRIGGER audit_tours_trigger
  AFTER INSERT OR UPDATE OR DELETE ON tours
  FOR EACH ROW
  EXECUTE FUNCTION audit_tours_changes();

-- Trigger-Funktion für tour_protocols
CREATE OR REPLACE FUNCTION audit_tour_protocols_changes()
RETURNS TRIGGER AS $$
DECLARE
  v_action audit_action;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_action := 'create';
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.confirmed IS DISTINCT FROM NEW.confirmed AND NEW.confirmed = TRUE THEN
      v_action := 'protocol_complete';
    ELSE
      v_action := 'update';
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'delete';
  END IF;

  IF TG_OP = 'DELETE' THEN
    PERFORM create_audit_log(
      'tour_protocols',
      OLD.id,
      v_action,
      to_jsonb(OLD),
      NULL
    );
    RETURN OLD;
  ELSE
    PERFORM create_audit_log(
      'tour_protocols',
      NEW.id,
      v_action,
      CASE WHEN TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE NULL END,
      to_jsonb(NEW)
    );
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger für tour_protocols
DROP TRIGGER IF EXISTS audit_tour_protocols_trigger ON tour_protocols;
CREATE TRIGGER audit_tour_protocols_trigger
  AFTER INSERT OR UPDATE OR DELETE ON tour_protocols
  FOR EACH ROW
  EXECUTE FUNCTION audit_tour_protocols_changes();

COMMENT ON TABLE audit_log IS 'Vollständiger Audit-Trail für alle Änderungen';
COMMENT ON COLUMN audit_log.before_json IS 'Zustand vor der Änderung';
COMMENT ON COLUMN audit_log.after_json IS 'Zustand nach der Änderung';
COMMENT ON COLUMN audit_log.changed_fields IS 'Liste der geänderten Felder';
