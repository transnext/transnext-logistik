-- ============================================================
-- Onboarding Phase 2: Kommunikation und Terminprozess
-- Created: 2026-05-28
-- Description: 3 Termin-Slots, Kommunikationshistorie
-- ============================================================

-- ============================================================
-- NEUE SPALTEN FÜR TERMIN-SLOTS
-- ============================================================

-- Termin-Slot 1
ALTER TABLE onboarding_candidates
ADD COLUMN IF NOT EXISTS termin_slot_1 TIMESTAMPTZ;

-- Termin-Slot 2
ALTER TABLE onboarding_candidates
ADD COLUMN IF NOT EXISTS termin_slot_2 TIMESTAMPTZ;

-- Termin-Slot 3
ALTER TABLE onboarding_candidates
ADD COLUMN IF NOT EXISTS termin_slot_3 TIMESTAMPTZ;

-- Termin-Bemerkung
ALTER TABLE onboarding_candidates
ADD COLUMN IF NOT EXISTS termin_bemerkung TEXT;

-- Gewählter Termin (wenn Bewerber einen wählt - für Phase 3)
ALTER TABLE onboarding_candidates
ADD COLUMN IF NOT EXISTS termin_gewaehlt INTEGER CHECK (termin_gewaehlt IN (1, 2, 3));

-- ============================================================
-- KOMMUNIKATIONSTYP ENUM
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'onboarding_comm_type') THEN
    CREATE TYPE onboarding_comm_type AS ENUM (
      'erstkontakt',
      'terminangebot',
      'teams_link',
      'personalfragebogen',
      'infomaterial',
      'fehlende_dokumente',
      'vertrag',
      'absage',
      'willkommen',
      'sonstiges'
    );
  END IF;
END $$;

-- ============================================================
-- KOMMUNIKATIONSSTATUS ENUM
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'onboarding_comm_status') THEN
    CREATE TYPE onboarding_comm_status AS ENUM (
      'prepared',
      'copied',
      'sent_manual',
      'sent_auto'
    );
  END IF;
END $$;

-- ============================================================
-- ONBOARDING_COMMUNICATIONS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS onboarding_communications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Referenz zum Kandidaten
  candidate_id UUID NOT NULL REFERENCES onboarding_candidates(id) ON DELETE CASCADE,

  -- Kommunikationstyp
  comm_type onboarding_comm_type NOT NULL,

  -- Inhalt
  subject TEXT,
  body TEXT NOT NULL,

  -- Status
  status onboarding_comm_status NOT NULL DEFAULT 'prepared',

  -- Wer hat es erstellt
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_by_name TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at TIMESTAMPTZ
);

-- Index
CREATE INDEX IF NOT EXISTS idx_onboarding_communications_candidate
  ON onboarding_communications(candidate_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_communications_type
  ON onboarding_communications(comm_type);
CREATE INDEX IF NOT EXISTS idx_onboarding_communications_created_at
  ON onboarding_communications(created_at DESC);

-- ============================================================
-- RLS POLICIES FÜR COMMUNICATIONS
-- ============================================================

ALTER TABLE onboarding_communications ENABLE ROW LEVEL SECURITY;

-- Admin/GF: Voller Zugriff
DROP POLICY IF EXISTS "Admin/GF can manage onboarding_communications" ON onboarding_communications;
CREATE POLICY "Admin/GF can manage onboarding_communications"
  ON onboarding_communications
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
-- GRANT PERMISSIONS
-- ============================================================

GRANT ALL ON onboarding_communications TO authenticated;
