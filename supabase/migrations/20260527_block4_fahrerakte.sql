-- ============================================================
-- Block 4: Fahrerakte-Erweiterungen
-- Datum: 2026-05-27
--
-- HINWEIS: Diese Migration dokumentiert die Tabellenstruktur.
-- Die Tabellen wurden ursprünglich via Task Agent erstellt.
-- Diese Datei dient zur Dokumentation und kann bei Bedarf
-- erneut ausgeführt werden (CREATE TABLE IF NOT EXISTS).
-- ============================================================

-- ============================================================
-- 1. FAHRER_DOCUMENTS - Upload-Center für Fahrer-Dokumente
-- ============================================================

CREATE TABLE IF NOT EXISTS fahrer_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fahrer_id UUID NOT NULL REFERENCES fahrer(id) ON DELETE CASCADE,
    document_type TEXT NOT NULL CHECK (document_type IN (
        'ausweis', 'fuehrerschein', 'uvv', 'vertrag',
        'abmahnung', 'schulung', 'sonstiges'
    )),
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER,
    mime_type TEXT,
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    uploaded_by UUID REFERENCES auth.users(id),
    status TEXT NOT NULL DEFAULT 'hochgeladen' CHECK (status IN (
        'offen', 'hochgeladen', 'geprueft', 'abgelehnt', 'abgelaufen', 'archiviert'
    )),
    expires_at DATE,
    reviewed_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES auth.users(id),
    comment TEXT,
    archived_at TIMESTAMPTZ,
    archived_by UUID REFERENCES auth.users(id),
    archive_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index für schnelle Abfragen nach Fahrer
CREATE INDEX IF NOT EXISTS idx_fahrer_documents_fahrer_id ON fahrer_documents(fahrer_id);
CREATE INDEX IF NOT EXISTS idx_fahrer_documents_status ON fahrer_documents(status);

-- RLS für fahrer_documents (nur Admin/GF)
ALTER TABLE fahrer_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin/GF können alle Dokumente sehen" ON fahrer_documents;
CREATE POLICY "Admin/GF können alle Dokumente sehen" ON fahrer_documents
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'gf')
        )
    );

DROP POLICY IF EXISTS "Admin/GF können Dokumente erstellen" ON fahrer_documents;
CREATE POLICY "Admin/GF können Dokumente erstellen" ON fahrer_documents
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'gf')
        )
    );

DROP POLICY IF EXISTS "Admin/GF können Dokumente aktualisieren" ON fahrer_documents;
CREATE POLICY "Admin/GF können Dokumente aktualisieren" ON fahrer_documents
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'gf')
        )
    );

-- Kein DELETE-Policy: Dokumente werden archiviert, nicht gelöscht

-- ============================================================
-- 2. FAHRER_FUEL_CARDS - Tankkartenverwaltung
-- ============================================================

CREATE TABLE IF NOT EXISTS fahrer_fuel_cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fahrer_id UUID NOT NULL REFERENCES fahrer(id) ON DELETE CASCADE,
    provider TEXT NOT NULL,
    card_number_last4 TEXT NOT NULL CHECK (LENGTH(card_number_last4) = 4),
    issued_at DATE,
    returned_at DATE,
    status TEXT NOT NULL DEFAULT 'aktiv' CHECK (status IN (
        'aktiv', 'gesperrt', 'zurueckgegeben', 'verloren'
    )),
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

-- Index für schnelle Abfragen nach Fahrer
CREATE INDEX IF NOT EXISTS idx_fahrer_fuel_cards_fahrer_id ON fahrer_fuel_cards(fahrer_id);

-- RLS für fahrer_fuel_cards (nur Admin/GF)
ALTER TABLE fahrer_fuel_cards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin/GF können alle Tankkarten sehen" ON fahrer_fuel_cards;
CREATE POLICY "Admin/GF können alle Tankkarten sehen" ON fahrer_fuel_cards
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'gf')
        )
    );

DROP POLICY IF EXISTS "Admin/GF können Tankkarten erstellen" ON fahrer_fuel_cards;
CREATE POLICY "Admin/GF können Tankkarten erstellen" ON fahrer_fuel_cards
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'gf')
        )
    );

