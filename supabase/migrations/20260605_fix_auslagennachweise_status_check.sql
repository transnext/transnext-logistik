-- Migration: Fix auslagennachweise status CHECK constraint
-- Datum: 2026-06-05
-- Grund: Dustin Wett (und andere Fahrer) konnten keine Auslagen mit Firmenkreditkarte hochladen
--        Der Status 'tankcard' war nicht im CHECK Constraint erlaubt
-- 
-- Problem: Frontend sendet status='tankcard' wenn payment_method='company_card'
--          CHECK Constraint erlaubte aber nur: pending, approved, rejected, paid, billed
--
-- Fix: CHECK Constraint erweitert um 'tankcard'

-- BEREITS LIVE ANGEWENDET am 2026-06-05

-- Schritt 1: Alten Constraint entfernen (falls vorhanden)
ALTER TABLE auslagennachweise DROP CONSTRAINT IF EXISTS auslagennachweise_status_check;

-- Schritt 2: Neuen Constraint mit 'tankcard' erstellen
ALTER TABLE auslagennachweise 
ADD CONSTRAINT auslagennachweise_status_check 
CHECK (status IN ('pending', 'approved', 'rejected', 'paid', 'billed', 'tankcard'));

-- Verifizierung:
-- SELECT conname, pg_get_constraintdef(oid) 
-- FROM pg_constraint 
-- WHERE conrelid = 'auslagennachweise'::regclass AND contype = 'c';

-- Erwartet: CHECK (status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'paid'::text, 'billed'::text, 'tankcard'::text]))
