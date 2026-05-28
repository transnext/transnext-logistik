-- ============================================================
-- Onboarding Phase 3d: Stabilitäts- und Korrektur-Migration
-- Created: 2026-05-28
-- Description:
--   - Neue Pflichtfelder für Personalfragebogen
--   - Führerscheinklassen als Text-Array
--   - RPC-Fixes für Link-Status und Upload
--   - Pflichtfeld-Validierung serverseitig
-- ============================================================

-- ============================================================
-- NEUE SPALTEN FÜR ONBOARDING_QUESTIONNAIRES
-- ============================================================

-- Persönliche Daten: Geburtsname (falls abweichend)
ALTER TABLE onboarding_questionnaires
ADD COLUMN IF NOT EXISTS birth_name TEXT;

-- Persönliche Daten: Staatsangehörigkeit
ALTER TABLE onboarding_questionnaires
ADD COLUMN IF NOT EXISTS nationality TEXT DEFAULT 'deutsch';

-- Persönliche Daten: Geburtsort
ALTER TABLE onboarding_questionnaires
ADD COLUMN IF NOT EXISTS birth_place TEXT;

-- Persönliche Daten: Geburtsland
ALTER TABLE onboarding_questionnaires
ADD COLUMN IF NOT EXISTS birth_country TEXT DEFAULT 'Deutschland';

-- Persönliche Daten: Familienstand
ALTER TABLE onboarding_questionnaires
ADD COLUMN IF NOT EXISTS marital_status TEXT;

-- Persönliche Daten: Anzahl Kinder
ALTER TABLE onboarding_questionnaires
ADD COLUMN IF NOT EXISTS children_count INTEGER;

-- Steuer/Sozial: Steuerklasse
ALTER TABLE onboarding_questionnaires
ADD COLUMN IF NOT EXISTS tax_class TEXT;

-- Steuer/Sozial: Konfession
ALTER TABLE onboarding_questionnaires
ADD COLUMN IF NOT EXISTS denomination TEXT;

-- Führerschein: Klassen als JSONB-Array für Checkboxen
ALTER TABLE onboarding_questionnaires
ADD COLUMN IF NOT EXISTS license_classes_array JSONB DEFAULT '[]'::jsonb;

-- ============================================================
-- KOMMENTAR-SPALTE FÜR FÜHRERSCHEINKLASSEN
-- ============================================================

COMMENT ON COLUMN onboarding_questionnaires.license_classes IS 'Legacy: Text-Feld für Führerscheinklassen';
COMMENT ON COLUMN onboarding_questionnaires.license_classes_array IS 'Neue Struktur: JSONB-Array mit Führerscheinklassen als Strings, z.B. ["B", "BE", "C1"]';

