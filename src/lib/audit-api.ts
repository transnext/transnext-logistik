/**
 * Audit API - Zentrale Funktionen für Audit-Logging
 *
 * Ermöglicht das Protokollieren und Abrufen sensibler Admin-Aktionen.
 *
 * Rollenberechtigung:
 * - Admin/GF: Alle Audit-Logs vollständig sehen
 * - Disponent: Nur nicht-finanzielle Logs, bereinigte Daten
 * - Fahrer: Kein Zugriff
 */

import { supabase } from "./supabase"

// ============================================================
// TYPES
// ============================================================

export type AuditSeverity = 'info' | 'warning' | 'critical'
export type AuditSource = 'admin' | 'dispo' | 'system' | 'driver_portal'

/**
 * Vordefinierte Audit-Aktionen
 */
export type AuditAction =
  // Preislisten
  | 'pricing_version_created'
  | 'pricing_version_updated'
  | 'pricing_version_deactivated'
  // System-Settings
  | 'setting_version_created'
  | 'setting_updated'
  // Kunden
  | 'customer_created'
  | 'customer_updated'
  | 'customer_deactivated'
  | 'customer_reactivated'
  // Fahrer
  | 'fahrer_created'
  | 'fahrer_updated'
  | 'fahrer_activated'
  | 'fahrer_deactivated'
  | 'fahrer_archived'
  | 'fahrer_unarchived'
  // Auslagen
  | 'auslage_reimbursed'
  | 'auslage_deleted'
  // Korrekturen
  | 'correction_request_reviewed'
  | 'correction_request_rejected'
  | 'salary_correction_created'
  | 'salary_correction_approved'
  | 'salary_correction_rejected'
  | 'salary_correction_applied'
  // Alerts
  | 'alert_resolved'
  | 'alert_acknowledged'
  | 'computed_alert_dismissed'
  | 'availability_marked_no_tour'
  // Abrechnung
  | 'invoice_created'
  | 'invoice_pdf_exported'
  | 'invoice_locked'
  // Arbeitsnachweise / Auslagen
  | 'arbeitsnachweis_deleted'
  | 'arbeitsnachweis_status_changed'
  | 'auslage_status_changed'
  // Onboarding
  | 'onboarding_candidate_created'
  | 'onboarding_candidate_updated'
  | 'onboarding_status_changed'
  | 'onboarding_candidate_archived'
  | 'onboarding_document_status_changed'
  | 'onboarding_note_created'
  // Sonstige
  | string // Erlaubt auch benutzerdefinierte Aktionen

/**
 * Entitätstypen für Audit-Logs
 */
export type AuditEntityType =
  | 'pricing_table'
  | 'system_setting'
  | 'customer'
  | 'fahrer'
  | 'arbeitsnachweis'
  | 'auslagennachweis'
  | 'correction_request'
  | 'salary_correction'
  | 'alert'
  | 'computed_alert'
  | 'availability'
  | 'invoice'
  | 'weekly_invoice'
  | 'onboarding_candidate'
  | 'onboarding_document'
  | 'onboarding_note'
  | string // Erlaubt auch benutzerdefinierte Typen

/**
 * Parameter für logAuditEvent
 */
export interface LogAuditEventParams {
  action: AuditAction
  entityType: AuditEntityType
  entityId?: string | number | null
  entityLabel?: string | null
  source?: AuditSource
  severity?: AuditSeverity
  beforeData?: Record<string, unknown> | null
  afterData?: Record<string, unknown> | null
  metadata?: Record<string, unknown> | null
  isFinancial?: boolean
}

/**
 * Audit-Log-Eintrag (aus der Datenbank)
 */
export interface AuditLogEntry {
  id: string
  created_at: string
  actor_user_id: string | null
  actor_name: string | null
  actor_role: string | null
  action: string
  entity_type: string
  entity_id: string | null
  entity_label: string | null
  source: string
  severity: string
  before_data: Record<string, unknown> | null
  after_data: Record<string, unknown> | null
  metadata: Record<string, unknown> | null
  is_financial: boolean
  ip_address: string | null
  user_agent: string | null
}

