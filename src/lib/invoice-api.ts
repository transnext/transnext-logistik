/**
 * Invoice API - Wochenabrechnungen für Smart & Care
 *
 * Admin/GF-only Funktionen für:
 * - Abrechenbare Touren/Auslagen laden
 * - Wochenabrechnungen erstellen
 * - Datensätze verknüpfen und sperren
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

export interface WeeklyInvoice {
  id: string
  client: string
  customer_id: string | null
  invoice_type: 'tours' | 'expenses'
  year: number
  week_number: number
  week_start: string
  week_end: string
  items_count: number
  items_amount: number
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
}

export interface WeekInfo {
  year: number
  week: number
  weekStart: string
  weekEnd: string
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
function getISOWeek(date: Date): { week: number; year: number } {
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
 * Filter: approved, customer_billing_status = 'nicht_abgerechnet', weekly_invoice_id = null
 *
 * WICHTIG: Kundenbeträge werden aus pricing_tables berechnet (Primärquelle).
 * Fallback auf hartcodierte Konstanten nur wenn keine passende Preisliste gefunden.
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
      locked_at
    `)
    .gte('datum', start)
    .lte('datum', end)
    .eq('status', 'approved')
    .or(`customer_billing_status.is.null,customer_billing_status.eq.nicht_abgerechnet`)
    .is('weekly_invoice_id', null)
    .is('locked_at', null)
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

        if (priceResult.calculation_source === 'pricing_table') {
          console.log(`Tour ${t.tour_nr}: ${customerAmount.toFixed(2)}€ aus Preisliste '${pricingTableName}'`)
        } else if (priceResult.calculation_source === 'fallback_constant') {
          console.warn(`Tour ${t.tour_nr}: ${customerAmount.toFixed(2)}€ aus Fallback-Konstante (${calculationWarnings.join(', ')})`)
        } else {
          console.warn(`Tour ${t.tour_nr}: Nicht berechenbar (${calculationWarnings.join(', ')})`)
        }
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

    return {
      ...t,
      fahrer_name: profilesMap.get(t.user_id) || 'Unbekannt',
      customer_amount: customerAmount,
      amount_calculated: amountCalculated,
      pricing_table_id: pricingTableId,
      pricing_table_name: pricingTableName,
      calculation_source: calculationSource,
      calculation_warnings: calculationWarnings
    }
  }) as BillableTour[]
}

// =====================================================
// BILLABLE ITEMS - AUSLAGEN
// =====================================================

/**
 * Lädt alle abrechenbaren Auslagen für eine KW
 * Filter: approved, customer_billing_status = 'nicht_abgerechnet', weekly_invoice_id = null
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
      beleg_url
    `)
    .gte('datum', start)
    .lte('datum', end)
    .eq('status', 'approved')
    .or(`customer_billing_status.is.null,customer_billing_status.eq.nicht_abgerechnet`)
    .is('weekly_invoice_id', null)
    .is('locked_at', null)
    .order('datum', { ascending: true })

  if (error) {
    console.error('Fehler beim Laden abrechenbarer Auslagen:', error)
    throw new Error(error.message)
  }

  if (!data || data.length === 0) {
    return []
  }

  // Fahrer-Namen via profiles laden
  const userIds = [...new Set(data.map(item => item.user_id).filter(Boolean))]

  const { data: profiles } = userIds.length > 0 ? await supabase
    .from('profiles')
    .select('id, full_name')
    .in('id', userIds) : { data: [] }

  const profilesMap = new Map(profiles?.map(p => [p.id, p.full_name]) || [])

  return data.map(e => ({
    ...e,
    fahrer_name: profilesMap.get(e.user_id) || 'Unbekannt'
  })) as BillableAuslage[]
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
 *
 * WICHTIG: Der berechnete Kundenbetrag wird im Snapshot gespeichert.
 * So bleibt der Preis zum Zeitpunkt der Abrechnung erhalten.
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
    // Wir erlauben die Erstellung trotzdem, da getBillableTours bereits berechnet haben sollte
  }

  // Prüfe ob Abrechnung bereits existiert
  const existing = await getWeeklyInvoice(year, week, 'tours', client)
  if (existing) {
    return { success: false, error: `Wochenabrechnung für KW ${week}/${year} existiert bereits` }
  }

  const { start, end } = getWeekDates(year, week)
  const { data: { user } } = await supabase.auth.getUser()

  // Gesamtbetrag berechnen - nutzt bereits berechnete customer_amount Werte
  const totalAmount = tours.reduce((sum, t) => sum + (t.customer_amount || 0), 0)
  const itemIds = tours.map(t => t.id)

  // Snapshot erstellen - enthält berechnete Beträge und Preislisten-Infos
  const snapshot = tours.map(t => ({
    id: t.id,
    tour_nr: t.tour_nr,
    datum: t.datum,
    gefahrene_km: t.gefahrene_km,
    wartezeit: t.wartezeit,
    customer_amount: t.customer_amount, // Berechneter Kundenbetrag
    fahrer_name: t.fahrer_name,
    auftraggeber: t.auftraggeber,
    customer_id: t.customer_id,
    // Erweiterte Felder für Nachvollziehbarkeit
    amount_was_calculated: t.amount_calculated || false,
    pricing_table_id: t.pricing_table_id || null,
    pricing_table_name: t.pricing_table_name || null,
    calculation_source: t.calculation_source || 'unknown',
    calculation_warnings: t.calculation_warnings || []
  }))

  console.log(`Erstelle Touren-Abrechnung für KW ${week}/${year}: ${tours.length} Touren, Summe: ${totalAmount.toFixed(2)}€`)

  // Invoice erstellen
  const { data: invoice, error: insertError } = await supabase
    .from('weekly_invoices')
    .insert({
      client,
      invoice_type: 'tours',
      year,
      week_number: week,
      week_start: start,
      week_end: end,
      items_count: tours.length,
      items_amount: totalAmount,
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

  // Arbeitsnachweise aktualisieren
  const { error: updateError } = await supabase
    .from('arbeitsnachweise')
    .update({
      weekly_invoice_id: invoice.id,
      customer_billing_status: 'in_abrechnung'
    })
    .in('id', itemIds)

  if (updateError) {
    console.error('Fehler beim Aktualisieren der Arbeitsnachweise:', updateError)
    // Rollback: Invoice löschen
    await supabase.from('weekly_invoices').delete().eq('id', invoice.id)
    return { success: false, error: 'Fehler beim Verknüpfen der Arbeitsnachweise' }
  }

  // Audit-Log: Wochenabrechnung erstellt
  await logAuditEvent({
    action: 'invoice_created',
    entityType: 'weekly_invoice',
    entityId: invoice.id,
    entityLabel: `KW ${week}/${year} Touren`,
    severity: 'info',
    isFinancial: true,
    afterData: {
      id: invoice.id,
      invoice_type: 'tours',
      year,
      week_number: week,
      items_count: tours.length,
      status: 'draft'
      // Keine items_amount im Log (sensibel)
    },
    metadata: {
      client,
      week_start: start,
      week_end: end
    }
  })

  return { success: true, invoice: invoice as WeeklyInvoice }
}

/**
 * Erstellt eine neue Wochenabrechnung für Auslagen
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

  // Gesamtbetrag berechnen
  const totalAmount = expenses.reduce((sum, e) => sum + (e.kosten || 0), 0)
  const itemIds = expenses.map(e => e.id)

  // Snapshot erstellen
  const snapshot = expenses.map(e => ({
    id: e.id,
    tour_nr: e.tour_nr,
    kennzeichen: e.kennzeichen,
    datum: e.datum,
    belegart: e.belegart,
    kosten: e.kosten,
    fahrer_name: e.fahrer_name,
    beleg_url: e.beleg_url
  }))

  // Invoice erstellen
  const { data: invoice, error: insertError } = await supabase
    .from('weekly_invoices')
    .insert({
      client,
      invoice_type: 'expenses',
      year,
      week_number: week,
      week_start: start,
      week_end: end,
      items_count: expenses.length,
      items_amount: totalAmount,
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
  const { error: updateError } = await supabase
    .from('auslagennachweise')
    .update({
      weekly_invoice_id: invoice.id,
      customer_billing_status: 'in_abrechnung'
    })
    .in('id', itemIds)

  if (updateError) {
    console.error('Fehler beim Aktualisieren der Auslagen:', updateError)
    // Rollback: Invoice löschen
    await supabase.from('weekly_invoices').delete().eq('id', invoice.id)
    return { success: false, error: 'Fehler beim Verknüpfen der Auslagen' }
  }

  // Audit-Log: Auslagen-Abrechnung erstellt
  await logAuditEvent({
    action: 'invoice_created',
    entityType: 'weekly_invoice',
    entityId: invoice.id,
    entityLabel: `KW ${week}/${year} Auslagen`,
    severity: 'info',
    isFinancial: true,
    afterData: {
      id: invoice.id,
      invoice_type: 'expenses',
      year,
      week_number: week,
      items_count: expenses.length,
      status: 'draft'
      // Keine items_amount im Log (sensibel)
    },
    metadata: {
      client,
      week_start: start,
      week_end: end
    }
  })

  return { success: true, invoice: invoice as WeeklyInvoice }
}

// =====================================================
// LOCKING
// =====================================================

/**
 * Sperrt eine Wochenabrechnung und alle verknüpften Datensätze
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
    entityLabel: `KW ${invoice.week_number}/${invoice.year} ${invoice.invoice_type === 'tours' ? 'Touren' : 'Auslagen'}`,
    severity: 'critical', // Kritisch, da gesperrte Daten nicht mehr änderbar
    isFinancial: true,
    beforeData: { status: invoice.status, locked_at: null },
    afterData: { status: 'locked', locked_at: now },
    metadata: {
      invoice_type: invoice.invoice_type,
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
    .select('invoice_type')
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
