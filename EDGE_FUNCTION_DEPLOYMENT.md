# 🚀 Supabase Edge Function Deployment

## Warum brauchen wir das?

Die Edge Function ermöglicht es, Fahrer im Admin-Portal anzulegen. Sie läuft auf Supabase-Servern mit Admin-Rechten (SERVICE_ROLE_KEY) und ist sicher.

## 📦 Was wurde erstellt?

- **Datei:** `supabase/functions/create-fahrer/index.ts`
- **Zweck:** Erstellt neue Fahrer-Accounts mit Login-Daten
- **Sicherheit:** Prüft ob Aufrufer Admin ist

---

## 🔧 Deployment-Schritte

### Option 1: Über Supabase CLI (EMPFOHLEN)

#### 1. Supabase CLI installieren

```bash
# Auf deinem lokalen Rechner
npm install -g supabase
```

#### 2. Login bei Supabase

```bash
supabase login
```

Ein Browser-Fenster öffnet sich zur Authentifizierung.

#### 3. Link zum Projekt

```bash
cd transnext-logistik
supabase link --project-ref jrghrymgjkpyfnopzxyp
```

(Die Project-Ref findest du in deiner Supabase URL: `https://jrghrymgjkpyfnopzxyp.supabase.co`)

#### 4. Function deployen

```bash
supabase functions deploy create-fahrer
```

✅ **FERTIG!** Die Function ist jetzt live.

---

### Option 2: Manuelle Erstellung im Supabase Dashboard

Falls CLI nicht funktioniert:

#### 1. Gehe zu Supabase Dashboard

https://supabase.com/dashboard/project/jrghrymgjkpyfnopzxyp/functions

#### 2. Klicke auf "Create a new function"

- **Name:** `create-fahrer`
- **Region:** Wähle die nächstgelegene Region

#### 3. Kopiere den Code

Öffne die Datei `supabase/functions/create-fahrer/index.ts` und kopiere den gesamten Inhalt.

#### 4. Füge den Code ein

Füge den kopierten Code in das Editor-Feld im Supabase Dashboard ein.

#### 5. Deploy

Klicke auf **"Deploy function"**

---

## ✅ Testen ob es funktioniert

Nach dem Deployment:

1. **Gehe zum Admin-Portal:** https://transnext.de/admin
2. **Login als Admin**
3. **Klicke auf "Fahrer" Tab**
4. **Klicke auf "Neuen Fahrer anlegen"**
5. **Fülle das Formular aus**
6. **Klicke auf "Fahrer anlegen"**

**Erwartetes Ergebnis:**
- ✅ "Fahrer erfolgreich angelegt!" Meldung
- ✅ Fahrer erscheint in der Liste
- ✅ Fahrer kann sich sofort einloggen

---

## 🐛 Fehlersuche

### Fehler: "Function not found"

➡️ Die Function wurde noch nicht deployed
➡️ **Lösung:** Folge den Deployment-Schritten oben

### Fehler: "Keine Admin-Berechtigung"

➡️ Dein Admin-Account hat nicht die richtige Rolle
➡️ **Lösung:** Prüfe in Supabase ob dein User `role = 'admin'` hat

### Fehler: "Email already exists"

➡️ Ein User mit dieser Email existiert bereits
➡️ **Lösung:** Verwende eine andere Email-Adresse

---

## 📍 Wichtige URLs

- **Supabase Dashboard:** https://supabase.com/dashboard/project/jrghrymgjkpyfnopzxyp
- **Functions:** https://supabase.com/dashboard/project/jrghrymgjkpyfnopzxyp/functions
- **Logs:** https://supabase.com/dashboard/project/jrghrymgjkpyfnopzxyp/logs/edge-functions

---

## 🔒 Sicherheit

Die Edge Function:
- ✅ Prüft ob Aufrufer eingeloggt ist
- ✅ Prüft ob Aufrufer Admin-Rolle hat
- ✅ Verwendet SERVICE_ROLE_KEY NUR serverseitig
- ✅ Erstellt User mit Auto-Bestätigung
- ✅ Löscht User bei Fehler (Cleanup)

**Der SERVICE_ROLE_KEY bleibt sicher auf Supabase-Servern!**
