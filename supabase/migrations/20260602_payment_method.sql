-- =====================================================
-- Migration: Payment Method für Auslagennachweise
-- Datum: 2026-06-02
-- Beschreibung: Ermöglicht die Unterscheidung zwischen
--   - private: Aus eigener Tasche bezahlt (erstattungsrelevant)
--   - company_card: Mit Firmenkreditkarte bezahlt (nur Dokumentation)
--
-- WICHTIG: Diese Migration ist sicher und kann jederzeit ausgeführt werden.
-- =====================================================

-- 1. Spalte hinzufügen (falls nicht vorhanden)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'auslagennachweise'
        AND column_name = 'payment_method'
    ) THEN
        ALTER TABLE auslagennachweise
        ADD COLUMN payment_method TEXT DEFAULT 'private';

        COMMENT ON COLUMN auslagennachweise.payment_method IS
            'Zahlungsart: private = aus eigener Tasche (erstattungsrelevant), company_card = Firmenkreditkarte (nur Dokumentation)';
    END IF;
END $$;

-- 2. Bestehende Datensätze mit ist_tankkarte = true auf company_card setzen
-- (nur für Tankbelege mit Firmen-Tankkarte)
UPDATE auslagennachweise
SET payment_method = 'company_card'
WHERE status = 'tankcard' AND payment_method IS NULL;

-- 3. Alle anderen bestehenden Datensätze auf 'private' setzen
UPDATE auslagennachweise
SET payment_method = 'private'
WHERE payment_method IS NULL;

-- 4. Check-Constraint für gültige Werte
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'auslagennachweise_payment_method_check'
    ) THEN
        ALTER TABLE auslagennachweise
        ADD CONSTRAINT auslagennachweise_payment_method_check
        CHECK (payment_method IN ('private', 'company_card'));
    END IF;
END $$;

-- 5. Index für schnelle Filterung nach Zahlungsart
CREATE INDEX IF NOT EXISTS idx_auslagennachweise_payment_method
ON auslagennachweise (payment_method);

-- =====================================================
-- Hinweise zur Anwendung:
--
-- Diese Migration kann über das Supabase Dashboard ausgeführt werden:
-- 1. SQL Editor öffnen
-- 2. Dieses SQL-Skript einfügen
-- 3. Ausführen
--
-- Die Migration ist idempotent (kann mehrfach ausgeführt werden)
-- =====================================================
