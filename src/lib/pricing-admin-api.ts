/**
 * Pricing Admin API - nur Admin/GF
 * Verwendet bestehende pricing_tables Tabelle
 */

import { supabase } from "./supabase"
import { logAuditEvent } from "./audit-api"

export type PricingType = 'customer' | 'driver'

// DB-Struktur: { amount: number, max_km: number }
export interface KmRange {
  amount: number
  max_km: number
}

export interface PricingTable {
  id: string
  name: string
  type: PricingType
  client: string
  customer_id: string | null
  employment_type: string | null
  km_ranges: KmRange[]
  waiting_unit_rate: number
  valid_from: string
  valid_until: string | null
  created_at: string
  created_by: string | null
  updated_at: string
  customer_name?: string
}

/**
 * Laedt alle Preislisten (Admin only)
 */
export async function getAllPricingTables(): Promise<PricingTable[]> {
  const selectQuery = `
    *,
    customer:customer_id (
      id,
      name
    )
  `
  const { data, error } = await supabase
    .from('pricing_tables')
    .select(selectQuery)
    .order('type', { ascending: true })
    .order('valid_from', { ascending: false })

  if (error) {
    console.error('Fehler beim Laden der Preislisten:', error.message)
    throw new Error('Preislisten konnten nicht geladen werden: ' + error.message)
  }

  return (data || []).map(p => ({
    ...p,
    customer_name: p.customer?.name || null
  }))
}

/**
 * Laedt aktive Preislisten
 */
export async function getActivePricingTables(): Promise<PricingTable[]> {
  const today = new Date().toISOString().split('T')[0]
  const selectQuery = `
    *,
    customer:customer_id (
      id,
      name
    )
  `
  const { data, error } = await supabase
    .from('pricing_tables')
    .select(selectQuery)
    .or('valid_until.is.null,valid_until.gte.' + today)
    .order('type', { ascending: true })
    .order('valid_from', { ascending: false })

  if (error) {
    console.error('Fehler beim Laden der aktiven Preislisten:', error)
    throw new Error(error.message)
  }

  return (data || []).map(p => ({
    ...p,
    customer_name: p.customer?.name || null
  }))
}

export function formatPricingType(type: PricingType): string {
  switch (type) {
    case 'customer': return 'Kundenpreis'
    case 'driver': return 'Fahrerlohn'
    default: return type
  }
}

