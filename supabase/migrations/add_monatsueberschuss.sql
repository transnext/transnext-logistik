-- Tabelle für manuelle Vormonat-Überschüsse
CREATE TABLE IF NOT EXISTS monatsueberschuss (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  monat TEXT NOT NULL, -- Format: "2024-11"
  ueberschuss NUMERIC(10,2) NOT NULL DEFAULT 0,
  notiz TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, monat)
);

-- RLS aktivieren
ALTER TABLE monatsueberschuss ENABLE ROW LEVEL SECURITY;

-- Policy: Fahrer können ihre eigenen Überschüsse sehen
CREATE POLICY "Fahrer können eigene Überschüsse sehen"
  ON monatsueberschuss
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Admins können alle Überschüsse sehen und bearbeiten
CREATE POLICY "Admins können alle Überschüsse sehen"
  ON monatsueberschuss
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins können Überschüsse erstellen"
  ON monatsueberschuss
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins können Überschüsse aktualisieren"
  ON monatsueberschuss
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins können Überschüsse löschen"
  ON monatsueberschuss
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Index für schnellere Abfragen
CREATE INDEX idx_monatsueberschuss_user_monat ON monatsueberschuss(user_id, monat);

-- Trigger für updated_at
CREATE OR REPLACE FUNCTION update_monatsueberschuss_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER monatsueberschuss_updated_at
  BEFORE UPDATE ON monatsueberschuss
  FOR EACH ROW
  EXECUTE FUNCTION update_monatsueberschuss_updated_at();
