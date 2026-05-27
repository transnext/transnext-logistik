# Onboarding Phase 3a – Externer Bewerberlink

**Stand:** 28. Mai 2026

---

## Übersicht

Phase 3a ermöglicht es HR-Mitarbeitern, einen sicheren externen Link für Bewerber zu generieren. Über diesen Link können Bewerber:

- Ihre Kontaktdaten bestätigen/korrigieren
- Einen von drei vorgeschlagenen Terminen auswählen
- Einen optionalen Kommentar hinterlassen

---

## Neue Datenbankänderungen

### Migration: `20260528_onboarding_phase3a_public_links.sql`

**Neue Tabelle `onboarding_public_links`:**

| Spalte | Typ | Beschreibung |
|--------|-----|--------------|
| `id` | UUID | Primärschlüssel |
| `candidate_id` | UUID | FK zu onboarding_candidates |
| `token` | TEXT | Sicherer Token (64 Hex-Zeichen = 256 bit) |
| `purpose` | ENUM | Zweck: `appointment_selection`, `document_upload`, `data_confirmation` |
| `status` | ENUM | Status: `active`, `used`, `expired`, `revoked` |
| `expires_at` | TIMESTAMPTZ | Ablaufdatum |
| `created_by` | UUID | Ersteller |
| `created_by_name` | TEXT | Name des Erstellers |
| `created_at` | TIMESTAMPTZ | Erstellungsdatum |
| `used_at` | TIMESTAMPTZ | Verwendungsdatum |

**Neue Spalten in `onboarding_candidates`:**

| Spalte | Typ | Beschreibung |
|--------|-----|--------------|
| `applicant_comment` | TEXT | Kommentar vom Bewerber |
| `appointment_selected_at` | TIMESTAMPTZ | Zeitpunkt der Terminwahl |
| `applicant_data_updated_at` | TIMESTAMPTZ | Letzte Änderung durch Bewerber |

**Neue SQL-Funktionen:**

| Funktion | Beschreibung |
|----------|--------------|
| `get_candidate_by_public_token(p_token)` | Validiert Token und gibt erlaubte Kandidatendaten zurück |
| `submit_appointment_selection(...)` | Speichert Terminwahl und Kontaktdaten |

---

## Token-Konzept

### Sicherheit

- **Token-Länge:** 64 Hex-Zeichen (256 bit)
- **Generierung:** `crypto.getRandomValues()` (kryptografisch sicher)
- **Nicht erratbar:** Zufällige Bytes, keine UUIDs oder sequenzielle Werte
- **Ablaufdatum:** Standard 7 Tage, konfigurierbar

### Token-Status

| Status | Beschreibung |
|--------|--------------|
| `active` | Link ist gültig und kann verwendet werden |
| `used` | Bewerber hat Termin gewählt |
| `expired` | Ablaufdatum überschritten |
| `revoked` | Manuell deaktiviert |

---

## Öffentliche Route

### URL

```
/onboarding/[token]
```

Beispiel: `https://transnext.netlify.app/onboarding/a1b2c3d4e5f6...`

### Verhalten

1. **Token-Validierung:**
   - Prüft ob Token existiert
   - Prüft Ablaufdatum
   - Prüft Status (active/used/revoked)
   - Prüft Kandidaten-Status (nicht archiviert/abgelehnt)

2. **Bei gültigem Token:**
   - Zeigt Begrüßung mit Vor-/Nachname
   - Zeigt 3 Terminvorschläge
   - Formular für Kontaktdaten (E-Mail, Telefon, Stadt)
   - Optionales Kommentarfeld
   - "Termin bestätigen" Button

3. **Bei bereits verwendetem Token:**
   - Zeigt Bestätigung mit gewähltem Termin
   - Keine erneute Auswahl möglich

4. **Bei ungültigem/abgelaufenem Token:**
   - Zeigt Fehlermeldung
   - Kontaktinformationen für Rückfragen

### Was NICHT angezeigt wird

- Interne HR-Notizen
- Dokumentenliste
- Audit-Logs
- Status-Historie
- Andere Kandidaten-Daten

---

## Admin-UI

### Im Kommunikations-Bereich

Neuer Abschnitt "Bewerberlink (Terminwahl)":

