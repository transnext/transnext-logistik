/**
 * Invoice API - Wochenabrechnungen für Smart & Care
 *
 * Admin/GF-only Funktionen für:
 * - Abrechenbare Touren/Auslagen laden
 * - Wochenabrechnungen erstellen
 * - Datensätze verknüpfen und sperren
 * - Nachberechnungen aus geschlossenen Zeiträumen
 *
 * Keine SQL-/RPC-Änderungen - nutzt vorhandene Tabellen.
 */

import { supabase } from "./supabase"
import { logAuditEvent } from "./audit-api"
import { calculateCustomerTotal, wartezeitToCode, type Auftraggeber } from "./customer-pricing"
import { calculateCustomerAmountsForTours, type CustomerPriceResult } from "./pricing-calculator"

// =====================================================
// TYPES
// =====================================================

export type BillingPositionType = 'regulaer' | 'nachberechnung' | 'korrektur'

export interface WeeklyInvoice {
  id: string
  client: string
  customer_id: string | null
  invoice_type: 'tours' | 'expenses'
  invoice_number: string | null
  year: number
  week_number: number
  week_start: string
  week_end: string
  items_count: number
  items_amount: number
  regular_items_count: number
  regular_items_amount: number
  retro_items_count: number
  retro_items_amount: number
  pdf_url: string | null
  pdf_hash: string | null
  pdf_generated_at: string | null
  pdf_generated_by: string | null
  included_item_ids: number[]
  included_items_snapshot: Record<string, unknown>
  data_snapshot: Record<string, unknown> | null
  exported_at: string | null
  exported_by: string | null
  locked_at: string | null
  locked_by: string | null
  status: 'draft' | 'exported' | 'locked' | 'archived'
  created_at: string
  updated_at: string
}

export interface BillableTour {
  id: number
  tour_nr: string
  datum: string
  gefahrene_km: number
  wartezeit: string
  waiting_units: number
  fahrer_name: string
  status: string
  auftraggeber: string
  customer_id: string | null
  customer_amount: number
  customer_billing_status: string
  weekly_invoice_id: string | null
  locked_at: string | null
  user_id?: string
  // Erweiterte Felder für pricing_tables-basierte Berechnung
  amount_calculated?: boolean
  pricing_table_id?: string | null
  pricing_table_name?: string | null
  calculation_source?: 'pricing_table' | 'fallback_constant' | 'not_calculable'
  calculation_warnings?: string[]
  // Nachberechnungs-Felder
  billing_type: BillingPositionType
  original_billing_period: string | null
  is_retroactive: boolean
}

export interface BillableAuslage {
  id: number
  tour_nr: string
  kennzeichen: string
  datum: string
  belegart: string
  kosten: number
  fahrer_name: string
  status: string
  customer_id: string | null
  customer_billing_status: string
  weekly_invoice_id: string | null
  locked_at: string | null
  beleg_url: string | null
  user_id?: string
  // Nachberechnungs-Felder
  billing_type: BillingPositionType
  original_billing_period: string | null
  is_retroactive: boolean
}

export interface WeekInfo {
  year: number
  week: number
  weekStart: string
  weekEnd: string
}

// Ergebnis mit getrennten regulären und Nachberechnungs-Positionen
export interface BillableItemsResult<T> {
  regular: T[]
  retroactive: T[]
  regularSum: number
  retroactiveSum: number
  totalSum: number
}

// =====================================================
// BILLING SYSTEM CUTOFF
// =====================================================

/**
 * WICHTIG: Die neue Abrechnungs-/Nachberechnungslogik greift erst ab KW21/2026.
 *
 * Begründung:
 * - Viele alte Touren/Auslagen vor KW21/2026 wurden bereits manuell/außerhalb
 *   des Portals abgerechnet, aber im System steht noch weekly_invoice_id = NULL.
 * - Diese Altlasten dürfen NICHT automatisch in neue Abrechnungen gezogen werden.
 * - Ab KW21/2026 gilt die neue Logik vollständig.
 *
 * Regel:
 * - Nur Positionen mit Leistungsdatum >= 2026-05-18 (Start KW21/2026) werden
 *   durch die neue Abrechnungslogik berücksichtigt.
 * - Alle Positionen davor werden ignoriert (nicht gelöscht, nur ausgeschlossen).
 */
export const BILLING_SYSTEM_START_YEAR = 2026
export const BILLING_SYSTEM_START_WEEK = 21
// KW21/2026 beginnt am Montag, 18. Mai 2026
export const BILLING_SYSTEM_START_DATE = '2026-05-18'

/**
 * Prüft ob ein Datum im gültigen Abrechnungszeitraum liegt (ab KW21/2026)
 */
export function isDateInBillingScope(dateStr: string): boolean {
  return dateStr >= BILLING_SYSTEM_START_DATE
}

