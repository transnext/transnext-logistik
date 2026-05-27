-- ============================================================
-- TransNext Phase 1 - Smart & Care
-- DISPONENTEN STATUS RPCs
-- Stand: 2026-05-08
-- Zweck: Sichere RPCs für Disponenten-Statusänderungen
-- ============================================================
--
-- Diese Migration erweitert Phase 1 um sichere RPCs für Disponenten.
-- Die Haupt-Migration (20260508_phase1_smart_care_COMPLETE_FINAL.sql)
-- wird NICHT geändert.
--
-- Regeln:
--   - Disponenten können operative Prüfstatus ändern (pending/approved/rejected)
--   - Keine Finanzfelder änderbar
--   - Keine Abrechnungsfelder änderbar
--   - Locking wird respektiert (locked_at IS NOT NULL → Fehler)
--   - Fahrer haben keinen Zugriff
-- ============================================================

BEGIN;

-- ============================================================
-- 1. RPC: update_arbeitsnachweis_status
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_arbeitsnachweis_status(
  p_id BIGINT,
  p_status VARCHAR
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_locked_at TIMESTAMPTZ;
  v_audit_action VARCHAR;
BEGIN
  -- Rollenprüfung: Nur Admin/GF oder Disponent
  IF NOT (public.is_admin() OR public.is_disponent()) THEN
    RAISE EXCEPTION 'Keine Berechtigung. Nur Admin, Geschäftsführer oder Disponent dürfen Status ändern.';
  END IF;

  -- Statusvalidierung
  IF p_status NOT IN ('pending', 'approved', 'rejected') THEN
    RAISE EXCEPTION 'Ungültiger Status. Erlaubt: pending, approved, rejected.';
  END IF;

  -- Prüfe ob Record gesperrt ist
  SELECT locked_at INTO v_current_locked_at
  FROM public.arbeitsnachweise
  WHERE id = p_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Arbeitsnachweis mit ID % nicht gefunden.', p_id;
  END IF;

  IF v_current_locked_at IS NOT NULL THEN
    RAISE EXCEPTION 'Arbeitsnachweis ist gesperrt (locked_at: %). Status kann nicht geändert werden.', v_current_locked_at;
  END IF;

  -- Status aktualisieren (NUR status und updated_at, keine Finanzfelder!)
  UPDATE public.arbeitsnachweise
  SET
    status = p_status,
    updated_at = NOW()
  WHERE id = p_id;

  -- Audit-Action bestimmen
  IF p_status = 'approved' THEN
    v_audit_action := 'tour_approved';
  ELSIF p_status = 'rejected' THEN
    v_audit_action := 'tour_rejected';
  ELSE
    v_audit_action := 'tour_status_updated';
  END IF;

  -- Audit-Log schreiben (falls Tabelle existiert)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'audit_log') THEN
    INSERT INTO public.audit_log (
      action,
      entity_type,
      entity_id,
      user_id,
      details,
      created_at
    ) VALUES (
      v_audit_action,
      'arbeitsnachweis',
      p_id::TEXT,
      auth.uid(),
      jsonb_build_object('new_status', p_status),
      NOW()
    );
  END IF;
END;
$$;

COMMENT ON FUNCTION public.update_arbeitsnachweis_status(BIGINT, VARCHAR) IS
'Ändert den operativen Prüfstatus einer Tour. Nur Admin/GF/Disponent. Keine Finanzfelder.';

-- ============================================================
-- 2. RPC: approve_arbeitsnachweis
-- ============================================================

