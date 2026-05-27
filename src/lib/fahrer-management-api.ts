/**
 * Fahrer Management API
 *
 * Erweiterte Funktionen für die Fahrerakte:
 * - Benutzerdaten bearbeiten (Name, Telefon)
 * - Passwort-Reset anfordern (via Supabase Edge Function)
 * - Fahrer-Dokumente (Upload-Center)
 * - Tankkarten
 * - Interne Notizen
 * - Compliance-Status berechnen
 *
 * Zugriffsrechte:
 * - Admin/GF/HR: Voller Zugriff
 * - Disponent: Nur Lesezugriff auf operative Daten
 * - Fahrer: Kein Zugriff auf Admin-Fahrerakte
 */

import { supabase } from './supabase'
import { logAuditEvent } from './audit-api'

// =====================================================
// TYPES
// =====================================================

export type DocumentType =
  | 'ausweis'
  | 'fuehrerschein'
  | 'uvv'
  | 'vertrag'
  | 'abmahnung'
  | 'schulung'
  | 'sonstiges'

export type DocumentStatus =
  | 'offen'
  | 'hochgeladen'
  | 'geprueft'
  | 'abgelehnt'
  | 'abgelaufen'
  | 'archiviert'

export interface FahrerDocument {
  id: string
  fahrer_id: string
  document_type: DocumentType
  file_name: string
  file_path: string
  file_size?: number
  mime_type?: string
  uploaded_at: string
  uploaded_by: string
  status: DocumentStatus
  expires_at?: string | null
  reviewed_at?: string | null
  reviewed_by?: string | null
  comment?: string | null
  archived_at?: string | null
  archived_by?: string | null
  archive_reason?: string | null
  created_at: string
  updated_at: string
}

export type FuelCardStatus =
  | 'aktiv'
  | 'gesperrt'
  | 'zurueckgegeben'
  | 'verloren'

export interface FahrerFuelCard {
  id: string
  fahrer_id: string
  provider: string
  card_number_last4: string
  issued_at?: string | null
  returned_at?: string | null
  status: FuelCardStatus
  comment?: string | null
  created_at: string
  updated_at: string
  created_by: string
  updated_by?: string | null
}

export type NoteCategory =
  | 'allgemein'
  | 'verhalten'
  | 'zuverlaessigkeit'
  | 'kommunikation'
  | 'schaden'
  | 'abmahnung'
  | 'positiv'
  | 'sonstiges'

export interface FahrerNote {
  id: string
  fahrer_id: string
  category: NoteCategory
  content: string
  is_important: boolean
  created_at: string
  created_by: string
  created_by_name?: string
  archived_at?: string | null
}

export interface FahrerUserData {
  user_id: string | null
  full_name: string
  email?: string
  phone?: string | null
  role?: string
  zeitmodell?: string | null
}

export interface ComplianceStatus {
  fuehrerschein: {
    vorhanden: boolean
    geprueft: boolean
    ablaufdatum?: string | null
    abgelaufen: boolean
  }
  ausweis: {
    vorhanden: boolean
    geprueft: boolean
    ablaufdatum?: string | null
    abgelaufen: boolean
  }
  uvv: {
    vorhanden: boolean
    geprueft: boolean
    ablaufdatum?: string | null
    abgelaufen: boolean
  }
  vertrag: {
    vorhanden: boolean
  }
  tankkarte: {
    vorhanden: boolean
    aktiv: boolean
  }
  fahrerStatus: {
    aktiv: boolean
    archiviert: boolean
  }
  gesamtStatus: 'vollstaendig' | 'unvollstaendig' | 'abgelaufen' | 'pruefen'
  offeneDokumente: number
  ablaufendeDokumente: number
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Ermittelt die Rolle des aktuell angemeldeten Benutzers.
 */
async function getCurrentUserRole(): Promise<'admin' | 'gf' | 'disponent' | 'fahrer' | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  return profile?.role as 'admin' | 'gf' | 'disponent' | 'fahrer' | null
}

/**
 * Prüft ob der aktuelle Benutzer Admin, GF oder HR ist.
 */
async function hasHRAccess(): Promise<boolean> {
  const role = await getCurrentUserRole()
  return role === 'admin' || role === 'gf'
  // TODO: HR-Rolle hinzufügen wenn implementiert
}

/**
 * Gibt den aktuellen User zurück
 */
async function getCurrentUserId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser()
  return user?.id || null
}