/**
 * Filter für getAuditLogs
 */
export interface AuditLogFilters {
  startDate?: string        // YYYY-MM-DD
  endDate?: string          // YYYY-MM-DD
  action?: string
  entityType?: string
  entityId?: string
  actorUserId?: string
  severity?: AuditSeverity
  source?: AuditSource
  limit?: number            // Default: 100
  offset?: number           // Default: 0
}

// ============================================================
// SENSITIVE FIELDS (für Dispo-Filterung)
// ============================================================

/**
 * Finanzielle Felder, die für Dispo aus before_data/after_data entfernt werden
 */
const FINANCIAL_FIELDS = [
  'kosten', 'amount', 'customer_amount', 'driver_amount', 'driver_amount_final',
  'estimated_employer_costs', 'ertrag', 'marge', 'margenquote', 'umsatz',
  'fahrerlohn', 'arbeitgeberkosten', 'original_amount', 'corrected_amount',
  'items_amount', 'km_ranges', 'waiting_unit_rate', 'summe', 'betrag',
  'billing_cycle', 'requires_invoice_number'
]

/**
 * Finanzielle Aktionen, die für Dispo nicht sichtbar sind
 */
const FINANCIAL_ACTIONS = [
  'pricing_version_created', 'pricing_version_updated', 'pricing_version_deactivated',
  'setting_version_created', 'setting_updated',
  'salary_correction_created', 'salary_correction_approved', 'salary_correction_rejected', 'salary_correction_applied',
  'invoice_created', 'invoice_pdf_exported', 'invoice_locked',
  'auslage_reimbursed'
]

/**
 * Finanzielle Entitätstypen
 */
const FINANCIAL_ENTITY_TYPES = [
  'pricing_table', 'system_setting', 'salary_correction', 'invoice', 'weekly_invoice'
]

// ============================================================
// HELPER FUNCTIONS
// ============================================================

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
 * Ermittelt aktuelle Rolle
 */
async function getCurrentUserRole(): Promise<'admin' | 'gf' | 'disponent' | 'fahrer' | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  return profile?.role as 'admin' | 'gf' | 'disponent' | 'fahrer' | null
}

/**
 * Bestimmt ob eine Aktion als finanziell gilt
 */
function isFinancialAction(action: string, entityType: string): boolean {
  if (FINANCIAL_ACTIONS.includes(action)) return true
  if (FINANCIAL_ENTITY_TYPES.includes(entityType)) return true
  return false
}

/**
 * Entfernt finanzielle Felder aus einem Objekt
 */
function removeFinancialFields(data: Record<string, unknown> | null): Record<string, unknown> | null {
  if (!data) return null

  const sanitized: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(data)) {
    if (!FINANCIAL_FIELDS.includes(key.toLowerCase())) {
      sanitized[key] = value
    }
  }
  return sanitized
}

// ============================================================
// MAIN API FUNCTIONS
// ============================================================

/**
 * Protokolliert ein Audit-Event
 *
 * @param params - Die Event-Parameter
 * @returns ID des erstellten Audit-Logs oder null bei Fehler
 *
 * WICHTIG: Fehler beim Audit-Logging sollten die Hauptaktion NICHT blockieren.
 * Bei Fehlern wird in die Konsole geloggt, aber kein Fehler geworfen.
 */
