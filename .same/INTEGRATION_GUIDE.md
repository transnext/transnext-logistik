# 🚀 TransNext Portal - Produktiv-Integration

## Vollständige Schritt-für-Schritt Anleitung

**Von Demo zu Produktiv in 7 Schritten**

---

## 📋 Übersicht

**Ziel:**
- Admins erstellen Fahrer-Accounts im Admin-Portal
- Fahrer erhalten Benutzername + Passwort
- Fahrer melden sich an und laden Touren/Auslagen hoch
- Admins genehmigen und sehen alles in Echtzeit

**Zeitaufwand:** 3-4 Stunden
**Kosten:** €0 (Supabase Free Tier)

---

# SCHRITT 1: SUPABASE EINRICHTEN

## 1.1 Account erstellen
1. Öffnen Sie: **https://supabase.com**
2. Klicken Sie **"Start your project"**
3. Anmelden mit GitHub oder E-Mail

## 1.2 Neues Projekt
1. **"New Project"** klicken
2. Ausfüllen:
   - Name: `transnext-portal`
   - Passwort: **Sicheres Passwort** (gut notieren!)
   - Region: `Frankfurt (eu-central-1)`
3. **"Create new project"**
4. ⏱️ 1-2 Minuten warten

## 1.3 API-Keys kopieren
1. Sidebar → **⚙️ Settings** → **API**
2. Kopieren Sie:
   - **Project URL**
   - **anon public Key**
3. In Textdatei sichern!

---

# SCHRITT 2: DATENBANK ERSTELLEN

## 2.1 SQL Editor öffnen
1. Sidebar → **🗄️ SQL Editor**
2. **"+ New query"**

## 2.2 Komplettes Schema einfügen

Kopieren Sie diesen KOMPLETTEN Code:

```sql
-- TRANSNEXT DATENBANK-SCHEMA

-- 1. PROFILES
CREATE TABLE profiles (
  id UUID REFERENCES auth.users PRIMARY KEY,
  role TEXT NOT NULL CHECK (role IN ('fahrer', 'admin')),
  full_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. FAHRER
CREATE TABLE fahrer (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users UNIQUE NOT NULL,
  vorname TEXT NOT NULL,
  nachname TEXT NOT NULL,
  geburtsdatum DATE NOT NULL,
  adresse TEXT NOT NULL,
  plz TEXT NOT NULL,
  ort TEXT NOT NULL,
  fuehrerschein_nr TEXT NOT NULL,
  fuehrerschein_datum DATE NOT NULL,
  ausstellende_behoerde TEXT NOT NULL,
  fuehrerscheinklassen TEXT[] NOT NULL,
  ausweisnummer TEXT NOT NULL,
  ausweis_ablauf DATE NOT NULL,
  status TEXT DEFAULT 'aktiv' CHECK (status IN ('aktiv', 'inaktiv')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. ARBEITSNACHWEISE
CREATE TABLE arbeitsnachweise (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  tour_nr TEXT NOT NULL,
  datum DATE NOT NULL,
  gefahrene_km DECIMAL(10,2) NOT NULL,
  wartezeit TEXT CHECK (wartezeit IN ('30-60', '60-90', '90-120', 'keine')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'billed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. AUSLAGENNACHWEISE
CREATE TABLE auslagennachweise (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  tour_nr TEXT NOT NULL,
  kennzeichen TEXT NOT NULL,
  datum DATE NOT NULL,
  startort TEXT NOT NULL,
  zielort TEXT NOT NULL,
  belegart TEXT NOT NULL CHECK (belegart IN ('tankbeleg', 'waschbeleg', 'bahnticket', 'bc50', 'taxi', 'uber')),
  kosten DECIMAL(10,2) NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'paid')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- INDIZES
CREATE INDEX idx_fahrer_user ON fahrer(user_id);
CREATE INDEX idx_arbeit_user ON arbeitsnachweise(user_id);
CREATE INDEX idx_auslagen_user ON auslagennachweise(user_id);

-- RLS AKTIVIEREN
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE fahrer ENABLE ROW LEVEL SECURITY;
ALTER TABLE arbeitsnachweise ENABLE ROW LEVEL SECURITY;
ALTER TABLE auslagennachweise ENABLE ROW LEVEL SECURITY;

-- POLICIES
CREATE POLICY "Users read own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Admins read all profiles" ON profiles FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admins create profiles" ON profiles FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Fahrer read own data" ON fahrer FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Admins read all fahrer" ON fahrer FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admins create fahrer" ON fahrer FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admins update fahrer" ON fahrer FOR UPDATE USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Fahrer read own arbeit" ON arbeitsnachweise FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Admins read all arbeit" ON arbeitsnachweise FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Fahrer create arbeit" ON arbeitsnachweise FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins update arbeit" ON arbeitsnachweise FOR UPDATE USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Fahrer read own auslagen" ON auslagennachweise FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Admins read all auslagen" ON auslagennachweise FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Fahrer create auslagen" ON auslagennachweise FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins update auslagen" ON auslagennachweise FOR UPDATE USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
```

