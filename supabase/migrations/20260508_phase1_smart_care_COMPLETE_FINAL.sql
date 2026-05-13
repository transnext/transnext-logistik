-- ============================================================
-- TransNext Phase 1 - Smart & Care
-- COMPLETE FINAL MIGRATION
-- Stand: 2026-05-08
-- Zweck: Vollständige Schema- und Security-Migration in EINER Datei
-- ============================================================
--
-- Diese Datei ersetzt die bisherigen Phase-1-Dateien vollständig.
-- Sie enthält:
--   1. Schema: Tabellen, Spalten, Constraints, Indizes, Initialdaten
--   2. Migration bestehender Daten
--   3. Trigger für Locking und Feldschutz
--   4. Views für Spaltenschutz
--   5. RLS-Policies
--   6. Grants/RPCs
--
-- Kritische Sicherheitsregeln:
--   - Disponenten erhalten KEINEN direkten SELECT/UPDATE auf Finanz-Basistabellen.
--   - Fahrer erhalten KEINEN direkten SELECT auf Basistabellen mit Finanzspalten.
--   - Spaltenschutz erfolgt über Views/API, nicht über RLS.
--   - RLS schützt Zeilen, nicht Spalten.
--   - pricing_tables nutzt Partial-Unique-Indizes wegen NULL employment_type.
--   - system_settings nutzt UNIQUE(key, valid_from), NICHT UNIQUE(key).
--   - PL/pgSQL nutzt ausschließlich $$ Dollar-Quoting.
-- ============================================================

BEGIN;

-- ============================================================
-- 0. ROLLEN-HILFSFUNKTIONEN
-- ============================================================

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.profiles
  WHERE id = auth.uid()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(public.current_user_role() IN ('admin', 'gf', 'geschaeftsfuehrer'), false);
$$;

CREATE OR REPLACE FUNCTION public.is_disponent()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(public.current_user_role() = 'disponent', false);
$$;

CREATE OR REPLACE FUNCTION public.is_driver()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(public.current_user_role() = 'fahrer', false);
$$;

-- ============================================================
-- 1. NEUE TABELLEN
-- ============================================================

-- ------------------------------------------------------------
-- 1.1 customers
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  type VARCHAR(30) NOT NULL CHECK (type IN ('platform', 'direct_customer')),
  billing_cycle VARCHAR(20) NOT NULL DEFAULT 'weekly' CHECK (billing_cycle IN ('weekly', 'monthly')),
  contact_name VARCHAR(100),
  contact_email VARCHAR(100),
  contact_phone VARCHAR(50),
  requires_invoice_number BOOLEAN DEFAULT false,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customers_code ON public.customers(code);
CREATE INDEX IF NOT EXISTS idx_customers_active ON public.customers(active) WHERE active = true;

INSERT INTO public.customers (code, name, type, billing_cycle, requires_invoice_number)
VALUES ('smart_and_care', 'Smart & Care', 'platform', 'weekly', false)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  billing_cycle = EXCLUDED.billing_cycle,
  requires_invoice_number = EXCLUDED.requires_invoice_number,
  updated_at = NOW();

-- ------------------------------------------------------------
-- 1.2 pricing_tables
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.pricing_tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('customer', 'driver')),
  client VARCHAR(50) NOT NULL,
  customer_id UUID REFERENCES public.customers(id),
  employment_type VARCHAR(20),
  km_ranges JSONB NOT NULL,
  waiting_unit_rate DECIMAL(10,2) NOT NULL,
  valid_from DATE NOT NULL DEFAULT CURRENT_DATE,
  valid_until DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (valid_until IS NULL OR valid_until > valid_from)
);

-- Wichtig wegen NULL employment_type: normale UNIQUE-Constraints reichen nicht aus.
CREATE UNIQUE INDEX IF NOT EXISTS idx_pricing_tables_customer_version_unique
  ON public.pricing_tables(client, type, valid_from)
  WHERE employment_type IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_pricing_tables_driver_version_unique
  ON public.pricing_tables(client, type, employment_type, valid_from)
  WHERE employment_type IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_pricing_tables_customer_active_unique
  ON public.pricing_tables(client, type)
  WHERE employment_type IS NULL AND valid_until IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_pricing_tables_driver_active_unique
  ON public.pricing_tables(client, type, employment_type)
  WHERE employment_type IS NOT NULL AND valid_until IS NULL;

CREATE INDEX IF NOT EXISTS idx_pricing_tables_lookup
  ON public.pricing_tables(client, type, employment_type, valid_from DESC);

CREATE INDEX IF NOT EXISTS idx_pricing_tables_validity
  ON public.pricing_tables(client, type, valid_from DESC, valid_until);

INSERT INTO public.pricing_tables (
  name, type, client, customer_id, km_ranges, waiting_unit_rate, valid_from
)
SELECT
  'Smart & Care Kunde',
  'customer',
  'smart_and_care',
  c.id,
  '[
    {"max_km": 10, "amount": 19},
    {"max_km": 20, "amount": 23},
    {"max_km": 30, "amount": 39},
    {"max_km": 50, "amount": 50},
    {"max_km": 100, "amount": 66},
    {"max_km": 150, "amount": 75},
    {"max_km": 200, "amount": 101},
    {"max_km": 250, "amount": 109},
    {"max_km": 350, "amount": 121},
    {"max_km": 450, "amount": 143},
    {"max_km": 550, "amount": 176},
    {"max_km": 650, "amount": 209},
    {"max_km": 750, "amount": 220},
    {"max_km": 800, "amount": 253},
    {"max_km": 900, "amount": 286},
    {"max_km": 1000, "amount": 319}
  ]'::jsonb,
  12.00,
  DATE '2026-05-01'
FROM public.customers c
WHERE c.code = 'smart_and_care'
  AND NOT EXISTS (
    SELECT 1 FROM public.pricing_tables pt
    WHERE pt.client = 'smart_and_care'
      AND pt.type = 'customer'
      AND pt.employment_type IS NULL
      AND pt.valid_from = DATE '2026-05-01'
  );

