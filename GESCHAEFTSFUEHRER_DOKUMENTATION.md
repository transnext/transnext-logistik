# Geschäftsführer-System Dokumentation

## ✅ Vollständig implementiert

### 1. Datenbank-Schema (`supabase/migrations/20251208_add_geschaeftsfuehrer.sql`)

**Neue Spalte in `profiles`:**
- `festes_gehalt` (DECIMAL 10,2): Monatliches Festgehalt

**Erweitertes Zeitmodell:**
- Neuer Wert: `'geschaeftsfuehrer'`
- Check Constraint aktualisiert

**Automatische Zuweisung:**
- **Nicholas Mandzel**: Geschäftsführer, 1.500€/Monat
- **Burak Aydin**: Geschäftsführer, 600€/Monat

### 2. Gehaltssystem

| Person | Zeitmodell | Monatliches Gehalt | Touren-Zählung |
|--------|-----------|-------------------|----------------|
| Nicholas Mandzel | Geschäftsführer | 1.500€ | ❌ Nur Dokumentation |
| Burak Aydin | Geschäftsführer | 600€ | ❌ Nur Dokumentation |
| Karim Zahouani | Werkstudent | 12,82€/h | ✅ Zeiterfassung |
| Alle anderen | Minijob | KM-Range | ✅ Ja |

### 3. Admin-Dashboard Änderungen

**Fahrer erstellen/bearbeiten:**
- ✅ "Geschäftsführer" Option im Zeitmodell-Dropdown
- ✅ Festes Gehalt-Feld (erscheint nur bei Geschäftsführer/Vollzeit)
- ✅ Hinweis: "Festes monatliches Gehalt (Touren zählen nicht zum Lohn)"

**Fahrer-Tabelle:**
- ✅ Zeitmodell-Spalte mit farbigem Badge
- 🟢 Geschäftsführer (Grün)
- 🔵 Minijob (Blau)
- 🟣 Werkstudent (Lila)
- 🟠 Teilzeit (Orange)
- ⚪ Vollzeit (Grau)

**Statistiken (Gesamtlohn Genehmigt):**
- ✅ Touren von Geschäftsführern werden **NICHT** mitgezählt
- ✅ Rückläufer werden mit 0€ berechnet
- ✅ Nur Touren von normalen Fahrern zählen zum Gesamtlohn

### 4. Fahrerportal (Monatsabrechnung)

**Für Geschäftsführer:**
- ✅ Festes Gehalt wird angezeigt
- ✅ Touren-Liste wird angezeigt (nur zur Dokumentation)
- ✅ Touren zählen **NICHT** zum angezeigten Gehalt
- ✅ Keine Überschuss-Berechnung
- ✅ Keine Minijob-Grenze (538€)
- ✅ Spezieller Hinweis-Text

**Hinweis-Text:**
> "Als Geschäftsführer erhältst du ein festes monatliches Gehalt. Hochgeladene Touren dienen nur der Dokumentation und zählen nicht zum Gehalt."

### 5. Technische Details

**Interface-Änderungen (`Fahrer`):**
```typescript
interface Fahrer {
  // ... bestehende Felder
  zeitmodell?: 'minijob' | 'werkstudent' | 'teilzeit' | 'vollzeit' | 'geschaeftsfuehrer'
  festesGehalt?: number
}
```

**API-Änderungen (`src/lib/admin-api.ts`):**
- `getAdminStatistics()`: Filtert Geschäftsführer aus Lohn-Berechnung
- `createFahrer()`: Unterstützt `zeitmodell` und `festes_gehalt`
- `updateFahrer()`: Unterstützt `zeitmodell` und `festes_gehalt`

**Gehalt-Berechnung (`src/app/fahrerportal/monatsabrechnung/page.tsx`):**
```typescript
const berechneGesamtverdienst = () => {
  if (zeitmodell === 'geschaeftsfuehrer') {
    return festesGehalt  // Festes monatliches Gehalt
  } else if (zeitmodell === 'werkstudent' || zeitmodell === 'teilzeit') {
    return zeiterfassungen...  // Stundenlohn
  } else {
    return gesamtVerdienst  // KM-Range
  }
}
```

## 🚀 Deployment-Anleitung

### Schritt 1: Datenbank-Migration

1. Bei Supabase anmelden
2. SQL Editor öffnen
3. Inhalt von `supabase/migrations/20251208_add_geschaeftsfuehrer.sql` ausführen
4. Überprüfung:

