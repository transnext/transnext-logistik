-- =====================================================
-- SCHRITT 2: TOURS HAUPTTABELLE
-- Migration: 20260212_02_tours_table.sql
-- =====================================================

-- Sequence für automatische Tournummer-Generierung
CREATE SEQUENCE IF NOT EXISTS tour_nummer_seq START WITH 1;

-- Haupttabelle: tours
CREATE TABLE IF NOT EXISTS tours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Automatisch generierte Tournummer (global fortlaufend)
  tour_no INTEGER UNIQUE NOT NULL DEFAULT nextval('tour_nummer_seq'),

  -- Fahrzeugdaten
  vehicle_type fahrzeugart NOT NULL,
  license_plate VARCHAR(20) NOT NULL,
  fin VARCHAR(17) NOT NULL CHECK (fin ~ '^[A-HJ-NPR-Z0-9]{17}$'),

  -- Abholort (JSONB für flexiblere Struktur)
  pickup_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Struktur: {
  --   "name": "Autohaus XY",
  --   "street": "Musterstraße 1",
  --   "zip": "12345",
  --   "city": "Berlin",
  --   "contact_name": "Max Mustermann",
  --   "contact_phone": "+49 123 456789"
  -- }

  -- Abgabeort (JSONB)
  dropoff_data JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Zeitfenster
  pickup_from TIMESTAMPTZ,
  dropoff_until TIMESTAMPTZ,

  -- Distanz (via Google Maps berechnet)
  distance_km DECIMAL(10,2),

  -- Hinweise
  notes TEXT,

  -- Fahrer-Zuordnung (UUID zu fahrer.id)
  assigned_driver_id UUID REFERENCES fahrer(id) ON DELETE SET NULL,

  -- Status
  status tour_status NOT NULL DEFAULT 'neu',

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Indizes für schnelle Abfragen
CREATE INDEX IF NOT EXISTS idx_tours_status ON tours(status);
CREATE INDEX IF NOT EXISTS idx_tours_driver_id ON tours(assigned_driver_id);
CREATE INDEX IF NOT EXISTS idx_tours_tour_no ON tours(tour_no);
CREATE INDEX IF NOT EXISTS idx_tours_created_at ON tours(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tours_license_plate ON tours(license_plate);

-- GIN Index für JSONB-Suche
CREATE INDEX IF NOT EXISTS idx_tours_pickup_data ON tours USING GIN (pickup_data);
CREATE INDEX IF NOT EXISTS idx_tours_dropoff_data ON tours USING GIN (dropoff_data);

-- Trigger für updated_at
CREATE OR REPLACE FUNCTION update_tours_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tours_updated_at ON tours;
CREATE TRIGGER tours_updated_at
  BEFORE UPDATE ON tours
  FOR EACH ROW
  EXECUTE FUNCTION update_tours_updated_at();

COMMENT ON TABLE tours IS 'Haupttabelle für Fahrzeugüberführungen';
COMMENT ON COLUMN tours.tour_no IS 'Automatisch generierte, fortlaufende Tournummer';
COMMENT ON COLUMN tours.fin IS 'Fahrzeugidentifikationsnummer (17 Zeichen)';
COMMENT ON COLUMN tours.pickup_data IS 'Abholort als JSONB (name, street, zip, city, contact_name, contact_phone)';
COMMENT ON COLUMN tours.dropoff_data IS 'Abgabeort als JSONB (name, street, zip, city, contact_name, contact_phone)';