-- ============================================================
-- FIX: get_candidate_by_public_token - ID auch bei used Link zurückgeben
-- Damit Dokumenten-Upload nach Terminwahl funktioniert
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

  -- Link bereits verwendet (Termin gewählt) - ABER Link bleibt nutzbar für Fragebogen/Uploads!
  -- FIX: Gebe trotzdem die ID zurück, damit Dokumenten-Upload funktioniert
  IF v_link.status = 'used' THEN
    RETURN json_build_object(
      'success', true,
      'already_used', true,
      'link_id', v_link.id,
      'expires_at', v_link.expires_at,
      'candidate', json_build_object(
        'id', v_candidate.id,  -- WICHTIG: ID für Dokument-Upload
        'first_name', v_candidate.first_name,
        'last_name', v_candidate.last_name,
        'email', v_candidate.email,
        'phone', v_candidate.phone,
        'city', v_candidate.city,
        'termin_gewaehlt', v_candidate.termin_gewaehlt,
        'termin_slot_1', v_candidate.termin_slot_1,
        'termin_slot_2', v_candidate.termin_slot_2,
        'termin_slot_3', v_candidate.termin_slot_3,
        'appointment_selected_at', v_candidate.appointment_selected_at
      )
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

-- ============================================================
-- FIX: get_questionnaire_by_token - Status reviewed auch prüfen
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

  -- FIX: Auch status = 'reviewed' blockiert erneutes Bearbeiten
  IF v_questionnaire IS NOT NULL AND v_questionnaire.status IN ('submitted', 'reviewed') THEN
    RETURN json_build_object(
      'success', true,
      'already_submitted', true,
      'submitted_at', v_questionnaire.submitted_at,
      'questionnaire_status', v_questionnaire.status,
      'candidate', json_build_object(
        'id', v_candidate.id,
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
        'birth_name', v_questionnaire.birth_name,
        'nationality', v_questionnaire.nationality,
        'birth_place', v_questionnaire.birth_place,
        'birth_country', v_questionnaire.birth_country,
        'marital_status', v_questionnaire.marital_status,
        'children_count', v_questionnaire.children_count,
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
        'tax_class', v_questionnaire.tax_class,
        'denomination', v_questionnaire.denomination,
        'social_security_number', v_questionnaire.social_security_number,
        'health_insurance', v_questionnaire.health_insurance,
        'iban', v_questionnaire.iban,
        'account_holder', v_questionnaire.account_holder,
        'has_license', v_questionnaire.has_license,
        'license_classes', v_questionnaire.license_classes,
        'license_classes_array', v_questionnaire.license_classes_array,
        'license_number', v_questionnaire.license_number,
        'license_issued_at', v_questionnaire.license_issued_at,
        'license_authority', v_questionnaire.license_authority
      )
      ELSE NULL
    END
  );
END;
$$;

-- ============================================================
-- FIX: submit_questionnaire - Neue Felder + Pflichtfeldprüfung
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
  v_license_classes_array JSONB;
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

  -- FIX: Auch status = 'reviewed' blockiert erneutes Einreichen
  IF EXISTS (SELECT 1 FROM onboarding_questionnaires WHERE candidate_id = v_link.candidate_id AND status IN ('submitted', 'reviewed')) THEN
    RETURN json_build_object('success', false, 'error', 'already_submitted');
  END IF;

  -- Einwilligungen prüfen
  IF NOT COALESCE((p_data->>'privacy_accepted')::BOOLEAN, false) OR
     NOT COALESCE((p_data->>'data_accuracy_confirmed')::BOOLEAN, false) OR
     NOT COALESCE((p_data->>'onboarding_terms_accepted')::BOOLEAN, false) THEN
    RETURN json_build_object('success', false, 'error', 'consent_required');
  END IF;

  -- ============================================================
  -- PFLICHTFELDER PRÜFEN
  -- ============================================================

  -- Steuer-ID (Pflicht)
  IF NULLIF(TRIM(COALESCE(p_data->>'tax_id', '')), '') IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'tax_id_required', 'message', 'Steuer-ID ist ein Pflichtfeld.');
  END IF;

  -- Sozialversicherungsnummer (Pflicht)
  IF NULLIF(TRIM(COALESCE(p_data->>'social_security_number', '')), '') IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'social_security_number_required', 'message', 'Sozialversicherungsnummer ist ein Pflichtfeld.');
  END IF;

  -- Krankenkasse (Pflicht)
  IF NULLIF(TRIM(COALESCE(p_data->>'health_insurance', '')), '') IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'health_insurance_required', 'message', 'Krankenkasse ist ein Pflichtfeld.');
  END IF;

  -- IBAN (Pflicht)
  IF NULLIF(TRIM(COALESCE(p_data->>'iban', '')), '') IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'iban_required', 'message', 'IBAN ist ein Pflichtfeld.');
  END IF;

  -- Kontoinhaber (Pflicht)
  IF NULLIF(TRIM(COALESCE(p_data->>'account_holder', '')), '') IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'account_holder_required', 'message', 'Kontoinhaber ist ein Pflichtfeld.');
  END IF;

  -- Führerschein vorhanden (Pflicht)
  IF (p_data->>'has_license') IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'has_license_required', 'message', 'Führerschein vorhanden ist ein Pflichtfeld.');
  END IF;

  -- Führerscheinnummer (Pflicht wenn Führerschein vorhanden)
  IF COALESCE((p_data->>'has_license')::BOOLEAN, false) = true THEN
    IF NULLIF(TRIM(COALESCE(p_data->>'license_number', '')), '') IS NULL THEN
      RETURN json_build_object('success', false, 'error', 'license_number_required', 'message', 'Führerscheinnummer ist ein Pflichtfeld.');
    END IF;
  END IF;

  -- Steuerklasse (Pflicht)
  IF NULLIF(TRIM(COALESCE(p_data->>'tax_class', '')), '') IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'tax_class_required', 'message', 'Steuerklasse ist ein Pflichtfeld.');
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

  -- Führerscheinklassen-Array validieren
  BEGIN
    v_license_classes_array := COALESCE((p_data->>'license_classes_array')::JSONB, '[]'::JSONB);
  EXCEPTION WHEN OTHERS THEN
    v_license_classes_array := '[]'::JSONB;
  END;

  -- Fragebogen speichern
  INSERT INTO onboarding_questionnaires (
    candidate_id, status, birth_date, birth_name, nationality, birth_place, birth_country,
    marital_status, children_count, street, house_number, postal_code, city, country,
    phone_confirmed, email_confirmed, employment_type, has_other_employment, other_employment_note,
    tax_id, tax_class, denomination, social_security_number, health_insurance, iban, account_holder,
    has_license, license_classes, license_classes_array, license_number, license_issued_at, license_authority,
    privacy_accepted, data_accuracy_confirmed, onboarding_terms_accepted, submitted_at, updated_at
  )
  VALUES (
    v_link.candidate_id, 'submitted', v_birth_date,
    NULLIF(TRIM(COALESCE(p_data->>'birth_name', '')), ''),
    COALESCE(NULLIF(TRIM(COALESCE(p_data->>'nationality', '')), ''), 'deutsch'),
    NULLIF(TRIM(COALESCE(p_data->>'birth_place', '')), ''),
    COALESCE(NULLIF(TRIM(COALESCE(p_data->>'birth_country', '')), ''), 'Deutschland'),
    NULLIF(TRIM(COALESCE(p_data->>'marital_status', '')), ''),
    CASE WHEN p_data->>'children_count' IS NOT NULL AND p_data->>'children_count' != ''
         THEN (p_data->>'children_count')::INTEGER ELSE NULL END,
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
    NULLIF(TRIM(COALESCE(p_data->>'tax_class', '')), ''),
    NULLIF(TRIM(COALESCE(p_data->>'denomination', '')), ''),
    NULLIF(TRIM(COALESCE(p_data->>'social_security_number', '')), ''),
    NULLIF(TRIM(COALESCE(p_data->>'health_insurance', '')), ''),
    v_iban,
    NULLIF(TRIM(COALESCE(p_data->>'account_holder', '')), ''),
    (p_data->>'has_license')::BOOLEAN,
    NULLIF(TRIM(COALESCE(p_data->>'license_classes', '')), ''),
    v_license_classes_array,
    NULLIF(TRIM(COALESCE(p_data->>'license_number', '')), ''),
    CASE WHEN p_data->>'license_issued_at' IS NOT NULL AND p_data->>'license_issued_at' != ''
         THEN (p_data->>'license_issued_at')::DATE ELSE NULL END,
    NULLIF(TRIM(COALESCE(p_data->>'license_authority', '')), ''),
    true, true, true, now(), now()
  )
  ON CONFLICT (candidate_id) DO UPDATE SET
    status = 'submitted',
    birth_date = EXCLUDED.birth_date,
    birth_name = EXCLUDED.birth_name,
    nationality = EXCLUDED.nationality,
    birth_place = EXCLUDED.birth_place,
    birth_country = EXCLUDED.birth_country,
    marital_status = EXCLUDED.marital_status,
    children_count = EXCLUDED.children_count,
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
    tax_class = EXCLUDED.tax_class,
    denomination = EXCLUDED.denomination,
    social_security_number = EXCLUDED.social_security_number,
    health_insurance = EXCLUDED.health_insurance,
    iban = EXCLUDED.iban,
    account_holder = EXCLUDED.account_holder,
    has_license = EXCLUDED.has_license,
    license_classes = EXCLUDED.license_classes,
    license_classes_array = EXCLUDED.license_classes_array,
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

-- ============================================================
-- GRANT PERMISSIONS
-- ============================================================

GRANT EXECUTE ON FUNCTION get_candidate_by_public_token(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION get_candidate_by_public_token(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_questionnaire_by_token(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION get_questionnaire_by_token(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION submit_questionnaire(TEXT, JSON) TO anon;
GRANT EXECUTE ON FUNCTION submit_questionnaire(TEXT, JSON) TO authenticated;
