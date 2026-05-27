/**
 * Onboarding API - HR/Onboarding-System für Bewerber und Kandidaten
 *
 * Rollenberechtigung:
 * - Admin/GF: Voller Zugriff
 * - Disponent: Kein Zugriff (sensible HR-Daten)
 * - Fahrer: Kein Zugriff
 */

import { supabase } from "./supabase"
import { logAuditEvent } from "./audit-api"

// ============================================================
// TYPES
// ============================================================

export type CandidateType = 'minijobber' | 'subcontractor' | 'unknown'
export type OnboardingSource = 'indeed' | 'ebay' | 'empfehlung' | 'sonstiges'
export type YesNoUnknown = 'yes' | 'no' | 'unknown'
export type OnboardingDocumentStatus = 'offen' | 'angefordert' | 'erhalten' | 'geprueft' | 'abgelehnt' | 'nicht_erforderlich'

export type OnboardingStatus =
  | 'neu' | 'kontakt_aufgenommen' | 'termin_angeboten' | 'termin_geplant'
  | 'gespraech_gefuehrt' | 'geeignet' | 'abgelehnt'
  | 'personalfragebogen_gesendet' | 'personalfragebogen_erhalten'
  | 'firmendaten_angefordert' | 'firmendaten_erhalten'
  | 'dokumente_angefordert' | 'dokumente_unvollstaendig' | 'dokumente_vollstaendig'
  | 'infomaterial_gesendet' | 'quiz_offen' | 'quiz_bestanden'
  | 'vertrag_gesendet' | 'vertrag_unterschrieben'
  | 'fahrerlisten_angefordert' | 'freigabe_offen' | 'freigegeben'
  | 'fahrer_erstellt' | 'aktiv' | 'archiviert'

export type OnboardingDocumentType =
  | 'personalfragebogen' | 'fuehrerschein' | 'ausweis' | 'vertrag' | 'schulungsnachweis'
  | 'gewerbeanmeldung' | 'versicherungsnachweis' | 'ausweis_gf' | 'subunternehmervertrag'
  | 'fahrerliste' | 'sonstiges'

export interface OnboardingCandidate {
  id: string
  type: CandidateType
  status: OnboardingStatus
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  source: OnboardingSource
  source_note: string | null
  city: string | null
  notes_internal: string | null
  assigned_to: string | null
  created_by: string | null
  has_license: YesNoUnknown
  license_classes: string | null
  experience_level: YesNoUnknown
  availability_known: YesNoUnknown
  availability_note: string | null
  desired_employment_type: string | null
  interview_date: string | null
  teams_link: string | null
  // Phase 2: Termin-Slots
  termin_slot_1: string | null
  termin_slot_2: string | null
  termin_slot_3: string | null
  termin_bemerkung: string | null
  termin_gewaehlt: number | null
  // Phase 3a: Bewerber-Feedback
  applicant_comment: string | null
  appointment_selected_at: string | null
  applicant_data_updated_at: string | null
  // Timestamps
  created_at: string
  updated_at: string
  archived_at: string | null
  assigned_to_name?: string
  created_by_name?: string
}

export interface OnboardingDocument {
  id: string
  candidate_id: string
  document_type: OnboardingDocumentType
  status: OnboardingDocumentStatus
  file_path: string | null
  file_name: string | null
  file_size: number | null
  comment: string | null
  created_at: string
  updated_at: string
}

export interface OnboardingNote {
  id: string
  candidate_id: string
  content: string
  created_by: string | null
  created_by_name: string | null
  created_at: string
}

export interface CreateCandidateParams {
  type: CandidateType
  first_name: string
  last_name: string
  email?: string | null
  phone?: string | null
  source: OnboardingSource
  source_note?: string | null
  city?: string | null
  notes_internal?: string | null
  has_license?: YesNoUnknown
  license_classes?: string | null
  experience_level?: YesNoUnknown
  availability_known?: YesNoUnknown
  availability_note?: string | null
}

