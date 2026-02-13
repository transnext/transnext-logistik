-- =====================================================
-- SCHEMA-BEREINIGUNG UND VEREINHEITLICHUNG
-- Migration: 20260212_schema_cleanup.sql
-- =====================================================
-- ACHTUNG: Vor Ausführung Backup erstellen!
-- =====================================================

BEGIN;

-- =====================================================
-- TEIL 1: FOTO-KATEGORIEN ENUM NEU DEFINIEREN (20 Kategorien)
-- =====================================================

-- Neuen ENUM Type erstellen mit exakt 20 Kategorien
CREATE TYPE photo_category_v2 AS ENUM (
  'tacho',                    -- 1. Tacho
  'accessories',              -- 2. Zubehör
  'front_exterior',           -- 3. Vorderseite
  'windshield',               -- 4. Windschutzscheibe
  'left_side_front',          -- 5. Linke Seite vorne (Kennzeichen sichtbar)
  'wheel_front_left',         -- 6. Rad vorne links
  'mirror_left',              -- 7. Spiegel links
  'interior_front',           -- 8. Innenraum vorne
  'interior_rear',            -- 9. Innenraum hinten
  'wheel_rear_left',          -- 10. Rad hinten links
  'left_side_rear',           -- 11. Linke Seite hinten (Kennzeichen sichtbar)
  'trunk_interior',           -- 12. Kofferraum innen
  'rear_exterior',            -- 13. Hinten außen (Gesamtaufnahme)
  'emergency_kit',            -- 14. Notfallkit
  'spare_wheel',              -- 15. Reserverad/Reparaturset
  'right_side_rear',          -- 16. Rechte Seite hinten (Kennzeichen sichtbar)
  'wheel_rear_right',         -- 17. Rad hinten rechts
  'wheel_front_right',        -- 18. Rad vorne rechts
  'mirror_right',             -- 19. Spiegel rechts
  'right_side_front',         -- 20. Rechte Seite vorne (Kennzeichen sichtbar)
  'damage',                   -- Extra: Schadensfotos
  'other'                     -- Extra: Sonstige
);

-- =====================================================
-- TEIL 2: TIRE_TYPE ENUM ERSTELLEN
-- =====================================================

CREATE TYPE tire_type AS ENUM ('winter', 'summer', 'allseason');

-- =====================================================
-- TEIL 3: TOUR_PROTOCOLS ERWEITERN
-- =====================================================

-- tire_type Spalte hinzufügen (falls tour_protocols existiert)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tour_protocols') THEN
    -- tire_type hinzufügen
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'tour_protocols' AND column_name = 'tire_type') THEN
      ALTER TABLE tour_protocols ADD COLUMN tire_type tire_type;
    END IF;

    -- km Spalte umbenennen zu km_stand für Konsistenz (optional)
    -- ALTER TABLE tour_protocols RENAME COLUMN km TO km_stand;
  END IF;
END $$;

-- =====================================================
-- TEIL 4: TOUR_PHOTOS CATEGORY MIGRIEREN
-- =====================================================

