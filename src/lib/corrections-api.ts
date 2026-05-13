/**
 * Corrections API - nur Admin/GF
 * Verwendet bestehende driver_correction_requests und driver_salary_corrections Tabellen
 * Nach GRANT-Migration kann Admin/GF jetzt direkt auf Basistabellen zugreifen
 * Disponent: Kein Zugriff auf Beträge
 */

import { supabase } from "./supabase"
import { logAuditEvent } from "./audit-api"

export type CorrectionRequestStatus = 'open' | 'reviewed' | 'approved_for_correction' | 'rejected'
export type SalaryCorrectionStatus = 'pending' | 'approved' | 'rejected' | 'applied'

export interface CorrectionRequest {
  id: string
  arbeitsnachweis_id: number
  reason: string
  internal_note: string | null
  problem_category: string | null
  status: CorrectionRequestStatus
  requested_by: string
  requested_at: string
  reviewed_by: string | null
  reviewed_at: string | null
  review_note: string | null
  salary_correction_id?: string | null // nur Admin
  created_at: string
}

export interface SalaryCorrection {
  id: string
  arbeitsnachweis_id: number
  original_amount: number
  corrected_amount: number
  correction_reason: string
  status: SalaryCorrectionStatus
  created_by: string
  created_at: string
  approved_by: string | null
  approved_at: string | null
  rejected_by: string | null
  rejected_at: string | null
  rejection_reason: string | null
  applied_by: string | null
  applied_at: string | null
  correction_request_id: string | null
}

// Validierungsfehler-Typ für Rückgaben
export interface CorrectionValidationError {
  field: string
  message: string
}

export interface CorrectionResult {
  success: boolean
  errors?: CorrectionValidationError[]
  data?: unknown
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
 * Lädt alle Korrekturanfragen
 * Admin/GF: Basistabelle mit allen Feldern inkl. salary_correction_id
 * Disponent: View ohne salary_correction_id
 */
export async function getCorrectionRequests(isAdmin: boolean): Promise<CorrectionRequest[]> {
  const isActuallyAdmin = await isAdminOrGF()

  if (isActuallyAdmin) {
    // Admin/GF: Basistabelle mit allen Feldern
    const { data, error } = await supabase
      .from('driver_correction_requests')
      .select('*')
      .order('requested_at', { ascending: false })

    if (error) {
      console.error('Fehler beim Laden der Korrekturanfragen (Admin):', error)
      throw new Error(error.message)
    }

    return data || []
  } else {
    // Disponent: View ohne salary_correction_id
    const { data, error } = await supabase
      .from('driver_correction_requests_disponent')
      .select('*')
      .order('requested_at', { ascending: false })

    if (error) {
      console.error('Fehler beim Laden der Korrekturanfragen (Disponent):', error)
      throw new Error(error.message)
    }

    return (data || []).map(r => ({ ...r, salary_correction_id: null }))
  }
}

/**
 * Lädt alle Fahrerlohn-Korrekturen (nur Admin/GF!)
 * Admin/GF: Basistabelle mit allen Feldern inkl. Beträge
 * Disponent/Fahrer: Kein Zugriff (RLS blockiert)
 */
export async function getSalaryCorrections(): Promise<SalaryCorrection[]> {
  const { data, error } = await supabase
    .from('driver_salary_corrections')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    // Bei RLS-Blockierung für Nicht-Admin: leeres Array
    console.error('Fehler beim Laden der Lohnkorrekturen:', error.message)
    throw new Error(`Lohnkorrekturen konnten nicht geladen werden: ${error.message}`)
  }

  return data || []
}

/**
 * Formatierung für Request-Status
 */
export function formatRequestStatus(status: CorrectionRequestStatus): string {
  switch (status) {
    case 'open': return 'Offen'
    case 'reviewed': return 'Geprüft'
    case 'approved_for_correction': return 'Zur Korrektur'
    case 'rejected': return 'Abgelehnt'
    default: return status
  }
}

/**
 * Formatierung für Korrektur-Status
 */
export function formatCorrectionStatus(status: SalaryCorrectionStatus): string {
  switch (status) {
    case 'pending': return 'Ausstehend'
    case 'approved': return 'Genehmigt'
    case 'rejected': return 'Abgelehnt'
    case 'applied': return 'Angewendet'
    default: return status
  }
}

/**
 * Farben für Request-Status
 */
