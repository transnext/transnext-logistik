-- =====================================================
-- SCHRITT 5: TOUR_DAMAGES & TOUR_DAMAGE_PHOTOS TABELLEN
-- Migration: 20260212_05_tour_damages.sql
-- =====================================================

-- Schäden-Tabelle
CREATE TABLE IF NOT EXISTS tour_damages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tour_id UUID NOT NULL REFERENCES tours(id) ON DELETE CASCADE,
  phase protocol_phase NOT NULL,

  -- Schaden-Details
  is_interior BOOLEAN NOT NULL, -- true = Innen, false = Außen
  damage_type damage_type NOT NULL,
  component damage_component NOT NULL,
  description TEXT NOT NULL,

  -- Vorschaden-Referenz (bei Abgabe: Verweis auf Übernahme-Schaden)
  pre_existing_damage_id UUID REFERENCES tour_damages(id) ON DELETE SET NULL,
  is_pre_existing BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indizes
CREATE INDEX IF NOT EXISTS idx_tour_damages_tour_id ON tour_damages(tour_id);
CREATE INDEX IF NOT EXISTS idx_tour_damages_phase ON tour_damages(phase);
CREATE INDEX IF NOT EXISTS idx_tour_damages_tour_phase ON tour_damages(tour_id, phase);
CREATE INDEX IF NOT EXISTS idx_tour_damages_pre_existing ON tour_damages(pre_existing_damage_id)
  WHERE pre_existing_damage_id IS NOT NULL;

-- Trigger für updated_at
DROP TRIGGER IF EXISTS tour_damages_updated_at ON tour_damages;
CREATE TRIGGER tour_damages_updated_at
  BEFORE UPDATE ON tour_damages
  FOR EACH ROW
  EXECUTE FUNCTION update_tours_updated_at();


-- Schaden-Fotos Tabelle
CREATE TABLE IF NOT EXISTS tour_damage_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  damage_id UUID NOT NULL REFERENCES tour_damages(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_path TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indizes
CREATE INDEX IF NOT EXISTS idx_tour_damage_photos_damage_id ON tour_damage_photos(damage_id);

COMMENT ON TABLE tour_damages IS 'Dokumentierte Schäden pro Tour und Phase';
COMMENT ON COLUMN tour_damages.is_pre_existing IS 'Bei Abgabe: true wenn Schaden bereits bei Übernahme dokumentiert';
COMMENT ON TABLE tour_damage_photos IS 'Fotos zu einzelnen Schäden';