/**
 * Prüft ob eine KW im gültigen Abrechnungszeitraum liegt (ab KW21/2026)
 */
export function isWeekInBillingScope(year: number, week: number): boolean {
  if (year > BILLING_SYSTEM_START_YEAR) return true
  if (year < BILLING_SYSTEM_START_YEAR) return false
  return week >= BILLING_SYSTEM_START_WEEK
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Ermittelt ob aktueller User Admin/GF ist
 */
async function isAdminOrGF(): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  return profile?.role === 'admin' || profile?.role === 'gf'
}

/**
 * Berechnet Wochenstart und -ende für eine KW
 */
export function getWeekDates(year: number, week: number): { start: string; end: string } {
  // ISO-Woche: Woche 1 enthält den 4. Januar
  const simple = new Date(year, 0, 1 + (week - 1) * 7)
  const dow = simple.getDay()
  const ISOweekStart = new Date(simple)
  if (dow <= 4) {
    ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1)
  } else {
    ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay())
  }

  const weekEnd = new Date(ISOweekStart)
  weekEnd.setDate(weekEnd.getDate() + 6)

  return {
    start: ISOweekStart.toISOString().split('T')[0],
    end: weekEnd.toISOString().split('T')[0]
  }
}

/**
 * Berechnet ISO-Wochennummer für ein Datum
 */
export function getISOWeek(date: Date): { week: number; year: number } {
  const target = new Date(date.valueOf())
  const dayNr = (date.getDay() + 6) % 7
  target.setDate(target.getDate() - dayNr + 3)
  const firstThursday = target.valueOf()
  target.setMonth(0, 1)
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7)
  }
  const week = 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000)
  // Jahr kann abweichen bei Jahreswechsel
  const year = target.getFullYear()
  return { week, year: date.getFullYear() }
}

/**
 * Formatiert KW-Zeitraum als String
 */
export function formatWeekPeriod(year: number, week: number): string {
  return `${year}-KW${week.toString().padStart(2, '0')}`
}

/**
 * Generiert KW-Optionen für Dropdown
 * Standardmäßig: Alle Wochen von Dezember 2025 bis heute
 */
export function generateWeekOptions(count?: number): WeekInfo[] {
  const options: WeekInfo[] = []
  const today = new Date()

  // Wenn count angegeben, nur diese Anzahl Wochen zurück
  // Sonst: Alle Wochen seit 1. Dezember 2025
  const startDate = count
    ? new Date(today.getTime() - (count - 1) * 7 * 24 * 60 * 60 * 1000)
    : new Date('2025-12-01')

  // Alle Wochen von startDate bis heute generieren
  const current = new Date(today)
  const seen = new Set<string>()

  while (current >= startDate) {
    const { week, year } = getISOWeek(current)
    const key = `${year}-${week}`

    if (!seen.has(key)) {
      seen.add(key)
      const dates = getWeekDates(year, week)
      options.push({
        year,
        week,
        weekStart: dates.start,
        weekEnd: dates.end
      })
    }

    current.setDate(current.getDate() - 7)
  }

  return options
}

/**
 * Konvertiert Wartezeit-String zu waiting_units für Preisberechnung
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
 * Generiert eindeutige Abrechnungsnummer
 */
export function generateInvoiceNumber(year: number, week: number, client: string, type: 'tours' | 'expenses'): string {
  const clientCode = client === 'onlogist' ? 'OL' : 'SC'
  const typeCode = type === 'tours' ? 'T' : 'A'
  return `ABR-${year}-KW${week.toString().padStart(2, '0')}-${clientCode}-${typeCode}`
}

// =====================================================
// CLOSED PERIODS
// =====================================================

/**
 * Prüft ob eine KW bereits geschlossen (locked/exported/archived) ist
 */
export async function isPeriodClosed(
  year: number,
  week: number,
  client: string,
  invoiceType: 'tours' | 'expenses'
): Promise<boolean> {
  const { data, error } = await supabase
    .from('weekly_invoices')
    .select('id, status')
    .eq('year', year)
    .eq('week_number', week)
    .eq('client', client)
    .eq('invoice_type', invoiceType)
    .in('status', ['locked', 'exported', 'archived'])
    .limit(1)

  if (error) {
    console.warn('Fehler bei isPeriodClosed:', error)
    return false
  }

  return (data?.length ?? 0) > 0
}

/**
 * Lädt alle geschlossenen Perioden für einen Kunden
 */
export async function getClosedPeriods(
  client: string,
  invoiceType: 'tours' | 'expenses'
): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('weekly_invoices')
    .select('year, week_number')
    .eq('client', client)
    .eq('invoice_type', invoiceType)
    .in('status', ['locked', 'exported', 'archived'])

  if (error || !data) {
    console.warn('Fehler bei getClosedPeriods:', error)
    return new Set()
  }

  // Set mit "YYYY-KWnn" Format
  return new Set(data.map(d => formatWeekPeriod(d.year, d.week_number)))
}

