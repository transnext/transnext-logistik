# TransNext Logistik - V99: Lohn-Cap & Abrechnung ✅

## ✅ NEUE FEATURES KOMPLETT:
- [x] Monatliches Verdienst-Limit: 556€ (Minijob)
- [x] Überschuss-Berechnung implementiert
- [x] Fahrerportal: Überschuss aus Vormonat anzeigen
- [x] Fahrerportal: Lohn-Aufteilung (Auszahlung + Überschuss)
- [x] Admin-Portal: Neuer Tab "Abrechnung"
- [x] Admin-Portal: Fahrer-Liste mit Statistiken
- [x] Admin-Portal: Detail-Ansicht pro Fahrer
- [x] Admin-Portal: Touren & Auslagen pro Fahrer
- [x] Gesamtlohn Genehmigt: Inkludiert abgerechnete Touren
- [x] Überschuss-Warnung bei Überschreitung der 556€-Grenze

## 🎯 WIE ES FUNKTIONIERT:

### 💰 Lohn-Cap (556€ Minijob):
- Fahrer verdienen maximal **556€ pro Monat** (Auszahlung)
- Alles über 556€ ist **Überschuss** (gehört dem Fahrer)
- **Beispiel:**
  - Verdienst: 620€
  - Auszahlung: 556€
  - Überschuss: 64€

### 📊 Fahrerportal - Monatsabrechnung:
- **Gesamtverdienst** angezeigt
- **Auszahlung** (max. 556€)
- **Überschuss** (wenn über 556€)
- **Überschuss aus Vormonat** (orange Card, nur wenn > 0€)

### 🧾 Admin-Portal - Abrechnung:
- **Tab "Abrechnung"** mit allen aktiven Fahrern
- **Klick auf Fahrer** → Detail-Ansicht
- **Statistiken pro Fahrer:**
  - Gesamtverdienst (alle approved + billed Touren)
  - Auszahlung (max. 556€)
  - Überschuss (über 556€)
  - Auslagen-Summe (alle approved + paid Auslagen)
- **Touren-Tabelle** mit Verdienst pro Tour
- **Auslagen-Tabelle** mit Kosten
- **Zurück-Button** zur Fahrer-Übersicht

### 📈 Gesamtlohn Genehmigt:
- Zählt jetzt **approved + billed** Touren
- Dient zur Übersicht der Gesamt-Lohnkosten
- Wird **nicht reduziert** nach Abrechnung

## 📦 IMPLEMENTIERTE DATEIEN:
- ✅ `src/lib/salary-calculator.ts` - MONTHLY_LIMIT, calculateMonthlyPayout()
- ✅ `src/lib/admin-api.ts` - Gesamtlohn inkl. billed
- ✅ `src/app/fahrerportal/monatsabrechnung/page.tsx` - Überschuss-Anzeige
- ✅ `src/app/admin/dashboard/page.tsx` - Abrechnung-Tab

## 🧪 NÄCHSTE SCHRITTE:
- [ ] Version 99 erstellen
- [ ] Linter-Check
- [ ] Testing durchführen:
  - [ ] Fahrerportal: Überschuss-Anzeige
  - [ ] Admin: Abrechnung-Tab
  - [ ] Admin: Fahrer-Detail-Ansicht
  - [ ] Gesamtlohn Genehmigt prüfen

## 🎉 VOLLSTÄNDIGES FEATURE-SET:

**Fahrerportal:**
- ✅ Login & Dashboard
- ✅ Arbeitsnachweis hochladen (PDF)
- ✅ Auslagennachweis hochladen (PDF)
- ✅ Monatsabrechnung mit Überschuss
- ✅ Auslagenabrechnung
- ✅ PDF-Viewer für Belege

**Admin-Portal:**
- ✅ Login & Dashboard
- ✅ Touren-Verwaltung
- ✅ Auslagen-Verwaltung
- ✅ Fahrer-Verwaltung
- ✅ KW-Export (PDF)
- ✅ Statistiken
- ✅ Abrechnung pro Fahrer **NEU!**

**PDF-System:**
- ✅ Upload von Belegen
- ✅ Viewer mit Signed URLs
- ✅ Download-Funktion
- ✅ KW-Export für Touren
- ✅ KW-Export für Auslagen
