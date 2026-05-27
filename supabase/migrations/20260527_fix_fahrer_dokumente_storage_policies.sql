-- ============================================================
-- Fix: Storage Policies für fahrer-dokumente Bucket
-- Datum: 2026-05-27
-- Problem: "Failed to fetch" beim Dokumenten-Upload
--
-- Ursache:
-- Die Storage-Policies verwendeten direkte EXISTS-Subqueries
-- statt SECURITY DEFINER Funktionen. Im Storage-RLS-Kontext
-- können solche direkten Subqueries fehlschlagen, weil
-- auth.uid() in verschachtelten Queries nicht korrekt
-- aufgelöst wird.
--
-- Lösung:
-- Verwende is_admin_or_gf() SECURITY DEFINER Funktion
-- wie beim funktionierenden "belege" Bucket.
-- ============================================================

BEGIN;

-- ============================================================
-- 1. is_admin_or_gf() Funktion aktualisieren
-- Füge search_path hinzu für Security Best Practice
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_admin_or_gf()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'gf', 'geschaeftsfuehrer')
  );
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.is_admin_or_gf() TO authenticated;

-- ============================================================
-- 2. Alte Storage Policies löschen
-- ============================================================

DROP POLICY IF EXISTS "Admin/GF can upload fahrer-dokumente" ON storage.objects;
DROP POLICY IF EXISTS "Admin/GF can read fahrer-dokumente" ON storage.objects;
DROP POLICY IF EXISTS "Admin/GF can update fahrer-dokumente" ON storage.objects;
DROP POLICY IF EXISTS "Admin/GF can delete fahrer-dokumente" ON storage.objects;

-- Auch alternative Namenskonventionen löschen
DROP POLICY IF EXISTS "Admin/GF können Dokumente hochladen" ON storage.objects;
DROP POLICY IF EXISTS "Admin/GF können Dokumente lesen" ON storage.objects;
DROP POLICY IF EXISTS "Admin/GF können Dokumente aktualisieren" ON storage.objects;
DROP POLICY IF EXISTS "Admin/GF können Dokumente löschen" ON storage.objects;

-- ============================================================
-- 3. Neue Storage Policies mit SECURITY DEFINER Funktion
-- ============================================================

-- INSERT (Upload) Policy
CREATE POLICY "fahrer_dokumente_insert"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'fahrer-dokumente'
  AND public.is_admin_or_gf()
);

-- SELECT (Download/View) Policy
CREATE POLICY "fahrer_dokumente_select"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'fahrer-dokumente'
  AND public.is_admin_or_gf()
);

-- UPDATE Policy
CREATE POLICY "fahrer_dokumente_update"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'fahrer-dokumente'
  AND public.is_admin_or_gf()
)
WITH CHECK (
  bucket_id = 'fahrer-dokumente'
  AND public.is_admin_or_gf()
);

-- DELETE Policy
CREATE POLICY "fahrer_dokumente_delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'fahrer-dokumente'
  AND public.is_admin_or_gf()
);

COMMIT;

-- ============================================================
-- Hinweise zur manuellen Anwendung:
--
-- Diese Migration muss in Supabase ausgeführt werden.
-- Entweder via:
-- 1. Supabase Dashboard > SQL Editor > Query ausführen
-- 2. Supabase CLI: supabase db push
-- 3. Supabase Dashboard > Database > Migrations
--
-- Nach Anwendung sollte der Dokumenten-Upload funktionieren.
-- ============================================================
