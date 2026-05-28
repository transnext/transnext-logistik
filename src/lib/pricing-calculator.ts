/**
 * Pricing Calculator - Kundenpreisberechnung aus pricing_tables
 *
 * Diese Datei enthält Funktionen zur Berechnung von Kundenpreisen
 * basierend auf der pricing_tables Datenbank.
 *
 * Primärquelle: pricing_tables
 * Fallback: customer-pricing.ts (hartcodierte Konstanten)
 */

import { supabase } from "./supabase"
import { calculateCustomerTotal, type Auftraggeber } from "./customer-pricing"

// =====================================================
// TYPES
// =====================================================

export interface KmRange {
  max_km: number
  amount: number
}

export interface PricingTableInfo {
  id: string
  name: string
  client: string
  customer_id: string | null
  km_ranges: KmRange[]
  waiting_unit_rate: number
  valid_from: string
  valid_until: string | null
}

export interface CustomerPriceResult {
  amount: number
  pricing_table_id: string | null
  pricing_table_name: string | null
  calculation_source: 'pricing_table' | 'fallback_constant' | 'not_calculable'
  warnings: string[]
  km_price: number
  waiting_price: number
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Mappt auftraggeber-String auf client-Code für pricing_tables
 */
function mapAuftraggeberToClient(auftraggeber: string | null | undefined): string {
  if (!auftraggeber) return 'smart_and_care'

  const lower = auftraggeber.toLowerCase().trim()

  if (lower === 'onlogist') return 'onlogist'
  if (lower === 'smartandcare' || lower === 'smart_and_care') return 'smart_and_care'

  // Fallback
  return 'smart_and_care'
}

/**
 * Konvertiert Wartezeit-String zu Units
 * "keine" = 0, "30-60" = 1, "60-90" = 2, "90-120" = 3
 */
function wartezeitStringToUnits(wartezeit: string | null | undefined): number {
  if (!wartezeit || wartezeit === 'keine') return 0
  switch (wartezeit) {
    case '30-60': return 1
    case '60-90': return 2
    case '90-120': return 3
    default: return 0
  }
}

/**
 * Berechnet den Preis aus km_ranges
 *
 * Die Schwellen markieren die OBERGRENZE einer Stufe:
 * - max_km: 10 bedeutet "für 0-10 km gilt dieser Preis"
 * - max_km: 20 bedeutet "für 11-20 km gilt dieser Preis"
 * - max_km: 30 bedeutet "für 21-30 km gilt dieser Preis"
 *
 * Logik: Finde die erste Range, in die km passt (km <= max_km)
 *
 * Beispiele:
 * - 9 km → Range max_km=10 → erster Preis
 * - 10 km → Range max_km=10 → erster Preis
 * - 11 km → Range max_km=20 → zweiter Preis
 * - 28 km → Range max_km=30 → dritter Preis
 * - 30 km → Range max_km=30 → dritter Preis
 * - 31 km → Range max_km=50 → vierter Preis
 */
function calculatePriceFromRanges(km: number, ranges: KmRange[]): number {
  if (!ranges || ranges.length === 0) return 0
  if (km <= 0) return 0

  // Sortiere nach max_km aufsteigend
  const sorted = [...ranges].sort((a, b) => (a.max_km ?? 0) - (b.max_km ?? 0))

  // Finde die erste Range, in die km passt (km <= max_km)
  for (const range of sorted) {
    const threshold = range.max_km ?? 0
    if (km <= threshold) {
      return range.amount ?? 0
    }
  }

  // Fallback: Letzte/höchste Stufe wenn km alle Ranges überschreitet
  return sorted[sorted.length - 1]?.amount ?? 0
}

// =====================================================
// MAIN FUNCTION
// =====================================================

/**
 * Berechnet den Kundenbetrag aus pricing_tables
 *
 * @param params.customerId - UUID des Kunden (optional, bevorzugt)
 * @param params.auftraggeber - Auftraggeber-String (fallback wenn customerId fehlt)
 * @param params.tourDate - Datum der Tour (für Versionierung)
 * @param params.gefahreneKm - Gefahrene Kilometer
 * @param params.wartezeit - Wartezeit als String ("keine", "30-60", etc.)
 * @returns CustomerPriceResult mit Betrag und Metadaten
 */
export async function calculateCustomerAmountFromPricingTable(params: {
  customerId?: string | null
  auftraggeber?: string | null
  tourDate: string
  gefahreneKm: number
  wartezeit?: string | null
}): Promise<CustomerPriceResult> {
  const { customerId, auftraggeber, tourDate, gefahreneKm, wartezeit } = params
  const warnings: string[] = []

  // =====================================================
  // 1. Validierung
  // =====================================================

  if (!gefahreneKm || gefahreneKm <= 0) {
    return {
      amount: 0,
      pricing_table_id: null,
      pricing_table_name: null,
      calculation_source: 'not_calculable',
      warnings: ['KM fehlen oder 0 - Preis nicht berechenbar'],
      km_price: 0,
      waiting_price: 0
    }
  }

  // =====================================================
  // 2. Client ermitteln
  // =====================================================

  const client = mapAuftraggeberToClient(auftraggeber)

  // =====================================================
  // 3. Passende pricing_table suchen
  // =====================================================

  let pricingTable: PricingTableInfo | null = null

  try {
    // Suche nach pricing_table:
    // - type = 'customer'
    // - client passt ODER customer_id passt
    // - valid_from <= tourDate
    // - valid_until IS NULL OR valid_until >= tourDate
    // - employment_type IS NULL (Kundenpreisliste)
    // Sortiert nach valid_from DESC (neueste zuerst)

    let query = supabase
      .from('pricing_tables')
      .select('id, name, client, customer_id, km_ranges, waiting_unit_rate, valid_from, valid_until')
      .eq('type', 'customer')
      .is('employment_type', null)
      .lte('valid_from', tourDate)
      .or('valid_until.is.null,valid_until.gte.' + tourDate)
      .order('valid_from', { ascending: false })
      .limit(10)

    // Wenn customerId vorhanden, bevorzuge diese
    if (customerId) {
      query = query.eq('customer_id', customerId)
    } else {
      // Fallback auf client
      query = query.eq('client', client)
    }

    const { data, error } = await query

    if (error) {
      console.error('Fehler beim Laden der Preisliste:', error)
      warnings.push(`DB-Fehler: ${error.message}`)
    } else if (data && data.length > 0) {
      pricingTable = data[0] as PricingTableInfo
    }

    // Wenn mit customerId nichts gefunden, versuche mit client
    if (!pricingTable && customerId) {
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('pricing_tables')
        .select('id, name, client, customer_id, km_ranges, waiting_unit_rate, valid_from, valid_until')
        .eq('type', 'customer')
        .eq('client', client)
        .is('employment_type', null)
        .lte('valid_from', tourDate)
        .or('valid_until.is.null,valid_until.gte.' + tourDate)
        .order('valid_from', { ascending: false })
        .limit(1)

      if (!fallbackError && fallbackData && fallbackData.length > 0) {
        pricingTable = fallbackData[0] as PricingTableInfo
        warnings.push(`Preisliste über client '${client}' gefunden (customer_id nicht gefunden)`)
      }
    }
  } catch (err) {
    console.error('Fehler bei Preislisten-Suche:', err)
    warnings.push(`Fehler: ${(err as Error).message}`)
  }

  // =====================================================
  // 4. Berechnung
  // =====================================================

  if (pricingTable) {
    // Berechnung aus pricing_table
    const kmRanges = pricingTable.km_ranges || []
    const kmPrice = calculatePriceFromRanges(gefahreneKm, kmRanges)

    // Wartezeit-Berechnung
    // Bei Onlogist: waiting_unit_rate sollte 0 sein
    const waitingUnits = wartezeitStringToUnits(wartezeit)
    const waitingPrice = waitingUnits * (pricingTable.waiting_unit_rate || 0)

    const totalAmount = kmPrice + waitingPrice

    return {
      amount: totalAmount,
      pricing_table_id: pricingTable.id,
      pricing_table_name: pricingTable.name,
      calculation_source: 'pricing_table',
      warnings,
      km_price: kmPrice,
      waiting_price: waitingPrice
    }
  }

  // =====================================================
  // 5. Fallback auf hartcodierte Konstanten
  // =====================================================

  warnings.push(`Keine gültige Kundenpreisliste für client '${client}' und Datum '${tourDate}' gefunden. Fallback auf Code-Konstanten.`)

  // Nutze calculateCustomerTotal aus customer-pricing.ts
  const auftraggeberTyped: Auftraggeber = client === 'onlogist' ? 'onlogist' : 'smartandcare'
  const fallbackAmount = calculateCustomerTotal(gefahreneKm, wartezeit || undefined, auftraggeberTyped)

  return {
    amount: fallbackAmount,
    pricing_table_id: null,
    pricing_table_name: `Fallback: ${auftraggeberTyped} (Code-Konstante)`,
    calculation_source: 'fallback_constant',
    warnings,
    km_price: fallbackAmount, // Bei Fallback ist alles in einem
    waiting_price: 0
  }
}

/**
 * Batch-Berechnung für mehrere Touren
 * Optimiert: Lädt pricing_tables nur einmal
 *
 * Preislisten-Lookup (strikt):
 * 1. customer_id + gültiges Datum (valid_from <= tourDate, valid_until >= tourDate oder NULL)
 * 2. client + gültiges Datum
 * 3. Fallback auf Code-Konstanten (nur wenn keine DB-Preisliste gefunden)
 */
export async function calculateCustomerAmountsForTours(tours: Array<{
  id: number
  tour_nr: string
  datum: string
  gefahrene_km: number
  wartezeit?: string | null
  customer_id?: string | null
  auftraggeber?: string | null
}>): Promise<Map<number, CustomerPriceResult>> {
  const results = new Map<number, CustomerPriceResult>()

  // Lade alle aktiven Kundenpreislisten einmal
  const { data: allPricingTables, error } = await supabase
    .from('pricing_tables')
    .select('id, name, client, customer_id, km_ranges, waiting_unit_rate, valid_from, valid_until')
    .eq('type', 'customer')
    .is('employment_type', null)
    .order('valid_from', { ascending: false })

  if (error) {
    console.error('[pricing-calculator] Fehler beim Laden der Preislisten:', error.message)
    // Fallback: Einzelberechnung
    for (const tour of tours) {
      const result = await calculateCustomerAmountFromPricingTable({
        customerId: tour.customer_id,
        auftraggeber: tour.auftraggeber,
        tourDate: tour.datum,
        gefahreneKm: tour.gefahrene_km,
        wartezeit: tour.wartezeit
      })
      results.set(tour.id, result)
    }
    return results
  }

  const pricingTables = (allPricingTables || []) as PricingTableInfo[]

  // Warnungen bei fehlenden Preislisten
  if (pricingTables.length === 0) {
    console.error('[pricing-calculator] WARNUNG: Keine Kundenpreislisten geladen! Möglicherweise RLS-Problem oder Tabelle leer.')
    console.error('[pricing-calculator] Alle Touren werden mit Fallback-Konstanten berechnet.')
  } else {
    const hasSmartAndCare = pricingTables.some(pt => pt.client === 'smart_and_care')
    const hasOnlogist = pricingTables.some(pt => pt.client === 'onlogist')
    if (!hasSmartAndCare) {
      console.warn('[pricing-calculator] WARNUNG: Keine Smart & Care Kundenpreisliste gefunden!')
    }
    if (!hasOnlogist) {
      console.warn('[pricing-calculator] WARNUNG: Keine Onlogist Kundenpreisliste gefunden!')
    }
  }

  // Für jede Tour passende Preisliste finden (strikte valid_from/valid_until-Prüfung)
  for (const tour of tours) {
    const warnings: string[] = []

    // Validierung
    if (!tour.gefahrene_km || tour.gefahrene_km <= 0) {
      results.set(tour.id, {
        amount: 0,
        pricing_table_id: null,
        pricing_table_name: null,
        calculation_source: 'not_calculable',
        warnings: ['KM fehlen oder 0'],
        km_price: 0,
        waiting_price: 0
      })
      continue
    }

    const client = mapAuftraggeberToClient(tour.auftraggeber)
    const tourDate = tour.datum

    // Finde passende Preisliste - strikte 2-Stufen-Suche
    let matchingTable: PricingTableInfo | undefined = undefined

    // 1. Versuche exakten Match mit customer_id UND gültigem Datum
    if (tour.customer_id) {
      matchingTable = pricingTables.find(pt => {
        if (pt.customer_id !== tour.customer_id) return false
        if (pt.valid_from > tourDate) return false
        if (pt.valid_until && pt.valid_until < tourDate) return false
        return true
      })
    }

    // 2. Versuche Match über client UND gültigem Datum
    if (!matchingTable) {
      matchingTable = pricingTables.find(pt => {
        if (pt.client !== client) return false
        if (pt.valid_from > tourDate) return false
        if (pt.valid_until && pt.valid_until < tourDate) return false
        return true
      })
    }

    // KEINE Schritt-3-Fallback-Logik mehr!
    // valid_from/valid_until werden strikt respektiert.
    // Wenn keine Preisliste gefunden, dann Fallback auf Code-Konstanten.

    if (matchingTable) {
      const kmPrice = calculatePriceFromRanges(tour.gefahrene_km, matchingTable.km_ranges)
      const waitingUnits = wartezeitStringToUnits(tour.wartezeit)
      const waitingPrice = waitingUnits * (matchingTable.waiting_unit_rate || 0)

      results.set(tour.id, {
        amount: kmPrice + waitingPrice,
        pricing_table_id: matchingTable.id,
        pricing_table_name: matchingTable.name,
        calculation_source: 'pricing_table',
        warnings,
        km_price: kmPrice,
        waiting_price: waitingPrice
      })
    } else {
      // Fallback auf Code-Konstanten - nur wenn wirklich keine Preisliste gefunden
      warnings.push(`Keine gültige Preisliste für '${client}' zum Datum '${tourDate}' gefunden. Fallback auf Code-Konstanten.`)
      const auftraggeberTyped: Auftraggeber = client === 'onlogist' ? 'onlogist' : 'smartandcare'
      const fallbackAmount = calculateCustomerTotal(tour.gefahrene_km, tour.wartezeit || undefined, auftraggeberTyped)

      results.set(tour.id, {
        amount: fallbackAmount,
        pricing_table_id: null,
        pricing_table_name: `Fallback: ${auftraggeberTyped}`,
        calculation_source: 'fallback_constant',
        warnings,
        km_price: fallbackAmount,
        waiting_price: 0
      })
    }
  }

  return results
}
