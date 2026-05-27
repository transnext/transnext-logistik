-- Migration: Auftraggeber-Feld zu Arbeitsnachweisen hinzufügen
-- Datum: 2026-01-07

-- Füge auftraggeber Spalte hinzu (onlogist oder smartandcare)
ALTER TABLE arbeitsnachweise
ADD COLUMN IF NOT EXISTS auftraggeber TEXT CHECK (auftraggeber IN ('onlogist', 'smartandcare'));

-- Kommentar zur Dokumentation
COMMENT ON COLUMN arbeitsnachweise.auftraggeber IS 'Auftraggeber der Tour: onlogist oder smartandcare';
