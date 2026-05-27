-- =====================================================
-- TRANSNEXT LOGISTIK - FINALE SCHEMA-BEREINIGUNG
-- Migration: 20260212_FINAL_CLEANUP.sql
-- =====================================================

BEGIN;

-- =====================================================
-- 1. ENUM TYPES
-- =====================================================

-- tire_type ENUM
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tire_type') THEN
    CREATE TYPE tire_type AS ENUM ('winter', 'summer', 'allseason');
  END IF;
END $$;

-- =====================================================
-- 2. TOUR_PROTOCOLS: tire_type ALS EIGENE SPALTE
-- =====================================================

ALTER TABLE tour_protocols
ADD COLUMN IF NOT EXISTS tire_type tire_type;

-- tire_type aus accessories JSONB migrieren
UPDATE tour_protocols
SET tire_type =
  CASE (accessories->>'tire_type')
    WHEN 'winter' THEN 'winter'::tire_type
    WHEN 'summer' THEN 'summer'::tire_type
    WHEN 'allseason' THEN 'allseason'::tire_type
    ELSE NULL
  END
WHERE tire_type IS NULL
  AND accessories ? 'tire_type';

-- tire_type aus accessories entfernen
UPDATE tour_protocols
SET accessories = accessories - 'tire_type'
WHERE accessories ? 'tire_type';

-- =====================================================
-- 3. TOUR_PHOTOS: CATEGORY CHECK CONSTRAINT (22 Werte)
-- =====================================================

-- Alte Kategorien auf neue mappen
UPDATE tour_photos SET category =
  CASE category
    WHEN 'engine_bay' THEN 'front_exterior'
    WHEN 'bumper_front_left' THEN 'front_exterior'
    WHEN 'bumper_front_right' THEN 'front_exterior'
    WHEN 'bumper_rear_left' THEN 'rear_exterior'
    WHEN 'bumper_rear_right' THEN 'rear_exterior'
    WHEN 'door_front_left' THEN 'left_side_front'
    WHEN 'door_rear_left' THEN 'left_side_rear'
    WHEN 'door_front_right' THEN 'right_side_front'
    WHEN 'door_rear_right' THEN 'right_side_rear'
    WHEN 'trunk_edge' THEN 'trunk_interior'
    WHEN 'trunk_cover' THEN 'trunk_interior'
    ELSE category
  END
WHERE category IN (
  'engine_bay', 'bumper_front_left', 'bumper_front_right',
  'bumper_rear_left', 'bumper_rear_right',
  'door_front_left', 'door_rear_left',
  'door_front_right', 'door_rear_right',
  'trunk_edge', 'trunk_cover'
);

-- CHECK constraint für 22 gültige Kategorien
ALTER TABLE tour_photos DROP CONSTRAINT IF EXISTS tour_photos_category_check;
ALTER TABLE tour_photos ADD CONSTRAINT tour_photos_category_check
  CHECK (category IN (
    'tacho', 'accessories', 'front_exterior', 'windshield',
    'left_side_front', 'wheel_front_left', 'mirror_left',
    'interior_front', 'interior_rear', 'wheel_rear_left',
    'left_side_rear', 'trunk_interior', 'rear_exterior',
    'emergency_kit', 'spare_wheel',
    'right_side_rear', 'wheel_rear_right',
    'wheel_front_right', 'mirror_right', 'right_side_front',
    'damage', 'other'
  ));

-- =====================================================
-- 4. KM-VALIDIERUNG: DROPOFF >= PICKUP
-- =====================================================

CREATE OR REPLACE FUNCTION validate_dropoff_km()
RETURNS TRIGGER AS $$
DECLARE
  v_pickup_km INTEGER;
BEGIN
  IF NEW.phase = 'dropoff' THEN
    SELECT km INTO v_pickup_km
    FROM tour_protocols
    WHERE tour_id = NEW.tour_id AND phase = 'pickup';

    IF v_pickup_km IS NOT NULL AND NEW.km < v_pickup_km THEN
      RAISE EXCEPTION 'Abgabe-KM (%) < Übernahme-KM (%)', NEW.km, v_pickup_km;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS validate_dropoff_km_trigger ON tour_protocols;
CREATE TRIGGER validate_dropoff_km_trigger
  BEFORE INSERT OR UPDATE ON tour_protocols
  FOR EACH ROW EXECUTE FUNCTION validate_dropoff_km();

-- =====================================================
-- 5. SEQUENCE AUF 1100+ SETZEN
-- =====================================================

DO $$
DECLARE
  v_max INTEGER;
BEGIN
  SELECT GREATEST(
    COALESCE((SELECT MAX(tour_no) FROM tours), 0),
    1099
  ) INTO v_max;

  EXECUTE format('ALTER SEQUENCE tour_no_seq RESTART WITH %s', v_max + 1);
END $$;

COMMIT;

-- =====================================================
-- ZUSAMMENFASSUNG
-- =====================================================
-- 1. tire_type als eigene Spalte in tour_protocols
-- 2. photo_category auf 22 Werte begrenzt
-- 3. km_dropoff >= km_pickup per Trigger validiert
-- 4. Sequence auf 1100+ gesetzt
-- =====================================================
