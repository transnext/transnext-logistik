-- DIREKTER ANSATZ FÜR ADMIN-BENUTZER
-- b.aydin@transnext.de / TransNext2024!
-- =====================================================

-- METHODE 1: DIREKTER SQL-ANSATZ
-- 1. Prüfen, ob wir einen Admin haben
DO $$
BEGIN
  -- Wenn der Benutzer bereits existiert, aktualisieren wir nur das Profil
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = 'b.aydin@transnext.de') THEN
    -- Profil aktualisieren
    INSERT INTO public.profiles (id, role, full_name)
    SELECT id, 'admin', 'Burak Aydin'
    FROM auth.users
    WHERE email = 'b.aydin@transnext.de'
    ON CONFLICT (id) DO UPDATE
    SET role = 'admin', full_name = 'Burak Aydin';

    RAISE NOTICE 'Bestehender Benutzer gefunden, nur Profil aktualisiert.';
  END IF;
END $$;

-- METHODE 2: ALTERNATIVE ÜBER SUPABASE FUNKTION
-- Falls Methode 1 nicht funktioniert hat, können Sie in Supabase:
-- 1. Gehen Sie zu "Authentication" > "Users"
-- 2. Klicken Sie auf "Invite" oder "New User"
-- 3. Tragen Sie folgende Daten ein:
--    - Email: b.aydin@transnext.de
--    - Password: TransNext2024!
-- 4. Benutzer erstellen
-- 5. Dann führen Sie nur dieses SQL aus, um das Profil zu setzen:

/*
-- Nur Profil setzen für manuell erstellten Benutzer
INSERT INTO public.profiles (id, role, full_name)
SELECT id, 'admin', 'Burak Aydin'
FROM auth.users
WHERE email = 'b.aydin@transnext.de'
ON CONFLICT (id) DO UPDATE
SET role = 'admin';
*/

-- ÜBERPRÜFEN:
-- SELECT * FROM auth.users WHERE email = 'b.aydin@transnext.de';
-- SELECT * FROM public.profiles WHERE full_name = 'Burak Aydin';

/*
-- MANUELL LÖSCHEN (FALLS NÖTIG):
DELETE FROM public.profiles WHERE id IN (SELECT id FROM auth.users WHERE email = 'b.aydin@transnext.de');
DELETE FROM auth.users WHERE email = 'b.aydin@transnext.de';
*/