DROP POLICY IF EXISTS "Admin/GF können Tankkarten aktualisieren" ON fahrer_fuel_cards;
CREATE POLICY "Admin/GF können Tankkarten aktualisieren" ON fahrer_fuel_cards
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'gf')
        )
    );

DROP POLICY IF EXISTS "Admin/GF können Tankkarten löschen" ON fahrer_fuel_cards;
CREATE POLICY "Admin/GF können Tankkarten löschen" ON fahrer_fuel_cards
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'gf')
        )
    );

-- ============================================================
-- 3. FAHRER_NOTES - Interne Notizen (HR/Admin)
-- ============================================================

CREATE TABLE IF NOT EXISTS fahrer_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fahrer_id UUID NOT NULL REFERENCES fahrer(id) ON DELETE CASCADE,
    category TEXT NOT NULL CHECK (category IN (
        'allgemein', 'verhalten', 'zuverlaessigkeit', 'kommunikation',
        'schaden', 'abmahnung', 'positiv', 'sonstiges'
    )),
    content TEXT NOT NULL,
    is_important BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES auth.users(id),
    archived_at TIMESTAMPTZ
);

-- Index für schnelle Abfragen nach Fahrer
CREATE INDEX IF NOT EXISTS idx_fahrer_notes_fahrer_id ON fahrer_notes(fahrer_id);
CREATE INDEX IF NOT EXISTS idx_fahrer_notes_archived ON fahrer_notes(archived_at);

-- RLS für fahrer_notes (nur Admin/GF - keine Dispo!)
ALTER TABLE fahrer_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin/GF können alle Notizen sehen" ON fahrer_notes;
CREATE POLICY "Admin/GF können alle Notizen sehen" ON fahrer_notes
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'gf')
            -- WICHTIG: Dispo explizit ausgeschlossen!
        )
    );

DROP POLICY IF EXISTS "Admin/GF können Notizen erstellen" ON fahrer_notes;
CREATE POLICY "Admin/GF können Notizen erstellen" ON fahrer_notes
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'gf')
        )
    );

DROP POLICY IF EXISTS "Admin/GF können Notizen aktualisieren" ON fahrer_notes;
CREATE POLICY "Admin/GF können Notizen aktualisieren" ON fahrer_notes
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'gf')
        )
    );

-- Kein DELETE-Policy: Notizen werden archiviert, nicht gelöscht

-- ============================================================
-- 4. STORAGE BUCKET: fahrer-dokumente
-- ============================================================
--
-- Der Storage Bucket muss manuell in Supabase erstellt werden:
--
-- Bucket-Name: fahrer-dokumente
-- Public: false (private)
-- File size limit: 52428800 (50MB)
-- Allowed MIME types: application/pdf, image/jpeg, image/png, image/heic, image/heif
--
-- Storage Policies:
--
-- SELECT (download): Admin/GF only
-- INSERT (upload): Admin/GF only
-- UPDATE: Admin/GF only
-- DELETE: Admin/GF only (für Archivierung wird Storage nicht gelöscht!)
--
-- Beispiel RLS für Storage (in Supabase Dashboard):
--
-- Policy "Admin/GF können Dokumente hochladen":
--   operation: INSERT
--   check: (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'gf')
--
-- Policy "Admin/GF können Dokumente lesen":
--   operation: SELECT
--   using: (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'gf')
-- ============================================================

-- ============================================================
-- AUDIT-EVENTS für Block 4
-- ============================================================
--
-- Folgende Audit-Events werden automatisch durch die API geloggt:
--
-- fahrer_document_uploaded    - Dokument hochgeladen
-- fahrer_document_archived    - Dokument archiviert (kein hartes Löschen!)
-- fahrer_fuel_card_created    - Tankkarte angelegt
-- fahrer_fuel_card_updated    - Tankkarte aktualisiert
-- fahrer_note_created         - Interne Notiz erstellt
-- fahrer_name_updated         - Fahrername geändert
-- fahrer_zeitmodell_updated   - Zeitmodell geändert
-- fahrer_password_reset_requested - Passwort-Reset angefordert
-- ============================================================
