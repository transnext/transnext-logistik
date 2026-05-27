-- ============================================================
-- Onboarding Phase 3a: Öffentliche Bewerberlinks
-- Created: 2026-05-28
-- Description: Token-basierte öffentliche Links für Terminwahl
-- ============================================================

-- ============================================================
-- LINK STATUS ENUM
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'onboarding_link_status') THEN
    CREATE TYPE onboarding_link_status AS ENUM (
      'active',
      'used',
      'expired',
      'revoked'
    );
  END IF;
END $$;

-- ============================================================
-- LINK PURPOSE ENUM
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'onboarding_link_purpose') THEN
    CREATE TYPE onboarding_link_purpose AS ENUM (
      'appointment_selection',
      'document_upload',
      'data_confirmation'
    );
  END IF;
END $$;

-- ============================================================
-- ONBOARDING_PUBLIC_LINKS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS onboarding_public_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Referenz zum Kandidaten
  candidate_id UUID NOT NULL REFERENCES onboarding_candidates(id) ON DELETE CASCADE,

  -- Token (kryptisch stark, 64 Zeichen hex = 256 bit)
  token TEXT NOT NULL UNIQUE,

  -- Zweck des Links
  purpose onboarding_link_purpose NOT NULL DEFAULT 'appointment_selection',

  -- Status
  status onboarding_link_status NOT NULL DEFAULT 'active',

  -- Ablaufdatum
  expires_at TIMESTAMPTZ NOT NULL,

  -- Wer hat den Link erstellt
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_by_name TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  used_at TIMESTAMPTZ,

  -- Constraint: Token muss mindestens 32 Zeichen haben
  CONSTRAINT token_min_length CHECK (length(token) >= 32)
);

-- Index für schnelle Token-Suche
CREATE INDEX IF NOT EXISTS idx_onboarding_public_links_token
  ON onboarding_public_links(token);