// =====================================================
// BILLABLE ITEMS - TOUREN
// =====================================================

/**
 * Mappt auftraggeber-String auf client-Code
 */
function mapAuftraggeberToClient(auftraggeber: string | null | undefined): string {
  if (!auftraggeber) return 'smart_and_care'
  const lower = auftraggeber.toLowerCase().trim()
  if (lower === 'onlogist') return 'onlogist'
  if (lower === 'smartandcare' || lower === 'smart_and_care') return 'smart_and_care'
  return 'smart_and_care'
}

/**
 * Lädt alle abrechenbaren Touren für eine KW
 * Unterscheidet zwischen regulären Touren (Datum in KW) und Nachberechnungen (aus geschlossenen KWs)
 *
 * @param client - 'smart_and_care', 'onlogist', oder 'all' für alle Kunden
 */
export async function getBillableTours(
  year: number,
  week: number,
  client: string = 'all'
): Promise<BillableTour[]> {
  if (!(await isAdminOrGF())) {
    throw new Error('Keine Berechtigung')
  }

  const { start, end } = getWeekDates(year, week)

  // Lade alle offenen Touren:
  // 1. Touren mit Datum in der gewählten KW (regulär)
  // 2. Touren aus geschlossenen Perioden, die noch nicht abgerechnet wurden (Nachberechnung)
  //
  // WICHTIG: Cutoff-Regel - nur Touren ab KW21/2026 (Datum >= 2026-05-18) werden berücksichtigt!
  // Ältere Touren wurden bereits manuell abgerechnet und dürfen nicht automatisch gezogen werden.
  const { data, error } = await supabase
    .from('arbeitsnachweise')
    .select(`
      id,
      tour_nr,
      datum,
      gefahrene_km,
      wartezeit,
      waiting_units,
      user_id,
      status,
      auftraggeber,
      customer_id,
      customer_amount,
      customer_billing_status,
      weekly_invoice_id,
      locked_at,
      billing_type,
      original_billing_period
    `)
    .eq('status', 'approved')
    .or(`customer_billing_status.is.null,customer_billing_status.eq.nicht_abgerechnet`)
    .is('weekly_invoice_id', null)
    .is('locked_at', null)
    .gte('datum', BILLING_SYSTEM_START_DATE) // Cutoff: nur ab KW21/2026
    .order('datum', { ascending: true })

  if (error) {
    console.error('Fehler beim Laden abrechenbarer Touren:', error)
    throw new Error(error.message)
  }

  if (!data || data.length === 0) {
    return []
  }

  // Filter nach Client, wenn nicht 'all'
  let filtered = data
  if (client !== 'all') {
    filtered = data.filter(t => {
      const tourClient = mapAuftraggeberToClient(t.auftraggeber)
      return tourClient === client
    })
  }

  if (filtered.length === 0) {
    return []
  }

  // Lade geschlossene Perioden für beide Kunden
  const closedPeriodsSC = await getClosedPeriods('smart_and_care', 'tours')
  const closedPeriodsOL = await getClosedPeriods('onlogist', 'tours')

  // Fahrer-Namen via profiles laden
  const userIds = [...new Set(filtered.map(item => item.user_id).filter(Boolean))]

  const { data: profiles } = userIds.length > 0 ? await supabase
    .from('profiles')
    .select('id, full_name')
    .in('id', userIds) : { data: [] }

  const profilesMap = new Map(profiles?.map(p => [p.id, p.full_name]) || [])

  // Berechne Kundenbeträge aus pricing_tables
  const priceResults = await calculateCustomerAmountsForTours(filtered.map(t => ({
    id: t.id,
    tour_nr: t.tour_nr,
    datum: t.datum,
    gefahrene_km: t.gefahrene_km || 0,
    wartezeit: t.wartezeit,
    customer_id: t.customer_id,
    auftraggeber: t.auftraggeber
  })))

  return filtered.map(t => {
    const priceResult = priceResults.get(t.id)
    let customerAmount = t.customer_amount
    let amountCalculated = false
    let pricingTableId: string | null = null
    let pricingTableName: string | null = null
    let calculationSource: 'pricing_table' | 'fallback_constant' | 'not_calculable' = 'pricing_table'
    let calculationWarnings: string[] = []

    // Wenn customer_amount null oder 0, nutze berechneten Wert
    if (customerAmount === null || customerAmount === undefined || customerAmount === 0) {
      if (priceResult) {
        customerAmount = priceResult.amount
        pricingTableId = priceResult.pricing_table_id
        pricingTableName = priceResult.pricing_table_name
        calculationSource = priceResult.calculation_source
        calculationWarnings = priceResult.warnings
        amountCalculated = true
      } else {
        // Fallback auf alte Methode wenn priceResult fehlt
        const auftraggeber: Auftraggeber = t.auftraggeber === 'onlogist' ? 'onlogist' : 'smartandcare'
        customerAmount = calculateCustomerTotal(
          t.gefahrene_km || 0,
          t.wartezeit,
          auftraggeber
        )
        amountCalculated = true
        calculationSource = 'fallback_constant'
        calculationWarnings = ['Fallback: priceResult fehlt']
      }
    }

    // Ermittle ob diese Tour eine Nachberechnung ist
    const tourDate = new Date(t.datum)
    const tourWeekInfo = getISOWeek(tourDate)
    const tourPeriod = formatWeekPeriod(tourWeekInfo.year, tourWeekInfo.week)
    const tourClient = mapAuftraggeberToClient(t.auftraggeber)
    const closedPeriods = tourClient === 'onlogist' ? closedPeriodsOL : closedPeriodsSC

    // Tour ist Nachberechnung, wenn:
    // 1. Das Datum NICHT in der aktuell ausgewählten KW liegt UND
    // 2. Die ursprüngliche KW der Tour bereits geschlossen ist
    const isInSelectedPeriod = t.datum >= start && t.datum <= end
    const isFromClosedPeriod = closedPeriods.has(tourPeriod)
    const isRetroactive = !isInSelectedPeriod && isFromClosedPeriod

    // Bestimme billing_type
    let billingType: BillingPositionType = t.billing_type || 'regulaer'
    let originalPeriod: string | null = t.original_billing_period || null

    if (isRetroactive && billingType === 'regulaer') {
      // Tour aus geschlossenem Zeitraum - als Nachberechnung markieren
      billingType = 'nachberechnung'
      originalPeriod = tourPeriod
    }

    return {
      ...t,
      fahrer_name: profilesMap.get(t.user_id) || 'Unbekannt',
      customer_amount: customerAmount,
      amount_calculated: amountCalculated,
      pricing_table_id: pricingTableId,
      pricing_table_name: pricingTableName,
      calculation_source: calculationSource,
      calculation_warnings: calculationWarnings,
      billing_type: billingType,
      original_billing_period: originalPeriod,
      is_retroactive: isRetroactive
    }
  }) as BillableTour[]
}

