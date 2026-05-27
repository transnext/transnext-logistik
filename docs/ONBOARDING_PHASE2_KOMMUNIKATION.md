# Onboarding Phase 2 – Kommunikation und Terminprozess

**Stand:** 28. Mai 2026
**Commits:** c5971a2, 038e3e5, ab37424, d2da5b3

---

## Übersicht

Phase 2 des Onboarding-Systems ermöglicht strukturierte Kommunikation mit Bewerbern:
- E-Mail-Vorlagen für alle wichtigen Prozessschritte
- Terminangebot mit 3 Slots
- Teams-Link-Verwaltung
- Kommunikationshistorie

---

## Neue Datenbankänderungen

### Migration: `20260528_onboarding_phase2_communication.sql`

**Neue Spalten in `onboarding_candidates`:**
| Spalte | Typ | Beschreibung |
|--------|-----|--------------|
| `termin_slot_1` | TIMESTAMPTZ | Erster Terminvorschlag |
| `termin_slot_2` | TIMESTAMPTZ | Zweiter Terminvorschlag |
| `termin_slot_3` | TIMESTAMPTZ | Dritter Terminvorschlag |
| `termin_bemerkung` | TEXT | Bemerkung zu Terminen |
| `termin_gewaehlt` | INTEGER | Gewählter Slot (1, 2 oder 3) |

**Neue ENUMs:**
```sql
CREATE TYPE onboarding_comm_type AS ENUM (
  'erstkontakt', 'terminangebot', 'teams_link', 'personalfragebogen',
  'infomaterial', 'fehlende_dokumente', 'vertrag', 'absage', 'willkommen', 'sonstiges'
);

CREATE TYPE onboarding_comm_status AS ENUM (
  'prepared', 'copied', 'sent_manual', 'sent_auto'
);
```

**Neue Tabelle `onboarding_communications`:**
| Spalte | Typ | Beschreibung |
|--------|-----|--------------|
| `id` | UUID | Primärschlüssel |
| `candidate_id` | UUID | FK zu onboarding_candidates |
| `comm_type` | onboarding_comm_type | Art der Kommunikation |
| `subject` | TEXT | Betreff |
| `body` | TEXT | Nachrichtentext |
| `status` | onboarding_comm_status | Status |
| `created_by` | UUID | Ersteller |
| `created_by_name` | TEXT | Name des Erstellers |
| `created_at` | TIMESTAMPTZ | Erstellungsdatum |
| `sent_at` | TIMESTAMPTZ | Versanddatum |

---

## E-Mail-Vorlagen

### Datei: `src/lib/onboarding-email-templates.ts`

| Template | Beschreibung | Status-Update |
|----------|--------------|---------------|
| `erstkontakt` | Einladung zum Gespräch | `kontakt_aufgenommen` |
| `terminangebot` | 3 Terminvorschläge | `termin_angeboten` |
| `teams_link` | Bestätigter Termin mit Link | `termin_geplant` |
| `personalfragebogen` | Fragebogen anfordern | `personalfragebogen_gesendet` |
| `infomaterial` | Infos zum Start | `infomaterial_gesendet` |
| `fehlende_dokumente` | Dokumente nachfordern | `dokumente_angefordert` |
| `vertrag` | Vertrag senden | `vertrag_gesendet` |
| `absage` | Absage | `abgelehnt` |
| `willkommen` | Willkommen | `freigegeben` |

### Template-Variablen

```typescript
{{vorname}}          // Vorname des Kandidaten
{{nachname}}         // Nachname des Kandidaten
{{termin_1}}         // Erster Terminvorschlag (formatiert)
{{termin_2}}         // Zweiter Terminvorschlag
{{termin_3}}         // Dritter Terminvorschlag
{{teams_link}}       // Teams-Meeting-Link
{{ansprechpartner}}  // Name des HR-Mitarbeiters
{{firma}}            // TransNext Logistik GmbH
{{portal_link}}      // Fahrer-Portal-Link (zukünftig)
```

---

## UI-Änderungen

### Kandidaten-Detailseite (`/admin/onboarding/[id]`)

**Neue Bereiche:**

1. **Termin-Slots** (im Stammdaten-Bereich)
   - 3 datetime-local Felder für Terminvorschläge
   - Termin-Bemerkung (Freitext)
   - Bestätigter Termin