// =====================================================
// BENUTZERDATEN BEARBEITEN
// =====================================================

/**
 * Lädt die Benutzerdaten eines Fahrers
 */
export async function getFahrerUserData(fahrerId: string): Promise<FahrerUserData | null> {
  const { data: fahrer, error } = await supabase
    .from('fahrer')
    .select(`
      user_id,
      vorname,
      nachname,
      profiles:user_id (
        full_name,
        role,
        zeitmodell
      )
    `)
    .eq('id', fahrerId)
    .maybeSingle()

  if (error || !fahrer) {
    console.error('Fehler beim Laden der Fahrer-Benutzerdaten:', error)
    return null
  }

  // Hole E-Mail separat (wenn Admin-Zugriff)
  let email: string | undefined
  if (fahrer.user_id && await hasHRAccess()) {
    // Email aus auth.users ist nicht direkt zugreifbar
    // Wird über Edge Function geholt
    email = undefined // Muss via Edge Function geholt werden
  }

  // Supabase gibt profiles als Array oder Objekt zurück, je nach Relation
  const profileData = fahrer.profiles
  const profile = Array.isArray(profileData) ? profileData[0] : profileData as { full_name: string; role: string; zeitmodell: string | null } | null

  return {
    user_id: fahrer.user_id,
    full_name: profile?.full_name || `${fahrer.vorname} ${fahrer.nachname}`,
    email,
    phone: null, // TODO: phone in profiles hinzufügen wenn gewünscht
    role: profile?.role,
    zeitmodell: profile?.zeitmodell
  }
}

/**
 * Aktualisiert den Namen eines Fahrers (in fahrer UND profiles)
 */
export async function updateFahrerName(
  fahrerId: number,
  vorname: string,
  nachname: string
): Promise<{ success: boolean; error?: string }> {
  if (!(await hasHRAccess())) {
    return { success: false, error: 'Keine Berechtigung' }
  }

  const currentUserId = await getCurrentUserId()
  if (!currentUserId) {
    return { success: false, error: 'Nicht angemeldet' }
  }

  // Fahrer vor Update laden für Audit
  const { data: beforeFahrer, error: fetchError } = await supabase
    .from('fahrer')
    .select('id, vorname, nachname, user_id')
    .eq('id', fahrerId)
    .maybeSingle()

  if (fetchError || !beforeFahrer) {
    return { success: false, error: 'Fahrer nicht gefunden' }
  }

  // 1. Fahrer-Tabelle aktualisieren
  const { error: fahrerError } = await supabase
    .from('fahrer')
    .update({ vorname, nachname })
    .eq('id', fahrerId)

  if (fahrerError) {
    return { success: false, error: fahrerError.message }
  }

  // 2. Profiles-Tabelle aktualisieren (wenn user_id vorhanden)
  if (beforeFahrer.user_id) {
    const fullName = `${vorname} ${nachname}`
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ full_name: fullName })
      .eq('id', beforeFahrer.user_id)

    if (profileError) {
      console.error('Fehler beim Aktualisieren des Profils:', profileError)
      // Nicht als Fehler zurückgeben, da Fahrer-Tabelle bereits aktualisiert
    }
  }

  // Audit-Log
  await logAuditEvent({
    action: 'fahrer_name_updated',
    entityType: 'fahrer',
    entityId: fahrerId,
    entityLabel: `${vorname} ${nachname}`,
    severity: 'info',
    isFinancial: false,
    beforeData: {
      vorname: beforeFahrer.vorname,
      nachname: beforeFahrer.nachname
    },
    afterData: {
      vorname,
      nachname
    }
  })

  return { success: true }
}

/**
 * Aktualisiert das Zeitmodell eines Fahrers
 */
