# HR / Onboarding System MVP

## Überblick

Das Onboarding-System ermöglicht Marie und dem HR-Team, Bewerber und Onboarding-Kandidaten strukturiert zu erfassen und durch den Einstellungsprozess zu führen.

## Zugriff

- **Route**: `/admin/onboarding`
- **Detailansicht**: `/admin/onboarding/[id]`
- **Berechtigte Rollen**: Admin, GF
- **Nicht berechtigt**: Disponent, Fahrer

## Funktionen

### 1. Dashboard / Übersicht

Die Übersichtsseite zeigt:
- **Kacheln** mit Statistiken:
  - Gesamt aktiv
  - Neue Bewerber
  - Termin offen
  - Dokumente offen
  - Freigabe offen
  - Freigegeben
- **Filter**: Nach Typ, Status-Kategorie, archiviert
- **Suche**: Nach Name, E-Mail, Telefon

### 2. Kandidat anlegen

**Pflichtfelder**:
- Vorname, Nachname
- E-Mail ODER Telefon (mindestens eines)
- Typ (Minijobber / Subunternehmer / Noch offen)
- Quelle (Indeed, eBay, Empfehlung, Sonstiges)

**Optionale Felder**:
- Ort
- Führerschein vorhanden (Ja/Nein/Unbekannt)
- Erfahrung (Ja/Nein/Unbekannt)
- Verfügbarkeit bekannt (Ja/Nein/Unbekannt)
- Interne Notizen

### 3. Kandidaten-Detailansicht

**Bereich "Prozess-Status"**:
- Aktueller Status als Badge
- Nächste empfohlene Aktion
- Dokumenten-Fortschritt (X von Y vollständig)
- Button: Status ändern

**Bereich "Stammdaten"**:
- Alle editierbaren Felder
- Interview-Datum
- Teams-Link

**Bereich "Dokumente / Checkliste"**:
- Je Kandidatentyp unterschiedliche Dokumenttypen
- Status pro Dokument (Offen, Angefordert, Erhalten, Geprüft, Abgelehnt, Nicht erforderlich)
- Upload-Möglichkeit für Admin/GF
- Download-Link wenn Datei vorhanden

**Bereich "Notizen"**:
- Liste aller internen HR-Notizen
- Neue Notiz hinzufügen
- Ersteller und Datum werden gespeichert

### 4. Status-Management

**Minijobber-Status**:
```
neu → kontakt_aufgenommen → termin_angeboten → termin_geplant
→ gespraech_gefuehrt → geeignet → personalfragebogen_gesendet
→ personalfragebogen_erhalten → dokumente_angefordert
→ dokumente_vollstaendig → infomaterial_gesendet → quiz_offen
→ quiz_bestanden → vertrag_gesendet → vertrag_unterschrieben
→ freigabe_offen → freigegeben → fahrer_erstellt → archiviert
```

**Subunternehmer-Status**:
```
neu → kontakt_aufgenommen → termin_angeboten → termin_geplant
→ gespraech_gefuehrt → geeignet → firmendaten_angefordert
→ firmendaten_erhalten → dokumente_angefordert
→ dokumente_vollstaendig → vertrag_gesendet → vertrag_unterschrieben
→ fahrerlisten_angefordert → freigabe_offen → freigegeben → aktiv → archiviert
```

### 5. Nächste Aktion

Das System zeigt automatisch die empfohlene nächste Aktion basierend auf dem Status:
- `neu` → "Kontakt aufnehmen"
- `kontakt_aufgenommen` → "Termin anbieten"
- `freigabe_offen` → "Admin/GF-Freigabe erteilen"
- etc.

### 6. Dokumententypen

**Minijobber**:
- Personalfragebogen
- Führerschein
- Ausweis
- Vertrag
- Schulungsnachweis
- Sonstiges

**Subunternehmer**:
- Gewerbeanmeldung
- Versicherungsnachweis
- Ausweis GF/Ansprechpartner
- Subunternehmervertrag
- Fahrerliste
- Sonstiges

## Datenbank-Schema

### Tabellen

1. **onboarding_candidates**
   - Grunddaten (Name, Kontakt, Typ, Status)
   - Optionale Infos (Führerschein, Erfahrung, Verfügbarkeit)
   - Prozessdaten (Interview-Datum, Teams-Link)
   - Zuweisungen (assigned_to, created_by)

2. **onboarding_documents**
   - candidate_id (FK)
   - document_type, status
   - file_path, file_name, file_size (optional)
   - comment

3. **onboarding_notes**
   - candidate_id (FK)
   - content
   - created_by, created_by_name

### RLS-Policies

Alle drei Tabellen haben RLS aktiviert mit Policies, die nur Admin/GF Zugriff erlauben.

### Storage

- Bucket: `onboarding-documents` (privat)
- Struktur: `{candidate_id}/{document_type}_{timestamp}.{ext}`
- Policies für Admin/GF: INSERT, SELECT, UPDATE, DELETE

## Audit-Logging

Folgende Aktionen werden geloggt:
- `onboarding_candidate_created`
- `onboarding_candidate_updated`
- `onboarding_status_changed`
- `onboarding_candidate_archived`
- `onboarding_document_status_changed`
- `onboarding_note_created`

## Nicht implementiert (Phase 2)

- HR-Rolle als separate Benutzerrolle
- E-Mail-Automation (Terminmail, Personalfragebogen, Infomaterial)
- Automatische Teams-Terminwahl mit 3 Optionen
- Quiz-System
- Automatische Fahrer-Erstellung aus freigegebenen Kandidaten
- Externer Bewerberlink / Bewerbungsformular
- Digitale Signatur für Verträge

## Dateien

| Datei | Beschreibung |
|-------|-------------|
| `supabase/migrations/20260527_onboarding_system.sql` | Datenbank-Migration |
| `src/lib/onboarding-api.ts` | API-Funktionen |
| `src/app/admin/onboarding/page.tsx` | Übersichtsseite |
| `src/app/admin/onboarding/[id]/page.tsx` | Detailseite |
| `src/components/admin/AdminSidebar.tsx` | Menüpunkt hinzugefügt |
| `src/lib/audit-api.ts` | Audit-Aktionen erweitert |