export interface UpdateCandidateParams extends Partial<CreateCandidateParams> {
  status?: OnboardingStatus
  assigned_to?: string | null
  interview_date?: string | null
  teams_link?: string | null
  desired_employment_type?: string | null
  // Phase 2: Termin-Slots
  termin_slot_1?: string | null
  termin_slot_2?: string | null
  termin_slot_3?: string | null
  termin_bemerkung?: string | null
  termin_gewaehlt?: number | null
}

// ============================================================
// COMMUNICATION TYPES (Phase 2)
// ============================================================

export type OnboardingCommType =
  | 'erstkontakt' | 'terminangebot' | 'teams_link' | 'personalfragebogen'
  | 'infomaterial' | 'fehlende_dokumente' | 'vertrag' | 'absage' | 'willkommen' | 'sonstiges'

export type OnboardingCommStatus = 'prepared' | 'copied' | 'sent_manual' | 'sent_auto'

export interface OnboardingCommunication {
  id: string
  candidate_id: string
  comm_type: OnboardingCommType
  subject: string | null
  body: string
  status: OnboardingCommStatus
  created_by: string | null
  created_by_name: string | null
  created_at: string
  sent_at: string | null
}

// ============================================================
// STATUS CONFIGURATION
// ============================================================

export const MINIJOBBER_STATUSES: OnboardingStatus[] = [
  'neu', 'kontakt_aufgenommen', 'termin_angeboten', 'termin_geplant',
  'gespraech_gefuehrt', 'geeignet', 'abgelehnt', 'personalfragebogen_gesendet',
  'personalfragebogen_erhalten', 'dokumente_angefordert', 'dokumente_unvollstaendig',
  'dokumente_vollstaendig', 'infomaterial_gesendet', 'quiz_offen', 'quiz_bestanden',
  'vertrag_gesendet', 'vertrag_unterschrieben', 'freigabe_offen', 'freigegeben',
  'fahrer_erstellt', 'archiviert'
]

export const SUBCONTRACTOR_STATUSES: OnboardingStatus[] = [
  'neu', 'kontakt_aufgenommen', 'termin_angeboten', 'termin_geplant',
  'gespraech_gefuehrt', 'geeignet', 'abgelehnt', 'firmendaten_angefordert',
  'firmendaten_erhalten', 'dokumente_angefordert', 'dokumente_unvollstaendig',
  'dokumente_vollstaendig', 'vertrag_gesendet', 'vertrag_unterschrieben',
  'fahrerlisten_angefordert', 'freigabe_offen', 'freigegeben', 'aktiv', 'archiviert'
]

export const STATUS_LABELS: Record<OnboardingStatus, string> = {
  'neu': 'Neu', 'kontakt_aufgenommen': 'Kontakt aufgenommen',
  'termin_angeboten': 'Termin angeboten', 'termin_geplant': 'Termin geplant',
  'gespraech_gefuehrt': 'Gespräch geführt', 'geeignet': 'Geeignet', 'abgelehnt': 'Abgelehnt',
  'personalfragebogen_gesendet': 'Personalfragebogen gesendet',
  'personalfragebogen_erhalten': 'Personalfragebogen erhalten',
  'firmendaten_angefordert': 'Firmendaten angefordert',
  'firmendaten_erhalten': 'Firmendaten erhalten',
  'dokumente_angefordert': 'Dokumente angefordert',
  'dokumente_unvollstaendig': 'Dokumente unvollständig',
  'dokumente_vollstaendig': 'Dokumente vollständig',
  'infomaterial_gesendet': 'Infomaterial gesendet',
  'quiz_offen': 'Quiz offen', 'quiz_bestanden': 'Quiz bestanden',
  'vertrag_gesendet': 'Vertrag gesendet', 'vertrag_unterschrieben': 'Vertrag unterschrieben',
  'fahrerlisten_angefordert': 'Fahrerlisten angefordert',
  'freigabe_offen': 'Freigabe offen', 'freigegeben': 'Freigegeben',
  'fahrer_erstellt': 'Fahrer erstellt', 'aktiv': 'Aktiv', 'archiviert': 'Archiviert'
}

