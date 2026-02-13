-- =====================================================
-- TRANSNEXT LOGISTIK - Fix tour_protocols Foreign Key
-- Migration: 20260213_fix_tour_protocols_fk.sql
-- =====================================================
-- Problem: FK zeigte auf alte Tabelle 'touren' statt 'tours'
-- Fehler: 23503 "Key is not present in table 'touren'"
-- =====================================================

-- 1. Falschen FK entfernen (zeigt auf 'touren')
ALTER TABLE tour_protocols
DROP CONSTRAINT IF EXISTS tour_protocols_tour_id_fkey;

-- 2. Korrekten FK erstellen (zeigt auf 'tours')
-- ON DELETE CASCADE: Wenn Tour gelöscht wird, werden alle zugehörigen
-- Protokolle ebenfalls gelöscht (sinnvoll für Datenkonsistenz)
ALTER TABLE tour_protocols
ADD CONSTRAINT tour_protocols_tour_id_fkey
    FOREIGN KEY (tour_id)
    REFERENCES tours(id)
    ON DELETE CASCADE;

-- =====================================================
-- PRÜFUNG: Alle FKs sollten auf 'tours' zeigen
-- =====================================================
-- Diese Tabellen haben FKs die auf tours.id zeigen:
-- - tour_protocols.tour_id -> tours.id CASCADE
-- - tour_photos.tour_id -> tours.id CASCADE
-- - tour_damages.tour_id -> tours.id CASCADE
-- - tour_signatures.tour_id -> tours.id CASCADE
-- - pdf_exports.tour_id -> tours.id CASCADE

-- =====================================================
-- OPTIONAL: Alte 'touren' Tabelle entfernen
-- (Nur ausführen wenn sicher dass keine Daten benötigt werden)
-- =====================================================
-- DROP TABLE IF EXISTS touren CASCADE;

-- =====================================================
-- ZUSAMMENFASSUNG
-- =====================================================
-- - FK tour_protocols_tour_id_fkey korrigiert
-- - Zeigt jetzt auf tours.id statt touren.id
-- - ON DELETE CASCADE für Datenkonsistenz
-- =====================================================