-- Temporäre Spalte für Migration erstellen
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tour_photos') THEN
    -- Alte Kategorien auf neue mappen
    ALTER TABLE tour_photos ADD COLUMN IF NOT EXISTS category_new photo_category_v2;

    -- Mapping durchführen
    UPDATE tour_photos SET category_new =
      CASE category::text
        -- Direkte Mappings
        WHEN 'tacho' THEN 'tacho'::photo_category_v2
        WHEN 'accessories' THEN 'accessories'::photo_category_v2
        WHEN 'emergency_kit' THEN 'emergency_kit'::photo_category_v2
        WHEN 'spare_wheel' THEN 'spare_wheel'::photo_category_v2
        WHEN 'damage' THEN 'damage'::photo_category_v2
        WHEN 'other' THEN 'other'::photo_category_v2
        -- Alte Kategorien auf neue mappen
        WHEN 'engine_bay' THEN 'front_exterior'::photo_category_v2
        WHEN 'bumper_front_left' THEN 'front_exterior'::photo_category_v2
        WHEN 'bumper_front_right' THEN 'front_exterior'::photo_category_v2
        WHEN 'left_side_front' THEN 'left_side_front'::photo_category_v2
        WHEN 'right_side_front' THEN 'right_side_front'::photo_category_v2
        WHEN 'wheel_front_left' THEN 'wheel_front_left'::photo_category_v2
        WHEN 'wheel_front_right' THEN 'wheel_front_right'::photo_category_v2
        WHEN 'mirror_left' THEN 'mirror_left'::photo_category_v2
        WHEN 'mirror_right' THEN 'mirror_right'::photo_category_v2
        WHEN 'door_front_left' THEN 'left_side_front'::photo_category_v2
        WHEN 'door_rear_left' THEN 'left_side_rear'::photo_category_v2
        WHEN 'door_front_right' THEN 'right_side_front'::photo_category_v2
        WHEN 'door_rear_right' THEN 'right_side_rear'::photo_category_v2
        WHEN 'interior_rear' THEN 'interior_rear'::photo_category_v2
        WHEN 'wheel_rear_left' THEN 'wheel_rear_left'::photo_category_v2
        WHEN 'wheel_rear_right' THEN 'wheel_rear_right'::photo_category_v2
        WHEN 'left_side_rear' THEN 'left_side_rear'::photo_category_v2
        WHEN 'right_side_rear' THEN 'right_side_rear'::photo_category_v2
        WHEN 'bumper_rear_left' THEN 'rear_exterior'::photo_category_v2
        WHEN 'bumper_rear_right' THEN 'rear_exterior'::photo_category_v2
        WHEN 'trunk_edge' THEN 'trunk_interior'::photo_category_v2
        WHEN 'trunk_cover' THEN 'trunk_interior'::photo_category_v2
        ELSE 'other'::photo_category_v2
      END
    WHERE category_new IS NULL;

    -- Alte Spalte entfernen und neue umbenennen
    ALTER TABLE tour_photos DROP COLUMN IF EXISTS category;
    ALTER TABLE tour_photos RENAME COLUMN category_new TO category;
  END IF;
END $$;

-- =====================================================
-- TEIL 5: DATEN VON 'touren' NACH 'tours' MIGRIEREN
-- =====================================================

-- Prüfen ob beide Tabellen existieren und migrieren
DO $$
DECLARE
  v_tour_record RECORD;
  v_new_tour_id UUID;
BEGIN
  -- Nur wenn beide Tabellen existieren
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'touren')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tours') THEN

    -- Für jede Tour in 'touren' die noch nicht in 'tours' ist
    FOR v_tour_record IN
      SELECT * FROM touren t
      WHERE NOT EXISTS (SELECT 1 FROM tours WHERE tour_no = t.tour_nummer)
    LOOP
      -- In tours einfügen
      INSERT INTO tours (
        tour_no,
        vehicle_type,
        license_plate,
        fin,
        pickup_data,
        dropoff_data,
        pickup_from,
        dropoff_until,
        distance_km,
        notes,
        assigned_driver_id,
        status,
        created_at,
        updated_at
      ) VALUES (
        v_tour_record.tour_nummer,
        v_tour_record.fahrzeugart::fahrzeugart,
        v_tour_record.kennzeichen,
        v_tour_record.fin,
        jsonb_build_object(
          'name', v_tour_record.abholort_name,
          'street', v_tour_record.abholort_strasse,
          'zip', v_tour_record.abholort_plz,
          'city', v_tour_record.abholort_ort,
          'contact_name', v_tour_record.abholort_ansprechpartner_name,
          'contact_phone', v_tour_record.abholort_ansprechpartner_telefon
        ),
        jsonb_build_object(
          'name', v_tour_record.abgabeort_name,
          'street', v_tour_record.abgabeort_strasse,
          'zip', v_tour_record.abgabeort_plz,
          'city', v_tour_record.abgabeort_ort,
          'contact_name', v_tour_record.abgabeort_ansprechpartner_name,
          'contact_phone', v_tour_record.abgabeort_ansprechpartner_telefon
        ),
        v_tour_record.abholzeit_ab,
        v_tour_record.abgabezeit_bis,
        v_tour_record.distance_km,
        v_tour_record.hinweise,
        v_tour_record.fahrer_id,
        v_tour_record.status::tour_status,
        v_tour_record.created_at,
        v_tour_record.updated_at
      )
      RETURNING id INTO v_new_tour_id;

      RAISE NOTICE 'Migrated tour % to tours with new ID %', v_tour_record.tour_nummer, v_new_tour_id;
    END LOOP;
  END IF;
