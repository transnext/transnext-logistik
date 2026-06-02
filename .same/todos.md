# TransNext Portal - TODOs

## ✅ Abgeschlossen

### 2026-06-02: Vergütungsmodell Bugfixes
- [x] Bug-Fix: Admin-Portal zeitmodell-Fehler beim Fahrer-Speichern
- [x] Bug-Fix: Fahrerportal compensation_model-Laden für Dustin Wett
- [x] Bug-Fix: Doppelte Funktionsdefinitionen entfernt
- [x] Minijob-Limit auf 603€ aktualisiert

### 2026-06-02: TEIL A - Analytics nach Vergütungsmodell
- [x] 1. compensation_model in analytics-calculator laden (profiles.compensation_model)
- [x] 2. FahrerLeistungKPI um compensation_model erweitern
- [x] 3. KPI-Logik für Minijob-Fahrer (6-Tage-Ziel nur für tour_based_minijob)
- [x] 4. KPI-Logik für Festgehaltfahrer (Auslastung, Soll-Arbeitstage, Leerlauftage)
- [x] 5. UI-Anpassung: Verschiedene KPI-Labels je nach compensation_model
- [x] 6. fahrerUnterZiel zählt nur noch Minijob-Fahrer

### 2026-06-02: TEIL B - Auslagenformular payment_method
- [x] 1. Migration erstellt: payment_method Spalte (private/company_card)
- [x] 2. Fahrerportal: Zahlungsart-Auswahl für ALLE Belegtypen (nicht nur Tankbeleg)
- [x] 3. Admin: Zahlungsart-Spalte in Auslagenübersicht
- [x] 4. company_card-Auslagen zeigen "Nicht erstatten" Hinweis
- [x] 5. API aktualisiert: payment_method wird korrekt gespeichert
- [x] 6. TypeScript-Typen aktualisiert (Auslagennachweis, PaymentMethod)

## 📋 Migration noch auszuführen

Die Migration `20260602_payment_method.sql` muss noch im Supabase Dashboard ausgeführt werden:
1. SQL Editor im Supabase Dashboard öffnen
2. Inhalt von `supabase/migrations/20260602_payment_method.sql` einfügen
3. Ausführen

## 📝 Geänderte Dateien

### Analytics
- `src/lib/analytics-calculator.ts`
  - CompensationModelType hinzugefügt
  - FahrerLeistungKPI um compensation_model, sollArbeitstage, leerlauftage, auslastungsquote erweitert
  - FahrerKPIs um minijobFahrerMitTouren, festgehaltFahrerMitTouren erweitert
  - Fahrer-Laden um profiles.compensation_model erweitert
  - Unterschiedliche KPI-Berechnung je nach Vergütungsmodell

- `src/app/admin/analytics/page.tsx`
  - "Minijob-Zieltage" statt generisch "Fahrer-Ziel (6 Tage)"
  - "Einsatztage" statt "Aktive Tage"
  - Typ-Spalte in Fahrer-Tabelle (Minijob/TZ/VZ)
  - Detail-Ansicht zeigt unterschiedliche KPIs je nach Vergütungsmodell
  - Festgehalt-Vollzeit: Soll-Arbeitstage, Auslastung, Leerlauftage
  - Teilzeit-Festgehalt: Hinweis "individuelle Solltage"

### Auslagen
- `supabase/migrations/20260602_payment_method.sql` (NEU)
  - payment_method Spalte (private/company_card)
  - Check-Constraint für gültige Werte
  - Index für schnelle Filterung

- `src/lib/supabase.ts`
  - PaymentMethod Type hinzugefügt
  - Auslagennachweis um payment_method erweitert

- `src/lib/api.ts`
  - createAuslagennachweis akzeptiert payment_method statt ist_tankkarte
  - Status 'tankcard' für company_card-Auslagen

- `src/app/fahrerportal/auslagennachweis/page.tsx`
  - Zahlungsart-Auswahl für ALLE Belegtypen
  - Zwei Radio-Buttons: "Eigene Tasche" / "Firmenkreditkarte"
  - Beschreibungstexte für jede Option

- `src/components/admin/tabs/AuslagenTab.tsx`
  - Auslage Interface um paymentMethod erweitert
  - Neue Spalte "Bezahlt mit"
  - Badge für Firmenkreditkarte mit "Nicht erstatten" Hinweis

- `src/app/admin/auslagen/page.tsx`
  - paymentMethod in Mapping hinzugefügt

## 📝 Notizen
- Keine Gehalts-/Kostenlogik in Fahrerakte
- Keine neuen Feature-Blöcke außerhalb dieser beiden Themen
- Build erfolgreich
- Push nach main steht noch aus