/**
 * Lädt abrechenbare Touren getrennt nach regulär und Nachberechnung
 */
export async function getBillableToursGrouped(
  year: number,
  week: number,
  client: string = 'all'
): Promise<BillableItemsResult<BillableTour>> {
  const allTours = await getBillableTours(year, week, client)

  const regular = allTours.filter(t => !t.is_retroactive)
  const retroactive = allTours.filter(t => t.is_retroactive)

  const regularSum = regular.reduce((sum, t) => sum + (t.customer_amount || 0), 0)
  const retroactiveSum = retroactive.reduce((sum, t) => sum + (t.customer_amount || 0), 0)

  return {
    regular,
    retroactive,
    regularSum,
    retroactiveSum,
    totalSum: regularSum + retroactiveSum
  }
}

// =====================================================
// BILLABLE ITEMS - AUSLAGEN
// =====================================================

/**
 * Lädt alle abrechenbaren Auslagen für eine KW
 * Unterscheidet zwischen regulären Auslagen und Nachberechnungen
 */
export async function getBillableExpenses(
  year: number,
  week: number,
  client: string = 'smart_and_care'
): Promise<BillableAuslage[]> {
  if (!(await isAdminOrGF())) {
    throw new Error('Keine Berechtigung')
  }

  const { start, end } = getWeekDates(year, week)

  // Lade alle offenen Auslagen
  //
  // WICHTIG: Cutoff-Regel - nur Auslagen ab KW21/2026 (Datum >= 2026-05-18) werden berücksichtigt!
  // Ältere Auslagen wurden bereits manuell abgerechnet und dürfen nicht automatisch gezogen werden.
  const { data, error } = await supabase
    .from('auslagennachweise')
    .select(`
      id,
      tour_nr,
      kennzeichen,
      datum,
      belegart,
      kosten,
      user_id,
      status,
      customer_id,
      customer_billing_status,
      weekly_invoice_id,
      locked_at,
      beleg_url,
      billing_type,
      original_billing_period
    `)
    .eq('status', 'approved')
    .or(`customer_billing_status.is.null,customer_billing_status.eq.nicht_abgerechnet`)
    .is('weekly_invoice_id', null)
    .is('locked_at', null)
    .gte('datum', BILLING_SYSTEM_START_DATE) // Cutoff: nur ab KW21/2026
    .order('datum', { ascending: true })

  if (error) {
    console.error('Fehler beim Laden abrechenbarer Auslagen:', error)
    throw new Error(error.message)
  }

  if (!data || data.length === 0) {
    return []
  }

  // Lade geschlossene Perioden
  const closedPeriods = await getClosedPeriods('smart_and_care', 'expenses')

  // Fahrer-Namen via profiles laden
  const userIds = [...new Set(data.map(item => item.user_id).filter(Boolean))]

  const { data: profiles } = userIds.length > 0 ? await supabase
    .from('profiles')
    .select('id, full_name')
    .in('id', userIds) : { data: [] }

  const profilesMap = new Map(profiles?.map(p => [p.id, p.full_name]) || [])

  return data.map(e => {
    // Ermittle ob diese Auslage eine Nachberechnung ist
    const expenseDate = new Date(e.datum)
    const expenseWeekInfo = getISOWeek(expenseDate)
    const expensePeriod = formatWeekPeriod(expenseWeekInfo.year, expenseWeekInfo.week)

    const isInSelectedPeriod = e.datum >= start && e.datum <= end
    const isFromClosedPeriod = closedPeriods.has(expensePeriod)
    const isRetroactive = !isInSelectedPeriod && isFromClosedPeriod

    let billingType: BillingPositionType = e.billing_type || 'regulaer'
    let originalPeriod: string | null = e.original_billing_period || null

    if (isRetroactive && billingType === 'regulaer') {
      billingType = 'nachberechnung'
      originalPeriod = expensePeriod
    }

    return {
      ...e,
      fahrer_name: profilesMap.get(e.user_id) || 'Unbekannt',
      billing_type: billingType,
      original_billing_period: originalPeriod,
      is_retroactive: isRetroactive
    }
  }) as BillableAuslage[]
}

