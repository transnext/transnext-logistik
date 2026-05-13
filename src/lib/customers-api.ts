/**
 * Customers API - nur Admin/GF
 * Verwendet bestehende customers Tabelle
 * Nach GRANT-Migration kann Admin/GF jetzt direkt auf Basistabelle zugreifen
 */

import { supabase } from "./supabase"
import { logAuditEvent } from "./audit-api"

export type CustomerType = 'platform' | 'direct_customer'
export type BillingCycle = 'weekly' | 'monthly'

export interface Customer {
  id: string
  code: string
  name: string
  type: CustomerType
  billing_cycle: BillingCycle
  contact_name: string | null
  contact_email: string | null
  contact_phone: string | null
  requires_invoice_number: boolean
  active: boolean
  created_at: string
  created_by: string | null
  updated_at: string
}

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
 * Lädt alle Kunden
 * Admin/GF: Basistabelle mit allen Feldern
 * Disponent: View mit eingeschränkten Feldern
 */
export async function getAllCustomers(): Promise<Customer[]> {
  const isAdmin = await isAdminOrGF()

  if (isAdmin) {
    // Admin/GF: Basistabelle mit allen Feldern
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .order('name', { ascending: true })

    if (error) {
      console.error('Fehler beim Laden der Kunden (Admin):', error)
      throw new Error(error.message)
    }

    return data || []
  } else {
    // Disponent: View mit eingeschränkten Feldern
    const { data, error } = await supabase
      .from('customers_disponent')
      .select('*')
      .order('name', { ascending: true })

    if (error) {
      console.error('Fehler beim Laden der Kunden (Disponent):', error)
      throw new Error(error.message)
    }

    // View hat nicht alle Felder - ergänze mit Defaults
    return (data || []).map(c => ({
      ...c,
      billing_cycle: 'weekly' as BillingCycle,
      contact_name: null,
      contact_email: null,
      contact_phone: null,
      requires_invoice_number: false,
      created_at: '',
      created_by: null,
      updated_at: ''
    }))
  }
}

/**
 * Lädt nur aktive Kunden
 */
export async function getActiveCustomers(): Promise<Customer[]> {
  const isAdmin = await isAdminOrGF()

  if (isAdmin) {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('active', true)
      .order('name', { ascending: true })

    if (error) {
      console.error('Fehler beim Laden der aktiven Kunden (Admin):', error)
      throw new Error(error.message)
    }

    return data || []
  } else {
    const { data, error } = await supabase
      .from('customers_disponent')
      .select('*')
      .eq('active', true)
      .order('name', { ascending: true })

    if (error) {
      console.error('Fehler beim Laden der aktiven Kunden (Disponent):', error)
      throw new Error(error.message)
    }

    return (data || []).map(c => ({
      ...c,
      billing_cycle: 'weekly' as BillingCycle,
      contact_name: null,
      contact_email: null,
      contact_phone: null,
      requires_invoice_number: false,
      created_at: '',
      created_by: null,
      updated_at: ''
    }))
  }
}

/**
 * Formatierung für Kundentyp
 */
export function formatCustomerType(type: CustomerType): string {
  switch (type) {
    case 'platform': return 'Plattform'
    case 'direct_customer': return 'Direktkunde'
    default: return type
  }
}

/**
 * Farben für Kundentyp
 */