export async function logAuditEvent(params: LogAuditEventParams): Promise<string | null> {
  try {
    // Bestimme ob Aktion finanziell ist (wenn nicht explizit gesetzt)
    const isFinancial = params.isFinancial ??
      isFinancialAction(params.action, params.entityType)

    // Bestimme Quelle basierend auf Rolle (wenn nicht explizit gesetzt)
    let source = params.source
    if (!source) {
      const role = await getCurrentUserRole()
      if (role === 'admin' || role === 'gf') {
        source = 'admin'
      } else if (role === 'disponent') {
        source = 'dispo'
      } else {
        source = 'system'
      }
    }

    // entity_id als String konvertieren
    const entityId = params.entityId != null ? String(params.entityId) : null

    // RPC-Funktion aufrufen
    const { data, error } = await supabase.rpc('create_admin_audit_log', {
      p_action: params.action,
      p_entity_type: params.entityType,
      p_entity_id: entityId,
      p_entity_label: params.entityLabel || null,
      p_source: source,
      p_severity: params.severity || 'info',
      p_before_data: params.beforeData || null,
      p_after_data: params.afterData || null,
      p_metadata: params.metadata || null,
      p_is_financial: isFinancial
    })

    if (error) {
      console.error('[Audit] Fehler beim Erstellen des Audit-Logs:', error.message)
      // NICHT werfen - Audit-Fehler sollen Hauptaktion nicht blockieren
      return null
    }

    return data as string
  } catch (err) {
    console.error('[Audit] Unerwarteter Fehler:', err)
    // NICHT werfen - Audit-Fehler sollen Hauptaktion nicht blockieren
    return null
  }
}

/**
 * Lädt Audit-Logs mit optionalen Filtern
 *
 * Admin/GF: Alle Logs vollständig
 * Disponent: Nur nicht-finanzielle Logs mit bereinigten Daten
 */
export async function getAuditLogs(filters?: AuditLogFilters): Promise<AuditLogEntry[]> {
  try {
    const isAdmin = await isAdminOrGF()
    const role = await getCurrentUserRole()

    // Fahrer haben keinen Zugriff
    if (role === 'fahrer') {
      console.warn('[Audit] Fahrer hat keinen Zugriff auf Audit-Logs')
      return []
    }

    // Query aufbauen
    let query = supabase
      .from('admin_audit_logs')
      .select('*')
      .order('created_at', { ascending: false })

    // Filter anwenden
    if (filters?.startDate) {
      query = query.gte('created_at', `${filters.startDate}T00:00:00`)
    }
    if (filters?.endDate) {
      query = query.lte('created_at', `${filters.endDate}T23:59:59`)
    }
    if (filters?.action) {
      query = query.eq('action', filters.action)
    }
    if (filters?.entityType) {
      query = query.eq('entity_type', filters.entityType)
    }
    if (filters?.entityId) {
      query = query.eq('entity_id', filters.entityId)
    }
    if (filters?.actorUserId) {
      query = query.eq('actor_user_id', filters.actorUserId)
    }
    if (filters?.severity) {
      query = query.eq('severity', filters.severity)
    }
    if (filters?.source) {
      query = query.eq('source', filters.source)
    }

    // Limit und Offset
    const limit = filters?.limit ?? 100
    const offset = filters?.offset ?? 0
    query = query.range(offset, offset + limit - 1)

    const { data, error } = await query

    if (error) {
      console.error('[Audit] Fehler beim Laden der Audit-Logs:', error.message)
      // Bei RLS-Fehler (z.B. Fahrer) leeres Array zurückgeben
      return []
    }

    const logs = (data || []) as AuditLogEntry[]

    // Für Dispo: Finanzielle Daten bereinigen
    if (!isAdmin && role === 'disponent') {
      return logs
        .filter(log => !log.is_financial) // Finanzielle Logs ausschließen
        .map(log => sanitizeAuditLogForRole(log, 'disponent'))
    }

    return logs
  } catch (err) {
    console.error('[Audit] Unerwarteter Fehler beim Laden:', err)
    return []
  }
}

/**
 * Lädt Audit-Logs für eine bestimmte Entität
 */
export async function getAuditLogsForEntity(
  entityType: string,
  entityId: string | number
): Promise<AuditLogEntry[]> {
  return getAuditLogs({
    entityType,
    entityId: String(entityId)
  })
}