export async function updateFahrerZeitmodell(
  fahrerId: number,
  zeitmodell: 'minijob' | 'werkstudent' | 'teilzeit' | 'vollzeit'
): Promise<{ success: boolean; error?: string }> {
  if (!(await hasHRAccess())) {
    return { success: false, error: 'Keine Berechtigung' }
  }

  // Fahrer laden um user_id zu bekommen
  const { data: fahrer, error: fetchError } = await supabase
    .from('fahrer')
    .select('id, user_id, vorname, nachname')
    .eq('id', fahrerId)
    .maybeSingle()

  if (fetchError || !fahrer) {
    return { success: false, error: 'Fahrer nicht gefunden' }
  }

  // Altes Zeitmodell laden für Audit
  let oldZeitmodell: string | null = null
  if (fahrer.user_id) {
    const { data: oldProfile } = await supabase
      .from('profiles')
      .select('zeitmodell')
      .eq('id', fahrer.user_id)
      .maybeSingle()
    oldZeitmodell = oldProfile?.zeitmodell || null
  }

  // Profile aktualisieren
  if (fahrer.user_id) {
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ zeitmodell })
      .eq('id', fahrer.user_id)

    if (updateError) {
      return { success: false, error: updateError.message }
    }
  }

  // Audit-Log
  await logAuditEvent({
    action: 'fahrer_zeitmodell_updated',
    entityType: 'fahrer',
    entityId: fahrerId,
    entityLabel: `${fahrer.vorname} ${fahrer.nachname}`,
    severity: 'info',
    isFinancial: true,
    beforeData: { zeitmodell: oldZeitmodell },
    afterData: { zeitmodell }
  })

  return { success: true }
}

/**
 * Fordert einen Passwort-Reset für einen Fahrer an.
 * Sendet eine Reset-Email an die registrierte E-Mail-Adresse.
 *
 * HINWEIS: Dies nutzt die Supabase Edge Function, da der Client
 * keinen Zugriff auf auth.admin hat.
 */
export async function requestPasswordReset(
  fahrerId: number
): Promise<{ success: boolean; error?: string; message?: string }> {
  if (!(await hasHRAccess())) {
    return { success: false, error: 'Keine Berechtigung' }
  }

  // Fahrer laden
  const { data: fahrer, error: fetchError } = await supabase
    .from('fahrer')
    .select('id, user_id, vorname, nachname')
    .eq('id', fahrerId)
    .maybeSingle()

  if (fetchError || !fahrer || !fahrer.user_id) {
    return { success: false, error: 'Fahrer nicht gefunden oder kein Benutzerkonto verknüpft' }
  }

  // Rufe Edge Function auf
  const { data: result, error } = await supabase.functions.invoke('send-password-reset', {
    body: { user_id: fahrer.user_id }
  })

  if (error) {
    console.error('Fehler beim Passwort-Reset:', error)
    return { success: false, error: error.message || 'Fehler beim Senden des Reset-Links' }
  }

  if (!result?.success) {
    return { success: false, error: result?.error || 'Fehler beim Senden des Reset-Links' }
  }

  // Audit-Log
  await logAuditEvent({
    action: 'fahrer_password_reset_requested',
    entityType: 'fahrer',
    entityId: fahrerId,
    entityLabel: `${fahrer.vorname} ${fahrer.nachname}`,
    severity: 'warning',
    isFinancial: false,
    metadata: {
      method: 'email_reset_link'
    }
  })

  return {
    success: true,
    message: 'Passwort-Reset-Link wurde an die registrierte E-Mail-Adresse gesendet.'
  }
}

// =====================================================
// DOKUMENTE (UPLOAD-CENTER)
// =====================================================

const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  ausweis: 'Ausweis',
  fuehrerschein: 'Führerschein',
  uvv: 'UVV/Schulung',
  vertrag: 'Vertrag',
  abmahnung: 'Abmahnung',
  schulung: 'Schulungsnachweis',
  sonstiges: 'Sonstiges'
}

const DOCUMENT_STATUS_LABELS: Record<DocumentStatus, string> = {
  offen: 'Offen',
  hochgeladen: 'Hochgeladen',
  geprueft: 'Geprüft',
  abgelehnt: 'Abgelehnt',
  abgelaufen: 'Abgelaufen',
  archiviert: 'Archiviert'
}

export function getDocumentTypeLabel(type: DocumentType): string {
  return DOCUMENT_TYPE_LABELS[type] || type
}

export function getDocumentStatusLabel(status: DocumentStatus): string {
  return DOCUMENT_STATUS_LABELS[status] || status
}

/**
 * Lädt alle Dokumente eines Fahrers
 *
 * @param fahrerId - ID des Fahrers
 * @param includeArchived - Optional: Auch archivierte Dokumente laden (default: false)
 */
export async function getFahrerDocuments(
  fahrerId: string,
  includeArchived: boolean = false
): Promise<FahrerDocument[]> {
  if (!(await hasHRAccess())) {
    return []
  }

  let query = supabase
    .from('fahrer_documents')
    .select('*')
    .eq('fahrer_id', fahrerId)

  // Standardmäßig archivierte Dokumente ausblenden
  if (!includeArchived) {
    query = query.or('status.neq.archiviert,status.is.null')
  }

  const { data, error } = await query.order('created_at', { ascending: false })

  if (error) {
    console.error('Fehler beim Laden der Dokumente:', error)
    return []
  }

  return data || []
}

