# Transnext Logistik - Fix Protokoll

## Erledigt

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

## Offen

- Keine offenen Aufgaben
