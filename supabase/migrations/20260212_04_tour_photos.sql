-- =====================================================
-- SCHRITT 4: TOUR_PHOTOS TABELLE
-- Migration: 20260212_04_tour_photos.sql
-- =====================================================

-- Protokoll-Fotos
CREATE TABLE IF NOT EXISTS tour_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tour_id UUID NOT NULL REFERENCES tours(id) ON DELETE CASCADE,
  phase protocol_phase NOT NULL,
  category photo_category NOT NULL,
  file_url TEXT NOT NULL,
  file_path TEXT, -- Storage path für Löschung
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indizes
CREATE INDEX IF NOT EXISTS idx_tour_photos_tour_id ON tour_photos(tour_id);
CREATE INDEX IF NOT EXISTS idx_tour_photos_phase ON tour_photos(phase);
CREATE INDEX IF NOT EXISTS idx_tour_photos_category ON tour_photos(category);
CREATE INDEX IF NOT EXISTS idx_tour_photos_tour_phase ON tour_photos(tour_id, phase);

-- Unique constraint: Eine Foto-Kategorie pro Tour und Phase
-- (außer 'damage' und 'other', die mehrfach vorkommen können)
CREATE UNIQUE INDEX IF NOT EXISTS idx_tour_photos_unique_category
  ON tour_photos(tour_id, phase, category)
  WHERE category NOT IN ('damage', 'other');

COMMENT ON TABLE tour_photos IS 'Protokoll-Fotos pro Tour und Phase';
COMMENT ON COLUMN tour_photos.file_path IS 'Pfad im Supabase Storage für Löschung';
