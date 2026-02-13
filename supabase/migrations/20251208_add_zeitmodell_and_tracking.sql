-- Migration: Add zeitmodell to profiles and create zeiterfassung table
-- Erstellt: 2024-12-08

-- 1. Füge zeitmodell Spalte zu profiles Tabelle hinzu
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS zeitmodell TEXT DEFAULT 'minijob' CHECK (zeitmodell IN ('minijob', 'werkstudent', 'teilzeit', 'vollzeit'));

-- 2. Erstelle zeiterfassung Tabelle
CREATE TABLE IF NOT EXISTS zeiterfassung (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  datum DATE NOT NULL,
  start_zeit TIMESTAMP WITH TIME ZONE,
  ende_zeit TIMESTAMP WITH TIME ZONE,
  pause_minuten INTEGER DEFAULT 0,
  status TEXT DEFAULT 'laufend' CHECK (status IN ('laufend', 'pause', 'beendet')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Erstelle Index für schnellere Abfragen
CREATE INDEX IF NOT EXISTS idx_zeiterfassung_user_id ON zeiterfassung(user_id);
CREATE INDEX IF NOT EXISTS idx_zeiterfassung_datum ON zeiterfassung(datum);
CREATE INDEX IF NOT EXISTS idx_zeiterfassung_user_datum ON zeiterfassung(user_id, datum);

-- 4. RLS aktivieren
ALTER TABLE zeiterfassung ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies für zeiterfassung
-- Fahrer können nur ihre eigenen Zeiterfassungen sehen
CREATE POLICY "Fahrer können eigene Zeiterfassungen sehen"
  ON zeiterfassung FOR SELECT
  USING (auth.uid() = user_id);

-- Fahrer können nur ihre eigenen Zeiterfassungen erstellen
CREATE POLICY "Fahrer können eigene Zeiterfassungen erstellen"
  ON zeiterfassung FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Fahrer können nur ihre eigenen Zeiterfassungen updaten
CREATE POLICY "Fahrer können eigene Zeiterfassungen updaten"
  ON zeiterfassung FOR UPDATE
  USING (auth.uid() = user_id);

-- Admins können alle Zeiterfassungen sehen
CREATE POLICY "Admins können alle Zeiterfassungen sehen"
  ON zeiterfassung FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- 6. Setze Karim Zahouani auf Werkstudent
-- Zuerst müssen wir seine Benutzer-ID finden
UPDATE profiles
SET zeitmodell = 'werkstudent'
WHERE LOWER(full_name) LIKE '%karim%zahouani%';

-- 7. Kommentar zur Tabelle
COMMENT ON TABLE zeiterfassung IS 'Zeiterfassung für Werkstudenten und Teilzeitkräfte';
COMMENT ON COLUMN zeiterfassung.status IS 'laufend = Arbeit läuft, pause = In Pause, beendet = Arbeitstag beendet';
