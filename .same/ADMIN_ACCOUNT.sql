-- ============================================
-- ADMIN-ACCOUNT ERSTELLEN
-- Führen Sie diese Befehle NACH dem Schema aus
-- ============================================

-- WICHTIG: Ändern Sie das Passwort unten!
-- Ersetzen Sie 'IhrSicheresPasswort123!' mit Ihrem eigenen Passwort

-- SCHRITT 1: User in Auth erstellen
-- ============================================
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'admin@transnext.de',
  crypt('IhrSicheresPasswort123!', gen_salt('bf')),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  NOW(),
  NOW(),
  '',
  '',
  '',
  ''
) RETURNING id;

-- ============================================
-- WICHTIG:
-- 1. Führen Sie den obigen Befehl aus
-- 2. KOPIEREN Sie die UUID aus dem Ergebnis
--    (z.B. "abc12345-6789-...")
-- 3. Ersetzen Sie unten 'IHRE-UUID-HIER' mit der kopierten UUID
-- 4. Führen Sie dann den unteren Befehl aus
-- ============================================

-- SCHRITT 2: Profil erstellen (UUID von oben einsetzen!)
-- ============================================
INSERT INTO profiles (id, role, full_name) VALUES
('IHRE-UUID-HIER', 'admin', 'Admin User');

-- ============================================
-- FERTIG!
-- ============================================
-- Ihre Admin-Zugangsdaten:
-- E-Mail: admin@transnext.de
-- Passwort: IhrSicheresPasswort123!
--
-- Testen Sie den Login unter:
-- http://localhost:3000/admin
-- ============================================