/**
 * Lädt ein einzelnes Dokument
 */
export async function getFahrerDocument(documentId: string): Promise<FahrerDocument | null> {
  if (!(await hasHRAccess())) {
    return null
  }

  const { data, error } = await supabase
    .from('fahrer_documents')
    .select('*')
    .eq('id', documentId)
    .maybeSingle()

  if (error) {
    console.error('Fehler beim Laden des Dokuments:', error)
    return null
  }

  return data
}

/**
 * Lädt ein Dokument hoch.
 *
 * WICHTIG: Nutzt serverseitigen Upload über API Route!
 * Der direkte Browser-Upload auf den fahrer-dokumente Bucket schlug fehl
 * mit net::ERR_FAILED / "Failed to fetch" trotz korrekter RLS-Policies.
 *
 * Die API Route nutzt den Service Role Key serverseitig, umgeht damit
 * potenzielle CORS/RLS-Probleme und bietet robustere Fehlerbehandlung.
 */
export async function uploadFahrerDocument(
  fahrerId: string,
  file: File,
  documentType: DocumentType,
  expiresAt?: string,
  comment?: string
): Promise<{ success: boolean; document?: FahrerDocument; error?: string }> {
  // 1. Client-seitige Validierung für schnelles Feedback
  const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/heic', 'image/heif']
  const isHeic = file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif')

  if (!allowedTypes.includes(file.type) && !isHeic && file.type !== '') {
    console.log('[uploadFahrerDocument] Ungültiger Dateityp:', file.type, file.name)
    return { success: false, error: `Dateityp "${file.type || 'unbekannt'}" nicht erlaubt. Nur PDF, JPG, PNG oder HEIC.` }
  }

  if (file.size > 50 * 1024 * 1024) { // 50MB
    return { success: false, error: 'Datei zu groß (max. 50MB)' }
  }

  if (file.size === 0) {
    return { success: false, error: 'Datei ist leer (0 Bytes)' }
  }

  // 2. Session Token holen für Authorization Header
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
  if (sessionError || !sessionData.session?.access_token) {
    console.error('[uploadFahrerDocument] Session ungültig:', sessionError)
    return {
      success: false,
      error: 'Sitzung abgelaufen. Bitte Seite neu laden und erneut anmelden.'
    }
  }

  const accessToken = sessionData.session.access_token

  // 3. FormData für Upload vorbereiten
  const formData = new FormData()
  formData.append('file', file)
  formData.append('fahrerId', fahrerId)
  formData.append('documentType', documentType)
  if (expiresAt) formData.append('expiresAt', expiresAt)
  if (comment) formData.append('comment', comment)

  // 4. Logging für Diagnose
  console.log('[uploadFahrerDocument] Server-Upload-Start:', {
    endpoint: '/api/admin/fahrer-documents/upload',
    fahrerId,
    documentType,
    fileName: file.name,
    fileSize: file.size,
    fileType: file.type,
    timestamp: new Date().toISOString()
  })

  // 5. Upload über API Route
  try {
    const response = await fetch('/api/admin/fahrer-documents/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      },
      body: formData
    })

    const result = await response.json()

    if (!response.ok || !result.success) {
      console.error('[uploadFahrerDocument] API-Fehler:', {
        status: response.status,
        statusText: response.statusText,
        error: result.error
      })
      return {
        success: false,
        error: result.error || `Server-Fehler: ${response.status}`
      }
    }

    console.log('[uploadFahrerDocument] Upload erfolgreich:', result.document)

    // Document-Objekt aus API-Antwort rekonstruieren
    const now = new Date().toISOString()
    const document: FahrerDocument = {
      id: result.document.id,
      fahrer_id: fahrerId,
      document_type: result.document.document_type as DocumentType,
      file_name: result.document.file_name,
      file_path: result.document.file_path,
      file_size: file.size,
      mime_type: file.type || 'application/octet-stream',
      uploaded_at: now,
      uploaded_by: sessionData.session.user.id,
      status: 'hochgeladen',
      created_at: now,
      updated_at: now
    }

    return { success: true, document }

  } catch (networkError: any) {
    console.error('[uploadFahrerDocument] Netzwerk-Exception:', {
      name: networkError?.name,
      message: networkError?.message,
      stack: networkError?.stack
    })

    if (networkError?.name === 'TypeError' || networkError?.message?.toLowerCase().includes('fetch')) {
      return {
        success: false,
        error: 'Netzwerkverbindung fehlgeschlagen. Bitte Internetverbindung prüfen und erneut versuchen.'
      }
    }

    return {
      success: false,
      error: `Unerwarteter Fehler: ${networkError?.message || 'Unbekannt'}`
    }
  }
}

