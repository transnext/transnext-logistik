# TransNext Logistik - TODO Tracker

## KRITISCHER BUG FIX: Preisberechnung (28.05.2026)

### Problem
- Fahrer Salmi Hichan mit 28 km Tour
- Analytics zeigte 23 € Umsatz statt 39 €
- Ertrag war negativ (-3,23 €) wegen falschem Umsatz

### Ursache (2 Fehler)
1. **Erster Fehler (ce7c974)**: Falsche Vergleichsrichtung
   - Code: `if (range.maxKm <= km)` statt `if (km <= range.maxKm)`

2. **Zweiter Fehler (cdcf1bf)**: Inklusive statt exklusive Obergrenze
   - Code: `if (km <= range.maxKm)` → `if (km < range.maxKm)`
   - Die DB-Werte (10, 20, 30, 50) sind EXKLUSIVE Obergrenzen

### Fachliche Preisstufen (final)
| Range | max_km in DB | Logik |
|-------|--------------|-------|
| 0-9 km = 19 € | 10 | km < 10 |
| 10-19 km = 23 € | 20 | km < 20 |
| 20-29 km = 39 € | 30 | km < 30 |
| 30-49 km = 50 € | 50 | km < 50 |

### Testfälle (jetzt korrekt)
| KM | Erwarteter Preis | Status |
|----|------------------|--------|
| 0 | 0 € | ✅ |
| 1 | 19 € | ✅ |
| 9 | 19 € | ✅ |
| 10 | 23 € | ✅ |
| 19 | 23 € | ✅ |
| 20 | 39 € | ✅ |
| 28 | 39 € | ✅ (Salmi Hichan Fall) |
| 29 | 39 € | ✅ |
| 30 | 50 € | ✅ |
| 31 | 50 € | ✅ |

### Betroffene Dateien
- `src/lib/customer-pricing.ts` - `calculateCustomerPrice()` ✅ GEFIXT
- `src/lib/pricing-calculator.ts` - `calculatePriceFromRanges()` ✅ GEFIXT
- `src/lib/salary-calculator.ts` - War bereits korrekt (Lohnberechnung)

### Module die korrigierte Logik nutzen
- ✅ Analytics (`analytics-calculator.ts` → `pricing-calculator.ts`)
- ✅ Abrechnung (nutzt `pricing-calculator.ts`)
- ✅ PDF-Export (nutzt `pricing-calculator.ts`)
- ✅ Fallback-Preise (`customer-pricing.ts`)

### Status
- [x] TypeCheck erfolgreich
- [x] Build erfolgreich
- [x] Commit 1: ce7c974 (Vergleichsrichtung)
- [x] Commit 2: cdcf1bf (Exklusive Obergrenzen)
- [x] Push: main → origin/main

---

## Erledigte Aufgaben
- [x] Onboarding-Seite auf GitHub wiederhergestellt (Commit: 1161fa1)
- [x] Repository neu geklont und synchronisiert
- [x] Abhängigkeiten installiert
- [x] Dev-Server gestartet
- [x] TypeScript-Prüfung: Keine Fehler
- [x] Build erfolgreich: Alle Seiten kompiliert
- [x] **Layout-Fix: Onboarding-Detailseite** (Commit: 7cdf926)
- [x] **Onboarding Phase 2: Kommunikation und Terminprozess** (Commits: c5971a2, 038e3e5, ab37424, d2da5b3)
  - Migration für onboarding_communications Tabelle + Termin-Slots
  - E-Mail-Vorlagen für 9 Kommunikationstypen
  - Termin-Slots (3 Termine) in Kandidaten-Detailseite
  - Kommunikations-Bereich mit Text kopieren
  - Kommunikationshistorie
  - Status-Updates nach Kommunikationsaktionen

## Aktueller Stand
- HR/Onboarding MVP + Phase 2 vollständig implementiert
- **Alle Seiten mit AdminLayout versehen** ✅
- Site läuft auf Netlify: https://transnext.netlify.app/
- Letzter Commit: d2da5b3