/**
 * Lädt abrechenbare Auslagen getrennt nach regulär und Nachberechnung
 */
export async function getBillableExpensesGrouped(
  year: number,
  week: number,
  client: string = 'smart_and_care'
): Promise<BillableItemsResult<BillableAuslage>> {
  const allExpenses = await getBillableExpenses(year, week, client)

  const regular = allExpenses.filter(e => !e.is_retroactive)
  const retroactive = allExpenses.filter(e => e.is_retroactive)

  const regularSum = regular.reduce((sum, e) => sum + (e.kosten || 0), 0)
  const retroactiveSum = retroactive.reduce((sum, e) => sum + (e.kosten || 0), 0)

  return {
    regular,
    retroactive,
    regularSum,
    retroactiveSum,
    totalSum: regularSum + retroactiveSum
  }
}

// =====================================================
// EXISTING INVOICES
// =====================================================

/**
 * Lädt existierende Wochenabrechnung für KW
 */
export async function getWeeklyInvoice(
  year: number,
  week: number,
  invoiceType: 'tours' | 'expenses',
  client: string = 'smart_and_care'
): Promise<WeeklyInvoice | null> {
  if (!(await isAdminOrGF())) {
    // Keine Berechtigung - gibt null zurück statt Fehler zu werfen
    console.warn('getWeeklyInvoice: Keine Admin/GF Berechtigung')
    return null
  }

  const { data, error } = await supabase
    .from('weekly_invoices')
    .select('*')
    .eq('client', client)
    .eq('invoice_type', invoiceType)
    .eq('year', year)
    .eq('week_number', week)
    .single()

  // PGRST116 = not found, 42501 = RLS denied - beides bedeutet "keine Daten"
  if (error) {
    if (error.code === 'PGRST116' || error.code === '42501') {
      return null
    }
    console.error('Fehler beim Laden der Wochenabrechnung:', error)
    // Bei anderen Fehlern auch null zurückgeben statt zu werfen
    return null
  }

  return data as WeeklyInvoice | null
}

/**
 * Lädt alle Wochenabrechnungen
 */
export async function getAllWeeklyInvoices(
  client: string = 'smart_and_care'
): Promise<WeeklyInvoice[]> {
  if (!(await isAdminOrGF())) {
    console.warn('getAllWeeklyInvoices: Keine Admin/GF Berechtigung')
    return []
  }

  const { data, error } = await supabase
    .from('weekly_invoices')
    .select('*')
    .eq('client', client)
    .order('year', { ascending: false })
    .order('week_number', { ascending: false })
    .limit(100)

  if (error) {
    // Bei RLS-Fehler oder anderen Fehlern leere Liste zurückgeben
    if (error.code === '42501') {
      console.warn('getAllWeeklyInvoices: RLS blockiert Zugriff')
      return []
    }
    console.error('Fehler beim Laden der Wochenabrechnungen:', error)
    return []
  }

  return (data || []) as WeeklyInvoice[]
}

// =====================================================
// CREATE INVOICE
// =====================================================

export interface CreateInvoiceResult {
  success: boolean
  invoice?: WeeklyInvoice
  error?: string
}

/**
 * Erstellt eine neue Wochenabrechnung für Touren
 * Trennt automatisch reguläre Positionen von Nachberechnungen
 */
