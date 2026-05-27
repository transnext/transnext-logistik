# Tour State Machine - Single Source of Truth

## 1. Verbindliche Spezifikation

### Tour-Status (tours.status)

| Status | Beschreibung | Nächste Aktion |
|--------|--------------|----------------|
| `neu` | Tour erstellt, kein Fahrer zugewiesen | Admin weist Fahrer zu |
| `uebernahme_offen` | Fahrer zugewiesen, Übernahme steht aus | Fahrer startet Übernahme |
| `abgabe_offen` | Übernahme abgeschlossen, Abgabe steht aus | Fahrer startet Abgabe |
| `abgeschlossen` | Tour vollständig abgeschlossen | Keine Aktionen mehr |

### Protokoll-Phasen (tour_protocols.phase)

| Phase | Beschreibung | Wann abgeschlossen |
|-------|--------------|-------------------|
| `pickup` | Übernahme-Protokoll | `completed_at IS NOT NULL` |
| `dropoff` | Abgabe-Protokoll | `completed_at IS NOT NULL` |

## 2. State Machine Transitions

```
                      TOUR LIFECYCLE                         │
    ┌──────────┐   assign_driver   ┌───────────────────┐
    │   neu    │ ─────────────────→│ uebernahme_offen  │
    └──────────┘                   └─────────┬─────────┘
                                             │
                                             │ submit_pickup
                                             │ (tour_protocols.pickup.completed_at = now())
                                             ▼
                                   ┌───────────────────┐
                                   │   abgabe_offen    │
                                   └─────────┬─────────┘
                                             │
                                             │ submit_dropoff
                                             │ (tour_protocols.dropoff.completed_at = now())
                                             ▼
                                   ┌───────────────────┐
                                   │   abgeschlossen   │
                                   └───────────────────┘
```

### Transition Table

| Current State | Action | Next State | Guard Conditions |
|---------------|--------|------------|------------------|
| `neu` | `assign_driver` | `uebernahme_offen` | `assigned_driver_id IS NOT NULL` |
| `uebernahme_offen` | `submit_pickup` | `abgabe_offen` | Pickup-Protokoll vollständig, Pflichtfotos vorhanden, Signatur vorhanden |
| `abgabe_offen` | `submit_dropoff` | `abgeschlossen` | Dropoff-Protokoll vollständig, Pflichtfotos vorhanden, Signatur vorhanden, Pickup bereits abgeschlossen |
| `abgeschlossen` | - | - | Keine Fahrer-Aktionen erlaubt |

### Blocking Rules (DB-seitig erzwungen)

| Situation | Blockiert durch | Fehlermeldung |
|-----------|-----------------|---------------|
| Dropoff vor Pickup | Trigger `validate_dropoff_before_pickup` | "Pickup muss vor Dropoff abgeschlossen sein" |
| Pickup nach Completion | Trigger `block_completed_protocols` | "Protokoll bereits abgeschlossen" |
| Schreiben nach `abgeschlossen` | RLS Policy `can_write_protocol` | Access denied |
| Fremde Tour schreiben | RLS Policy | Access denied |

## 3. Single Source of Truth

### Primäre Quelle: `tours.status`
- Bestimmt den aktuellen Zustand der Tour
- UI liest nur dieses Feld für Badge/Buttons

### Sekundäre Quelle: `tour_protocols`
- Enthält Detaildaten pro Phase
- `completed_at` zeigt an, ob Phase abgeschlossen

### Zusammenhang

```sql
-- Pickup abgeschlossen?
SELECT completed_at IS NOT NULL 
FROM tour_protocols 
WHERE tour_id = ? AND phase = 'pickup';

-- Tour-Status sollte dann sein:
-- IF pickup.completed_at IS NOT NULL THEN status IN ('abgabe_offen', 'abgeschlossen')
```

## 4. UI-Regeln

### Badge auf Tour-Kachel

| Status | Badge-Text | Farbe |
|--------|-----------|-------|
| `uebernahme_offen` | "Übernahme offen" | Gelb |
| `abgabe_offen` | "Abgabe offen" | Orange |
| `abgeschlossen` | "Abgeschlossen" | Grün |

### Next-Action Button

| Status | Button | Ziel |
|--------|--------|------|
| `uebernahme_offen` | "Übernahme starten" | `/fahrer/tour/[id]/pickup` |
| `abgabe_offen` | "Abgabe starten" | `/fahrer/tour/[id]/dropoff` |
| `abgeschlossen` | - | Keine Buttons |

### URL-Guards

| URL | Erlaubt wenn | Sonst |
|-----|--------------|-------|
| `/fahrer/tour/[id]/pickup` | Status = `uebernahme_offen` | Redirect zu Abgabe oder Block |
| `/fahrer/tour/[id]/dropoff` | Status = `abgabe_offen` | Block + Hinweis |

## 5. API-Funktionen (Zentral)

```typescript
// src/lib/tour-progress.ts

export function getTourProgress(tour: Tour): {
  phase: 'pickup' | 'dropoff' | 'completed';
  nextAction: string | null;
  badgeText: string;
  canStartPickup: boolean;
  canStartDropoff: boolean;
}

export async function submitPickup(tourId: string, formData: ProtocolFormData): Promise<void>
// - Upsert tour_protocols (phase = 'pickup', completed_at = now())
// - Update tours.status = 'abgabe_offen'
// - Atomar (Transaktion)

export async function submitDropoff(tourId: string, formData: ProtocolFormData): Promise<void>
// - Guard: Pickup muss completed sein
// - Upsert tour_protocols (phase = 'dropoff', completed_at = now())
// - Update tours.status = 'abgeschlossen'
// - Atomar (Transaktion)
```

## 6. DB-Guards & Trigger

### RLS Policy: can_write_protocol(tour_id)

```sql
-- Fahrer darf nur schreiben wenn:
-- 1. Tour ist ihm zugewiesen
-- 2. Status != 'abgeschlossen'

RETURN (
  is_admin_or_disponent()
  OR (
    is_assigned_driver(tour_id)
    AND NOT is_tour_completed(tour_id)
  )
);
```

### Trigger: block_completed_protocols

```sql
-- Blockiert INSERT/UPDATE auf tour_protocols wenn Tour abgeschlossen
CREATE TRIGGER block_completed_protocols
BEFORE INSERT OR UPDATE ON tour_protocols
FOR EACH ROW
EXECUTE FUNCTION block_completed_tour_modifications();
```

### Trigger: validate_dropoff_before_pickup

```sql
-- Blockiert Dropoff wenn Pickup nicht abgeschlossen
CREATE TRIGGER validate_dropoff_before_pickup
BEFORE INSERT OR UPDATE ON tour_protocols
FOR EACH ROW
WHEN (NEW.phase = 'dropoff' AND NEW.completed_at IS NOT NULL)
EXECUTE FUNCTION validate_pickup_completed();
```
