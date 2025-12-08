# Todos

## Zeitmodell & Zeiterfassung Implementation

### 1. Datenbank-Schema
- [ ] Migration: `zeitmodell` Feld zu `profiles` Tabelle hinzufügen
- [ ] Migration: `zeiterfassung` Tabelle erstellen (id, user_id, datum, start_zeit, ende_zeit, pause_minuten, status)
- [ ] Migration: Karim Zahouani auf Werkstudent setzen
- [ ] RLS Policies für zeiterfassung Tabelle

### 2. Backend/API
- [ ] `zeitmodell` zu Fahrer-Interface hinzufügen
- [ ] API-Funktionen für Zeiterfassung erstellen (start, pause, stop, get)
- [ ] Gehaltsberechnung erweitern (Stundenlohn für Werkstudent/Teilzeit)

### 3. Admin-Dashboard
- [ ] Zeitmodell-Auswahl beim Fahrer erstellen
- [ ] Zeitmodell-Auswahl beim Fahrer bearbeiten
- [ ] Zeitmodell in Fahrer-Tabelle anzeigen
- [ ] Monatsabrechnung: Unterschiedliche Berechnung je nach Zeitmodell

### 4. Fahrer-Portal
- [ ] Zeiterfassungs-UI auf Monatsabrechnung-Seite
- [ ] Start/Stop/Pause Buttons
- [ ] Live-Timer anzeigen
- [ ] Arbeitstage-Liste anzeigen
- [ ] Gesamtvergütung basierend auf Zeitmodell berechnen

### 5. Testing & Deployment
- [ ] Lokales Testing
- [ ] Git commit & push