export const NEXT_ACTION: Record<OnboardingStatus, string> = {
  'neu': 'Kontakt aufnehmen', 'kontakt_aufgenommen': 'Termin anbieten',
  'termin_angeboten': 'Auf Terminwahl warten', 'termin_geplant': 'Gespräch durchführen',
  'gespraech_gefuehrt': 'Eignung bewerten', 'geeignet': 'Unterlagen anfordern',
  'abgelehnt': 'Archivieren', 'personalfragebogen_gesendet': 'Auf Rücksendung warten',
  'personalfragebogen_erhalten': 'Dokumente anfordern',
  'firmendaten_angefordert': 'Auf Firmendaten warten',
  'firmendaten_erhalten': 'Dokumente anfordern', 'dokumente_angefordert': 'Dokumente prüfen',
  'dokumente_unvollstaendig': 'Fehlende Dokumente nachfordern',
  'dokumente_vollstaendig': 'Vertrag senden', 'infomaterial_gesendet': 'Quiz aktivieren',
  'quiz_offen': 'Auf Quiz-Ergebnis warten', 'quiz_bestanden': 'Vertrag senden',
  'vertrag_gesendet': 'Auf Unterschrift warten', 'vertrag_unterschrieben': 'Freigabe prüfen',
  'fahrerlisten_angefordert': 'Auf Fahrerlisten warten',
  'freigabe_offen': 'Admin/GF-Freigabe erteilen', 'freigegeben': 'Fahrer anlegen',
  'fahrer_erstellt': 'Abgeschlossen', 'aktiv': 'Laufend', 'archiviert': 'Archiviert'
}

export const STATUS_CATEGORIES = {
  open: ['neu', 'kontakt_aufgenommen', 'termin_angeboten', 'termin_geplant', 'gespraech_gefuehrt', 'geeignet'],
  termin_open: ['termin_angeboten', 'termin_geplant'],
  documents_open: ['dokumente_angefordert', 'dokumente_unvollstaendig'],
  freigabe_open: ['freigabe_offen'],
  approved: ['freigegeben', 'fahrer_erstellt', 'aktiv'],
  rejected: ['abgelehnt'],
  archived: ['archiviert']
} as const

export const MINIJOBBER_DOCUMENT_TYPES: OnboardingDocumentType[] = [
  'personalfragebogen', 'fuehrerschein', 'ausweis', 'vertrag', 'schulungsnachweis', 'sonstiges'
]

export const SUBCONTRACTOR_DOCUMENT_TYPES: OnboardingDocumentType[] = [
  'gewerbeanmeldung', 'versicherungsnachweis', 'ausweis_gf', 'subunternehmervertrag', 'fahrerliste', 'sonstiges'
]

export const DOCUMENT_TYPE_LABELS: Record<OnboardingDocumentType, string> = {
  'personalfragebogen': 'Personalfragebogen', 'fuehrerschein': 'Führerschein',
  'ausweis': 'Ausweis', 'vertrag': 'Vertrag', 'schulungsnachweis': 'Schulungsnachweis',
  'gewerbeanmeldung': 'Gewerbeanmeldung', 'versicherungsnachweis': 'Versicherungsnachweis',
  'ausweis_gf': 'Ausweis GF', 'subunternehmervertrag': 'Subunternehmervertrag',
  'fahrerliste': 'Fahrerliste', 'sonstiges': 'Sonstiges'
}

export const DOCUMENT_STATUS_LABELS: Record<OnboardingDocumentStatus, string> = {
  'offen': 'Offen', 'angefordert': 'Angefordert', 'erhalten': 'Erhalten',
  'geprueft': 'Geprüft', 'abgelehnt': 'Abgelehnt', 'nicht_erforderlich': 'Nicht erforderlich'
}

export const SOURCE_LABELS: Record<OnboardingSource, string> = {
  'indeed': 'Indeed', 'ebay': 'eBay Kleinanzeigen', 'empfehlung': 'Empfehlung', 'sonstiges': 'Sonstiges'
}

export const TYPE_LABELS: Record<CandidateType, string> = {
  'minijobber': 'Minijobber', 'subcontractor': 'Subunternehmer', 'unknown': 'Noch offen'
}

// ============================================================
// API FUNCTIONS
// ============================================================