/**
 * Aktualisiert den Status eines Dokuments (z.B. geprüft, abgelehnt)
 */
export async function updateDocumentStatus(
  documentId: string,
  status: DocumentStatus,
  comment?: string
): Promise<{ success: boolean; error?: string }> {
  if (!(await hasHRAccess())) {
    return { success: false, error: 'Keine Berechtigung' }
  }

  const currentUserId = await getCurrentUserId()
  if (!currentUserId) {
    return { success: false, error: 'Nicht angemeldet' }
  }

  const updateData: Partial<FahrerDocument> = {
    status,
    updated_at: new Date().toISOString()
  }

  if (status === 'geprueft' || status === 'abgelehnt') {
    updateData.reviewed_at = new Date().toISOString()
    updateData.reviewed_by = currentUserId
  }

  if (comment !== undefined) {
    updateData.comment = comment
  }

  const { error } = await supabase
    .from('fahrer_documents')
    .update(updateData)
    .eq('id', documentId)

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true }
}

/**
 * Archiviert ein Dokument (kein hartes Löschen mehr)
 *
 * Storage-Dateien werden NICHT gelöscht, um Datenintegrität zu gewährleisten.
 * Das Dokument erhält den Status 'archiviert' und ein archived_at Timestamp.
 * Archivierte Dokumente werden in der Standard-Ansicht nicht mehr angezeigt.
 */
export async function archiveDocument(
  documentId: string,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  if (!(await hasHRAccess())) {
    return { success: false, error: 'Keine Berechtigung' }
  }

  const currentUserId = await getCurrentUserId()
  if (!currentUserId) {
    return { success: false, error: 'Nicht angemeldet' }
  }

  // Dokument laden für Audit
  const { data: doc, error: fetchError } = await supabase
    .from('fahrer_documents')
    .select('*')
    .eq('id', documentId)
    .maybeSingle()

  if (fetchError || !doc) {
    return { success: false, error: 'Dokument nicht gefunden' }
  }

  // Status auf archiviert setzen (kein hartes Löschen!)
  const { error: updateError } = await supabase
    .from('fahrer_documents')
    .update({
      status: 'archiviert',
      archived_at: new Date().toISOString(),
      archived_by: currentUserId,
      archive_reason: reason || null,
      updated_at: new Date().toISOString()
    })
    .eq('id', documentId)

  if (updateError) {
    return { success: false, error: updateError.message }
  }

  // Audit-Log
  await logAuditEvent({
    action: 'fahrer_document_archived',
    entityType: 'fahrer_document',
    entityId: documentId,
    entityLabel: doc.file_name,
    severity: 'warning',
    isFinancial: false,
    beforeData: {
      status: doc.status
    },
    afterData: {
      status: 'archiviert'
    },
    metadata: {
      fahrer_id: doc.fahrer_id,
      document_type: doc.document_type,
      archive_reason: reason || null
    }
  })

  return { success: true }
}

/**
 * @deprecated Verwende archiveDocument statt deleteDocument
 * Hartes Löschen ist für sensible Fahrerakte-Dokumente nicht empfohlen.
 * Diese Funktion bleibt nur für Abwärtskompatibilität erhalten.
 */
export async function deleteDocument(
  documentId: string
): Promise<{ success: boolean; error?: string }> {
  // Leite auf archiveDocument um statt hartem Löschen
  return archiveDocument(documentId, 'Über deleteDocument aufgerufen')
}

/**
 * Generiert eine signierte URL für den Download
 */
export async function getDocumentDownloadUrl(
  documentId: string
): Promise<{ success: boolean; url?: string; error?: string }> {
  if (!(await hasHRAccess())) {
    return { success: false, error: 'Keine Berechtigung' }
  }

  const { data: doc, error: fetchError } = await supabase
    .from('fahrer_documents')
    .select('file_path')
    .eq('id', documentId)
    .maybeSingle()

  if (fetchError || !doc) {
    return { success: false, error: 'Dokument nicht gefunden' }
  }

  const { data, error } = await supabase.storage
    .from('fahrer-dokumente')
    .createSignedUrl(doc.file_path, 3600) // 1 Stunde gültig

  if (error) {
    return { success: false, error: 'Fehler beim Erstellen der Download-URL' }
  }

  return { success: true, url: data.signedUrl }
}

