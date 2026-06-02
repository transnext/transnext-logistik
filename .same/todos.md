# TransNext Portal - TODOs

## ✅ Abgeschlossen

### 2026-06-02: Analytics fachliche Korrektur - Festgehalt vs Minijob Trennung - VOLLSTÄNDIG

#### A) Top-Fahrer-Bereich korrigiert
- [x] "Top Minijobfahrer nach Ertrag" - nur tour_based_minijob
- [x] "Top Fahrer nach Umsatz" - alle Fahrer (Umsatz modell-unabhängig)
- [x] Festgehaltfahrer aus tourbasierter Ertragsrangliste ausgeschlossen

#### B) Einsatztage-Charts getrennt
- [x] "Einsatztage Minijobfahrer" mit 6-Tage-Zielmarke
- [x] "Einsatztage Festgehaltfahrer" ohne 6-Tage-Ziel
- [x] Hinweis: "Teilzeit: Solltage individuell. Vollzeit: X Soll-Arbeitstage"

#### C) Festgehaltfahrer-Controlling erweitert
- [x] Monatsarbeitstage (Mo-Fr abzgl. NRW-Feiertage) für ALLE Festgehaltfahrer
- [x] Umsatz pro Monatsarbeitstag (auch für Teilzeit als Orientierung)
- [x] Tagesziel zur Kostendeckung (auch für Teilzeit als Orientierung)
- [x] Differenz zum Tagesziel
- [x] Teilzeit-Werte mit * als Orientierungswert markiert
- [x] Gelber Hinweis für Teilzeit: "Individuelle Solltage nicht hinterlegt"

#### D) Fahrer-Performance-Tabelle korrigiert
- [x] Festgehalt: Ertrag = "—" (nicht tourbasiert)
- [x] Festgehalt: Marge = "—" (nicht tourbasiert)
- [x] Festgehalt: Bewertung = "Controlling" Badge (violett)
- [x] Minijob: weiterhin Ertrag/Marge/Bewertung nach alter Logik

#### E) Finanzübersicht korrigiert
- [x] Badge "Tourbasiert" hinzugefügt
- [x] Sublabel "tourbasiert" bei Fahrerlohn und AG-Kosten
- [x] Hinweis bei Festgehaltfahrern: "Festgehaltkosten werden im Bereich Festgehaltfahrer-Controlling separat dargestellt"

#### F) Monatstrend-Grafik
- [x] Jetzt auch mit 1 Monat sichtbar (war > 1 Bedingung)
- [x] Balkendiagramm für Umsatz pro Monat
- [x] Balkendiagramm für Einsatztage pro Monat
- [x] Umsatz pro Einsatztag als Zahlen

### 2026-06-02: Analytics Festgehaltfahrer-Controlling & Monatstrend - VOLLSTÄNDIG IMPLEMENTIERT

#### Neu implementiert:
- [x] Kostenlogik für Festgehaltfahrer als interne Planwerte
  - `FIXED_SALARY_DEFAULT_GROSS = 1200 €`
  - `FIXED_SALARY_EMPLOYER_COST_RATE = 0.25` (25%)
  - `FIXED_SALARY_ADDITIONAL_COST = 900 €`
  - `calculateFixedSalaryMonthlyCost() = 2400 €`
  - `calculateDailyBreakEvenRevenue(sollArbeitstage)`
- [x] Soll-Arbeitstage mit NRW-Feiertagen (`countWorkdaysWithHolidays`)
- [x] Festgehaltfahrer-Controlling UI-Bereich mit:
  - Fahrername + Vergütungsmodell-Badge
  - Umsatz, Touren, Einsatztage
  - Soll-Arbeitstage (nur Vollzeit, Mo-Fr abzgl. NRW-Feiertage)
  - Leerlauftage (nur Vollzeit)
  - Umsatz pro Einsatztag
  - Umsatz pro Soll-Arbeitstag (nur Vollzeit)
  - Plan-Monatskosten (2400 €)
  - Tagesziel zur Kostendeckung (nur Vollzeit)
  - Auslastungsquote (nur Vollzeit)
  - Kostendeckungs-Status Badge