export async function createToursInvoice(
  year: number,
  week: number,
  tours: BillableTour[],
  client: string = 'smart_and_care'
): Promise<CreateInvoiceResult> {
  if (!(await isAdminOrGF())) {
    return { success: false, error: 'Keine Berechtigung' }
  }

  if (tours.length === 0) {
    return { success: false, error: 'Keine abrechenbaren Touren vorhanden' }
  }

  // Prüfe ob alle Touren einen gültigen Betrag haben
  const toursWithoutAmount = tours.filter(t =>
    t.customer_amount === null || t.customer_amount === undefined || t.customer_amount === 0
  )
  if (toursWithoutAmount.length > 0) {
    console.warn(`${toursWithoutAmount.length} Tour(en) ohne Kundenbetrag gefunden`)
  }

  // Prüfe ob Abrechnung bereits existiert
  const existing = await getWeeklyInvoice(year, week, 'tours', client)
  if (existing) {
    return { success: false, error: `Wochenabrechnung für KW ${week}/${year} existiert bereits` }
  }

  const { start, end } = getWeekDates(year, week)
  const { data: { user } } = await supabase.auth.getUser()

  // Trenne reguläre und Nachberechnungs-Positionen
  const regularTours = tours.filter(t => !t.is_retroactive)
  const retroTours = tours.filter(t => t.is_retroactive)

  // Beträge berechnen
  const regularAmount = regularTours.reduce((sum, t) => sum + (t.customer_amount || 0), 0)
  const retroAmount = retroTours.reduce((sum, t) => sum + (t.customer_amount || 0), 0)
  const totalAmount = regularAmount + retroAmount
  const itemIds = tours.map(t => t.id)

  // Abrechnungsnummer generieren
  const invoiceNumber = generateInvoiceNumber(year, week, client, 'tours')

  // Snapshot erstellen mit Nachberechnungs-Kennzeichnung
  const snapshot = tours.map(t => ({
    id: t.id,
    tour_nr: t.tour_nr,
    datum: t.datum,
    gefahrene_km: t.gefahrene_km,
    wartezeit: t.wartezeit,
    customer_amount: t.customer_amount,
    fahrer_name: t.fahrer_name,
    auftraggeber: t.auftraggeber,
    customer_id: t.customer_id,
    // Nachberechnungs-Felder
    billing_type: t.billing_type,
    original_billing_period: t.original_billing_period,
    is_retroactive: t.is_retroactive,
    // Preis-Tracking
    amount_was_calculated: t.amount_calculated || false,
    pricing_table_id: t.pricing_table_id || null,
    pricing_table_name: t.pricing_table_name || null,
    calculation_source: t.calculation_source || 'unknown',
    calculation_warnings: t.calculation_warnings || []
  }))

  console.log(`Erstelle Touren-Abrechnung ${invoiceNumber}:`)
  console.log(`  - Regulär: ${regularTours.length} Touren, ${regularAmount.toFixed(2)}€`)
  console.log(`  - Nachberechnung: ${retroTours.length} Touren, ${retroAmount.toFixed(2)}€`)
  console.log(`  - Gesamt: ${tours.length} Touren, ${totalAmount.toFixed(2)}€`)

  // Invoice erstellen
  const { data: invoice, error: insertError } = await supabase
    .from('weekly_invoices')
    .insert({
      client,
      invoice_type: 'tours',
      invoice_number: invoiceNumber,
      year,
      week_number: week,
      week_start: start,
      week_end: end,
      items_count: tours.length,
      items_amount: totalAmount,
      regular_items_count: regularTours.length,
      regular_items_amount: regularAmount,
      retro_items_count: retroTours.length,
      retro_items_amount: retroAmount,
      included_item_ids: itemIds,
      included_items_snapshot: { tours: snapshot },
      data_snapshot: { created_by: user?.id, created_at: new Date().toISOString() },
      status: 'draft'
    })
    .select()
    .single()

  if (insertError) {
    console.error('Fehler beim Erstellen der Wochenabrechnung:', insertError)
    return { success: false, error: insertError.message }
  }

  // Arbeitsnachweise aktualisieren - setze billing_type und original_billing_period
  for (const tour of tours) {
    const { error: updateError } = await supabase
      .from('arbeitsnachweise')
      .update({
        weekly_invoice_id: invoice.id,
        customer_billing_status: 'in_abrechnung',
        billing_type: tour.billing_type,
        original_billing_period: tour.original_billing_period
      })
      .eq('id', tour.id)

    if (updateError) {
      console.error(`Fehler beim Aktualisieren von Tour ${tour.id}:`, updateError)
    }
  }

  // Audit-Log: Wochenabrechnung erstellt
  await logAuditEvent({
    action: 'invoice_created',
    entityType: 'weekly_invoice',
    entityId: invoice.id,
    entityLabel: `${invoiceNumber} (KW ${week}/${year} Touren)`,
    severity: 'info',
    isFinancial: true,
    afterData: {
      id: invoice.id,
      invoice_number: invoiceNumber,
      invoice_type: 'tours',
      year,
      week_number: week,
      items_count: tours.length,
      regular_count: regularTours.length,
      retro_count: retroTours.length,
      status: 'draft'
    },
    metadata: {
      client,
      week_start: start,
      week_end: end,
      has_retroactive: retroTours.length > 0
    }
  })

  return { success: true, invoice: invoice as WeeklyInvoice }
}

