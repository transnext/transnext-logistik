# TN-HF-001 – Telefonnummer auf der öffentlichen Website

Datum: 04.11.2026
Status: Hotfix zur Veröffentlichung über Pull Request

## Auftrag
Die veröffentlichte Erreichbarkeitsnummer auf allen überprüften öffentlichen Kontakt- und Rechtstexten von `+49 155 635 098 86` auf **`+49 152 57068633`** ändern. Die anklickbaren Links werden von `tel:+4915563509886` auf `tel:+4915257068633` korrigiert.

## Ausgangsstand
- Repository: `transnext/transnext-logistik`
- Ausgangsbranch: `main`
- Vorher-Commit: `22ccfac038639f5a79f6881a258af931356fd0a1`
- Arbeitsbranch: `fix/tn-hf-001-telefonnummer`
- Bisher veröffentlichter Netlify-Deploy: nicht unabhängig am 04.11.2026 verifiziert; frühere Auditunterlagen können veraltet sein.

## Betroffene Dateien
- `src/components/layout/Footer.tsx` – 1 Nummer, 1 tel-Link
- `src/app/kontakt/page.tsx` – 1 Nummer, 1 tel-Link
- `src/app/impressum/page.tsx` – 1 Nummer, 1 tel-Link
- `src/app/datenschutz/page.tsx` – 2 Nummern, 2 tel-Links
- `docs/changes/TN-HF-001-telefonnummer.md` – Dokumentation

## Tests / Belege
- Vor Änderung wurden die vier betroffenen Dateien vom verifizierten Ausgangscommit gelesen.
- Automatisierte statische Prüfungen vor Commit: exakt fünf Anzeigevorkommen und fünf tel-Links ersetzt, kein alter Text/Link in den vier Dateien verblieben; Anzeigen und Links paarig geprüft.
- Keine Änderungen an API, Authentifizierung, Portal, Datenbank, Supabase oder Hosting-Konfiguration.
- Nicht durchgeführt: vollständiger Repository-Stringscan, `next build`, TypeScript-/Lint-Checks, echte Browser-/Mobile-Tests und Netlify-Live-Deploy-Prüfung. Diese Prüfgrenzen müssen vor bzw. nach Veröffentlichung berücksichtigt werden.

## Risiko und Rollback
- Geringes technisches Risiko, da nur statische Text- und Linkwerte geändert werden.
- Falls fehlerhaft: den PR-Merge-Commit über GitHub-Revert rückgängig machen oder den vorherigen verifizierten Netlify-Deploy kontrolliert wiederherstellen. Keine Datenbankmigration, daher kein DB-Rollback nötig.
- Nach Merge: Live-Seiten `/`, `/kontakt`, `/impressum` und `/datenschutz` sowie die `tel:`-Links prüfen; Netlify-Published-Deploy/Commit festhalten.

## Ergänzung TN-HF-001b – Nachkontrolle und Restverweise (04.11.2026)
- Nach dem ersten Merge (`03a3ad4217be1490cbd5ad6892991c8016f3b390`) wurden weitere öffentliche Seiten gelesen.
- `src/app/faq/page.tsx`: zwei zusätzliche sichtbare Vorkommen und zwei zusätzliche `tel:`-Links korrigiert.
- `src/app/fahrzeugueberfuehrung/page.tsx`: ein zusätzlicher `tel:`-Link ohne sichtbare Rufnummer korrigiert.
- Die Karriereseite hat eine **abweichende, ausdrücklich der Ansprechpartnerin für Bewerbungen zugeordnete Nummer** (`+49 155 635 098 87`); diese wurde bewusst nicht ohne ausdrückliche Freigabe ersetzt.
- Gesamt in beiden Hotfix-PRs: sieben Anzeigen und acht `tel:`-Links zur allgemeinen Erreichbarkeitsnummer korrigiert.
- Statische Stringprüfung für zwei ergänzte Code-Dateien bestanden; keine weiteren Codeänderungen. Build-/Browser-/Produktivdeploy-Prüfung separat.
- Branch: `fix/tn-hf-001b-restliche-kontaktlinks`; Ausgangs-SHA `03a3ad4217be1490cbd5ad6892991c8016f3b390`. Rollback: Revert des zweiten PR-Merge-Commits; keine Datenbankfolgen.
