# TransNext Logistik - Todos

## Datenbank-Erweiterung - Februar 2026

### Abgeschlossen ✅

#### 1. Neue SQL Migrationen erstellt
- [x] `20260212_01_enum_types.sql` - Alle ENUM-Typen
- [x] `20260212_02_tours_table.sql` - Haupttabelle für Touren
- [x] `20260212_03_tour_protocols.sql` - Protokoll-Daten
- [x] `20260212_04_tour_photos.sql` - Foto-Dokumentation
- [x] `20260212_05_tour_damages.sql` - Schäden + Schaden-Fotos
- [x] `20260212_06_tour_signatures.sql` - Unterschriften
- [x] `20260212_07_pdf_exports.sql` - PDF-Exporte (versioniert)
- [x] `20260212_08_audit_log.sql` - Vollständiges Audit-Log
- [x] `20260212_09_rls_policies.sql` - Row Level Security
- [x] `20260212_10_helper_functions.sql` - Hilfs-Funktionen

#### 2. Kombiniertes Schema
- [x] `COMPLETE_TOUR_SCHEMA.sql` - Alle Migrationen in einer Datei

#### 3. TypeScript Types & API
- [x] `src/lib/tour-types.ts` - Vollständige TypeScript-Typen
- [x] `src/lib/tour-api.ts` - API-Funktionen für Touren
- [x] `src/lib/tour-pdf.ts` - PDF-Generierung

### Noch zu tun

- [ ] **Supabase Migration ausführen**
  - Kopiere `COMPLETE_TOUR_SCHEMA.sql` in Supabase SQL Editor
  - Führe das Script aus

- [ ] **Storage Bucket prüfen**
  - Bucket "belege" muss existieren (sollte bereits vorhanden sein)
  - Public Access aktivieren

- [ ] **Frontend-Komponenten aktualisieren**
  - Protokoll-Wizard mit neuen Types verbinden
  - Admin-Dashboard für Tour-Ansicht erweitern

- [ ] **PDF-Automatisierung**
  - Bei Abgabe-Abschluss automatisch PDF generieren
  - PDF nach Admin-Änderung neu generieren

---

## Datenbank-Schema Übersicht

### Tabellen

| Tabelle | Beschreibung |
|---------|--------------|
| `tours` | Haupttabelle für Touren |
| `tour_protocols` | Protokoll-Daten (Übernahme/Abgabe) |
| `tour_photos` | Protokoll-Fotos (26 Kategorien) |
| `tour_damages` | Dokumentierte Schäden |
| `tour_damage_photos` | Fotos zu Schäden |
| `tour_signatures` | Unterschriften (Fahrer/Empfänger) |
| `pdf_exports` | Generierte PDFs (versioniert) |
| `audit_log` | Vollständiger Audit-Trail |

### ENUM Types

| Type | Werte |
|------|-------|
| `tour_status` | neu, uebernahme_offen, abgabe_offen, abgeschlossen |
| `fahrzeugart` | pkw, e-auto, transporter |
| `protocol_phase` | pickup, dropoff |
| `fuel_level` | quarter, half, three_quarter, full |
| `photo_category` | 26+ Kategorien |
| `damage_type` | 10 Schadensarten |
| `damage_component` | 50+ Bauteile |
| `audit_action` | create, update, delete, status_change, etc. |

### RLS Policies

| Rolle | Berechtigungen |
|-------|----------------|
| Admin/Disponent | Vollzugriff auf alles |
| Fahrer | Nur eigene zugewiesene Touren sehen |
| Fahrer | Kann Auftragsdaten NICHT ändern |
| Fahrer | Kann Protokoll NUR in aktiver Phase ändern |

### Audit-Logging

- Automatisches Logging bei allen Änderungen an `tours`
- Automatisches Logging bei Protokoll-Abschluss
- Speichert: before_json, after_json, changed_fields
- Nur Admin kann Audit-Log einsehen

---

## API-Funktionen

### Tours (Admin)
- `createTour(data)` - Neue Tour erstellen
- `getAllTours()` - Alle Touren laden
- `getTourById(id)` - Einzelne Tour laden
- `getTourComplete(id)` - Tour mit allen Relationen
- `updateTour(id, data)` - Tour aktualisieren
- `deleteTour(id)` - Tour löschen
- `assignDriverToTour(tourId, driverId)` - Fahrer zuweisen

### Tours (Fahrer)
- `getDriverTours(userId)` - Eigene aktive Touren
- `getDriverTourHistory(userId)` - Abgeschlossene Touren

### Protocols
- `getOrCreateProtocol(tourId, phase)` - Protokoll holen/erstellen
- `updateProtocol(tourId, phase, data)` - Protokoll aktualisieren
- `completeProtocol(tourId, phase, formData)` - Protokoll abschließen

### Photos
- `uploadPhoto(tourId, phase, category, dataUrl)` - Foto hochladen
- `getPhotos(tourId, phase)` - Fotos laden

### Damages
- `createDamage(tourId, phase, damage)` - Schaden erstellen
- `updateDamage(damageId, damage)` - Schaden aktualisieren
- `deleteDamage(damageId)` - Schaden löschen
- `uploadDamagePhoto(damageId, tourId, dataUrl)` - Schadensfoto
- `getPreExistingDamages(tourId)` - Vorschäden laden

### Signatures
- `saveSignature(tourId, phase, role, dataUrl, name?)` - Unterschrift speichern

### PDF
- `generateTourProtocolPdf(tourData)` - PDF generieren
- `generateAndSavePdf(tourData, changeReason?)` - PDF generieren + speichern
- `getPdfExports(tourId)` - Alle PDF-Versionen laden

### Audit
- `getAuditLog(entity, entityId)` - Audit-Log laden (Admin)