## Implementierte Onboarding Phase 2 Features
- **E-Mail-Vorlagen** (9 Templates):
  - Erstkontakt / Einladung zum Gespräch
  - Terminangebot (3 Slots)
  - Teams-Link senden
  - Personalfragebogen senden
  - Infomaterial senden
  - Fehlende Dokumente nachfordern
  - Vertrag senden
  - Absage
  - Willkommen / nächster Schritt
- **Termin-Slots**: 3 Termin-Felder pro Kandidat
- **Teams-Link**: In Stammdaten speichern
- **Kommunikations-Aktionen**: Buttons für jede Vorlage
- **Text kopieren**: Modal mit Copy-Funktion
- **Status-Updates**: Nach Kommunikationsaktionen aktualisierbar
- **Kommunikationshistorie**: Chronologische Liste aller Nachrichten

## Migration manuell ausführen
Die neue Migration `20260528_onboarding_phase2_communication.sql` muss manuell in Supabase angewendet werden:
- Neue Spalten für Termin-Slots
- Neue ENUMs für Kommunikationstypen
- Neue Tabelle onboarding_communications mit RLS

## Hinweis zur Mail-Infrastruktur
- **Kein automatischer Mailversand** implementiert (keine Mail-Infrastruktur vorhanden)
- Stattdessen: "Text kopieren" Funktion
- E-Mail wird manuell per Outlook/Gmail etc. versendet
- Mailversand kann in Phase 3 mit Resend o.ä. ergänzt werden

## Hinweis zur Domain
- transnext.de hatte DNS-Probleme (IP zeigt nicht auf Netlify)
- Muss vom Domain-Admin korrigiert werden
- Netlify-Site funktioniert unter: https://transnext.netlify.app/

# Onboarding Phase 3c: Dokumenten-Self-Upload für Bewerber

## Status: ✅ Implementiert (28.05.2026)

### Zusammenfassung

Bewerber können über ihren sicheren Onboarding-Link Dokumente selbst hochladen.
Die Dokumente werden im Admin-Bereich angezeigt und können geprüft werden.

### Neue Dateien

- `supabase/migrations/20260528_onboarding_phase3c_document_upload.sql`
- `src/app/api/onboarding/[token]/documents/upload/route.ts`

### Geänderte Dateien

- `src/lib/onboarding-api.ts` - Neue Types und API-Funktionen
- `src/app/onboarding/[token]/page.tsx` - Dokument-Upload UI für Bewerber
- `src/app/admin/onboarding/[id]/page.tsx` - Bewerber-Upload-Anzeige + Ablehnung

### Dokumenttypen für Bewerber-Upload

**Minijobber:**
- Führerschein
- Ausweis
- Vertrag
- Schulungsnachweis
- Sonstiges

**Subunternehmer:**
- Gewerbeanmeldung
- Versicherungsnachweis
- Ausweis GF
- Subunternehmervertrag
- Fahrerliste
- Sonstiges

### Technische Umsetzung

**Sicherheit:**
- Token wird serverseitig validiert (API Route)
- candidate_id wird aus Token abgeleitet (nicht vom Client)
- Upload erfolgt mit Service Role Key
- Keine direkten Storage-Zugriffe vom Client
- Abgelaufene/deaktivierte Links blockieren Upload
- Archivierte/abgelehnte Kandidaten blockieren Upload

**Storage-Pfad:**
```
{candidateId}/{documentTypeSlug}/{timestamp}_{sanitized-filename}.{ext}
```

**Dateivalidierung:**
- Erlaubte Typen: PDF, JPG, JPEG, PNG, HEIC, HEIF
- Max. Größe: 50 MB
- Dateiname wird sanitized (keine Umlaute, Sonderzeichen)

### Neue Datenbank-Spalten