export async function getOnboardingCandidates(
  filters?: {
    type?: CandidateType
    status?: OnboardingStatus
    statusCategory?: keyof typeof STATUS_CATEGORIES
    search?: string
    includeArchived?: boolean
  }
): Promise<OnboardingCandidate[]> {
  try {
    let query = supabase
      .from('onboarding_candidates')
      .select('*')
      .order('created_at', { ascending: false })

    if (!filters?.includeArchived) {
      query = query.neq('status', 'archiviert')
    }
    if (filters?.type) {
      query = query.eq('type', filters.type)
    }
    if (filters?.status) {
      query = query.eq('status', filters.status)
    }
    if (filters?.statusCategory && STATUS_CATEGORIES[filters.statusCategory]) {
      query = query.in('status', STATUS_CATEGORIES[filters.statusCategory] as unknown as OnboardingStatus[])
    }
    if (filters?.search) {
      const s = `%${filters.search}%`
      query = query.or(`first_name.ilike.${s},last_name.ilike.${s},email.ilike.${s},phone.ilike.${s}`)
    }

    const { data, error } = await query
    if (error) throw error
    return (data || []) as OnboardingCandidate[]
  } catch (err) {
    console.error('[Onboarding] Error:', err)
    return []
  }
}

export async function getOnboardingCandidate(id: string): Promise<OnboardingCandidate | null> {
  try {
    const { data, error } = await supabase
      .from('onboarding_candidates')
      .select('*')
      .eq('id', id)
      .single()
    if (error) return null
    return data as OnboardingCandidate
  } catch { return null }
}

export async function createOnboardingCandidate(
  params: CreateCandidateParams
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Nicht authentifiziert' }

    const { data, error } = await supabase
      .from('onboarding_candidates')
      .insert({
        type: params.type, first_name: params.first_name, last_name: params.last_name,
        email: params.email || null, phone: params.phone || null, source: params.source,
        source_note: params.source_note || null, city: params.city || null,
        notes_internal: params.notes_internal || null, has_license: params.has_license || 'unknown',
        license_classes: params.license_classes || null, experience_level: params.experience_level || 'unknown',
        availability_known: params.availability_known || 'unknown',
        availability_note: params.availability_note || null,
        created_by: user.id, status: 'neu'
      })
      .select('id')
      .single()

    if (error) return { success: false, error: error.message }

    await logAuditEvent({
      action: 'onboarding_candidate_created', entityType: 'onboarding_candidate',
      entityId: data.id, entityLabel: `${params.first_name} ${params.last_name}`, severity: 'info'
    })

    // Create default documents
    if (params.type !== 'unknown') {
      const docTypes = params.type === 'minijobber'
        ? MINIJOBBER_DOCUMENT_TYPES.filter(t => t !== 'sonstiges')
        : SUBCONTRACTOR_DOCUMENT_TYPES.filter(t => t !== 'sonstiges')
      const docs = docTypes.map(dt => ({ candidate_id: data.id, document_type: dt, status: 'offen' as OnboardingDocumentStatus }))
      await supabase.from('onboarding_documents').insert(docs)
    }

    return { success: true, id: data.id }
  } catch (err) {
    return { success: false, error: 'Unerwarteter Fehler' }
  }
}

export async function updateOnboardingCandidate(
  id: string, params: UpdateCandidateParams
): Promise<{ success: boolean; error?: string }> {
  try {
    const oldData = await getOnboardingCandidate(id)
    if (!oldData) return { success: false, error: 'Kandidat nicht gefunden' }

    const { error } = await supabase.from('onboarding_candidates').update(params as Record<string, unknown>).eq('id', id)
    if (error) return { success: false, error: error.message }

    await logAuditEvent({
      action: params.status !== oldData.status ? 'onboarding_status_changed' : 'onboarding_candidate_updated',
      entityType: 'onboarding_candidate', entityId: id,
      entityLabel: `${oldData.first_name} ${oldData.last_name}`, severity: 'info',
      beforeData: { status: oldData.status }, afterData: params as Record<string, unknown>
    })
    return { success: true }
  } catch { return { success: false, error: 'Unerwarteter Fehler' } }
}