END $$;

-- =====================================================
-- TEIL 6: KM VALIDIERUNG (km_end >= km_start)
-- =====================================================

-- Funktion zur KM-Validierung
CREATE OR REPLACE FUNCTION validate_dropoff_km()
RETURNS TRIGGER AS $$
DECLARE
  v_pickup_km INTEGER;
BEGIN
  -- Nur bei Abgabe-Phase prüfen
  IF NEW.phase = 'dropoff' THEN
    -- Hole KM-Stand der Übernahme
    SELECT km INTO v_pickup_km
    FROM tour_protocols
    WHERE tour_id = NEW.tour_id AND phase = 'pickup';

    -- Wenn Übernahme existiert und Abgabe-KM kleiner ist
    IF v_pickup_km IS NOT NULL AND NEW.km < v_pickup_km THEN
      RAISE EXCEPTION 'Abgabe-Kilometerstand (%) darf nicht kleiner sein als Übernahme-Kilometerstand (%)',
        NEW.km, v_pickup_km;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger anlegen
DROP TRIGGER IF EXISTS validate_dropoff_km_trigger ON tour_protocols;
CREATE TRIGGER validate_dropoff_km_trigger
  BEFORE INSERT OR UPDATE ON tour_protocols
  FOR EACH ROW
  EXECUTE FUNCTION validate_dropoff_km();

-- =====================================================
-- TEIL 7: SEQUENZ AUF 1100+ SETZEN
-- =====================================================

DO $$
DECLARE
  v_max_tour_no INTEGER;
BEGIN
  -- Höchste tour_no aus beiden Tabellen ermitteln
  SELECT GREATEST(
    COALESCE((SELECT MAX(tour_no) FROM tours), 0),
    COALESCE((SELECT MAX(tour_nummer) FROM touren), 0),
    1099
  ) INTO v_max_tour_no;

  -- Sequenz setzen
  EXECUTE format('ALTER SEQUENCE tour_nummer_seq RESTART WITH %s', v_max_tour_no + 1);

  RAISE NOTICE 'Sequence set to start at %', v_max_tour_no + 1;
END $$;

-- =====================================================
-- TEIL 8: ALTE TABELLE ENTFERNEN (OPTIONAL - AUSKOMMENTIERT)
-- =====================================================

-- ACHTUNG: Erst ausführen wenn Migration erfolgreich!
-- DROP TABLE IF EXISTS touren CASCADE;

-- Alten ENUM Type löschen (wenn nicht mehr verwendet)
-- DROP TYPE IF EXISTS photo_category;
-- ALTER TYPE photo_category_v2 RENAME TO photo_category;

COMMIT;

-- =====================================================
-- ZUSAMMENFASSUNG DER ÄNDERUNGEN
-- =====================================================
--
-- 1. Neuer ENUM photo_category_v2 mit 20+2 Kategorien
-- 2. Neuer ENUM tire_type (winter, summer, allseason)
-- 3. tour_protocols.tire_type Spalte hinzugefügt
-- 4. tour_photos.category auf neuen ENUM migriert
-- 5. Daten von touren nach tours migriert
-- 6. validate_dropoff_km() Trigger für KM-Validierung
-- 7. Sequenz auf mindestens 1100 gesetzt
--
-- NACH ERFOLGREICHER MIGRATION:
-- - DROP TABLE touren; ausführen
-- - Alten photo_category ENUM entfernen
-- =====================================================