/**
 * Erstellt eine neue Wochenabrechnung für Auslagen
 * Trennt automatisch reguläre Positionen von Nachberechnungen
 */
export async function createExpensesInvoice(
  year: number,
  week: number,
  expenses: BillableAuslage[],
  client: string = 'smart_and_care'
): Promise<CreateInvoiceResult> {
  if (!(await isAdminOrGF())) {
    return { success: false, error: 'Keine Berechtigung' }
  }

  if (expenses.length === 0) {
    return { success: false, error: 'Keine abrechenbaren Auslagen vorhanden' }
  }

  // Prüfe ob Abrechnung bereits existiert
  const existing = await getWeeklyInvoice(year, week, 'expenses', client)
  if (existing) {
    return { success: false, error: `Auslagen-Abrechnung für KW ${week}/${year} existiert bereits` }
  }

  const { start, end } = getWeekDates(year, week)
  const { data: { user } } = await supabase.auth.getUser()

  // Trenne reguläre und Nachberechnungs-Positionen
  const regularExpenses = expenses.filter(e => !e.is_retroactive)
  const retroExpenses = expenses.filter(e => e.is_retroactive)

  // Beträge berechnen
  const regularAmount = regularExpenses.reduce((sum, e) => sum + (e.kosten || 0), 0)
  const retroAmount = retroExpenses.reduce((sum, e) => sum + (e.kosten || 0), 0)
  const totalAmount = regularAmount + retroAmount
  const itemIds = expenses.map(e => e.id)

  // Abrechnungsnummer generieren
  const invoiceNumber = generateInvoiceNumber(year, week, client, 'expenses')

  // Snapshot erstellen
  const snapshot = expenses.map(e => ({
    id: e.id,
    tour_nr: e.tour_nr,
    kennzeichen: e.kennzeichen,
    datum: e.datum,
    belegart: e.belegart,
    kosten: e.kosten,
    fahrer_name: e.fahrer_name,
    beleg_url: e.beleg_url,
    // Nachberechnungs-Felder
    billing_type: e.billing_type,
    original_billing_period: e.original_billing_period,
    is_retroactive: e.is_retroactive
  }))

  console.log(`Erstelle Auslagen-Abrechnung ${invoiceNumber}:`)
  console.log(`  - Regulär: ${regularExpenses.length} Auslagen, ${regularAmount.toFixed(2)}€`)
  console.log(`  - Nachberechnung: ${retroExpenses.length} Auslagen, ${retroAmount.toFixed(2)}€`)
  console.log(`  - Gesamt: ${expenses.length} Auslagen, ${totalAmount.toFixed(2)}€`)

  // Invoice erstellen
  const { data: invoice, error: insertError } = await supabase
    .from('weekly_invoices')
    .insert({
      client,
      invoice_type: 'expenses',
      invoice_number: invoiceNumber,
      year,
      week_number: week,
      week_start: start,
      week_end: end,
      items_count: expenses.length,
      items_amount: totalAmount,
      regular_items_count: regularExpenses.length,
      regular_items_amount: regularAmount,
      retro_items_count: retroExpenses.length,
      retro_items_amount: retroAmount,
      included_item_ids: itemIds,
      included_items_snapshot: { expenses: snapshot },
      data_snapshot: { created_by: user?.id, created_at: new Date().toISOString() },
      status: 'draft'
    })
    .select()
    .single()

  if (insertError) {
    console.error('Fehler beim Erstellen der Auslagen-Abrechnung:', insertError)
    return { success: false, error: insertError.message }
  }

  // Auslagen aktualisieren
  for (const expense of expenses) {
    const { error: updateError } = await supabase
      .from('auslagennachweise')
      .update({
        weekly_invoice_id: invoice.id,
        customer_billing_status: 'in_abrechnung',
        billing_type: expense.billing_type,
        original_billing_period: expense.original_billing_period
      })
      .eq('id', expense.id)

    if (updateError) {
      console.error(`Fehler beim Aktualisieren von Auslage ${expense.id}:`, updateError)
    }
  }

  // Audit-Log: Auslagen-Abrechnung erstellt
  await logAuditEvent({
    action: 'invoice_created',
    entityType: 'weekly_invoice',
    entityId: invoice.id,
    entityLabel: `${invoiceNumber} (KW ${week}/${year} Auslagen)`,
    severity: 'info',
    isFinancial: true,
    afterData: {
      id: invoice.id,
      invoice_number: invoiceNumber,
      invoice_type: 'expenses',
      year,
      week_number: week,
      items_count: expenses.length,
      regular_count: regularExpenses.length,
      retro_count: retroExpenses.length,
      status: 'draft'
    },
    metadata: {
      client,
      week_start: start,
      week_end: end,
      has_retroactive: retroExpenses.length > 0
    }
  })

  return { success: true, invoice: invoice as WeeklyInvoice }
}

