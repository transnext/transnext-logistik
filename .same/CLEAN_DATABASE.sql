-- =====================================================
-- CLEAN DATABASE - Alle Test-Daten löschen
-- =====================================================
-- Dieses Script löscht alle Touren und Auslagen
-- WICHTIG: Fahrer-Daten bleiben erhalten!
-- =====================================================

-- Schritt 1: Alle Arbeitsnachweise (Touren) löschen
DELETE FROM arbeitsnachweise;

-- Schritt 2: Alle Auslagennachweise löschen
DELETE FROM auslagennachweise;

-- Schritt 3: Sequences zurücksetzen (Optional - für saubere IDs)
ALTER SEQUENCE arbeitsnachweise_id_seq RESTART WITH 1;
ALTER SEQUENCE auslagennachweise_id_seq RESTART WITH 1;

-- =====================================================
-- FERTIG!
-- =====================================================
-- Die Datenbank ist jetzt sauber.
-- Alle Test-Touren und Auslagen wurden gelöscht.
-- Fahrer-Accounts bleiben bestehen.
-- =====================================================
