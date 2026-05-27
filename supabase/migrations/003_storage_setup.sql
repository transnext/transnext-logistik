-- =====================================================
-- STORAGE BUCKET FÜR BELEGE (PDFs)
-- =====================================================

-- Erstelle Storage Bucket für Belege
INSERT INTO storage.buckets (id, name, public)
VALUES ('belege', 'belege', false);

-- =====================================================
-- STORAGE POLICIES
-- =====================================================

-- Policy: Fahrer können nur ihre eigenen Belege hochladen
CREATE POLICY "Fahrer können eigene Belege hochladen"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'belege' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Fahrer können nur ihre eigenen Belege ansehen
CREATE POLICY "Fahrer können eigene Belege ansehen"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'belege' AND
  (
    -- Eigene Belege
    (storage.foldername(name))[1] = auth.uid()::text
    OR
    -- Oder Admin
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
);

-- Policy: Admins können alle Belege ansehen
CREATE POLICY "Admins können alle Belege ansehen"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'belege' AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- =====================================================
-- DATENBANK-SCHEMA ERWEITERN
-- =====================================================

-- Füge beleg_url zu arbeitsnachweise hinzu
ALTER TABLE arbeitsnachweise
ADD COLUMN IF NOT EXISTS beleg_url TEXT;

-- Füge beleg_url zu auslagennachweise hinzu
ALTER TABLE auslagennachweise
ADD COLUMN IF NOT EXISTS beleg_url TEXT;

-- Kommentare
COMMENT ON COLUMN arbeitsnachweise.beleg_url IS 'Supabase Storage URL für hochgeladenes Beleg-PDF';
COMMENT ON COLUMN auslagennachweise.beleg_url IS 'Supabase Storage URL für hochgeladenes Beleg-PDF';
