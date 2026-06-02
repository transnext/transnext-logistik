# TransNext Logistik - Todos
## Erledigt (02.06.2026)
### Problem 1: Geschäftsführer werden als Minijobber gezählt ✅
- [x] Migration `20260602_owner_operator_compensation.sql` war bereits live
- [x] Nicholas Mandzel und Burak Aydin haben `owner_operator` als compensation_model
- [x] Analytics-Logik behandelt owner_operator separat:
  - Nicht in Minijob-Rankings
  - Keine 6-Tage-Ziel-Logik
  - Bewertung "operativ" statt Minijob-Ampellogik
  - Eigener Bereich "Geschäftsführer – Operative Einsätze" in Analytics
### Problem 2: Nicholas sieht keine historischen Touren ✅
- [x] Ursache: Nicholas hatte zwei getrennte Accounts:
  - Admin: n.mandzel@transnext.de (ohne Fahrer-Daten)
  - Fahrer: mandzelnicholas@gmail.com (mit 132 Arbeitsnachweisen)
- [x] Lösung: Migration `20260602_nicholas_account_consolidation.sql` erstellt
- [x] Live angewendet:
  - 132 Arbeitsnachweise auf Admin-Account migriert
  - 58 Auslagennachweise auf Admin-Account migriert
  - Fahrer-Eintrag mit Admin-Account verknüpft
  - Admin-Account: owner_operator
  - Fahrer-Account: tour_based_minijob (kann deaktiviert werden)
## Zusammenfassung
### Account-Konsolidierung Nicholas Mandzel:
| Eigenschaft | Admin-Account | Fahrer-Account |
|-------------|---------------|----------------|
| E-Mail | n.mandzel@transnext.de | mandzelnicholas@gmail.com |
| Status | **Aktiv (Primär)** | Redundant |
| Arbeitsnachweise | 132 | 0 |
| Auslagennachweise | 58 | 0 |
| compensation_model | owner_operator | tour_based_minijob |
### Owner-Operator Logik:
- Geschäftsführer erscheinen nicht in Minijob-Rankings
- Keine 6-Tage-Ziel-Bewertung
- Eigener Analytics-Bereich mit:
  - Umsatz
  - Touren
  - Einsatztage
  - Umsatz pro Einsatztag
  - Badge "Geschäftsführer"
