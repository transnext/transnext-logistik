-- ============================================================
-- Migration: Computed Alert Dismissals
-- Datum: 2026-05-12
-- Zweck: Speichert ausgeblendete/erledigte berechnete Alerts
-- ============================================================

-- Tabelle für ausgeblendete berechnete Alerts
CREATE TABLE IF NOT EXISTS computed_alert_dismissals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Stabile synthetische ID des berechneten Alerts
  synthetic_id text NOT NULL,
  -- Alert-Typ zur Kategorisierung
  alert_type text NOT NULL,
  -- Entitätstyp (arbeitsnachweis, auslage, fahrer, etc.)
  entity_type text,
  -- Entitäts-ID (optional)
  entity_id text,
  -- Wer hat ausgeblendet
  dismissed_by uuid NOT NULL REFERENCES auth.users(id),
  -- Wann ausgeblendet
  dismissed_at timestamptz NOT NULL DEFAULT now(),
  -- Optionale Notiz
  note text,
  -- Erstellungszeitpunkt
  created_at timestamptz NOT NULL DEFAULT now(),

  -- Jede synthetic_id darf nur einmal vorkommen
  CONSTRAINT computed_alert_dismissals_synthetic_id_key UNIQUE (synthetic_id)
);

-- Index für schnelle Abfragen
CREATE INDEX IF NOT EXISTS idx_computed_alert_dismissals_synthetic_id
  ON computed_alert_dismissals(synthetic_id);
CREATE INDEX IF NOT EXISTS idx_computed_alert_dismissals_alert_type
  ON computed_alert_dismissals(alert_type);
CREATE INDEX IF NOT EXISTS idx_computed_alert_dismissals_dismissed_by
  ON computed_alert_dismissals(dismissed_by);

-- Kommentare
COMMENT ON TABLE computed_alert_dismissals IS
  'Speichert ausgeblendete berechnete Alerts, damit sie nicht ständig erneut erscheinen';
COMMENT ON COLUMN computed_alert_dismissals.synthetic_id IS
  'Stabile ID des berechneten Alerts (z.B. upload_verspaetet:tour_123)';
COMMENT ON COLUMN computed_alert_dismissals.alert_type IS
  'Typ des Alerts für Kategorisierung und RLS';

-- ============================================================
-- RLS Policies
-- ============================================================

ALTER TABLE computed_alert_dismissals ENABLE ROW LEVEL SECURITY;

-- Admin/GF: Vollzugriff
CREATE POLICY "Admin/GF can manage all dismissals"
  ON computed_alert_dismissals
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'gf')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'gf')
    )
  );

-- Disponent: Nur operative Alerts (keine Finanz-Alerts)
-- Finanz-Alert-Typen: tour_nicht_berechenbar, tour_fallback_konstanten,
--                     rechnung_nicht_gesperrt, negative_marge
CREATE POLICY "Disponent can manage operative dismissals"
  ON computed_alert_dismissals
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'disponent'
    )
    AND alert_type NOT IN (
      'tour_nicht_berechenbar',
      'tour_fallback_konstanten',
      'rechnung_nicht_gesperrt',
      'negative_marge'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'disponent'
    )
    AND alert_type NOT IN (
      'tour_nicht_berechenbar',
      'tour_fallback_konstanten',
      'rechnung_nicht_gesperrt',
      'negative_marge'
    )
  );

-- Fahrer: Kein Zugriff
-- (keine Policy = kein Zugriff durch RLS)

-- ============================================================
-- Hilfsfunktion: Dismissal erstellen
-- ============================================================

CREATE OR REPLACE FUNCTION dismiss_computed_alert(
  p_synthetic_id text,
  p_alert_type text,
  p_entity_type text DEFAULT NULL,
  p_entity_id text DEFAULT NULL,
  p_note text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_user_role text;
  v_dismissal_id uuid;
  v_is_finance_alert boolean;
BEGIN
  -- Aktuellen User holen
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Nicht angemeldet';
  END IF;

  -- User-Rolle prüfen
  SELECT role INTO v_user_role
  FROM profiles
  WHERE id = v_user_id;

  IF v_user_role IS NULL OR v_user_role NOT IN ('admin', 'gf', 'disponent') THEN
    RAISE EXCEPTION 'Keine Berechtigung';
  END IF;

  -- Finanz-Alert prüfen
  v_is_finance_alert := p_alert_type IN (
    'tour_nicht_berechenbar',
    'tour_fallback_konstanten',
    'rechnung_nicht_gesperrt',
    'negative_marge'
  );

  -- Disponent darf keine Finanz-Alerts erledigen
  IF v_user_role = 'disponent' AND v_is_finance_alert THEN
    RAISE EXCEPTION 'Disponent darf keine Finanz-Alerts erledigen';
  END IF;

  -- Dismissal einfügen (ON CONFLICT = überspringen wenn schon existiert)
  INSERT INTO computed_alert_dismissals (
    synthetic_id,
    alert_type,
    entity_type,
    entity_id,
    dismissed_by,
    note
  )
  VALUES (
    p_synthetic_id,
    p_alert_type,
    p_entity_type,
    p_entity_id,
    v_user_id,
    p_note
  )
  ON CONFLICT (synthetic_id) DO UPDATE
  SET
    dismissed_by = v_user_id,
    dismissed_at = now(),
    note = COALESCE(p_note, computed_alert_dismissals.note)
  RETURNING id INTO v_dismissal_id;

  RETURN v_dismissal_id;
END;
$$;

-- ============================================================
-- Hilfsfunktion: Dismissal entfernen (wieder anzeigen)
-- ============================================================

CREATE OR REPLACE FUNCTION undo_dismiss_computed_alert(
  p_synthetic_id text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_user_role text;
  v_alert_type text;
  v_is_finance_alert boolean;
BEGIN
  -- Aktuellen User holen
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Nicht angemeldet';
  END IF;

  -- User-Rolle prüfen
  SELECT role INTO v_user_role
  FROM profiles
  WHERE id = v_user_id;

  IF v_user_role IS NULL OR v_user_role NOT IN ('admin', 'gf', 'disponent') THEN
    RAISE EXCEPTION 'Keine Berechtigung';
  END IF;

  -- Alert-Typ holen
  SELECT alert_type INTO v_alert_type
  FROM computed_alert_dismissals
  WHERE synthetic_id = p_synthetic_id;

  IF v_alert_type IS NULL THEN
    RETURN FALSE; -- Nicht gefunden
  END IF;

  -- Finanz-Alert prüfen
  v_is_finance_alert := v_alert_type IN (
    'tour_nicht_berechenbar',
    'tour_fallback_konstanten',
    'rechnung_nicht_gesperrt',
    'negative_marge'
  );

  -- Disponent darf keine Finanz-Alert-Dismissals entfernen
  IF v_user_role = 'disponent' AND v_is_finance_alert THEN
    RAISE EXCEPTION 'Disponent darf keine Finanz-Alert-Dismissals verwalten';
  END IF;

  -- Löschen
  DELETE FROM computed_alert_dismissals
  WHERE synthetic_id = p_synthetic_id;

  RETURN TRUE;
END;
$$;

-- Grants für die Funktionen
GRANT EXECUTE ON FUNCTION dismiss_computed_alert TO authenticated;
GRANT EXECUTE ON FUNCTION undo_dismiss_computed_alert TO authenticated;
