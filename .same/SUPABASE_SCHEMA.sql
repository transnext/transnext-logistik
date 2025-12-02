-- ============================================
-- TRANSNEXT PORTAL - DATENBANK-SCHEMA
-- Kopieren Sie diesen KOMPLETTEN Code in den Supabase SQL Editor
-- ============================================

-- 1. PROFILES TABELLE
-- ============================================
CREATE TABLE profiles (
  id UUID REFERENCES auth.users PRIMARY KEY,
  role TEXT NOT NULL CHECK (role IN ('fahrer', 'admin')),
  full_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. FAHRER TABELLE
-- ============================================
CREATE TABLE fahrer (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users UNIQUE NOT NULL,
  vorname TEXT NOT NULL,
  nachname TEXT NOT NULL,
  geburtsdatum DATE NOT NULL,
  adresse TEXT NOT NULL,
  plz TEXT NOT NULL,
  ort TEXT NOT NULL,
  fuehrerschein_nr TEXT NOT NULL,
  fuehrerschein_datum DATE NOT NULL,
  ausstellende_behoerde TEXT NOT NULL,
  fuehrerscheinklassen TEXT[] NOT NULL,
  ausweisnummer TEXT NOT NULL,
  ausweis_ablauf DATE NOT NULL,
  status TEXT DEFAULT 'aktiv' CHECK (status IN ('aktiv', 'inaktiv')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. ARBEITSNACHWEISE TABELLE (Touren)
-- ============================================
CREATE TABLE arbeitsnachweise (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  tour_nr TEXT NOT NULL,
  datum DATE NOT NULL,
  gefahrene_km DECIMAL(10,2) NOT NULL,
  wartezeit TEXT CHECK (wartezeit IN ('30-60', '60-90', '90-120', 'keine')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'billed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. AUSLAGENNACHWEISE TABELLE
-- ============================================
CREATE TABLE auslagennachweise (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  tour_nr TEXT NOT NULL,
  kennzeichen TEXT NOT NULL,
  datum DATE NOT NULL,
  startort TEXT NOT NULL,
  zielort TEXT NOT NULL,
  belegart TEXT NOT NULL CHECK (belegart IN ('tankbeleg', 'waschbeleg', 'bahnticket', 'bc50', 'taxi', 'uber')),
  kosten DECIMAL(10,2) NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'paid')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. INDIZES FÜR PERFORMANCE
-- ============================================
CREATE INDEX idx_fahrer_user_id ON fahrer(user_id);
CREATE INDEX idx_fahrer_status ON fahrer(status);
CREATE INDEX idx_arbeitsnachweise_user ON arbeitsnachweise(user_id);
CREATE INDEX idx_arbeitsnachweise_status ON arbeitsnachweise(status);
CREATE INDEX idx_arbeitsnachweise_datum ON arbeitsnachweise(datum);
CREATE INDEX idx_auslagennachweise_user ON auslagennachweise(user_id);
CREATE INDEX idx_auslagennachweise_status ON auslagennachweise(status);
CREATE INDEX idx_auslagennachweise_datum ON auslagennachweise(datum);

-- 6. ROW LEVEL SECURITY AKTIVIEREN
-- ============================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE fahrer ENABLE ROW LEVEL SECURITY;
ALTER TABLE arbeitsnachweise ENABLE ROW LEVEL SECURITY;
ALTER TABLE auslagennachweise ENABLE ROW LEVEL SECURITY;

-- 7. POLICIES FÜR PROFILES
-- ============================================
CREATE POLICY "Users can read own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admins can read all profiles" ON profiles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can create profiles" ON profiles
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 8. POLICIES FÜR FAHRER
-- ============================================
CREATE POLICY "Fahrer can read own data" ON fahrer
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can read all fahrer" ON fahrer
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can create fahrer" ON fahrer
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can update fahrer" ON fahrer
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 9. POLICIES FÜR ARBEITSNACHWEISE
-- ============================================
CREATE POLICY "Fahrer see own arbeitsnachweise" ON arbeitsnachweise
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins see all arbeitsnachweise" ON arbeitsnachweise
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Fahrer create arbeitsnachweise" ON arbeitsnachweise
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins update arbeitsnachweise" ON arbeitsnachweise
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 10. POLICIES FÜR AUSLAGENNACHWEISE
-- ============================================
CREATE POLICY "Fahrer see own auslagennachweise" ON auslagennachweise
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins see all auslagennachweise" ON auslagennachweise
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Fahrer create auslagennachweise" ON auslagennachweise
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins update auslagennachweise" ON auslagennachweise
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 11. TRIGGER FÜR UPDATED_AT
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_fahrer_updated_at
  BEFORE UPDATE ON fahrer
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_arbeitsnachweise_updated_at
  BEFORE UPDATE ON arbeitsnachweise
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_auslagennachweise_updated_at
  BEFORE UPDATE ON auslagennachweise
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- SCHEMA ERFOLGREICH ERSTELLT!
-- ============================================
-- Nächster Schritt: Admin-Account erstellen
-- Siehe: ADMIN_ACCOUNT.sql
-- ============================================
