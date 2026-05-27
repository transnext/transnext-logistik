-- =====================================================
-- SYSTEM ANNOUNCEMENTS / HINWEISE
-- Migration: 20260527_system_announcements.sql
--
-- Mitteilungssystem für Admin-Dashboard und Fahrerportal.
-- Admin/GF können Hinweise erstellen und verwalten.
-- =====================================================

-- =====================================================
-- 1. ENUM TYPES
-- =====================================================

-- Zielgruppe für Hinweise
DO $$ BEGIN
  CREATE TYPE announcement_target AS ENUM (
    'admin_gf',
    'disponent',
    'all_admin',
    'fahrer',
    'all'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Priorität
DO $$ BEGIN
  CREATE TYPE announcement_priority AS ENUM (
    'normal',
    'important',
    'critical'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Status
DO $$ BEGIN
  CREATE TYPE announcement_status AS ENUM (
    'active',
    'archived'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- =====================================================
-- 2. TABELLE ERSTELLEN
-- =====================================================

CREATE TABLE IF NOT EXISTS system_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  target announcement_target NOT NULL DEFAULT 'all_admin',
  priority announcement_priority NOT NULL DEFAULT 'normal',
  visible_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  visible_until TIMESTAMPTZ,
  status announcement_status NOT NULL DEFAULT 'active',
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  archived_at TIMESTAMPTZ,
  archived_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

COMMENT ON TABLE system_announcements IS 'Mitteilungen/Hinweise für Admin-Dashboard und Fahrerportal';
COMMENT ON COLUMN system_announcements.target IS 'Zielgruppe: admin_gf, disponent, all_admin, fahrer, all';
COMMENT ON COLUMN system_announcements.priority IS 'Priorität: normal, important, critical';
COMMENT ON COLUMN system_announcements.visible_from IS 'Ab wann sichtbar (Standard: sofort)';
COMMENT ON COLUMN system_announcements.visible_until IS 'Bis wann sichtbar (optional, NULL = unbegrenzt)';
COMMENT ON COLUMN system_announcements.status IS 'Status: active oder archived';

-- =====================================================
-- 3. INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_announcements_active
  ON system_announcements(status, visible_from DESC)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_announcements_target
  ON system_announcements(target);

CREATE INDEX IF NOT EXISTS idx_announcements_priority
  ON system_announcements(priority DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_announcements_expiring
  ON system_announcements(visible_until)
  WHERE visible_until IS NOT NULL AND status = 'active';

-- =====================================================
-- 4. ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE system_announcements ENABLE ROW LEVEL SECURITY;

-- Helper-Funktion: Prüft aktuelle Benutzerrolle
CREATE OR REPLACE FUNCTION get_announcement_user_role()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_role TEXT;
BEGIN
  SELECT role INTO v_role
  FROM profiles
  WHERE id = auth.uid();
  
  RETURN COALESCE(v_role, 'anonymous');
END;
$$;

-- Policy: Admin/GF können alle Hinweise sehen und verwalten
DROP POLICY IF EXISTS "Admin/GF full access to announcements" ON system_announcements;
CREATE POLICY "Admin/GF full access to announcements"
  ON system_announcements
  FOR ALL
  TO authenticated
  USING (
    get_announcement_user_role() IN ('admin', 'gf')
  )
  WITH CHECK (
    get_announcement_user_role() IN ('admin', 'gf')
  );

-- Policy: Disponent kann relevante Hinweise lesen
DROP POLICY IF EXISTS "Disponent read relevant announcements" ON system_announcements;
CREATE POLICY "Disponent read relevant announcements"
  ON system_announcements
  FOR SELECT
  TO authenticated
  USING (
    get_announcement_user_role() = 'disponent'
    AND status = 'active'
    AND visible_from <= NOW()
    AND (visible_until IS NULL OR visible_until > NOW())
    AND target IN ('disponent', 'all_admin', 'all')
  );

-- Policy: Fahrer kann Fahrer-Hinweise lesen
DROP POLICY IF EXISTS "Fahrer read relevant announcements" ON system_announcements;
CREATE POLICY "Fahrer read relevant announcements"
  ON system_announcements
  FOR SELECT
  TO authenticated
  USING (
    get_announcement_user_role() = 'fahrer'
    AND status = 'active'
    AND visible_from <= NOW()
    AND (visible_until IS NULL OR visible_until > NOW())
    AND target IN ('fahrer', 'all')
  );

-- =====================================================
-- 5. TRIGGER FÜR UPDATED_AT
-- =====================================================

CREATE OR REPLACE FUNCTION update_announcement_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_announcement_updated_at ON system_announcements;
CREATE TRIGGER trigger_announcement_updated_at
  BEFORE UPDATE ON system_announcements
  FOR EACH ROW
  EXECUTE FUNCTION update_announcement_updated_at();

-- =====================================================
-- 6. GRANTS
-- =====================================================

GRANT SELECT ON system_announcements TO authenticated;
GRANT INSERT, UPDATE ON system_announcements TO authenticated;
