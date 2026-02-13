# Foto-Kategorie Fixierung - Dokumentation
## Zusammenfassung
Diese Änderung behebt das Problem mit Enum-Fehlern (22P02) beim Foto-Upload durch:
1. **Single Source of Truth** für alle Foto-Kategorien
2. **Legacy-Mapping** für alte Kategorienamen
3. **DB-Migration** für konsistente Daten
## Kanonische Kategorien (20 Stück)
| ID | Label | Legacy-IDs |
|----|-------|------------|
| `tacho` | Tacho | kilometerstand, speedometer |
| `accessories` | Zubehör | zubehoer, zubehör |
| `front` | Vorderseite | **front_exterior**, vorne, vorderseite |
| `windshield` | Windschutzscheibe | windschutzscheibe, frontscheibe |
| `left_front` | Linke Seite vorne | left_side_front, linksfront |
| `wheel_fl` | Rad vorne links | wheel_front_left, rad_vorne_links |
| `mirror_left` | Spiegel links | spiegel_links |
| `interior_front` | Innenraum vorne | innenraum_vorne |
| `interior_rear` | Innenraum hinten | innenraum_hinten |
| `wheel_rl` | Rad hinten links | wheel_rear_left, rad_hinten_links |
| `left_rear` | Linke Seite hinten | left_side_rear, linkshinten |
| `trunk` | Kofferraum innen | trunk_interior, kofferraum |
| `rear` | Hinten außen | **rear_exterior**, hinten, rückseite |
| `emergency_kit` | Notfallkit | notfallkit |
| `spare_wheel` | Reserverad | reserverad |
| `right_rear` | Rechte Seite hinten | right_side_rear, rechtshinten |
| `wheel_rr` | Rad hinten rechts | wheel_rear_right, rad_hinten_rechts |
| `wheel_fr` | Rad vorne rechts | wheel_front_right, rad_vorne_rechts |
| `mirror_right` | Spiegel rechts | spiegel_rechts |
| `right_front` | Rechte Seite vorne | right_side_front, rechtsfront |
Plus Spezial-Kategorien: `damage`, `other`
## DB-Migration ausführen
```sql
-- In Supabase SQL Editor ausführen:
-- Datei: supabase/migrations/20260213_photo_category_v2.sql
```
## Test
Upload mit `category="front_exterior"`:
1. `validateAndNormalize("front_exterior")` -> `"front"`
2. Dateiname: `tour_xxx_pickup_front_12345.jpg`
3. DB-Insert: `category: "front"`
4. **Kein 22P02 Fehler!**
