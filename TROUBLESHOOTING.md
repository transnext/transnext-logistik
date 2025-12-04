# 🔧 Troubleshooting Guide - Netlify Deployment

## 🚨 Build schlägt fehl: "Exit Code 2"

### Symptom
```
Build script returned non-zero exit code: 2
```

### Ursache
Dies ist ein generischer Fehler, der mehrere Ursachen haben kann.

### Lösungen (in Reihenfolge probieren)

#### 1. Umgebungsvariablen fehlen ⚠️ HÄUFIGSTE URSACHE
**Prüfen:**
- Site Settings → Environment variables
- Beide Variablen vorhanden?
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

**Lösung:**
```
Umgebungsvariablen hinzufügen (siehe DEPLOYMENT_CHECKLIST.md)
→ Clear cache and deploy site
```

#### 2. Node Version Konflikt
**Prüfen:**
- Build-Log nach "Node version" suchen
- Sollte sein: v20.x.x

**Lösung:**
```
✅ .nvmrc wurde erstellt (enthält "20")
✅ netlify.toml hat NODE_VERSION = "20"
→ Clear cache and deploy site
```

#### 3. Cache-Probleme
**Symptom:**
- Build funktioniert lokal
- Build schlägt auf Netlify fehl

**Lösung:**
```
Deploys → Trigger deploy → "Clear cache and deploy site"
```

#### 4. Bun vs. NPM Konflikt
**Prüfen:**
- Build-Log nach "npm install" oder "bun install" suchen

**Lösung:**
Netlify verwendet standardmäßig npm, auch wenn "bun run build" im Build-Command steht.
Das ist OK - `package.json` ist kompatibel mit beiden.

---

## 🔴 Build erfolgreich, aber Website lädt nicht

### Symptom
- Build: ✅ Erfolgreich
- Deploy: ✅ Published
- Website: ❌ 404 oder weiße Seite

### Lösungen

#### 1. Publish Directory falsch
**Prüfen:**
- netlify.toml: `publish = ".next"`
- Site Settings → Build & deploy → Publish directory

**Lösung:**
```
✅ netlify.toml ist korrekt konfiguriert
Falls manuell geändert: Zurücksetzen auf ".next"
```

#### 2. Plugin nicht installiert
**Prüfen:**
- Build-Log nach "@netlify/plugin-nextjs" suchen

**Lösung:**
```
✅ Plugin ist in netlify.toml konfiguriert
Netlify installiert es automatisch
```

#### 3. Browser-Cache
**Lösung:**
```
Ctrl + Shift + R (Windows/Linux)
Cmd + Shift + R (Mac)
```

---

## 🔐 Admin-Login funktioniert nicht

### Symptom
```
"Ungültige Zugangsdaten oder keine Admin-Berechtigung"
```

### Prüfschritte

#### 1. Umgebungsvariablen gesetzt?
```
F12 → Console
Suche nach: "NEXT_PUBLIC_SUPABASE_URL"

Wenn undefined:
→ Umgebungsvariablen fehlen in Netlify
→ Siehe Schritt "Umgebungsvariablen setzen"
```

#### 2. Supabase-Verbindung testen
```
F12 → Network Tab
Login versuchen
Suche nach Request zu: "jrghrymgjkpyfnopzxyp.supabase.co"

Wenn kein Request:
→ Supabase-Client nicht initialisiert
→ Umgebungsvariablen prüfen

Wenn 401/403:
→ Credentials falsch
→ Supabase Dashboard prüfen
```

#### 3. User & Profile prüfen
**In Supabase Dashboard:**
1. Authentication → Users
   - User `n.mandzel@transnext.de` existiert? ✅
   - Email confirmed? ✅

2. Table Editor → profiles
   - Profil für User existiert? ✅
   - `role = 'admin'`? ✅

#### 4. RLS (Row Level Security) prüfen
**In Supabase Dashboard:**
1. Table Editor → profiles → View policies
2. Policy für SELECT sollte erlauben: `auth.uid() = user_id`

---

