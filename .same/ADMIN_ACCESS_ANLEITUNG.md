# Admin-Account für TransNext einrichten

## Zugangsdaten

| Email               | Passwort        |
|---------------------|-----------------|
| b.aydin@transnext.de | TransNext2024!  |

## 1. Supabase SQL Editor öffnen

1. Loggen Sie sich in Ihre [Supabase Console](https://app.supabase.io) ein
2. Wählen Sie das Projekt für "TransNext Logistik"
3. Klicken Sie im linken Menü auf "SQL Editor"
4. Klicken Sie auf "New Query" (Neue Abfrage)

## 2. SQL-Script ausführen

Kopieren Sie das folgende SQL-Script in den Editor:

```sql
-- WICHTIG: ADMIN-ACCOUNT ANLEGEN FÜR TRANSNEXT.DE
-- b.aydin@transnext.de / TransNext2024!
-- =====================================================

-- 1. Auth-User anlegen
INSERT INTO auth.users
  (id, instance_id, email, email_confirmed_at, encrypted_password, aud, role, raw_app_meta_data, raw_user_meta_data)
VALUES
  (
    gen_random_uuid(), -- UUID generieren
    (SELECT current_setting('supabase_auth.instance_id')), -- Instance ID
    'b.aydin@transnext.de', -- E-Mail
    now(), -- Bestätigungs-Datum
    crypt('TransNext2024!', gen_salt('bf')), -- Passwort-Hash
    'authenticated',
    'authenticated',
    '{"provider":"email","providers":["email"]}',
    '{"role":"admin","full_name":"Burak Aydin"}'
  )
ON CONFLICT (email) DO NOTHING;

-- 2. User-ID abrufen und Profil erstellen
DO $$
DECLARE
  user_id UUID;
BEGIN
  SELECT id INTO user_id FROM auth.users WHERE email = 'b.aydin@transnext.de' LIMIT 1;

  -- 3. Profil erstellen
  INSERT INTO public.profiles (id, role, full_name)
  VALUES
    (user_id, 'admin', 'Burak Aydin')
  ON CONFLICT (id)
  DO UPDATE SET role = 'admin';
END $$;
```

Klicken Sie auf "Run" (oder "Ausführen"), um das Script auszuführen.

## 3. Überprüfen

Sie können überprüfen, ob der Account erstellt wurde:

```sql
-- Überprüfen, ob der Benutzer existiert
SELECT * FROM auth.users WHERE email = 'b.aydin@transnext.de';

-- Überprüfen, ob das Profil existiert
SELECT * FROM profiles WHERE full_name = 'Burak Aydin';
```

## 4. Einloggen in die TransNext App

1. Öffnen Sie https://transnext.de/admin
2. Geben Sie folgende Zugangsdaten ein:
   - Email: b.aydin@transnext.de
   - Passwort: TransNext2024!

## 5. Sicherheitshinweis

Bitte ändern Sie das Passwort nach dem ersten Login, um die Sicherheit zu gewährleisten.

## Problembehebung

Falls der Login nicht funktioniert:

1. Stellen Sie sicher, dass die Email exakt `b.aydin@transnext.de` ist
2. Überprüfen Sie, ob in der Tabelle `profiles` ein Eintrag mit `role = 'admin'` existiert
3. Prüfen Sie die Verbindung zwischen Auth und Profil-Tabelle (ID muss übereinstimmen)
