# Zeitmodell-System Migration & Deployment Anleitung

## ✅ Bereits implementiert (Code)

### 1. Datenbank-Schema
- **Migration-Datei:** `supabase/migrations/20251208_add_zeitmodell_and_tracking.sql`
- **Neue Spalte:** `zeitmodell` in `profiles` Tabelle
- **Neue Tabelle:** `zeiterfassung` für Arbeitszeiterfassung
- **RLS Policies:** Vollständige Row Level Security für `zeiterfassung`

### 2. Backend/API
- **Zeiterfassungs-API:** `src/lib/zeiterfassung-api.ts`
  - Start/Stop/Pause-Funktionen
  - Arbeitszeitberechnung (12,82€/Stunde)
- **Admin-API:** Erweitert um `zeitmodell` Parameter

### 3. Frontend
- **Admin-Dashboard:**
  - Zeitmodell-Auswahl beim Fahrer erstellen
  - Zeitmodell-Bearbeitung
  - Zeitmodell-Anzeige in Fahrer-Tabelle
  
- **Fahrerportal:**
  - Zeiterfassungs-Widget mit Live-Timer
  - Arbeitstage-Liste
  - Gehaltsberechnung je nach Zeitmodell

## 🔧 Nächste Schritte (Deployment)

### Schritt 1: Datenbank-Migration durchführen

1. **Login bei Supabase:**
   ```
   https://app.supabase.com
   ```

2. **SQL Editor öffnen:**
   - Projekt auswählen
   - "SQL Editor" im Menü anklicken
   - "New Query" erstellen

3. **Migration ausführen:**
   - Inhalt von `supabase/migrations/20251208_add_zeitmodell_and_tracking.sql` kopieren
   - In den SQL Editor einfügen
   - "Run" klicken

4. **Überprüfung:**
   ```sql
   -- Prüfen, ob zeitmodell Spalte existiert
   SELECT column_name, data_type 
   FROM information_schema.columns 
   WHERE table_name = 'profiles' AND column_name = 'zeitmodell';

   -- Prüfen, ob zeiterfassung Tabelle existiert
   SELECT * FROM zeiterfassung LIMIT 1;

   -- Prüfen, ob Karim auf Werkstudent gesetzt wurde
   SELECT full_name, zeitmodell FROM profiles WHERE full_name LIKE '%Karim%';
   ```

### Schritt 2: Edge Function aktualisieren (falls deployed)

Falls die `create-fahrer` Edge Function bereits deployed ist, muss sie aktualisiert werden:

```bash
cd supabase/functions/create-fahrer
# Lokal anpassen (bereits im Code erledigt)
# Dann deployen:
supabase functions deploy create-fahrer
```

### Schritt 3: Application neu deployen

```bash
# Build und Deploy (je nach Hosting)
npm run build
# oder
netlify deploy --prod
```

## 📊 Zeitmodelle im Detail

### Minijob (Standard)
- **Berechnung:** KM-Range-Tabelle + Wartezeit
- **Limit:** 538€/Monat (automatische Überschussberechnung)
- **UI:** Nur Touren-Liste

### Werkstudent / Teilzeit
- **Berechnung:** 12,82€ pro Stunde
- **Zeiterfassung:** Pflicht (Start/Stop/Pause)
- **UI:** Zeiterfassungs-Widget + Arbeitstage-Liste
- **Kein Limit:** Volle Stundenabrechnung

### Vollzeit
- **Berechnung:** Nach individueller Vereinbarung
- **UI:** Standard-Ansicht

## 🧪 Testing Checkliste

Nach der Migration sollten Sie testen:

- [ ] Neuen Fahrer als Minijob anlegen
- [ ] Neuen Fahrer als Werkstudent anlegen
- [ ] Zeitmodell eines bestehenden Fahrers ändern
- [ ] Als Werkstudent anmelden und Zeiterfassung starten
- [ ] Pause starten/beenden
- [ ] Arbeitstag beenden
- [ ] Monatsabrechnung für beide Zeitmodelle prüfen
- [ ] Gesamtverdienst-Berechnung überprüfen

## 🐛 Troubleshooting

### Migration schlägt fehl
```sql
-- Rollback bei Problemen:
ALTER TABLE profiles DROP COLUMN IF EXISTS zeitmodell;
DROP TABLE IF EXISTS zeiterfassung CASCADE;
```

### Zeitmodell wird nicht angezeigt
- Cache leeren (Ctrl+Shift+R)
- Logout/Login im Fahrerportal
- Browser DevTools Console auf Fehler prüfen

### Zeiterfassung funktioniert nicht
1. RLS Policies prüfen:
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'zeiterfassung';
   ```

2. User-ID überprüfen:
   ```sql
   SELECT auth.uid();
   ```

## 📝 Wichtige Hinweise

1. **Karim Zahouani** wird automatisch auf Werkstudent gesetzt
2. **Alle anderen Fahrer** bleiben Minijob (Standard)
3. **Zeiterfassungen** können nur vom Fahrer selbst erstellt werden
4. **Admins** können alle Zeiterfassungen sehen
5. **Stundenlohn** ist fix auf 12,82€ eingestellt

## 🔗 Relevante Dateien

- Migration: `supabase/migrations/20251208_add_zeitmodell_and_tracking.sql`
- API: `src/lib/zeiterfassung-api.ts`
- Widget: `src/components/zeiterfassung-widget.tsx`
- Monatsabrechnung: `src/app/fahrerportal/monatsabrechnung/page.tsx`
- Admin Dashboard: `src/app/admin/dashboard/page.tsx`
