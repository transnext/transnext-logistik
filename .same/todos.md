# Transnext Logistik - Aktuelle Aufgaben

## In Arbeit 🔧

### TypeScript-Fehler beheben (05.06.2026)

**Fehler 1: admin/fahrer/page.tsx - zeitmodell**
- [ ] Zeile 290: `zeitmodell` aus updateFahrer-Aufruf entfernen
- [ ] Zeile 230: `zeitmodell` aus createFahrer-Aufruf entfernen
- [ ] Zeile 265: `zeitmodell` aus handleEditFahrer entfernen
- [ ] Zeile 72: `zeitmodell` aus emptyFahrerForm entfernen
- [ ] createFahrer API: `zeitmodell` Parameter entfernen

**Fehler 2: onboarding/[token]/page.tsx - Fehlende Exporte**
- [ ] validateQuestionnaireForm hinzufügen
- [ ] LICENSE_CLASS_OPTIONS hinzufügen
- [ ] MARITAL_STATUS_OPTIONS hinzufügen
- [ ] TAX_CLASS_OPTIONS hinzufügen
- [ ] DENOMINATION_OPTIONS hinzufügen
- [ ] QuestionnaireFormData erweitern: birth_name, birth_country, tax_class, denomination, license_classes_array
- [ ] getErrorMessage lokale Funktion hinzufügen oder import

## Erledigt ✅

### Nicholas Mandzel Auth/Zuordnungsproblem (05.06.2026)

**Problem 1: "Hallo Fahrer" bei Gmail-Account**
- ✅ Diagnose: Gmail-Account (`mandzelnicholas@gmail.com`) war nicht mit Fahrer-Eintrag verknüpft
- ✅ Fix: Fahrer-Eintrag `user_id` auf Gmail-Account umgestellt
- ✅ Historische Daten (133 Arbeitsnachweise, 61 Auslagen) auf Gmail-Account migriert

**Problem 2: Login-Loop bei Auslagenabrechnung**
- ✅ Diagnose: Harter `role !== 'fahrer'` Check in auslagenabrechnung/page.tsx
- ✅ Fix: Ersetzt durch `canAccessFahrerportal()` (Commit: `101e71d`)

**Durchgeführte SQL-Änderungen:**
```sql
-- Fahrer-Verknüpfung korrigiert
UPDATE fahrer SET user_id = 'b23391e7-a84d-4c6d-8055-6b51e98c4f64'
WHERE id = '2a657006-a09e-44b6-b673-a50a6d81ab3f';

-- Historische Arbeitsnachweise migriert (133 Stück)
UPDATE arbeitsnachweise SET user_id = 'b23391e7-a84d-4c6d-8055-6b51e98c4f64'
WHERE user_id = '9783a8cf-24a1-4551-a909-23efad1eea5c';

-- Historische Auslagennachweise migriert (61 Stück)
UPDATE auslagennachweise SET user_id = 'b23391e7-a84d-4c6d-8055-6b51e98c4f64'
WHERE user_id = '9783a8cf-24a1-4551-a909-23efad1eea5c';
```

**Durchgeführte Code-Änderungen:**
- `src/app/fahrerportal/auslagenabrechnung/page.tsx`: Rollen-Check korrigiert

## Neue Account-Zuordnung

| Account | E-Mail | Rolle | Fahrer-Verknüpfung |
|---------|--------|-------|-------------------|
| Gmail | mandzelnicholas@gmail.com | fahrer | ✅ Nicholas Mandzel |
| Transnext | n.mandzel@transnext.de | admin | Keine (nur Admin) |