INSERT INTO public.pricing_tables (
  name, type, client, customer_id, employment_type, km_ranges, waiting_unit_rate, valid_from
)
SELECT
  'Smart & Care Fahrer Minijob',
  'driver',
  'smart_and_care',
  c.id,
  'minijob',
  '[
    {"max_km": 10, "amount": 10},
    {"max_km": 20, "amount": 12},
    {"max_km": 30, "amount": 20},
    {"max_km": 50, "amount": 28},
    {"max_km": 100, "amount": 36},
    {"max_km": 150, "amount": 42},
    {"max_km": 200, "amount": 56},
    {"max_km": 250, "amount": 61},
    {"max_km": 350, "amount": 68},
    {"max_km": 450, "amount": 81},
    {"max_km": 550, "amount": 100},
    {"max_km": 650, "amount": 118},
    {"max_km": 750, "amount": 125},
    {"max_km": 800, "amount": 144},
    {"max_km": 900, "amount": 163},
    {"max_km": 1000, "amount": 181}
  ]'::jsonb,
  10.00,
  DATE '2026-05-01'
FROM public.customers c
WHERE c.code = 'smart_and_care'
  AND NOT EXISTS (
    SELECT 1 FROM public.pricing_tables pt
    WHERE pt.client = 'smart_and_care'
      AND pt.type = 'driver'
      AND pt.employment_type = 'minijob'
      AND pt.valid_from = DATE '2026-05-01'
  );

-- ------------------------------------------------------------
-- 1.3 weekly_invoices
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.weekly_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client VARCHAR(50) NOT NULL,
  customer_id UUID REFERENCES public.customers(id),
  invoice_type VARCHAR(20) NOT NULL DEFAULT 'tours' CHECK (invoice_type IN ('tours', 'expenses')),
  year INTEGER NOT NULL,
  week_number INTEGER NOT NULL CHECK (week_number BETWEEN 1 AND 53),
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  items_count INTEGER NOT NULL DEFAULT 0,
  items_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  pdf_url TEXT,
  pdf_hash VARCHAR(64),
  pdf_generated_at TIMESTAMPTZ,
  pdf_generated_by UUID REFERENCES auth.users(id),
  included_item_ids BIGINT[] NOT NULL DEFAULT '{}',
  included_items_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  data_snapshot JSONB,
  exported_at TIMESTAMPTZ,
  exported_by UUID REFERENCES auth.users(id),
  locked_at TIMESTAMPTZ,
  locked_by UUID REFERENCES auth.users(id),
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'exported', 'locked', 'archived')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(client, invoice_type, year, week_number),
  CHECK (week_end >= week_start),
  CHECK (pdf_hash IS NULL OR pdf_hash ~ '^[a-fA-F0-9]{64}$')
);

CREATE INDEX IF NOT EXISTS idx_weekly_invoices_client_week
  ON public.weekly_invoices(client, year DESC, week_number DESC);
CREATE INDEX IF NOT EXISTS idx_weekly_invoices_status
  ON public.weekly_invoices(status);
CREATE INDEX IF NOT EXISTS idx_weekly_invoices_locked
  ON public.weekly_invoices(locked_at) WHERE locked_at IS NOT NULL;

-- ------------------------------------------------------------
-- 1.4 monthly_settlements
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.monthly_settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  fahrer_id UUID NOT NULL REFERENCES public.fahrer(id),
  settlement_month VARCHAR(7) NOT NULL CHECK (settlement_month ~ '^\d{4}-\d{2}$'),
  earned_in_month DECIMAL(10,2) NOT NULL,
  carryover_from_previous_month DECIMAL(10,2) DEFAULT 0,
  total_available_for_payment DECIMAL(10,2) NOT NULL,
  minijob_limit DECIMAL(10,2) NOT NULL,
  payable_this_month DECIMAL(10,2) NOT NULL,
  carryover_to_next_month DECIMAL(10,2) NOT NULL,
  paid_amount DECIMAL(10,2),
  paid_at TIMESTAMPTZ,
  paid_by UUID REFERENCES auth.users(id),
  employer_contribution_rate_used DECIMAL(5,2) NOT NULL,
  estimated_employer_costs_total DECIMAL(10,2) NOT NULL,
  payment_status VARCHAR(20) DEFAULT 'draft'
    CHECK (payment_status IN ('draft', 'calculated', 'pending_approval', 'approved', 'paid')),
  locked_at TIMESTAMPTZ,
  locked_by UUID REFERENCES auth.users(id),
  finalized_at TIMESTAMPTZ,
  finalized_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(fahrer_id, settlement_month),
  UNIQUE(user_id, settlement_month)
);

CREATE INDEX IF NOT EXISTS idx_monthly_settlements_user_month
  ON public.monthly_settlements(user_id, settlement_month DESC);
CREATE INDEX IF NOT EXISTS idx_monthly_settlements_fahrer_month
  ON public.monthly_settlements(fahrer_id, settlement_month DESC);
CREATE INDEX IF NOT EXISTS idx_monthly_settlements_status
  ON public.monthly_settlements(payment_status);

-- ------------------------------------------------------------
-- 1.5 driver_salary_corrections
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.driver_salary_corrections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  arbeitsnachweis_id BIGINT NOT NULL REFERENCES public.arbeitsnachweise(id) ON DELETE CASCADE,
  original_amount DECIMAL(10,2) NOT NULL,
  corrected_amount DECIMAL(10,2) NOT NULL,
  correction_reason TEXT NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'applied')),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  rejected_by UUID REFERENCES auth.users(id),
  rejected_at TIMESTAMPTZ,
  rejection_reason TEXT,
  applied_by UUID REFERENCES auth.users(id),
  applied_at TIMESTAMPTZ,
  correction_request_id UUID
);

CREATE INDEX IF NOT EXISTS idx_salary_corrections_arbeitsnachweis
  ON public.driver_salary_corrections(arbeitsnachweis_id);
CREATE INDEX IF NOT EXISTS idx_salary_corrections_status
  ON public.driver_salary_corrections(status) WHERE status IN ('pending', 'approved');
CREATE INDEX IF NOT EXISTS idx_salary_corrections_request
  ON public.driver_salary_corrections(correction_request_id) WHERE correction_request_id IS NOT NULL;

