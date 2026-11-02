# Hotfix: SIXT-Referenz entfernen

Datum: 02.11.2026

## Ausgangsstand und Umfang

- Repository: `transnext/transnext-logistik`
- Aktueller GitHub-`main`, vor Änderungen abgefragt: `cb61807b39a328dc822de97673f3ce3427ebdfbe` (entspricht dem zuletzt bestätigten Stand).
- Neuer Branch: `hotfix/remove-sixt-references`, direkt von diesem Commit; `main` wird nicht geändert.
- Vor Änderungen: sauberer Arbeitsbaum; betroffene Dateien und grafischer Befund separat im Arbeitsprotokoll erfasst.
- Kein geeignetes allgemeines Änderungsprotokoll vorhanden; dieser Bericht dokumentiert den Hotfix.
- Commit-SHA: im zugehörigen Pull Request vollständig dokumentiert; der Commit mit diesem Bericht ist außerdem über `git log -1 --format=%H -- docs/HOTFIX_REMOVE_SIXT_REFERENCES.md` ermittelbar.

## Bestandsaufnahme und Änderungen

Das gesamte versionierte Repository einschließlich versteckter Textdateien wurde nach `SIXT`, `Sixt`, `sixt`, `SIX` und neutralen Logo-Verweisen durchsucht. Öffentliche Seiten, Metadaten, Header, Footer, Links, Kundenlisten, sämtliche Dateien in `public/images/`, Favicons, `src/app/icon.png` und die TransNext-SVG-Komponenten wurden geprüft. Rasterbilder und das neutrale SVG wurden grafisch betrachtet; Dateinamen und ALT-Texte allein dienten nicht zur Zuordnung.

| Datei | Befund / Änderung |
| --- | --- |
| `src/app/referenzen/page.tsx` | Drei JSX-Zeilen entfernt: komplette SIXT-Kachel mit `alt="Partner 2"` unter „Unsere Kunden vertrauen uns“ / „eine Auswahl unserer Partner“. |
| `public/images/logo-2.png` | Bestätigte orange/schwarz/weiße SIXT-Wort-/Bildmarke gelöscht (18.409 Bytes). SHA-256: `65e4a9c170be26f02d3cf2d23ff47d78c8d7aa54ad2b64a10b4b50f657245401`. |
| `docs/HOTFIX_REMOVE_SIXT_REFERENCES.md` | Dieser Bericht hinzugefügt. |

Die direkte produktive URL `https://transnext.de/images/logo-2.png` lieferte vor der Änderung HTTP 200 und exakt denselben SHA-256-Hash. Die produktive Referenzseite enthielt den Bildverweis. Das ist eine Bestandsaufnahme, keine Bestätigung einer Veröffentlichung des Hotfixes.

Andere neutrale Logos sind eindeutig: `leasplan-logo.png` = LeasePlan, `logo-3.svg` = Volvo, `logo-4.png` = thyssenkrupp, `logo-5.png` = Gottfried Schultz, `logo-6.png` = car concept. Sie bleiben erhalten. **Unklare Dateien: keine.** Eine Entfernung der gesamten Galerie ist daher nicht erforderlich. Keine weiteren SIXT-Darstellungen gefunden. `Six` in Analytics-Variablennamen bedeutet sechs Monate; `sixth` in Bibliotheks-Sourcemaps ist ebenfalls kein Markenfund.

Startseite, andere öffentliche Seiten, TransNext-Logo, CI, Funktionen, Fahrer-/Adminportal, Konfiguration und Abhängigkeiten bleiben im Quellcode unverändert. Keine Supabase-, Storage-, Mitarbeiter- oder Datenbankänderungen. Keine neuen Referenzen; keine vertraulichen Rechtsunterlagen im Bericht.

## Prüfungen

