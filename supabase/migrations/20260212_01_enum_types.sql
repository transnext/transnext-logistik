-- =====================================================
-- SCHRITT 1: ENUM TYPES
-- Migration: 20260212_01_enum_types.sql
-- =====================================================

-- Tour Status
DO $$ BEGIN
  CREATE TYPE tour_status AS ENUM (
    'neu',              -- Neu erstellt, kein Fahrer zugewiesen
    'uebernahme_offen', -- Fahrer zugewiesen, wartet auf Übernahme
    'abgabe_offen',     -- Übernahme abgeschlossen, wartet auf Abgabe
    'abgeschlossen'     -- Abgabe abgeschlossen
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Fahrzeugart
DO $$ BEGIN
  CREATE TYPE fahrzeugart AS ENUM ('pkw', 'e-auto', 'transporter');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Protokoll Phase
DO $$ BEGIN
  CREATE TYPE protocol_phase AS ENUM ('pickup', 'dropoff');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Tank/Ladezustand
DO $$ BEGIN
  CREATE TYPE fuel_level AS ENUM ('quarter', 'half', 'three_quarter', 'full');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Ladekabel-Status
DO $$ BEGIN
  CREATE TYPE cable_status AS ENUM ('present', 'not_present', 'not_applicable');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Felgenart
DO $$ BEGIN
  CREATE TYPE rim_type AS ENUM ('steel', 'aluminum', 'not_applicable');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Übergabe-Typ
DO $$ BEGIN
  CREATE TYPE handover_type AS ENUM (
    'recipient_present',  -- Empfänger vor Ort
    'recipient_absent',   -- Empfänger nicht vor Ort
    'recipient_refused'   -- Empfänger verweigert Unterschrift
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Signatur-Rolle
DO $$ BEGIN
  CREATE TYPE signature_role AS ENUM ('driver', 'recipient');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Foto-Kategorie (26 Pflicht + extras)
DO $$ BEGIN
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
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Schaden-Art
DO $$ BEGIN
  CREATE TYPE damage_type AS ENUM (
    'scratch',       -- Kratzer
    'dent',          -- Delle
    'crack',         -- Riss
    'tear',          -- Riss (Stoff)
    'stain',         -- Fleck
    'missing_part',  -- Fehlendes Teil
    'malfunction',   -- Defekt
    'wear',          -- Abnutzung
    'corrosion',     -- Korrosion
    'other'          -- Sonstiges
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Schaden-Bauteil (50+ Komponenten)
DO $$ BEGIN
  CREATE TYPE damage_component AS ENUM (
    -- Außen Front
    'front_bumper', 'hood', 'grille', 'windshield',
    'headlight_left', 'headlight_right',
    -- Außen Links
    'front_left_fender', 'front_left_door', 'rear_left_door', 'rear_left_fender',
    'left_mirror', 'front_left_window', 'rear_left_window',
    'front_left_wheel', 'rear_left_wheel', 'front_left_rim', 'rear_left_rim',
    -- Außen Rechts
    'front_right_fender', 'front_right_door', 'rear_right_door', 'rear_right_fender',
    'right_mirror', 'front_right_window', 'rear_right_window',
    'front_right_wheel', 'rear_right_wheel', 'front_right_rim', 'rear_right_rim',
    -- Außen Heck
    'rear_bumper', 'trunk', 'rear_window',
    'taillight_left', 'taillight_right',
    -- Außen Sonstiges
    'roof', 'antenna', 'license_plate',
    -- Innenraum
    'dashboard', 'steering_wheel', 'gear_shift', 'center_console',
    'driver_seat', 'passenger_seat', 'rear_seats',
    'door_panel_left', 'door_panel_right', 'headliner',
    'floor_mat', 'carpet', 'trunk_interior',
    -- Motor/Technik
    'engine',
    -- Sonstiges
    'other'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Audit Log Actions
DO $$ BEGIN
  CREATE TYPE audit_action AS ENUM (
    'create',
    'update',
    'delete',
    'status_change',
    'protocol_complete',
    'pdf_generated'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON TYPE tour_status IS 'Status einer Tour im Workflow';
COMMENT ON TYPE protocol_phase IS 'Phase des Protokolls: pickup (Übernahme) oder dropoff (Abgabe)';
COMMENT ON TYPE photo_category IS 'Kategorien für Protokoll-Fotos';