// =====================================================
// TANKKARTEN
// =====================================================

const FUEL_CARD_STATUS_LABELS: Record<FuelCardStatus, string> = {
  aktiv: 'Aktiv',
  gesperrt: 'Gesperrt',
  zurueckgegeben: 'Zurückgegeben',
  verloren: 'Verloren'
}

export function getFuelCardStatusLabel(status: FuelCardStatus): string {
  return FUEL_CARD_STATUS_LABELS[status] || status
}

/**
 * Lädt die Tankkarte eines Fahrers (es sollte max. eine aktive geben)
 */
export async function getFahrerFuelCard(fahrerId: string): Promise<FahrerFuelCard | null> {
  if (!(await hasHRAccess())) {
    return null
  }

  const { data, error } = await supabase
    .from('fahrer_fuel_cards')
    .select('*')
    .eq('fahrer_id', fahrerId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error && error.code !== 'PGRST116') { // PGRST116 = nicht gefunden
    console.error('Fehler beim Laden der Tankkarte:', error)
    return null
  }

  return data || null
}

/**
 * Erstellt oder aktualisiert die Tankkarte eines Fahrers
 */
export async function saveFahrerFuelCard(
  fahrerId: string,
  data: {
    provider: string
    card_number_last4: string
    issued_at?: string
    status: FuelCardStatus
    comment?: string
  }
): Promise<{ success: boolean; fuelCard?: FahrerFuelCard; error?: string }> {
  if (!(await hasHRAccess())) {
    return { success: false, error: 'Keine Berechtigung' }
  }

  const currentUserId = await getCurrentUserId()
  if (!currentUserId) {
    return { success: false, error: 'Nicht angemeldet' }
  }

  // Prüfen ob bereits eine Tankkarte existiert
  const existing = await getFahrerFuelCard(fahrerId)

  if (existing) {
    // Update
    const { data: updated, error } = await supabase
      .from('fahrer_fuel_cards')
      .update({
        ...data,
        updated_at: new Date().toISOString(),
        updated_by: currentUserId
      })
      .eq('id', existing.id)
      .select()
      .maybeSingle()

    if (error) {
      return { success: false, error: error.message }
    }

    // Audit-Log
    await logAuditEvent({
      action: 'fahrer_fuel_card_updated',
      entityType: 'fahrer_fuel_card',
      entityId: existing.id,
      entityLabel: `Tankkarte ${data.card_number_last4}`,
      severity: 'info',
      isFinancial: false,
      beforeData: {
        status: existing.status,
        provider: existing.provider
      },
      afterData: {
        status: data.status,
        provider: data.provider
      },
      metadata: { fahrer_id: fahrerId }
    })

    return { success: true, fuelCard: updated }
  } else {
    // Insert
    const { data: inserted, error } = await supabase
      .from('fahrer_fuel_cards')
      .insert({
        fahrer_id: fahrerId,
        ...data,
        created_by: currentUserId
      })
      .select()
      .maybeSingle()

    if (error) {
      return { success: false, error: error.message }
    }

    // Audit-Log
    await logAuditEvent({
      action: 'fahrer_fuel_card_created',
      entityType: 'fahrer_fuel_card',
      entityId: inserted.id,
      entityLabel: `Tankkarte ${data.card_number_last4}`,
      severity: 'info',
      isFinancial: false,
      metadata: { fahrer_id: fahrerId }
    })

    return { success: true, fuelCard: inserted }
  }
}

/**
 * Löscht eine Tankkarte
 */
export async function deleteFahrerFuelCard(
  fuelCardId: string
): Promise<{ success: boolean; error?: string }> {
  if (!(await hasHRAccess())) {
    return { success: false, error: 'Keine Berechtigung' }
  }

  const { error } = await supabase
    .from('fahrer_fuel_cards')
    .delete()
    .eq('id', fuelCardId)

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true }
}

// =====================================================
// INTERNE NOTIZEN
// =====================================================