- `NEXT_TURBOPACK_EXPERIMENTAL_USE_SYSTEM_TLS_CERTS=1 npm run build`: **erfolgreich**, Next.js 16.1.6, 44 statische Seiten erzeugt. Der erste Build ohne Systemzertifikate scheiterte bereits im Ausgangsstand beim TLS-Abruf von Google Fonts / Inter. Die Umgebungsvariable gilt nur für den Testprozess; keine Konfigurationsänderung. Der vorhandene Build überspringt TypeScript-Prüfungen (`ignoreBuildErrors`), daher separate Prüfung unten.
- `node_modules/.bin/tsc --noEmit`: **fehlgeschlagen**, vor und nach dem Eingriff exakt dieselben acht Fehler: zweimal `zeitmodell` in `admin/fahrer/page.tsx`, fünf fehlende Exporte aus `onboarding-api`, einmal `birth_name` im Onboarding-Formulartyp. Keine Korrektur außerhalb des Hotfix-Umfangs.
- `npm run lint`: **nicht ausführbar**, `bunx` fehlt. Zusätzlich ist das darin verwendete `next lint` unter installiertem Next.js 16 nicht mehr vorhanden (direkt geprüft; CLI behandelt `lint` als ungültiges Projektverzeichnis).
- Ersatzweise `node_modules/.bin/eslint src`: **fehlgeschlagen**, bereits vor Änderungen 103 Fehler und 30 Warnungen. `node_modules/.bin/eslint src/app/referenzen/page.tsx`: **erfolgreich** nach Änderung.
- `git diff --check`: **erfolgreich**.
- Suche im Quellcode, `public`, `.next/server` und `.next/static`: keine SIXT-Marke oder `logo-2.png`-Verweise. Vergleich aller Dateien in öffentlichen Assets und Produktionsartefakten mit dem SHA-256 des entfernten Bildes: keine Kopie vorhanden.
- Chromium/Playwright: alle elf öffentlichen Seiten (`/`, `/referenzen`, drei Leistungsseiten, `/kontakt`, `/ueber-uns`, `/karriere`, `/faq`, `/impressum`, `/datenschutz`) sowie `/fahrerportal` und `/admin` bei 1440 und 390 Pixeln vor/nach Änderung und im lokalen Produktionsbuild geprüft. Alle 26 Seiten-/Viewport-Aufrufe liefern HTTP 200, keine JavaScript-Seitenfehler. Vorher-/Nachhervergleich: Texte, übrige Bildquellen, HTTP-Status und horizontaler Überlauf unverändert; ausschließlich SIXT-Bild entfernt.
- Referenzgalerie auf Desktop und Mobilgerät visuell geprüft: fünf verbleibende Logos, keine SIXT-Kachel, keine defekten Galeriebilder, kein horizontaler Überlauf. Das responsive Raster bleibt ohne weitere CSS-Änderung intakt. Kein Test einer komplett entfernten Galerie erforderlich, da alle Logos identifiziert sind.
- Direkte Bild-URL im lokalen Produktionsserver: **HTTP 404**. Damit wird das SIXT-Asset im neuen Build nicht mehr ausgeliefert.
- Vorhandener mobiler horizontaler Überlauf auf `/impressum` besteht unverändert. Keine Behebung im Hotfix.
- Portalprüfung umfasst nicht angemeldete Einstiegsseiten und unveränderten Quellcode; keine angemeldeten Abläufe, Formulareinsendungen oder Schreibzugriffe auf Produktivdaten getestet.

## Veröffentlichung und Rückfallmöglichkeit

Es wird ausschließlich ein Pull Request gegen `main` erstellt. Kein eigenmächtiges Merge und keine Produktivveröffentlichung. Das Erfolgskriterium auf der produktiven Website bleibt bis zur freigegebenen Veröffentlichung und deren Nachkontrolle offen.

Nach ausdrücklicher Freigabe:

1. Finalen Hotfix-/Merge-Commit feststellen und Veröffentlichung auslösen.
2. In Netlify prüfen, dass genau dieser Commit als **veröffentlichter Produktionsdeploy** der Domain `transnext.de` aktiv ist. GitHub-Commit, erfolgreicher Build oder Deploy Preview allein genügen nicht.
3. `https://transnext.de/referenzen` auf Desktop und Mobilgerät sowie übrige öffentliche Seiten prüfen; keine SIXT-Marke und keine Bildanfrage an `logo-2.png`.
4. `https://transnext.de/images/logo-2.png` direkt, auch mit Cache-Busting und über frischen Browserkontext, prüfen: keine SIXT-Bildauslieferung (404/410 erwartet). Bei Bedarf Netlify-CDN-Cache gezielt bereinigen und erneut prüfen.
5. Produktionsdeploy-ID, Commit-SHA, Zeitpunkt und HTTP-Ergebnisse dokumentieren.

Technischer Rückfall: Hotfix-Commit in einem separaten Branch mit `git revert <Hotfix-Commit-SHA>` rückgängig machen und erneut per PR prüfen; alternativ vorherigen Netlify-Deploy reaktivieren. **Beides kann die entfernte SIXT-Referenz erneut veröffentlichen** und ist deshalb keine geeignete routinemäßige Rückfalloption für diesen Hotfix. Bei anderen Fehlern gezielt nachbessern und die Entfernung erhalten. Kein Umschreiben der Git-Historie.

Frühere Git-Commits, alte Netlify-Deployments/Deploy-URLs, Browser-, Suchmaschinen- und externe Caches können historische Kopien behalten. Dieser Hotfix entfernt das Asset aus dem aktuellen Quellstand und dem nächsten freigegebenen Produktionsdeploy; historische Bestände werden nicht automatisch gelöscht.