export function getPricingTypeColors(type: PricingType): {
  bg: string
  text: string
  border: string
} {
  switch (type) {
    case 'customer':
      return { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' }
    case 'driver':
      return { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' }
    default:
      return { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' }
  }
}

export function formatEmploymentType(type: string | null): string {
  if (!type) return '-'
  switch (type) {
    case 'minijob': return 'Minijob'
    case 'kurzfristig': return 'Kurzfristig'
    case 'midi': return 'Midijob'
    case 'festanstellung': return 'Festanstellung'
    case 'selbststaendig': return 'Selbststaendig'
    default: return type
  }
}

/**
 * Kompakte Darstellung der km-Staffelung
 * DB-Struktur: { amount: number, max_km: number }
 */
export function formatKmRangesCompact(ranges: KmRange[]): string {
  if (!ranges || !Array.isArray(ranges) || ranges.length === 0) return '-'

  const sorted = [...ranges].sort((a, b) => (a.max_km ?? 0) - (b.max_km ?? 0))

  const parts = sorted.map(r => {
    const km = r.max_km ?? 0
    const amount = r.amount ?? 0
    return 'bis ' + km + 'km: ' + amount.toFixed(2) + ' EUR'
  })

  return parts.join(' | ')
}

export function isPricingActive(validFrom: string, validUntil: string | null): boolean {
  const today = new Date().toISOString().split('T')[0]
  if (validFrom > today) return false
  if (validUntil && validUntil < today) return false
  return true
}

// ============================================================
// VERSIONIERUNG - Neue Version einer Preisliste erstellen
// ============================================================

/**
 * Parameter fuer neue Preislisten-Version
 */
export interface CreatePricingVersionParams {
  sourcePricingTableId: string
  name: string
  validFrom: string // YYYY-MM-DD
  waitingUnitRate: number
  kmRanges: KmRange[]
}

/**
 * Validierungsfehler
 */
export interface ValidationError {
  field: string
  message: string
}

/**
 * Ergebnis der Versionierung
 */
export interface CreatePricingVersionResult {
  success: boolean
  newPricingTableId?: string
  errors?: ValidationError[]
}

/**
 * Validiert die Parameter fuer eine neue Preislisten-Version
 */
export function validatePricingVersionParams(
  params: CreatePricingVersionParams,
  sourcePricing: PricingTable
): ValidationError[] {
  const errors: ValidationError[] = []

  // sourcePricingTableId validieren
  if (!params.sourcePricingTableId) {
    errors.push({ field: 'sourcePricingTableId', message: 'Quell-Preisliste muss angegeben werden' })
  }

  // Name validieren
  if (!params.name || params.name.trim().length === 0) {
    errors.push({ field: 'name', message: 'Name darf nicht leer sein' })
  }

  // valid_from validieren
  if (!params.validFrom) {
    errors.push({ field: 'validFrom', message: 'Gueltig-ab-Datum muss angegeben werden' })
  } else {
    // valid_from muss nach dem valid_from der alten Version liegen
    if (params.validFrom <= sourcePricing.valid_from) {
      errors.push({
        field: 'validFrom',
        message: 'Gueltig-ab muss nach dem Startdatum der alten Version (' + sourcePricing.valid_from + ') liegen'
      })
    }
  }

  // waiting_unit_rate validieren
  if (params.waitingUnitRate === undefined || params.waitingUnitRate === null) {
    errors.push({ field: 'waitingUnitRate', message: 'Wartezeit-Satz muss angegeben werden' })
  } else if (params.waitingUnitRate < 0) {
    errors.push({ field: 'waitingUnitRate', message: 'Wartezeit-Satz darf nicht negativ sein' })
  }

  // km_ranges validieren
  if (!params.kmRanges || !Array.isArray(params.kmRanges) || params.kmRanges.length === 0) {
    errors.push({ field: 'kmRanges', message: 'Mindestens eine km-Staffel muss angegeben werden' })
  } else {
    // Jede Staffel pruefen
    const sortedRanges = [...params.kmRanges].sort((a, b) => (a.max_km ?? 0) - (b.max_km ?? 0))
    let prevMaxKm = -1

    for (let i = 0; i < sortedRanges.length; i++) {
      const range = sortedRanges[i]

      if (range.max_km === undefined || range.max_km === null) {
        errors.push({ field: 'kmRanges', message: 'Staffel ' + (i + 1) + ': max_km fehlt' })
      } else if (range.max_km <= prevMaxKm) {
        errors.push({ field: 'kmRanges', message: 'Staffel ' + (i + 1) + ': max_km muss aufsteigend sein' })
      }

      if (range.amount === undefined || range.amount === null) {
        errors.push({ field: 'kmRanges', message: 'Staffel ' + (i + 1) + ': Betrag fehlt' })
      } else if (range.amount < 0) {
        errors.push({ field: 'kmRanges', message: 'Staffel ' + (i + 1) + ': Betrag darf nicht negativ sein' })
      }

      prevMaxKm = range.max_km ?? 0
    }
  }

  // Typ-spezifische Validierung
  if (sourcePricing.type === 'driver' && !sourcePricing.employment_type) {
    errors.push({ field: 'type', message: 'Fahrer-Preisliste muss employment_type haben' })
  }
  if (sourcePricing.type === 'customer' && sourcePricing.employment_type) {
    errors.push({ field: 'type', message: 'Kunden-Preisliste darf kein employment_type haben' })
  }

  return errors
}

/**
 * Erstellt eine neue Version einer bestehenden Preisliste.
 *
 * WICHTIG:
 * - Die alte aktive Preisliste wird NICHT inhaltlich geaendert
 * - Die alte Preisliste bekommt nur valid_until = newValidFrom - 1 Tag
 * - Eine neue Preisliste wird eingefuegt mit den neuen Werten
 * - Bestehende Touren/calculation_snapshot bleiben unveraendert
 *
 * Nur Admin/GF darf diese Funktion ausfuehren.
 */
export async function createPricingTableVersion(
  params: CreatePricingVersionParams
): Promise<CreatePricingVersionResult> {

  // 1. Quell-Preisliste laden
  const { data: sourceData, error: sourceError } = await supabase
    .from('pricing_tables')
    .select('*')
    .eq('id', params.sourcePricingTableId)
    .single()

  if (sourceError || !sourceData) {
    return {
      success: false,
      errors: [{ field: 'sourcePricingTableId', message: 'Quell-Preisliste nicht gefunden' }]
    }
  }

  const sourcePricing = sourceData as PricingTable

  // 2. Validierung
  const validationErrors = validatePricingVersionParams(params, sourcePricing)
  if (validationErrors.length > 0) {
    return {
      success: false,
      errors: validationErrors
    }
  }

  // 3. valid_until fuer alte Preisliste berechnen (1 Tag vor newValidFrom)
  const newValidFromDate = new Date(params.validFrom)
  const oldValidUntilDate = new Date(newValidFromDate)
  oldValidUntilDate.setDate(oldValidUntilDate.getDate() - 1)
  const oldValidUntil = oldValidUntilDate.toISOString().split('T')[0]

  // 4. Alte Preisliste beenden (nur valid_until setzen, keine inhaltliche Aenderung)
  const { error: updateError } = await supabase
    .from('pricing_tables')
    .update({ valid_until: oldValidUntil })
    .eq('id', params.sourcePricingTableId)

  if (updateError) {
    return {
      success: false,
      errors: [{ field: 'general', message: 'Fehler beim Beenden der alten Version: ' + updateError.message }]
    }
  }

  // 5. Neue Preisliste einfuegen
  const newPricingTable = {
    name: params.name.trim(),
    type: sourcePricing.type,
    client: sourcePricing.client,
    customer_id: sourcePricing.customer_id,
    employment_type: sourcePricing.employment_type,
    km_ranges: params.kmRanges,
    waiting_unit_rate: params.waitingUnitRate,
    valid_from: params.validFrom,
    valid_until: null // Neue Version ist unbegrenzt gueltig
  }

  const { data: insertData, error: insertError } = await supabase
    .from('pricing_tables')
    .insert(newPricingTable)
    .select('id')
    .single()

  if (insertError) {
    // Rollback: alte Preisliste wiederherstellen
    await supabase
      .from('pricing_tables')
      .update({ valid_until: sourcePricing.valid_until })
      .eq('id', params.sourcePricingTableId)

    return {
      success: false,
      errors: [{ field: 'general', message: 'Fehler beim Erstellen der neuen Version: ' + insertError.message }]
    }
  }

  // Audit-Log: Neue Preislisten-Version erstellt
  await logAuditEvent({
    action: 'pricing_version_created',
    entityType: 'pricing_table',
    entityId: insertData?.id,
    entityLabel: params.name.trim(),
    severity: 'info',
    isFinancial: true,
    beforeData: {
      id: sourcePricing.id,
      name: sourcePricing.name,
      type: sourcePricing.type,
      client: sourcePricing.client,
      valid_from: sourcePricing.valid_from,
      valid_until: sourcePricing.valid_until
      // Keine km_ranges/waiting_unit_rate im Log (sensibel)
    },
    afterData: {
      id: insertData?.id,
      name: params.name.trim(),
      type: sourcePricing.type,
      client: sourcePricing.client,
      valid_from: params.validFrom,
      valid_until: null,
      source_pricing_id: params.sourcePricingTableId
    },
    metadata: {
      source_pricing_name: sourcePricing.name,
      old_valid_until: oldValidUntil
    }
  })

  return {
    success: true,
    newPricingTableId: insertData?.id
  }
}
