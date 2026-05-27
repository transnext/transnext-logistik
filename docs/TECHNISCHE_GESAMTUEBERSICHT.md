# TransNext Logistik Portal - Technische Gesamtübersicht

**Stand:** 27. Mai 2026
**Repository:** `transnext/transnext-logistik`
**Letzter Commit:** `7cdf926` (fix: Onboarding Detail Layout)
**Version:** 268

---

## Inhaltsverzeichnis

1. [Module im Adminportal](#1-module-im-adminportal)
2. [Module im Fahrerportal](#2-module-im-fahrerportal)
3. [Neue Features der letzten Arbeitsphase](#3-neue-features-der-letzten-arbeitsphase)
4. [Datenbankänderungen / Migrationen](#4-datenbankänderungen--migrationen)
5. [Edge Functions / API Routes](#5-edge-functions--api-routes)
6. [Bekannte offene Punkte](#6-bekannte-offene-punkte)
7. [Risiken / Prüfpunkte](#7-risiken--prüfpunkte)
8. [Empfohlene nächste Schritte](#8-empfohlene-nächste-schritte)

---

## 1. Module im Adminportal

### 1.1 Dashboard

| Eigenschaft | Wert |
|-------------|------|
| **Route** | `/admin/dashboard` |
| **Zweck** | Zentrale Übersicht mit Kennzahlen, Alerts, News |
| **Datenquellen** | `arbeitsnachweise`, `auslagennachweise`, `fahrer`, `alerts`, `system_announcements` |
| **Funktionen** | KPI-Kacheln, offene Aufgaben, aktive Hinweise, Quick-Links |
| **Rollen** | Admin, GF, Disponent |
| **Status** | ✅ Stabil |

### 1.2 Analytics

| Eigenschaft | Wert |
|-------------|------|
| **Route** | `/admin/analytics` |
| **Zweck** | Auswertungen und Statistiken |
| **Datenquellen** | `arbeitsnachweise`, `fahrer`, `tours`, `availability` |
| **Funktionen** | Monatliche/wöchentliche KPIs, Diagramme, Export |
| **Rollen** | Admin, GF |
| **Status** | ✅ Stabil |

### 1.3 Tourenverwaltung

| Eigenschaft | Wert |
|-------------|------|
| **Route** | `/admin/fahrzeugtouren` |
| **Zweck** | Touren erstellen, zuweisen, verwalten |
| **Datenquellen** | `tours`, `tour_protocols`, `fahrer`, `kunden` |
| **Funktionen** | CRUD Touren, Fahrer-Zuweisung, Status-Tracking, Protokoll-Ansicht |
| **Rollen** | Admin, GF, Disponent |
| **Status** | ✅ Stabil |

### 1.4 Arbeitsnachweise

| Eigenschaft | Wert |
|-------------|------|
| **Route** | `/admin/arbeitsnachweise` |
| **Zweck** | Hochgeladene Arbeitsnachweise prüfen und freigeben |
| **Datenquellen** | `arbeitsnachweise`, `fahrer` |
| **Funktionen** | Übersicht, Filterung, PDF-Ansicht, Status-Änderung, Nachberechnung |
| **Rollen** | Admin, GF, Disponent |
| **Status** | ✅ Stabil |

### 1.5 Auslagen

| Eigenschaft | Wert |
|-------------|------|
| **Route** | `/admin/auslagen` |
| **Zweck** | Auslagennachweise prüfen und freigeben |
| **Datenquellen** | `auslagennachweise`, `fahrer` |
| **Funktionen** | Übersicht, Filterung, Foto-Ansicht, Betrag prüfen, Status-Änderung |
| **Rollen** | Admin, GF, Disponent |
| **Status** | ✅ Stabil |

### 1.6 Fahrer

| Eigenschaft | Wert |
|-------------|------|
| **Route** | `/admin/fahrer` |
| **Zweck** | Fahrer-Stammdaten verwalten |
| **Datenquellen** | `fahrer`, `profiles`, `auth.users` |
| **Funktionen** | Fahrer-Liste, Filter, Fahrer erstellen (via Edge Function), Fahrerakte öffnen |
| **Rollen** | Admin, GF, Disponent |
| **Status** | ✅ Stabil |

### 1.7 Fahrerakte (Detail)

| Eigenschaft | Wert |
|-------------|------|
| **Route** | `/admin/fahrer/[id]` |
| **Zweck** | Vollständige Fahrerakte mit allen Modulen |
| **Datenquellen** | `fahrer`, `arbeitsnachweise`, `auslagennachweise`, `availability`, `fahrer_documents`, `fahrer_notes`, `fahrer_fuel_cards` |
| **Funktionen** | KPIs, Touren-Historie, Auslagen-Historie, Upload-Pünktlichkeit, Verfügbarkeit, Compliance, Upload-Center, Notizen, Tankkarten, Stammdaten |
| **Rollen** | Admin, GF, Disponent |
| **Status** | 🆕 Neu (Block 4 erweitert) |

### 1.8 Verfügbarkeit

| Eigenschaft | Wert |
|-------------|------|
| **Route** | `/admin/verfuegbarkeit` |
| **Zweck** | Tagesübersicht aller Fahrer-Verfügbarkeiten |
| **Datenquellen** | `availability`, `fahrer`, `tours` |
| **Funktionen** | Kalender-Ansicht, Tages-Detail, Smart-&-Care Export (CSV/Copy), Filter, Status-Markierung |
| **Rollen** | Admin, GF, Disponent |
| **Status** | ✅ Stabil |

### 1.9 Abrechnung

| Eigenschaft | Wert |
|-------------|------|
| **Route** | `/admin/abrechnung` |
| **Zweck** | Wöchentliche Abrechnungsläufe erstellen und exportieren |
| **Datenquellen** | `weekly_invoices`, `arbeitsnachweise`, `auslagennachweise`, `kunden`, `pricing_rules` |
| **Funktionen** | Abrechnungslauf erstellen, Nachberechnung, PDF-Export, Status-Verwaltung (Entwurf→Export→Gesperrt) |
| **Rollen** | Admin, GF |
| **Status** | 🆕 Neu (Nachberechnung erweitert) |

### 1.10 Preislisten

| Eigenschaft | Wert |
|-------------|------|
| **Route** | `/admin/preislisten` |
| **Zweck** | Kundenpreislisten und Entfernungsbasierte Preisregeln |
| **Datenquellen** | `pricing_rules`, `kunden` |
| **Funktionen** | CRUD Preisregeln, KM-basiert, pauschal, kundenspezifisch |
| **Rollen** | Admin, GF |
| **Status** | ✅ Stabil |

### 1.11 Kunden

| Eigenschaft | Wert |
|-------------|------|
| **Route** | `/admin/kunden` |
| **Zweck** | Kundenstammdaten (Smart & Care, Onlogist) |
| **Datenquellen** | `kunden` |
| **Funktionen** | Kunden-Übersicht, Stammdaten-Bearbeitung |
| **Rollen** | Admin, GF |
| **Status** | ✅ Stabil |

### 1.12 Korrekturen

| Eigenschaft | Wert |
|-------------|------|
| **Route** | `/admin/korrekturen` |
| **Zweck** | Korrekturanträge von Fahrern bearbeiten |
| **Datenquellen** | `correction_requests`, `arbeitsnachweise`, `fahrer` |
| **Funktionen** | Korrektur-Liste, Genehmigung/Ablehnung, Kommentare |
| **Rollen** | Admin, GF |
| **Status** | ✅ Stabil |

### 1.13 Alerts

| Eigenschaft | Wert |
|-------------|------|
| **Route** | `/admin/alerts` |
| **Zweck** | System-Alerts (fehlende Nachweise, Probleme) |
| **Datenquellen** | `arbeitsnachweise`, `auslagennachweise`, `fahrer`, `availability` (computed) |
| **Funktionen** | Alert-Liste, Dismissal, Filter nach Typ/Fahrer |
| **Rollen** | Admin, GF, Disponent |
| **Status** | ✅ Stabil |

### 1.14 Einstellungen

| Eigenschaft | Wert |
|-------------|------|
| **Route** | `/admin/einstellungen` |
| **Zweck** | Systemeinstellungen |
| **Datenquellen** | `settings`, `profiles` |
| **Funktionen** | Allgemeine Einstellungen, Benutzerverwaltung (geplant) |
| **Rollen** | Admin, GF |
| **Status** | ✅ Stabil |

### 1.15 Audit-Log

| Eigenschaft | Wert |
|-------------|------|
| **Route** | `/admin/audit-log` |
| **Zweck** | Protokollierung aller wichtigen Aktionen |
| **Datenquellen** | `audit_logs` |
| **Funktionen** | Chronologische Liste, Filter nach Entity/Action/User, Detail-Ansicht |
| **Rollen** | Admin, GF |
| **Status** | ✅ Stabil |

### 1.16 Hinweise (News & Announcements)

| Eigenschaft | Wert |
|-------------|------|
| **Route** | `/admin/hinweise` |
| **Zweck** | Hinweise/News für Admin-Dashboard und Fahrerportal erstellen |
| **Datenquellen** | `system_announcements` |
| **Funktionen** | CRUD Hinweise, Zielgruppen (Admin, Fahrer, Alle), Priorität, Zeitraum, Archivierung |
| **Rollen** | Admin, GF |
| **Status** | 🆕 Neu |

### 1.17 HR / Onboarding

| Eigenschaft | Wert |
|-------------|------|
| **Route** | `/admin/onboarding`, `/admin/onboarding/[id]` |
| **Zweck** | Bewerber-/Kandidatenverwaltung für Fahrer-Onboarding |
| **Datenquellen** | `onboarding_candidates`, `onboarding_documents`, `onboarding_notes` |
| **Funktionen** | Kandidaten-CRUD, Status-Workflow, Dokumente-Checkliste, Notizen, Filter, Archivierung |
| **Rollen** | Admin, GF |
| **Status** | 🆕 Neu (MVP) |

---

## 2. Module im Fahrerportal

### 2.1 Login

| Eigenschaft | Wert |
|-------------|------|
| **Route** | `/fahrerportal` |
| **Zweck** | Authentifizierung für Fahrer |
| **Datenquellen** | `auth.users`, `profiles` |
| **Status** | ✅ Stabil |

### 2.2 Dashboard

| Eigenschaft | Wert |
|-------------|------|
| **Route** | `/fahrerportal/dashboard` |
| **Zweck** | Übersicht für Fahrer mit anstehenden Touren und Alerts |
| **Datenquellen** | `tours`, `arbeitsnachweise`, `auslagennachweise`, `system_announcements` |
| **Funktionen** | Aktive Touren, offene Uploads, Hinweise, Quick-Links |
| **Status** | 🆕 Erweitert (Alerts + Hinweise) |

### 2.3 Meine Touren

| Eigenschaft | Wert |
|-------------|------|
| **Route** | `/fahrerportal/touren` |
| **Zweck** | Alle zugewiesenen Touren des Fahrers |
| **Datenquellen** | `tours`, `tour_protocols` |
| **Funktionen** | Touren-Liste, Filter, Detail-Ansicht, Protokoll-Link |
| **Status** | 🆕 Neu |

### 2.4 Touren-Protokoll

| Eigenschaft | Wert |
|-------------|------|
| **Route** | `/fahrerportal/touren/protokoll` |
| **Zweck** | Übernahme-/Übergabeprotokoll mit Fotos |
| **Datenquellen** | `tour_protocols`, `tour_photos`, `tour_damages`, `tour_signatures` |
| **Funktionen** | Schritt-für-Schritt Protokoll, Foto-Upload, Schäden erfassen, Unterschrift |
| **Status** | ✅ Stabil |

### 2.5 Statistiken

| Eigenschaft | Wert |
|-------------|------|
| **Route** | `/fahrerportal/statistiken` |
| **Zweck** | Persönliche Statistiken des Fahrers |
| **Datenquellen** | `arbeitsnachweise`, `auslagennachweise`, `tours` |
| **Funktionen** | Touren-Übersicht, Verdienst-Statistik, KM-Statistik |
| **Status** | ✅ Stabil |

### 2.6 Arbeitsnachweis hochladen

| Eigenschaft | Wert |
|-------------|------|
| **Route** | `/fahrerportal/arbeitsnachweis` |
| **Zweck** | Arbeitsnachweis (PDF/Bild) hochladen |
| **Datenquellen** | `arbeitsnachweise`, Storage `arbeitsnachweise` |
| **Funktionen** | Datei-Upload, Datum-Auswahl, Kunde-Auswahl, Vorschau |
| **Status** | ✅ Stabil |

### 2.7 Auslage hochladen

| Eigenschaft | Wert |
|-------------|------|
| **Route** | `/fahrerportal/auslagennachweis` |
| **Zweck** | Auslagenbelege hochladen |
| **Datenquellen** | `auslagennachweise`, Storage `auslagen` |
| **Funktionen** | Foto-Upload, Betrag eingeben, Kategorie wählen, Beschreibung |
| **Status** | ✅ Stabil |

### 2.8 Verfügbarkeit

| Eigenschaft | Wert |
|-------------|------|
| **Route** | `/fahrerportal/verfuegbarkeit` |
| **Zweck** | Eigene Verfügbarkeit melden |
| **Datenquellen** | `availability` |
| **Funktionen** | Kalender-Ansicht, Tage markieren (verfügbar/nicht verfügbar/bedingt), Notizen |
| **Status** | ✅ Stabil |

### 2.9 Monatsabrechnung

| Eigenschaft | Wert |
|-------------|------|
| **Route** | `/fahrerportal/monatsabrechnung` |
| **Zweck** | Eigene Touren-/Lohnabrechnung einsehen |
| **Datenquellen** | `arbeitsnachweise`, `weekly_invoices` |
| **Funktionen** | Monatliche Übersicht, PDF-Download |
| **Status** | ✅ Stabil |

### 2.10 Auslagenabrechnung

| Eigenschaft | Wert |
|-------------|------|
| **Route** | `/fahrerportal/auslagenabrechnung` |
| **Zweck** | Eigene Auslagen-Erstattungen einsehen |
| **Datenquellen** | `auslagennachweise` |
| **Funktionen** | Monatliche Übersicht, Status pro Auslage |
| **Status** | ✅ Stabil |

---

## 3. Neue Features der letzten Arbeitsphase

### 3.1 Fahrerakte Upload-Center

**Komponente:** `FahrerakteDocuments.tsx`
**Datenbank:** `fahrer_documents`
**Storage:** `fahrer-dokumente` Bucket

**Funktionen:**
- Dokument-Upload (Ausweis, Führerschein, UVV, Vertrag, Abmahnung, Schulung, Sonstiges)
- HEIC/HEIF Konvertierung serverseitig
- Ablaufdatum-Tracking
- Status: offen → hochgeladen → geprüft → abgelehnt/abgelaufen
- Archivierung mit Grund
- Vollständige Audit-Protokollierung

### 3.2 Fahrerakte Notizen

**Komponente:** `FahrerakteNotes.tsx`
**Datenbank:** `fahrer_notes`

**Funktionen:**
- Interne Notizen zu Fahrern
- Autor-Tracking
- Chronologische Anzeige
- Nur Admin/GF sichtbar

### 3.3 Fahrerakte Tankkarten

**Komponente:** `FahrerakteTankCard.tsx`
**Datenbank:** `fahrer_fuel_cards`

**Funktionen:**
- Tankkarten-Zuweisung (Aral, Shell, DKV, UTA, etc.)
- Kartennummer (letzte 4 Ziffern)
- Status: aktiv, gesperrt, zurückgegeben, verloren
- Ausgabe-/Rückgabedatum

### 3.4 Fahrerakte Compliance

**Komponente:** `FahrerakteCompliance.tsx`
**Lib:** `driver-compliance-calculator.ts`

**Funktionen:**
- Upload-Pünktlichkeit (% der pünktlichen Arbeitsnachweis-Uploads)
- Verfügbarkeits-Compliance (% der eingehaltenen Verfügbarkeiten)
- Zeitraum-Filter
- Detaillierte Aufschlüsselung

### 3.5 Smart-&-Care Verfügbarkeits-Export

**Komponente:** `VerfuegbarkeitDayDetail.tsx`
**Lib:** `availability-export.ts`

**Funktionen:**
- Tages-Verfügbarkeit als CSV exportieren
- Copy-to-Clipboard für schnelles Einfügen
- Format für Smart & Care Disposition
- Zeitschlitz-Informationen

### 3.6 Fahrerportal Meine Touren

**Route:** `/fahrerportal/touren`

**Funktionen:**
- Alle zugewiesenen Touren des eingeloggten Fahrers
- Status-Filter
- Link zum Protokoll
- Fahrzeug- und Kundeninfo

### 3.7 Fahrerportal Dashboard Alerts

**Route:** `/fahrerportal/dashboard`
**Lib:** `fahrerportal-alerts.ts`

**Funktionen:**
- Persönliche Alerts für Fahrer
- Fehlende Arbeitsnachweise
- Offene Protokolle
- Hinweise vom Admin

### 3.8 News & Hinweise System

**Route:** `/admin/hinweise`
**Datenbank:** `system_announcements`

**Funktionen:**
- Hinweise erstellen/bearbeiten
- Zielgruppen: Admin/GF, Disponent, Alle Admin, Fahrer, Alle
- Priorität: Normal, Wichtig, Kritisch
- Zeitraum: Von/Bis
- Archivierung
- Anzeige im Dashboard (Admin + Fahrer)

### 3.9 Abrechnungsläufe + Nachberechnung

**Route:** `/admin/abrechnung`
**Datenbank:** `weekly_invoices`, `arbeitsnachweise`, `auslagennachweise` (erweitert)

**Funktionen:**
- Wöchentliche Abrechnungsläufe
- Nachberechnung für vergangene Zeiträume
- Abrechnungsnummern (ABR-YYYY-KWXX-SC-T)
- Status-Workflow: Entwurf → Exportiert → Gesperrt
- Reguläre vs. Nachberechnungs-Positionen

### 3.10 HR / Onboarding MVP

**Route:** `/admin/onboarding`, `/admin/onboarding/[id]`
**Datenbank:** `onboarding_candidates`, `onboarding_documents`, `onboarding_notes`

**Funktionen:**
- Kandidaten anlegen (Minijobber / Subunternehmer)
- Status-Workflow mit ~20 Stufen
- Dokumente-Checkliste
- Notizen
- Quelle-Tracking (Indeed, eBay, Empfehlung, etc.)
- Filter nach Status-Kategorie
- Archivierung

---

## 4. Datenbankänderungen / Migrationen

### Neueste Migrationen (Phase 2026-05)

| Dateiname | Zweck | Neue Tabellen | Live |
|-----------|-------|---------------|------|
| `20260527_onboarding_system.sql` | HR/Onboarding MVP | `onboarding_candidates`, `onboarding_documents`, `onboarding_notes` | ✅ Angewendet |
| `20260527_system_announcements.sql` | Hinweise-System | `system_announcements` | ✅ Angewendet |
| `20260527_billing_nachberechnung.sql` | Nachberechnung | Erweiterung `arbeitsnachweise`, `weekly_invoices` | ✅ Angewendet |
| `20260527_block4_fahrerakte.sql` | Fahrerakte-Erweiterung | `fahrer_documents`, `fahrer_fuel_cards`, `fahrer_notes` | ✅ Angewendet |
| `20260527_fix_fahrer_dokumente_storage_policies.sql` | Storage RLS Fix | - | ✅ Angewendet |

### Frühere Migrationen (Phase 2026-05 + 2026-02)

| Dateiname | Zweck |
|-----------|-------|
| `20260512_admin_audit_logs.sql` | Audit-Log System |
| `20260512_availability_alert_reviews.sql` | Verfügbarkeits-Alert Reviews |
| `20260512_computed_alert_dismissals.sql` | Alert Dismissals |
| `20260512_fahrer_archiv.sql` | Fahrer-Archivierung |
| `20260512_add_onlogist_customer_and_pricing.sql` | Onlogist-Kunde |
| `20260508_phase1_smart_care_COMPLETE_FINAL.sql` | Smart & Care Integration |
| `20260213_tour_state_guards.sql` | Tour State Machine |

### Neue Spalten

| Tabelle | Spalte | Typ | Zweck |
|---------|--------|-----|-------|
| `arbeitsnachweise` | `billing_type` | ENUM | regulaer/nachberechnung/korrektur |
| `arbeitsnachweise` | `original_billing_period` | TEXT | KW bei Nachberechnung |
| `auslagennachweise` | `billing_type` | ENUM | regulaer/nachberechnung/korrektur |
| `weekly_invoices` | `invoice_number` | TEXT | ABR-YYYY-KWXX-XX-X |
| `weekly_invoices` | `retro_items_count` | INTEGER | Anzahl Nachberechnungen |

### Neue Trigger / Functions

| Name | Zweck |
|------|-------|
| `generate_invoice_number()` | Abrechnungsnummern generieren |
| `update_onboarding_updated_at()` | Onboarding Timestamp |
| `init_onboarding_documents()` | Standard-Dokumente bei Kandidat erstellen |
| `log_onboarding_status_change()` | Audit bei Status-Änderung |

---

## 5. Edge Functions / API Routes

### 5.1 Supabase Edge Function: `create-fahrer`

| Eigenschaft | Wert |
|-------------|------|
| **Pfad** | `supabase/functions/create-fahrer/index.ts` |
| **Zweck** | Neuen Fahrer mit Auth-User erstellen |
| **Authentifizierung** | Bearer Token (Admin/GF/Disponent) |
| **Environment Variables** | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` |
| **Status** | ✅ Deployed |

**Ablauf:**
1. Auth-Header prüfen
2. Rolle prüfen (admin/gf/disponent)
3. User in `auth.users` erstellen
4. Profil in `profiles` erstellen
5. Fahrer in `fahrer` erstellen

### 5.2 Next.js API Route: Fahrer-Dokumente Upload

| Eigenschaft | Wert |
|-------------|------|
| **Pfad** | `src/app/api/admin/fahrer-documents/upload/route.ts` |
| **Zweck** | Fahrer-Dokumente hochladen |
| **Authentifizierung** | Session Token (Admin/GF) |
| **Max Dateigröße** | 50 MB |
| **Erlaubte Typen** | PDF, JPG, PNG, HEIC |
| **Status** | ✅ Aktiv |

**Features:**
- HEIC→JPG Konvertierung serverseitig
- Storage in `fahrer-dokumente` Bucket
- Metadaten in `fahrer_documents` Tabelle

### 5.3 Next.js API Route: Distance Calculation

| Eigenschaft | Wert |
|-------------|------|
| **Pfad** | `src/app/api/distance/route.ts` |
| **Zweck** | Entfernungsberechnung für Preiskalkulation |
| **Status** | ✅ Aktiv |

---

## 6. Bekannte offene Punkte

### Infrastruktur

| Punkt | Beschreibung | Priorität |
|-------|--------------|-----------|
| **Strato/DNS** | Domain transnext.de zeigt nicht auf Netlify | 🔴 Hoch |
| **Migrationen** | Alle Migrationen erfolgreich angewendet | ✅ Erledigt |

### Onboarding Phase 2 (geplant)

| Feature | Beschreibung |
|---------|--------------|
| E-Mail-Automation | Automatische E-Mails bei Status-Änderung |
| Terminwahl | Kandidat kann Termine online buchen |
| Quiz | Online-Quiz für Minijobber |
| Externer Bewerberlink | Öffentliches Bewerbungsformular |
| Fahrer-Erstellung | Automatisch Fahrer aus Kandidat erstellen |

### Weitere offene Features

| Feature | Beschreibung |
|---------|--------------|
| KI-Arbeitsnachweis-Erkennung | Automatische Datenextraktion aus PDFs |
| Passwort-Reset Edge Function | Serverseitiger Passwort-Reset |
| E-Mail-Änderung serverseitig | E-Mail-Adresse via Admin ändern |
| Ablaufende Dokumente Benachrichtigung | Alert bei ablaufenden Führerscheinen etc. |

---

## 7. Risiken / Prüfpunkte

### 🔴 Kritisch - Live-Test erforderlich

| Bereich | Grund |
|---------|-------|
| **HR/Onboarding** | Komplett neues Modul, Workflow testen |
| **Nachberechnung** | Abrechnungsrelevant, Doppelabrechnung verhindern |
| **Fahrerakte Upload-Center** | Storage-Policies, HEIC-Konvertierung |

### 🟡 Wichtig - Überprüfen

| Bereich | Grund |
|---------|-------|
| **RLS Policies** | fahrer_documents, fahrer_fuel_cards, fahrer_notes |
| **Storage Bucket** | fahrer-dokumente, onboarding-documents |
| **Edge Function** | create-fahrer nach Migrations-Update |

### 🟢 Stabil - Monitoring

| Bereich | Status |
|---------|--------|
| Arbeitsnachweise Upload | Stabil |
| Auslagen Upload | Stabil |
| Touren-Protokoll | Stabil |
| Verfügbarkeit | Stabil |

---

## 8. Empfohlene nächste Schritte

### Kurzfristig (1-2 Tage)

1. **DNS korrigieren** - Domain transnext.de auf Netlify zeigen
2. ~~Migrationen anwenden~~ - ✅ Bereits angewendet
3. **Onboarding testen** - Kandidat anlegen, Status ändern, Dokumente
4. **Nachberechnung testen** - Abrechnungslauf mit Nachberechnung

### Mittelfristig (1-2 Wochen)

5. **Fahrerakte dokumentieren** - Schulung für Admin-Team
6. **Hinweise-System einführen** - Erste News erstellen
7. **Compliance-Tracking aktivieren** - KPIs definieren
8. **Alert-System optimieren** - Schwellwerte anpassen

### Später (1+ Monat)

9. **Onboarding Phase 2** - E-Mail-Automation
10. **KI-Erkennung** - Arbeitsnachweis-Datenextraktion
11. **Mobile Optimierung** - Fahrerportal responsive verbessern
12. **Reporting** - Erweiterte Excel/PDF-Exports

---

## Anhang: Technologie-Stack

| Komponente | Technologie |
|------------|-------------|
| **Frontend** | Next.js 16.1.6, React 18, TypeScript |
| **Styling** | Tailwind CSS, shadcn/ui |
| **Backend** | Supabase (PostgreSQL, Auth, Storage, Edge Functions) |
| **Hosting** | Netlify |
| **Package Manager** | Bun |
| **Icons** | Lucide React |
| **PDF** | jsPDF, pdf-lib |

---

*Erstellt am 27. Mai 2026 - Keine Codeänderungen*