export function getRequestStatusColors(status: CorrectionRequestStatus): {
  bg: string
  text: string
  border: string
} {
  switch (status) {
    case 'open':
      return { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' }
    case 'reviewed':
      return { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' }
    case 'approved_for_correction':
      return { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' }
    case 'rejected':
      return { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' }
    default:
      return { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' }
  }
}

/**
 * Farben für Korrektur-Status
 */
export function getCorrectionStatusColors(status: SalaryCorrectionStatus): {
  bg: string
  text: string
  border: string
} {
  switch (status) {
    case 'pending':
      return { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' }
    case 'approved':
      return { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' }
    case 'rejected':
      return { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' }
    case 'applied':
      return { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' }
    default:
      return { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' }
  }
}

/**
 * Formatierung für Problem-Kategorie
 */
export function formatProblemCategory(category: string | null): string {
  if (!category) return '-'
  switch (category) {
    case 'wrong_km': return 'Falsche km'
    case 'wrong_time': return 'Falsche Zeit'
    case 'missing_data': return 'Fehlende Daten'
    case 'calculation_error': return 'Berechnungsfehler'
    case 'other': return 'Sonstiges'
    default: return category
  }
}

// ============================================================
// KORREKTUR-WORKFLOW API-FUNKTIONEN (Admin/GF only)
// ============================================================

/**
 * 1. Request als "geprüft" markieren
 * Admin/GF only - setzt status = 'reviewed'
 */
export async function reviewCorrectionRequest(
  requestId: string,
  reviewNote?: string
): Promise<CorrectionResult> {
  // Admin/GF Prüfung
  if (!(await isAdminOrGF())) {
    return {
      success: false,
      errors: [{ field: 'auth', message: 'Keine Berechtigung' }]
    }
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, errors: [{ field: 'auth', message: 'Nicht angemeldet' }] }
  }

  // Request existiert und ist 'open'?
  const { data: existing, error: fetchError } = await supabase
    .from('driver_correction_requests')
    .select('id, status')
    .eq('id', requestId)
    .single()

  if (fetchError || !existing) {
    return { success: false, errors: [{ field: 'requestId', message: 'Anfrage nicht gefunden' }] }
  }

  if (existing.status !== 'open') {
    return { success: false, errors: [{ field: 'status', message: `Anfrage ist bereits '${existing.status}'` }] }
  }

  // Update
  const { error: updateError } = await supabase
    .from('driver_correction_requests')
    .update({
      status: 'reviewed',
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      review_note: reviewNote || null
    })
    .eq('id', requestId)

  if (updateError) {
    return { success: false, errors: [{ field: 'general', message: updateError.message }] }
  }

  // Audit-Log: Korrekturanfrage geprüft
  await logAuditEvent({
    action: 'correction_request_reviewed',
    entityType: 'correction_request',
    entityId: requestId,
    severity: 'info',
    isFinancial: true, // Korrekturen betreffen Finanzen
    beforeData: { status: existing.status },
    afterData: { status: 'reviewed' },
    metadata: { review_note: reviewNote || null }
  })

  return { success: true }
}

/**
 * 2. Request ablehnen
 * Admin/GF only - setzt status = 'rejected'
 */
export async function rejectCorrectionRequest(
  requestId: string,
  reviewNote: string
): Promise<CorrectionResult> {
  // Admin/GF Prüfung
  if (!(await isAdminOrGF())) {
    return { success: false, errors: [{ field: 'auth', message: 'Keine Berechtigung' }] }
  }

  // Validierung
  if (!reviewNote || reviewNote.trim().length === 0) {
    return { success: false, errors: [{ field: 'reviewNote', message: 'Ablehnungsgrund ist erforderlich' }] }
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, errors: [{ field: 'auth', message: 'Nicht angemeldet' }] }
  }

  // Request existiert und ist offen oder geprüft?
  const { data: existing, error: fetchError } = await supabase
    .from('driver_correction_requests')
    .select('id, status')
    .eq('id', requestId)
    .single()

  if (fetchError || !existing) {
    return { success: false, errors: [{ field: 'requestId', message: 'Anfrage nicht gefunden' }] }
  }

  if (existing.status === 'rejected') {
    return { success: false, errors: [{ field: 'status', message: 'Anfrage ist bereits abgelehnt' }] }
  }

  if (existing.status === 'approved_for_correction') {
    return { success: false, errors: [{ field: 'status', message: 'Anfrage hat bereits eine Korrektur' }] }
  }

  // Update
  const { error: updateError } = await supabase
    .from('driver_correction_requests')
    .update({
      status: 'rejected',
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      review_note: reviewNote.trim()
    })
    .eq('id', requestId)

  if (updateError) {
    return { success: false, errors: [{ field: 'general', message: updateError.message }] }
  }

  // Audit-Log: Korrekturanfrage abgelehnt
  await logAuditEvent({
    action: 'correction_request_rejected',
    entityType: 'correction_request',
    entityId: requestId,
    severity: 'warning',
    isFinancial: true,
    beforeData: { status: existing.status },
    afterData: { status: 'rejected' },
    metadata: { rejection_reason: reviewNote.trim() }
  })

  return { success: true }
}

/**
 * 3. Fahrerlohn-Korrektur aus Request erstellen
 * Admin/GF only - erstellt salary_correction mit status = 'pending'
 */
export interface CreateSalaryCorrectionParams {
  requestId: string
  arbeitsnachweisId: number
  originalAmount: number
  correctedAmount: number
  correctionReason: string
}

export async function createSalaryCorrectionFromRequest(
  params: CreateSalaryCorrectionParams
): Promise<CorrectionResult> {
  // Admin/GF Prüfung
  if (!(await isAdminOrGF())) {
    return { success: false, errors: [{ field: 'auth', message: 'Keine Berechtigung' }] }
  }

  const { requestId, arbeitsnachweisId, originalAmount, correctedAmount, correctionReason } = params
  const errors: CorrectionValidationError[] = []

  // Validierung
  if (!requestId) {
    errors.push({ field: 'requestId', message: 'Request-ID ist erforderlich' })
  }
  if (!arbeitsnachweisId || arbeitsnachweisId <= 0) {
    errors.push({ field: 'arbeitsnachweisId', message: 'Arbeitsnachweis-ID ist erforderlich' })
  }
  if (originalAmount < 0) {
    errors.push({ field: 'originalAmount', message: 'Originalbetrag darf nicht negativ sein' })
  }
  if (correctedAmount < 0) {
    errors.push({ field: 'correctedAmount', message: 'Korrekturbetrag darf nicht negativ sein' })
  }
  if (!correctionReason || correctionReason.trim().length === 0) {
    errors.push({ field: 'correctionReason', message: 'Korrekturgrund ist erforderlich' })
  }

  if (errors.length > 0) {
    return { success: false, errors }
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, errors: [{ field: 'auth', message: 'Nicht angemeldet' }] }
  }

  // Request existiert und ist offen oder geprüft?
  const { data: request, error: fetchError } = await supabase
    .from('driver_correction_requests')
    .select('id, status, salary_correction_id')
    .eq('id', requestId)
    .single()

  if (fetchError || !request) {
    return { success: false, errors: [{ field: 'requestId', message: 'Anfrage nicht gefunden' }] }
  }

  if (request.salary_correction_id) {
    return { success: false, errors: [{ field: 'requestId', message: 'Anfrage hat bereits eine verknüpfte Korrektur' }] }
  }

  if (request.status === 'rejected') {
    return { success: false, errors: [{ field: 'status', message: 'Abgelehnte Anfrage kann keine Korrektur erhalten' }] }
  }

  // Korrektur erstellen
  const { data: newCorrection, error: insertError } = await supabase
    .from('driver_salary_corrections')
    .insert({
      arbeitsnachweis_id: arbeitsnachweisId,
      original_amount: originalAmount,
      corrected_amount: correctedAmount,
      correction_reason: correctionReason.trim(),
      status: 'pending',
      created_by: user.id,
      correction_request_id: requestId
    })
    .select('id')
    .single()

  if (insertError || !newCorrection) {
    return { success: false, errors: [{ field: 'general', message: insertError?.message || 'Korrektur konnte nicht erstellt werden' }] }
  }

  // Request-Status aktualisieren
  const { error: updateError } = await supabase
    .from('driver_correction_requests')
    .update({
      status: 'approved_for_correction',
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      salary_correction_id: newCorrection.id
    })
    .eq('id', requestId)

  if (updateError) {
    // Rollback: Korrektur wieder löschen
    await supabase
      .from('driver_salary_corrections')
      .delete()
      .eq('id', newCorrection.id)

    return { success: false, errors: [{ field: 'general', message: 'Request konnte nicht aktualisiert werden: ' + updateError.message }] }
  }

  // Audit-Log: Lohnkorrektur erstellt
  await logAuditEvent({
    action: 'salary_correction_created',
    entityType: 'salary_correction',
    entityId: newCorrection.id,
    severity: 'info',
    isFinancial: true,
    afterData: {
      id: newCorrection.id,
      arbeitsnachweis_id: arbeitsnachweisId,
      status: 'pending',
      correction_request_id: requestId
      // Keine Beträge im Log (sensibel)
    },
    metadata: {
      correction_reason: correctionReason.trim(),
      from_request_id: requestId
    }
  })

  return { success: true, data: { correctionId: newCorrection.id } }
}

/**
 * 4. Korrektur genehmigen
 * Admin/GF only - setzt status = 'approved'
 */
export async function approveSalaryCorrection(
  correctionId: string
): Promise<CorrectionResult> {
  // Admin/GF Prüfung
  if (!(await isAdminOrGF())) {
    return { success: false, errors: [{ field: 'auth', message: 'Keine Berechtigung' }] }
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, errors: [{ field: 'auth', message: 'Nicht angemeldet' }] }
  }

  // Korrektur existiert und ist 'pending'?
  const { data: existing, error: fetchError } = await supabase
    .from('driver_salary_corrections')
    .select('id, status')
    .eq('id', correctionId)
    .single()

  if (fetchError || !existing) {
    return { success: false, errors: [{ field: 'correctionId', message: 'Korrektur nicht gefunden' }] }
  }

  if (existing.status !== 'pending') {
    return { success: false, errors: [{ field: 'status', message: `Korrektur ist bereits '${existing.status}'` }] }
  }

  // Update
  const { error: updateError } = await supabase
    .from('driver_salary_corrections')
    .update({
      status: 'approved',
      approved_by: user.id,
      approved_at: new Date().toISOString()
    })
    .eq('id', correctionId)

  if (updateError) {
    return { success: false, errors: [{ field: 'general', message: updateError.message }] }
  }

  // Audit-Log: Lohnkorrektur genehmigt
  await logAuditEvent({
    action: 'salary_correction_approved',
    entityType: 'salary_correction',
    entityId: correctionId,
    severity: 'info',
    isFinancial: true,
    beforeData: { status: existing.status },
    afterData: { status: 'approved' }
  })

  return { success: true }
}

/**
 * 5. Korrektur ablehnen
 * Admin/GF only - setzt status = 'rejected'
 */
export async function rejectSalaryCorrection(
  correctionId: string,
  reason: string
): Promise<CorrectionResult> {
  // Admin/GF Prüfung
  if (!(await isAdminOrGF())) {
    return { success: false, errors: [{ field: 'auth', message: 'Keine Berechtigung' }] }
  }

  // Validierung
  if (!reason || reason.trim().length === 0) {
    return { success: false, errors: [{ field: 'reason', message: 'Ablehnungsgrund ist erforderlich' }] }
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, errors: [{ field: 'auth', message: 'Nicht angemeldet' }] }
  }

  // Korrektur existiert und ist 'pending' oder 'approved'?
  const { data: existing, error: fetchError } = await supabase
    .from('driver_salary_corrections')
    .select('id, status')
    .eq('id', correctionId)
    .single()

  if (fetchError || !existing) {
    return { success: false, errors: [{ field: 'correctionId', message: 'Korrektur nicht gefunden' }] }
  }

  if (existing.status === 'rejected') {
    return { success: false, errors: [{ field: 'status', message: 'Korrektur ist bereits abgelehnt' }] }
  }

  if (existing.status === 'applied') {
    return { success: false, errors: [{ field: 'status', message: 'Angewendete Korrektur kann nicht abgelehnt werden' }] }
  }

  // Update
  const { error: updateError } = await supabase
    .from('driver_salary_corrections')
    .update({
      status: 'rejected',
      rejected_by: user.id,
      rejected_at: new Date().toISOString(),
      rejection_reason: reason.trim()
    })
    .eq('id', correctionId)

  if (updateError) {
    return { success: false, errors: [{ field: 'general', message: updateError.message }] }
  }

  // Audit-Log: Lohnkorrektur abgelehnt
  await logAuditEvent({
    action: 'salary_correction_rejected',
    entityType: 'salary_correction',
    entityId: correctionId,
    severity: 'warning',
    isFinancial: true,
    beforeData: { status: existing.status },
    afterData: { status: 'rejected' },
    metadata: { rejection_reason: reason.trim() }
  })

  return { success: true }
}

/**
 * 6. Korrektur anwenden
 * Admin/GF only - erst bei 'approved' möglich
 * Aktualisiert arbeitsnachweise.driver_amount_final
 */
export async function applySalaryCorrection(
  correctionId: string
): Promise<CorrectionResult> {
  // Admin/GF Prüfung
  if (!(await isAdminOrGF())) {
    return { success: false, errors: [{ field: 'auth', message: 'Keine Berechtigung' }] }
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, errors: [{ field: 'auth', message: 'Nicht angemeldet' }] }
  }

  // Korrektur laden
  const { data: correction, error: fetchError } = await supabase
    .from('driver_salary_corrections')
    .select('id, status, arbeitsnachweis_id, corrected_amount, correction_reason')
    .eq('id', correctionId)
    .single()

  if (fetchError || !correction) {
    return { success: false, errors: [{ field: 'correctionId', message: 'Korrektur nicht gefunden' }] }
  }

  if (correction.status !== 'approved') {
    return { success: false, errors: [{ field: 'status', message: `Nur genehmigte Korrekturen können angewendet werden (aktuell: '${correction.status}')` }] }
  }

  // Arbeitsnachweis prüfen (locked_at?)
  const { data: arbeitsnachweis, error: anError } = await supabase
    .from('arbeitsnachweise')
    .select('id, locked_at')
    .eq('id', correction.arbeitsnachweis_id)
    .single()

  if (anError || !arbeitsnachweis) {
    return { success: false, errors: [{ field: 'arbeitsnachweisId', message: 'Arbeitsnachweis nicht gefunden' }] }
  }

  // Falls locked_at gesetzt: Warnung, aber trotzdem fortfahren (Admin darf)
  // Trigger können blockieren - Fehler wird dann zurückgegeben

  // Arbeitsnachweis aktualisieren
  const { error: updateAnError } = await supabase
    .from('arbeitsnachweise')
    .update({
      driver_amount_final: correction.corrected_amount,
      driver_amount_adjustment_reason: correction.correction_reason,
      driver_amount_adjusted_by: user.id,
      driver_amount_adjusted_at: new Date().toISOString()
    })
    .eq('id', correction.arbeitsnachweis_id)

  if (updateAnError) {
    // Falls Trigger blockiert
    return { success: false, errors: [{ field: 'general', message: 'Arbeitsnachweis konnte nicht aktualisiert werden: ' + updateAnError.message }] }
  }

  // Korrektur als angewendet markieren
  const { error: updateCorrError } = await supabase
    .from('driver_salary_corrections')
    .update({
      status: 'applied',
      applied_by: user.id,
      applied_at: new Date().toISOString()
    })
    .eq('id', correctionId)

  if (updateCorrError) {
    // Rollback des Arbeitsnachweises ist hier schwierig -
    // in der Praxis sollte das nicht passieren wenn RLS korrekt ist
    return { success: false, errors: [{ field: 'general', message: 'Korrekturstatus konnte nicht aktualisiert werden: ' + updateCorrError.message }] }
  }

  // Audit-Log: Lohnkorrektur angewendet
  await logAuditEvent({
    action: 'salary_correction_applied',
    entityType: 'salary_correction',
    entityId: correctionId,
    severity: 'critical', // Kritisch, da Abrechnungsdaten geändert werden
    isFinancial: true,
    beforeData: { status: 'approved' },
    afterData: { status: 'applied' },
    metadata: {
      arbeitsnachweis_id: correction.arbeitsnachweis_id,
      was_locked: arbeitsnachweis.locked_at !== null
      // Keine Beträge im Log (sensibel)
    }
  })

  return { success: true }
}

/**
 * Hilfsfunktion: Arbeitsnachweis-Daten für Korrektur laden
 * Gibt driver_amount_final zurück (falls vorhanden)
 */
export async function getArbeitsnachweisForCorrection(
  arbeitsnachweisId: number
): Promise<{ originalAmount: number; locked: boolean } | null> {
  if (!(await isAdminOrGF())) {
    return null
  }

  const { data, error } = await supabase
    .from('arbeitsnachweise')
    .select('id, driver_amount_final, locked_at')
    .eq('id', arbeitsnachweisId)
    .single()

  if (error || !data) {
    return null
  }

  return {
    originalAmount: data.driver_amount_final || 0,
    locked: !!data.locked_at
  }
}
