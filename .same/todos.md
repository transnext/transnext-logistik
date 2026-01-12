# TransNext Logistik - TODOs

## Erledigt
- [x] Disponent-Rolle implementiert
  - Neue Rolle 'disponent' in Profile-Interface hinzugefügt
  - Admin-Login erlaubt jetzt auch Disponenten
  - Dashboard zeigt Monatsumsatz nur für Admins (nicht für Disponenten)
  - Auftraggeber-Feld in Tour-Bearbeitung nur für Admins sichtbar
  - Edge Function für Fahrer-Erstellung erlaubt auch Disponenten

## Hinweise für Disponenten-Einrichtung
- Um eine Disponentin anzulegen, muss in der Supabase-Datenbank:
  1. Ein Auth-User erstellt werden (Supabase Auth → Users → Create User)
  2. In der `profiles`-Tabelle ein Eintrag mit `role: 'disponent'` erstellt werden

## Offen
- [ ] Optional: Admin-Bereich für Disponent-Erstellung im Dashboard
