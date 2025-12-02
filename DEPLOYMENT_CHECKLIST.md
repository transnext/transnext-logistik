# ✅ Netlify Deployment Checklist

## Vor dem Deployment

- [x] `netlify.toml` konfiguriert
- [x] `.nvmrc` erstellt (Node 20)
- [x] Lokaler Build erfolgreich (`bun run build`)
- [x] Keine TypeScript-Fehler (`bunx tsc --noEmit`)
- [x] Package.json Scripts korrekt

## In Netlify Dashboard

### 1. Umgebungsvariablen setzen ⚠️ KRITISCH

Gehe zu: **Site Settings → Environment variables**

Füge hinzu:

```
NEXT_PUBLIC_SUPABASE_URL=https://jrghrymgjkpyfnopzxyp.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpyZ2hyeW1namtweWZub3B6eHlwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQxNjI0OTEsImV4cCI6MjA3OTczODQ5MX0.HozQj-Z-9GChXgB_XGgq1s30bv5bSRUkPDGc792WOJM
```

Scopes: ✅ Production, ✅ Deploy previews, ✅ Branch deploys

### 2. Build Settings prüfen

- **Build command:** `bun run build` (aus netlify.toml)
- **Publish directory:** `.next` (aus netlify.toml)
- **Node version:** 20 (aus .nvmrc)

### 3. Deployment auslösen

Option A: **Clear Cache & Deploy** (empfohlen)
- Deploys → Trigger deploy → Clear cache and deploy site

Option B: **Git Push**
```bash
git add .
git commit -m "chore: Deployment-Konfiguration optimiert"
git push
```

## Nach dem Deployment

### ✅ Verifikation

1. **Build-Log prüfen**
   - Gehe zu: Deploys → [Neuester Deploy]
   - Suche nach: `✓ Compiled successfully`
   - Erwarte: `Route (app)` mit 24 Seiten

2. **Website testen**
   ```
   https://transnext.de/
   → Sollte laden ✅
   ```

3. **Admin-Login testen**
   ```
   https://transnext.de/admin
   → Login mit n.mandzel@transnext.de
   → Redirect zu /admin/dashboard ✅
   ```

4. **Console-Fehler prüfen**
   - F12 → Console
   - Keine Supabase-Fehler ✅

5. **Network prüfen**
   - F12 → Network
   - Login-Request zu `jrghrymgjkpyfnopzxyp.supabase.co`
   - Status: 200 ✅

## Häufige Fehler

| Fehler | Lösung |
|--------|--------|
| Exit code: 2 | Umgebungsvariablen fehlen → Schritt 1 |
| Module not found | `bun install` lokal, dann pushen |
| 404 bei /admin | Clear Netlify cache & redeploy |
| Login funktioniert nicht | Browser-Cache leeren (Ctrl+Shift+R) |

## Erfolg! 🎉

Wenn alle Punkte ✅ sind:
- Website ist live
- Admin-Portal funktioniert
- Fahrer-Portal funktioniert

---

**Zeit: ~5 Minuten**
**Schwierigkeit: Einfach**
**Wichtigster Schritt: Umgebungsvariablen setzen!**
