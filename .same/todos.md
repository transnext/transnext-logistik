# TransNext Logistik - TODOs

## Erledigt

- [x] PDF Export erstellt jetzt eine einzelne PDF mit allen ausgewählten Touren (sortiert nach Datum aufsteigend)
- [x] Auslagen PDF Export sortiert nach Datum aufsteigend
- [x] "Gesamt: " Formatierung in PDF mit Leerzeichen nach dem Doppelpunkt
- [x] Git Merge-Konflikte behoben
- [x] TypeScript-Fehler behoben
- [x] Geschäftsführer-Touren werden bei Lohnberechnung ausgenommen
- [x] Spezielle KM-Tabelle für Phillip Sander implementiert
- [x] Namenszuordnung Problem behoben (Hicham Salmi / Salmi Hicham)
- [x] Monatsauswahl im Admin-Dashboard implementiert

## Aktuelle Aufgaben

### Phillip Sander KM-Tabelle ✓
- Neue KM-Ranges in salary-calculator.ts hinzugefügt
- calculateTourVerdienst akzeptiert jetzt einen optionalen fahrerName Parameter
- Alle bestehenden Touren werden automatisch mit der neuen Tabelle berechnet

### Namenszuordnung ✓
- Neue `namesMatch()` Funktion in dashboard/page.tsx
- Vergleicht Namen unabhängig von der Reihenfolge (Vorname Nachname vs. Nachname Vorname)
- Alle Filter im Dashboard nutzen jetzt diese Funktion

### Monatsauswahl im Dashboard ✓
- Monatsauswahl-Dropdown oben im Dashboard (letzte 13 Monate)
- Alle Statistik-Kacheln werden nach ausgewähltem Monat gefiltert
- Touren- und Auslagen-Listen zeigen nur Daten des gewählten Monats
- Abrechnungen-Tab zeigt nur Daten des gewählten Monats
- Statistiken werden clientseitig via useMemo berechnet

## Phillip Sander KM-Tabelle

| Von (KM) | Bis (KM) | Betrag in EUR |
|----------|----------|---------------|
| 1 | 10 | 12,00 |
| 11 | 20 | 14,00 |
| 21 | 30 | 22,00 |
| 31 | 40 | 27,00 |
| 41 | 50 | 32,00 |
| 51 | 60 | 36,00 |
| 61 | 70 | 40,00 |
| 71 | 80 | 44,00 |
| 81 | 90 | 48,00 |
| 91 | 100 | 52,00 |
| 101 | 120 | 56,00 |
| 121 | 140 | 60,00 |
| 141 | 160 | 64,00 |
| 161 | 180 | 68,00 |
| 181 | 200 | 72,00 |
| 201 | 220 | 76,00 |
| 221 | 240 | 80,00 |
| 241 | 260 | 84,00 |
| 261 | 280 | 88,00 |
| 281 | 300 | 92,00 |
| 301 | 320 | 96,00 |
| 321 | 340 | 100,00 |
| 341 | 360 | 105,00 |
| 361 | 380 | 110,00 |
| 381 | 400 | 115,00 |
| 401 | 450 | 120,00 |
| 451 | 500 | 125,00 |
| 501 | 550 | 130,00 |
| 551 | 600 | 140,00 |
| 601 | 650 | 150,00 |
| 651 | 700 | 160,00 |
| 701 | 750 | 170,00 |
| 751 | 800 | 180,00 |
| 801 | 900 | 195,00 |
| 901 | 1000 | 210,00 |

## Warten auf Bestätigung

- [x] Code gepusht
