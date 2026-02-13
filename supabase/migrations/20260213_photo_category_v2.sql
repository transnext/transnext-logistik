-- =====================================================
-- MIGRATION: photo_category_v2
--
-- Erstellt eine neue Enum mit den 20 kanonischen Foto-Kategorien
-- und migriert alle bestehenden Daten von Legacy-Werten.
-- =====================================================
-- 1. NEUE ENUM ERSTELLEN
-- Die 20 kanonischen Kategorien + damage + other
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'photo_category_v2') THEN
    CREATE TYPE photo_category_v2 AS ENUM (
      'tacho',
      'accessories',
      'front',
      'windshield',
      'left_front',
      'wheel_fl',
      'mirror_left',
      'interior_front',
      'interior_rear',
      'wheel_rl',
      'left_rear',
      'trunk',
      'rear',
      'emergency_kit',
      'spare_wheel',
      'right_rear',
      'wheel_rr',
      'wheel_fr',
      'mirror_right',
      'right_front',
      'damage',
      'other'
    );
  END IF;
END$$;
-- 2. LEGACY-WERTE IN BESTEHENDEN DATEN MIGRIEREN
-- Erstelle temporäre Spalte mit TEXT-Typ für Mapping
ALTER TABLE tour_photos
ADD COLUMN IF NOT EXISTS category_new TEXT;
-- Mappe alle bekannten Legacy-Werte auf kanonische IDs
UPDATE tour_photos SET category_new =
  CASE
    -- front_exterior -> front
    WHEN category::text = 'front_exterior' THEN 'front'
    WHEN category::text = 'vorne' THEN 'front'
    WHEN category::text = 'vorderseite' THEN 'front'
    -- rear_exterior -> rear
    WHEN category::text = 'rear_exterior' THEN 'rear'
    WHEN category::text = 'hinten' THEN 'rear'
    WHEN category::text = 'rückseite' THEN 'rear'
    -- left_side_front -> left_front
    WHEN category::text = 'left_side_front' THEN 'left_front'
    WHEN category::text = 'linksfront' THEN 'left_front'
    -- left_side_rear -> left_rear
    WHEN category::text = 'left_side_rear' THEN 'left_rear'
    WHEN category::text = 'linkshinten' THEN 'left_rear'
    -- right_side_front -> right_front
    WHEN category::text = 'right_side_front' THEN 'right_front'
    WHEN category::text = 'rechtsfront' THEN 'right_front'
    -- right_side_rear -> right_rear
    WHEN category::text = 'right_side_rear' THEN 'right_rear'
    WHEN category::text = 'rechtshinten' THEN 'right_rear'
    -- wheel_front_left -> wheel_fl
    WHEN category::text = 'wheel_front_left' THEN 'wheel_fl'
    WHEN category::text = 'rad_vorne_links' THEN 'wheel_fl'
    -- wheel_front_right -> wheel_fr
    WHEN category::text = 'wheel_front_right' THEN 'wheel_fr'
    WHEN category::text = 'rad_vorne_rechts' THEN 'wheel_fr'
    -- wheel_rear_left -> wheel_rl
    WHEN category::text = 'wheel_rear_left' THEN 'wheel_rl'
    WHEN category::text = 'rad_hinten_links' THEN 'wheel_rl'
    -- wheel_rear_right -> wheel_rr
    WHEN category::text = 'wheel_rear_right' THEN 'wheel_rr'
    WHEN category::text = 'rad_hinten_rechts' THEN 'wheel_rr'
    -- trunk_interior -> trunk
    WHEN category::text = 'trunk_interior' THEN 'trunk'
    WHEN category::text = 'kofferraum' THEN 'trunk'
    -- Andere bekannte Legacy-Werte
    WHEN category::text = 'innenraum_vorne' THEN 'interior_front'
    WHEN category::text = 'innenraum_hinten' THEN 'interior_rear'
    WHEN category::text = 'notfallkit' THEN 'emergency_kit'
    WHEN category::text = 'reserverad' THEN 'spare_wheel'
    WHEN category::text = 'windschutzscheibe' THEN 'windshield'
    WHEN category::text = 'zubehoer' THEN 'accessories'
    WHEN category::text = 'zubehör' THEN 'accessories'
    WHEN category::text = 'spiegel_links' THEN 'mirror_left'
    WHEN category::text = 'spiegel_rechts' THEN 'mirror_right'
    WHEN category::text = 'kilometerstand' THEN 'tacho'
    -- Bereits kanonische Werte bleiben unverändert
    ELSE category::text
  END
WHERE category_new IS NULL;
-- 3. ALTE SPALTE ENTFERNEN UND NEUE UMBENENNEN
-- Drop old column
ALTER TABLE tour_photos DROP COLUMN IF EXISTS category;
-- Rename new column
ALTER TABLE tour_photos RENAME COLUMN category_new TO category;
-- 4. SPALTE AUF NEUE ENUM UMSTELLEN
ALTER TABLE tour_photos
ALTER COLUMN category TYPE photo_category_v2
USING category::photo_category_v2;
-- NOT NULL Constraint hinzufügen
ALTER TABLE tour_photos
ALTER COLUMN category SET NOT NULL;
-- 5. INDEX FÜR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_tour_photos_category
ON tour_photos(category);
-- 6. ALTE ENUM LÖSCHEN (optional, nur wenn nicht mehr verwendet)
-- DROP TYPE IF EXISTS photo_category;
-- 7. DOKUMENTATION
COMMENT ON COLUMN tour_photos.category IS
'Kanonische Foto-Kategorie (v2). Gültige Werte: tacho, accessories, front, windshield, left_front, wheel_fl, mirror_left, interior_front, interior_rear, wheel_rl, left_rear, trunk, rear, emergency_kit, spare_wheel, right_rear, wheel_rr, wheel_fr, mirror_right, right_front, damage, other';
-- 8. PRÜFUNG: Zeige alle migrierten Kategorien
-- SELECT DISTINCT category FROM tour_photos ORDER BY category;
