-- ============================================================
-- Migration: Fügt owner_operator zum compensation_model hinzu
-- Für Geschäftsführer, die operativ fahren
-- ============================================================
-- 1. Alten CHECK Constraint entfernen (falls vorhanden)
ALTER TABLE profiles
DROP CONSTRAINT IF EXISTS profiles_compensation_model_check;
-- 2. Neuen CHECK Constraint mit owner_operator hinzufügen
ALTER TABLE profiles
ADD CONSTRAINT profiles_compensation_model_check
CHECK (compensation_model IN (
  'tour_based_minijob',
  'fixed_salary_part_time',
  'fixed_salary_full_time',
  'owner_operator'
));
-- 3. Update Burak Aydin zu owner_operator
-- Email: b.aydin@transnext.de, Profile ID: 85c3c3ab-77a6-42de-84c5-264259897f99
UPDATE profiles
SET compensation_model = 'owner_operator'
WHERE id = '85c3c3ab-77a6-42de-84c5-264259897f99'
  AND compensation_model = 'tour_based_minijob';
-- 4. Update Nicholas Mandzel Fahrer-Account zu owner_operator
-- Email: mandzelnicholas@gmail.com, Profile ID: b23391e7-a84d-4c6d-8055-6b51e98c4f64
UPDATE profiles
SET compensation_model = 'owner_operator'
WHERE id = 'b23391e7-a84d-4c6d-8055-6b51e98c4f64'
  AND compensation_model = 'tour_based_minijob';
-- 5. Protokollierung
DO $$
DECLARE
  affected_count INT;
BEGIN
  SELECT COUNT(*) INTO affected_count
  FROM profiles
  WHERE compensation_model = 'owner_operator';
  RAISE NOTICE '[Migration 20260602] owner_operator hinzugefügt. % Profile aktualisiert.', affected_count;
END $$;
