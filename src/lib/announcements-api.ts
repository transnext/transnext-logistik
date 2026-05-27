/**
 * Announcements API - System-Hinweise / News
 *
 * Ermöglicht das Erstellen, Bearbeiten und Abrufen von Hinweisen
 * für Admin-Dashboard und Fahrerportal.
 *
 * Rollenberechtigung:
 * - Admin/GF: Alle Hinweise sehen, erstellen, bearbeiten, archivieren
 * - Disponent: Nur relevante Hinweise lesen (disponent, all_admin, all)
 * - Fahrer: Nur Fahrer-Hinweise lesen (fahrer, all)
 */

import { supabase } from "./supabase"
import { logAuditEvent } from "./audit-api"

// ============================================================
// TYPES
// ============================================================

export type AnnouncementTarget = 
  | 'admin_gf'      // Nur Admin/GF
  | 'disponent'     // Nur Disponenten
  | 'all_admin'     // Alle Adminportal-Nutzer
  | 'fahrer'        // Nur Fahrer
  | 'all'           // Alle

export type AnnouncementPriority = 'normal' | 'important' | 'critical'

export type AnnouncementStatus = 'active' | 'archived'

export interface Announcement {
  id: string
  title: string
  content: string
  target: AnnouncementTarget
  priority: AnnouncementPriority
  visible_from: string
  visible_until: string | null
  status: AnnouncementStatus
  created_by: string
  created_by_name: string | null
  created_at: string
  updated_at: string
  archived_at: string | null
  archived_by: string | null
}

export interface CreateAnnouncementData {
  title: string
  content: string
  target: AnnouncementTarget
  priority: AnnouncementPriority
  visible_from?: string      // Default: jetzt
  visible_until?: string | null
}

export interface UpdateAnnouncementData {
  title?: string
  content?: string
  target?: AnnouncementTarget
  priority?: AnnouncementPriority
  visible_from?: string
  visible_until?: string | null
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Holt den aktuellen Benutzernamen aus dem Profil
 */
async function getCurrentUserName(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return 'System'

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single()

  return profile?.full_name || 'Unbekannt'
}

// ============================================================
// READ FUNCTIONS
// ============================================================

/**
 * Lädt alle aktiven Hinweise für das Admin-Dashboard.
 * 
 * RLS filtert automatisch basierend auf Rolle:
 * - Admin/GF: Alle Hinweise
 * - Disponent: disponent, all_admin, all
 * - Fahrer: fahrer, all
 */
export async function getActiveAnnouncements(): Promise<Announcement[]> {
  const { data, error } = await supabase
    .from('system_announcements')
    .select('*')
    .eq('status', 'active')
    .lte('visible_from', new Date().toISOString())
    .or('visible_until.is.null,visible_until.gt.' + new Date().toISOString())
    .order('priority', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[Announcements] Fehler beim Laden:', error.message)
    return []
  }

  return data || []
}

/**
 * Lädt alle Hinweise (inkl. archivierte) für Admin-Verwaltung.
 * Nur für Admin/GF.
 */
export async function getAllAnnouncements(
  includeArchived = false
): Promise<Announcement[]> {
  let query = supabase
    .from('system_announcements')
    .select('*')
    .order('created_at', { ascending: false })

  if (!includeArchived) {
    query = query.eq('status', 'active')
  }

  const { data, error } = await query

  if (error) {
    console.error('[Announcements] Fehler beim Laden aller Hinweise:', error.message)
    return []
  }

  return data || []
}

/**
 * Lädt einen einzelnen Hinweis nach ID.
 */
export async function getAnnouncementById(id: string): Promise<Announcement | null> {
  const { data, error } = await supabase
    .from('system_announcements')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    console.error('[Announcements] Fehler beim Laden:', error.message)
    return null
  }

  return data
}

/**
 * Lädt aktive Hinweise für das Fahrerportal.
 * Filtert nur auf target 'fahrer' oder 'all'.
 */
