-- =====================================================
-- Migration: Abrechnungsläufe und Nachberechnung
-- Datum: 2026-05-27
--
-- Fügt Nachberechnungslogik zur bestehenden Abrechnungsstruktur hinzu:
-- - Neue Felder für billing_type (regulaer/nachberechnung/korrektur)
-- - Tracking des Ursprungszeitraums für Nachberechnungen
-- - Schutzlogik gegen Doppelabrechnung
-- =====================================================

-- =====================================================
-- 1. Neue Enum für Abrechnungsart
-- =====================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'billing_position_type') THEN
    CREATE TYPE billing_position_type AS ENUM ('regulaer', 'nachberechnung', 'korrektur');
  END IF;
END$$;

-- =====================================================
-- 2. Erweitere arbeitsnachweise um Nachberechnungsfelder
-- =====================================================

-- billing_type: Art der Abrechnung (regulär = normaler Zeitraum, nachberechnung = aus geschlossenem Zeitraum)
ALTER TABLE arbeitsnachweise
  ADD COLUMN IF NOT EXISTS billing_type billing_position_type DEFAULT 'regulaer';

-- original_billing_period: Ursprünglicher KW-Zeitraum bei Nachberechnung (z.B. "2026-KW22")
ALTER TABLE arbeitsnachweise
  ADD COLUMN IF NOT EXISTS original_billing_period TEXT;

-- billed_in_run_id: ID des Abrechnungslaufs in dem die Position abgerechnet wurde (verhindert Doppelabrechnung)
-- (weekly_invoice_id existiert bereits, wird weiterverwendet)

-- =====================================================
-- 3. Erweitere auslagennachweise um Nachberechnungsfelder
-- =====================================================

ALTER TABLE auslagennachweise
  ADD COLUMN IF NOT EXISTS billing_type billing_position_type DEFAULT 'regulaer';

ALTER TABLE auslagennachweise
  ADD COLUMN IF NOT EXISTS original_billing_period TEXT;

-- =====================================================
-- 4. Erweitere weekly_invoices um Abrechnungslauf-Felder
-- =====================================================

-- Abrechnungsnummer (eindeutig, z.B. ABR-2026-KW22-SC)
ALTER TABLE weekly_invoices
  ADD COLUMN IF NOT EXISTS invoice_number TEXT UNIQUE;

-- Nachberechnungs-Summen
ALTER TABLE weekly_invoices
  ADD COLUMN IF NOT EXISTS regular_items_count INTEGER DEFAULT 0;

ALTER TABLE weekly_invoices
  ADD COLUMN IF NOT EXISTS regular_items_amount NUMERIC(10,2) DEFAULT 0;

ALTER TABLE weekly_invoices
  ADD COLUMN IF NOT EXISTS retro_items_count INTEGER DEFAULT 0;

ALTER TABLE weekly_invoices
  ADD COLUMN IF NOT EXISTS retro_items_amount NUMERIC(10,2) DEFAULT 0;

-- Erweitere Status-Enum wenn nötig
-- (status ist bereits: draft, exported, locked, archived)
-- Wir fügen 'closed' als Alias für 'locked' nicht hinzu, da 'locked' bereits diese Funktion hat

-- =====================================================
-- 5. Funktion: Abrechnungsnummer generieren
-- =====================================================

CREATE OR REPLACE FUNCTION generate_invoice_number(
  p_year INTEGER,
  p_week INTEGER,
  p_client TEXT,
  p_type TEXT
) RETURNS TEXT AS $$
DECLARE
  v_client_code TEXT;
  v_type_code TEXT;
BEGIN
  -- Client-Code
  CASE p_client
    WHEN 'smart_and_care' THEN v_client_code := 'SC';
    WHEN 'onlogist' THEN v_client_code := 'OL';
    ELSE v_client_code := 'XX';
  END CASE;

  -- Type-Code
  CASE p_type
    WHEN 'tours' THEN v_type_code := 'T';
    WHEN 'expenses' THEN v_type_code := 'A';
    ELSE v_type_code := 'X';
  END CASE;

  RETURN 'ABR-' || p_year || '-KW' || LPAD(p_week::TEXT, 2, '0') || '-' || v_client_code || '-' || v_type_code;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =====================================================
-- 6. Funktion: Prüfe ob eine KW bereits geschlossen ist
-- =====================================================

CREATE OR REPLACE FUNCTION is_period_closed(
  p_year INTEGER,
  p_week INTEGER,
  p_client TEXT,
  p_type TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  v_closed BOOLEAN;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM weekly_invoices
    WHERE year = p_year
      AND week_number = p_week
      AND client = p_client
      AND invoice_type = p_type
      AND (status = 'locked' OR status = 'exported' OR status = 'archived')
  ) INTO v_closed;

  RETURN v_closed;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- =====================================================
-- 7. Funktion: Ermittle KW aus Datum
-- =====================================================

CREATE OR REPLACE FUNCTION get_iso_week_info(p_date DATE)
RETURNS TABLE(year INTEGER, week INTEGER) AS $$
BEGIN
  RETURN QUERY SELECT
    EXTRACT(ISOYEAR FROM p_date)::INTEGER AS year,
    EXTRACT(WEEK FROM p_date)::INTEGER AS week;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =====================================================
-- 8. Trigger: Setze billing_type automatisch bei Genehmigung
-- =====================================================

