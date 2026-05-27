# TransNext Logistik - TODO Tracker

## Erledigte Aufgaben
- [x] Onboarding-Seite auf GitHub wiederhergestellt (Commit: 1161fa1)
- [x] Repository neu geklont und synchronisiert
- [x] Abhängigkeiten installiert
- [x] Dev-Server gestartet
- [x] TypeScript-Prüfung: Keine Fehler
- [x] Build erfolgreich: Alle Seiten kompiliert
- [x] **Layout-Fix: Onboarding-Detailseite** (Commit: 7cdf926)
- [x] **Onboarding Phase 2: Kommunikation und Terminprozess** (Commits: c5971a2, 038e3e5, ab37424, d2da5b3)
  - Migration für onboarding_communications Tabelle + Termin-Slots
  - E-Mail-Vorlagen für 9 Kommunikationstypen
  - Termin-Slots (3 Termine) in Kandidaten-Detailseite
  - Kommunikations-Bereich mit Text kopieren
  - Kommunikationshistorie
  - Status-Updates nach Kommunikationsaktionen

## Aktueller Stand
- HR/Onboarding MVP + Phase 2 vollständig implementiert
- **Alle Seiten mit AdminLayout versehen** ✅
- Site läuft auf Netlify: https://transnext.netlify.app/
- Letzter Commit: d2da5b3

## Implementierte Onboarding Phase 2 Features
- **E-Mail-Vorlagen** (9 Templates):
  - Erstkontakt / Einladung zum Gespräch
  - Terminangebot (3 Slots)
  - Teams-Link senden
  - Personalfragebogen senden
  - Infomaterial senden
  - Fehlende Dokumente nachfordern
  - Vertrag senden
  - Absage
  - Willkommen / nächster Schritt
- **Termin-Slots**: 3 Termin-Felder pro Kandidat
- **Teams-Link**: In Stammdaten speichern
- **Kommunikations-Aktionen**: Buttons für jede Vorlage
- **Text kopieren**: Modal mit Copy-Funktion
- **Status-Updates**: Nach Kommunikationsaktionen aktualisierbar
- **Kommunikationshistorie**: Chronologische Liste aller Nachrichten

## Migration manuell ausführen
Die neue Migration `20260528_onboarding_phase2_communication.sql` muss manuell in Supabase angewendet werden:
- Neue Spalten für Termin-Slots
- Neue ENUMs für Kommunikationstypen
- Neue Tabelle onboarding_communications mit RLS

## Hinweis zur Mail-Infrastruktur
- **Kein automatischer Mailversand** implementiert (keine Mail-Infrastruktur vorhanden)
- Stattdessen: "Text kopieren" Funktion
- E-Mail wird manuell per Outlook/Gmail etc. versendet
- Mailversand kann in Phase 3 mit Resend o.ä. ergänzt werden

## Hinweis zur Domain
- transnext.de hatte DNS-Probleme (IP zeigt nicht auf Netlify)
- Muss vom Domain-Admin korrigiert werden
- Netlify-Site funktioniert unter: https://transnext.netlify.app/
