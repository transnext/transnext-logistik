-- ============================================================
-- Migration: Nicholas Mandzel Account-Konsolidierung
-- ============================================================
-- Problem: Nicholas hat zwei Accounts:
--   - Admin: n.mandzel@transnext.de (9783a8cf-24a1-4551-a909-23efad1eea5c)
--   - Fahrer: mandzelnicholas@gmail.com (b23391e7-a84d-4c6d-8055-6b51e98c4f64)
--
-- Der Fahrer-Eintrag und Arbeitsnachweise sind mit dem Fahrer-Account verknüpft,
-- aber Nicholas nutzt primär den Admin-Account.
--
-- Diese Migration konsolidiert alle Daten auf den Admin-Account.
-- ============================================================
DO $$
DECLARE
  v_admin_uid UUID := '9783a8cf-24a1-4551-a909-23efad1eea5c';
  v_fahrer_uid UUID := 'b23391e7-a84d-4c6d-8055-6b51e98c4f64';
  v_fahrer_id UUID := '2a657006-a09e-44b6-b673-a50a6d81ab3f';
  v_arbeitsnachweise_count INT;
  v_auslagen_count INT;
BEGIN
  -- 1. Prüfe, ob beide Accounts existieren
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = v_admin_uid) THEN
    RAISE EXCEPTION 'Admin-Account nicht gefunden: %', v_admin_uid;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = v_fahrer_uid) THEN
    RAISE NOTICE 'Fahrer-Account nicht gefunden, Migration wird übersprungen';
    RETURN;
  END IF;
  -- 2. Fahrer-Eintrag auf Admin-Account umverknüpfen
  UPDATE fahrer
  SET user_id = v_admin_uid
  WHERE id = v_fahrer_id
    AND user_id = v_fahrer_uid;
  RAISE NOTICE '[Migration] Fahrer-Eintrag % umverknüpft auf Admin-Account', v_fahrer_id;
  -- 3. Arbeitsnachweise auf Admin-Account umschreiben
  UPDATE arbeitsnachweise
  SET user_id = v_admin_uid
  WHERE user_id = v_fahrer_uid;
  GET DIAGNOSTICS v_arbeitsnachweise_count = ROW_COUNT;
  RAISE NOTICE '[Migration] % Arbeitsnachweise auf Admin-Account migriert', v_arbeitsnachweise_count;
  -- 4. Auslagennachweise auf Admin-Account umschreiben
  UPDATE auslagennachweise
  SET user_id = v_admin_uid
  WHERE user_id = v_fahrer_uid;
  GET DIAGNOSTICS v_auslagen_count = ROW_COUNT;
  RAISE NOTICE '[Migration] % Auslagennachweise auf Admin-Account migriert', v_auslagen_count;
  -- 5. Verfügbarkeiten auf Admin-Account umschreiben (falls vorhanden)
  UPDATE availability
  SET user_id = v_admin_uid
  WHERE user_id = v_fahrer_uid;
  -- 6. Fahrer-Account Profil aktualisieren (optional: als sekundär markieren)
  -- Wir deaktivieren den alten Fahrer-Account nicht, aber entfernen owner_operator
  UPDATE profiles
  SET compensation_model = 'tour_based_minijob'
  WHERE id = v_fahrer_uid
    AND compensation_model = 'owner_operator';
  -- 7. Admin-Account hat bereits owner_operator? Falls nicht, setzen
  UPDATE profiles
  SET compensation_model = 'owner_operator'
  WHERE id = v_admin_uid
    AND (compensation_model IS NULL OR compensation_model != 'owner_operator');
  RAISE NOTICE '[Migration] Nicholas Mandzel Account-Konsolidierung abgeschlossen';
  RAISE NOTICE '[Migration] Admin-Account: n.mandzel@transnext.de (owner_operator)';
  RAISE NOTICE '[Migration] Fahrer-Account: mandzelnicholas@gmail.com (kann deaktiviert werden)';
END $$;
-- Protokollierung
SELECT
  'nicholas_consolidation' as migration,
  (SELECT COUNT(*) FROM arbeitsnachweise WHERE user_id = '9783a8cf-24a1-4551-a909-23efad1eea5c') as arbeitsnachweise_admin,
  (SELECT COUNT(*) FROM arbeitsnachweise WHERE user_id = 'b23391e7-a84d-4c6d-8055-6b51e98c4f64') as arbeitsnachweise_fahrer,
  (SELECT user_id FROM fahrer WHERE id = '2a657006-a09e-44b6-b673-a50a6d81ab3f') as fahrer_user_id;