/**
 * Lädt Audit-Logs für einen bestimmten Akteur
 */
export async function getAuditLogsForActor(actorUserId: string): Promise<AuditLogEntry[]> {
  return getAuditLogs({
    actorUserId
  })
}

/**
 * Bereinigt ein Audit-Log für eine bestimmte Rolle
 *
 * Entfernt finanzielle Details aus before_data/after_data/metadata für Dispo
 */
export function sanitizeAuditLogForRole(
  log: AuditLogEntry,
  role: 'admin' | 'gf' | 'disponent' | 'fahrer'
): AuditLogEntry {
  // Admin/GF sieht alles
  if (role === 'admin' || role === 'gf') {
    return log
  }

  // Fahrer sieht gar nichts (sollte nicht aufgerufen werden)
  if (role === 'fahrer') {
    return {
      ...log,
      before_data: null,
      after_data: null,
      metadata: null
    }
  }

  // Disponent: Finanzielle Felder entfernen
  return {
    ...log,
    before_data: removeFinancialFields(log.before_data),
    after_data: removeFinancialFields(log.after_data),
    metadata: removeFinancialFields(log.metadata)
  }
}

/**
 * Zählt Audit-Logs nach Kriterien
 */
export async function countAuditLogs(filters?: Omit<AuditLogFilters, 'limit' | 'offset'>): Promise<number> {
  try {
    const isAdmin = await isAdminOrGF()
    const role = await getCurrentUserRole()

    if (role === 'fahrer') return 0

    let query = supabase
      .from('admin_audit_logs')
      .select('id', { count: 'exact', head: true })

    // Filter anwenden (wie bei getAuditLogs)
    if (filters?.startDate) {
      query = query.gte('created_at', `${filters.startDate}T00:00:00`)
    }
    if (filters?.endDate) {
      query = query.lte('created_at', `${filters.endDate}T23:59:59`)
    }
    if (filters?.action) {
      query = query.eq('action', filters.action)
    }
    if (filters?.entityType) {
      query = query.eq('entity_type', filters.entityType)
    }
    if (filters?.entityId) {
      query = query.eq('entity_id', filters.entityId)
    }
    if (filters?.actorUserId) {
      query = query.eq('actor_user_id', filters.actorUserId)
    }
    if (filters?.severity) {
      query = query.eq('severity', filters.severity)
    }
    if (filters?.source) {
      query = query.eq('source', filters.source)
    }

    // Für Dispo: Nur nicht-finanzielle Logs
    if (!isAdmin && role === 'disponent') {
      query = query.eq('is_financial', false)
    }

    const { count, error } = await query

    if (error) {
      console.error('[Audit] Fehler beim Zählen:', error.message)
      return 0
    }

    return count ?? 0
  } catch (err) {
    console.error('[Audit] Unerwarteter Fehler beim Zählen:', err)
    return 0
  }
}

/**
 * Formatiert eine Aktion für die Anzeige
 */
