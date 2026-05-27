/**
 * Availability Alert Reviews API
 *
 * Ermöglicht das manuelle Markieren von "Verfügbar, aber keine Tour".
 *
 * Rollenberechtigung:
 * - Admin/GF: Alle Markierungen lesen und erstellen
 * - Disponent: Alle Markierungen lesen und erstellen
 * - Fahrer: Kein Zugriff
 */

import { supabase } from "./supabase"
import { logAuditEvent } from "./audit-api"

// ============================================================
// TYPES
// ============================================================

export interface AvailabilityAlertReview {
  id: string
  fahrer_id: string
  user_id: string | null
  date: string
  status: string
  note: string | null
  marked_by: string
  marked_at: string
  created_at: string
  updated_at: string
}

export interface MarkAvailableWithoutTourParams {
  fahrer_id: string
  user_id?: string | null
  date: string
  note?: string | null
}

// ============================================================
// API FUNCTIONS
// ============================================================

/**
 * Lädt alle Markierungen
 */
export async function getAvailabilityAlertReviews(): Promise<AvailabilityAlertReview[]> {
  const { data, error } = await supabase
    .from('availability_alert_reviews')
    .select('*')
    .order('marked_at', { ascending: false })

  if (error) {
    console.error('Fehler beim Laden der Reviews:', error)
    // Bei Fehler (z.B. Tabelle existiert noch nicht) leeres Array zurückgeben
    return []
  }

  return data || []
}

/**
 * Lädt Markierungen für einen bestimmten Fahrer
 */
export async function getAvailabilityAlertReviewsForFahrer(
  fahrerId: string
): Promise<AvailabilityAlertReview[]> {
  const { data, error } = await supabase
    .from('availability_alert_reviews')
    .select('*')
    .eq('fahrer_id', fahrerId)
    .order('date', { ascending: false })

  if (error) {
    console.error('Fehler beim Laden der Reviews:', error)
    return []
  }

  return data || []
}

/**
 * Lädt Markierungen für einen Zeitraum
 */
export async function getAvailabilityAlertReviewsForDateRange(
  startDate: string,
  endDate: string
): Promise<AvailabilityAlertReview[]> {
  const { data, error } = await supabase
    .from('availability_alert_reviews')
    .select('*')
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: false })

  if (error) {
    console.error('Fehler beim Laden der Reviews:', error)
    return []
  }

  return data || []
}

/**
 * Markiert einen Tag als "Verfügbar, aber keine Tour"
 */
export async function markAvailableWithoutTour(
  params: MarkAvailableWithoutTourParams
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const { data, error } = await supabase.rpc('mark_available_without_tour', {
      p_fahrer_id: params.fahrer_id,
      p_user_id: params.user_id || null,
      p_date: params.date,
      p_note: params.note || null
    })

    if (error) {
      console.error('Fehler beim Markieren:', error)
      return { success: false, error: error.message }
    }

    // Audit-Log: Verfügbarkeit ohne Tour markiert
    await logAuditEvent({
      action: 'availability_marked_no_tour',
      entityType: 'availability',
      entityId: data, // Die neue Review-ID
      severity: 'info',
      isFinancial: false, // Verfügbarkeit ist nicht finanziell
      afterData: {
        fahrer_id: params.fahrer_id,
        date: params.date,
        status: 'marked_available_no_tour'
      },
      metadata: {
        note: params.note || null,
        user_id: params.user_id || null
      }
    })

    return { success: true, id: data }
  } catch (err) {
    console.error('Fehler beim Markieren:', err)
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unbekannter Fehler'
    }
  }
}

/**
 * Macht eine Markierung rückgängig
 */
export async function undoAvailableWithoutTourMarking(
  reviewId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.rpc('undo_available_without_tour_marking', {
      p_review_id: reviewId
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
 * Prüft ob für einen Fahrer + Datum bereits eine Markierung existiert
 */
export async function hasAvailabilityReview(
  fahrerId: string,
  date: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from('availability_alert_reviews')
    .select('id')
    .eq('fahrer_id', fahrerId)
    .eq('date', date)
    .single()

  if (error && error.code !== 'PGRST116') {
    // PGRST116 = no rows returned
    console.error('Fehler bei Prüfung:', error)
  }

  return !!data
}

/**
 * Lädt eine Map von fahrer_id+date -> Review für schnelle Lookups
 */
export async function getAvailabilityReviewMap(): Promise<Map<string, AvailabilityAlertReview>> {
  const reviews = await getAvailabilityAlertReviews()
  const map = new Map<string, AvailabilityAlertReview>()

  reviews.forEach(r => {
    map.set(`${r.fahrer_id}_${r.date}`, r)
  })

  return map
}
