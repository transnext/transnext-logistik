-- TransNext Logistik - Komplettes Datenbank-Schema für Supabase
-- Führen Sie dieses SQL-Skript in Supabase SQL Editor aus

-- =====================================================
-- 1. TABELLEN ERSTELLEN
-- =====================================================

-- Fahrer-Tabelle
CREATE TABLE IF NOT EXISTS drivers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL, -- Wird für Authentifizierung verwendet
  created_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);

-- Admin-Tabelle
CREATE TABLE IF NOT EXISTS admins (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Touren-Tabelle (Arbeitsnachweise)
CREATE TABLE IF NOT EXISTS tours (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  tour_number TEXT NOT NULL,
  date DATE NOT NULL,
  kilometers DECIMAL(10,2) NOT NULL,
  waiting_time TEXT NOT NULL, -- z.B. "30-60 Min."
  receipt_url TEXT, -- URL zum hochgeladenen Beleg
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'billed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auslagen-Tabelle
CREATE TABLE IF NOT EXISTS expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  tour_number TEXT NOT NULL,
  license_plate TEXT NOT NULL,
  date DATE NOT NULL,
  start_location TEXT NOT NULL,
  destination TEXT NOT NULL,
  expense_type TEXT NOT NULL, -- "Tankbeleg", "Waschbeleg", etc.
  amount DECIMAL(10,2) NOT NULL,
  receipt_url TEXT, -- URL zum hochgeladenen Beleg
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'paid')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 2. INDIZES FÜR PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_tours_driver_id ON tours(driver_id);
CREATE INDEX IF NOT EXISTS idx_tours_status ON tours(status);
CREATE INDEX IF NOT EXISTS idx_tours_date ON tours(date);
CREATE INDEX IF NOT EXISTS idx_expenses_driver_id ON expenses(driver_id);
CREATE INDEX IF NOT EXISTS idx_expenses_status ON expenses(status);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);

-- =====================================================
-- 3. ROW LEVEL SECURITY (RLS) AKTIVIEREN
-- =====================================================

ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE tours ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 4. RLS POLICIES
-- =====================================================

-- Drivers: Können nur ihre eigenen Daten sehen
CREATE POLICY "Drivers can view their own data" ON drivers
  FOR SELECT USING (auth.uid()::text = id::text);

CREATE POLICY "Drivers can update their own data" ON drivers
  FOR UPDATE USING (auth.uid()::text = id::text);

-- Tours: Fahrer können nur ihre eigenen Touren sehen/erstellen
CREATE POLICY "Drivers can view their own tours" ON tours
  FOR SELECT USING (auth.uid()::text = driver_id::text);

CREATE POLICY "Drivers can create their own tours" ON tours
  FOR INSERT WITH CHECK (auth.uid()::text = driver_id::text);

CREATE POLICY "Drivers can update their pending tours" ON tours
  FOR UPDATE USING (auth.uid()::text = driver_id::text AND status = 'pending');

-- Expenses: Fahrer können nur ihre eigenen Auslagen sehen/erstellen
CREATE POLICY "Drivers can view their own expenses" ON expenses
  FOR SELECT USING (auth.uid()::text = driver_id::text);

CREATE POLICY "Drivers can create their own expenses" ON expenses
  FOR INSERT WITH CHECK (auth.uid()::text = driver_id::text);

CREATE POLICY "Drivers can update their pending expenses" ON expenses
  FOR UPDATE USING (auth.uid()::text = driver_id::text AND status = 'pending');

-- Admins: Können alles sehen und ändern
-- HINWEIS: Für Admins müssen wir eine separate Authentifizierung implementieren
-- oder ein custom claim "role" = "admin" verwenden

-- =====================================================
-- 5. TRIGGER FÜR UPDATED_AT
-- =====================================================

-- Funktion für automatische updated_at Aktualisierung
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger für tours
CREATE TRIGGER update_tours_updated_at
  BEFORE UPDATE ON tours
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger für expenses
CREATE TRIGGER update_expenses_updated_at
  BEFORE UPDATE ON expenses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 6. DEMO-DATEN EINFÜGEN
-- =====================================================

-- Demo-Fahrer (Passwort: "demo123" - sollte später gehasht werden)
INSERT INTO drivers (id, email, name, password_hash) VALUES
  ('11111111-1111-1111-1111-111111111111', 'max.mustermann@example.com', 'Max Mustermann', '$2a$10$demo_hash_replace_with_real'),
  ('22222222-2222-2222-2222-222222222222', 'anna.schmidt@example.com', 'Anna Schmidt', '$2a$10$demo_hash_replace_with_real')
ON CONFLICT (email) DO NOTHING;

-- Demo-Admin
INSERT INTO admins (email, name, password_hash) VALUES
  ('admin@transnext.de', 'TransNext Admin', '$2a$10$demo_hash_replace_with_real')
ON CONFLICT (email) DO NOTHING;

-- Demo-Touren
INSERT INTO tours (driver_id, tour_number, date, kilometers, waiting_time, status) VALUES
  ('11111111-1111-1111-1111-111111111111', 'T-2024-001', '2024-01-15', 450.5, '30-60 Min.', 'approved'),
  ('11111111-1111-1111-1111-111111111111', 'T-2024-002', '2024-01-16', 320.0, '60-90 Min.', 'pending'),
  ('22222222-2222-2222-2222-222222222222', 'T-2024-003', '2024-01-15', 280.0, '30-60 Min.', 'approved')
ON CONFLICT DO NOTHING;

-- Demo-Auslagen
INSERT INTO expenses (driver_id, tour_number, license_plate, date, start_location, destination, expense_type, amount, status) VALUES
  ('11111111-1111-1111-1111-111111111111', 'T-2024-001', 'BO-TN 1234', '2024-01-15', 'Bochum', 'Hamburg', 'Tankbeleg', 85.50, 'approved'),
  ('11111111-1111-1111-1111-111111111111', 'T-2024-002', 'BO-TN 1235', '2024-01-16', 'Bochum', 'Berlin', 'Tankbeleg', 92.00, 'pending'),
  ('22222222-2222-2222-2222-222222222222', 'T-2024-003', 'BO-TN 1236', '2024-01-15', 'Bochum', 'München', 'Waschbeleg', 15.00, 'approved')
ON CONFLICT DO NOTHING;

-- =====================================================
-- FERTIG! 🎉
-- =====================================================
-- Die Datenbank ist nun eingerichtet und bereit für die Nutzung!
-- Nächste Schritte:
-- 1. Supabase Authentication für Fahrer einrichten
-- 2. Admin-Authentifizierung implementieren
-- 3. File-Upload für Belege konfigurieren (Supabase Storage)