CREATE OR REPLACE FUNCTION public.approve_arbeitsnachweis(
  p_id BIGINT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.update_arbeitsnachweis_status(p_id, 'approved');
END;
$$;

COMMENT ON FUNCTION public.approve_arbeitsnachweis(BIGINT) IS
'Genehmigt eine Tour (Wrapper für update_arbeitsnachweis_status).';

-- ============================================================
-- 3. RPC: reject_arbeitsnachweis
-- ============================================================

CREATE OR REPLACE FUNCTION public.reject_arbeitsnachweis(
  p_id BIGINT,
  p_reason TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_locked_at TIMESTAMPTZ;
BEGIN
  -- Rollenprüfung: Nur Admin/GF oder Disponent
  IF NOT (public.is_admin() OR public.is_disponent()) THEN
    RAISE EXCEPTION 'Keine Berechtigung. Nur Admin, Geschäftsführer oder Disponent dürfen ablehnen.';
  END IF;

  -- Reason ist Pflicht
  IF p_reason IS NULL OR btrim(p_reason) = '' THEN
    RAISE EXCEPTION 'Begründung (p_reason) ist erforderlich.';
  END IF;

  -- Prüfe ob Record gesperrt ist
  SELECT locked_at INTO v_current_locked_at
  FROM public.arbeitsnachweise
  WHERE id = p_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Arbeitsnachweis mit ID % nicht gefunden.', p_id;
  END IF;

  IF v_current_locked_at IS NOT NULL THEN
    RAISE EXCEPTION 'Arbeitsnachweis ist gesperrt. Status kann nicht geändert werden.';
  END IF;

  -- Status und Begründung setzen
  UPDATE public.arbeitsnachweise
  SET
    status = 'rejected',
    correction_reason = p_reason,
    updated_at = NOW()
  WHERE id = p_id;

  -- Audit-Log schreiben (falls Tabelle existiert)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'audit_log') THEN
    INSERT INTO public.audit_log (
      action,
      entity_type,
      entity_id,
      user_id,
      details,
      created_at
    ) VALUES (
      'tour_rejected',
      'arbeitsnachweis',
      p_id::TEXT,
      auth.uid(),
      jsonb_build_object('reason', p_reason),
      NOW()
    );
  END IF;
END;
$$;

COMMENT ON FUNCTION public.reject_arbeitsnachweis(BIGINT, TEXT) IS
'Lehnt eine Tour ab mit Begründung. Nur Admin/GF/Disponent.';

-- ============================================================
-- 4. RPC: update_auslagennachweis_status
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_auslagennachweis_status(
  p_id BIGINT,
  p_status VARCHAR
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_locked_at TIMESTAMPTZ;
  v_driver_reimbursement_status VARCHAR;
  v_audit_action VARCHAR;
BEGIN
  -- Rollenprüfung: Nur Admin/GF oder Disponent
  IF NOT (public.is_admin() OR public.is_disponent()) THEN
    RAISE EXCEPTION 'Keine Berechtigung. Nur Admin, Geschäftsführer oder Disponent dürfen Status ändern.';
  END IF;

  -- Statusvalidierung
  IF p_status NOT IN ('pending', 'approved', 'rejected') THEN
    RAISE EXCEPTION 'Ungültiger Status. Erlaubt: pending, approved, rejected.';
  END IF;

  -- Prüfe ob Record gesperrt ist
  SELECT locked_at INTO v_current_locked_at
  FROM public.auslagennachweise
  WHERE id = p_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Auslagennachweis mit ID % nicht gefunden.', p_id;
  END IF;

  IF v_current_locked_at IS NOT NULL THEN
    RAISE EXCEPTION 'Auslagennachweis ist gesperrt. Status kann nicht geändert werden.';
  END IF;

  -- Mapping zu driver_reimbursement_status
  v_driver_reimbursement_status := CASE p_status
    WHEN 'approved' THEN 'bestaetigt'
    WHEN 'rejected' THEN 'abgelehnt'
    WHEN 'pending' THEN 'eingereicht'
    ELSE 'eingereicht'
  END;

  -- Status aktualisieren (NUR status und driver_reimbursement_status, KEINE customer_billing_status!)
  IF p_status = 'approved' THEN
    UPDATE public.auslagennachweise
    SET
      status = p_status,
      driver_reimbursement_status = v_driver_reimbursement_status,
      approved_by = auth.uid(),
      approved_at = NOW(),
      updated_at = NOW()
    WHERE id = p_id;
    v_audit_action := 'expense_approved';
  ELSIF p_status = 'rejected' THEN
    UPDATE public.auslagennachweise
    SET
      status = p_status,
      driver_reimbursement_status = v_driver_reimbursement_status,
      rejected_by = auth.uid(),
      rejected_at = NOW(),
      updated_at = NOW()
    WHERE id = p_id;
    v_audit_action := 'expense_rejected';
  ELSE
    UPDATE public.auslagennachweise
    SET
      status = p_status,
      driver_reimbursement_status = v_driver_reimbursement_status,
      updated_at = NOW()
    WHERE id = p_id;
    v_audit_action := 'expense_status_updated';
  END IF;

  -- Audit-Log schreiben (falls Tabelle existiert)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'audit_log') THEN
    INSERT INTO public.audit_log (
      action,
      entity_type,
      entity_id,
      user_id,
      details,
      created_at
    ) VALUES (
      v_audit_action,
      'auslagennachweis',
      p_id::TEXT,
      auth.uid(),
      jsonb_build_object('new_status', p_status, 'driver_reimbursement_status', v_driver_reimbursement_status),
      NOW()
    );
  END IF;
END;
$$;

COMMENT ON FUNCTION public.update_auslagennachweis_status(BIGINT, VARCHAR) IS
'Ändert den operativen Prüfstatus einer Auslage. Nur Admin/GF/Disponent. Keine customer_billing_status.';

-- ============================================================
-- 5. RPC: approve_auslagennachweis
-- ============================================================

CREATE OR REPLACE FUNCTION public.approve_auslagennachweis(
  p_id BIGINT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.update_auslagennachweis_status(p_id, 'approved');
END;
$$;

COMMENT ON FUNCTION public.approve_auslagennachweis(BIGINT) IS
'Genehmigt eine Auslage (Wrapper für update_auslagennachweis_status).';

-- ============================================================
-- 6. RPC: reject_auslagennachweis
-- ============================================================

CREATE OR REPLACE FUNCTION public.reject_auslagennachweis(
  p_id BIGINT,
  p_reason TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_locked_at TIMESTAMPTZ;
BEGIN
  -- Rollenprüfung: Nur Admin/GF oder Disponent
  IF NOT (public.is_admin() OR public.is_disponent()) THEN
    RAISE EXCEPTION 'Keine Berechtigung. Nur Admin, Geschäftsführer oder Disponent dürfen ablehnen.';
  END IF;

  -- Reason ist Pflicht
  IF p_reason IS NULL OR btrim(p_reason) = '' THEN
    RAISE EXCEPTION 'Begründung (p_reason) ist erforderlich.';
  END IF;

  -- Prüfe ob Record gesperrt ist
  SELECT locked_at INTO v_current_locked_at
  FROM public.auslagennachweise
  WHERE id = p_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Auslagennachweis mit ID % nicht gefunden.', p_id;
  END IF;

  IF v_current_locked_at IS NOT NULL THEN
    RAISE EXCEPTION 'Auslagennachweis ist gesperrt. Status kann nicht geändert werden.';
  END IF;

  -- Status und Begründung setzen (KEINE customer_billing_status!)
  UPDATE public.auslagennachweise
  SET
    status = 'rejected',
    driver_reimbursement_status = 'abgelehnt',
    rejected_by = auth.uid(),
    rejected_at = NOW(),
    rejection_reason = p_reason,
    updated_at = NOW()
  WHERE id = p_id;

  -- Audit-Log schreiben (falls Tabelle existiert)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'audit_log') THEN
    INSERT INTO public.audit_log (
      action,
      entity_type,
      entity_id,
      user_id,
      details,
      created_at
    ) VALUES (
      'expense_rejected',
      'auslagennachweis',
      p_id::TEXT,
      auth.uid(),
      jsonb_build_object('reason', p_reason),
      NOW()
    );
  END IF;
END;
$$;

COMMENT ON FUNCTION public.reject_auslagennachweis(BIGINT, TEXT) IS
'Lehnt eine Auslage ab mit Begründung. Nur Admin/GF/Disponent.';

-- ============================================================
-- 7. GRANTS
-- ============================================================

GRANT EXECUTE ON FUNCTION public.update_arbeitsnachweis_status(BIGINT, VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_arbeitsnachweis(BIGINT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_arbeitsnachweis(BIGINT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_auslagennachweis_status(BIGINT, VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_auslagennachweis(BIGINT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_auslagennachweis(BIGINT, TEXT) TO authenticated;

-- ============================================================
-- 8. SAFETY COMMENTS
-- ============================================================

COMMENT ON FUNCTION public.update_arbeitsnachweis_status IS
'SICHERHEIT: Rollenprüfung via is_admin()/is_disponent(). Fahrer haben keinen Zugriff. Finanzfelder bleiben unberührt.';

COMMENT ON FUNCTION public.update_auslagennachweis_status IS
'SICHERHEIT: Rollenprüfung via is_admin()/is_disponent(). Fahrer haben keinen Zugriff. customer_billing_status bleibt unberührt.';

COMMIT;
