-- =====================================================
-- SCHRITT 3: TOUR_PROTOCOLS TABELLE
-- Migration: 20260212_03_tour_protocols.sql
-- =====================================================

-- Protokoll-Tabelle (pro Tour und Phase)
CREATE TABLE IF NOT EXISTS tour_protocols (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tour_id UUID NOT NULL REFERENCES tours(id) ON DELETE CASCADE,
  phase protocol_phase NOT NULL,

  -- Zeitstempel
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,

  -- KM-Stand
  km INTEGER NOT NULL CHECK (km >= 0),

  -- Tank/Ladezustand
  fuel_level fuel_level NOT NULL,

  -- Ladekabel (nur bei E-Auto relevant)
  cable_status cable_status DEFAULT 'not_applicable',

  -- Zubehör (als JSONB für Flexibilität)
  accessories JSONB NOT NULL DEFAULT '{
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
  }'::jsonb,

  -- Schäden Einstiegsfragen
  has_interior_damage BOOLEAN DEFAULT FALSE,
  has_exterior_damage BOOLEAN DEFAULT FALSE,

  -- Übergabe
  handover_type handover_type,
  handover_note TEXT,
  recipient_name VARCHAR(255),

  -- Bestätigung
  confirmed BOOLEAN DEFAULT FALSE,
  confirmed_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Eine Phase pro Tour
  UNIQUE(tour_id, phase)
);

-- Indizes
CREATE INDEX IF NOT EXISTS idx_tour_protocols_tour_id ON tour_protocols(tour_id);
CREATE INDEX IF NOT EXISTS idx_tour_protocols_phase ON tour_protocols(phase);
CREATE INDEX IF NOT EXISTS idx_tour_protocols_completed ON tour_protocols(completed_at) WHERE completed_at IS NOT NULL;

-- Trigger für updated_at
DROP TRIGGER IF EXISTS tour_protocols_updated_at ON tour_protocols;
CREATE TRIGGER tour_protocols_updated_at
  BEFORE UPDATE ON tour_protocols
  FOR EACH ROW
  EXECUTE FUNCTION update_tours_updated_at();

COMMENT ON TABLE tour_protocols IS 'Protokoll-Daten für Übernahme (pickup) und Abgabe (dropoff)';
COMMENT ON COLUMN tour_protocols.accessories IS 'Zubehör-Checkliste als JSONB';
