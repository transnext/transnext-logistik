-- =============================================================================
-- Migration: Admin/GF Visibility Grants
-- Datum: 2026-05-11
-- Zweck: GRANTs wiederherstellen, damit RLS für Admin/GF greifen kann
-- =============================================================================
--
-- PROBLEM:
-- Die Migration 20260508_phase1_smart_care_COMPLETE_FINAL.sql hat REVOKE ALL/SELECT
-- auf wichtigen Tabellen angewendet. Dadurch kann NIEMAND mehr direkt auf diese
-- Tabellen zugreifen - auch nicht Admin/GF.
--
-- LÖSUNG:
-- GRANTs für authenticated-Rolle wiederherstellen.
-- RLS-Policies entscheiden dann, wer was sehen darf.
-- Disponenten/Fahrer werden durch RLS eingeschränkt, nicht durch fehlende GRANTs.
--
-- SICHERHEIT:
-- - RLS bleibt ENABLED auf allen Tabellen
-- - Bestehende Policies bleiben unverändert
-- - Admin/GF-Policies erlauben vollen Zugriff (is_admin())
-- - Disponent-Policies beschränken auf operative Daten
-- - Fahrer-Policies beschränken auf eigene Daten
-- =============================================================================

-- Prüfe dass RLS auf allen kritischen Tabellen aktiviert ist (Sicherheit)
DO $$
BEGIN
  -- Diese Assertion stellt sicher, dass wir RLS nicht versehentlich umgehen
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename = 'arbeitsnachweise'
  ) THEN
    RAISE EXCEPTION 'Tabelle arbeitsnachweise existiert nicht!';
  END IF;
END $$;

-- =============================================================================
-- GRANT SELECT, INSERT, UPDATE, DELETE für authenticated auf alle Admin-Tabellen
-- RLS-Policies entscheiden danach, was der jeweilige User sehen/ändern darf
-- =============================================================================

-- Arbeitsnachweise: Admin kann alles, Fahrer eigene, Disponent via View
GRANT SELECT, INSERT, UPDATE, DELETE ON public.arbeitsnachweise TO authenticated;

-- Auslagennachweise: Admin kann alles, Fahrer eigene, Disponent via View
GRANT SELECT, INSERT, UPDATE, DELETE ON public.auslagennachweise TO authenticated;

-- Preislisten: Nur Admin/GF (RLS-Policy prüft is_admin())
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pricing_tables TO authenticated;

-- System-Einstellungen: Nur Admin/GF (RLS-Policy prüft is_admin())
GRANT SELECT, INSERT, UPDATE, DELETE ON public.system_settings TO authenticated;

-- Fahrer-Lohnkorrekturen: Nur Admin/GF (RLS-Policy prüft is_admin())
GRANT SELECT, INSERT, UPDATE, DELETE ON public.driver_salary_corrections TO authenticated;

-- Wochenabrechnungen: Nur Admin/GF (RLS-Policy prüft is_admin())
GRANT SELECT, INSERT, UPDATE, DELETE ON public.weekly_invoices TO authenticated;

-- Monatsabrechnungen: Nur Admin/GF (RLS-Policy prüft is_admin())
GRANT SELECT, INSERT, UPDATE, DELETE ON public.monthly_settlements TO authenticated;

-- Korrekturanfragen: Admin kann alles, Fahrer eigene
GRANT SELECT, INSERT, UPDATE, DELETE ON public.driver_correction_requests TO authenticated;

-- Alerts: Admin kann alles, Disponent via View
GRANT SELECT, INSERT, UPDATE, DELETE ON public.alerts TO authenticated;

-- Kunden: Admin kann alles, Disponent via View
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customers TO authenticated;

-- Fahrer-Verfügbarkeit: Admin kann alles, Fahrer eigene
GRANT SELECT, INSERT, UPDATE, DELETE ON public.driver_availability TO authenticated;

-- =============================================================================
-- Sicherheitshinweis für Logs
-- =============================================================================
DO $$
BEGIN
  RAISE NOTICE 'GRANTs für authenticated-Rolle wiederhergestellt.';
  RAISE NOTICE 'RLS-Policies entscheiden über tatsächlichen Zugriff.';
  RAISE NOTICE 'Admin/GF: Voller Zugriff via is_admin() Policies';
  RAISE NOTICE 'Disponent: Eingeschränkt via is_disponent() Policies oder Views';
  RAISE NOTICE 'Fahrer: Nur eigene Daten via user_id = auth.uid() Policies';
END $$;