CREATE OR REPLACE FUNCTION set_billing_type_on_approval()
RETURNS TRIGGER AS $$
DECLARE
  v_week_info RECORD;
  v_is_closed BOOLEAN;
  v_client TEXT;
BEGIN
  -- Nur bei Status-Änderung zu 'approved'
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    -- Ermittle KW des Leistungsdatums
    SELECT * INTO v_week_info FROM get_iso_week_info(NEW.datum::DATE);

    -- Ermittle Client (für arbeitsnachweise)
    IF TG_TABLE_NAME = 'arbeitsnachweise' THEN
      v_client := COALESCE(
        CASE LOWER(NEW.auftraggeber)
          WHEN 'onlogist' THEN 'onlogist'
          ELSE 'smart_and_care'
        END,
        'smart_and_care'
      );

      -- Prüfe ob die ursprüngliche KW bereits geschlossen ist
      v_is_closed := is_period_closed(v_week_info.year, v_week_info.week, v_client, 'tours');

      IF v_is_closed THEN
        NEW.billing_type := 'nachberechnung';
        NEW.original_billing_period := v_week_info.year || '-KW' || LPAD(v_week_info.week::TEXT, 2, '0');
      ELSE
        NEW.billing_type := 'regulaer';
        NEW.original_billing_period := NULL;
      END IF;
    ELSE
      -- Für auslagennachweise (client ist immer smart_and_care für Auslagen)
      v_is_closed := is_period_closed(v_week_info.year, v_week_info.week, 'smart_and_care', 'expenses');

      IF v_is_closed THEN
        NEW.billing_type := 'nachberechnung';
        NEW.original_billing_period := v_week_info.year || '-KW' || LPAD(v_week_info.week::TEXT, 2, '0');
      ELSE
        NEW.billing_type := 'regulaer';
        NEW.original_billing_period := NULL;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger für arbeitsnachweise
DROP TRIGGER IF EXISTS set_billing_type_arbeitsnachweise ON arbeitsnachweise;
CREATE TRIGGER set_billing_type_arbeitsnachweise
  BEFORE UPDATE ON arbeitsnachweise
  FOR EACH ROW
  EXECUTE FUNCTION set_billing_type_on_approval();

-- Trigger für auslagennachweise
DROP TRIGGER IF EXISTS set_billing_type_auslagennachweise ON auslagennachweise;
CREATE TRIGGER set_billing_type_auslagennachweise
  BEFORE UPDATE ON auslagennachweise
  FOR EACH ROW
  EXECUTE FUNCTION set_billing_type_on_approval();

-- =====================================================
-- 9. RLS Policies für neue Funktionen
-- =====================================================

-- Grants für authenticated users
GRANT EXECUTE ON FUNCTION generate_invoice_number(INTEGER, INTEGER, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION is_period_closed(INTEGER, INTEGER, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_iso_week_info(DATE) TO authenticated;

-- =====================================================
-- 10. Index für bessere Abfrage-Performance
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_arbeitsnachweise_billing_type
  ON arbeitsnachweise(billing_type)
  WHERE billing_type = 'nachberechnung';

CREATE INDEX IF NOT EXISTS idx_auslagennachweise_billing_type
  ON auslagennachweise(billing_type)
  WHERE billing_type = 'nachberechnung';

CREATE INDEX IF NOT EXISTS idx_weekly_invoices_status_period
  ON weekly_invoices(client, invoice_type, year, week_number, status);

-- =====================================================
-- 11. Kommentare zur Dokumentation
-- =====================================================

COMMENT ON COLUMN arbeitsnachweise.billing_type IS 'Art der Abrechnung: regulaer = im normalen Zeitraum, nachberechnung = aus bereits geschlossenem Zeitraum';
COMMENT ON COLUMN arbeitsnachweise.original_billing_period IS 'Ursprünglicher Abrechnungszeitraum bei Nachberechnung, z.B. 2026-KW22';

COMMENT ON COLUMN auslagennachweise.billing_type IS 'Art der Abrechnung: regulaer = im normalen Zeitraum, nachberechnung = aus bereits geschlossenem Zeitraum';
COMMENT ON COLUMN auslagennachweise.original_billing_period IS 'Ursprünglicher Abrechnungszeitraum bei Nachberechnung, z.B. 2026-KW22';

COMMENT ON COLUMN weekly_invoices.invoice_number IS 'Eindeutige Abrechnungsnummer, z.B. ABR-2026-KW22-SC-T';
COMMENT ON COLUMN weekly_invoices.regular_items_count IS 'Anzahl regulärer Positionen (Leistungsdatum im Abrechnungszeitraum)';
COMMENT ON COLUMN weekly_invoices.regular_items_amount IS 'Summe regulärer Positionen';
COMMENT ON COLUMN weekly_invoices.retro_items_count IS 'Anzahl Nachberechnungs-Positionen (aus bereits geschlossenen Zeiträumen)';
COMMENT ON COLUMN weekly_invoices.retro_items_amount IS 'Summe Nachberechnungs-Positionen';

COMMENT ON FUNCTION is_period_closed(INTEGER, INTEGER, TEXT, TEXT) IS 'Prüft ob eine KW bereits abgerechnet/gesperrt ist';
COMMENT ON FUNCTION generate_invoice_number(INTEGER, INTEGER, TEXT, TEXT) IS 'Generiert eindeutige Abrechnungsnummer';