- [x] Monatstrend-Grafik mit:
  - Umsatz pro Monat (Balkendiagramm)
  - Einsatztage pro Monat (Balkendiagramm)
  - Umsatz pro Einsatztag (Zahlen)
  - Trend-Richtung (Aufwärts/Abwärts/Stabil)
- [x] Neue Types: `MonthlyTrendDataPoint`, `TrendData`, `MonthlyTrendType`
- [x] Neue KPI-Felder in `FahrerLeistungKPI`:
  - `umsatzProSollArbeitstag`
  - `planMonatskosten`
  - `tageszielKostendeckung`
  - `kostendeckungsStatus`
- [x] `festgehaltFahrer` Array in `FahrerKPIs`
- [x] Teilzeit-Hinweis: "Individuelle Solltage nicht hinterlegt"

### 2026-06-02: Analytics & Auslagen payment_method - VOLLSTÄNDIG IMPLEMENTIERT

#### TEIL A: Analytics nach Vergütungsmodell
- [x] compensation_model in analytics-calculator laden (profiles.compensation_model)
- [x] FahrerLeistungKPI um compensation_model erweitern
- [x] KPI-Logik für Minijob-Fahrer (6-Tage-Ziel nur für tour_based_minijob)
- [x] KPI-Logik für Festgehaltfahrer (Auslastung, Soll-Arbeitstage, Leerlauftage)
- [x] UI-Anpassung: Verschiedene KPI-Labels je nach compensation_model
- [x] fahrerUnterZiel zählt nur noch Minijob-Fahrer
- [x] Minijob-Zieltage Badge nur bei Minijob-Fahrern angezeigt
- [x] Festgehalt-Teilzeit zeigt Hinweis "Individuelle Solltage"

#### TEIL B: Auslagenformular payment_method
- [x] Migration erstellt: payment_method Spalte (private/company_card)
- [x] Fahrerportal: Zahlungsart-Auswahl für ALLE Belegtypen (nicht nur Tankbeleg)
- [x] Admin: Zahlungsart-Spalte in Auslagenübersicht
- [x] company_card-Auslagen zeigen "Nicht erstatten" Hinweis
- [x] API aktualisiert: payment_method wird korrekt gespeichert
- [x] TypeScript-Typen aktualisiert (Auslagennachweis, PaymentMethod)
- [x] AuslagenTab: "Als überwiesen markieren" Button für company_card deaktiviert
- [x] admin-api: markAuslageAsReimbursed() prüft payment_method
- [x] admin-api: billMultipleAuslagen() schließt company_card aus
- [x] invoice-api: getBillableExpenses() filtert company_card aus
- [x] Fahrerportal Auslagenabrechnung: company_card nicht in Erstattungssumme
- [x] Migration live angewendet (214 Auslagen → private)

## ✅ Migration Status

| Migration | Status | Details |
|-----------|--------|---------|
| `20260602_compensation_model.sql` | ✅ Live | Vergütungsmodell in profiles |
| `20260602_payment_method.sql` | ✅ Live | 214 Auslagen auf 'private' gesetzt |

## 📝 Zusammenfassung der Änderungen

### Neue Analytics-Features (Festgehaltfahrer-Controlling)

**Kostenlogik (interne Planwerte):**
```
Bruttogehalt:           1.200 €
+ AG-Kosten (25%):        300 €
+ Zusatzkosten:           900 €
= Monatskosten:         2.400 €

Tagesziel = 2.400 € / Soll-Arbeitstage
```

**Soll-Arbeitstage für Vollzeit:**
- Montag bis Freitag im Zeitraum
- Abzüglich NRW-Feiertage (Neujahr, Karfreitag, Ostermontag, Tag der Arbeit, Christi Himmelfahrt, Pfingstmontag, Fronleichnam, Tag der Deutschen Einheit, Allerheiligen, 1. & 2. Weihnachtstag)
- Verwendet `countWorkdays()` aus `holidays.ts`

