-- ============================================================
-- Onboarding Phase 3b: Digitaler Personalfragebogen
-- Created: 2026-05-28
-- Description: Personalfragebogen für Bewerber (via Public Link)
-- ============================================================

-- ============================================================
-- QUESTIONNAIRE STATUS ENUM
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'questionnaire_status') THEN
    CREATE TYPE questionnaire_status AS ENUM (
      'draft',
      'submitted',
      'reviewed',
      'rejected'
    );
  END IF;
END $$;

-- ============================================================
-- EMPLOYMENT TYPE ENUM
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'questionnaire_employment_type') THEN
    CREATE TYPE questionnaire_employment_type AS ENUM (
      'minijob',
      'teilzeit',
      'vollzeit',
      'subcontractor',
      'unknown'
    );
  END IF;
END $$;

-- ============================================================
-- ONBOARDING_QUESTIONNAIRES TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS onboarding_questionnaires (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Referenz zum Kandidaten (1:1)
  candidate_id UUID NOT NULL UNIQUE REFERENCES onboarding_candidates(id) ON DELETE CASCADE,

  -- Status
  status questionnaire_status NOT NULL DEFAULT 'draft',

  -- ============================================================
  -- PERSÖNLICHE DATEN
  -- ============================================================
  birth_date DATE,
  street TEXT,
  house_number TEXT,
  postal_code TEXT,
  city TEXT,
  country TEXT DEFAULT 'Deutschland',
  phone_confirmed TEXT,
  email_confirmed TEXT,

  -- ============================================================
  -- BESCHÄFTIGUNGSDATEN
  -- ============================================================
  employment_type questionnaire_employment_type DEFAULT 'unknown',
  has_other_employment BOOLEAN,
  other_employment_note TEXT,
  tax_id TEXT,
  social_security_number TEXT,
  health_insurance TEXT,

  -- ============================================================
  -- BANKDATEN
  -- ============================================================
  iban TEXT,
  account_holder TEXT,

  -- ============================================================
  -- FÜHRERSCHEINDATEN
  -- ============================================================
  has_license BOOLEAN,
  license_classes TEXT,
  license_number TEXT,
  license_issued_at DATE,
  license_authority TEXT,

  -- ============================================================
  -- EINWILLIGUNGEN
  -- ============================================================
  privacy_accepted BOOLEAN NOT NULL DEFAULT false,
  data_accuracy_confirmed BOOLEAN NOT NULL DEFAULT false,
  onboarding_terms_accepted BOOLEAN NOT NULL DEFAULT false,

  -- ============================================================
  -- TIMESTAMPS
  -- ============================================================
  submitted_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_by_name TEXT,
  review_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indizes
CREATE INDEX IF NOT EXISTS idx_onboarding_questionnaires_candidate
  ON onboarding_questionnaires(candidate_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_questionnaires_status
  ON onboarding_questionnaires(status);

-- ============================================================
-- RLS POLICIES
-- ============================================================

ALTER TABLE onboarding_questionnaires ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin/GF can manage onboarding_questionnaires" ON onboarding_questionnaires;
CREATE POLICY "Admin/GF can manage onboarding_questionnaires"
  ON onboarding_questionnaires
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
-- FUNCTION: Fragebogen via Token abrufen
-- ============================================================

CREATE OR REPLACE FUNCTION get_questionnaire_by_token(p_token TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_link RECORD;
  v_candidate RECORD;
  v_questionnaire RECORD;
BEGIN
  SELECT * INTO v_link FROM onboarding_public_links WHERE token = p_token LIMIT 1;

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

  SELECT * INTO v_candidate FROM onboarding_candidates WHERE id = v_link.candidate_id;

  IF v_candidate IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'not_found');
  END IF;

  IF v_candidate.status IN ('archiviert', 'abgelehnt') THEN
    RETURN json_build_object('success', false, 'error', 'inactive');
  END IF;

  SELECT * INTO v_questionnaire FROM onboarding_questionnaires WHERE candidate_id = v_link.candidate_id;

  IF v_questionnaire IS NOT NULL AND v_questionnaire.status = 'submitted' THEN
    RETURN json_build_object(
      'success', true,
      'already_submitted', true,
      'submitted_at', v_questionnaire.submitted_at,
      'candidate', json_build_object(
        'first_name', v_candidate.first_name,
        'last_name', v_candidate.last_name
      )
    );
  END IF;

  RETURN json_build_object(
    'success', true,
    'already_submitted', false,
    'candidate', json_build_object(
      'id', v_candidate.id,
      'first_name', v_candidate.first_name,
      'last_name', v_candidate.last_name,
      'email', v_candidate.email,
      'phone', v_candidate.phone,
      'city', v_candidate.city
    ),
    'questionnaire', CASE
      WHEN v_questionnaire IS NOT NULL THEN json_build_object(
        'birth_date', v_questionnaire.birth_date,
        'street', v_questionnaire.street,
        'house_number', v_questionnaire.house_number,
        'postal_code', v_questionnaire.postal_code,
        'city', v_questionnaire.city,
        'country', v_questionnaire.country,
        'phone_confirmed', v_questionnaire.phone_confirmed,
        'email_confirmed', v_questionnaire.email_confirmed,
        'employment_type', v_questionnaire.employment_type,
        'has_other_employment', v_questionnaire.has_other_employment,
        'other_employment_note', v_questionnaire.other_employment_note,
        'tax_id', v_questionnaire.tax_id,
        'social_security_number', v_questionnaire.social_security_number,
        'health_insurance', v_questionnaire.health_insurance,
        'iban', v_questionnaire.iban,
        'account_holder', v_questionnaire.account_holder,
        'has_license', v_questionnaire.has_license,
        'license_classes', v_questionnaire.license_classes,
        'license_number', v_questionnaire.license_number,
        'license_issued_at', v_questionnaire.license_issued_at,
        'license_authority', v_questionnaire.license_authority
      )
      ELSE NULL
    END
  );
END;
$$;

GRANT EXECUTE ON FUNCTION get_questionnaire_by_token(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION get_questionnaire_by_token(TEXT) TO authenticated;

-- ============================================================
-- FUNCTION: Fragebogen einreichen
-- ============================================================

CREATE OR REPLACE FUNCTION submit_questionnaire(p_token TEXT, p_data JSON)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_link RECORD;
  v_candidate RECORD;
  v_questionnaire_id UUID;
  v_birth_date DATE;
  v_iban TEXT;
  v_email TEXT;
BEGIN
  SELECT * INTO v_link FROM onboarding_public_links WHERE token = p_token LIMIT 1;

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

  SELECT * INTO v_candidate FROM onboarding_candidates WHERE id = v_link.candidate_id;

  IF v_candidate IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'not_found');
  END IF;

  IF v_candidate.status IN ('archiviert', 'abgelehnt') THEN
    RETURN json_build_object('success', false, 'error', 'inactive');
  END IF;

  IF EXISTS (SELECT 1 FROM onboarding_questionnaires WHERE candidate_id = v_link.candidate_id AND status = 'submitted') THEN
    RETURN json_build_object('success', false, 'error', 'already_submitted');
  END IF;

  -- Einwilligungen prüfen
  IF NOT COALESCE((p_data->>'privacy_accepted')::BOOLEAN, false) OR
     NOT COALESCE((p_data->>'data_accuracy_confirmed')::BOOLEAN, false) OR
     NOT COALESCE((p_data->>'onboarding_terms_accepted')::BOOLEAN, false) THEN
    RETURN json_build_object('success', false, 'error', 'consent_required');
  END IF;

  -- Geburtsdatum validieren
  IF p_data->>'birth_date' IS NOT NULL AND p_data->>'birth_date' != '' THEN
    BEGIN
      v_birth_date := (p_data->>'birth_date')::DATE;
      IF v_birth_date > CURRENT_DATE - INTERVAL '16 years' OR v_birth_date < CURRENT_DATE - INTERVAL '100 years' THEN
        RETURN json_build_object('success', false, 'error', 'invalid_birth_date');
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RETURN json_build_object('success', false, 'error', 'invalid_birth_date');
    END;
  END IF;

  -- IBAN validieren
  v_iban := TRIM(UPPER(REPLACE(REPLACE(COALESCE(p_data->>'iban', ''), ' ', ''), '-', '')));
  IF v_iban != '' THEN
    IF LENGTH(v_iban) < 15 OR LENGTH(v_iban) > 34 OR NOT (v_iban ~ '^[A-Z]{2}[0-9A-Z]+$') THEN
      RETURN json_build_object('success', false, 'error', 'invalid_iban');
    END IF;
  ELSE
    v_iban := NULL;
  END IF;

  -- E-Mail validieren
  v_email := TRIM(COALESCE(p_data->>'email_confirmed', ''));
  IF v_email != '' AND NOT (v_email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$') THEN
    RETURN json_build_object('success', false, 'error', 'invalid_email');
  END IF;
  IF v_email = '' THEN v_email := NULL; END IF;

  -- Fragebogen speichern
  INSERT INTO onboarding_questionnaires (
    candidate_id, status, birth_date, street, house_number, postal_code, city, country,
    phone_confirmed, email_confirmed, employment_type, has_other_employment, other_employment_note,
    tax_id, social_security_number, health_insurance, iban, account_holder,
    has_license, license_classes, license_number, license_issued_at, license_authority,
    privacy_accepted, data_accuracy_confirmed, onboarding_terms_accepted, submitted_at, updated_at
  )
  VALUES (
    v_link.candidate_id, 'submitted', v_birth_date,
    NULLIF(TRIM(COALESCE(p_data->>'street', '')), ''),
    NULLIF(TRIM(COALESCE(p_data->>'house_number', '')), ''),
    NULLIF(TRIM(COALESCE(p_data->>'postal_code', '')), ''),
    NULLIF(TRIM(COALESCE(p_data->>'city', '')), ''),
    COALESCE(NULLIF(TRIM(COALESCE(p_data->>'country', '')), ''), 'Deutschland'),
    NULLIF(TRIM(COALESCE(p_data->>'phone_confirmed', '')), ''),
    v_email,
    COALESCE((p_data->>'employment_type')::questionnaire_employment_type, 'unknown'),
    (p_data->>'has_other_employment')::BOOLEAN,
    NULLIF(TRIM(COALESCE(p_data->>'other_employment_note', '')), ''),
    NULLIF(TRIM(COALESCE(p_data->>'tax_id', '')), ''),
    NULLIF(TRIM(COALESCE(p_data->>'social_security_number', '')), ''),
    NULLIF(TRIM(COALESCE(p_data->>'health_insurance', '')), ''),
    v_iban,
    NULLIF(TRIM(COALESCE(p_data->>'account_holder', '')), ''),
    (p_data->>'has_license')::BOOLEAN,
    NULLIF(TRIM(COALESCE(p_data->>'license_classes', '')), ''),
    NULLIF(TRIM(COALESCE(p_data->>'license_number', '')), ''),
    CASE WHEN p_data->>'license_issued_at' IS NOT NULL AND p_data->>'license_issued_at' != ''
         THEN (p_data->>'license_issued_at')::DATE ELSE NULL END,
    NULLIF(TRIM(COALESCE(p_data->>'license_authority', '')), ''),
    true, true, true, now(), now()
  )
  ON CONFLICT (candidate_id) DO UPDATE SET
    status = 'submitted',
    birth_date = EXCLUDED.birth_date,
    street = EXCLUDED.street,
    house_number = EXCLUDED.house_number,
    postal_code = EXCLUDED.postal_code,
    city = EXCLUDED.city,
    country = EXCLUDED.country,
    phone_confirmed = EXCLUDED.phone_confirmed,
    email_confirmed = EXCLUDED.email_confirmed,
    employment_type = EXCLUDED.employment_type,
    has_other_employment = EXCLUDED.has_other_employment,
    other_employment_note = EXCLUDED.other_employment_note,
    tax_id = EXCLUDED.tax_id,
    social_security_number = EXCLUDED.social_security_number,
    health_insurance = EXCLUDED.health_insurance,
    iban = EXCLUDED.iban,
    account_holder = EXCLUDED.account_holder,
    has_license = EXCLUDED.has_license,
    license_classes = EXCLUDED.license_classes,
    license_number = EXCLUDED.license_number,
    license_issued_at = EXCLUDED.license_issued_at,
    license_authority = EXCLUDED.license_authority,
    privacy_accepted = true,
    data_accuracy_confirmed = true,
    onboarding_terms_accepted = true,
    submitted_at = now(),
    updated_at = now()
  RETURNING id INTO v_questionnaire_id;

  -- Kandidatenstatus aktualisieren
  UPDATE onboarding_candidates
  SET status = CASE
    WHEN status IN ('neu', 'kontakt_aufgenommen', 'termin_angeboten', 'termin_geplant',
                    'gespraech_gefuehrt', 'geeignet', 'personalfragebogen_gesendet')
    THEN 'personalfragebogen_erhalten'::onboarding_status
    ELSE status
  END, updated_at = now()
  WHERE id = v_link.candidate_id;

  -- Notiz erstellen
  INSERT INTO onboarding_notes (candidate_id, content, created_by_name, created_at)
  VALUES (v_link.candidate_id, 'Personalfragebogen wurde vom Bewerber über den Bewerberlink eingereicht.', 'System (Bewerberlink)', now());

  RETURN json_build_object('success', true, 'questionnaire_id', v_questionnaire_id);
END;
$$;

GRANT EXECUTE ON FUNCTION submit_questionnaire(TEXT, JSON) TO anon;
GRANT EXECUTE ON FUNCTION submit_questionnaire(TEXT, JSON) TO authenticated;

-- ============================================================
-- GRANT PERMISSIONS
-- ============================================================

GRANT ALL ON onboarding_questionnaires TO authenticated;
