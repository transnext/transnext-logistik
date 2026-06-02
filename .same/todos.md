# Transnext Logistik - Fix Protokoll

## Erledigt

### 2026-06-02: Bugfix - Vergütungsmodell & zeitmodell Fehler

**Problem A: Admin-Fehler beim Speichern**
- Fehlermeldung: `Could not find the 'zeitmodell' column of 'fahrer' in the schema cache`
- Ursache: `updateFahrer()` in `admin-api.ts` versuchte, `zeitmodell` in der `fahrer`-Tabelle zu speichern
- `zeitmodell` existiert aber nur in der `profiles`-Tabelle, nicht in `fahrer`

**Problem B: Fahrerportal - Dustin Wett sah keine Festgehalt-Ansicht**
- Ursache: In `dashboard/page.tsx` fehlten die Imports für `shouldShowTourBasedSalary`, `CompensationModel`, `getUserProfile`
- Das Profil wurde nicht geladen, daher blieb `compensationModel` immer `null`
- Bei `null` wird standardmäßig `tour_based_minijob` angenommen

**Problem C: Duplikate in fahrer-management-api.ts**
- Die Funktionen `getCompensationModelLabel`, `getFahrerCompensationModel`, `updateFahrerCompensationModel` waren doppelt definiert
- Build schlug fehl

**Problem D: Minijob-Grenze veraltet**
- `MONTHLY_LIMIT` war noch auf 556€ statt 603€

**Lösungen:**
1. `admin-api.ts - updateFahrer()`:
   - `zeitmodell` aus den Parametern entfernt
   - SELECT-Statement korrigiert (kein `zeitmodell` in `fahrer`)
   - Audit-Log bereinigt
   - Hinweis hinzugefügt: `zeitmodell` wird über `updateFahrerZeitmodell()` in `profiles` gespeichert

2. `dashboard/page.tsx`:
   - Imports hinzugefügt: `getUserProfile`, `shouldShowTourBasedSalary`, `CompensationModel`
   - Profil-Loading in `checkAuthAndLoad()` hinzugefügt
   - `setCompensationModel()` wird jetzt korrekt aufgerufen

3. `fahrer-management-api.ts`:
   - Doppelte Funktionsdefinitionen entfernt (Zeilen 493-605 gelöscht)

4. `salary-calculator.ts`:
   - `MONTHLY_LIMIT` von 556 auf 603 aktualisiert (aktuelle Minijob-Grenze 2024/2025)

**Geänderte Dateien:**
- `src/lib/admin-api.ts` - updateFahrer() bereinigt
- `src/app/fahrerportal/dashboard/page.tsx` - Imports & Profil-Loading
- `src/lib/fahrer-management-api.ts` - Duplikate entfernt
- `src/lib/salary-calculator.ts` - MONTHLY_LIMIT auf 603€

**Keine Migration nötig:**
- Die Migration `20260602_compensation_model.sql` wurde bereits live ausgeführt
- Dustin Wett hat `compensation_model = 'fixed_salary_part_time'`

**Wichtige Hinweise:**
- `zeitmodell` bleibt in `profiles` - Beschäftigungsart des Fahrers
- `compensation_model` ist in `profiles` - Vergütungsmodell (tourbasiert vs. Festgehalt)
- Beides sind unterschiedliche Konzepte:
  - `zeitmodell`: minijob, werkstudent, teilzeit, vollzeit
  - `compensation_model`: tour_based_minijob, fixed_salary_part_time, fixed_salary_full_time

**Tests (logisch verifiziert):**
- [x] Admin speichert Fahrer ohne zeitmodell-Fehler
- [x] Dashboard lädt compensation_model korrekt
- [x] Dustin Wett sieht "Arbeitsdokumentation" statt "Monatsabrechnung"
- [x] Minijob-Fahrer sehen weiterhin tourbasierte Vergütung
- [x] Build erfolgreich

---

### 2026-06-02: Vergütungsmodelle für Fahrer

**Anforderung:**
- Fahrer können verschiedene Vergütungsmodelle haben
- `tour_based_minijob`: Tourbasierte Vergütung (bisheriges Verhalten)
- `fixed_salary_part_time`: Festgehalt Teilzeit (keine Tourpreise im Fahrerportal)
- `fixed_salary_full_time`: Festgehalt Vollzeit (keine Tourpreise im Fahrerportal)

**Erledigte Aufgaben:**
- [x] Migration erstellt: `20260602_compensation_model.sql`
  - compensation_model Feld in profiles
  - fixed_monthly_gross_salary (optional)
  - contracted_hours_per_week (optional)
  - Dustin Wett auf fixed_salary_part_time gesetzt
