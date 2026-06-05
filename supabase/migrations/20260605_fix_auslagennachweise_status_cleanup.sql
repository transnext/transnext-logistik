-- ============================================================================
-- Migration: Fachliche Korrektur status='tankcard' → payment_method
-- Datum: 2026-06-05
-- 
-- HINTERGRUND:
-- status = 'tankcard' war eine fachlich falsche Vermischung von Konzepten:
-- - status sollte nur Bearbeitungsstatus abbilden: pending, approved, rejected, paid, billed
-- - Zahlungsart (Firmenkarte/eigene Tasche) gehört in payment_method
--
-- Diese Migration:
-- 1. Migriert bestehende 'tankcard'-Einträge zu status='pending' + payment_method='company_card'
-- 2. Entfernt 'tankcard' aus dem CHECK Constraint
-- ============================================================================

-- Schritt 1: Bestehende 'tankcard' Einträge migrieren
-- Setze status='pending' und stelle sicher dass payment_method='company_card'
UPDATE auslagennachweise
SET 
  status = 'pending',
  payment_method = 'company_card'
WHERE status = 'tankcard';

-- Schritt 2: Alten CHECK Constraint entfernen (der 'tankcard' enthält)
ALTER TABLE auslagennachweise 
DROP CONSTRAINT IF EXISTS auslagennachweise_status_check;

-- Schritt 3: Neuen CHECK Constraint ohne 'tankcard' erstellen
ALTER TABLE auslagennachweise
ADD CONSTRAINT auslagennachweise_status_check 
CHECK (status IN ('pending', 'approved', 'rejected', 'paid', 'billed'));

-- Schritt 4: Dokumentation
COMMENT ON COLUMN auslagennachweise.status IS 'Bearbeitungsstatus: pending (neu), approved (genehmigt), rejected (abgelehnt), paid (erstattet), billed (abgerechnet)';
COMMENT ON COLUMN auslagennachweise.payment_method IS 'Zahlungsart: private (eigene Tasche, erstattungsrelevant) oder company_card (Firmenkreditkarte, nur Dokumentation)';
