# Transnext Logistik - Fix Protokoll

## Erledigt

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

**Tests logisch verifiziert:**
- [x] Alte Tour KW14-20 mit `weekly_invoice_id NULL` erscheint NICHT mehr
- [x] Neue Tour ab KW21 mit `weekly_invoice_id NULL` erscheint korrekt
- [x] Nachberechnungen nur für Positionen ab KW21/2026
- [x] Auslagen folgen der gleichen Regel
- [x] PDF/Summen zählen keine Altlasten vor KW21

## Offen

- Keine offenen Aufgaben
