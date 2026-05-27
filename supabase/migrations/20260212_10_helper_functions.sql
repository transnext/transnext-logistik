-- =====================================================
-- SCHRITT 10: HELPER FUNCTIONS
-- Migration: 20260212_10_helper_functions.sql
-- =====================================================

-- =====================================================
-- TOUR STATUS UPDATE MIT AUDIT
-- =====================================================

-- Funktion zum Abschließen der Übernahme
CREATE OR REPLACE FUNCTION complete_pickup(
  p_tour_id UUID,
  p_km INTEGER,
  p_fuel_level fuel_level,
  p_accessories JSONB DEFAULT '{}'::jsonb
)
RETURNS tour_protocols AS $$
DECLARE
  v_protocol tour_protocols;
BEGIN
  -- Prüfen ob Fahrer zugewiesen
  IF NOT is_assigned_driver(p_tour_id) AND NOT is_admin_or_disponent() THEN
    RAISE EXCEPTION 'Nicht autorisiert';
  END IF;

  -- Prüfen ob Tour im richtigen Status
  IF NOT EXISTS (
    SELECT 1 FROM tours
    WHERE id = p_tour_id
    AND status = 'uebernahme_offen'
  ) THEN
    RAISE EXCEPTION 'Tour nicht im Status uebernahme_offen';
  END IF;

  -- Protokoll erstellen/aktualisieren
  INSERT INTO tour_protocols (
    tour_id, phase, km, fuel_level, accessories,
    confirmed, confirmed_at, completed_at
  )
  VALUES (
    p_tour_id, 'pickup', p_km, p_fuel_level, p_accessories,
    TRUE, NOW(), NOW()
  )
  ON CONFLICT (tour_id, phase)
  DO UPDATE SET
    km = EXCLUDED.km,
    fuel_level = EXCLUDED.fuel_level,
    accessories = EXCLUDED.accessories,
    confirmed = TRUE,
    confirmed_at = NOW(),
    completed_at = NOW()
  RETURNING * INTO v_protocol;

  -- Tour-Status aktualisieren
  UPDATE tours
  SET status = 'abgabe_offen'
  WHERE id = p_tour_id;

  RETURN v_protocol;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Funktion zum Abschließen der Abgabe
CREATE OR REPLACE FUNCTION complete_dropoff(
  p_tour_id UUID,
  p_km INTEGER,
  p_fuel_level fuel_level,
  p_accessories JSONB DEFAULT '{}'::jsonb,
  p_handover_type handover_type DEFAULT NULL,
  p_handover_note TEXT DEFAULT NULL,
  p_recipient_name VARCHAR(255) DEFAULT NULL
)
RETURNS tour_protocols AS $$
DECLARE
  v_protocol tour_protocols;
BEGIN
  -- Prüfen ob Fahrer zugewiesen
  IF NOT is_assigned_driver(p_tour_id) AND NOT is_admin_or_disponent() THEN
    RAISE EXCEPTION 'Nicht autorisiert';
  END IF;

  -- Prüfen ob Tour im richtigen Status
  IF NOT EXISTS (
    SELECT 1 FROM tours
    WHERE id = p_tour_id
    AND status = 'abgabe_offen'
  ) THEN
    RAISE EXCEPTION 'Tour nicht im Status abgabe_offen';
  END IF;

  -- Protokoll erstellen/aktualisieren
  INSERT INTO tour_protocols (
    tour_id, phase, km, fuel_level, accessories,
    handover_type, handover_note, recipient_name,
    confirmed, confirmed_at, completed_at
  )
  VALUES (
    p_tour_id, 'dropoff', p_km, p_fuel_level, p_accessories,
    p_handover_type, p_handover_note, p_recipient_name,
    TRUE, NOW(), NOW()
  )
  ON CONFLICT (tour_id, phase)
  DO UPDATE SET
    km = EXCLUDED.km,
    fuel_level = EXCLUDED.fuel_level,
    accessories = EXCLUDED.accessories,
    handover_type = EXCLUDED.handover_type,
    handover_note = EXCLUDED.handover_note,
    recipient_name = EXCLUDED.recipient_name,
    confirmed = TRUE,
    confirmed_at = NOW(),
    completed_at = NOW()
  RETURNING * INTO v_protocol;

  -- Tour-Status aktualisieren
  UPDATE tours
  SET status = 'abgeschlossen'
  WHERE id = p_tour_id;

  RETURN v_protocol;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =====================================================
-- TOUR MIT ALLEN DATEN LADEN
-- =====================================================