## 2.3 Ausführen
1. Klicken Sie **"Run"** (unten rechts)
2. ✅ Erfolg: "Success. No rows returned"

---

# SCHRITT 3: ADMIN-ACCOUNT ERSTELLEN

Im SQL Editor, neuer Query:

```sql
-- SCHRITT 1: User erstellen
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(), 'authenticated', 'authenticated',
  'admin@transnext.de',
  crypt('IhrPasswort123!', gen_salt('bf')),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{}', NOW(), NOW()
) RETURNING id;
```

**WICHTIG:**
1. Führen Sie aus
2. **Kopieren Sie die UUID** (z.B. `abc123...`)
3. Neuer Query:

```sql
-- SCHRITT 2: Profil erstellen (UUID einsetzen!)
INSERT INTO profiles (id, role, full_name) VALUES
('IHRE-UUID-HIER', 'admin', 'Admin User');
```

**Ihre Zugangsdaten:**
```
E-Mail: admin@transnext.de
Passwort: IhrPasswort123!
```

---

# SCHRITT 4: PROJEKT VORBEREITEN

## 4.1 .env.local erstellen
Im Projekt-Root, neue Datei `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://IHRE-ID.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...IHR-KEY...
```

## 4.2 Supabase installieren
Terminal:

```bash
cd transnext-logistik
bun add @supabase/supabase-js
```

## 4.3 Client erstellen
Neue Datei: `src/lib/supabase.ts`

```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

---

# SCHRITT 5: CODE ANPASSEN

Ich sende Ihnen die einzelnen Code-Änderungen in separaten Dateien.

Bitte öffnen Sie die Datei **`CODE_CHANGES.md`** im `.same` Ordner für die kompletten Code-Anpassungen!

---

# SCHRITT 6: TESTEN

## 6.1 Admin-Login
1. `http://localhost:3000/admin`
2. Login: `admin@transnext.de` / `IhrPasswort123!`

## 6.2 Fahrer anlegen
1. Tab "Fahrer" → "Neuen Fahrer anlegen"
2. Ausfüllen und speichern
3. Notieren Sie: `benutzername@transnext.de` und Passwort

## 6.3 Fahrer-Login
1. `http://localhost:3000/fahrerportal`
2. Login mit Fahrer-Daten
3. Arbeitsnachweis hochladen

## 6.4 Admin genehmigt
1. Zurück zu Admin
2. Tab "Touren"
3. Status ändern

---

# SCHRITT 7: LIVE GEHEN

## 7.1 Deployment
1. Hosting (Netlify/Vercel)
2. Environment Variables setzen
3. Deployen!

## 7.2 Supabase Auth konfigurieren
1. Supabase → Auth → Settings
2. Site URL: Ihre Domain
3. Redirect URLs: Ihre Domain + Pfade

---

## ✅ FERTIG!

**System ist produktiv!**

- ✅ Admins erstellen Fahrer
- ✅ Fahrer melden sich an
- ✅ Touren & Auslagen werden hochgeladen
- ✅ Status-Updates in Echtzeit
- ✅ Daten sicher in Cloud

---

## 📞 Hilfe

**Bei Problemen:**
- Browser-Konsole prüfen (F12)
- Supabase Logs prüfen
- RLS Policies prüfen

**Häufige Fehler:**
- "Invalid API key" → `.env.local` prüfen
- "Policy violated" → SQL Policies prüfen
- Login geht nicht → E-Mail-Format prüfen

---

**Viel Erfolg! 🚀**
