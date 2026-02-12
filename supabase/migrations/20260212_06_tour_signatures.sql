-- =====================================================
-- SCHRITT 6: TOUR_SIGNATURES TABELLE
-- Migration: 20260212_06_tour_signatures.sql
-- =====================================================

-- Unterschriften-Tabelle
CREATE TABLE IF NOT EXISTS tour_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tour_id UUID NOT NULL REFERENCES tours(id) ON DELETE CASCADE,
  phase protocol_phase NOT NULL,

  role signature_role NOT NULL,
  name VARCHAR(255), -- Bei Empfänger: Name
  file_url TEXT NOT NULL,
  file_path TEXT,
  signed_at TIMESTAMPTZ DEFAULT NOW(),

  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Eine Unterschrift pro Rolle, Phase und Tour
  UNIQUE(tour_id, phase, role)
);

-- Indizes
CREATE INDEX IF NOT EXISTS idx_tour_signatures_tour_id ON tour_signatures(tour_id);
CREATE INDEX IF NOT EXISTS idx_tour_signatures_tour_phase ON tour_signatures(tour_id, phase);

COMMENT ON TABLE tour_signatures IS 'Unterschriften von Fahrer und Empfänger';
COMMENT ON COLUMN tour_signatures.name IS 'Name des Unterzeichners (bei Empfänger)';