export function formatAuditAction(action: string): string {
  const actionLabels: Record<string, string> = {
    // Preislisten
    pricing_version_created: 'Preisliste erstellt',
    pricing_version_updated: 'Preisliste aktualisiert',
    pricing_version_deactivated: 'Preisliste deaktiviert',
    // System-Settings
    setting_version_created: 'Einstellung erstellt',
    setting_updated: 'Einstellung geändert',
    // Kunden
    customer_created: 'Kunde erstellt',
    customer_updated: 'Kunde bearbeitet',
    customer_deactivated: 'Kunde deaktiviert',
    customer_reactivated: 'Kunde reaktiviert',
    // Fahrer
    fahrer_created: 'Fahrer erstellt',
    fahrer_updated: 'Fahrer bearbeitet',
    fahrer_activated: 'Fahrer aktiviert',
    fahrer_deactivated: 'Fahrer deaktiviert',
    fahrer_archived: 'Fahrer archiviert',
    fahrer_unarchived: 'Fahrer-Archivierung aufgehoben',
    // Auslagen
    auslage_reimbursed: 'Auslage als überwiesen markiert',
    auslage_deleted: 'Auslage gelöscht',
    // Korrekturen
    correction_request_reviewed: 'Korrekturanfrage geprüft',
    correction_request_rejected: 'Korrekturanfrage abgelehnt',
    salary_correction_created: 'Lohnkorrektur erstellt',
    salary_correction_approved: 'Lohnkorrektur genehmigt',
    salary_correction_rejected: 'Lohnkorrektur abgelehnt',
    salary_correction_applied: 'Lohnkorrektur angewendet',
    // Alerts
    alert_resolved: 'Alert gelöst',
    alert_acknowledged: 'Alert bestätigt',
    computed_alert_dismissed: 'Berechneter Alert ausgeblendet',
    availability_marked_no_tour: 'Verfügbarkeit ohne Tour markiert',
    // Abrechnung
    invoice_created: 'Rechnung erstellt',
    invoice_pdf_exported: 'PDF exportiert',
    invoice_locked: 'Rechnung gesperrt',
    // Arbeitsnachweise / Auslagen
    arbeitsnachweis_deleted: 'Arbeitsnachweis gelöscht',
    arbeitsnachweis_status_changed: 'Arbeitsnachweis-Status geändert',
    auslage_status_changed: 'Auslagen-Status geändert',
    // Onboarding
    onboarding_candidate_created: 'Onboarding-Kandidat erstellt',
    onboarding_candidate_updated: 'Onboarding-Kandidat bearbeitet',
    onboarding_status_changed: 'Onboarding-Status geändert',
    onboarding_candidate_archived: 'Onboarding-Kandidat archiviert',
    onboarding_document_status_changed: 'Onboarding-Dokument-Status geändert',
    onboarding_note_created: 'Onboarding-Notiz erstellt'
  }

  return actionLabels[action] || action
}

/**
 * Formatiert einen Entitätstyp für die Anzeige
 */
export function formatAuditEntityType(entityType: string): string {
  const typeLabels: Record<string, string> = {
    pricing_table: 'Preisliste',
    system_setting: 'System-Einstellung',
    customer: 'Kunde',
    fahrer: 'Fahrer',
    arbeitsnachweis: 'Arbeitsnachweis',
    auslagennachweis: 'Auslagennachweis',
    correction_request: 'Korrekturanfrage',
    salary_correction: 'Lohnkorrektur',
    alert: 'Alert',
    computed_alert: 'Berechneter Alert',
    availability: 'Verfügbarkeit',
    invoice: 'Rechnung',
    weekly_invoice: 'Wochenabrechnung',
    onboarding_candidate: 'Onboarding-Kandidat',
    onboarding_document: 'Onboarding-Dokument',
    onboarding_note: 'Onboarding-Notiz'
  }

  return typeLabels[entityType] || entityType
}

/**
 * Formatiert eine Severity für die Anzeige
 */
export function formatAuditSeverity(severity: string): { label: string; className: string } {
  const severityConfig: Record<string, { label: string; className: string }> = {
    info: { label: 'Info', className: 'bg-blue-50 text-blue-700 border-blue-200' },
    warning: { label: 'Warnung', className: 'bg-amber-50 text-amber-700 border-amber-200' },
    critical: { label: 'Kritisch', className: 'bg-red-50 text-red-700 border-red-200' }
  }

  return severityConfig[severity] || { label: severity, className: 'bg-gray-50 text-gray-700 border-gray-200' }
}

/**
 * Formatiert eine Source für die Anzeige
 */
export function formatAuditSource(source: string): string {
  const sourceLabels: Record<string, string> = {
    admin: 'Admin',
    dispo: 'Disponent',
    system: 'System',
    driver_portal: 'Fahrerportal'
  }

  return sourceLabels[source] || source
}