-- Gibt komplette Tour mit Protokollen, Fotos, Schäden, Signaturen zurück
CREATE OR REPLACE FUNCTION get_tour_complete(p_tour_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'tour', (
      SELECT to_jsonb(t.*) || jsonb_build_object(
        'driver', (
          SELECT jsonb_build_object('vorname', f.vorname, 'nachname', f.nachname)
          FROM fahrer f WHERE f.id = t.assigned_driver_id
        )
      )
      FROM tours t WHERE t.id = p_tour_id
    ),
    'protocols', (
      SELECT COALESCE(jsonb_agg(to_jsonb(p.*)), '[]'::jsonb)
      FROM tour_protocols p WHERE p.tour_id = p_tour_id
    ),
    'photos', (
      SELECT COALESCE(jsonb_agg(to_jsonb(ph.*)), '[]'::jsonb)
      FROM tour_photos ph WHERE ph.tour_id = p_tour_id
    ),
    'damages', (
      SELECT COALESCE(jsonb_agg(
        to_jsonb(d.*) || jsonb_build_object(
          'photos', (
            SELECT COALESCE(jsonb_agg(to_jsonb(dp.*)), '[]'::jsonb)
            FROM tour_damage_photos dp WHERE dp.damage_id = d.id
          )
        )
      ), '[]'::jsonb)
      FROM tour_damages d WHERE d.tour_id = p_tour_id
    ),
    'signatures', (
      SELECT COALESCE(jsonb_agg(to_jsonb(s.*)), '[]'::jsonb)
      FROM tour_signatures s WHERE s.tour_id = p_tour_id
    ),
    'pdf_exports', (
      SELECT COALESCE(jsonb_agg(to_jsonb(pdf.*) ORDER BY pdf.version DESC), '[]'::jsonb)
      FROM pdf_exports pdf WHERE pdf.tour_id = p_tour_id
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =====================================================
-- VORSCHÄDEN LADEN (für Abgabe)
-- =====================================================

CREATE OR REPLACE FUNCTION get_pre_existing_damages(p_tour_id UUID)
RETURNS JSONB AS $$
BEGIN
  RETURN (
    SELECT COALESCE(jsonb_agg(
      to_jsonb(d.*) || jsonb_build_object(
        'photos', (
          SELECT COALESCE(jsonb_agg(to_jsonb(dp.*)), '[]'::jsonb)
          FROM tour_damage_photos dp WHERE dp.damage_id = d.id
        )
      )
    ), '[]'::jsonb)
    FROM tour_damages d
    WHERE d.tour_id = p_tour_id
    AND d.phase = 'pickup'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =====================================================
-- NÄCHSTE PDF VERSION ERMITTELN
-- =====================================================

CREATE OR REPLACE FUNCTION get_next_pdf_version(p_tour_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN COALESCE(
    (SELECT MAX(version) + 1 FROM pdf_exports WHERE tour_id = p_tour_id),
    1
  );
END;
$$ LANGUAGE plpgsql;


-- =====================================================
-- STATISTIKEN FÜR ADMIN-DASHBOARD
-- =====================================================

CREATE OR REPLACE FUNCTION get_tour_statistics()
RETURNS JSONB AS $$
BEGIN
  RETURN jsonb_build_object(
    'total', (SELECT COUNT(*) FROM tours),
    'by_status', (
      SELECT jsonb_object_agg(status, count)
      FROM (
        SELECT status, COUNT(*) as count
        FROM tours
        GROUP BY status
      ) s
    ),
    'today', (
      SELECT COUNT(*) FROM tours
      WHERE DATE(created_at) = CURRENT_DATE
    ),
    'this_week', (
      SELECT COUNT(*) FROM tours
      WHERE created_at >= DATE_TRUNC('week', CURRENT_DATE)
    ),
    'completed_this_month', (
      SELECT COUNT(*) FROM tours
      WHERE status = 'abgeschlossen'
      AND updated_at >= DATE_TRUNC('month', CURRENT_DATE)
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


COMMENT ON FUNCTION complete_pickup IS 'Schließt die Übernahme ab und setzt Tour-Status auf abgabe_offen';
COMMENT ON FUNCTION complete_dropoff IS 'Schließt die Abgabe ab und setzt Tour-Status auf abgeschlossen';
COMMENT ON FUNCTION get_tour_complete IS 'Lädt komplette Tour mit allen Relationen';
COMMENT ON FUNCTION get_pre_existing_damages IS 'Lädt Vorschäden aus Übernahme für Abgabe-Anzeige';
