-- ============================================================
-- Migration: Availability Alert Reviews
-- Datum: 2026-05-12
-- Zweck: Speichert manuelle Markierungen für "Verfügbar, aber keine Tour"
-- ============================================================

-- Tabelle für Markierungen
CREATE TABLE IF NOT EXISTS availability_alert_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Fahrer-Referenz (Pflicht)
  fahrer_id uuid NOT NULL REFERENCES fahrer(id) ON DELETE CASCADE,
  -- User-ID des Fahrers (optional, für schnelleres Matching)
  user_id uuid REFERENCES auth.users(id),
  -- Datum der Verfügbarkeit (YYYY-MM-DD)
  date date NOT NULL,
  -- Status der Markierung (aktuell nur 'available_no_tour')
  status text NOT NULL DEFAULT 'available_no_tour',
  -- Optionale Notiz zur Markierung
  note text,
  -- Wer hat markiert
  marked_by uuid NOT NULL REFERENCES auth.users(id),
  -- Wann markiert
  marked_at timestamptz NOT NULL DEFAULT now(),
  -- Erstellungs- und Aktualisierungszeit
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Jede Kombination aus fahrer_id + date + status nur einmal
  CONSTRAINT availability_alert_reviews_unique UNIQUE (fahrer_id, date, status)
);

-- Indizes für schnelle Abfragen
CREATE INDEX IF NOT EXISTS idx_availability_alert_reviews_fahrer_id
  ON availability_alert_reviews(fahrer_id);
CREATE INDEX IF NOT EXISTS idx_availability_alert_reviews_date
  ON availability_alert_reviews(date);
CREATE INDEX IF NOT EXISTS idx_availability_alert_reviews_marked_by
  ON availability_alert_reviews(marked_by);
CREATE INDEX IF NOT EXISTS idx_availability_alert_reviews_fahrer_date
  ON availability_alert_reviews(fahrer_id, date);

-- Kommentare
COMMENT ON TABLE availability_alert_reviews IS
  'Speichert manuelle Markierungen für Verfügbarkeiten ohne Tour';
COMMENT ON COLUMN availability_alert_reviews.status IS
  'Status der Markierung, aktuell nur available_no_tour';
COMMENT ON COLUMN availability_alert_reviews.note IS
  'Optionale Notiz zur Erklärung (z.B. Grund warum keine Tour)';

-- ============================================================
-- RLS Policies
-- ============================================================

ALTER TABLE availability_alert_reviews ENABLE ROW LEVEL SECURITY;

-- Admin/GF: Vollzugriff
CREATE POLICY "Admin/GF can manage all availability reviews"
  ON availability_alert_reviews
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

-- Disponent: Kann lesen und markieren
CREATE POLICY "Disponent can manage availability reviews"
  ON availability_alert_reviews
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'disponent'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'disponent'
    )
  );

-- Fahrer: Kein Zugriff (keine Policy = kein Zugriff durch RLS)

-- ============================================================
-- RPC: Markierung erstellen
-- ============================================================

CREATE OR REPLACE FUNCTION mark_available_without_tour(
  p_fahrer_id uuid,
  p_user_id uuid DEFAULT NULL,
  p_date date,
  p_note text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_user_id uuid;
  v_user_role text;
  v_review_id uuid;
BEGIN
  -- Aktuellen User holen
  v_current_user_id := auth.uid();
  IF v_current_user_id IS NULL THEN
    RAISE EXCEPTION 'Nicht angemeldet';
  END IF;

  -- User-Rolle prüfen
  SELECT role INTO v_user_role
  FROM profiles
  WHERE id = v_current_user_id;

  IF v_user_role IS NULL OR v_user_role NOT IN ('admin', 'gf', 'disponent') THEN
    RAISE EXCEPTION 'Keine Berechtigung';
  END IF;

  -- Markierung einfügen oder aktualisieren
  INSERT INTO availability_alert_reviews (
    fahrer_id,
    user_id,
    date,
    status,
    note,
    marked_by,
    marked_at
  )
  VALUES (
    p_fahrer_id,
    p_user_id,
    p_date,
    'available_no_tour',
    p_note,
    v_current_user_id,
    now()
  )
  ON CONFLICT (fahrer_id, date, status) DO UPDATE
  SET
    note = COALESCE(p_note, availability_alert_reviews.note),
    marked_by = v_current_user_id,
    marked_at = now(),
    updated_at = now()
  RETURNING id INTO v_review_id;

  RETURN v_review_id;
END;
$$;

-- ============================================================
-- RPC: Markierung entfernen (wieder anzeigen)
-- ============================================================

CREATE OR REPLACE FUNCTION undo_available_without_tour_marking(
  p_review_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_user_id uuid;
  v_user_role text;
  v_deleted boolean := FALSE;
BEGIN
  -- Aktuellen User holen
  v_current_user_id := auth.uid();
  IF v_current_user_id IS NULL THEN
    RAISE EXCEPTION 'Nicht angemeldet';
  END IF;

  -- User-Rolle prüfen
  SELECT role INTO v_user_role
  FROM profiles
  WHERE id = v_current_user_id;

  IF v_user_role IS NULL OR v_user_role NOT IN ('admin', 'gf', 'disponent') THEN
    RAISE EXCEPTION 'Keine Berechtigung';
  END IF;

  -- Markierung löschen
  DELETE FROM availability_alert_reviews
  WHERE id = p_review_id;

  IF FOUND THEN
    v_deleted := TRUE;
  END IF;

  RETURN v_deleted;
END;
$$;

-- Grants für die Funktionen
GRANT EXECUTE ON FUNCTION mark_available_without_tour TO authenticated;
GRANT EXECUTE ON FUNCTION undo_available_without_tour_marking TO authenticated;