-- ------------------------------------------------------------
-- 1.6 driver_correction_requests
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.driver_correction_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  arbeitsnachweis_id BIGINT NOT NULL REFERENCES public.arbeitsnachweise(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  internal_note TEXT,
  problem_category VARCHAR(50),
  status VARCHAR(30) NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'reviewed', 'approved_for_correction', 'rejected')),
  requested_by UUID NOT NULL REFERENCES auth.users(id),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  review_note TEXT,
  salary_correction_id UUID REFERENCES public.driver_salary_corrections(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_correction_requests_arbeitsnachweis
  ON public.driver_correction_requests(arbeitsnachweis_id);
CREATE INDEX IF NOT EXISTS idx_correction_requests_status
  ON public.driver_correction_requests(status) WHERE status = 'open';
CREATE INDEX IF NOT EXISTS idx_correction_requests_requested_by
  ON public.driver_correction_requests(requested_by);

-- ------------------------------------------------------------
-- 1.7 alerts
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(50) NOT NULL,
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
  entity_type VARCHAR(30) NOT NULL,
  entity_id TEXT,
  message TEXT NOT NULL,
  details JSONB,
  assigned_to UUID REFERENCES auth.users(id),
  status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'acknowledged', 'resolved')),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id),
  resolution_note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alerts_status ON public.alerts(status) WHERE status = 'open';
CREATE INDEX IF NOT EXISTS idx_alerts_entity ON public.alerts(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_alerts_severity ON public.alerts(severity, status);
CREATE INDEX IF NOT EXISTS idx_alerts_assigned ON public.alerts(assigned_to) WHERE assigned_to IS NOT NULL;

-- ------------------------------------------------------------
-- 1.8 system_settings
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(100) NOT NULL,
  value JSONB NOT NULL,
  description TEXT,
  valid_from DATE NOT NULL DEFAULT CURRENT_DATE,
  valid_until DATE,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id),
  UNIQUE(key, valid_from),
  CHECK (valid_until IS NULL OR valid_until > valid_from)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_system_settings_active_unique
  ON public.system_settings(key)
  WHERE valid_until IS NULL;
CREATE INDEX IF NOT EXISTS idx_system_settings_key ON public.system_settings(key);
CREATE INDEX IF NOT EXISTS idx_system_settings_valid ON public.system_settings(key, valid_from DESC);

INSERT INTO public.system_settings (key, value, description, valid_from)
VALUES
  ('minijob_limit', '603'::jsonb, 'Monatliche Minijob-Grenze in Euro', DATE '2026-01-01'),
  ('employer_contribution_rate', '31.17'::jsonb, 'Arbeitgeberabgaben Knappschaft in Prozent', DATE '2026-01-01'),
  ('settlement_day', '6'::jsonb, 'Tag der monatlichen Fahrer-Auszahlung', DATE '2026-01-01'),
  ('availability_deadline_day', '4'::jsonb, 'Wochentag Deadline (4=Donnerstag)', DATE '2026-01-01'),
  ('availability_deadline_hour', '0'::jsonb, 'Uhrzeit Deadline (0=Mitternacht)', DATE '2026-01-01'),
  ('availability_reminder_day', '3'::jsonb, 'Wochentag Erinnerung (3=Mittwoch)', DATE '2026-01-01'),
  ('availability_reminder_hour', '12'::jsonb, 'Uhrzeit Erinnerung (12=Mittag)', DATE '2026-01-01'),
  ('availability_escalation_hour', '8'::jsonb, 'Uhrzeit Eskalation (8=morgens)', DATE '2026-01-01')
ON CONFLICT (key, valid_from) DO UPDATE SET
  value = EXCLUDED.value,
  description = EXCLUDED.description,
  updated_at = NOW();

-- ------------------------------------------------------------
-- 1.9 driver_availability
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.driver_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  fahrer_id UUID NOT NULL REFERENCES public.fahrer(id),
  week_start_date DATE NOT NULL,
  date DATE NOT NULL,
  is_available BOOLEAN NOT NULL DEFAULT false,
  available_from TIME,
  available_until TIME,
  time_restriction_note VARCHAR(200),
  preferred_tour_type VARCHAR(20) CHECK (preferred_tour_type IS NULL OR preferred_tour_type IN ('short', 'long', 'any')),
  note TEXT,
  availability_status VARCHAR(30) DEFAULT 'not_submitted'
    CHECK (availability_status IN ('not_submitted', 'submitted', 'changed_after_deadline', 'confirmed_by_dispo')),
  submitted_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  changed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date),
  CHECK (available_from IS NULL OR available_until IS NULL OR available_until > available_from)
);

CREATE INDEX IF NOT EXISTS idx_driver_availability_week ON public.driver_availability(week_start_date, date);
CREATE INDEX IF NOT EXISTS idx_driver_availability_user ON public.driver_availability(user_id, week_start_date DESC);
CREATE INDEX IF NOT EXISTS idx_driver_availability_fahrer ON public.driver_availability(fahrer_id, week_start_date DESC);
CREATE INDEX IF NOT EXISTS idx_driver_availability_status ON public.driver_availability(availability_status);
CREATE INDEX IF NOT EXISTS idx_driver_availability_not_submitted
  ON public.driver_availability(availability_status)
  WHERE availability_status = 'not_submitted';

-- ============================================================
-- 2. BESTEHENDE TABELLEN ERWEITERN
-- ============================================================

-- ------------------------------------------------------------
-- 2.1 arbeitsnachweise
-- ------------------------------------------------------------

