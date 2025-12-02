# 👥 Fahrer-Management System - Dokumentation

## 🎯 Übersicht

Das Admin-Portal verfügt jetzt über ein vollständiges Fahrer-Verwaltungs-System.

---

## ✅ Funktionen (Demo-Version)

### 1. Fahrer anlegen
**Erfasste Daten:**
- **Persönliche Daten:**
  - Vorname, Nachname
  - Geburtsdatum
  - Adresse (Straße, PLZ, Ort)

- **Führerschein-Daten:**
  - Führerschein-Nummer
  - Ausstellungsdatum
  - Ausstellende Behörde
  - Führerscheinklassen (B, BE, C, CE, C1, C1E, D, DE, D1, D1E, AM, A1, A2, A, L, T)

- **Personalausweis-Daten:**
  - Ausweisnummer
  - Ablaufdatum

- **Zugangsdaten für Fahrerportal:**
  - Benutzername
  - Passwort (mit Sichtbarkeits-Toggle)

### 2. Fahrer-Liste
- Übersicht aller registrierten Fahrer
- Anzeige aller wichtigen Daten in Tabelle
- Filter nach Status (Aktiv/Inaktiv)
- Suche nach Name oder Benutzername

### 3. Fahrer deaktivieren/aktivieren
- **Deaktivieren:** Fahrer kann sich nicht mehr anmelden
- **Daten bleiben erhalten:** Alle Informationen werden gespeichert
- **Reaktivieren:** Jederzeit wieder möglich

---

## 🧪 Testen der Fahrer-Verwaltung

### Schritt 1: Fahrer anlegen
1. Admin-Portal öffnen: `/admin/dashboard`
2. Tab "Fahrer" klicken
3. Button "Neuen Fahrer anlegen" klicken
4. Formular ausfüllen (alle Felder mit * sind Pflicht)
5. Mindestens eine Führerscheinklasse auswählen
6. "Fahrer anlegen" klicken

**Beispiel-Daten:**
```
Vorname: Max
Nachname: Mustermann
Geburtsdatum: 01.01.1990
Adresse: Musterstr. 123
PLZ: 44809
Ort: Bochum
Führerschein-Nr: D123456789
Ausstellungsdatum: 01.01.2010
Ausstellende Behörde: Stadt Bochum
Klassen: B, BE, C, CE
Ausweisnummer: L987654321
Ablaufdatum: 01.01.2030
Benutzername: max.mustermann
Passwort: TestPasswort123
```

### Schritt 2: Fahrer in Liste prüfen
1. Fahrer erscheint in der Tabelle
2. Status zeigt "Aktiv" (grün)
3. Alle Daten sind sichtbar

### Schritt 3: Fahrer deaktivieren
1. Button "Deaktivieren" klicken
2. Status ändert sich zu "Inaktiv" (grau)
3. Zeile wird grau hinterlegt
4. Button ändert sich zu "Aktivieren"

### Schritt 4: Login testen (nach Datenbank-Integration)
1. Fahrerportal öffnen: `/fahrerportal`
2. Mit Benutzername und Passwort anmelden
3. Nur aktive Fahrer können sich anmelden

---

## 💾 Aktuelle Speicherung (Demo)

**localStorage:**
```javascript
localStorage.getItem("fahrer")
// Gibt Array mit allen Fahrern zurück
```

**Struktur:**
```json
[
  {
    "id": 1732123456789,
    "vorname": "Max",
    "nachname": "Mustermann",
    "geburtsdatum": "1990-01-01",
    "adresse": "Musterstr. 123",
    "plz": "44809",
    "ort": "Bochum",
    "fuehrerscheinNr": "D123456789",
    "fuehrerscheinDatum": "2010-01-01",
    "ausstellendeBehoerde": "Stadt Bochum",
    "fuehrerscheinklassen": ["B", "BE", "C", "CE"],
    "ausweisnummer": "L987654321",
    "ausweisAblauf": "2030-01-01",
    "benutzername": "max.mustermann",
    "passwort": "TestPasswort123",
    "status": "aktiv",
    "erstelltAm": "2025-11-26T10:30:00.000Z"
  }
]
```

