-- ============================================================
-- Onboarding Phase 3c: Dokumenten-Self-Upload für Bewerber
-- Created: 2026-05-28
-- Description: Bewerber können über ihren Onboarding-Link Dokumente hochladen
-- ============================================================

-- ============================================================
-- NEUE SPALTEN FÜR ONBOARDING_DOCUMENTS
-- ============================================================

-- Flag: Wurde vom Bewerber hochgeladen?
ALTER TABLE onboarding_documents
ADD COLUMN IF NOT EXISTS uploaded_by_applicant BOOLEAN DEFAULT false;

-- Wann wurde das Dokument hochgeladen?
ALTER TABLE onboarding_documents
ADD COLUMN IF NOT EXISTS uploaded_at TIMESTAMPTZ;

-- Ablehnungsgrund (für Bewerber sichtbar)
ALTER TABLE onboarding_documents
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- ============================================================
-- FUNCTION: Dokumente für Bewerber abrufen (via Token)
-- Nur eigene Dokumente, keine Admin-Kommentare
-- ============================================================

CREATE OR REPLACE FUNCTION get_applicant_documents_by_token(p_token TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_link RECORD;
  v_candidate RECORD;
  v_documents JSON;
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

  -- Dokumente abrufen (nur für Bewerber relevante Felder)
  SELECT json_agg(
    json_build_object(
      'id', d.id,
      'document_type', d.document_type,
      'status', d.status,
      'file_name', d.file_name,
      'uploaded_at', d.uploaded_at,
      'uploaded_by_applicant', d.uploaded_by_applicant,
      'rejection_reason', CASE
        WHEN d.status = 'abgelehnt' THEN d.rejection_reason
        ELSE NULL
      END
    )
    ORDER BY d.created_at
  )
  INTO v_documents
  FROM onboarding_documents d
  WHERE d.candidate_id = v_link.candidate_id;

  RETURN json_build_object(
    'success', true,
    'candidate_type', v_candidate.type,
    'documents', COALESCE(v_documents, '[]'::json)
  );
END;
$$;

-- Funktion für anon freigeben
GRANT EXECUTE ON FUNCTION get_applicant_documents_by_token(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION get_applicant_documents_by_token(TEXT) TO authenticated;

-- ============================================================
-- FUNCTION: Dokument vom Bewerber registrieren (nach Server-Upload)
-- Wird von der API-Route aufgerufen (mit service_role)
-- ============================================================

CREATE OR REPLACE FUNCTION register_applicant_document_upload(
  p_token TEXT,
  p_document_type TEXT,
  p_file_path TEXT,
  p_file_name TEXT,
  p_file_size INTEGER
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_link RECORD;
  v_candidate RECORD;
  v_document RECORD;
  v_document_id UUID;
  v_doc_type onboarding_document_type;
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

  -- Dokumenttyp validieren und casten
  BEGIN
    v_doc_type := p_document_type::onboarding_document_type;
  EXCEPTION WHEN invalid_text_representation THEN
    RETURN json_build_object('success', false, 'error', 'invalid_document_type');
  END;

  -- Prüfen ob Dokument dieses Typs bereits existiert
  SELECT * INTO v_document
  FROM onboarding_documents
  WHERE candidate_id = v_link.candidate_id
    AND document_type = v_doc_type
  LIMIT 1;

  IF v_document IS NOT NULL THEN
    -- Update bestehendes Dokument
    UPDATE onboarding_documents
    SET
      file_path = p_file_path,
      file_name = p_file_name,
      file_size = p_file_size,
      status = 'erhalten',
      uploaded_by_applicant = true,
      uploaded_at = now(),
      rejection_reason = NULL,
      updated_at = now()
    WHERE id = v_document.id;

    v_document_id := v_document.id;
  ELSE
    -- Neues Dokument erstellen
    INSERT INTO onboarding_documents (
      candidate_id,
      document_type,
      status,
      file_path,
      file_name,
      file_size,
      uploaded_by_applicant,
      uploaded_at
    )
    VALUES (
      v_link.candidate_id,
      v_doc_type,
      'erhalten',
      p_file_path,
      p_file_name,
      p_file_size,
      true,
      now()
    )
    RETURNING id INTO v_document_id;
  END IF;

  -- Notiz erstellen
  INSERT INTO onboarding_notes (candidate_id, content, created_by_name, created_at)
  VALUES (
    v_link.candidate_id,
    'Bewerber hat Dokument hochgeladen: ' || p_document_type || ' (' || p_file_name || ')',
    'System (Bewerberlink)',
    now()
  );

  RETURN json_build_object(
    'success', true,
    'document_id', v_document_id
  );
END;
$$;

-- Diese Funktion wird nur von der API-Route mit service_role aufgerufen
-- Daher kein GRANT für anon

-- ============================================================
-- STORAGE POLICY: Service Role kann Bewerber-Uploads durchführen
-- (wird über API-Route mit SUPABASE_SERVICE_ROLE_KEY genutzt)
-- ============================================================

-- Hinweis: Storage-Uploads mit service_role Key umgehen RLS automatisch.
-- Wir brauchen daher keine zusätzliche Policy für die API-Route.
-- Die bestehenden Admin/GF-Policies bleiben für den normalen Zugriff.

-- ============================================================
-- GRANT PERMISSIONS
-- ============================================================

-- Die Tabelle hat bereits GRANT ALL für authenticated.
-- Wir fügen ein GRANT für SELECT auf spezifische Felder für anon hinzu
-- (wird über die RPC-Funktion kontrolliert, nicht direkt)

-- ============================================================
-- INDEX FÜR PERFORMANCE
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_onboarding_documents_uploaded_by_applicant
  ON onboarding_documents(uploaded_by_applicant)
  WHERE uploaded_by_applicant = true;