CREATE INDEX IF NOT EXISTS idx_onboarding_public_links_candidate
  ON onboarding_public_links(candidate_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_public_links_status
  ON onboarding_public_links(status);

-- ============================================================
-- NEUE SPALTEN FÜR BEWERBER-FEEDBACK IN CANDIDATES
-- ============================================================

-- Bewerber-Kommentar (vom Bewerber eingegeben)
ALTER TABLE onboarding_candidates
ADD COLUMN IF NOT EXISTS applicant_comment TEXT;

-- Wann wurde der Termin vom Bewerber gewählt
ALTER TABLE onboarding_candidates
ADD COLUMN IF NOT EXISTS appointment_selected_at TIMESTAMPTZ;

-- Letzte Änderung durch Bewerber
ALTER TABLE onboarding_candidates
ADD COLUMN IF NOT EXISTS applicant_data_updated_at TIMESTAMPTZ;

-- ============================================================
-- RLS POLICIES FÜR PUBLIC_LINKS (Admin-Zugriff)
-- ============================================================

ALTER TABLE onboarding_public_links ENABLE ROW LEVEL SECURITY;

-- Admin/GF: Voller Zugriff auf Links
DROP POLICY IF EXISTS "Admin/GF can manage onboarding_public_links" ON onboarding_public_links;
CREATE POLICY "Admin/GF can manage onboarding_public_links"
  ON onboarding_public_links
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

-- Anonymer Lese-Zugriff für gültige, aktive Links (für Bewerber-Seite)
DROP POLICY IF EXISTS "Public can read active links by token" ON onboarding_public_links;
CREATE POLICY "Public can read active links by token"
  ON onboarding_public_links
  FOR SELECT
  USING (
    status = 'active'
    AND expires_at > now()
  );

-- ============================================================
-- RLS FÜR CANDIDATES: Öffentlicher Lesezugriff via Link
-- ============================================================

-- Hinweis: Die Public-Route wird über eine API-Route implementiert,
-- die serverseitig den Token validiert und nur erlaubte Felder zurückgibt.
-- Daher brauchen wir hier keine zusätzlichen RLS-Policies für anon.

-- ============================================================
-- FUNCTION: Token validieren und Kandidatendaten holen
-- Diese Function kann von anon aufgerufen werden
-- ============================================================

CREATE OR REPLACE FUNCTION get_candidate_by_public_token(p_token TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_link RECORD;
  v_candidate RECORD;
  v_result JSON;
BEGIN
  -- Link suchen
  SELECT * INTO v_link
  FROM onboarding_public_links
  WHERE token = p_token
  LIMIT 1;

  -- Link nicht gefunden
  IF v_link IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'invalid_token',
      'message', 'Der Link ist ungültig.'
    );
  END IF;

  -- Link abgelaufen
  IF v_link.expires_at < now() THEN
    -- Status auf expired setzen falls noch active
    UPDATE onboarding_public_links
    SET status = 'expired'
    WHERE id = v_link.id AND status = 'active';

    RETURN json_build_object(
      'success', false,
      'error', 'expired',
      'message', 'Der Link ist abgelaufen.'
    );
  END IF;

  -- Link widerrufen
  IF v_link.status = 'revoked' THEN
    RETURN json_build_object(
      'success', false,
      'error', 'revoked',
      'message', 'Der Link wurde deaktiviert.'
    );
  END IF;

  -- Link bereits verwendet - zeige trotzdem den gewählten Termin
  IF v_link.status = 'used' THEN
    SELECT * INTO v_candidate
    FROM onboarding_candidates
    WHERE id = v_link.candidate_id;

    IF v_candidate IS NULL THEN
      RETURN json_build_object(
        'success', false,
        'error', 'not_found',
        'message', 'Kandidat nicht gefunden.'
      );
    END IF;

    RETURN json_build_object(
      'success', true,
      'already_used', true,
      'candidate', json_build_object(
        'first_name', v_candidate.first_name,
        'last_name', v_candidate.last_name,
        'termin_gewaehlt', v_candidate.termin_gewaehlt,
        'termin_slot_1', v_candidate.termin_slot_1,
        'termin_slot_2', v_candidate.termin_slot_2,
        'termin_slot_3', v_candidate.termin_slot_3,
        'appointment_selected_at', v_candidate.appointment_selected_at
      )
    );
  END IF;

  -- Kandidat prüfen
  SELECT * INTO v_candidate
  FROM onboarding_candidates
  WHERE id = v_link.candidate_id;

  IF v_candidate IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'not_found',
      'message', 'Kandidat nicht gefunden.'
    );
  END IF;

  -- Kandidat archiviert oder abgelehnt?
  IF v_candidate.status IN ('archiviert', 'abgelehnt') THEN
    RETURN json_build_object(
      'success', false,
      'error', 'inactive',
      'message', 'Dieser Bewerbungsprozess ist nicht mehr aktiv.'
    );
  END IF;

  -- Keine Termine vorhanden?
  IF v_candidate.termin_slot_1 IS NULL
     AND v_candidate.termin_slot_2 IS NULL
     AND v_candidate.termin_slot_3 IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'no_appointments',
      'message', 'Es wurden noch keine Terminvorschläge hinterlegt.'
    );
  END IF;

  -- Erfolg: Nur erlaubte Felder zurückgeben
  RETURN json_build_object(
    'success', true,
    'already_used', false,
    'link_id', v_link.id,
    'expires_at', v_link.expires_at,
    'candidate', json_build_object(
      'id', v_candidate.id,
      'first_name', v_candidate.first_name,
      'last_name', v_candidate.last_name,
      'email', v_candidate.email,
      'phone', v_candidate.phone,
      'city', v_candidate.city,
      'termin_slot_1', v_candidate.termin_slot_1,
      'termin_slot_2', v_candidate.termin_slot_2,
      'termin_slot_3', v_candidate.termin_slot_3,
      'termin_gewaehlt', v_candidate.termin_gewaehlt
    )
  );
END;
$$;