export function getCustomerTypeColors(type: CustomerType): {
  bg: string
  text: string
  border: string
} {
  switch (type) {
    case 'platform':
      return { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' }
    case 'direct_customer':
      return { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' }
    default:
      return { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' }
  }
}

/**
 * Formatierung für Abrechnungszyklus
 */
export function formatBillingCycle(cycle: BillingCycle): string {
  switch (cycle) {
    case 'weekly': return 'Wöchentlich'
    case 'monthly': return 'Monatlich'
    default: return cycle
  }
}

// ============================================================
// KUNDEN-CRUD API-FUNKTIONEN (Admin/GF only)
// ============================================================

export interface CustomerValidationError {
  field: string
  message: string
}

export interface CustomerResult {
  success: boolean
  errors?: CustomerValidationError[]
  data?: { customerId: string }
}

export interface CreateCustomerParams {
  code: string
  name: string
  type: CustomerType
  billing_cycle: BillingCycle
  contact_name?: string
  contact_email?: string
  contact_phone?: string
  requires_invoice_number?: boolean
  active?: boolean
}

export interface UpdateCustomerParams {
  name?: string
  type?: CustomerType
  billing_cycle?: BillingCycle
  contact_name?: string | null
  contact_email?: string | null
  contact_phone?: string | null
  requires_invoice_number?: boolean
  active?: boolean
}

/**
 * Code normalisieren: lowercase, Leerzeichen zu Unterstrich, nur alphanumerisch und Unterstrich
 */
function normalizeCode(code: string): string {
  return code
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
}

/**
 * Einfache E-Mail-Validierung
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * 1. Kunde anlegen
 * Admin/GF only
 */
export async function createCustomer(params: CreateCustomerParams): Promise<CustomerResult> {
  if (!(await isAdminOrGF())) {
    return { success: false, errors: [{ field: 'auth', message: 'Keine Berechtigung' }] }
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, errors: [{ field: 'auth', message: 'Nicht angemeldet' }] }
  }

  const errors: CustomerValidationError[] = []

  // Validierung
  const normalizedCode = normalizeCode(params.code || '')
  if (!normalizedCode || normalizedCode.length < 2) {
    errors.push({ field: 'code', message: 'Code ist erforderlich (min. 2 Zeichen)' })
  }
  if (!params.name || params.name.trim().length < 2) {
    errors.push({ field: 'name', message: 'Name ist erforderlich (min. 2 Zeichen)' })
  }
  if (!params.type || !['platform', 'direct_customer'].includes(params.type)) {
    errors.push({ field: 'type', message: 'Typ muss "platform" oder "direct_customer" sein' })
  }
  if (!params.billing_cycle || !['weekly', 'monthly'].includes(params.billing_cycle)) {
    errors.push({ field: 'billing_cycle', message: 'Abrechnungszyklus muss "weekly" oder "monthly" sein' })
  }
  if (params.contact_email && !isValidEmail(params.contact_email)) {
    errors.push({ field: 'contact_email', message: 'Ungültige E-Mail-Adresse' })
  }

  if (errors.length > 0) {
    return { success: false, errors }
  }

  // Duplikat-Prüfung
  const { data: existing } = await supabase
    .from('customers')
    .select('id')
    .eq('code', normalizedCode)
    .single()

  if (existing) {
    return { success: false, errors: [{ field: 'code', message: 'Dieser Code existiert bereits' }] }
  }

  // Kunde erstellen
  const { data: newCustomer, error: insertError } = await supabase
    .from('customers')
    .insert({
      code: normalizedCode,
      name: params.name.trim(),
      type: params.type,
      billing_cycle: params.billing_cycle,
      contact_name: params.contact_name?.trim() || null,
      contact_email: params.contact_email?.trim() || null,
      contact_phone: params.contact_phone?.trim() || null,
      requires_invoice_number: params.requires_invoice_number ?? false,
      active: params.active ?? true,
      created_by: user.id
    })
    .select('id')
    .single()

  if (insertError || !newCustomer) {
    return { success: false, errors: [{ field: 'general', message: insertError?.message || 'Kunde konnte nicht erstellt werden' }] }
  }

  // Audit-Log: Kunde erstellt
  await logAuditEvent({
    action: 'customer_created',
    entityType: 'customer',
    entityId: newCustomer.id,
    entityLabel: params.name.trim(),
    severity: 'info',
    isFinancial: false, // Kundenstammdaten sind nicht finanziell
    afterData: {
      id: newCustomer.id,
      code: normalizedCode,
      name: params.name.trim(),
      type: params.type,
      active: params.active ?? true
      // Keine billing_cycle/contact-Details im Log (nicht relevant)
    }
  })

  return { success: true, data: { customerId: newCustomer.id } }
}

/**
 * 2. Kunde aktualisieren
 * Admin/GF only - Code wird NICHT geändert
 */
export async function updateCustomer(id: string, params: UpdateCustomerParams): Promise<CustomerResult> {
  if (!(await isAdminOrGF())) {
    return { success: false, errors: [{ field: 'auth', message: 'Keine Berechtigung' }] }
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, errors: [{ field: 'auth', message: 'Nicht angemeldet' }] }
  }

  const errors: CustomerValidationError[] = []

  // Validierung
  if (params.name !== undefined && params.name.trim().length < 2) {
    errors.push({ field: 'name', message: 'Name muss mindestens 2 Zeichen haben' })
  }
  if (params.type !== undefined && !['platform', 'direct_customer'].includes(params.type)) {
    errors.push({ field: 'type', message: 'Ungültiger Typ' })
  }
  if (params.billing_cycle !== undefined && !['weekly', 'monthly'].includes(params.billing_cycle)) {
    errors.push({ field: 'billing_cycle', message: 'Ungültiger Abrechnungszyklus' })
  }
  if (params.contact_email && !isValidEmail(params.contact_email)) {
    errors.push({ field: 'contact_email', message: 'Ungültige E-Mail-Adresse' })
  }

  if (errors.length > 0) {
    return { success: false, errors }
  }

  // Kunde prüfen
  const { data: existing, error: fetchError } = await supabase
    .from('customers')
    .select('id')
    .eq('id', id)
    .single()

  if (fetchError || !existing) {
    return { success: false, errors: [{ field: 'id', message: 'Kunde nicht gefunden' }] }
  }

  // Update-Objekt bauen
  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString()
  }

  if (params.name !== undefined) updateData.name = params.name.trim()
  if (params.type !== undefined) updateData.type = params.type
  if (params.billing_cycle !== undefined) updateData.billing_cycle = params.billing_cycle
  if (params.contact_name !== undefined) updateData.contact_name = params.contact_name?.trim() || null
  if (params.contact_email !== undefined) updateData.contact_email = params.contact_email?.trim() || null
  if (params.contact_phone !== undefined) updateData.contact_phone = params.contact_phone?.trim() || null
  if (params.requires_invoice_number !== undefined) updateData.requires_invoice_number = params.requires_invoice_number
  if (params.active !== undefined) updateData.active = params.active

  // Kunde vor Update laden für Audit
  const { data: beforeCustomer } = await supabase
    .from('customers')
    .select('id, code, name, type, active')
    .eq('id', id)
    .single()

  // Update ausführen
  const { error: updateError } = await supabase
    .from('customers')
    .update(updateData)
    .eq('id', id)

  if (updateError) {
    return { success: false, errors: [{ field: 'general', message: updateError.message }] }
  }

  // Audit-Log: Kunde aktualisiert
  await logAuditEvent({
    action: 'customer_updated',
    entityType: 'customer',
    entityId: id,
    entityLabel: params.name?.trim() || beforeCustomer?.name || 'Unbekannt',
    severity: 'info',
    isFinancial: false,
    beforeData: beforeCustomer ? {
      id: beforeCustomer.id,
      code: beforeCustomer.code,
      name: beforeCustomer.name,
      type: beforeCustomer.type,
      active: beforeCustomer.active
    } : null,
    afterData: {
      id,
      name: params.name?.trim(),
      type: params.type,
      active: params.active
    },
    metadata: {
      changed_fields: Object.keys(params).filter(k => params[k as keyof UpdateCustomerParams] !== undefined)
    }
  })

  return { success: true }
}

