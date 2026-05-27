-- ============================================================
-- HR / Onboarding System MVP Migration
-- Created: 2026-05-27
-- Description: Tables for candidate management and onboarding process
-- ============================================================

-- ============================================================
-- ENUM TYPES
-- ============================================================

-- Kandidatentyp
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'onboarding_candidate_type') THEN
    CREATE TYPE onboarding_candidate_type AS ENUM (
      'minijobber',
      'subcontractor',
      'unknown'
    );
  END IF;
END $$;

-- Quelle des Kandidaten
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'onboarding_source') THEN
    CREATE TYPE onboarding_source AS ENUM (
      'indeed',
      'ebay',
      'empfehlung',
      'sonstiges'
    );
  END IF;
END $$;

-- Status für Onboarding-Kandidaten (gemeinsam für beide Typen)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'onboarding_status') THEN
    CREATE TYPE onboarding_status AS ENUM (
      -- Gemeinsame Status
      'neu',
      'kontakt_aufgenommen',
      'termin_angeboten',
      'termin_geplant',
      'gespraech_gefuehrt',
      'geeignet',
      'abgelehnt',
      -- Minijobber-spezifisch
      'personalfragebogen_gesendet',
      'personalfragebogen_erhalten',
      -- Subunternehmer-spezifisch
      'firmendaten_angefordert',
      'firmendaten_erhalten',
      -- Gemeinsam
      'dokumente_angefordert',
      'dokumente_unvollstaendig',
      'dokumente_vollstaendig',
      -- Minijobber-spezifisch
      'infomaterial_gesendet',
      'quiz_offen',
      'quiz_bestanden',
      -- Gemeinsam
      'vertrag_gesendet',
      'vertrag_unterschrieben',
      -- Subunternehmer-spezifisch
      'fahrerlisten_angefordert',
      -- Gemeinsam
      'freigabe_offen',
      'freigegeben',
      'fahrer_erstellt',
      'aktiv',
      'archiviert'
    );
  END IF;
END $$;

-- Ja/Nein/Unbekannt für optionale Felder
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'yes_no_unknown') THEN
    CREATE TYPE yes_no_unknown AS ENUM (
      'yes',
      'no',
      'unknown'
    );
  END IF;
END $$;

-- Dokumentstatus für Onboarding-Dokumente
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'onboarding_document_status') THEN
    CREATE TYPE onboarding_document_status AS ENUM (
      'offen',
      'angefordert',
      'erhalten',
      'geprueft',
      'abgelehnt',
      'nicht_erforderlich'
    );
  END IF;
END $$;

-- Dokumenttyp für Onboarding-Dokumente
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'onboarding_document_type') THEN
    CREATE TYPE onboarding_document_type AS ENUM (
      -- Minijobber-Dokumente
      'personalfragebogen',
      'fuehrerschein',
      'ausweis',
      'vertrag',
      'schulungsnachweis',
      -- Subunternehmer-Dokumente
      'gewerbeanmeldung',
      'versicherungsnachweis',
      'ausweis_gf',
      'subunternehmervertrag',
      'fahrerliste',
      -- Beide
      'sonstiges'
    );
  END IF;
END $$;

-- ============================================================
-- ONBOARDING_CANDIDATES TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS onboarding_candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Grunddaten
  type onboarding_candidate_type NOT NULL DEFAULT 'unknown',
  status onboarding_status NOT NULL DEFAULT 'neu',
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,

  -- Quelle
  source onboarding_source NOT NULL DEFAULT 'sonstiges',
  source_note TEXT,

  -- Optionale Daten
  city TEXT,
  notes_internal TEXT,

  -- Zuweisung
  assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- Kandidaten-Informationen (optional)
  has_license yes_no_unknown DEFAULT 'unknown',
  license_classes TEXT,
  experience_level yes_no_unknown DEFAULT 'unknown',
  availability_known yes_no_unknown DEFAULT 'unknown',
  availability_note TEXT,
  desired_employment_type TEXT,

  -- Prozess-Daten
  interview_date TIMESTAMPTZ,
  teams_link TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ,

  -- Constraints
  CONSTRAINT email_or_phone_required CHECK (
    email IS NOT NULL OR phone IS NOT NULL
  )
);

-- Index für häufige Abfragen
CREATE INDEX IF NOT EXISTS idx_onboarding_candidates_status ON onboarding_candidates(status);
CREATE INDEX IF NOT EXISTS idx_onboarding_candidates_type ON onboarding_candidates(type);
CREATE INDEX IF NOT EXISTS idx_onboarding_candidates_assigned ON onboarding_candidates(assigned_to);
CREATE INDEX IF NOT EXISTS idx_onboarding_candidates_created_at ON onboarding_candidates(created_at DESC);