**Kostendeckungs-Status:**
- `ueber_ziel`: Umsatz/Soll-Tag >= Tagesziel
- `nahe_ziel`: Umsatz/Soll-Tag >= 80% des Tagesziels
- `unter_ziel`: Umsatz/Soll-Tag < 80% des Tagesziels
- `operativ_pruefen`: Teilzeit (keine Solltage berechenbar)

**Monatstrend-Grafik:**
- Gruppiert Touren nach Monat
- Zeigt Balkendiagramme für Umsatz und Einsatztage
- Zeigt Umsatz pro Einsatztag
- Trend-Badge: Aufwärts/Abwärts/Stabil (basierend auf letzten 2 Monaten)

### Geänderte Dateien (Festgehaltfahrer-Controlling):

- `src/lib/analytics-calculator.ts`
  - Neue Konstanten: `FIXED_SALARY_DEFAULT_GROSS`, `FIXED_SALARY_EMPLOYER_COST_RATE`, `FIXED_SALARY_ADDITIONAL_COST`
  - Neue Funktionen: `calculateFixedSalaryMonthlyCost()`, `calculateDailyBreakEvenRevenue()`
  - Neue Types: `MonthlyTrendDataPoint`, `TrendData`, `MonthlyTrendType`
  - Erweiterte `FahrerLeistungKPI` mit Kostendeckungs-Feldern
  - `FahrerKPIs.festgehaltFahrer` Array
  - Monatstrend-Berechnung
  - `countWorkdays` nutzt jetzt NRW-Feiertage

- `src/app/admin/analytics/page.tsx`
  - Neue Komponente: `TrendChart`
  - Neue Komponente: `KostendeckungsStatusBadge`
  - Neuer Bereich: "Festgehaltfahrer – Controlling"
  - Neuer Bereich: "Leistungsentwicklung" (Monatstrend)
  - Planwert-Hinweis mit Kostenaufschlüsselung

### Wo finde ich was?

| Feature | Ort |
|---------|-----|
| Festgehaltfahrer-Controlling | Admin > Analytics > "Festgehaltfahrer – Controlling" |
| Monatstrend-Grafik | Admin > Analytics > "Leistungsentwicklung" |
| Kostendeckungs-Status | Badges in Festgehaltfahrer-Karten |
| Planwert-Hinweis | Gelber Info-Kasten über Festgehaltfahrer-Karten |

### Fachliche Logik

**Dustin Wett (fixed_salary_part_time):**
- ✅ Sieht keine Minijob-6-Tage-Logik
- ✅ Sieht im Admin-Controlling: Umsatz, Touren, Einsatztage, €/Einsatztag
- ✅ Sieht Plan-Monatskosten 2.400 €
- ✅ Sieht Hinweis "Teilzeit-Solltage individuell"
- ✅ Status: "Individuell prüfen"
- ❌ Kein Tagesziel (da keine Solltage berechenbar)
- ❌ Keine Auslastungsquote
- ❌ Keine Leerlauftage

**Vollzeit-Festgehalt (fixed_salary_full_time):**
- ✅ Soll-Arbeitstage = Mo-Fr minus NRW-Feiertage
- ✅ Leerlauftage = Soll - Einsatztage
- ✅ Auslastungsquote = Einsatztage / Soll * 100
- ✅ Umsatz pro Soll-Arbeitstag
- ✅ Tagesziel = 2.400 € / Soll-Arbeitstage
- ✅ Kostendeckungs-Status (Ampel)

**Minijob-Fahrer:**
- ✅ Minijob-Zieltage (6 Tage) weiterhin sichtbar
- ✅ Minijob-Auslastung (% vom 603€-Limit)
- ❌ Keine Festgehalt-Kosten-KPIs

**Was im Fahrerportal NICHT angezeigt wird:**
- ❌ Planwerte / Kostenlogik
- ❌ Tagesziele
- ❌ Kostendeckungs-Status
- ❌ Ertragswerte

## 📝 Bekannte Fehler (nicht Teil dieser Aufgabe)