const NOTE_CATEGORY_LABELS: Record<NoteCategory, string> = {
  allgemein: 'Allgemein',
  verhalten: 'Verhalten',
  zuverlaessigkeit: 'Zuverlässigkeit',
  kommunikation: 'Kommunikation',
  schaden: 'Schaden/Vorfall',
  abmahnung: 'Abmahnung',
  positiv: 'Positiv',
  sonstiges: 'Sonstiges'
}

export function getNoteCategoryLabel(category: NoteCategory): string {
  return NOTE_CATEGORY_LABELS[category] || category
}

/**
 * Lädt alle internen Notizen eines Fahrers
 */
export async function getFahrerNotes(fahrerId: string): Promise<FahrerNote[]> {
  if (!(await hasHRAccess())) {
    console.log('[getFahrerNotes] Kein HR-Zugriff, leere Liste zurückgegeben')
    return []
  }

  // Erst ohne Join laden, um RLS-Probleme beim profiles-JOIN zu vermeiden
  const { data, error } = await supabase
    .from('fahrer_notes')
    .select('*')
    .eq('fahrer_id', fahrerId)
    .is('archived_at', null)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Fehler beim Laden der Notizen:', error)
    console.error('Fehlerdetails:', { code: error.code, message: error.message, details: error.details })
    return []
  }

  if (!data || data.length === 0) {
    console.log('[getFahrerNotes] Keine Notizen gefunden für Fahrer:', fahrerId)
    return []
  }

  console.log('[getFahrerNotes] Geladene Notizen:', data.length)

  // Versuche Namen der Ersteller separat nachzuladen
  const creatorIds = [...new Set(data.map(n => n.created_by).filter(Boolean))]
  const creatorNames: Record<string, string> = {}

  if (creatorIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', creatorIds)

    if (profiles) {
      profiles.forEach(p => {
        creatorNames[p.id] = p.full_name
      })
    }
  }

  return data.map(note => ({
    ...note,
    created_by_name: creatorNames[note.created_by] || 'Unbekannt'
  }))
}

/**
 * Erstellt eine neue interne Notiz
 */
export async function createFahrerNote(
  fahrerId: string,
  category: NoteCategory,
  content: string,
  isImportant: boolean = false
): Promise<{ success: boolean; note?: FahrerNote; error?: string }> {
  if (!(await hasHRAccess())) {
    return { success: false, error: 'Keine Berechtigung' }
  }

  const currentUserId = await getCurrentUserId()
  if (!currentUserId) {
    return { success: false, error: 'Nicht angemeldet' }
  }

  const { data: note, error } = await supabase
    .from('fahrer_notes')
    .insert({
      fahrer_id: fahrerId,
      category,
      content,
      is_important: isImportant,
      created_by: currentUserId
    })
    .select()
    .maybeSingle()

  if (error) {
    console.error('DB-Fehler beim Notiz-Insert:', error)
    // Detaillierte Fehlermeldung
    let errorMessage = 'Fehler beim Speichern der Notiz'
    if (error.code === '42P01') {
      errorMessage = 'Tabelle "fahrer_notes" existiert nicht. Migration ausstehend.'
    } else if (error.code === '42501' || error.message?.includes('policy')) {
      errorMessage = 'Keine Berechtigung. Nur Admin/GF dürfen Notizen erstellen.'
    } else if (error.code === '23503') {
      errorMessage = 'Fahrer-ID ungültig oder Fahrer existiert nicht.'
    } else if (error.message) {
      errorMessage = `DB-Fehler: ${error.message}`
    }
    return { success: false, error: errorMessage }
  }

  // Audit-Log
  await logAuditEvent({
    action: 'fahrer_note_created',
    entityType: 'fahrer_note',
    entityId: note.id,
    entityLabel: `${getNoteCategoryLabel(category)}: ${content.substring(0, 50)}...`,
    severity: isImportant ? 'warning' : 'info',
    isFinancial: false,
    metadata: {
      fahrer_id: fahrerId,
      category,
      is_important: isImportant
    }
  })

  return { success: true, note }
}

/**
 * Archiviert eine Notiz (statt Löschen)
 */
export async function archiveFahrerNote(
  noteId: string
): Promise<{ success: boolean; error?: string }> {
  if (!(await hasHRAccess())) {
    return { success: false, error: 'Keine Berechtigung' }
  }

  const { error } = await supabase
    .from('fahrer_notes')
    .update({ archived_at: new Date().toISOString() })
    .eq('id', noteId)

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true }
}

// =====================================================
// COMPLIANCE-STATUS BERECHNEN
// =====================================================

/**
 * Berechnet den Compliance-Status eines Fahrers
 */