- [x] supabase.ts: Profile-Typ erweitert um CompensationModel
- [x] salary-calculator.ts:
  - hasFixedSalaryCompensation() hinzugefügt
  - shouldShowTourBasedSalary() hinzugefügt
- [x] fahrer-management-api.ts:
  - getFahrerCompensationModel() hinzugefügt
  - updateFahrerCompensationModel() hinzugefügt
  - getCompensationModelLabel() hinzugefügt
- [x] admin-api.ts: getAllFahrerAdmin() erweitert um compensation_model
- [x] FahrerakteUserData.tsx:
  - Vergütungsmodell-Dropdown hinzugefügt
  - Speichern/Audit-Log funktioniert
  - Anzeige in Lesemodus
- [x] monatsabrechnung/page.tsx:
  - Preise/Verdienst ausgeblendet für Festgehalt-Fahrer
  - Alternativer Hinweis "Du erhältst ein festes Monatsgehalt..."
  - Touren-Übersicht ohne Verdienst-Spalte
- [x] dashboard/page.tsx:
  - Menüpunkt angepasst für Festgehalt-Fahrer
  - "Arbeitsdokumentation" statt "Monatsabrechnung"
- [x] Typecheck erfolgreich (bestehende onboarding-Fehler unberührt)
- [x] Build erfolgreich

**Geänderte Dateien:**
1. `supabase/migrations/20260602_compensation_model.sql` - Migration
2. `src/lib/supabase.ts` - CompensationModel Type + Helper
3. `src/lib/salary-calculator.ts` - shouldShowTourBasedSalary()
4. `src/lib/fahrer-management-api.ts` - CRUD für compensation_model
5. `src/lib/admin-api.ts` - getAllFahrerAdmin() erweitert
6. `src/components/admin/FahrerakteUserData.tsx` - UI für Vergütungsmodell
7. `src/app/admin/fahrer/[id]/page.tsx` - compensation_model weitergeben
8. `src/app/fahrerportal/monatsabrechnung/page.tsx` - Festgehalt-Ansicht
9. `src/app/fahrerportal/dashboard/page.tsx` - Menü anpassen

**Was Dustin Wett jetzt sieht:**
- Fahrerportal Dashboard: "Arbeitsdokumentation" statt "Monatsabrechnung"
- Arbeitsdokumentation-Seite: Kein Verdienst, kein Tourlohn
- Hinweis: "Du erhältst ein festes Monatsgehalt gemäß deinem Arbeitsvertrag."
- Touren-Übersicht: Nur Tour-Nr, Datum, KM, Status (kein Verdienst)
- Auslagen: Weiterhin sichtbar/einreichbar

**Was Minijob-Fahrer weiterhin sehen:**
- Tourbasierte Vergütung wie bisher
- Monatsabrechnung mit Verdienst pro Tour
- Auszahlung mit 556€ Minijob-Grenze

**Was Admin/GF sehen:**
- Fahrerakte: Neues Dropdown "Vergütungsmodell"
- Optionen: Tourbasiert/Minijob, Festgehalt Teilzeit, Festgehalt Vollzeit
- Hinweis wenn Festgehalt: "Fahrer sieht keine Tourpreise/-löhne im Fahrerportal"

**Kundenabrechnung:**
- UNVERÄNDERT - Touren werden weiterhin berechnet und abgerechnet
- Kundenumsatz, Analytics, Smart&Care/Onlogist-Abrechnung funktionieren

**Nächste Schritte:**
- Migration live ausführen (Supabase Dashboard)
- Testen: Dustin Wett Login → keine Tourpreise sichtbar
- Testen: Normaler Minijob-Fahrer → bisheriges Verhalten

---

### 2026-06-01: Fix Abrechnungslogik - Korrekte KW-Filterung

**Problem:**
- Die Abrechnungslogik lud ALLE offenen Positionen ab KW21/2026
- Touren/Auslagen aus anderen offenen KWs wurden fälschlicherweise angezeigt
- Beispiel: Bei KW23-Abrechnung erschienen auch Positionen aus KW22 (offen) und KW24 (zukünftig)

**Ursache:**
- `getBillableTours()` und `getBillableExpenses()` nutzten nur `.gte('datum', BILLING_SYSTEM_START_DATE)`
- Es fehlte eine Filterung nach: "gehört diese Position zu DIESER Abrechnung?"
- `isRetroactive` wurde berechnet, aber Positionen mit `isRetroactive = false` UND `isInSelectedPeriod = false` wurden trotzdem zurückgegeben

