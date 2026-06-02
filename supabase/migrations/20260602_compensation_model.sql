-- =====================================================
-- Migration: Vergütungsmodelle für Fahrer
-- Datum: 2026-06-02
-- =====================================================

-- 1. Compensation Model Feld hinzufügen
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS compensation_model TEXT
DEFAULT 'tour_based_minijob'
CHECK (compensation_model IN ('tour_based_minijob', 'fixed_salary_part_time', 'fixed_salary_full_time'));

-- 2. Optionales Feld für festes Monatsbrutto
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS fixed_monthly_gross_salary NUMERIC(10, 2) DEFAULT NULL;

-- 3. Optionales Feld für Vertragsstunden
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS contracted_hours_per_week NUMERIC(4, 1) DEFAULT NULL;

-- 4. Index
CREATE INDEX IF NOT EXISTS idx_profiles_compensation_model
ON profiles(compensation_model);

-- 5. Bestehende Fahrer auf Default setzen
UPDATE profiles
SET compensation_model = 'tour_based_minijob'
WHERE compensation_model IS NULL
AND role = 'fahrer';

-- 6. Dustin Wett auf Festgehalt Teilzeit setzen
UPDATE profiles p
SET compensation_model = 'fixed_salary_part_time'
FROM fahrer f
WHERE f.user_id = p.id
AND LOWER(f.vorname) = 'dustin'
AND LOWER(f.nachname) = 'wett';
