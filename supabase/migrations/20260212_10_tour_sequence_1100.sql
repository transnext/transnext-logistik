-- =====================================================
-- SCHRITT 10: TOURNUMMER-SEQUENZ AUF 1100 SETZEN
-- Migration: 20260212_10_tour_sequence_1100.sql
-- =====================================================

-- Für die 'touren' Tabelle (altes Schema)
-- Prüfe ob tour_nummer_seq existiert und setze auf 1099 (nächste wird 1100)
DO $$
DECLARE
  max_tour_nr INTEGER;
  new_val INTEGER;
BEGIN
  -- Hole die höchste existierende tour_nummer
  SELECT COALESCE(MAX(tour_nummer), 0) INTO max_tour_nr FROM touren;

  -- Bestimme neuen Wert: max(aktuell, 1099)
  new_val := GREATEST(max_tour_nr, 1099);

  -- Setze Sequence (PostgreSQL Serial hat automatisch eine Sequence)
  -- Die Sequence heißt normalerweise 'touren_tour_nummer_seq'
  EXECUTE format('ALTER SEQUENCE touren_tour_nummer_seq RESTART WITH %s', new_val + 1);

  RAISE NOTICE 'tour_nummer Sequence auf % gesetzt (nächste: %)', new_val, new_val + 1;
EXCEPTION
  WHEN undefined_table THEN
    RAISE NOTICE 'Tabelle touren existiert nicht - überspringe';
  WHEN undefined_object THEN
    RAISE NOTICE 'Sequence touren_tour_nummer_seq existiert nicht - überspringe';
END $$;

-- Für die 'tours' Tabelle (neues Schema)
DO $$
DECLARE
  max_tour_no INTEGER;
  new_val INTEGER;
BEGIN
  -- Prüfe ob Sequenz existiert
  IF EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'tour_nummer_seq') THEN
    -- Hole die höchste existierende tour_no
    SELECT COALESCE(MAX(tour_no), 0) INTO max_tour_no FROM tours;

    -- Bestimme neuen Wert: max(aktuell, 1099)
    new_val := GREATEST(max_tour_no, 1099);

    -- Setze Sequence
    EXECUTE format('ALTER SEQUENCE tour_nummer_seq RESTART WITH %s', new_val + 1);

    RAISE NOTICE 'tour_no Sequence auf % gesetzt (nächste: %)', new_val, new_val + 1;
  ELSE
    RAISE NOTICE 'Sequence tour_nummer_seq existiert nicht - überspringe';
  END IF;
EXCEPTION
  WHEN undefined_table THEN
    RAISE NOTICE 'Tabelle tours existiert nicht - überspringe';
END $$;

COMMENT ON SEQUENCE tour_nummer_seq IS 'Globale Tour-Nummern-Sequenz, startet bei 1100';