2. **Teams-Link** (im Stammdaten-Bereich)
   - Eingabefeld für Teams-Meeting-Link
   - Button zum Öffnen des Links

3. **Kommunikation** (neue Card)
   - 8 Buttons für E-Mail-Aktionen
   - Kommunikationshistorie (letzte 5 Einträge)

4. **Kommunikations-Modal**
   - Betreff (editierbar)
   - Nachrichtentext (editierbar)
   - Hinweise bei fehlenden Daten
   - "Text kopieren" Button
   - "Als gesendet markieren" Button

---

## API-Erweiterungen

### Neue Funktionen in `onboarding-api.ts`

```typescript
// Kommunikationen eines Kandidaten laden
getCandidateCommunications(candidateId: string): Promise<OnboardingCommunication[]>

// Neue Kommunikation erstellen
createCommunication(
  candidateId: string,
  commType: OnboardingCommType,
  subject: string | null,
  body: string,
  status?: OnboardingCommStatus
): Promise<{ success: boolean; id?: string; error?: string }>

// Status einer Kommunikation aktualisieren
updateCommunicationStatus(
  commId: string,
  status: OnboardingCommStatus
): Promise<{ success: boolean; error?: string }>
```

### Neue Labels

```typescript
COMM_TYPE_LABELS: {
  'erstkontakt': 'Erstkontakt',
  'terminangebot': 'Terminangebot',
  'teams_link': 'Teams-Link',
  // ...
}

COMM_STATUS_LABELS: {
  'prepared': 'Vorbereitet',
  'copied': 'Kopiert',
  'sent_manual': 'Manuell gesendet',
  'sent_auto': 'Automatisch gesendet'
}
```

---

## Workflow

### Typischer Ablauf

1. **Erstkontakt**
   - Marie öffnet Kandidaten-Detailseite
   - Klickt auf "Erstkontakt"
   - Modal öffnet sich mit vorgefülltem Text
   - Text wird in Zwischenablage kopiert
   - E-Mail wird per Outlook versendet
   - Marie klickt "Als gesendet markieren"
   - Status wird auf "kontakt_aufgenommen" gesetzt

2. **Terminangebot**
   - Marie trägt 3 Terminvorschläge ein
   - Speichert die Änderungen
   - Klickt auf "Terminangebot"
   - Termine werden automatisch in den Text eingefügt
   - Text wird kopiert und versendet

3. **Teams-Link**
   - Marie erstellt Teams-Meeting
   - Trägt Link in Kandidaten-Daten ein
   - Wählt bestätigten Termin aus
   - Klickt auf "Teams-Link"
   - Link wird automatisch eingefügt

---

## Rollen und Sicherheit

| Rolle | Zugriff |
|-------|---------|
| Admin | ✅ Voller Zugriff |
| GF | ✅ Voller Zugriff |
| Disponent | ❌ Kein Zugriff |
| Fahrer | ❌ Kein Zugriff |

---

## Hinweis: Kein automatischer Mailversand

In Phase 2 wurde **kein automatischer Mailversand** implementiert, da:
- Keine Mail-Infrastruktur (Resend, SMTP, etc.) im Projekt vorhanden
- "Text kopieren" Ansatz ist sicherer und flexibler
- Manuelles Senden ermöglicht Kontrolle und Anpassung

**Für Phase 3 geplant:**
- Integration von Resend oder Supabase Edge Function für Mail
- Automatischer Versand mit Bestätigung
- Tracking von Mail-Status (zugestellt, geöffnet)

---

## Migration ausführen

```sql
-- In Supabase SQL Editor ausführen:
-- Datei: supabase/migrations/20260528_onboarding_phase2_communication.sql
```

---

## Dateien

| Datei | Beschreibung |
|-------|--------------|
| `supabase/migrations/20260528_onboarding_phase2_communication.sql` | Datenbank-Migration |
| `src/lib/onboarding-email-templates.ts` | E-Mail-Vorlagen |
| `src/lib/onboarding-api.ts` | API mit neuen Kommunikations-Funktionen |
| `src/app/admin/onboarding/[id]/page.tsx` | Kandidaten-Detailseite mit UI |

---

*Erstellt am 28. Mai 2026*