- Onboarding-API: Fehlende Exporte (validateQuestionnaireForm, etc.)
- Admin Fahrer-Seite: zeitmodell-Feld im updateFahrer-Aufruf

## ✅ Build & Deploy Status

- Typecheck: ✅ Erfolgreich (Fehler in nicht-relevanten Dateien)
- Build: ✅ Erfolgreich
- Push nach main: ✅ Erfolgreich (c205aa8)
- Version: ✅ 275

---

### 2026-06-02: Analytics Management-Auswertung - VOLLSTÄNDIG VERBESSERT

#### A) Echtes Liniendiagramm für Leistungsentwicklung
- [x] Recharts-Integration hinzugefügt
- [x] Neue `MonthlyLineChart` Komponente mit ResponsiveContainer
- [x] Zwei Linien: Umsatz (grün) und Marge/Deckungsbeitrag (violett)
- [x] Custom Tooltip mit Euro-Formatierung
- [x] X-Achse: Monate (z.B. "Jan 26", "Feb 26")
- [x] Y-Achse: Euro-Werte (automatische Skalierung)
- [x] KPI-Zeile unter dem Chart mit Marge pro Monat und Touren
- [x] Verwendet `trendSixMonths` - letzte 6 Monate unabhängig vom Filter

#### B) Marge/Deckungsbeitrag Definition
- [x] Neue Felder in `MonthlyTrendDataPoint`: `fahrerlohn`, `arbeitgeberkosten`, `marge`, `margenquote`
- [x] Marge-Berechnung pro Monat: Umsatz - Fahrerlohn - AG-Kosten
- [x] Für Minijob: tourbasierte Marge weiterhin gültig
- [x] Für Festgehalt: Saldo = Umsatz - Plan-Kosten (2.400€)

#### C) Festgehaltfahrer-Controlling mit klarem Plus/Minus
- [x] Neue `SaldoDisplay` Komponente für prominente Anzeige
- [x] Große Zahl mit Saldo-Betrag
- [x] Badge "Im Plus" / "Im Minus" mit farblicher Hervorhebung
- [x] Grün bei Plus, Rot bei Minus
- [x] Aufschlüsselung: Umsatz vs Plan-Kosten
- [x] Teilzeit-Hinweis bei Orientierungswerten

#### D) Neue FahrerLeistungKPI-Felder für Festgehalt
- [x] `saldoGegenPlan`: Umsatz - 2.400€
- [x] `bisherigArbeitstage`: Arbeitstage bis heute im laufenden Monat
- [x] `anteiligePlanKosten`: (2.400€ / Monatsarbeitstage) * bisherige Tage
- [x] `anteiligenSaldo`: Umsatz - anteilige Plan-Kosten

#### E) Kostendeckungs-Status verbessert
- [x] Status basiert jetzt auf Saldo statt nur Tagesziel
- [x] `ueber_ziel`: Saldo >= 0
- [x] `nahe_ziel`: Saldo >= -20% der Plan-Kosten
- [x] `unter_ziel`: Saldo < -20% der Plan-Kosten
- [x] `operativ_pruefen`: Teilzeit (immer individuell)

#### F) UI-Verbesserungen
- [x] Recharts LineChart ersetzt CSS-Balkendiagramm
- [x] SaldoDisplay als erste Komponente in Festgehaltfahrer-Karten
- [x] Beschriftung "Monatliche Leistungsentwicklung" statt "Leistungsentwicklung"
- [x] Untertitel "Umsatz und Marge im Monatsvergleich"

### Dustin Wett (fixed_salary_part_time) - Beispiel

**Aktuelle Werte (Juni 2026):**
- Umsatz: 272 €
- Plan-Kosten: 2.400 €
- **Saldo: -2.128 €** (klar sichtbar in roter SaldoDisplay)
- Status: "Im Minus"

**Wo sichtbar:**
1. Admin > Analytics > "Festgehaltfahrer – Controlling"
2. Große rote Saldo-Karte mit -2.128 €
3. Badge "Im Minus"
4. Aufschlüsselung: 272 € Umsatz vs 2.400 € Plan-Kosten