export async function archiveCandidate(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.from('onboarding_candidates')
      .update({ status: 'archiviert', archived_at: new Date().toISOString() }).eq('id', id)
    if (error) return { success: false, error: error.message }
    await logAuditEvent({ action: 'onboarding_candidate_archived', entityType: 'onboarding_candidate', entityId: id, severity: 'info' })
    return { success: true }
  } catch { return { success: false, error: 'Unerwarteter Fehler' } }
}

// ============================================================
// DOCUMENT FUNCTIONS
// ============================================================

export async function getCandidateDocuments(candidateId: string): Promise<OnboardingDocument[]> {
  try {
    const { data, error } = await supabase.from('onboarding_documents')
      .select('*').eq('candidate_id', candidateId).order('created_at')
    if (error) return []
    return data as OnboardingDocument[]
  } catch { return [] }
}

export async function updateDocumentStatus(
  documentId: string, status: OnboardingDocumentStatus, comment?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const updateData: Record<string, unknown> = { status }
    if (comment !== undefined) updateData.comment = comment
    const { error } = await supabase.from('onboarding_documents').update(updateData).eq('id', documentId)
    if (error) return { success: false, error: error.message }
    await logAuditEvent({ action: 'onboarding_document_status_changed', entityType: 'onboarding_document', entityId: documentId, severity: 'info', afterData: { status } })
    return { success: true }
  } catch { return { success: false, error: 'Unerwarteter Fehler' } }
}

export async function uploadDocumentFile(
  documentId: string, candidateId: string, file: File
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: doc } = await supabase.from('onboarding_documents').select('document_type, file_path').eq('id', documentId).single()
    if (!doc) return { success: false, error: 'Dokument nicht gefunden' }
    if (doc.file_path) await supabase.storage.from('onboarding-documents').remove([doc.file_path])

    const ext = file.name.split('.').pop() || 'pdf'
    const path = `${candidateId}/${doc.document_type}_${Date.now()}.${ext}`
    const { error: uploadError } = await supabase.storage.from('onboarding-documents').upload(path, file)
    if (uploadError) return { success: false, error: uploadError.message }

    const { error } = await supabase.from('onboarding_documents')
      .update({ file_path: path, file_name: file.name, file_size: file.size, status: 'erhalten' }).eq('id', documentId)
    if (error) return { success: false, error: error.message }
    return { success: true }
  } catch { return { success: false, error: 'Unerwarteter Fehler' } }
}

export async function getDocumentDownloadUrl(documentId: string): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const { data: doc } = await supabase.from('onboarding_documents').select('file_path').eq('id', documentId).single()
    if (!doc?.file_path) return { success: false, error: 'Keine Datei vorhanden' }
    const { data, error } = await supabase.storage.from('onboarding-documents').createSignedUrl(doc.file_path, 3600)
    if (error) return { success: false, error: error.message }
    return { success: true, url: data.signedUrl }
  } catch { return { success: false, error: 'Unerwarteter Fehler' } }
}

// ============================================================
// NOTES FUNCTIONS
// ============================================================

export async function getCandidateNotes(candidateId: string): Promise<OnboardingNote[]> {
  try {
    const { data, error } = await supabase.from('onboarding_notes').select('*').eq('candidate_id', candidateId).order('created_at', { ascending: false })
    if (error) return []
    return data as OnboardingNote[]
  } catch { return [] }
}

export async function createCandidateNote(candidateId: string, content: string): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Nicht authentifiziert' }
    const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single()
    const { data, error } = await supabase.from('onboarding_notes').insert({ candidate_id: candidateId, content, created_by: user.id, created_by_name: profile?.full_name || null }).select('id').single()
    if (error) return { success: false, error: error.message }
    return { success: true, id: data.id }
  } catch { return { success: false, error: 'Unerwarteter Fehler' } }
}

// ============================================================
// STATISTICS
// ============================================================

