-- ============================================================
-- TransNext - Onlogist Kunde und Kundenpreisliste
-- Stand: 2026-05-12
-- Zweck: Onlogist als Kunde und Kundenpreisliste anlegen
-- ============================================================
--
-- Diese Datei fügt Onlogist hinzu:
--   1. customers-Eintrag für Onlogist
--   2. pricing_tables-Eintrag für Onlogist-Kundenpreisliste
--
-- Werte stammen aus: src/lib/customer-pricing.ts (ONLOGIST_KM_RANGES)
--
-- Wichtig:
--   - ON CONFLICT DO NOTHING verhindert Duplikate
--   - Keine bestehenden Daten werden geändert
--   - waiting_unit_rate = 0 (bei Onlogist keine Wartezeit)
-- ============================================================

BEGIN;

-- ============================================================
-- 1. ONLOGIST ALS KUNDE
-- ============================================================

INSERT INTO public.customers (code, name, type, billing_cycle, requires_invoice_number)
VALUES ('onlogist', 'Onlogist', 'platform', 'weekly', false)
ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- 2. ONLOGIST KUNDENPREISLISTE
-- ============================================================
-- Werte aus src/lib/customer-pricing.ts, ONLOGIST_KM_RANGES:
-- waiting_unit_rate = 0 (bei Onlogist wird KEINE Wartezeit berechnet)
-- valid_from = 2025-12-01 (Beginn der Phase-1-Daten)

INSERT INTO public.pricing_tables (
  name,
  type,
  client,
  customer_id,
  employment_type,
  km_ranges,
  waiting_unit_rate,
  valid_from
)
SELECT
  'Onlogist Kunde',
  'customer',
  'onlogist',
  c.id,
  NULL,  -- Kundenpreisliste hat kein employment_type
  '[
    {"max_km": 10, "amount": 19.57},
    {"max_km": 20, "amount": 23.01},
    {"max_km": 30, "amount": 35.65},
    {"max_km": 50, "amount": 48.67},
    {"max_km": 100, "amount": 62.80},
    {"max_km": 150, "amount": 73.87},
    {"max_km": 200, "amount": 97.20},
    {"max_km": 250, "amount": 106.73},
    {"max_km": 300, "amount": 119.33},
    {"max_km": 350, "amount": 121.20},
    {"max_km": 400, "amount": 143.00},
    {"max_km": 450, "amount": 144.87},
    {"max_km": 500, "amount": 175.87},
    {"max_km": 550, "amount": 177.73},
    {"max_km": 600, "amount": 207.20},
    {"max_km": 650, "amount": 209.07},
    {"max_km": 700, "amount": 221.67},
    {"max_km": 750, "amount": 222.33},
    {"max_km": 800, "amount": 251.47},
    {"max_km": 850, "amount": 251.47},
    {"max_km": 900, "amount": 280.60},
    {"max_km": 950, "amount": 280.60},
    {"max_km": 1000, "amount": 308.20}
  ]'::jsonb,
  0.00,  -- Onlogist: KEINE Wartezeit berechnet
  DATE '2025-12-01'
FROM public.customers c
WHERE c.code = 'onlogist'
  AND NOT EXISTS (
    SELECT 1 FROM public.pricing_tables pt
    WHERE pt.client = 'onlogist'
      AND pt.type = 'customer'
      AND pt.employment_type IS NULL
      AND pt.valid_from = DATE '2025-12-01'
  );

COMMIT;