ALTER TABLE public.arbeitsnachweise
  ADD COLUMN IF NOT EXISTS waiting_units INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_return BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES public.customers(id),
  ADD COLUMN IF NOT EXISTS customer_amount DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS driver_amount_original DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS driver_amount_final DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS driver_amount_adjustment_reason TEXT,
  ADD COLUMN IF NOT EXISTS driver_amount_adjusted_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS driver_amount_adjusted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS employer_contribution_rate_used DECIMAL(5,2),
  ADD COLUMN IF NOT EXISTS estimated_employer_costs DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS gross_margin_before_employer_costs DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS gross_margin_after_employer_costs DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS customer_pricing_table_id UUID REFERENCES public.pricing_tables(id),
  ADD COLUMN IF NOT EXISTS driver_pricing_table_id UUID REFERENCES public.pricing_tables(id),
  ADD COLUMN IF NOT EXISTS pricing_calculated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS calculation_snapshot JSONB,
  ADD COLUMN IF NOT EXISTS customer_billing_status VARCHAR(30) DEFAULT 'nicht_abgerechnet',
  ADD COLUMN IF NOT EXISTS driver_settlement_status VARCHAR(30) DEFAULT 'nicht_abgerechnet',
  ADD COLUMN IF NOT EXISTS weekly_invoice_id UUID REFERENCES public.weekly_invoices(id),
  ADD COLUMN IF NOT EXISTS monthly_settlement_id UUID REFERENCES public.monthly_settlements(id),
  ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS locked_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS correction_required BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS correction_reason TEXT,
  ADD COLUMN IF NOT EXISTS correction_status VARCHAR(20),
  ADD COLUMN IF NOT EXISTS correction_resolved_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS correction_resolved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS correction_document_url TEXT;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_arbeitsnachweise_waiting_units') THEN
    ALTER TABLE public.arbeitsnachweise
      ADD CONSTRAINT chk_arbeitsnachweise_waiting_units CHECK (waiting_units BETWEEN 0 AND 3);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_arbeitsnachweise_customer_billing_status') THEN
    ALTER TABLE public.arbeitsnachweise
      ADD CONSTRAINT chk_arbeitsnachweise_customer_billing_status
      CHECK (customer_billing_status IN ('nicht_abgerechnet', 'in_abrechnung', 'abgerechnet', 'gesperrt'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_arbeitsnachweise_driver_settlement_status') THEN
    ALTER TABLE public.arbeitsnachweise
      ADD CONSTRAINT chk_arbeitsnachweise_driver_settlement_status
      CHECK (driver_settlement_status IN ('nicht_abgerechnet', 'in_abrechnung', 'abgerechnet', 'ausgezahlt'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_arbeitsnachweise_correction_status') THEN
    ALTER TABLE public.arbeitsnachweise
      ADD CONSTRAINT chk_arbeitsnachweise_correction_status
      CHECK (correction_status IS NULL OR correction_status IN ('open', 'reviewed', 'resolved', 'rejected'));
  END IF;
END;
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'arbeitsnachweise' AND column_name = 'wartezeit'
  ) THEN
    UPDATE public.arbeitsnachweise
    SET waiting_units = CASE
      WHEN wartezeit = '30-60' THEN 1
      WHEN wartezeit = '60-90' THEN 2
      WHEN wartezeit = '90-120' THEN 3
      ELSE 0
    END
    WHERE waiting_units IS NULL OR waiting_units = 0;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'arbeitsnachweise' AND column_name = 'ist_ruecklaufer'
  ) THEN
    UPDATE public.arbeitsnachweise
    SET is_return = COALESCE(ist_ruecklaufer, false)
    WHERE is_return IS NULL OR is_return = false;
  END IF;
END;
$$;

UPDATE public.arbeitsnachweise aw
SET customer_id = c.id
FROM public.customers c
WHERE c.code = 'smart_and_care'
  AND aw.customer_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_arbeitsnachweise_weekly_invoice ON public.arbeitsnachweise(weekly_invoice_id);
CREATE INDEX IF NOT EXISTS idx_arbeitsnachweise_monthly_settlement ON public.arbeitsnachweise(monthly_settlement_id);
CREATE INDEX IF NOT EXISTS idx_arbeitsnachweise_customer_billing
  ON public.arbeitsnachweise(status, datum)
  WHERE weekly_invoice_id IS NULL AND status = 'approved';
CREATE INDEX IF NOT EXISTS idx_arbeitsnachweise_locked ON public.arbeitsnachweise(locked_at) WHERE locked_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_arbeitsnachweise_correction ON public.arbeitsnachweise(correction_required) WHERE correction_required = true;
CREATE INDEX IF NOT EXISTS idx_arbeitsnachweise_customer ON public.arbeitsnachweise(customer_id);
CREATE INDEX IF NOT EXISTS idx_arbeitsnachweise_billing_status ON public.arbeitsnachweise(customer_billing_status, driver_settlement_status);

-- ------------------------------------------------------------
-- 2.2 auslagennachweise
-- ------------------------------------------------------------

ALTER TABLE public.auslagennachweise
  ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES public.customers(id),
  ADD COLUMN IF NOT EXISTS weekly_invoice_id UUID REFERENCES public.weekly_invoices(id),
  ADD COLUMN IF NOT EXISTS customer_billing_status VARCHAR(30) DEFAULT 'nicht_abgerechnet',
  ADD COLUMN IF NOT EXISTS driver_reimbursement_status VARCHAR(30) DEFAULT 'eingereicht',
  ADD COLUMN IF NOT EXISTS reimbursed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reimbursed_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejected_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS locked_by UUID REFERENCES auth.users(id);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_auslagennachweise_customer_billing_status') THEN
    ALTER TABLE public.auslagennachweise
      ADD CONSTRAINT chk_auslagennachweise_customer_billing_status
      CHECK (customer_billing_status IN ('nicht_abgerechnet', 'in_abrechnung', 'abgerechnet', 'gesperrt'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_auslagennachweise_driver_reimbursement_status') THEN
    ALTER TABLE public.auslagennachweise
      ADD CONSTRAINT chk_auslagennachweise_driver_reimbursement_status
      CHECK (driver_reimbursement_status IN ('eingereicht', 'in_pruefung', 'bestaetigt', 'abgelehnt', 'erstattet'));
  END IF;
END;
$$;

UPDATE public.auslagennachweise an
SET customer_id = c.id
FROM public.customers c
WHERE c.code = 'smart_and_care'
  AND an.customer_id IS NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'auslagennachweise' AND column_name = 'status'
  ) THEN
    UPDATE public.auslagennachweise
    SET driver_reimbursement_status = CASE
      WHEN status = 'pending' THEN 'eingereicht'
      WHEN status = 'approved' THEN 'bestaetigt'
      WHEN status = 'rejected' THEN 'abgelehnt'
      WHEN status = 'paid' THEN 'erstattet'
      ELSE COALESCE(driver_reimbursement_status, 'eingereicht')
    END
    WHERE driver_reimbursement_status IS NULL OR driver_reimbursement_status = 'eingereicht';
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_auslagennachweise_weekly_invoice ON public.auslagennachweise(weekly_invoice_id);
CREATE INDEX IF NOT EXISTS idx_auslagennachweise_reimbursement_status ON public.auslagennachweise(driver_reimbursement_status);
CREATE INDEX IF NOT EXISTS idx_auslagennachweise_billing_status ON public.auslagennachweise(customer_billing_status);
CREATE INDEX IF NOT EXISTS idx_auslagennachweise_customer ON public.auslagennachweise(customer_id);
CREATE INDEX IF NOT EXISTS idx_auslagennachweise_locked ON public.auslagennachweise(locked_at) WHERE locked_at IS NOT NULL;

-- ============================================================
-- 3. TRIGGER: LOCKING UND FINANZ-FELDSCHUTZ
-- ============================================================

CREATE OR REPLACE FUNCTION public.prevent_locked_arbeitsnachweise_update()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.locked_at IS NOT NULL THEN
    IF (
      OLD.gefahrene_km IS DISTINCT FROM NEW.gefahrene_km OR
      OLD.waiting_units IS DISTINCT FROM NEW.waiting_units OR
      OLD.customer_amount IS DISTINCT FROM NEW.customer_amount OR
      OLD.driver_amount_original IS DISTINCT FROM NEW.driver_amount_original OR
      OLD.driver_amount_final IS DISTINCT FROM NEW.driver_amount_final OR
      OLD.customer_billing_status IS DISTINCT FROM NEW.customer_billing_status OR
      OLD.driver_settlement_status IS DISTINCT FROM NEW.driver_settlement_status OR
      OLD.is_return IS DISTINCT FROM NEW.is_return OR
      OLD.weekly_invoice_id IS DISTINCT FROM NEW.weekly_invoice_id OR
      OLD.monthly_settlement_id IS DISTINCT FROM NEW.monthly_settlement_id
    ) THEN
      RAISE EXCEPTION 'Record ist gesperrt. Abrechnungsrelevante Felder können nicht geändert werden. Nutze den Korrekturprozess.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_locked_arbeitsnachweise ON public.arbeitsnachweise;
CREATE TRIGGER trg_prevent_locked_arbeitsnachweise
  BEFORE UPDATE ON public.arbeitsnachweise
  FOR EACH ROW EXECUTE FUNCTION public.prevent_locked_arbeitsnachweise_update();

CREATE OR REPLACE FUNCTION public.prevent_locked_auslagennachweise_update()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.locked_at IS NOT NULL THEN
    IF (
      OLD.kosten IS DISTINCT FROM NEW.kosten OR
      OLD.customer_billing_status IS DISTINCT FROM NEW.customer_billing_status OR
      OLD.driver_reimbursement_status IS DISTINCT FROM NEW.driver_reimbursement_status OR
      OLD.weekly_invoice_id IS DISTINCT FROM NEW.weekly_invoice_id
    ) THEN
      RAISE EXCEPTION 'Record ist gesperrt. Abrechnungsrelevante Felder können nicht geändert werden.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_locked_auslagennachweise ON public.auslagennachweise;
CREATE TRIGGER trg_prevent_locked_auslagennachweise
  BEFORE UPDATE ON public.auslagennachweise
  FOR EACH ROW EXECUTE FUNCTION public.prevent_locked_auslagennachweise_update();

CREATE OR REPLACE FUNCTION public.prevent_non_admin_arbeitsnachweise_financial_write()
RETURNS TRIGGER AS $$
BEGIN
  IF public.is_admin() THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.customer_amount := NULL;
    NEW.driver_amount_original := NULL;
    NEW.driver_amount_final := NULL;
    NEW.driver_amount_adjustment_reason := NULL;
    NEW.driver_amount_adjusted_by := NULL;
    NEW.driver_amount_adjusted_at := NULL;
    NEW.employer_contribution_rate_used := NULL;
    NEW.estimated_employer_costs := NULL;
    NEW.gross_margin_before_employer_costs := NULL;
    NEW.gross_margin_after_employer_costs := NULL;
    NEW.customer_pricing_table_id := NULL;
    NEW.driver_pricing_table_id := NULL;
    NEW.pricing_calculated_at := NULL;
    NEW.calculation_snapshot := NULL;
    NEW.customer_billing_status := 'nicht_abgerechnet';
    NEW.driver_settlement_status := 'nicht_abgerechnet';
    NEW.weekly_invoice_id := NULL;
    NEW.monthly_settlement_id := NULL;
    NEW.locked_at := NULL;
    NEW.locked_by := NULL;
    RETURN NEW;
  END IF;

  IF (
    OLD.customer_amount IS DISTINCT FROM NEW.customer_amount OR
    OLD.driver_amount_original IS DISTINCT FROM NEW.driver_amount_original OR
    OLD.driver_amount_final IS DISTINCT FROM NEW.driver_amount_final OR
    OLD.driver_amount_adjustment_reason IS DISTINCT FROM NEW.driver_amount_adjustment_reason OR
    OLD.driver_amount_adjusted_by IS DISTINCT FROM NEW.driver_amount_adjusted_by OR
    OLD.driver_amount_adjusted_at IS DISTINCT FROM NEW.driver_amount_adjusted_at OR
    OLD.employer_contribution_rate_used IS DISTINCT FROM NEW.employer_contribution_rate_used OR
    OLD.estimated_employer_costs IS DISTINCT FROM NEW.estimated_employer_costs OR
    OLD.gross_margin_before_employer_costs IS DISTINCT FROM NEW.gross_margin_before_employer_costs OR
    OLD.gross_margin_after_employer_costs IS DISTINCT FROM NEW.gross_margin_after_employer_costs OR
    OLD.customer_pricing_table_id IS DISTINCT FROM NEW.customer_pricing_table_id OR
    OLD.driver_pricing_table_id IS DISTINCT FROM NEW.driver_pricing_table_id OR
    OLD.pricing_calculated_at IS DISTINCT FROM NEW.pricing_calculated_at OR
    OLD.calculation_snapshot IS DISTINCT FROM NEW.calculation_snapshot OR
    OLD.customer_billing_status IS DISTINCT FROM NEW.customer_billing_status OR
    OLD.driver_settlement_status IS DISTINCT FROM NEW.driver_settlement_status OR
    OLD.weekly_invoice_id IS DISTINCT FROM NEW.weekly_invoice_id OR
    OLD.monthly_settlement_id IS DISTINCT FROM NEW.monthly_settlement_id OR
    OLD.locked_at IS DISTINCT FROM NEW.locked_at OR
    OLD.locked_by IS DISTINCT FROM NEW.locked_by
  ) THEN
    RAISE EXCEPTION 'Keine Berechtigung zum Ändern von Finanz- oder Abrechnungsfeldern.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_non_admin_arbeitsnachweise_financial_write ON public.arbeitsnachweise;
CREATE TRIGGER trg_prevent_non_admin_arbeitsnachweise_financial_write
  BEFORE INSERT OR UPDATE ON public.arbeitsnachweise
  FOR EACH ROW EXECUTE FUNCTION public.prevent_non_admin_arbeitsnachweise_financial_write();

CREATE OR REPLACE FUNCTION public.prevent_non_admin_auslagennachweise_billing_write()
RETURNS TRIGGER AS $$
BEGIN
  IF public.is_admin() THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.customer_billing_status := 'nicht_abgerechnet';
    NEW.driver_reimbursement_status := 'eingereicht';
    NEW.weekly_invoice_id := NULL;
    NEW.locked_at := NULL;
    NEW.locked_by := NULL;
    NEW.reimbursed_at := NULL;
    NEW.reimbursed_by := NULL;
    NEW.approved_by := NULL;
    NEW.approved_at := NULL;
    NEW.rejected_by := NULL;
    NEW.rejected_at := NULL;
    RETURN NEW;
  END IF;

  IF (
    OLD.customer_billing_status IS DISTINCT FROM NEW.customer_billing_status OR
    OLD.weekly_invoice_id IS DISTINCT FROM NEW.weekly_invoice_id OR
    OLD.locked_at IS DISTINCT FROM NEW.locked_at OR
    OLD.locked_by IS DISTINCT FROM NEW.locked_by OR
    OLD.reimbursed_at IS DISTINCT FROM NEW.reimbursed_at OR
    OLD.reimbursed_by IS DISTINCT FROM NEW.reimbursed_by
  ) THEN
    RAISE EXCEPTION 'Keine Berechtigung zum Ändern von Abrechnungs- oder Erstattungsfeldern.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_non_admin_auslagennachweise_billing_write ON public.auslagennachweise;
CREATE TRIGGER trg_prevent_non_admin_auslagennachweise_billing_write
  BEFORE INSERT OR UPDATE ON public.auslagennachweise
  FOR EACH ROW EXECUTE FUNCTION public.prevent_non_admin_auslagennachweise_billing_write();

CREATE OR REPLACE FUNCTION public.prevent_dispo_availability_field_update()
RETURNS TRIGGER AS $$
BEGIN
  IF public.is_disponent() THEN
    IF (
      OLD.is_available IS DISTINCT FROM NEW.is_available OR
      OLD.available_from IS DISTINCT FROM NEW.available_from OR
      OLD.available_until IS DISTINCT FROM NEW.available_until OR
      OLD.preferred_tour_type IS DISTINCT FROM NEW.preferred_tour_type OR
      OLD.time_restriction_note IS DISTINCT FROM NEW.time_restriction_note
    ) THEN
      RAISE EXCEPTION 'Disponent darf Verfügbarkeitszeiten nicht direkt ändern.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_dispo_availability_update ON public.driver_availability;
CREATE TRIGGER trg_prevent_dispo_availability_update
  BEFORE UPDATE ON public.driver_availability
  FOR EACH ROW EXECUTE FUNCTION public.prevent_dispo_availability_field_update();

-- ============================================================
-- 4. VIEWS: SPALTENSCHUTZ FÜR FAHRER UND DISPOSITION
-- ============================================================

CREATE OR REPLACE VIEW public.arbeitsnachweise_fahrer AS
SELECT
  id,
  user_id,
  tour_nr,
  datum,
  gefahrene_km,
  waiting_units,
  is_return,
  status,
  beleg_url,
  created_at,
  updated_at
FROM public.arbeitsnachweise
WHERE user_id = auth.uid() AND public.is_driver();

COMMENT ON VIEW public.arbeitsnachweise_fahrer IS
'Fahrer-View ohne Kundenbetrag, Fahrerlohn, Marge, Arbeitgeberkosten, Pricing- und Abrechnungsfelder.';

CREATE OR REPLACE VIEW public.arbeitsnachweise_disponent AS
SELECT
  id,
  user_id,
  tour_nr,
  datum,
  gefahrene_km,
  waiting_units,
  is_return,
  status,
  customer_id,
  beleg_url,
  locked_at,
  correction_required,
  correction_status,
  correction_reason,
  created_at,
  updated_at
FROM public.arbeitsnachweise
WHERE public.is_disponent() OR public.is_admin();

COMMENT ON VIEW public.arbeitsnachweise_disponent IS
'Disponenten-View ohne Finanzfelder. Kein direkter Disponenten-SELECT auf public.arbeitsnachweise.';

CREATE OR REPLACE VIEW public.auslagennachweise_fahrer AS
SELECT
  id,
  user_id,
  tour_nr,
  kennzeichen,
  datum,
  startort,
  zielort,
  belegart,
  kosten,
  beleg_url,
  status,
  driver_reimbursement_status,
  created_at,
  updated_at
FROM public.auslagennachweise
WHERE user_id = auth.uid() AND public.is_driver();

COMMENT ON VIEW public.auslagennachweise_fahrer IS
'Fahrer-View für eigene Auslagen ohne Kundenabrechnungsfelder.';

CREATE OR REPLACE VIEW public.auslagennachweise_disponent AS
SELECT
  id,
  user_id,
  tour_nr,
  kennzeichen,
  datum,
  startort,
  zielort,
  belegart,
  kosten,
  beleg_url,
  status,
  customer_id,
  driver_reimbursement_status,
  locked_at,
  created_at,
  updated_at
FROM public.auslagennachweise
WHERE public.is_disponent() OR public.is_admin();

COMMENT ON VIEW public.auslagennachweise_disponent IS
'Disponenten-View für operative Auslagenprüfung ohne Kundenabrechnungsreferenz weekly_invoice_id.';

CREATE OR REPLACE VIEW public.driver_correction_requests_disponent AS
SELECT
  id,
  arbeitsnachweis_id,
  reason,
  internal_note,
  problem_category,
  status,
  requested_by,
  requested_at,
  reviewed_by,
  reviewed_at,
  review_note,
  created_at
FROM public.driver_correction_requests
WHERE public.is_disponent() OR public.is_admin();

COMMENT ON VIEW public.driver_correction_requests_disponent IS
'Disponenten-View ohne salary_correction_id und ohne Beträge.';

CREATE OR REPLACE VIEW public.customers_disponent AS
SELECT
  id,
  code,
  name,
  type,
  active
FROM public.customers
WHERE public.is_disponent() OR public.is_admin();

COMMENT ON VIEW public.customers_disponent IS
'Disponenten-View für Kundenstammdaten ohne Kontakt- oder Abrechnungseinstellungen.';

CREATE OR REPLACE VIEW public.alerts_disponent AS
SELECT
  id,
  type,
  severity,
  entity_type,
  entity_id,
  message,
  assigned_to,
  status,
  created_at,
  resolved_at,
  resolution_note
FROM public.alerts
WHERE public.is_disponent() OR public.is_admin();

COMMENT ON VIEW public.alerts_disponent IS
'Disponenten-View für Alerts ohne details JSONB, damit keine Finanzdetails leaken.';

-- ============================================================
-- 5. ALTE/FEHLERHAFTE POLICIES ENTFERNEN
-- ============================================================

DROP POLICY IF EXISTS "disponent_arbeitsnachweise_select" ON public.arbeitsnachweise;
DROP POLICY IF EXISTS "disponent_arbeitsnachweise_update" ON public.arbeitsnachweise;
DROP POLICY IF EXISTS "fahrer_arbeitsnachweise_own" ON public.arbeitsnachweise;
DROP POLICY IF EXISTS "fahrer_arbeitsnachweise_select_own" ON public.arbeitsnachweise;
DROP POLICY IF EXISTS "fahrer_arbeitsnachweise_insert_own" ON public.arbeitsnachweise;

DROP POLICY IF EXISTS "disponent_auslagennachweise_select" ON public.auslagennachweise;
DROP POLICY IF EXISTS "disponent_auslagennachweise_update" ON public.auslagennachweise;
DROP POLICY IF EXISTS "fahrer_auslagennachweise_own" ON public.auslagennachweise;
DROP POLICY IF EXISTS "fahrer_auslagennachweise_select_own" ON public.auslagennachweise;
DROP POLICY IF EXISTS "fahrer_auslagennachweise_insert_own" ON public.auslagennachweise;

DROP POLICY IF EXISTS "disponent_correction_requests_select" ON public.driver_correction_requests;
DROP POLICY IF EXISTS "disponent_customers_select" ON public.customers;
DROP POLICY IF EXISTS "disponent_alerts_select" ON public.alerts;
DROP POLICY IF EXISTS "disponent_alerts_update" ON public.alerts;
DROP POLICY IF EXISTS "disponent_availability_update" ON public.driver_availability;
DROP POLICY IF EXISTS "driver_availability_own" ON public.driver_availability;

-- ============================================================
-- 6. RLS-POLICIES
-- ============================================================

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pricing_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_salary_corrections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_correction_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.arbeitsnachweise ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auslagennachweise ENABLE ROW LEVEL SECURITY;

-- customers
DROP POLICY IF EXISTS "admin_customers_all" ON public.customers;
CREATE POLICY "admin_customers_all" ON public.customers
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- pricing_tables
DROP POLICY IF EXISTS "admin_pricing_all" ON public.pricing_tables;
CREATE POLICY "admin_pricing_all" ON public.pricing_tables
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- weekly_invoices
DROP POLICY IF EXISTS "admin_invoices_all" ON public.weekly_invoices;
CREATE POLICY "admin_invoices_all" ON public.weekly_invoices
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- monthly_settlements
DROP POLICY IF EXISTS "admin_settlements_all" ON public.monthly_settlements;
CREATE POLICY "admin_settlements_all" ON public.monthly_settlements
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- driver_salary_corrections
DROP POLICY IF EXISTS "admin_corrections_all" ON public.driver_salary_corrections;
CREATE POLICY "admin_corrections_all" ON public.driver_salary_corrections
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- driver_correction_requests
DROP POLICY IF EXISTS "admin_correction_requests_all" ON public.driver_correction_requests;
DROP POLICY IF EXISTS "disponent_correction_requests_insert" ON public.driver_correction_requests;
CREATE POLICY "admin_correction_requests_all" ON public.driver_correction_requests
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "disponent_correction_requests_insert" ON public.driver_correction_requests
  FOR INSERT
  WITH CHECK (
    public.is_disponent()
    AND requested_by = auth.uid()
    AND status = 'open'
    AND salary_correction_id IS NULL
    AND reviewed_by IS NULL
    AND reviewed_at IS NULL
  );

-- alerts
DROP POLICY IF EXISTS "admin_alerts_all" ON public.alerts;
CREATE POLICY "admin_alerts_all" ON public.alerts
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- system_settings
DROP POLICY IF EXISTS "admin_settings_all" ON public.system_settings;
CREATE POLICY "admin_settings_all" ON public.system_settings
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- arbeitsnachweise
DROP POLICY IF EXISTS "admin_arbeitsnachweise_all" ON public.arbeitsnachweise;
DROP POLICY IF EXISTS "fahrer_arbeitsnachweise_insert_own" ON public.arbeitsnachweise;
CREATE POLICY "admin_arbeitsnachweise_all" ON public.arbeitsnachweise
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "fahrer_arbeitsnachweise_insert_own" ON public.arbeitsnachweise
  FOR INSERT
  WITH CHECK (public.is_driver() AND user_id = auth.uid());
-- Kein Fahrer-SELECT auf Basistabelle. Fahrer nutzt arbeitsnachweise_fahrer.
-- Kein Disponent-SELECT/UPDATE auf Basistabelle. Dispo nutzt View/RPC.

-- auslagennachweise
DROP POLICY IF EXISTS "admin_auslagennachweise_all" ON public.auslagennachweise;
DROP POLICY IF EXISTS "fahrer_auslagennachweise_insert_own" ON public.auslagennachweise;
CREATE POLICY "admin_auslagennachweise_all" ON public.auslagennachweise
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "fahrer_auslagennachweise_insert_own" ON public.auslagennachweise
  FOR INSERT
  WITH CHECK (public.is_driver() AND user_id = auth.uid());
-- Kein Fahrer-SELECT auf Basistabelle. Fahrer nutzt auslagennachweise_fahrer.
-- Kein Disponent-SELECT/UPDATE auf Basistabelle. Dispo nutzt View/RPC.

-- driver_availability
DROP POLICY IF EXISTS "driver_availability_own_select" ON public.driver_availability;
DROP POLICY IF EXISTS "driver_availability_own_insert" ON public.driver_availability;
DROP POLICY IF EXISTS "driver_availability_own_update" ON public.driver_availability;
DROP POLICY IF EXISTS "admin_availability_all" ON public.driver_availability;
DROP POLICY IF EXISTS "disponent_availability_select" ON public.driver_availability;

CREATE POLICY "driver_availability_own_select" ON public.driver_availability
  FOR SELECT USING (public.is_driver() AND user_id = auth.uid());
CREATE POLICY "driver_availability_own_insert" ON public.driver_availability
  FOR INSERT WITH CHECK (public.is_driver() AND user_id = auth.uid());
CREATE POLICY "driver_availability_own_update" ON public.driver_availability
  FOR UPDATE USING (public.is_driver() AND user_id = auth.uid())
  WITH CHECK (public.is_driver() AND user_id = auth.uid());
CREATE POLICY "admin_availability_all" ON public.driver_availability
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "disponent_availability_select" ON public.driver_availability
  FOR SELECT USING (public.is_disponent());
-- Kein direkter Disponenten-UPDATE auf driver_availability.

-- ============================================================
-- 7. SICHERE RPC-FUNKTIONEN
-- ============================================================

CREATE OR REPLACE FUNCTION public.confirm_driver_availability(
  p_availability_id UUID,
  p_note TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_disponent() AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Keine Berechtigung';
  END IF;

  UPDATE public.driver_availability
  SET
    availability_status = 'confirmed_by_dispo',
    note = COALESCE(p_note, note),
    changed_by = auth.uid(),
    updated_at = NOW()
  WHERE id = p_availability_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Verfügbarkeit nicht gefunden';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.acknowledge_alert(
  p_alert_id UUID,
  p_resolution_note TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_disponent() AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Keine Berechtigung';
  END IF;

  UPDATE public.alerts
  SET
    status = 'acknowledged',
    resolution_note = COALESCE(p_resolution_note, resolution_note)
  WHERE id = p_alert_id
    AND (
      public.is_admin()
      OR assigned_to = auth.uid()
      OR assigned_to IS NULL
    );

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Alert nicht gefunden oder keine Berechtigung';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_driver_correction_request(
  p_arbeitsnachweis_id BIGINT,
  p_reason TEXT,
  p_problem_category VARCHAR DEFAULT NULL,
  p_internal_note TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  IF NOT public.is_disponent() AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Keine Berechtigung';
  END IF;

  IF p_reason IS NULL OR btrim(p_reason) = '' THEN
    RAISE EXCEPTION 'Begründung erforderlich';
  END IF;

  INSERT INTO public.driver_correction_requests (
    arbeitsnachweis_id,
    reason,
    problem_category,
    internal_note,
    status,
    requested_by,
    requested_at
  ) VALUES (
    p_arbeitsnachweis_id,
    p_reason,
    p_problem_category,
    p_internal_note,
    'open',
    auth.uid(),
    NOW()
  )
  RETURNING id INTO v_id;

  UPDATE public.arbeitsnachweise
  SET
    correction_required = true,
    correction_status = 'open',
    correction_reason = p_reason
  WHERE id = p_arbeitsnachweis_id;

  RETURN v_id;
END;
$$;

-- ============================================================
-- 8. REVOKES UND GRANTS FÜR SUPABASE/POSTGREST
-- ============================================================

GRANT USAGE ON SCHEMA public TO authenticated;

-- Basistabellen mit Finanz- oder Abrechnungsfeldern nicht direkt lesbar machen.
REVOKE SELECT, UPDATE, DELETE ON TABLE public.arbeitsnachweise FROM authenticated, anon;
REVOKE SELECT, UPDATE, DELETE ON TABLE public.auslagennachweise FROM authenticated, anon;
REVOKE SELECT, UPDATE, DELETE ON TABLE public.driver_correction_requests FROM authenticated, anon;
REVOKE ALL ON TABLE public.driver_salary_corrections FROM authenticated, anon;
REVOKE ALL ON TABLE public.pricing_tables FROM authenticated, anon;
REVOKE ALL ON TABLE public.weekly_invoices FROM authenticated, anon;
REVOKE ALL ON TABLE public.monthly_settlements FROM authenticated, anon;
REVOKE ALL ON TABLE public.system_settings FROM authenticated, anon;
REVOKE SELECT, UPDATE, DELETE ON TABLE public.alerts FROM authenticated, anon;
REVOKE SELECT, UPDATE, DELETE ON TABLE public.customers FROM authenticated, anon;

-- Fahrer-Uploads bleiben über INSERT möglich, RLS begrenzt auf eigene user_id.
GRANT INSERT ON public.arbeitsnachweise TO authenticated;
GRANT INSERT ON public.auslagennachweise TO authenticated;
GRANT INSERT ON public.driver_correction_requests TO authenticated;

-- Verfügbarkeit enthält keine Finanzdaten; Zugriff wird über RLS geregelt.
GRANT SELECT, INSERT, UPDATE ON public.driver_availability TO authenticated;

-- Views als einziger erlaubter Leseweg für Fahrer/Dispo.
GRANT SELECT ON public.arbeitsnachweise_fahrer TO authenticated;
GRANT SELECT ON public.arbeitsnachweise_disponent TO authenticated;
GRANT SELECT ON public.auslagennachweise_fahrer TO authenticated;
GRANT SELECT ON public.auslagennachweise_disponent TO authenticated;
GRANT SELECT ON public.driver_correction_requests_disponent TO authenticated;
GRANT SELECT ON public.customers_disponent TO authenticated;
GRANT SELECT ON public.alerts_disponent TO authenticated;

GRANT EXECUTE ON FUNCTION public.confirm_driver_availability(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.acknowledge_alert(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_driver_correction_request(BIGINT, TEXT, VARCHAR, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_disponent() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_driver() TO authenticated;

-- ============================================================
-- 9. SAFETY COMMENTS
-- ============================================================

COMMENT ON TABLE public.arbeitsnachweise IS
'WICHTIG: Keine direkte Disponenten- oder Fahrer-SELECT-Policy. Fahrer/Dispo nutzen Views oder sichere RPCs. Enthält Finanz- und Abrechnungsfelder.';

COMMENT ON TABLE public.auslagennachweise IS
'WICHTIG: Keine direkte Disponenten- oder Fahrer-SELECT-Policy. Fahrer/Dispo nutzen Views oder sichere RPCs. Enthält Kundenabrechnungsfelder.';

COMMENT ON TABLE public.driver_correction_requests IS
'WICHTIG: Kein direkter Disponenten-SELECT. Disponenten nutzen driver_correction_requests_disponent ohne salary_correction_id.';

COMMENT ON TABLE public.driver_salary_corrections IS
'WICHTIG: Nur Admin/GF. Enthält Beträge. Keine Disponenten- oder Fahrer-Policy.';

COMMENT ON TABLE public.pricing_tables IS
'WICHTIG: Nur Admin/GF. Keine Disponenten- oder Fahrer-Policy. Partial-Unique-Indizes wegen NULL employment_type.';

COMMENT ON TABLE public.system_settings IS
'WICHTIG: Historisiert. key ist NICHT allein UNIQUE; Eindeutigkeit über UNIQUE(key, valid_from) und aktiven Partial-Unique-Index.';

COMMIT;