---

## 🗄️ Datenbank-Integration (Supabase)

### SQL-Schema für Fahrer-Tabelle

```sql
-- Fahrer-Tabelle
CREATE TABLE fahrer (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users UNIQUE,
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

-- Index für schnelle Suche
CREATE INDEX idx_fahrer_status ON fahrer(status);
CREATE INDEX idx_fahrer_user_id ON fahrer(user_id);

-- RLS aktivieren
ALTER TABLE fahrer ENABLE ROW LEVEL SECURITY;

-- Policy: Admins können alles, Fahrer nur eigene Daten
CREATE POLICY "Admins verwalten Fahrer" ON fahrer
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Fahrer sehen eigene Daten" ON fahrer
  FOR SELECT USING (user_id = auth.uid());

-- Trigger für updated_at
CREATE TRIGGER update_fahrer_updated_at
  BEFORE UPDATE ON fahrer
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

### Fahrer anlegen (mit Supabase Auth)

```typescript
// In Admin-Dashboard
const createFahrer = async (formData: Partial<Fahrer>) => {
  // 1. User in Auth erstellen
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: `${formData.benutzername}@transnext.local`, // Oder echte E-Mail
    password: formData.passwort,
    email_confirm: true,
    user_metadata: {
      full_name: `${formData.vorname} ${formData.nachname}`,
      role: 'fahrer'
    }
  })

  if (authError) throw authError

  // 2. Profil erstellen
  const { error: profileError } = await supabase
    .from('profiles')
    .insert([{
      id: authData.user.id,
      role: 'fahrer',
      full_name: `${formData.vorname} ${formData.nachname}`
    }])

  if (profileError) throw profileError

  // 3. Fahrer-Daten speichern
  const { error: fahrerError } = await supabase
    .from('fahrer')
    .insert([{
      user_id: authData.user.id,
      vorname: formData.vorname,
      nachname: formData.nachname,
      geburtsdatum: formData.geburtsdatum,
      adresse: formData.adresse,
      plz: formData.plz,
      ort: formData.ort,
      fuehrerschein_nr: formData.fuehrerscheinNr,
      fuehrerschein_datum: formData.fuehrerscheinDatum,
      ausstellende_behoerde: formData.ausstellendeBehoerde,
      fuehrerscheinklassen: formData.fuehrerscheinklassen,
      ausweisnummer: formData.ausweisnummer,
      ausweis_ablauf: formData.ausweisAblauf,
      status: 'aktiv'
    }])

  if (fahrerError) throw fahrerError

  return authData.user.id
}
```

### Fahrer deaktivieren

```typescript
const deactivateFahrer = async (userId: string) => {
  // 1. Fahrer-Status ändern
  const { error: statusError } = await supabase
    .from('fahrer')
    .update({ status: 'inaktiv' })
    .eq('user_id', userId)

  if (statusError) throw statusError

  // 2. User in Auth deaktivieren (optional)
  const { error: authError } = await supabase.auth.admin.updateUserById(
    userId,
    { ban_duration: 'none' } // Oder '24h', '7d' etc. für temporäre Sperre
  )

  if (authError) throw authError
}
```

### Fahrer-Login (Fahrerportal)

```typescript
// In /fahrerportal/page.tsx
const handleLogin = async (benutzername: string, passwort: string) => {
  // 1. Login mit Supabase Auth
  const { data, error } = await supabase.auth.signInWithPassword({
    email: `${benutzername}@transnext.local`, // Oder echte E-Mail
    password: passwort,
  })

  if (error) {
    setError('Ungültige Anmeldedaten')
    return
  }

  // 2. Fahrer-Status prüfen
  const { data: fahrer, error: fahrerError } = await supabase
    .from('fahrer')
    .select('status')
    .eq('user_id', data.user.id)
    .single()

  if (fahrerError || fahrer.status !== 'aktiv') {
    setError('Dieser Account ist deaktiviert')
    await supabase.auth.signOut()
    return
  }

  // 3. Erfolgreich eingeloggt
  router.push('/fahrerportal/dashboard')
}
```

### Fahrer-Liste laden

```typescript
const loadFahrer = async () => {
  const { data, error } = await supabase
    .from('fahrer')
    .select(`
      *,
      profiles(full_name)
    `)
    .order('created_at', { ascending: false })

  if (error) throw error

  setFahrer(data)
}
```

---

## 🔐 Sicherheit

### Passwort-Speicherung
**Aktuell (Demo):**
- ⚠️ Klartext in localStorage (NICHT für Produktion!)

**Mit Datenbank:**
- ✅ Passwörter werden von Supabase Auth gehasht
- ✅ Niemals im Klartext gespeichert
- ✅ Bcrypt-Hashing

### Zugriffskontrolle
**Mit RLS (Row Level Security):**
- Admins können alle Fahrer verwalten
- Fahrer können nur eigene Daten sehen
- Inaktive Fahrer können sich nicht anmelden

---

## 📋 Checkliste für Produktiv-Betrieb

- [ ] Supabase-Projekt erstellt
- [ ] SQL-Schema für `fahrer` Tabelle ausgeführt
- [ ] RLS Policies aktiviert
- [ ] Test-Fahrer angelegt
- [ ] Login im Fahrerportal getestet
- [ ] Deaktivierungs-Funktion getestet
- [ ] E-Mail-System für Passwort-Reset (optional)
- [ ] Ablaufdatum-Überwachung für Führerschein/Ausweis (optional)

---

## 🎯 Workflow für neue Fahrer

1. **Admin legt Fahrer an:**
   - Alle Daten erfassen
   - Account wird erstellt
   - Status: "Aktiv"

2. **Fahrer erhält Zugangsdaten:**
   - Per E-Mail oder persönlich
   - Benutzername + temporäres Passwort

3. **Erster Login:**
   - Fahrer meldet sich an
   - Optional: Passwort ändern

4. **Bei Ausscheiden:**
   - Admin deaktiviert Fahrer
   - Daten bleiben erhalten
   - Login nicht mehr möglich

5. **Reaktivierung:**
   - Jederzeit durch Admin möglich
   - Alle Daten noch vorhanden

---

## 💡 Erweiterungsmöglichkeiten

### Zusätzliche Features:
1. **Ablaufdatum-Warnung:**
   - Automatische Benachrichtigung 30 Tage vor Ablauf
   - Für Führerschein und Ausweis

2. **Dokumente-Upload:**
   - Führerschein-Scan hochladen
   - Ausweis-Scan speichern
   - Mit Supabase Storage

3. **Fahrer-Historie:**
   - Alle Touren eines Fahrers anzeigen
   - Statistiken pro Fahrer

4. **Bulk-Import:**
   - Mehrere Fahrer per CSV importieren

5. **Berechtigungen:**
   - Verschiedene Admin-Rollen
   - Nur bestimmte Admins dürfen Fahrer anlegen

---

## 🆘 Fehlerbehebung

### Fahrer kann sich nicht anmelden
1. Status prüfen (muss "Aktiv" sein)
2. Benutzername/Passwort korrekt?
3. In Datenbank: User-Account existiert?

### Fahrer verschwindet aus Liste
1. Filter prüfen (Aktiv/Inaktiv)
2. Suchfeld leeren
3. Browser-Cache leeren

### Formular lässt sich nicht absenden
1. Alle Pflichtfelder (*) ausgefüllt?
2. Mindestens eine Führerscheinklasse ausgewählt?
3. Datumsfelder im korrekten Format?

---

**System ist bereit für Datenbank-Integration!** 🚀
