-- =====================================================
-- PROTOKOLL-ERWEITERUNG: Vollständige Übernahme/Abgabe-Logik
-- Migration: 20260212_protokoll_erweitert.sql
-- =====================================================

-- 1) ENUM TYPES für Protokoll
-- =====================================================

-- Tank/Ladezustand
CREATE TYPE fuel_level AS ENUM ('quarter', 'half', 'three_quarter', 'full');

-- Ladekabel-Status
CREATE TYPE cable_status AS ENUM ('present', 'not_present', 'not_applicable');

-- Felgenart
CREATE TYPE rim_type AS ENUM ('steel', 'aluminum', 'not_applicable');

-- Protokoll-Phase
CREATE TYPE protocol_phase AS ENUM ('pickup', 'dropoff');

-- Schaden-Art
CREATE TYPE damage_type AS ENUM (
  'scratch', 'dent', 'crack', 'tear', 'stain', 'missing_part',
  'malfunction', 'wear', 'corrosion', 'other'
);

-- Schaden-Bauteil
CREATE TYPE damage_component AS ENUM (
  -- Außen
  'front_bumper', 'rear_bumper', 'hood', 'trunk', 'roof',
  'front_left_fender', 'front_right_fender', 'rear_left_fender', 'rear_right_fender',
  'front_left_door', 'front_right_door', 'rear_left_door', 'rear_right_door',
  'left_mirror', 'right_mirror', 'windshield', 'rear_window',
  'front_left_window', 'front_right_window', 'rear_left_window', 'rear_right_window',
  'front_left_wheel', 'front_right_wheel', 'rear_left_wheel', 'rear_right_wheel',
  'front_left_rim', 'front_right_rim', 'rear_left_rim', 'rear_right_rim',
  'headlight_left', 'headlight_right', 'taillight_left', 'taillight_right',
  'antenna', 'grille', 'license_plate',
  -- Innen
  'dashboard', 'steering_wheel', 'gear_shift', 'center_console',
  'driver_seat', 'passenger_seat', 'rear_seats',
  'door_panel_left', 'door_panel_right', 'headliner',
  'floor_mat', 'carpet', 'trunk_interior',
  -- Sonstiges
  'engine', 'other'
);

-- Übergabe-Typ
CREATE TYPE handover_type AS ENUM ('recipient_present', 'recipient_absent', 'recipient_refused');

-- Signatur-Rolle
CREATE TYPE signature_role AS ENUM ('driver', 'recipient');

-- Foto-Kategorie
CREATE TYPE photo_category AS ENUM (
  'tacho', 'accessories', 'engine_bay',
  'bumper_front_left', 'left_side_front', 'wheel_front_left', 'mirror_left',
  'door_front_left', 'door_rear_left', 'interior_rear', 'wheel_rear_left',
  'left_side_rear', 'bumper_rear_left', 'trunk_edge', 'trunk_cover',
  'emergency_kit', 'spare_wheel',
  'bumper_rear_right', 'right_side_rear', 'wheel_rear_right',
  'door_rear_right', 'door_front_right', 'wheel_front_right', 'mirror_right',
  'right_side_front', 'bumper_front_right',
  'damage', 'other'
);


-- 2) PROTOKOLL-TABELLE (erweitert touren oder separate Tabelle)
-- =====================================================

-- Neue Tabelle für Protokoll-Daten (pro Phase)
CREATE TABLE IF NOT EXISTS tour_protocols (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tour_id UUID NOT NULL REFERENCES touren(id) ON DELETE CASCADE,
  phase protocol_phase NOT NULL,

  -- Zeitstempel
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,

  -- KM-Stand
  km_stand INTEGER NOT NULL,

  -- Tank/Ladezustand
  fuel_level fuel_level NOT NULL,

  -- Ladekabel (nur bei E-Auto relevant)
  cable_status cable_status DEFAULT 'not_applicable',

  -- Zubehör
  key_count INTEGER DEFAULT 1,
  registration_original BOOLEAN DEFAULT FALSE,
  service_booklet BOOLEAN DEFAULT FALSE,
  sd_card_navigation BOOLEAN DEFAULT FALSE,
  floor_mats BOOLEAN DEFAULT FALSE,
  license_plates_present BOOLEAN DEFAULT FALSE,
  radio_with_code BOOLEAN DEFAULT FALSE,
  hubcaps_present BOOLEAN,
  rim_type rim_type DEFAULT 'not_applicable',
  antenna_present BOOLEAN DEFAULT FALSE,
  safety_kit BOOLEAN DEFAULT FALSE, -- Warndreieck/Verbandkasten/Warnweste

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

  -- Metadaten
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(tour_id, phase)
);

-- Index für schnelle Abfragen
CREATE INDEX idx_tour_protocols_tour_id ON tour_protocols(tour_id);
CREATE INDEX idx_tour_protocols_phase ON tour_protocols(phase);


-- 3) PROTOKOLL-FOTOS
-- =====================================================