-- Funktion für anon freigeben
GRANT EXECUTE ON FUNCTION get_candidate_by_public_token(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION get_candidate_by_public_token(TEXT) TO authenticated;

-- ============================================================
-- FUNCTION: Terminwahl speichern (via Token)
-- ============================================================

CREATE OR REPLACE FUNCTION submit_appointment_selection(
  p_token TEXT,
  p_selected_slot INTEGER,
  p_email TEXT DEFAULT NULL,
  p_phone TEXT DEFAULT NULL,
  p_city TEXT DEFAULT NULL,
  p_comment TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_link RECORD;
  v_candidate RECORD;
  v_selected_date TIMESTAMPTZ;
BEGIN
  -- Link suchen
  SELECT * INTO v_link
  FROM onboarding_public_links
  WHERE token = p_token
  LIMIT 1;

  -- Validierungen
  IF v_link IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'invalid_token');
  END IF;

  IF v_link.expires_at < now() THEN
    UPDATE onboarding_public_links SET status = 'expired' WHERE id = v_link.id AND status = 'active';
    RETURN json_build_object('success', false, 'error', 'expired');
  END IF;

  IF v_link.status = 'revoked' THEN
    RETURN json_build_object('success', false, 'error', 'revoked');
  END IF;

  IF v_link.status = 'used' THEN
    RETURN json_build_object('success', false, 'error', 'already_used');
  END IF;

  IF p_selected_slot NOT IN (1, 2, 3) THEN
    RETURN json_build_object('success', false, 'error', 'invalid_slot');
  END IF;

  -- Kandidat holen
  SELECT * INTO v_candidate
  FROM onboarding_candidates
  WHERE id = v_link.candidate_id;

  IF v_candidate IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'not_found');
  END IF;

  IF v_candidate.status IN ('archiviert', 'abgelehnt') THEN
    RETURN json_build_object('success', false, 'error', 'inactive');
  END IF;

  -- Gewählten Termin ermitteln
  IF p_selected_slot = 1 THEN
    v_selected_date := v_candidate.termin_slot_1;
  ELSIF p_selected_slot = 2 THEN
    v_selected_date := v_candidate.termin_slot_2;
  ELSE
    v_selected_date := v_candidate.termin_slot_3;
  END IF;

  IF v_selected_date IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'slot_not_available');
  END IF;

  -- Kandidat aktualisieren
  UPDATE onboarding_candidates
  SET
    termin_gewaehlt = p_selected_slot,
    interview_date = v_selected_date,
    appointment_selected_at = now(),
    applicant_comment = COALESCE(p_comment, applicant_comment),
    email = COALESCE(NULLIF(TRIM(p_email), ''), email),
    phone = COALESCE(NULLIF(TRIM(p_phone), ''), phone),
    city = COALESCE(NULLIF(TRIM(p_city), ''), city),
    applicant_data_updated_at = CASE
      WHEN p_email IS NOT NULL OR p_phone IS NOT NULL OR p_city IS NOT NULL
      THEN now()
      ELSE applicant_data_updated_at
    END,
    status = CASE
      WHEN status IN ('neu', 'kontakt_aufgenommen', 'termin_angeboten')
      THEN 'termin_geplant'::onboarding_status
      ELSE status
    END,
    updated_at = now()
  WHERE id = v_link.candidate_id;

  -- Link als verwendet markieren
  UPDATE onboarding_public_links
  SET status = 'used', used_at = now()
  WHERE id = v_link.id;

  -- Kommunikation/Notiz erstellen
  INSERT INTO onboarding_notes (candidate_id, content, created_by_name, created_at)
  VALUES (
    v_link.candidate_id,
    'Bewerber hat Termin ' || p_selected_slot || ' gewählt (via Bewerberlink). '
    || CASE WHEN p_comment IS NOT NULL AND p_comment != '' THEN 'Kommentar: ' || p_comment ELSE '' END
    || CASE WHEN p_email IS NOT NULL OR p_phone IS NOT NULL OR p_city IS NOT NULL THEN ' Kontaktdaten wurden aktualisiert.' ELSE '' END,
    'System (Bewerberlink)',
    now()
  );

  RETURN json_build_object(
    'success', true,
    'selected_slot', p_selected_slot,
    'selected_date', v_selected_date
  );
END;
$$;

-- Funktion für anon freigeben
GRANT EXECUTE ON FUNCTION submit_appointment_selection(TEXT, INTEGER, TEXT, TEXT, TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION submit_appointment_selection(TEXT, INTEGER, TEXT, TEXT, TEXT, TEXT) TO authenticated;

-- ============================================================
-- GRANT PERMISSIONS
-- ============================================================

GRANT ALL ON onboarding_public_links TO authenticated;
GRANT SELECT ON onboarding_public_links TO anon;