-- ============================================================
-- ONBOARDING_DOCUMENTS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS onboarding_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Referenz
  candidate_id UUID NOT NULL REFERENCES onboarding_candidates(id) ON DELETE CASCADE,

  -- Dokument-Info
  document_type onboarding_document_type NOT NULL,
  status onboarding_document_status NOT NULL DEFAULT 'offen',

  -- Datei (optional - falls hochgeladen)
  file_path TEXT,
  file_name TEXT,
  file_size INTEGER,

  -- Kommentar
  comment TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index für Kandidaten-Dokumente
CREATE INDEX IF NOT EXISTS idx_onboarding_documents_candidate ON onboarding_documents(candidate_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_documents_status ON onboarding_documents(status);

-- ============================================================
-- ONBOARDING_NOTES TABLE (für interne HR-Notizen)
-- ============================================================

CREATE TABLE IF NOT EXISTS onboarding_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Referenz
  candidate_id UUID NOT NULL REFERENCES onboarding_candidates(id) ON DELETE CASCADE,

  -- Notiz-Inhalt
  content TEXT NOT NULL,

  -- Wer hat die Notiz erstellt
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_by_name TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_onboarding_notes_candidate ON onboarding_notes(candidate_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_notes_created_at ON onboarding_notes(created_at DESC);

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

-- Updated_at Trigger für onboarding_candidates
CREATE OR REPLACE FUNCTION update_onboarding_candidate_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_onboarding_candidate_updated_at ON onboarding_candidates;
CREATE TRIGGER trigger_update_onboarding_candidate_updated_at
  BEFORE UPDATE ON onboarding_candidates
  FOR EACH ROW
  EXECUTE FUNCTION update_onboarding_candidate_updated_at();

-- Updated_at Trigger für onboarding_documents
CREATE OR REPLACE FUNCTION update_onboarding_document_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_onboarding_document_updated_at ON onboarding_documents;
CREATE TRIGGER trigger_update_onboarding_document_updated_at
  BEFORE UPDATE ON onboarding_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_onboarding_document_updated_at();

-- ============================================================
-- RLS POLICIES
-- ============================================================

-- Enable RLS
ALTER TABLE onboarding_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_notes ENABLE ROW LEVEL SECURITY;

-- Admin/GF: Voller Zugriff auf Onboarding-Kandidaten
DROP POLICY IF EXISTS "Admin/GF can manage onboarding_candidates" ON onboarding_candidates;
CREATE POLICY "Admin/GF can manage onboarding_candidates"
  ON onboarding_candidates
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'gf')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'gf')
    )
  );

-- Disponent: Kein Zugriff auf Onboarding (sensible HR-Daten)
-- Fahrer: Kein Zugriff auf Onboarding

-- Admin/GF: Voller Zugriff auf Onboarding-Dokumente
DROP POLICY IF EXISTS "Admin/GF can manage onboarding_documents" ON onboarding_documents;
CREATE POLICY "Admin/GF can manage onboarding_documents"
  ON onboarding_documents
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'gf')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'gf')
    )
  );

-- Admin/GF: Voller Zugriff auf Onboarding-Notizen
DROP POLICY IF EXISTS "Admin/GF can manage onboarding_notes" ON onboarding_notes;
CREATE POLICY "Admin/GF can manage onboarding_notes"
  ON onboarding_notes
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'gf')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'gf')
    )
  );

-- ============================================================
-- STORAGE BUCKET für Onboarding-Dokumente
-- ============================================================

-- Bucket erstellen (falls nicht vorhanden)
INSERT INTO storage.buckets (id, name, public)
VALUES ('onboarding-documents', 'onboarding-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies für onboarding-documents Bucket
DROP POLICY IF EXISTS "Admin/GF can upload onboarding documents" ON storage.objects;
CREATE POLICY "Admin/GF can upload onboarding documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'onboarding-documents'
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'gf')
  )
);

DROP POLICY IF EXISTS "Admin/GF can view onboarding documents" ON storage.objects;
CREATE POLICY "Admin/GF can view onboarding documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'onboarding-documents'
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'gf')
  )
);

DROP POLICY IF EXISTS "Admin/GF can update onboarding documents" ON storage.objects;
CREATE POLICY "Admin/GF can update onboarding documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'onboarding-documents'
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'gf')
  )
);

DROP POLICY IF EXISTS "Admin/GF can delete onboarding documents" ON storage.objects;
CREATE POLICY "Admin/GF can delete onboarding documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'onboarding-documents'
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'gf')
  )
);

-- ============================================================
-- GRANT PERMISSIONS
-- ============================================================

GRANT ALL ON onboarding_candidates TO authenticated;
GRANT ALL ON onboarding_documents TO authenticated;
GRANT ALL ON onboarding_notes TO authenticated;
