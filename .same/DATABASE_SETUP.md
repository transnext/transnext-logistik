# 🗄️ Datenbank-Integration Guide

Dieser Guide erklärt Schritt für Schritt, wie Sie eine echte Datenbank an das TransNext Portal anbinden.

## 📋 Inhaltsverzeichnis
1. [Warum eine Datenbank?](#warum-eine-datenbank)
2. [Supabase Setup](#supabase-setup)
3. [Datenbank-Schema](#datenbank-schema)
4. [Integration ins Projekt](#integration-ins-projekt)
5. [API-Funktionen](#api-funktionen)
6. [Authentication erweitern](#authentication-erweitern)
7. [Testing](#testing)

---

## Warum eine Datenbank?

**Aktueller Stand (Demo):**
- Daten werden nur im Browser gespeichert (localStorage)
- Daten gehen bei Browser-Wechsel verloren
- Keine Synchronisation zwischen Fahrer und Admin
- Keine echte Datensicherheit

**Mit Datenbank:**
- ✅ Zentrale Datenspeicherung
- ✅ Daten sind von überall abrufbar
- ✅ Echtzeit-Updates zwischen Fahrer und Admin
- ✅ Datensicherung & Wiederherstellung
- ✅ User-Management mit Rollen

---

## Supabase Setup

### 1. Account erstellen
1. Gehen Sie zu [https://supabase.com](https://supabase.com)
2. Klicken Sie auf "Start your project"
3. Registrieren Sie sich mit E-Mail oder GitHub
4. **KOSTENLOS** bis 500 MB Datenbank & 2GB Bandbreite/Monat

### 2. Neues Projekt erstellen
1. Klicken Sie auf "New Project"
2. Wählen Sie einen **Project Name**: z.B. `transnext-portal`
3. Setzen Sie ein sicheres **Database Password** (gut merken!)
4. Wählen Sie eine **Region**: Frankfurt (eu-central-1)
5. Klicken Sie auf "Create new project"
6. ⏱️ Warten Sie 1-2 Minuten bis das Projekt bereit ist

### 3. API Keys holen
1. Im Supabase Dashboard: Linke Sidebar → **Settings** → **API**
2. Kopieren Sie:
   - **Project URL** (z.B. `https://xxxxx.supabase.co`)
   - **anon public** Key (beginnt mit `eyJ...`)

### 4. Umgebungsvariablen einrichten

Erstellen Sie eine Datei `.env.local` im Projekt-Root:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...your-anon-key...
```

⚠️ **WICHTIG:** Diese Datei NIEMALS in Git hochladen!

---

## Datenbank-Schema

### SQL-Schema für Supabase

Gehen Sie im Supabase Dashboard zu **SQL Editor** und führen Sie folgende Befehle aus:

```sql
-- 1. User-Profile Tabelle (erweitert die Auth-User)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users PRIMARY KEY,
  role TEXT NOT NULL CHECK (role IN ('fahrer', 'admin')),
  full_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Arbeitsnachweise Tabelle
CREATE TABLE arbeitsnachweise (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) NOT NULL,
  tour_nr TEXT NOT NULL,
  datum DATE NOT NULL,
  gefahrene_km DECIMAL(10,2) NOT NULL,
  wartezeit TEXT CHECK (wartezeit IN ('30-60', '60-90', '90-120', 'keine')),
  beleg_url TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notiz TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Auslagennachweise Tabelle
CREATE TABLE auslagennachweise (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) NOT NULL,
  tour_nr TEXT NOT NULL,
  kennzeichen TEXT NOT NULL,
  datum DATE NOT NULL,
  startort TEXT NOT NULL,
  zielort TEXT NOT NULL,
  belegart TEXT NOT NULL CHECK (belegart IN ('tankbeleg', 'waschbeleg', 'bahnticket', 'bc50', 'taxi', 'uber')),
  kosten DECIMAL(10,2) NOT NULL,
  beleg_url TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notiz TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Indizes für Performance
CREATE INDEX idx_arbeitsnachweise_user ON arbeitsnachweise(user_id);
CREATE INDEX idx_arbeitsnachweise_status ON arbeitsnachweise(status);
CREATE INDEX idx_arbeitsnachweise_datum ON arbeitsnachweise(datum);
CREATE INDEX idx_auslagennachweise_user ON auslagennachweise(user_id);
CREATE INDEX idx_auslagennachweise_status ON auslagennachweise(status);
CREATE INDEX idx_auslagennachweise_datum ON auslagennachweise(datum);

-- 5. Row Level Security (RLS) aktivieren
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE arbeitsnachweise ENABLE ROW LEVEL SECURITY;
ALTER TABLE auslagennachweise ENABLE ROW LEVEL SECURITY;

-- 6. Policies für Datenzugriff

-- Profiles: Jeder kann sein eigenes Profil lesen, Admins können alles sehen
CREATE POLICY "Profiles sind für User lesbar" ON profiles
  FOR SELECT USING (auth.uid() = id OR EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "Admins können Profiles erstellen" ON profiles
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));

-- Arbeitsnachweise: Fahrer können ihre eigenen sehen & erstellen, Admins alles
CREATE POLICY "Fahrer sehen eigene Arbeitsnachweise" ON arbeitsnachweise
  FOR SELECT USING (
    user_id = auth.uid() OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Fahrer erstellen Arbeitsnachweise" ON arbeitsnachweise
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins aktualisieren Arbeitsnachweise" ON arbeitsnachweise
  FOR UPDATE USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));

-- Auslagennachweise: Gleiche Logik wie Arbeitsnachweise
CREATE POLICY "Fahrer sehen eigene Auslagennachweise" ON auslagennachweise
  FOR SELECT USING (
    user_id = auth.uid() OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Fahrer erstellen Auslagennachweise" ON auslagennachweise
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins aktualisieren Auslagennachweise" ON auslagennachweise
  FOR UPDATE USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));

-- 7. Trigger für updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_arbeitsnachweise_updated_at BEFORE UPDATE ON arbeitsnachweise
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_auslagennachweise_updated_at BEFORE UPDATE ON auslagennachweise
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

---

## Integration ins Projekt

### 1. Supabase Client installieren

```bash
cd transnext-logistik
bun add @supabase/supabase-js
```

### 2. Supabase Client erstellen

Erstellen Sie `src/lib/supabase.ts`:

```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Type Definitions
export type Profile = {
  id: string
  role: 'fahrer' | 'admin'
  full_name: string
  created_at: string
  updated_at: string
}

export type Arbeitsnachweis = {
  id: number
  user_id: string
  tour_nr: string
  datum: string
  gefahrene_km: number
  wartezeit: string
  beleg_url?: string
  status: 'pending' | 'approved' | 'rejected'
  admin_notiz?: string
  created_at: string
  updated_at: string
}

export type Auslagennachweis = {
  id: number
  user_id: string
  tour_nr: string
  kennzeichen: string
  datum: string
  startort: string
  zielort: string
  belegart: string
  kosten: number
  beleg_url?: string
  status: 'pending' | 'approved' | 'rejected'
  admin_notiz?: string
  created_at: string
  updated_at: string
}
```

---

## API-Funktionen

### Arbeitsnachweis erstellen (Fahrerportal)

Ersetzen Sie in `src/app/fahrerportal/arbeitsnachweis/page.tsx`:

```typescript
// ALT (localStorage):
const existingData = JSON.parse(localStorage.getItem("arbeitsnachweise") || "[]")
existingData.push({ ...formData, ... })
localStorage.setItem("arbeitsnachweise", JSON.stringify(existingData))

// NEU (Supabase):
import { supabase } from '@/lib/supabase'

const { data: user } = await supabase.auth.getUser()

const { data, error } = await supabase
  .from('arbeitsnachweise')
  .insert([{
    user_id: user?.user?.id,
    tour_nr: formData.tourNr,
    datum: formData.datum,
    gefahrene_km: parseFloat(formData.gefahreneKm),
    wartezeit: formData.wartezeit,
    status: 'pending'
  }])

if (error) {
  console.error('Fehler beim Speichern:', error)
  alert('Fehler beim Speichern. Bitte versuchen Sie es erneut.')
} else {
  setSaved(true)
}
```

### Arbeitsnachweise laden (Fahrerportal)

```typescript
// In Monatsabrechnung oder Dashboard:
const { data: arbeitsnachweise, error } = await supabase
  .from('arbeitsnachweise')
  .select('*')
  .eq('user_id', user?.user?.id)
  .gte('datum', selectedMonth + '-01')
  .lt('datum', nextMonth + '-01')
  .order('datum', { ascending: false })

if (arbeitsnachweise) {
  setTouren(arbeitsnachweise)
}
```

### Status ändern (Admin-Portal)

```typescript
// In Admin Dashboard:
const updateTourStatus = async (id: number, newStatus: string) => {
  const { error } = await supabase
    .from('arbeitsnachweise')
    .update({ status: newStatus })
    .eq('id', id)

  if (!error) {
    // Lokalen State aktualisieren
    loadData()
  }
}
```

### Alle Nachweise laden (Admin)

```typescript
// Admin Dashboard - Alle Arbeitsnachweise:
const { data: allTouren } = await supabase
  .from('arbeitsnachweise')
  .select(`
    *,
    profiles(full_name)
  `)
  .order('created_at', { ascending: false })

// Alle Auslagennachweise:
const { data: allAuslagen } = await supabase
  .from('auslagennachweise')
  .select(`
    *,
    profiles(full_name)
  `)
  .order('created_at', { ascending: false })
```

---

## Authentication erweitern

### Login-System mit Supabase Auth

#### Fahrerportal Login (`/fahrerportal/page.tsx`):

```typescript
const handleLogin = async (e: React.FormEvent) => {
  e.preventDefault()

  const { data, error } = await supabase.auth.signInWithPassword({
    email: credentials.email,
    password: credentials.password,
  })

  if (error) {
    setError('Ungültige Anmeldedaten')
    return
  }

  // Profil-Rolle prüfen
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('id', data.user.id)
    .single()

  if (profile?.role !== 'fahrer') {
    setError('Dieser Account ist kein Fahrer-Account')
    await supabase.auth.signOut()
    return
  }

  // Erfolgreicher Login
  router.push('/fahrerportal/dashboard')
}
```

#### Admin-Portal Login (`/admin/page.tsx`):

```typescript
const handleLogin = async (e: React.FormEvent) => {
  e.preventDefault()

  const { data, error } = await supabase.auth.signInWithPassword({
    email: credentials.email,
    password: credentials.password,
  })

  if (error) {
    setError('Ungültige Anmeldedaten')
    return
  }

  // Profil-Rolle prüfen
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('id', data.user.id)
    .single()

  if (profile?.role !== 'admin') {
    setError('Dieser Account ist kein Admin-Account')
    await supabase.auth.signOut()
    return
  }

  // Erfolgreicher Login
  router.push('/admin/dashboard')
}
```

### Benutzer erstellen

```typescript
// Neuen Fahrer anlegen (Admin-Funktion):
const createFahrer = async (email: string, password: string, fullName: string) => {
  // 1. User in Auth erstellen
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true
  })

  if (authError) throw authError

  // 2. Profil erstellen
  const { error: profileError } = await supabase
    .from('profiles')
    .insert([{
      id: authData.user.id,
      role: 'fahrer',
      full_name: fullName
    }])

  if (profileError) throw profileError
}
```

---

## Testing

### 1. Test-Daten erstellen

Führen Sie im SQL Editor aus:

```sql
-- Test-Admin erstellen (Passwort: admin123)
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at)
VALUES (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'admin@transnext.de',
  crypt('admin123', gen_salt('bf')),
  NOW()
);

INSERT INTO profiles (id, role, full_name)
VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'admin', 'Admin User');

-- Test-Fahrer erstellen (Passwort: fahrer123)
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at)
VALUES (
  'ffffffff-ffff-ffff-ffff-ffffffffffff',
  'fahrer@transnext.de',
  crypt('fahrer123', gen_salt('bf')),
  NOW()
);

INSERT INTO profiles (id, role, full_name)
VALUES ('ffffffff-ffff-ffff-ffff-ffffffffffff', 'fahrer', 'Max Mustermann');
```

### 2. Login testen

- **Admin:** admin@transnext.de / admin123
- **Fahrer:** fahrer@transnext.de / fahrer123

### 3. Workflow testen

1. Als Fahrer einloggen
2. Arbeitsnachweis erstellen
3. Ausloggen
4. Als Admin einloggen
5. Nachweise im Dashboard sehen
6. Status ändern
7. Ausloggen
8. Als Fahrer erneut einloggen
9. Geänderten Status sehen

---

## File Upload (Optional)

Für Belege können Sie Supabase Storage nutzen:

### Storage Bucket erstellen

1. Im Supabase Dashboard: **Storage**
2. **New bucket** → Name: `belege`
3. **Public bucket** aktivieren

### Upload-Funktion

```typescript
const uploadBeleg = async (file: File) => {
  const fileExt = file.name.split('.').pop()
  const fileName = `${Date.now()}.${fileExt}`
  const filePath = `${user.id}/${fileName}`

  const { error } = await supabase.storage
    .from('belege')
    .upload(filePath, file)

  if (error) throw error

  // Public URL holen
  const { data } = supabase.storage
    .from('belege')
    .getPublicUrl(filePath)

  return data.publicUrl
}
```

---

## Realtime Updates (Optional)

Für Echtzeit-Updates wenn Admin Status ändert:

```typescript
// Im Fahrerportal:
useEffect(() => {
  const channel = supabase
    .channel('arbeitsnachweise_changes')
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'arbeitsnachweise',
        filter: `user_id=eq.${user.id}`
      },
      (payload) => {
        console.log('Status geändert!', payload)
        loadData() // Daten neu laden
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}, [user])
```

---

## Checkliste für Produktiv-Betrieb

- [ ] `.env.local` erstellt mit korrekten Keys
- [ ] SQL-Schema in Supabase ausgeführt
- [ ] RLS Policies aktiviert
- [ ] Test-User erstellt und Login getestet
- [ ] Alle localStorage-Aufrufe durch Supabase ersetzt
- [ ] File-Upload implementiert (optional)
- [ ] Error-Handling für alle DB-Calls
- [ ] Backup-Strategy definiert

---

## Hilfe & Support

- **Supabase Docs:** https://supabase.com/docs
- **TransNext Support:** info@transnext.de
- **SQL-Hilfe:** https://www.postgresql.org/docs/

---

**🎉 Viel Erfolg mit der Datenbank-Integration!**