export async function calculateComplianceStatus(fahrerId: string): Promise<ComplianceStatus> {
  const today = new Date().toISOString().split('T')[0]

  // Standardwerte
  const status: ComplianceStatus = {
    fuehrerschein: { vorhanden: false, geprueft: false, abgelaufen: false },
    ausweis: { vorhanden: false, geprueft: false, abgelaufen: false },
    uvv: { vorhanden: false, geprueft: false, abgelaufen: false },
    vertrag: { vorhanden: false },
    tankkarte: { vorhanden: false, aktiv: false },
    fahrerStatus: { aktiv: false, archiviert: false },
    gesamtStatus: 'unvollstaendig',
    offeneDokumente: 0,
    ablaufendeDokumente: 0
  }

  // Fahrer-Status laden
  const { data: fahrer } = await supabase
    .from('fahrer')
    .select('status, archived_at, fuehrerschein_nr, ausweis_ablauf')
    .eq('id', fahrerId)
    .maybeSingle()

  if (fahrer) {
    status.fahrerStatus.aktiv = fahrer.status === 'aktiv'
    status.fahrerStatus.archiviert = !!fahrer.archived_at

    // Führerschein aus Stammdaten
    if (fahrer.fuehrerschein_nr) {
      status.fuehrerschein.vorhanden = true
      // Kein Ablaufdatum in Stammdaten, prüfe Dokumente
    }

    // Ausweis-Ablauf aus Stammdaten
    if (fahrer.ausweis_ablauf) {
      status.ausweis.ablaufdatum = fahrer.ausweis_ablauf
      status.ausweis.vorhanden = true
      status.ausweis.abgelaufen = fahrer.ausweis_ablauf < today
    }
  }

  // Dokumente laden (nur für HR-Zugriff)
  if (await hasHRAccess()) {
    const documents = await getFahrerDocuments(fahrerId)

    for (const doc of documents) {
      const isExpired = doc.expires_at ? doc.expires_at < today : false
      const isPending = doc.status === 'offen' || doc.status === 'hochgeladen'

      if (doc.document_type === 'fuehrerschein') {
        status.fuehrerschein.vorhanden = true
        status.fuehrerschein.geprueft = doc.status === 'geprueft'
        status.fuehrerschein.ablaufdatum = doc.expires_at
        status.fuehrerschein.abgelaufen = isExpired
      } else if (doc.document_type === 'ausweis') {
        status.ausweis.vorhanden = true
        status.ausweis.geprueft = doc.status === 'geprueft'
        if (doc.expires_at) {
          status.ausweis.ablaufdatum = doc.expires_at
          status.ausweis.abgelaufen = isExpired
        }
      } else if (doc.document_type === 'uvv' || doc.document_type === 'schulung') {
        status.uvv.vorhanden = true
        status.uvv.geprueft = doc.status === 'geprueft'
        status.uvv.ablaufdatum = doc.expires_at
        status.uvv.abgelaufen = isExpired
      } else if (doc.document_type === 'vertrag') {
        status.vertrag.vorhanden = true
      }

      if (isPending) {
        status.offeneDokumente++
      }

      // Ablaufende Dokumente (innerhalb 30 Tage)
      if (doc.expires_at) {
        const expiresDate = new Date(doc.expires_at)
        const thirtyDaysFromNow = new Date()
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)
        if (expiresDate <= thirtyDaysFromNow && expiresDate > new Date()) {
          status.ablaufendeDokumente++
        }
      }
    }

    // Tankkarte laden
    const fuelCard = await getFahrerFuelCard(fahrerId)
    if (fuelCard) {
      status.tankkarte.vorhanden = true
      status.tankkarte.aktiv = fuelCard.status === 'aktiv'
    }
  }

  // Gesamtstatus berechnen
  const hasExpired = status.fuehrerschein.abgelaufen || status.ausweis.abgelaufen || status.uvv.abgelaufen
  const isComplete = status.fuehrerschein.vorhanden && status.ausweis.vorhanden && status.vertrag.vorhanden
  const needsReview = status.offeneDokumente > 0 || status.ablaufendeDokumente > 0

  if (hasExpired) {
    status.gesamtStatus = 'abgelaufen'
  } else if (needsReview) {
    status.gesamtStatus = 'pruefen'
  } else if (isComplete) {
    status.gesamtStatus = 'vollstaendig'
  } else {
    status.gesamtStatus = 'unvollstaendig'
  }

  return status
}
