# 📄 PDF-Upload-System - Deployment-Anleitung

## ✅ Was wurde implementiert?

Das vollständige PDF-Upload-System für Belege mit:
- **File-Upload** beim Erstellen von Arbeits- und Auslagennachweisen
- **Supabase Storage** für sichere PDF-Speicherung
- **PDF-Viewer** zum Anschauen der PDFs direkt im Browser
- **Download-Funktion** für PDFs
- **Row-Level Security** - Fahrer sehen nur ihre Belege, Admins sehen alle

---

## 🚀 Deployment-Schritte

### Schritt 1: Datenbank-Migration ausführen

Du musst die neue Migration in Supabase ausführen, um den Storage Bucket und die Tabellen-Spalten zu erstellen.

#### Option A: Über Supabase Dashboard (EMPFOHLEN)

1. Gehe zu https://supabase.com/dashboard/project/jrghrymgjkpyfnopzxyp/editor
2. Klicke auf **SQL Editor**
3. Klicke auf **"+ New query"**
4. Kopiere den gesamten Inhalt aus `supabase/migrations/003_storage_setup.sql`
5. Füge ihn ein und klicke auf **"Run"**

#### Option B: Über Supabase CLI

```bash
cd transnext-logistik
supabase db push
```

---

### Schritt 2: Storage Bucket überprüfen

Nach der Migration solltest du den Bucket "belege" sehen:

1. Gehe zu https://supabase.com/dashboard/project/jrghrymgjkpyfnopzxyp/storage/buckets
2. Du solltest jetzt einen Bucket namens **"belege"** sehen
3. Der Bucket ist **privat** (nicht öffentlich zugänglich)

---

### Schritt 3: Code zu GitHub pushen

Der Code wurde bereits aktualisiert und muss nur noch gepusht werden:

```bash
# Wird automatisch von mir gemacht
```

---

### Schritt 4: Netlify Deployment abwarten

Netlify deployt automatisch die neuen Änderungen von GitHub.

- **Deployment-Status**: https://app.netlify.com/sites/transnext/deploys
- **Dauer**: ca. 2-3 Minuten

---

## 🧪 Testen

### Als Fahrer:

1. **Gehe zu**: https://transnext.de/fahrerportal
2. **Login** mit deinen Zugangsdaten
3. **Klicke** auf "Arbeitsnachweis hochladen"
4. **Fülle** das Formular aus
5. **Wähle** eine PDF-Datei aus (max. 10MB)
6. **Speichere** den Nachweis
7. **Gehe** zur "Tourübersicht"
8. **Klicke** auf den "PDF"-Button bei der Tour
9. **Erwartung**: PDF wird im Browser angezeigt + Download-Button

### Als Admin:

1. **Gehe zu**: https://transnext.de/admin
2. **Login** mit Admin-Zugangsdaten
3. **Klicke** auf "Touren"-Tab
4. **Klicke** auf den "PDF"-Button bei einer Tour
5. **Erwartung**: PDF wird angezeigt (wenn Fahrer PDF hochgeladen hat)

---

## 📋 Features

### Für Fahrer:
- ✅ PDF-Upload beim Erstellen von Arbeits-/Auslagennachweisen
- ✅ PDF im Browser anschauen
- ✅ PDF herunterladen
- ✅ Nur eigene Belege sichtbar

### Für Admins:
- ✅ Alle Belege aller Fahrer einsehen
- ✅ PDFs im Browser anschauen
- ✅ PDFs herunterladen
- ✅ Filter & Suche funktionieren

### Sicherheit:
- ✅ Nur PDF-Dateien erlaubt
- ✅ Max. 10MB Dateigröße
- ✅ Private Storage (Row-Level Security)
- ✅ Signierte URLs (1 Stunde Gültigkeit)
- ✅ Fahrer sehen nur eigene Belege

---

## 🐛 Fehlerbehebung

### "Fehler beim Hochladen"
➡️ **Prüfe**: Ist die Datei eine PDF? Ist sie unter 10MB?
➡️ **Lösung**: Nur PDF-Dateien bis 10MB sind erlaubt

### "PDF konnte nicht geladen werden"
➡️ **Prüfe**: Wurde die Migration ausgeführt?
➡️ **Lösung**: Führe Schritt 1 aus (Datenbank-Migration)

### "Bucket 'belege' not found"
➡️ **Prüfe**: Existiert der Storage Bucket?
➡️ **Lösung**: Führe Migration aus oder erstelle Bucket manuell

---

## 📁 Neue Dateien

- `supabase/migrations/003_storage_setup.sql` - DB-Migration
- `src/lib/storage.ts` - File-Upload-Funktionen
- `src/components/pdf-viewer-dialog.tsx` - PDF-Viewer-Komponente
- `PDF_UPLOAD_DEPLOYMENT.md` - Diese Anleitung

---

## 🔗 Wichtige Links

- **Supabase Dashboard**: https://supabase.com/dashboard/project/jrghrymgjkpyfnopzxyp
- **Storage**: https://supabase.com/dashboard/project/jrghrymgjkpyfnopzxyp/storage/buckets
- **SQL Editor**: https://supabase.com/dashboard/project/jrghrymgjkpyfnopzxyp/editor
- **Netlify**: https://app.netlify.com/sites/transnext/deploys

---

## ✅ Checkliste

- [ ] Migration in Supabase ausgeführt
- [ ] Storage Bucket "belege" existiert
- [ ] Code zu GitHub gepusht
- [ ] Netlify Deployment abgeschlossen
- [ ] Als Fahrer getestet (PDF hochladen & ansehen)
- [ ] Als Admin getestet (PDF ansehen)

---

**Bei Problemen**: Melde dich und ich helfe dir! 🚀