// =====================================================
// LOCKING
// =====================================================

/**
 * Sperrt eine Wochenabrechnung und alle verknüpften Datensätze
 * Eine gesperrte Abrechnung kann nicht mehr geändert werden
 */
export async function lockInvoice(invoiceId: string): Promise<{ success: boolean; error?: string }> {
  if (!(await isAdminOrGF())) {
    return { success: false, error: 'Keine Berechtigung' }
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Nicht angemeldet' }
  }

  // Invoice laden
  const { data: invoice, error: fetchError } = await supabase
    .from('weekly_invoices')
    .select('*')
    .eq('id', invoiceId)
    .single()

  if (fetchError || !invoice) {
    return { success: false, error: 'Abrechnung nicht gefunden' }
  }

  if (invoice.locked_at) {
    return { success: false, error: 'Abrechnung ist bereits gesperrt' }
  }

  const now = new Date().toISOString()

  // Invoice sperren
  const { error: lockError } = await supabase
    .from('weekly_invoices')
    .update({
      status: 'locked',
      locked_at: now,
      locked_by: user.id
    })
    .eq('id', invoiceId)

  if (lockError) {
    return { success: false, error: lockError.message }
  }

  // Verknüpfte Datensätze sperren
  if (invoice.invoice_type === 'tours') {
    await supabase
      .from('arbeitsnachweise')
      .update({
        locked_at: now,
        locked_by: user.id,
        customer_billing_status: 'gesperrt'
      })
      .eq('weekly_invoice_id', invoiceId)
  } else {
    await supabase
      .from('auslagennachweise')
      .update({
        locked_at: now,
        locked_by: user.id,
        customer_billing_status: 'gesperrt'
      })
      .eq('weekly_invoice_id', invoiceId)
  }

  // Audit-Log: Rechnung gesperrt
  await logAuditEvent({
    action: 'invoice_locked',
    entityType: 'weekly_invoice',
    entityId: invoiceId,
    entityLabel: `${invoice.invoice_number || `KW ${invoice.week_number}/${invoice.year}`} ${invoice.invoice_type === 'tours' ? 'Touren' : 'Auslagen'}`,
    severity: 'critical', // Kritisch, da gesperrte Daten nicht mehr änderbar
    isFinancial: true,
    beforeData: { status: invoice.status, locked_at: null },
    afterData: { status: 'locked', locked_at: now },
    metadata: {
      invoice_type: invoice.invoice_type,
      invoice_number: invoice.invoice_number,
      items_count: invoice.items_count,
      year: invoice.year,
      week_number: invoice.week_number
    }
  })

  return { success: true }
}

/**
 * Markiert Invoice als exportiert (mit PDF-URL)
 */
export async function markInvoiceExported(
  invoiceId: string,
  pdfUrl?: string
): Promise<{ success: boolean; error?: string }> {
  if (!(await isAdminOrGF())) {
    return { success: false, error: 'Keine Berechtigung' }
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Nicht angemeldet' }
  }

  const now = new Date().toISOString()

  const updateData: Record<string, unknown> = {
    status: 'exported',
    exported_at: now,
    exported_by: user.id
  }

  if (pdfUrl) {
    updateData.pdf_url = pdfUrl
    updateData.pdf_generated_at = now
    updateData.pdf_generated_by = user.id
  }

  const { error } = await supabase
    .from('weekly_invoices')
    .update(updateData)
    .eq('id', invoiceId)

  if (error) {
    return { success: false, error: error.message }
  }

  // Billing-Status aktualisieren
  const { data: invoice } = await supabase
    .from('weekly_invoices')
    .select('invoice_type, invoice_number')
    .eq('id', invoiceId)
    .single()

  if (invoice?.invoice_type === 'tours') {
    await supabase
      .from('arbeitsnachweise')
      .update({ customer_billing_status: 'abgerechnet' })
      .eq('weekly_invoice_id', invoiceId)
  } else {
    await supabase
      .from('auslagennachweise')
      .update({ customer_billing_status: 'abgerechnet' })
      .eq('weekly_invoice_id', invoiceId)
  }

  // Audit-Log: PDF exportiert
  await logAuditEvent({
    action: 'invoice_pdf_exported',
    entityType: 'weekly_invoice',
    entityId: invoiceId,
    entityLabel: invoice?.invoice_number || invoiceId,
    severity: 'info',
    isFinancial: true,
    afterData: {
      status: 'exported',
      has_pdf: !!pdfUrl
    },
    metadata: {
      invoice_type: invoice?.invoice_type
    }
  })

  return { success: true }
}