## 📦 Deployment dauert zu lange

### Normal
- Erste Deployment: 3-5 Minuten
- Weitere Deployments: 1-2 Minuten

### Zu langsam (>10 Minuten)?

**Mögliche Ursachen:**
1. Große `node_modules` (normal für Next.js)
2. Netlify Build Queue (viele Builds)
3. Netzwerk-Probleme

**Lösung:**
- Warten und beobachten
- Bei Timeout (>15 min): Deploy abbrechen und neu starten

---

## ⚠️ Build-Warnungen ignorieren

### Diese Warnungen sind OK:

```
⚠ Unsupported metadata viewport is configured in metadata export
```
**Grund:** Next.js 15 Deprecation Warning
**Impact:** Keine - funktioniert trotzdem
**Fix:** Optional - Später migrieren zu `generateViewport()`

```
⚠ Fast Refresh had to perform a full reload
```
**Grund:** Development-only Warning
**Impact:** Keine - betrifft nur `npm run dev`

---

## 🐛 Debug-Modus aktivieren

### Lokaler Build mit Verbose-Output
```bash
cd transnext-logistik
DEBUG=* bun run build
```

### Netlify Build-Log speichern
1. Deploys → [Neuester Deploy]
2. Scroll zum Build-Log
3. "Download build log" (oben rechts)

### Browser-Console aktivieren
```
F12 → Console Tab
Preserve log aktivieren ✅
Network Tab → Preserve log aktivieren ✅
```

---

## 📞 Letzte Lösung: Manual Deploy

Falls alle Automatisierungen fehlschlagen:

### Option 1: Netlify Drop
```bash
# Lokal bauen
cd transnext-logistik
bun run build

# .next Ordner zippen
zip -r deploy.zip .next

# Hochladen
1. Gehe zu: https://app.netlify.com/drop
2. Wähle site: transnext
3. Drag & drop: deploy.zip
```

### Option 2: Netlify CLI
```bash
# Installieren
npm install -g netlify-cli

# Login
netlify login

# Deploy
cd transnext-logistik
netlify deploy --prod --site=transnext
```

---

## 🆘 Support kontaktieren

### Vor Support-Anfrage sammeln:

1. **Build-Log** (vollständig)
   - Download von Netlify Deploys

2. **Browser Console-Log**
   - F12 → Console → Screenshot

3. **Network-Fehler**
   - F12 → Network → Filter: "Failed" → Screenshot

4. **Deployment-Info**
   - Site ID: `20ac1966-14ce-48a9-88bb-b2f467d558af`
   - Site Name: transnext
   - URL: https://transnext.de

### Netlify Support
- **Forum:** https://answers.netlify.com
- **Discord:** https://netlifriends.com
- **Docs:** https://docs.netlify.com

---

## ✅ Checkliste: "Alles probiert?"

- [ ] Umgebungsvariablen gesetzt
- [ ] Clear cache and deploy
- [ ] Browser-Cache geleert (Ctrl+Shift+R)
- [ ] Build-Log geprüft (keine Fehler?)
- [ ] Lokaler Build erfolgreich
- [ ] .nvmrc & netlify.toml korrekt
- [ ] Node Version 20
- [ ] Supabase Dashboard geprüft

**Wenn alle ✅ → Contact Support**

---

## 💡 Schnell-Fixes

| Problem | Fix |
|---------|-----|
| Build Exit Code 2 | Umgebungsvariablen setzen + Clear cache |
| 404 Error | publish = ".next" in netlify.toml |
| Login Error | Browser Console prüfen → Supabase Vars |
| Langsam | Normal - 3-5 min beim ersten Mal |
| TypeScript Error | `bunx tsc --noEmit` lokal testen |

---

**Wichtigste Regel:**
Wenn der lokale Build funktioniert (`bun run build`), liegt das Problem bei:
1. Umgebungsvariablen (90%)
2. Netlify-Konfiguration (9%)
3. Anderes (1%)

→ **Start immer mit Umgebungsvariablen prüfen!**
