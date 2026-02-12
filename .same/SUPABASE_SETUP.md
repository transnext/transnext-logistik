# 🚀 Supabase Setup-Anleitung für TransNext Logistik

## ✅ Was wurde bereits erledigt:

1. ✅ Supabase Client installiert (`@supabase/supabase-js`)
2. ✅ `.env.local` Datei mit Ihren API-Keys erstellt
3. ✅ Supabase Client konfiguriert (`src/lib/supabase.ts`)
4. ✅ Datenbank-Schema erstellt (`.same/supabase-schema.sql`)

---

## 📋 SCHRITT-FÜR-SCHRITT ANLEITUNG

### Schritt 1: SQL-Schema in Supabase ausführen

1. **Öffnen Sie Ihr Supabase Dashboard:**
   - URL: https://supabase.com/dashboard/project/jrghryomgjkpyfnopzxyp

2. **Gehen Sie zum SQL Editor:**
   - Klicken Sie in der linken Sidebar auf **"SQL Editor"**
   - Klicken Sie auf **"+ New Query"**

3. **SQL-Schema ausführen:**
   - Öffnen Sie die Datei `.same/supabase-schema.sql` in Same
   - Kopieren Sie den **GESAMTEN INHALT** der Datei
   - Fügen Sie ihn in den SQL Editor ein
   - Klicken Sie auf **"Run"** (oder drücken Sie `Ctrl+Enter`)

4. **Erfolgsmeldung prüfen:**
   - Sie sollten eine Bestätigung sehen: "Success. No rows returned"
   - Die Tabellen sind nun erstellt! ✅

---

### Schritt 2: Tabellen überprüfen

1. **Gehen Sie zum Table Editor:**
   - Klicken Sie in der linken Sidebar auf **"Table Editor"**

2. **Verifizieren Sie folgende Tabellen:**
   - ✅ `drivers` - Fahrer-Stammdaten
   - ✅ `admins` - Admin-Benutzer
   - ✅ `tours` - Arbeitsnachweise
   - ✅ `expenses` - Auslagennachweise

3. **Demo-Daten prüfen:**
   - Klicken Sie auf die Tabelle `drivers`
   - Sie sollten 2 Demo-Fahrer sehen
   - Klicken Sie auf `tours` → 3 Demo-Touren
   - Klicken Sie auf `expenses` → 3 Demo-Auslagen

---

### Schritt 3: Authentication einrichten (optional)

Für echte Benutzer-Authentifizierung:

1. **Gehen Sie zu Authentication → Settings:**
   - URL: https://supabase.com/dashboard/project/jrghryomgjkpyfnopzxyp/auth/users

2. **E-Mail-Provider aktivieren:**
   - Gehen Sie zu **Authentication → Providers**
   - Stellen Sie sicher, dass **"Email"** aktiviert ist

3. **Erste Benutzer anlegen:**
   - Gehen Sie zu **Authentication → Users**
   - Klicken Sie auf **"Add user"**
   - Geben Sie E-Mail und Passwort ein
   - Klicken Sie auf **"Create user"**

---

### Schritt 4: Storage für Belege einrichten (optional)

Für File-Uploads (Belege, Dokumente):

1. **Gehen Sie zu Storage:**
   - Klicken Sie in der Sidebar auf **"Storage"**

2. **Bucket erstellen:**
   - Klicken Sie auf **"New bucket"**
   - Name: `receipts`
   - Public Bucket: **Nein** (nur authentifizierte Benutzer)
   - Klicken Sie auf **"Create bucket"**

3. **Policies erstellen:**
   ```sql
   -- Fahrer können ihre eigenen Belege hochladen
   CREATE POLICY "Drivers can upload their receipts"
   ON storage.objects FOR INSERT
   TO authenticated
   WITH CHECK (
     bucket_id = 'receipts' AND
     (storage.foldername(name))[1] = auth.uid()::text
   );

   -- Fahrer können ihre eigenen Belege sehen
   CREATE POLICY "Drivers can view their receipts"
   ON storage.objects FOR SELECT
   TO authenticated
   USING (
     bucket_id = 'receipts' AND
     (storage.foldername(name))[1] = auth.uid()::text
   );

   -- Admins können alle Belege sehen (muss noch implementiert werden)
   ```

---

## 🔐 WICHTIG: Passwort-Hashing

Die Demo-Passwörter im Schema sind Platzhalter!

**Für Produktiv-Einsatz:**
- Verwenden Sie Supabase Authentication (empfohlen)
- Oder implementieren Sie bcrypt für Passwort-Hashing
- **NIEMALS** Passwörter im Klartext speichern!

---

## 🎯 Nächste Schritte

Nach der Datenbank-Einrichtung:

1. **Fahrerportal mit Supabase verbinden:**
   - Login-Funktion auf Supabase Auth umstellen
   - LocalStorage durch Supabase-Queries ersetzen

2. **Admin-Portal mit Supabase verbinden:**
   - Admin-Authentifizierung implementieren
   - Status-Updates direkt in die Datenbank schreiben

3. **File-Upload implementieren:**
   - Beleg-Upload zu Supabase Storage
   - Thumbnail-Vorschau für hochgeladene Dateien

4. **E-Mail-Benachrichtigungen:**
   - Bei neuer Tour → E-Mail an Admin
   - Bei Status-Änderung → E-Mail an Fahrer

---

## 🛠️ Troubleshooting

### Problem: "relation already exists"
**Lösung:** Schema wurde bereits ausgeführt. Kein Problem! ✅

### Problem: "permission denied"
**Lösung:**
- Stellen Sie sicher, dass Sie als Projekt-Owner eingeloggt sind
- Prüfen Sie die RLS Policies

### Problem: "No rows returned"
**Lösung:** Das ist normal! Es bedeutet, dass das Schema erfolgreich erstellt wurde. ✅

---

## 📞 Support

Bei Fragen zur Supabase-Einrichtung:
- Supabase Docs: https://supabase.com/docs
- Supabase Community: https://github.com/supabase/supabase/discussions

---

**Status:** 🟡 Datenbank muss noch eingerichtet werden
**Dauer:** ~5-10 Minuten
**Schwierigkeit:** Einfach - nur Copy & Paste! 😊