**Lösung:**
- Neues Flag `belongsToThisBilling` eingeführt
- Position gehört zur Abrechnung nur wenn:
  - `isInSelectedPeriod === true` (regulär: Datum in gewählter KW) ODER
  - `isRetroactive === true` (Nachberechnung: aus geschlossener früherer KW)
- Filter-Schritt nach Mapping eingefügt, der alle anderen Positionen ausschließt
- Gilt für Touren UND Auslagen

**Korrekte Logik jetzt:**
```
Wenn KW23 abgerechnet wird:

REGULÄR (in Abrechnung):
- Tour/Auslage aus KW23, genehmigt, weekly_invoice_id NULL

NACHBERECHNUNG (in Abrechnung):
- Tour/Auslage aus KW21 oder KW22, KW21/22 ist GESCHLOSSEN, weekly_invoice_id NULL

NICHT in Abrechnung:
- Tour/Auslage aus KW22, wenn KW22 noch OFFEN ist
- Tour/Auslage aus KW24 (zukünftig)
- Tour/Auslage vor KW21 (Cutoff)
```

**Geänderte Dateien:**
- `src/lib/invoice-api.ts` - Filter-Logik in `getBillableTours()` und `getBillableExpenses()`

**Tests logisch verifiziert:**
- [x] Test 1: Tour KW23 bei KW23-Abrechnung → regulär ✓
- [x] Test 2: Tour KW22 bei KW23-Abrechnung, KW22 geschlossen → Nachberechnung ✓
- [x] Test 3: Tour KW22 bei KW23-Abrechnung, KW22 OFFEN → erscheint NICHT ✓
- [x] Test 4: Tour KW24 bei KW23-Abrechnung → erscheint NICHT ✓
- [x] Test 5: Tour KW19 bei KW23-Abrechnung → erscheint NICHT (Cutoff) ✓
- [x] Test 6-8: Gleiche Logik für Auslagen ✓

---

### 2026-06-01: Fix Abrechnungs-Cutoff (KW21/2026)

**Problem:**
- Die Nachberechnungslogik zog alte Touren/Auslagen (vor KW21/2026) in neue Abrechnungen
- Diese alten Positionen wurden bereits manuell/außerhalb des Portals abgerechnet
- Im Portal standen sie noch als `weekly_invoice_id = NULL`

**Lösung:**
- Cutoff-Regel eingeführt: `BILLING_SYSTEM_START_DATE = '2026-05-18'` (Start KW21/2026)
- Filter in `getBillableTours()` und `getBillableExpenses()` hinzugefügt: `.gte('datum', BILLING_SYSTEM_START_DATE)`
- UI-Hinweis in Abrechnungsseite eingefügt

**Geänderte Dateien:**
- `src/lib/invoice-api.ts` - Cutoff-Konstanten und Filter
- `src/app/admin/abrechnung/page.tsx` - UI-Hinweis

---

## In Arbeit

### 2026-06-01: Vergütungsmodelle für Fahrer

**Anforderung:**
- Fahrer können verschiedene Vergütungsmodelle haben
- `tour_based_minijob`: Tourbasierte Vergütung (bisheriges Verhalten)
- `fixed_salary_part_time`: Festgehalt Teilzeit (keine Tourpreise im Fahrerportal)
- `fixed_salary_full_time`: Festgehalt Vollzeit (keine Tourpreise im Fahrerportal)

**Aufgaben:**
- [ ] Migration erstellen: compensation_model Feld in profiles
- [ ] supabase.ts: Profile-Typ erweitern
- [ ] salary-calculator.ts: hasFixedSalary-Check hinzufügen
- [ ] fahrer-management-api.ts: CRUD für compensation_model
- [ ] FahrerakteUserData.tsx: Vergütungsmodell bearbeitbar
- [ ] monatsabrechnung/page.tsx: Preise ausblenden für Festgehalt-Fahrer
- [ ] dashboard/page.tsx: Menüpunkt anpassen für Festgehalt-Fahrer
- [ ] Dustin Wett auf fixed_salary_part_time setzen
- [ ] Typecheck/Build
- [ ] Push nach main

**Wichtig:**
- Kundenabrechnung NICHT kaputtmachen
- Interne Umsatzberechnung bleibt erhalten
- Bestehende Fahrer bleiben tour_based_minijob

---

## Offen

- Keine offenen Aufgaben
