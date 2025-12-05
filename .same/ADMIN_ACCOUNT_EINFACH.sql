-- VEREINFACHTES SCRIPT FÜR ADMIN-ACCOUNT
-- b.aydin@transnext.de / TransNext2024!
-- =====================================================

-- WICHTIG: Dieses vereinfachte Script verwendet eine Alternative,
-- falls die instance_id Probleme macht.

-- 1. Manuell User mit UUID erstellen
DO $$
DECLARE
    new_user_id uuid := gen_random_uuid();
    supabase_instance uuid;
BEGIN
    -- Instance-ID abrufen
    SELECT uuid(current_setting('supabase_auth.instance_id')) INTO supabase_instance;

    -- Auth-User einfügen
    INSERT INTO auth.users
      (id, instance_id, email, email_confirmed_at, encrypted_password, aud, role, raw_app_meta_data, raw_user_meta_data)
    VALUES
      (
        new_user_id,
        supabase_instance,
        'b.aydin@transnext.de',
        now(),
        crypt('TransNext2024!', gen_salt('bf')),
        'authenticated',
        'authenticated',
        '{"provider":"email","providers":["email"]}',
        '{"role":"admin","full_name":"Burak Aydin"}'
      )
    ON CONFLICT (email) DO NOTHING;

    -- Profil erstellen für vorhandenen oder neuen User
    INSERT INTO public.profiles (id, role, full_name)
    SELECT id, 'admin', 'Burak Aydin'
    FROM auth.users
    WHERE email = 'b.aydin@transnext.de'
    ON CONFLICT (id) DO UPDATE
    SET role = 'admin', full_name = 'Burak Aydin';

    RAISE NOTICE 'Admin-Benutzer erstellt oder aktualisiert: %', 'b.aydin@transnext.de';
END $$;
