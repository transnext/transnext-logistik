-- Migration: Geschäftsführer-Zeitmodell mit festem Gehalt
-- Erstellt: 2024-12-08

-- 1. Erweitere zeitmodell enum um 'geschaeftsfuehrer'
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_zeitmodell_check;
ALTER TABLE profiles 
ADD CONSTRAINT profiles_zeitmodell_check 
CHECK (zeitmodell IN ('minijob', 'werkstudent', 'teilzeit', 'vollzeit', 'geschaeftsfuehrer'));

-- 2. Füge festes_gehalt Spalte hinzu
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS festes_gehalt DECIMAL(10,2) DEFAULT 0;

-- 3. Kommentar
COMMENT ON COLUMN profiles.festes_gehalt IS 'Festes monatliches Gehalt für Geschäftsführer und Vollzeit-Angestellte';

-- 4. Setze Nicholas Mandzel als Geschäftsführer mit 1500€
UPDATE profiles
SET zeitmodell = 'geschaeftsfuehrer', festes_gehalt = 1500.00
WHERE LOWER(full_name) LIKE '%nicholas%mandzel%';

-- 5. Setze Burak Aydin als Geschäftsführer mit 600€
UPDATE profiles
SET zeitmodell = 'geschaeftsfuehrer', festes_gehalt = 600.00
WHERE LOWER(full_name) LIKE '%burak%aydin%';

-- 6. Überprüfung
SELECT full_name, zeitmodell, festes_gehalt
FROM profiles
WHERE zeitmodell = 'geschaeftsfuehrer'
ORDER BY full_name;
