-- =====================================================
-- TRANSNEXT LOGISTIK - VOLLSTÄNDIGES TOUREN-SCHEMA
-- =====================================================
-- Führe dieses Script in der Supabase SQL Console aus
-- um das komplette Touren-System zu erstellen.
-- =====================================================

-- =====================================================
-- TEIL 1: ENUM TYPES
-- =====================================================

-- Tour Status
DO $$ BEGIN
  CREATE TYPE tour_status AS ENUM (
    'neu', 'uebernahme_offen', 'abgabe_offen', 'abgeschlossen'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Fahrzeugart
DO $$ BEGIN
  CREATE TYPE fahrzeugart AS ENUM ('pkw', 'e-auto', 'transporter');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Protokoll Phase
DO $$ BEGIN
  CREATE TYPE protocol_phase AS ENUM ('pickup', 'dropoff');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Tank/Ladezustand
DO $$ BEGIN
  CREATE TYPE fuel_level AS ENUM ('quarter', 'half', 'three_quarter', 'full');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Ladekabel-Status
DO $$ BEGIN
  CREATE TYPE cable_status AS ENUM ('present', 'not_present', 'not_applicable');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Felgenart
DO $$ BEGIN
  CREATE TYPE rim_type AS ENUM ('steel', 'aluminum', 'not_applicable');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Übergabe-Typ
DO $$ BEGIN
  CREATE TYPE handover_type AS ENUM ('recipient_present', 'recipient_absent', 'recipient_refused');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Signatur-Rolle
DO $$ BEGIN
  CREATE TYPE signature_role AS ENUM ('driver', 'recipient');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Foto-Kategorie
DO $$ BEGIN
  CREATE TYPE photo_category AS ENUM (
    'tacho', 'accessories', 'engine_bay',
    'bumper_front_left', 'left_side_front', 'wheel_front_left', 'mirror_left',
    'door_front_left', 'door_rear_left', 'interior_rear', 'wheel_rear_left',
    'left_side_rear', 'bumper_rear_left', 'trunk_edge', 'trunk_cover',
    'emergency_kit', 'spare_wheel',
    'bumper_rear_right', 'right_side_rear', 'wheel_rear_right',
    'door_rear_right', 'door_front_right', 'wheel_front_right', 'mirror_right',
    'right_side_front', 'bumper_front_right',
    'damage', 'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Schaden-Art
DO $$ BEGIN
  CREATE TYPE damage_type AS ENUM (
    'scratch', 'dent', 'crack', 'tear', 'stain',
    'missing_part', 'malfunction', 'wear', 'corrosion', 'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Schaden-Bauteil
DO $$ BEGIN
  CREATE TYPE damage_component AS ENUM (
    'front_bumper', 'hood', 'grille', 'windshield',
    'headlight_left', 'headlight_right',
    'front_left_fender', 'front_left_door', 'rear_left_door', 'rear_left_fender',
    'left_mirror', 'front_left_window', 'rear_left_window',
    'front_left_wheel', 'rear_left_wheel', 'front_left_rim', 'rear_left_rim',
    'front_right_fender', 'front_right_door', 'rear_right_door', 'rear_right_fender',
    'right_mirror', 'front_right_window', 'rear_right_window',
    'front_right_wheel', 'rear_right_wheel', 'front_right_rim', 'rear_right_rim',
    'rear_bumper', 'trunk', 'rear_window',
    'taillight_left', 'taillight_right',
    'roof', 'antenna', 'license_plate',
    'dashboard', 'steering_wheel', 'gear_shift', 'center_console',
    'driver_seat', 'passenger_seat', 'rear_seats',
    'door_panel_left', 'door_panel_right', 'headliner',
    'floor_mat', 'carpet', 'trunk_interior',
    'engine', 'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Audit Log Actions
DO $$ BEGIN
  CREATE TYPE audit_action AS ENUM (
    'create', 'update', 'delete', 'status_change', 'protocol_complete', 'pdf_generated'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- =====================================================
-- TEIL 2: TOURS TABELLE
-- =====================================================

CREATE SEQUENCE IF NOT EXISTS tour_nummer_seq START WITH 1;

CREATE TABLE IF NOT EXISTS tours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tour_no INTEGER UNIQUE NOT NULL DEFAULT nextval('tour_nummer_seq'),
  vehicle_type fahrzeugart NOT NULL,
  license_plate VARCHAR(20) NOT NULL,
  fin VARCHAR(17) NOT NULL CHECK (fin ~ '^[A-HJ-NPR-Z0-9]{17}$'),
  pickup_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  dropoff_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  pickup_from TIMESTAMPTZ,
  dropoff_until TIMESTAMPTZ,
  distance_km DECIMAL(10,2),
  notes TEXT,
  assigned_driver_id UUID REFERENCES fahrer(id) ON DELETE SET NULL,
  status tour_status NOT NULL DEFAULT 'neu',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_tours_status ON tours(status);
CREATE INDEX IF NOT EXISTS idx_tours_driver_id ON tours(assigned_driver_id);
CREATE INDEX IF NOT EXISTS idx_tours_tour_no ON tours(tour_no);
CREATE INDEX IF NOT EXISTS idx_tours_created_at ON tours(created_at DESC);


-- =====================================================
-- TEIL 3: TOUR_PROTOCOLS TABELLE
-- =====================================================

CREATE TABLE IF NOT EXISTS tour_protocols (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tour_id UUID NOT NULL REFERENCES tours(id) ON DELETE CASCADE,
  phase protocol_phase NOT NULL,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  km INTEGER NOT NULL CHECK (km >= 0),
  fuel_level fuel_level NOT NULL,
  cable_status cable_status DEFAULT 'not_applicable',
  accessories JSONB NOT NULL DEFAULT '{}'::jsonb,
  has_interior_damage BOOLEAN DEFAULT FALSE,
  has_exterior_damage BOOLEAN DEFAULT FALSE,
  handover_type handover_type,
  handover_note TEXT,
  recipient_name VARCHAR(255),
  confirmed BOOLEAN DEFAULT FALSE,
  confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tour_id, phase)
);

CREATE INDEX IF NOT EXISTS idx_tour_protocols_tour_id ON tour_protocols(tour_id);
CREATE INDEX IF NOT EXISTS idx_tour_protocols_phase ON tour_protocols(phase);


-- =====================================================
-- TEIL 4: TOUR_PHOTOS TABELLE
-- =====================================================

CREATE TABLE IF NOT EXISTS tour_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tour_id UUID NOT NULL REFERENCES tours(id) ON DELETE CASCADE,
  phase protocol_phase NOT NULL,
  category photo_category NOT NULL,
  file_url TEXT NOT NULL,
  file_path TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tour_photos_tour_id ON tour_photos(tour_id);
CREATE INDEX IF NOT EXISTS idx_tour_photos_phase ON tour_photos(phase);


-- =====================================================
-- TEIL 5: TOUR_DAMAGES & TOUR_DAMAGE_PHOTOS
-- =====================================================

CREATE TABLE IF NOT EXISTS tour_damages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tour_id UUID NOT NULL REFERENCES tours(id) ON DELETE CASCADE,
  phase protocol_phase NOT NULL,
  is_interior BOOLEAN NOT NULL,
  damage_type damage_type NOT NULL,
  component damage_component NOT NULL,
  description TEXT NOT NULL,
  pre_existing_damage_id UUID REFERENCES tour_damages(id) ON DELETE SET NULL,
  is_pre_existing BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tour_damages_tour_id ON tour_damages(tour_id);

CREATE TABLE IF NOT EXISTS tour_damage_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  damage_id UUID NOT NULL REFERENCES tour_damages(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_path TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tour_damage_photos_damage_id ON tour_damage_photos(damage_id);


-- =====================================================
-- TEIL 6: TOUR_SIGNATURES
-- =====================================================

CREATE TABLE IF NOT EXISTS tour_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tour_id UUID NOT NULL REFERENCES tours(id) ON DELETE CASCADE,
  phase protocol_phase NOT NULL,
  role signature_role NOT NULL,
  name VARCHAR(255),
  file_url TEXT NOT NULL,
  file_path TEXT,
  signed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tour_id, phase, role)
);

CREATE INDEX IF NOT EXISTS idx_tour_signatures_tour_id ON tour_signatures(tour_id);


-- =====================================================
-- TEIL 7: PDF_EXPORTS
-- =====================================================

CREATE TABLE IF NOT EXISTS pdf_exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tour_id UUID NOT NULL REFERENCES tours(id) ON DELETE CASCADE,
  version INTEGER NOT NULL DEFAULT 1,
  file_url TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size_bytes BIGINT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  change_reason TEXT,
  UNIQUE(tour_id, version)
);

CREATE INDEX IF NOT EXISTS idx_pdf_exports_tour_id ON pdf_exports(tour_id);


-- =====================================================
-- TEIL 8: AUDIT_LOG
-- =====================================================

CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  action audit_action NOT NULL,
  before_json JSONB,
  after_json JSONB,
  changed_fields TEXT[],
  actor_id UUID REFERENCES auth.users(id),
  actor_role VARCHAR(50),
  context JSONB DEFAULT '{}'::jsonb,
  ip_address INET,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON audit_log(entity, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_actor_id ON audit_log(actor_id);


-- =====================================================
-- TEIL 9: TRIGGER FUNCTIONS
-- =====================================================

CREATE OR REPLACE FUNCTION update_tours_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tours_updated_at ON tours;
CREATE TRIGGER tours_updated_at
  BEFORE UPDATE ON tours
  FOR EACH ROW EXECUTE FUNCTION update_tours_updated_at();

DROP TRIGGER IF EXISTS tour_protocols_updated_at ON tour_protocols;
CREATE TRIGGER tour_protocols_updated_at
  BEFORE UPDATE ON tour_protocols
  FOR EACH ROW EXECUTE FUNCTION update_tours_updated_at();

DROP TRIGGER IF EXISTS tour_damages_updated_at ON tour_damages;
CREATE TRIGGER tour_damages_updated_at
  BEFORE UPDATE ON tour_damages
  FOR EACH ROW EXECUTE FUNCTION update_tours_updated_at();


-- =====================================================
-- TEIL 10: HELPER FUNCTIONS
-- =====================================================

CREATE OR REPLACE FUNCTION is_admin_or_disponent()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'disponent')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_current_fahrer_id()
RETURNS UUID AS $$
BEGIN
  RETURN (SELECT id FROM fahrer WHERE user_id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_assigned_driver(p_tour_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM tours
    WHERE id = p_tour_id
    AND assigned_driver_id = get_current_fahrer_id()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION can_driver_modify_tour(p_tour_id UUID, p_phase protocol_phase)
RETURNS BOOLEAN AS $$
DECLARE
  v_status tour_status;
BEGIN
  SELECT status INTO v_status FROM tours WHERE id = p_tour_id;
  IF p_phase = 'pickup' AND v_status = 'uebernahme_offen' THEN RETURN TRUE; END IF;
  IF p_phase = 'dropoff' AND v_status = 'abgabe_offen' THEN RETURN TRUE; END IF;
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_tour_complete(p_tour_id UUID)
RETURNS JSONB AS $$
BEGIN
  RETURN jsonb_build_object(
    'tour', (SELECT to_jsonb(t.*) FROM tours t WHERE t.id = p_tour_id),
    'protocols', (SELECT COALESCE(jsonb_agg(to_jsonb(p.*)), '[]'::jsonb) FROM tour_protocols p WHERE p.tour_id = p_tour_id),
    'photos', (SELECT COALESCE(jsonb_agg(to_jsonb(ph.*)), '[]'::jsonb) FROM tour_photos ph WHERE ph.tour_id = p_tour_id),
    'damages', (SELECT COALESCE(jsonb_agg(to_jsonb(d.*)), '[]'::jsonb) FROM tour_damages d WHERE d.tour_id = p_tour_id),
    'signatures', (SELECT COALESCE(jsonb_agg(to_jsonb(s.*)), '[]'::jsonb) FROM tour_signatures s WHERE s.tour_id = p_tour_id),
    'pdf_exports', (SELECT COALESCE(jsonb_agg(to_jsonb(pdf.*) ORDER BY pdf.version DESC), '[]'::jsonb) FROM pdf_exports pdf WHERE pdf.tour_id = p_tour_id)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_next_pdf_version(p_tour_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN COALESCE((SELECT MAX(version) + 1 FROM pdf_exports WHERE tour_id = p_tour_id), 1);
END;
$$ LANGUAGE plpgsql;


-- =====================================================
-- TEIL 11: RLS POLICIES
-- =====================================================

ALTER TABLE tours ENABLE ROW LEVEL SECURITY;
ALTER TABLE tour_protocols ENABLE ROW LEVEL SECURITY;
ALTER TABLE tour_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE tour_damages ENABLE ROW LEVEL SECURITY;
ALTER TABLE tour_damage_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE tour_signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE pdf_exports ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- TOURS
DROP POLICY IF EXISTS "admin_tours_all" ON tours;
CREATE POLICY "admin_tours_all" ON tours FOR ALL USING (is_admin_or_disponent());

DROP POLICY IF EXISTS "fahrer_tours_select" ON tours;
CREATE POLICY "fahrer_tours_select" ON tours FOR SELECT USING (assigned_driver_id = get_current_fahrer_id() OR is_admin_or_disponent());

-- PROTOCOLS
DROP POLICY IF EXISTS "admin_protocols_all" ON tour_protocols;
CREATE POLICY "admin_protocols_all" ON tour_protocols FOR ALL USING (is_admin_or_disponent());

DROP POLICY IF EXISTS "fahrer_protocols_select" ON tour_protocols;
CREATE POLICY "fahrer_protocols_select" ON tour_protocols FOR SELECT USING (is_assigned_driver(tour_id) OR is_admin_or_disponent());

DROP POLICY IF EXISTS "fahrer_protocols_insert" ON tour_protocols;
CREATE POLICY "fahrer_protocols_insert" ON tour_protocols FOR INSERT WITH CHECK (is_assigned_driver(tour_id) AND can_driver_modify_tour(tour_id, phase));

DROP POLICY IF EXISTS "fahrer_protocols_update" ON tour_protocols;
CREATE POLICY "fahrer_protocols_update" ON tour_protocols FOR UPDATE USING (is_assigned_driver(tour_id) AND can_driver_modify_tour(tour_id, phase));

-- PHOTOS
DROP POLICY IF EXISTS "admin_photos_all" ON tour_photos;
CREATE POLICY "admin_photos_all" ON tour_photos FOR ALL USING (is_admin_or_disponent());

DROP POLICY IF EXISTS "fahrer_photos_select" ON tour_photos;
CREATE POLICY "fahrer_photos_select" ON tour_photos FOR SELECT USING (is_assigned_driver(tour_id) OR is_admin_or_disponent());

DROP POLICY IF EXISTS "fahrer_photos_insert" ON tour_photos;
CREATE POLICY "fahrer_photos_insert" ON tour_photos FOR INSERT WITH CHECK (is_assigned_driver(tour_id) AND can_driver_modify_tour(tour_id, phase));

-- DAMAGES
DROP POLICY IF EXISTS "admin_damages_all" ON tour_damages;
CREATE POLICY "admin_damages_all" ON tour_damages FOR ALL USING (is_admin_or_disponent());

DROP POLICY IF EXISTS "fahrer_damages_select" ON tour_damages;
CREATE POLICY "fahrer_damages_select" ON tour_damages FOR SELECT USING (is_assigned_driver(tour_id) OR is_admin_or_disponent());

DROP POLICY IF EXISTS "fahrer_damages_insert" ON tour_damages;
CREATE POLICY "fahrer_damages_insert" ON tour_damages FOR INSERT WITH CHECK (is_assigned_driver(tour_id) AND can_driver_modify_tour(tour_id, phase));

-- DAMAGE PHOTOS
DROP POLICY IF EXISTS "admin_damage_photos_all" ON tour_damage_photos;
CREATE POLICY "admin_damage_photos_all" ON tour_damage_photos FOR ALL USING (is_admin_or_disponent());

DROP POLICY IF EXISTS "fahrer_damage_photos_select" ON tour_damage_photos;
CREATE POLICY "fahrer_damage_photos_select" ON tour_damage_photos FOR SELECT USING (
  EXISTS (SELECT 1 FROM tour_damages d WHERE d.id = damage_id AND is_assigned_driver(d.tour_id)) OR is_admin_or_disponent()
);

-- SIGNATURES
DROP POLICY IF EXISTS "admin_signatures_all" ON tour_signatures;
CREATE POLICY "admin_signatures_all" ON tour_signatures FOR ALL USING (is_admin_or_disponent());

DROP POLICY IF EXISTS "fahrer_signatures_select" ON tour_signatures;
CREATE POLICY "fahrer_signatures_select" ON tour_signatures FOR SELECT USING (is_assigned_driver(tour_id) OR is_admin_or_disponent());

DROP POLICY IF EXISTS "fahrer_signatures_insert" ON tour_signatures;
CREATE POLICY "fahrer_signatures_insert" ON tour_signatures FOR INSERT WITH CHECK (is_assigned_driver(tour_id) AND can_driver_modify_tour(tour_id, phase));

-- PDF EXPORTS
DROP POLICY IF EXISTS "admin_pdf_exports_all" ON pdf_exports;
CREATE POLICY "admin_pdf_exports_all" ON pdf_exports FOR ALL USING (is_admin_or_disponent());

DROP POLICY IF EXISTS "fahrer_pdf_exports_select" ON pdf_exports;
CREATE POLICY "fahrer_pdf_exports_select" ON pdf_exports FOR SELECT USING (is_assigned_driver(tour_id) OR is_admin_or_disponent());

-- AUDIT LOG
DROP POLICY IF EXISTS "admin_audit_log_select" ON audit_log;
CREATE POLICY "admin_audit_log_select" ON audit_log FOR SELECT USING (is_admin_or_disponent());


-- =====================================================
-- TEIL 12: AUDIT TRIGGERS
-- =====================================================

CREATE OR REPLACE FUNCTION create_audit_log(
  p_entity VARCHAR(50),
  p_entity_id UUID,
  p_action audit_action,
  p_before_json JSONB DEFAULT NULL,
  p_after_json JSONB DEFAULT NULL,
  p_changed_fields TEXT[] DEFAULT NULL,
  p_context JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
  v_audit_id UUID;
  v_actor_role VARCHAR(50);
BEGIN
  SELECT role INTO v_actor_role FROM profiles WHERE id = auth.uid();

  INSERT INTO audit_log (entity, entity_id, action, before_json, after_json, changed_fields, actor_id, actor_role, context)
  VALUES (p_entity, p_entity_id, p_action, p_before_json, p_after_json, p_changed_fields, auth.uid(), v_actor_role, p_context)
  RETURNING id INTO v_audit_id;

  RETURN v_audit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION audit_tours_changes()
RETURNS TRIGGER AS $$
DECLARE
  v_action audit_action;
BEGIN
  IF TG_OP = 'INSERT' THEN v_action := 'create';
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status IS DISTINCT FROM NEW.status THEN v_action := 'status_change';
    ELSE v_action := 'update';
    END IF;
  ELSIF TG_OP = 'DELETE' THEN v_action := 'delete';
  END IF;

  IF TG_OP = 'DELETE' THEN
    PERFORM create_audit_log('tours', OLD.id, v_action, to_jsonb(OLD), NULL);
    RETURN OLD;
  ELSE
    PERFORM create_audit_log('tours', NEW.id, v_action, CASE WHEN TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE NULL END, to_jsonb(NEW));
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS audit_tours_trigger ON tours;
CREATE TRIGGER audit_tours_trigger
  AFTER INSERT OR UPDATE OR DELETE ON tours
  FOR EACH ROW EXECUTE FUNCTION audit_tours_changes();


-- =====================================================
-- FERTIG! Schema erfolgreich erstellt.
-- =====================================================
