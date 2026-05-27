-- =====================================================
-- SCHRITT 7: PDF_EXPORTS TABELLE
-- Migration: 20260212_07_pdf_exports.sql
-- =====================================================

-- PDF-Exports Tabelle
CREATE TABLE IF NOT EXISTS pdf_exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tour_id UUID NOT NULL REFERENCES tours(id) ON DELETE CASCADE,

  -- Version (1 = Original, 2+ = nach Admin-Änderung)
  version INTEGER NOT NULL DEFAULT 1,

  -- Datei-Informationen
  file_url TEXT NOT NULL,
  file_path TEXT NOT NULL, -- Storage path
  file_size_bytes BIGINT,

  -- Erstellungs-Informationen
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),

  -- Grund für neue Version (optional)
  change_reason TEXT,

  -- Einzigartigkeit: nur eine Version-Nummer pro Tour
  UNIQUE(tour_id, version)
);

-- Indizes
CREATE INDEX IF NOT EXISTS idx_pdf_exports_tour_id ON pdf_exports(tour_id);
CREATE INDEX IF NOT EXISTS idx_pdf_exports_created_at ON pdf_exports(created_at DESC);

-- View für aktuelle PDF-Version pro Tour
CREATE OR REPLACE VIEW current_pdf_exports AS
SELECT DISTINCT ON (tour_id) *
FROM pdf_exports
ORDER BY tour_id, version DESC;

COMMENT ON TABLE pdf_exports IS 'Generierte PDF-Protokolle (mehrere Versionen möglich)';
COMMENT ON COLUMN pdf_exports.version IS 'Versionsnummer: 1 = Original bei Abgabe, 2+ = nach Admin-Änderung';
COMMENT ON COLUMN pdf_exports.change_reason IS 'Grund für neue Version (bei Admin-Änderung)';