export async function getOnboardingStats(): Promise<{ total: number; new: number; terminOpen: number; documentsOpen: number; freigabeOpen: number; approved: number; rejected: number }> {
  try {
    const { data, error } = await supabase.from('onboarding_candidates').select('status').neq('status', 'archiviert')
    if (error) return { total: 0, new: 0, terminOpen: 0, documentsOpen: 0, freigabeOpen: 0, approved: 0, rejected: 0 }
    const statuses = data.map(d => d.status as OnboardingStatus)
    return {
      total: statuses.length,
      new: statuses.filter(s => s === 'neu').length,
      terminOpen: statuses.filter(s => ['termin_angeboten', 'termin_geplant'].includes(s)).length,
      documentsOpen: statuses.filter(s => ['dokumente_angefordert', 'dokumente_unvollstaendig'].includes(s)).length,
      freigabeOpen: statuses.filter(s => s === 'freigabe_offen').length,
      approved: statuses.filter(s => ['freigegeben', 'fahrer_erstellt', 'aktiv'].includes(s)).length,
      rejected: statuses.filter(s => s === 'abgelehnt').length
    }
  } catch { return { total: 0, new: 0, terminOpen: 0, documentsOpen: 0, freigabeOpen: 0, approved: 0, rejected: 0 } }
}

export function calculateDocumentProgress(documents: OnboardingDocument[]): { total: number; complete: number; pending: number; percent: number } {
  const total = documents.length
  const complete = documents.filter(d => d.status === 'geprueft' || d.status === 'nicht_erforderlich').length
  const pending = documents.filter(d => ['offen', 'angefordert', 'erhalten'].includes(d.status)).length
  return { total, complete, pending, percent: total > 0 ? Math.round((complete / total) * 100) : 0 }
}

export function getStatusesForType(type: CandidateType): OnboardingStatus[] {
  if (type === 'minijobber') return MINIJOBBER_STATUSES
  if (type === 'subcontractor') return SUBCONTRACTOR_STATUSES
  return ['neu', 'kontakt_aufgenommen', 'termin_angeboten', 'termin_geplant', 'gespraech_gefuehrt', 'geeignet', 'abgelehnt', 'archiviert']
}

export function getDocumentTypesForCandidateType(type: CandidateType): OnboardingDocumentType[] {
  if (type === 'minijobber') return MINIJOBBER_DOCUMENT_TYPES
  if (type === 'subcontractor') return SUBCONTRACTOR_DOCUMENT_TYPES
  return ['sonstiges']
}

// ============================================================
// COMMUNICATION FUNCTIONS (Phase 2)
// ============================================================

export const COMM_TYPE_LABELS: Record<OnboardingCommType, string> = {
  'erstkontakt': 'Erstkontakt',
  'terminangebot': 'Terminangebot',
  'teams_link': 'Teams-Link',
  'personalfragebogen': 'Personalfragebogen',
  'infomaterial': 'Infomaterial',
  'fehlende_dokumente': 'Fehlende Dokumente',
  'vertrag': 'Vertrag',
  'absage': 'Absage',
  'willkommen': 'Willkommen',
  'sonstiges': 'Sonstiges'
}

export const COMM_STATUS_LABELS: Record<OnboardingCommStatus, string> = {
  'prepared': 'Vorbereitet',
  'copied': 'Kopiert',
  'sent_manual': 'Manuell gesendet',
  'sent_auto': 'Automatisch gesendet'
}

/**
 * Holt alle Kommunikationen für einen Kandidaten
 */
export async function getCandidateCommunications(candidateId: string): Promise<OnboardingCommunication[]> {
  try {
    const { data, error } = await supabase
      .from('onboarding_communications')
      .select('*')
      .eq('candidate_id', candidateId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[Onboarding] Error loading communications:', error)
      return []
    }
    return (data || []) as OnboardingCommunication[]
  } catch (err) {
    console.error('[Onboarding] Error:', err)
    return []
  }
}

/**
 * Erstellt einen neuen Kommunikationseintrag
 */
export async function createCommunication(
  candidateId: string,
  commType: OnboardingCommType,
  subject: string | null,
  body: string,
  status: OnboardingCommStatus = 'prepared'
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Nicht authentifiziert' }

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single()

    const { data, error } = await supabase
      .from('onboarding_communications')
      .insert({
        candidate_id: candidateId,
        comm_type: commType,
        subject,
        body,
        status,
        created_by: user.id,
        created_by_name: profile?.full_name || null,
        sent_at: status === 'sent_manual' || status === 'sent_auto' ? new Date().toISOString() : null
      })
      .select('id')
      .single()

    if (error) return { success: false, error: error.message }

    await logAuditEvent({
      action: 'onboarding_communication_created',
      entityType: 'onboarding_communication',
      entityId: data.id,
      severity: 'info',
      afterData: { comm_type: commType, status }
    })

    return { success: true, id: data.id }
  } catch (err) {
    console.error('[Onboarding] Error creating communication:', err)
    return { success: false, error: 'Unerwarteter Fehler' }
  }
}