export async function getFahrerAnnouncements(): Promise<Announcement[]> {
  const { data, error } = await supabase
    .from('system_announcements')
    .select('*')
    .eq('status', 'active')
    .in('target', ['fahrer', 'all'])
    .lte('visible_from', new Date().toISOString())
    .or('visible_until.is.null,visible_until.gt.' + new Date().toISOString())
    .order('priority', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[Announcements] Fehler beim Laden für Fahrer:', error.message)
    return []
  }

  return data || []
}

// ============================================================
// WRITE FUNCTIONS (Admin/GF only)
// ============================================================

/**
 * Erstellt einen neuen Hinweis.
 * Nur für Admin/GF.
 */
export async function createAnnouncement(
  data: CreateAnnouncementData
): Promise<Announcement | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    console.error('[Announcements] Nicht angemeldet')
    return null
  }

  const userName = await getCurrentUserName()

  const insertData = {
    title: data.title.trim(),
    content: data.content.trim(),
    target: data.target,
    priority: data.priority,
    visible_from: data.visible_from || new Date().toISOString(),
    visible_until: data.visible_until || null,
    status: 'active' as const,
    created_by: user.id,
    created_by_name: userName
  }

  const { data: result, error } = await supabase
    .from('system_announcements')
    .insert([insertData])
    .select()
    .single()

  if (error) {
    console.error('[Announcements] Fehler beim Erstellen:', error.message)
    throw new Error(`Hinweis konnte nicht erstellt werden: ${error.message}`)
  }

  // Audit-Log
  await logAuditEvent({
    action: 'announcement_created',
    entityType: 'announcement',
    entityId: result.id,
    entityLabel: result.title,
    afterData: {
      title: result.title,
      target: result.target,
      priority: result.priority,
      visible_until: result.visible_until
    },
    severity: result.priority === 'critical' ? 'warning' : 'info'
  })

  return result
}

/**
 * Aktualisiert einen Hinweis.
 * Nur für Admin/GF.
 */
export async function updateAnnouncement(
  id: string,
  data: UpdateAnnouncementData
): Promise<Announcement | null> {
  // Vorherigen Zustand laden
  const before = await getAnnouncementById(id)
  if (!before) {
    throw new Error('Hinweis nicht gefunden')
  }

  const updateData: Record<string, unknown> = {}
  
  if (data.title !== undefined) updateData.title = data.title.trim()
  if (data.content !== undefined) updateData.content = data.content.trim()
  if (data.target !== undefined) updateData.target = data.target
  if (data.priority !== undefined) updateData.priority = data.priority
  if (data.visible_from !== undefined) updateData.visible_from = data.visible_from
  if (data.visible_until !== undefined) updateData.visible_until = data.visible_until

  const { data: result, error } = await supabase
    .from('system_announcements')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('[Announcements] Fehler beim Aktualisieren:', error.message)
    throw new Error(`Hinweis konnte nicht aktualisiert werden: ${error.message}`)
  }

  // Audit-Log
  await logAuditEvent({
    action: 'announcement_updated',
    entityType: 'announcement',
    entityId: id,
    entityLabel: result.title,
    beforeData: {
      title: before.title,
      target: before.target,
      priority: before.priority
    },
    afterData: updateData,
    severity: 'info'
  })

  return result
}

/**
 * Archiviert einen Hinweis (soft delete).
 * Nur für Admin/GF.
 */
export async function archiveAnnouncement(id: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Nicht angemeldet')
  }

  const before = await getAnnouncementById(id)
  if (!before) {
    throw new Error('Hinweis nicht gefunden')
  }

  const { error } = await supabase
    .from('system_announcements')
    .update({
      status: 'archived',
      archived_at: new Date().toISOString(),
      archived_by: user.id
    })
    .eq('id', id)

  if (error) {
    console.error('[Announcements] Fehler beim Archivieren:', error.message)
    throw new Error(`Hinweis konnte nicht archiviert werden: ${error.message}`)
  }

  // Audit-Log
  await logAuditEvent({
    action: 'announcement_archived',
    entityType: 'announcement',
    entityId: id,
    entityLabel: before.title,
    beforeData: { status: before.status },
    afterData: { status: 'archived' },
    severity: 'info'
  })
}