```sql
-- Prüfe ob festes_gehalt Spalte existiert
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles' AND column_name = 'festes_gehalt';

-- Prüfe Geschäftsführer
SELECT full_name, zeitmodell, festes_gehalt 
FROM profiles 
WHERE zeitmodell = 'geschaeftsfuehrer';

-- Erwartetes Ergebnis:
-- Nicholas Mandzel | geschaeftsfuehrer | 1500.00
-- Burak Aydin      | geschaeftsfuehrer | 600.00
```

### Schritt 2: Application neu deployen

```bash
git pull
npm run build
# oder
netlify deploy --prod
```

## 🧪 Testing

### Test 1: Geschäftsführer-Profil überprüfen
1. Als Nicholas oder Burak anmelden
2. Monatsabrechnung öffnen
3. ✓ Festes Gehalt wird angezeigt (1.500€ bzw. 600€)
4. ✓ Touren werden angezeigt (nur Dokumentation)
5. ✓ "Gesamtverdienst" = Festes Gehalt (nicht Touren-Summe)

### Test 2: Admin-Statistiken
1. Als Admin anmelden
2. Dashboard öffnen
3. ✓ "Gesamtlohn Genehmigt" zeigt **NICHT** die Touren von Nicholas/Burak

### Test 3: Neuen Geschäftsführer anlegen
1. Admin-Dashboard → Fahrer → Neuer Fahrer
2. Zeitmodell: "Geschäftsführer" wählen
3. ✓ Festes Gehalt-Feld erscheint
4. Festes Gehalt eingeben (z.B. 2000)
5. Fahrer anlegen
6. ✓ Fahrer hat grünes "Geschäftsführer" Badge

### Test 4: Touren hochladen als Geschäftsführer
1. Als Nicholas/Burak anmelden
2. Arbeitsnachweis hochladen
3. Als Admin genehmigen
4. ✓ Tour erscheint in Monatsabrechnung
5. ✓ Gesamtverdienst bleibt = Festes Gehalt
6. ✓ "Gesamtlohn Genehmigt" (Admin) zählt Tour **NICHT**

## 📊 Übersicht aller Zeitmodelle

| Zeitmodell | Berechnung | Minijob-Grenze | Zeiterfassung | Touren zählen |
|-----------|-----------|---------------|---------------|---------------|
| **Minijob** | KM-Range + Wartezeit | ✅ 538€ | ❌ | ✅ |
| **Werkstudent** | 12,82€/Stunde | ❌ | ✅ Pflicht | ❌ |
| **Teilzeit** | 12,82€/Stunde | ❌ | ✅ Pflicht | ❌ |
| **Vollzeit** | Nach Vereinbarung | ❌ | ❌ | ✅/❌ |
| **Geschäftsführer** | **Festes Gehalt** | ❌ | ❌ | ❌ Nur Doku |

## 🔍 Wichtige Hinweise

1. **Touren von Geschäftsführern:**
   - Werden angezeigt (zur Dokumentation)
   - Können genehmigt/abgelehnt werden
   - Zählen **NICHT** zum Gehalt
   - Zählen **NICHT** zur Statistik "Gesamtlohn Genehmigt"

2. **Festes Gehalt:**
   - Wird pro Monat gezahlt
   - Ist unabhängig von Touren
   - Kann im Admin-Dashboard geändert werden

3. **Rückwirkende Anpassung:**
   - Die Migration setzt Nicholas und Burak automatisch
   - Alte Touren bleiben erhalten
   - Alte Statistiken werden neu berechnet

## 📝 Relevante Dateien

- **Migration:** `supabase/migrations/20251208_add_geschaeftsfuehrer.sql`
- **Admin-API:** `src/lib/admin-api.ts`
- **Admin-Dashboard:** `src/app/admin/dashboard/page.tsx`
- **Monatsabrechnung:** `src/app/fahrerportal/monatsabrechnung/page.tsx`
- **Interfaces:** Fahrer-Interface in allen betroffenen Dateien

## 🐛 Troubleshooting

**Problem: Festes Gehalt wird nicht angezeigt**
- Lösung: Cache leeren, neu anmelden

**Problem: Touren zählen noch zum Gehalt**
- Lösung: Migration prüfen, `zeitmodell` muss `'geschaeftsfuehrer'` sein

**Problem: Statistiken falsch**
- Lösung: Browser neu laden, Datenbank-Abfrage prüfen
