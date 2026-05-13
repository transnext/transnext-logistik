/**
 * Alerts API - verwendet bestehende DB-Strukturen
 * - Admin/GF: Zugriff auf public.alerts (inkl. details JSONB)
 * - Disponent: Zugriff über alerts_disponent View (ohne details)
 * Nach GRANT-Migration kann Admin/GF jetzt direkt auf Basistabelle zugreifen
 */

import { supabase } from "./supabase"
import { logAuditEvent } from "./audit-api"

export type AlertSeverity = 'info' | 'warning' | 'critical'
export type AlertStatus = 'open' | 'acknowledged' | 'resolved'

export interface Alert {
  id: string
  type: string
  severity: AlertSeverity
  entity_type: string
  entity_id: string | null
  message: string
  details?: Record<string, unknown> | null // Nur für Admin/GF
  assigned_to: string | null
  status: AlertStatus
  resolved_at: string | null
  resolved_by?: string | null
  resolution_note: string | null
  created_at: string
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
 * Lädt alle Alerts - Admin/GF bekommen alle Details, Disponent nur View
 */
export async function getAlerts(isAdmin: boolean): Promise<Alert[]> {
  // Prüfe tatsächliche Rolle statt Parameter (Sicherheit)
  const isActuallyAdmin = await isAdminOrGF()

  if (isActuallyAdmin) {
    // Admin/GF: Basistabelle mit details JSONB
    const { data, error } = await supabase
      .from('alerts')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Fehler beim Laden der Alerts (Admin):', error)
      throw new Error(error.message)
    }

    return data || []
  } else {
    // Disponent: View ohne details JSONB
    const { data, error } = await supabase
      .from('alerts_disponent')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Fehler beim Laden der Alerts (Disponent):', error)
      throw new Error(error.message)
    }

    return (data || []).map(a => ({ ...a, details: null }))
  }
}

/**
 * Lädt nur offene Alerts
 */
export async function getOpenAlerts(isAdmin: boolean): Promise<Alert[]> {
  const alerts = await getAlerts(isAdmin)
  return alerts.filter(a => a.status === 'open')
}

/**
 * Alert bestätigen (acknowledge) - nutzt vorhandene RPC
 */
export async function acknowledgeAlert(alertId: string, note?: string): Promise<void> {
  const { error } = await supabase.rpc('acknowledge_alert', {
    p_alert_id: alertId,
    p_resolution_note: note || null
  })

  if (error) {
    console.error('Fehler beim Bestätigen des Alerts:', error)
    throw new Error(error.message)
  }
}

/**
 * Alert als gelöst markieren (nur Admin)
 * Hinweis: Falls keine RPC vorhanden, direkt über Tabelle
 */
export async function resolveAlert(alertId: string, note?: string): Promise<void> {
  // Alert vor Update laden für Audit
  const { data: beforeAlert } = await supabase
    .from('alerts')
    .select('id, type, severity, status, message')
    .eq('id', alertId)
    .single()

  const { error } = await supabase
    .from('alerts')
    .update({
      status: 'resolved',
      resolution_note: note || null,
      resolved_at: new Date().toISOString()
    })
    .eq('id', alertId)

  if (error) {
    console.error('Fehler beim Lösen des Alerts:', error)
    throw new Error(error.message)
  }

  // Audit-Log: Alert gelöst
  await logAuditEvent({
    action: 'alert_resolved',
    entityType: 'alert',
    entityId: alertId,
    entityLabel: beforeAlert?.message?.substring(0, 50) || 'Alert',
    severity: 'info',
    isFinancial: false,
    beforeData: beforeAlert ? {
      type: beforeAlert.type,
      severity: beforeAlert.severity,
      status: beforeAlert.status
    } : null,
    afterData: { status: 'resolved' },
    metadata: { resolution_note: note || null }
  })
}

/**
 * Zählt offene Alerts nach Severity
 */
export async function countAlertsBySeverity(isAdmin: boolean): Promise<{
  info: number
  warning: number
  critical: number
  total: number
}> {
  const alerts = await getOpenAlerts(isAdmin)

  return {
    info: alerts.filter(a => a.severity === 'info').length,
    warning: alerts.filter(a => a.severity === 'warning').length,
    critical: alerts.filter(a => a.severity === 'critical').length,
    total: alerts.length
  }
}

/**
 * Formatierung für Severity
 */
export function formatSeverity(severity: AlertSeverity): string {
  switch (severity) {
    case 'info': return 'Info'
    case 'warning': return 'Warnung'
    case 'critical': return 'Kritisch'
    default: return severity
  }
}

/**
 * Formatierung für Status
 */
export function formatAlertStatus(status: AlertStatus): string {
  switch (status) {
    case 'open': return 'Offen'
    case 'acknowledged': return 'Bestätigt'
    case 'resolved': return 'Gelöst'
    default: return status
  }
}

/**
 * Farben für Severity (für StatusBadge-Kompatibilität)
 */
export function getSeverityColors(severity: AlertSeverity): {
  bg: string
  text: string
  border: string
} {
  switch (severity) {
    case 'critical':
      return { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' }
    case 'warning':
      return { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' }
    case 'info':
    default:
      return { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' }
  }
}

/**
 * Farben für Status
 */
export function getAlertStatusColors(status: AlertStatus): {
  bg: string
  text: string
  border: string
} {
  switch (status) {
    case 'open':
      return { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' }
    case 'acknowledged':
      return { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' }
    case 'resolved':
      return { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' }
    default:
      return { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' }
  }
}
