/**
 * Computed Alert Dismissals API
 *
 * Ermöglicht das Ausblenden/Erledigen von berechneten Alerts.
 * Diese Alerts werden nicht in der DB gespeichert, sondern dynamisch berechnet.
 * Um sie auszublenden, speichern wir die synthetic_id in dieser Tabelle.
 *
 * Rollenberechtigung:
 * - Admin/GF: Alle Alerts ausblenden
 * - Disponent: Nur operative Alerts (keine Finanz-Alerts)
 * - Fahrer: Kein Zugriff
 */

import { supabase } from "./supabase"
import { logAuditEvent } from "./audit-api"

// Finanz-Alert-Typen, die nur Admin/GF sehen/erledigen dürfen
export const FINANCE_ALERT_TYPES = [
  'tour_nicht_berechenbar',
  'tour_fallback_konstanten',
  'rechnung_nicht_gesperrt',
  'negative_marge'
] as const

export type FinanceAlertType = typeof FINANCE_ALERT_TYPES[number]

export interface ComputedAlertDismissal {
  id: string
  synthetic_id: string
  alert_type: string
  entity_type: string | null
  entity_id: string | null
  dismissed_by: string
  dismissed_at: string
  note: string | null
  created_at: string
}

/**
 * Prüft ob ein Alert-Typ ein Finanz-Alert ist
 */
export function isFinanceAlertType(alertType: string): boolean {
  return FINANCE_ALERT_TYPES.includes(alertType as FinanceAlertType)
}

/**
 * Lädt alle Dismissals - für Filter der berechneten Alerts
 */
export async function getComputedAlertDismissals(): Promise<ComputedAlertDismissal[]> {
  const { data, error } = await supabase
    .from('computed_alert_dismissals')
    .select('*')
    .order('dismissed_at', { ascending: false })

  if (error) {
    console.error('Fehler beim Laden der Dismissals:', error)
    // Bei Fehler (z.B. Tabelle existiert noch nicht) leeres Array zurückgeben
    return []
  }

  return data || []
}

/**
 * Lädt Dismissals als Set für schnelle Lookup
 */
export async function getDismissedSyntheticIds(): Promise<Set<string>> {
  const dismissals = await getComputedAlertDismissals()
  return new Set(dismissals.map(d => d.synthetic_id))
}

/**
 * Blendet einen berechneten Alert aus (markiert als erledigt)
 */
export async function dismissComputedAlert(
  syntheticId: string,
  alertType: string,
  entityType?: string | null,
  entityId?: string | null,
  note?: string | null
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const { data, error } = await supabase.rpc('dismiss_computed_alert', {
      p_synthetic_id: syntheticId,
      p_alert_type: alertType,
      p_entity_type: entityType || null,
      p_entity_id: entityId || null,
      p_note: note || null
    })

    if (error) {
      console.error('Fehler beim Ausblenden des Alerts:', error)
      return { success: false, error: error.message }
    }

    // Audit-Log: Berechneter Alert ausgeblendet
    await logAuditEvent({
      action: 'computed_alert_dismissed',
      entityType: 'computed_alert',
      entityId: syntheticId,
      severity: 'info',
      isFinancial: isFinanceAlertType(alertType), // Finanz-Alert?
      afterData: {
        synthetic_id: syntheticId,
        alert_type: alertType,
        entity_type: entityType,
        entity_id: entityId
      },
      metadata: { note: note || null }
    })

    return { success: true, id: data }
  } catch (err) {
    console.error('Fehler beim Ausblenden des Alerts:', err)
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unbekannter Fehler'
    }
  }
}

/**
 * Macht eine Ausblendung rückgängig (Alert wieder anzeigen)
 */
export async function undoDismissComputedAlert(
  syntheticId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.rpc('undo_dismiss_computed_alert', {
      p_synthetic_id: syntheticId
    })

    if (error) {
      console.error('Fehler beim Rückgängigmachen:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err) {
    console.error('Fehler beim Rückgängigmachen:', err)
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unbekannter Fehler'
    }
  }
}

/**
 * Hilfsfunktion: Prüft ob Disponent diesen Alert-Typ erledigen darf
 */
export function canDisponentDismissAlertType(alertType: string): boolean {
  return !isFinanceAlertType(alertType)
}

/**
 * Ermittelt Benutzerrolle aus Profil
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
 * Prüft ob der aktuelle User einen Alert-Typ erledigen darf
 */
export async function canCurrentUserDismissAlertType(alertType: string): Promise<boolean> {
  const role = await getCurrentUserRole()

  if (!role) return false
  if (role === 'fahrer') return false
  if (role === 'admin' || role === 'gf') return true
  if (role === 'disponent') return canDisponentDismissAlertType(alertType)

  return false
}
