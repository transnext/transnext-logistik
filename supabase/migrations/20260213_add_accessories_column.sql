-- =====================================================
-- TRANSNEXT LOGISTIK - Accessories Spalte hinzufügen
-- Migration: 20260213_add_accessories_column.sql
-- =====================================================
-- Diese Migration fügt die fehlende accessories JSONB-Spalte hinzu

-- Spalte hinzufügen falls sie nicht existiert
ALTER TABLE tour_protocols
ADD COLUMN IF NOT EXISTS accessories JSONB NOT NULL DEFAULT '{
  "key_count": 1,
  "registration_original": false,
  "service_booklet": false,
  "sd_card_navigation": false,
  "floor_mats": false,
  "license_plates_present": false,
  "radio_with_code": false,
  "hubcaps_present": null,
  "rim_type": "not_applicable",
  "antenna_present": false,
  "safety_kit": false
}'::jsonb;

-- tire_type Spalte hinzufügen falls sie nicht existiert
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tire_type') THEN
    CREATE TYPE tire_type AS ENUM ('winter', 'summer', 'allseason');
  END IF;
END $$;

ALTER TABLE tour_protocols
ADD COLUMN IF NOT EXISTS tire_type tire_type;

-- Kommentar
COMMENT ON COLUMN tour_protocols.accessories IS 'Zubehör-Checkliste als JSONB (key_count, registration_original, etc.)';
COMMENT ON COLUMN tour_protocols.tire_type IS 'Art der Bereifung: winter, summer, allseason';