/**
 * 3. Kunde aktivieren/deaktivieren
 * Admin/GF only - Soft-Deaktivierung statt Löschen
 */
export async function setCustomerActive(id: string, active: boolean): Promise<CustomerResult> {
  if (!(await isAdminOrGF())) {
    return { success: false, errors: [{ field: 'auth', message: 'Keine Berechtigung' }] }
  }

  // Kunde prüfen
  const { data: existing, error: fetchError } = await supabase
    .from('customers')
    .select('id, code')
    .eq('id', id)
    .single()

  if (fetchError || !existing) {
    return { success: false, errors: [{ field: 'id', message: 'Kunde nicht gefunden' }] }
  }

  // Kunde vor Update laden für Audit
  const { data: beforeCustomer } = await supabase
    .from('customers')
    .select('id, code, name, type, active')
    .eq('id', id)
    .single()

  // Update
  const { error: updateError } = await supabase
    .from('customers')
    .update({
      active,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)

  if (updateError) {
    return { success: false, errors: [{ field: 'general', message: updateError.message }] }
  }

  // Audit-Log: Kunde aktiviert/deaktiviert
  await logAuditEvent({
    action: active ? 'customer_reactivated' : 'customer_deactivated',
    entityType: 'customer',
    entityId: id,
    entityLabel: beforeCustomer?.name || 'Unbekannt',
    severity: active ? 'info' : 'warning',
    isFinancial: false,
    beforeData: {
      id,
      code: beforeCustomer?.code,
      name: beforeCustomer?.name,
      active: beforeCustomer?.active
    },
    afterData: {
      id,
      code: beforeCustomer?.code,
      name: beforeCustomer?.name,
      active
    }
  })

  return { success: true }
}
