-- ============================================================
-- Fahrer Archivierung
-- Stand: 2026-05-12
-- Zweck: Felder für Fahrer-Archivierung hinzufügen
-- ============================================================
--
-- Archivieren = dauerhaft ausgeschieden (Kündigung, Ruhestand)
-- Deaktivieren = vorübergehend nicht aktiv (Urlaub, Krankheit)
--
-- Archivierte Fahrer:
--   - Kein Fahrerportal-Zugriff
--   - Nicht in aktiver Verfügbarkeitsplanung
--   - Nicht in Touren-Auswahl
--   - Historische Daten bleiben erhalten
--   - Nur über "Archivierte anzeigen" sichtbar (Admin/GF)
--
-- WICHTIG: Keine bestehenden Daten ändern!
-- ============================================================

BEGIN;

-- Archivierungsfelder zur fahrer-Tabelle hinzufügen
ALTER TABLE public.fahrer
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ DEFAULT NULL;

ALTER TABLE public.fahrer
ADD COLUMN IF NOT EXISTS archived_by UUID REFERENCES auth.users(id) DEFAULT NULL;

ALTER TABLE public.fahrer
ADD COLUMN IF NOT EXISTS archive_reason TEXT DEFAULT NULL;

-- Index für schnelle Filterung aktiver/nicht-archivierter Fahrer
CREATE INDEX IF NOT EXISTS idx_fahrer_archived_at
ON public.fahrer(archived_at)
WHERE archived_at IS NULL;

-- Kommentare
COMMENT ON COLUMN public.fahrer.archived_at IS 'Zeitpunkt der Archivierung, NULL wenn nicht archiviert';
COMMENT ON COLUMN public.fahrer.archived_by IS 'User-ID des Archivierenden (Admin/GF)';
COMMENT ON COLUMN public.fahrer.archive_reason IS 'Optionaler Grund für Archivierung';

COMMIT;