/**
 * Aktualisiert den Status einer Kommunikation (z.B. auf "copied" oder "sent_manual")
 */
export async function updateCommunicationStatus(
  commId: string,
  status: OnboardingCommStatus
): Promise<{ success: boolean; error?: string }> {
  try {
    const updateData: Record<string, unknown> = { status }
    if (status === 'sent_manual' || status === 'sent_auto') {
      updateData.sent_at = new Date().toISOString()
    }

    const { error } = await supabase
      .from('onboarding_communications')
      .update(updateData)
      .eq('id', commId)

    if (error) return { success: false, error: error.message }
    return { success: true }
  } catch (err) {
    return { success: false, error: 'Unerwarteter Fehler' }
  }
}

// ============================================================
// PUBLIC LINKS TYPES (Phase 3a)
// ============================================================

export type OnboardingLinkStatus = 'active' | 'used' | 'expired' | 'revoked'
export type OnboardingLinkPurpose = 'appointment_selection' | 'document_upload' | 'data_confirmation'

export interface OnboardingPublicLink {
  id: string
  candidate_id: string
  token: string
  purpose: OnboardingLinkPurpose
  status: OnboardingLinkStatus
  expires_at: string
  created_by: string | null
  created_by_name: string | null
  created_at: string
  used_at: string | null
}

export const LINK_STATUS_LABELS: Record<OnboardingLinkStatus, string> = {
  'active': 'Aktiv',
  'used': 'Verwendet',
  'expired': 'Abgelaufen',
  'revoked': 'Deaktiviert'
}

// ============================================================
// PUBLIC LINK FUNCTIONS (Phase 3a)
// ============================================================

/**
 * Generiert einen kryptisch starken Token (64 Hex-Zeichen = 256 bit)
 */
function generateSecureToken(): string {
  const array = new Uint8Array(32)
  if (typeof window !== 'undefined' && window.crypto) {
    window.crypto.getRandomValues(array)
  } else {
    // Fallback für Server-Side
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256)
    }
  }
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
}

/**
 * Holt alle Public Links für einen Kandidaten
 */
export async function getCandidatePublicLinks(candidateId: string): Promise<OnboardingPublicLink[]> {
  try {
    const { data, error } = await supabase
      .from('onboarding_public_links')
      .select('*')
      .eq('candidate_id', candidateId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[Onboarding] Error loading public links:', error)
      return []
    }
    return (data || []) as OnboardingPublicLink[]
  } catch (err) {
    console.error('[Onboarding] Error:', err)
    return []
  }
}

/**
 * Erstellt einen neuen Bewerberlink
 */
export async function createPublicLink(
  candidateId: string,
  purpose: OnboardingLinkPurpose = 'appointment_selection',
  expiresInDays: number = 7
): Promise<{ success: boolean; link?: OnboardingPublicLink; url?: string; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Nicht authentifiziert' }

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single()

    const token = generateSecureToken()
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + expiresInDays)

    const { data, error } = await supabase
      .from('onboarding_public_links')
      .insert({
        candidate_id: candidateId,
        token,
        purpose,
        status: 'active',
        expires_at: expiresAt.toISOString(),
        created_by: user.id,
        created_by_name: profile?.full_name || null
      })
      .select('*')
      .single()

    if (error) return { success: false, error: error.message }

    // URL generieren
    const baseUrl = typeof window !== 'undefined'
      ? window.location.origin
      : process.env.NEXT_PUBLIC_BASE_URL || 'https://transnext.netlify.app'
    const url = `${baseUrl}/onboarding/${token}`

    await logAuditEvent({
      action: 'onboarding_public_link_created',
      entityType: 'onboarding_public_link',
      entityId: data.id,
      severity: 'info',
      afterData: { purpose, expires_at: expiresAt.toISOString() }
    })

    return { success: true, link: data as OnboardingPublicLink, url }
  } catch (err) {
    console.error('[Onboarding] Error creating public link:', err)
    return { success: false, error: 'Unerwarteter Fehler' }
  }
}