/**
 * Reaktiviert einen archivierten Hinweis.
 * Nur für Admin/GF.
 */
export async function reactivateAnnouncement(id: string): Promise<void> {
  const before = await getAnnouncementById(id)
  if (!before) {
    throw new Error('Hinweis nicht gefunden')
  }

  const { error } = await supabase
    .from('system_announcements')
    .update({
      status: 'active',
      archived_at: null,
      archived_by: null
    })
    .eq('id', id)

  if (error) {
    console.error('[Announcements] Fehler beim Reaktivieren:', error.message)
    throw new Error(`Hinweis konnte nicht reaktiviert werden: ${error.message}`)
  }

  // Audit-Log
  await logAuditEvent({
    action: 'announcement_reactivated',
    entityType: 'announcement',
    entityId: id,
    entityLabel: before.title,
    beforeData: { status: 'archived' },
    afterData: { status: 'active' },
    severity: 'info'
  })
}

// ============================================================
// FORMATTING HELPERS
// ============================================================

/**
 * Formatiert Zielgruppe für Anzeige
 */
export function formatAnnouncementTarget(target: AnnouncementTarget): string {
  const labels: Record<AnnouncementTarget, string> = {
    'admin_gf': 'Admin/GF',
    'disponent': 'Disponenten',
    'all_admin': 'Alle Adminportal-Nutzer',
    'fahrer': 'Fahrer',
    'all': 'Alle'
  }
  return labels[target] || target
}

/**
 * Formatiert Priorität für Anzeige
 */
export function formatAnnouncementPriority(priority: AnnouncementPriority): string {
  const labels: Record<AnnouncementPriority, string> = {
    'normal': 'Normal',
    'important': 'Wichtig',
    'critical': 'Kritisch'
  }
  return labels[priority] || priority
}

/**
 * Gibt Styling für Priorität zurück
 */
export function getAnnouncementPriorityStyle(priority: AnnouncementPriority): {
  bg: string
  text: string
  border: string
  icon: string
} {
  switch (priority) {
    case 'critical':
      return {
        bg: 'bg-red-50',
        text: 'text-red-900',
        border: 'border-red-200',
        icon: 'text-red-600'
      }
    case 'important':
      return {
        bg: 'bg-amber-50',
        text: 'text-amber-900',
        border: 'border-amber-200',
        icon: 'text-amber-600'
      }
    default:
      return {
        bg: 'bg-blue-50',
        text: 'text-blue-900',
        border: 'border-blue-200',
        icon: 'text-blue-600'
      }
  }
}

/**
 * Formatiert Datum für Anzeige
 */
export function formatAnnouncementDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

/**
 * Formatiert Datum und Zeit für Anzeige
 */
export function formatAnnouncementDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

/**
 * Prüft ob ein Hinweis aktuell sichtbar ist
 */
export function isAnnouncementVisible(announcement: Announcement): boolean {
  const now = new Date()
  const visibleFrom = new Date(announcement.visible_from)
  const visibleUntil = announcement.visible_until ? new Date(announcement.visible_until) : null

  if (announcement.status !== 'active') return false
  if (visibleFrom > now) return false
  if (visibleUntil && visibleUntil < now) return false

  return true
}

/**
 * Zielgruppen-Optionen für Select
 */
export const ANNOUNCEMENT_TARGET_OPTIONS = [
  { value: 'admin_gf', label: 'Admin/GF' },
  { value: 'disponent', label: 'Disponenten' },
  { value: 'all_admin', label: 'Alle Adminportal-Nutzer' },
  { value: 'fahrer', label: 'Fahrer (Fahrerportal)' },
  { value: 'all', label: 'Alle (Admin + Fahrer)' }
] as const

/**
 * Prioritäts-Optionen für Select
 */
export const ANNOUNCEMENT_PRIORITY_OPTIONS = [
  { value: 'normal', label: 'Normal' },
  { value: 'important', label: 'Wichtig' },
  { value: 'critical', label: 'Kritisch' }
] as const