CREATE TABLE IF NOT EXISTS protocol_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  protocol_id UUID NOT NULL REFERENCES tour_protocols(id) ON DELETE CASCADE,
  category photo_category NOT NULL,
  file_url TEXT NOT NULL,
  file_path TEXT, -- Storage path für Löschung
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),

  -- Kein GPS speichern (Privacy)

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_protocol_photos_protocol_id ON protocol_photos(protocol_id);
CREATE INDEX idx_protocol_photos_category ON protocol_photos(category);


-- 4) SCHÄDEN-TABELLE
-- =====================================================

CREATE TABLE IF NOT EXISTS protocol_damages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  protocol_id UUID NOT NULL REFERENCES tour_protocols(id) ON DELETE CASCADE,

  -- Schaden-Details
  is_interior BOOLEAN NOT NULL, -- true = Innen, false = Außen
  damage_type damage_type NOT NULL,
  component damage_component NOT NULL,
  description TEXT NOT NULL,

  -- Vorschaden-Referenz (bei Abgabe: Verweis auf Übernahme-Schaden)
  pre_existing_damage_id UUID REFERENCES protocol_damages(id),
  is_pre_existing BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_protocol_damages_protocol_id ON protocol_damages(protocol_id);


-- 5) SCHADEN-FOTOS
-- =====================================================

CREATE TABLE IF NOT EXISTS damage_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  damage_id UUID NOT NULL REFERENCES protocol_damages(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_path TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_damage_photos_damage_id ON damage_photos(damage_id);


-- 6) SIGNATUREN
-- =====================================================

CREATE TABLE IF NOT EXISTS protocol_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  protocol_id UUID NOT NULL REFERENCES tour_protocols(id) ON DELETE CASCADE,

  role signature_role NOT NULL,
  name VARCHAR(255), -- Bei Empfänger: Name
  file_url TEXT NOT NULL,
  file_path TEXT,
  signed_at TIMESTAMPTZ DEFAULT NOW(),

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(protocol_id, role)
);

CREATE INDEX idx_protocol_signatures_protocol_id ON protocol_signatures(protocol_id);


-- 7) RLS POLICIES
-- =====================================================

-- Protokolle
ALTER TABLE tour_protocols ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Fahrer sehen eigene Protokolle" ON tour_protocols
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM touren t
      JOIN fahrer f ON f.id = t.fahrer_id
      WHERE t.id = tour_protocols.tour_id
      AND f.user_id = auth.uid()
    )
  );

CREATE POLICY "Fahrer erstellen eigene Protokolle" ON tour_protocols
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM touren t
      JOIN fahrer f ON f.id = t.fahrer_id
      WHERE t.id = tour_protocols.tour_id
      AND f.user_id = auth.uid()
    )
  );

CREATE POLICY "Fahrer aktualisieren eigene Protokolle" ON tour_protocols
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM touren t
      JOIN fahrer f ON f.id = t.fahrer_id
      WHERE t.id = tour_protocols.tour_id
      AND f.user_id = auth.uid()
    )
  );

CREATE POLICY "Admin sieht alle Protokolle" ON tour_protocols
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'disponent')
    )
  );


-- Fotos
ALTER TABLE protocol_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Fahrer verwalten eigene Fotos" ON protocol_photos
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM tour_protocols tp
      JOIN touren t ON t.id = tp.tour_id
      JOIN fahrer f ON f.id = t.fahrer_id
      WHERE tp.id = protocol_photos.protocol_id
      AND f.user_id = auth.uid()
    )
  );

CREATE POLICY "Admin sieht alle Fotos" ON protocol_photos
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'disponent')
    )
  );


-- Schäden
ALTER TABLE protocol_damages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Fahrer verwalten eigene Schäden" ON protocol_damages
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM tour_protocols tp
      JOIN touren t ON t.id = tp.tour_id
      JOIN fahrer f ON f.id = t.fahrer_id
      WHERE tp.id = protocol_damages.protocol_id
      AND f.user_id = auth.uid()
    )
  );

CREATE POLICY "Admin sieht alle Schäden" ON protocol_damages
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'disponent')
    )
  );


-- Schaden-Fotos
ALTER TABLE damage_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Fahrer verwalten eigene Schaden-Fotos" ON damage_photos
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM protocol_damages pd
      JOIN tour_protocols tp ON tp.id = pd.protocol_id
      JOIN touren t ON t.id = tp.tour_id
      JOIN fahrer f ON f.id = t.fahrer_id
      WHERE pd.id = damage_photos.damage_id
      AND f.user_id = auth.uid()
    )
  );

CREATE POLICY "Admin sieht alle Schaden-Fotos" ON damage_photos
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'disponent')
    )
  );


-- Signaturen
ALTER TABLE protocol_signatures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Fahrer verwalten eigene Signaturen" ON protocol_signatures
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM tour_protocols tp
      JOIN touren t ON t.id = tp.tour_id
      JOIN fahrer f ON f.id = t.fahrer_id
      WHERE tp.id = protocol_signatures.protocol_id
      AND f.user_id = auth.uid()
    )
  );

CREATE POLICY "Admin sieht alle Signaturen" ON protocol_signatures
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'disponent')
    )
  );


-- 8) TRIGGER für updated_at
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_tour_protocols_updated_at
  BEFORE UPDATE ON tour_protocols
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_protocol_damages_updated_at
  BEFORE UPDATE ON protocol_damages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