`onboarding_documents`:
- `uploaded_by_applicant` (BOOLEAN) - Flag ob vom Bewerber hochgeladen
- `uploaded_at` (TIMESTAMPTZ) - Zeitpunkt des Uploads
- `rejection_reason` (TEXT) - Ablehnungsgrund für Bewerber

### Neue RPC-Funktionen

- `get_applicant_documents_by_token(p_token)` - Dokumente für Bewerber abrufen
- `register_applicant_document_upload(...)` - Upload registrieren (via API Route)

### Bewerber-Ansicht

- Dokumenttypen basierend auf Kandidatentyp
- Status: "Noch hochzuladen", "Hochgeladen", "Bitte erneut hochladen"
- Ablehnungsgrund wird angezeigt
- File-Input mit Validierung
- Upload-Status und Fehlermeldungen

### Admin-Ansicht

- Bewerber-Uploads werden blau markiert ("Bewerber-Upload" Badge)
- Upload-Datum wird angezeigt
- Signierte Download-URLs
- Ablehnen-Button mit Grund-Eingabe
- Ablehnungsgrund wird angezeigt

### Bewusst NICHT umgesetzt

- Personalfragebogen als PDF-Upload (bleibt digital über Phase 3b)
- Steuer-ID/Bankdaten als Dokument
- Quiz
- Digitale Signatur
- Automatische Fahrer-Erstellung
- Automatischer Mailversand

### Nächste Schritte

1. Migration manuell auf Live-Supabase ausführen
2. Testen: Bewerberlink öffnen → Dokument hochladen
3. Testen: Admin sieht Bewerber-Upload
4. Testen: Admin kann Dokument ablehnen mit Grund
5. Testen: Bewerber sieht Ablehnungsgrund und kann erneut hochladen

---

# Onboarding Phase 3b: Digitaler Personalfragebogen

## Status: ✅ Implementiert

### Erledigte Aufgaben

- [x] Migration erstellt: `20260528_onboarding_phase3b_questionnaire.sql`
- [x] Neue Tabelle `onboarding_questionnaires` mit allen Feldern
- [x] ENUMs: `questionnaire_status`, `questionnaire_employment_type`
- [x] RLS-Policies für Admin/GF-Zugriff
- [x] RPC `get_questionnaire_by_token` für Bewerber
- [x] RPC `submit_questionnaire` für Bewerber (mit Validierungen)
- [x] API-Funktionen in `onboarding-api.ts` erweitert
- [x] Public Route `/onboarding/[token]` um Fragebogen erweitert
- [x] Admin-Seite `/admin/onboarding/[id]` um Fragebogen-Anzeige erweitert
- [x] TypeScript-Types für Questionnaire
- [x] Validierungen: E-Mail, IBAN, Geburtsdatum
- [x] Einwilligungen: Datenschutz, Richtigkeit, Onboarding
- [x] Sensible Daten maskiert (Toggle für Admin/GF)
- [x] Status-Update auf `personalfragebogen_erhalten`
- [x] Notiz bei Einreichung
- [x] TypeCheck erfolgreich
- [x] Build erfolgreich

### Neue Dateien

- `supabase/migrations/20260528_onboarding_phase3b_questionnaire.sql`

### Geänderte Dateien

- `src/lib/onboarding-api.ts` - Questionnaire-Types und API-Funktionen
- `src/app/onboarding/[token]/page.tsx` - Fragebogen-Formular
- `src/app/admin/onboarding/[id]/page.tsx` - Fragebogen-Anzeige

### Nächste Schritte

1. Migration manuell auf Live-Supabase ausführen
2. Testen: Bewerberlink öffnen → Fragebogen ausfüllen → absenden
3. Testen: Admin sieht Daten
4. Testen: Status wird `personalfragebogen_erhalten`

### Bewusst NICHT umgesetzt (für spätere Phasen)

- Quiz
- Digitale Signatur
- Automatische Fahrer-Erstellung
- Dokumenten-Self-Uploads (technisch vorbereitet via Storage)