/**
 * Deaktiviert einen Bewerberlink
 */
export async function revokePublicLink(linkId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('onboarding_public_links')
      .update({ status: 'revoked' })
      .eq('id', linkId)

    if (error) return { success: false, error: error.message }

    await logAuditEvent({
      action: 'onboarding_public_link_revoked',
      entityType: 'onboarding_public_link',
      entityId: linkId,
      severity: 'info'
    })

    return { success: true }
  } catch (err) {
    return { success: false, error: 'Unerwarteter Fehler' }
  }
}

/**
 * Prüft ob ein aktiver Link für einen Kandidaten existiert
 */
export async function getActivePublicLink(candidateId: string): Promise<OnboardingPublicLink | null> {
  try {
    const { data, error } = await supabase
      .from('onboarding_public_links')
      .select('*')
      .eq('candidate_id', candidateId)
      .eq('status', 'active')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error) return null
    return data as OnboardingPublicLink
  } catch {
    return null
  }
}

/**
 * Generiert die Bewerberlink-URL für einen bestehenden Link
 */
export function generatePublicLinkUrl(token: string): string {
  const baseUrl = typeof window !== 'undefined'
    ? window.location.origin
    : process.env.NEXT_PUBLIC_BASE_URL || 'https://transnext.netlify.app'
  return `${baseUrl}/onboarding/${token}`
}

// ============================================================
// PUBLIC API FUNCTIONS (für Bewerber ohne Auth)
// ============================================================

/**
 * Validiert einen Token und holt Kandidatendaten (für Bewerber)
 */
export async function getPublicCandidateByToken(token: string): Promise<{
  success: boolean
  error?: string
  message?: string
  already_used?: boolean
  link_id?: string
  expires_at?: string
  candidate?: {
    id: string
    first_name: string
    last_name: string
    email: string | null
    phone: string | null
    city: string | null
    termin_slot_1: string | null
    termin_slot_2: string | null
    termin_slot_3: string | null
    termin_gewaehlt: number | null
    appointment_selected_at?: string | null
  }
}> {
  try {
    const { data, error } = await supabase.rpc('get_candidate_by_public_token', { p_token: token })

    if (error) {
      console.error('[Onboarding] RPC error:', error)
      return { success: false, error: 'server_error', message: 'Serverfehler' }
    }

    return data as {
      success: boolean
      error?: string
      message?: string
      already_used?: boolean
      link_id?: string
      expires_at?: string
      candidate?: {
        id: string
        first_name: string
        last_name: string
        email: string | null
        phone: string | null
        city: string | null
        termin_slot_1: string | null
        termin_slot_2: string | null
        termin_slot_3: string | null
        termin_gewaehlt: number | null
        appointment_selected_at?: string | null
      }
    }
  } catch (err) {
    console.error('[Onboarding] Error:', err)
    return { success: false, error: 'server_error', message: 'Serverfehler' }
  }
}

/**
 * Speichert die Terminwahl des Bewerbers
 */
export async function submitAppointmentSelection(
  token: string,
  selectedSlot: number,
  email?: string | null,
  phone?: string | null,
  city?: string | null,
  comment?: string | null
): Promise<{
  success: boolean
  error?: string
  selected_slot?: number
  selected_date?: string
}> {
  try {
    const { data, error } = await supabase.rpc('submit_appointment_selection', {
      p_token: token,
      p_selected_slot: selectedSlot,
      p_email: email || null,
      p_phone: phone || null,
      p_city: city || null,
      p_comment: comment || null
    })

    if (error) {
      console.error('[Onboarding] RPC error:', error)
      return { success: false, error: 'server_error' }
    }

    return data as {
      success: boolean
      error?: string
      selected_slot?: number
      selected_date?: string
    }
  } catch (err) {
    console.error('[Onboarding] Error:', err)
    return { success: false, error: 'server_error' }
  }
}
