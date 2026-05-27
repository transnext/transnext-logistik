# Logic & Data Consistency Audit - Ergebnisbericht

**Datum:** 2026-02-13  
**Version:** 166

## 1. Finales State-Machine Diagramm

```
                     TOUR LIFECYCLE

                                                          │
   ┌──────────┐   assign_driver   ┌───────────────────┐   │
   │   neu    │ ─────────────────→│ uebernahme_offen  │   │
   └──────────┘                   └─────────┬─────────┘   │
                                            │             │
                                            │ submit_pickup
                                            │ (DB Trigger: auto_update_tour_status)
                                            ▼             │
                                  ┌───────────────────┐   │
                                  │   abgabe_offen    │   │
                                  └─────────┬─────────┘   │
                                            │             │
                                            │ submit_dropoff
                                            │ (DB Trigger: auto_update_tour_status)
                                            ▼             │
                                  ┌───────────────────┐   │
                                  │   abgeschlossen   │   │
                                  └───────────────────┘   │
                                                          │

```

### Transition Table

| Current State | Action | Next State | DB Guard |
|---------------|--------|------------|----------|
| `neu` | `assign_driver` | `uebernahme_offen` | - |
| `uebernahme_offen` | `submit_pickup` | `abgabe_offen` | `auto_update_tour_status` |
| `abgabe_offen` | `submit_dropoff` | `abgeschlossen` | `auto_update_tour_status` + `validate_dropoff_requires_pickup` |
| `abgeschlossen` | - | - | `block_completed_protocols`, `can_write_protocol()` |

## 2. Liste aller geänderten Dateien

### Neue Dateien
| Datei | Beschreibung |
|-------|--------------|
| `src/lib/tour-progress.ts` | Single Source of Truth für UI State |
| `src/lib/photo-categories.ts` | Single Source of Truth für Foto-Kategorien |
| `supabase/migrations/20260213_tour_state_guards.sql` | DB Trigger & Functions |
| `supabase/migrations/20260213_photo_category_v2.sql` | Foto-Kategorie Enum |
| `docs/TOUR_STATE_MACHINE.md` | State Machine Dokumentation |
| `docs/PHOTO_CATEGORY_FIX.md` | Foto-Kategorie Dokumentation |

### Aktualisierte Dateien
| Datei | Änderung |
|-------|----------|
| `src/lib/protocol-api.ts` | km_stand, validateAndNormalize |
| `src/lib/tour-api.ts` | km_stand, validateAndNormalize |
| `src/lib/tour-types.ts` | TourProtocol.km_stand |
| `src/lib/tour-pdf.ts` | protocol.km_stand |
| `src/lib/protocol-types.ts` | Re-export from photo-categories |

## 3. Liste aller relevanten Policies

### Tabellen-Policies

| Tabelle | Policy | Cmd | Bedingung |
|---------|--------|-----|-----------|
| **tours** | `tours_admin_all` | ALL | `is_admin_or_disponent()` |
| | `fahrer_tours_select` | SELECT | `assigned_driver_id = get_current_fahrer_id()` |
| **tour_protocols** | `tour_protocols_select` | SELECT | `can_read_protocol(tour_id)` |
| | `tour_protocols_insert` | INSERT | `can_write_protocol(tour_id)` |
| | `tour_protocols_update` | UPDATE | `can_write_protocol(tour_id)` |
| | `tour_protocols_delete` | DELETE | `is_admin_or_disponent()` |
| **tour_photos** | `tour_photos_*` | ALL | `can_read/write_protocol(tour_id)` |
| **tour_damages** | `tour_damages_*` | ALL | `can_read/write_protocol(tour_id)` |
| **tour_signatures** | `tour_signatures_*` | ALL | `can_read/write_protocol(tour_id)` |

### Storage-Policies (Bucket: belege)

| Policy | Cmd | Bedingung |
|--------|-----|-----------|
| `belege_select` | SELECT | `can_access_tour_storage(name)` |
| `belege_insert` | INSERT | `can_write_tour_storage(name)` |
| `belege_update` | UPDATE | `can_write_tour_storage(name)` |
| `belege_delete` | DELETE | `is_admin_or_disponent()` |

### DB Trigger (tour_protocols)

| Trigger | Event | Funktion |
|---------|-------|----------|
| `validate_dropoff_requires_pickup_trigger` | INSERT/UPDATE | Blockiert Dropoff vor Pickup |
| `block_protocol_resubmit_trigger` | UPDATE | Blockiert Re-Submit |
| `auto_update_tour_status_trigger` | INSERT/UPDATE | Auto-Update Status |
| `block_completed_protocols` | INSERT/UPDATE | Blockiert nach Abschluss |

## 4. Testprotokoll

### ✅ Positive Tests

| Test | Ergebnis |
|------|----------|
| Neue Tour erstellen | Status = `neu` ✅ |
| Fahrer zuweisen | Status = `uebernahme_offen` ✅ |
| Pickup abschließen | Status = `abgabe_offen` ✅ |
| Dropoff abschließen | Status = `abgeschlossen` ✅ |
| Badge zeigt korrekten Status | ✅ |

### ✅ Negative Tests (Blocking)

| Test | Ergebnis | Fehlermeldung |
|------|----------|---------------|
| Dropoff vor Pickup | ❌ Blockiert | "Pickup muss vor Dropoff abgeschlossen sein" |
| Pickup nach Completion | ❌ Blockiert | "Protokoll bereits abgeschlossen" |
| Schreiben in fremde Tour | ❌ Blockiert | RLS Access Denied |
| Schreiben nach abgeschlossen | ❌ Blockiert | RLS + Trigger |

### DB-Test Nachweis
```sql
-- Test: Dropoff vor Pickup
INSERT INTO tour_protocols (tour_id, phase, km_stand, fuel_level, completed_at)
SELECT id, 'dropoff', 50000, 'half', now()
FROM tours WHERE status = 'uebernahme_offen' LIMIT 1;

-- Ergebnis:
ERROR: P0001: Pickup muss vor Dropoff abgeschlossen sein.
CONTEXT: PL/pgSQL function validate_dropoff_requires_pickup() line 7 at RAISE
```

## 5. Single Source of Truth

### Primäre Quelle: `tours.status`
- Bestimmt den Zustand der gesamten Tour
- UI liest nur dieses Feld

### Zentrale Code-Datei: `src/lib/tour-progress.ts`
- `getTourProgress(tour)` → Phase, Badge, Next-Action
- `canAccessPhase(status, phase)` → URL-Guard
- `getPhaseRedirect(tourId, status, phase)` → Redirect-Logik

### Foto-Kategorien: `src/lib/photo-categories.ts`
- `CANONICAL_CATEGORIES` → 20 IDs
- `normalizePhotoCategory(input)` → Legacy-Mapping
- `validateAndNormalize(category, context)` → DB-Insert Validierung

## 6. GitHub Commits

| SHA | Beschreibung |
|-----|--------------|
| `d40e3e5` | tour-progress.ts |
| `ccc61c6` | tour_state_guards.sql |
| `b6e0fb5` | TOUR_STATE_MACHINE.md |
| `6d86a9d` | photo-categories.ts |
| `7a29e95` | photo_category_v2.sql |

## 7. Fazit

 **Audit vollständig abgeschlossen**

- State Machine definiert und dokumentiert
- DB-seitige Guards implementiert und getestet
- RLS Policies verifiziert
- Single Source of Truth etabliert
- Code konsolidiert (keine redundanten Implementierungen)
- Alle Tests bestanden

Das System funktioniert jetzt exakt nach Spezifikation.