1. **Aktiver Link:**
   - URL-Anzeige mit Kopier-Button
   - Ablaufdatum
   - Deaktivieren-Button

2. **Gewählter Termin:**
   - Anzeige welcher Termin gewählt wurde
   - Zeitpunkt der Auswahl

3. **Bewerber-Kommentar:**
   - Anzeige falls vorhanden

4. **Link erstellen:**
   - Button "Bewerberlink erstellen (7 Tage gültig)"
   - Nur wenn kein aktiver Link existiert
   - Nur wenn Terminvorschläge eingetragen sind

5. **Link-Historie:**
   - Bisherige Links mit Status

---

## E-Mail-Template

Das Terminangebot-Template enthält nun die Variable `{{bewerber_link}}`:

```
Klicken Sie einfach auf folgenden Link, um Ihren Wunschtermin auszuwählen:
{{bewerber_link}}
```

Wenn ein aktiver Link existiert, wird er automatisch eingefügt.

---

## Ablauf

### Typischer Workflow

1. **Marie (HR):**
   - Trägt 3 Terminvorschläge ein
   - Speichert die Änderungen
   - Klickt "Bewerberlink erstellen"
   - Link wird automatisch kopiert

2. **Marie (HR):**
   - Öffnet "Terminangebot" Template
   - {{bewerber_link}} ist automatisch eingefügt
   - Kopiert Text und sendet E-Mail

3. **Bewerber:**
   - Erhält E-Mail mit Link
   - Klickt auf Link
   - Sieht Terminvorschläge
   - Korrigiert ggf. Kontaktdaten
   - Wählt Termin
   - Erhält Bestätigung

4. **Marie (HR):**
   - Sieht in der Kandidaten-Detailseite:
     - "Bewerber hat Termin 2 gewählt"
     - Ggf. Kommentar
   - Status automatisch auf "termin_geplant"
   - Kann Teams-Link senden

---

## API-Funktionen

### Neue Funktionen in `onboarding-api.ts`

```typescript
// Admin-Funktionen
getCandidatePublicLinks(candidateId): Promise<OnboardingPublicLink[]>
createPublicLink(candidateId, purpose, expiresInDays): Promise<{ success, link?, url?, error? }>
revokePublicLink(linkId): Promise<{ success, error? }>
getActivePublicLink(candidateId): Promise<OnboardingPublicLink | null>
generatePublicLinkUrl(token): string

// Öffentliche Funktionen (via RPC)
getPublicCandidateByToken(token): Promise<{ success, candidate?, error? }>
submitAppointmentSelection(token, slot, email?, phone?, city?, comment?): Promise<{ success, error? }>
```

---

## Sicherheit

### RLS-Policies

- **Admin/GF:** Voller Zugriff auf `onboarding_public_links`
- **Anon:** Lese-Zugriff nur auf aktive, nicht-abgelaufene Links
- **Kandidaten-Daten:** Zugriff nur über `SECURITY DEFINER` Funktionen

### Validierungen

- Token muss mindestens 32 Zeichen lang sein
- Link muss aktiv sein
- Link darf nicht abgelaufen sein
- Kandidat darf nicht archiviert/abgelehnt sein
- Termin-Slot muss vorhanden sein

---

## Dateien

| Datei | Beschreibung |
|-------|--------------|
| `supabase/migrations/20260528_onboarding_phase3a_public_links.sql` | Migration |
| `src/lib/onboarding-api.ts` | API-Funktionen erweitert |
| `src/lib/onboarding-email-templates.ts` | `{{bewerber_link}}` Variable |
| `src/app/onboarding/[token]/page.tsx` | Öffentliche Bewerber-Seite |
| `src/app/admin/onboarding/[id]/page.tsx` | Admin-UI erweitert |

---

## Was NICHT in Phase 3a enthalten ist

- Automatischer E-Mail-Versand
- Digitale Signatur
- Quiz
- Vollständiger Personalfragebogen
- Dokumenten-Upload durch Bewerber

Diese Features sind für spätere Phasen geplant.

---

## Migration ausführen

Die Migration muss manuell in Supabase angewendet werden:

```sql
-- In Supabase SQL Editor ausführen:
-- Datei: supabase/migrations/20260528_onboarding_phase3a_public_links.sql
```

---

*Erstellt am 28. Mai 2026*
