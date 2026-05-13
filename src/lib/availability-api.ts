/**
 * Availability API - verwendet bestehende DB-Strukturen
 * - Admin/GF/Disponent: Zugriff auf driver_availability
 * - Disponent: Kann bestätigen, aber keine Zeiten ändern
 */

import { supabase } from "./supabase"

export type AvailabilityStatus = 'not_submitted' | 'submitted' | 'changed_after_deadline' | 'confirmed_by_dispo'
export type PreferredTourType = 'short' | 'long' | 'any' | null

export interface DriverAvailability {
  id: string
  user_id: string
  fahrer_id: string
  week_start_date: string
  date: string
  is_available: boolean
  available_from: string | null
  available_until: string | null
  time_restriction_note: string | null
  preferred_tour_type: PreferredTourType
  note: string | null
  availability_status: AvailabilityStatus
  submitted_at: string | null
  updated_at: string
  changed_by: string | null
  created_at: string
  // Joined data
  fahrer_name?: string
}

/**
 * Lädt Verfügbarkeiten für eine bestimmte Woche
 */
export async function getAvailabilityForWeek(weekStartDate: string): Promise<DriverAvailability[]> {
  const { data, error } = await supabase
    .from('driver_availability')
    .select(`
      *,
      fahrer:fahrer_id (
        id,
        profiles:user_id (full_name)
      )
    `)
    .eq('week_start_date', weekStartDate)
    .order('date', { ascending: true })

  if (error) {
    console.error('Fehler beim Laden der Verfügbarkeiten:', error)
    throw new Error(error.message)
  }

  return (data || []).map(a => ({
    ...a,
    fahrer_name: a.fahrer?.profiles?.full_name || 'Unbekannt'
  }))
}

/**
 * Lädt alle Verfügbarkeiten für aktuelle und kommende Wochen
 */
export async function getUpcomingAvailability(): Promise<DriverAvailability[]> {
  const today = new Date()
  const startOfWeek = new Date(today)
  startOfWeek.setDate(today.getDate() - today.getDay() + 1) // Montag
  const weekStart = startOfWeek.toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('driver_availability')
    .select(`
      *,
      fahrer:fahrer_id (
        id,
        profiles:user_id (full_name)
      )
    `)
    .gte('week_start_date', weekStart)
    .order('week_start_date', { ascending: true })
    .order('date', { ascending: true })

  if (error) {
    console.error('Fehler beim Laden der Verfügbarkeiten:', error)
    throw new Error(error.message)
  }

  return (data || []).map(a => ({
    ...a,
    fahrer_name: a.fahrer?.profiles?.full_name || 'Unbekannt'
  }))
}

/**
 * Lädt alle Verfügbarkeiten (für Admin-Übersicht)
 */
export async function getAllAvailability(limit = 200): Promise<DriverAvailability[]> {
  const { data, error } = await supabase
    .from('driver_availability')
    .select(`
      *,
      fahrer:fahrer_id (
        id,
        profiles:user_id (full_name)
      )
    `)
    .order('date', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Fehler beim Laden der Verfügbarkeiten:', error)
    throw new Error(error.message)
  }

  return (data || []).map(a => ({
    ...a,
    fahrer_name: a.fahrer?.profiles?.full_name || 'Unbekannt'
  }))
}

/**
 * Bestätigt eine Verfügbarkeit (Disponent/Admin) - nutzt vorhandene RPC
 */
export async function confirmAvailability(availabilityId: string, note?: string): Promise<void> {
  const { error } = await supabase.rpc('confirm_driver_availability', {
    p_availability_id: availabilityId,
    p_note: note || null
  })

  if (error) {
    console.error('Fehler beim Bestätigen der Verfügbarkeit:', error)
    throw new Error(error.message)
  }
}

/**
 * Formatierung für Status
 */
export function formatAvailabilityStatus(status: AvailabilityStatus): string {
  switch (status) {
    case 'not_submitted': return 'Nicht eingereicht'
    case 'submitted': return 'Eingereicht'
    case 'changed_after_deadline': return 'Nachträglich geändert'
    case 'confirmed_by_dispo': return 'Bestätigt'
    default: return status
  }
}

/**
 * Farben für Status
 */
export function getAvailabilityStatusColors(status: AvailabilityStatus): {
  bg: string
  text: string
  border: string
} {
  switch (status) {
    case 'confirmed_by_dispo':
      return { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' }
    case 'submitted':
      return { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' }
    case 'changed_after_deadline':
      return { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' }
    case 'not_submitted':
    default:
      return { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' }
  }
}

/**
 * Formatierung für Tour-Typ
 */
export function formatTourType(type: PreferredTourType): string {
  switch (type) {
    case 'short': return 'Kurze Touren'
    case 'long': return 'Lange Touren'
    case 'any': return 'Alle Touren'
    default: return '-'
  }
}

/**
 * Berechnet Wochenstart (Montag) für ein Datum
 */
export function getWeekStart(date: Date): string {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  return d.toISOString().split('T')[0]
}

/**
 * Generiert Wochenoptionen für Filter
 */
export function generateWeekOptions(weeksBack = 4, weeksAhead = 8): { value: string; label: string }[] {
  const options: { value: string; label: string }[] = []
  const today = new Date()

  for (let i = -weeksBack; i <= weeksAhead; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() + (i * 7))
    const weekStart = getWeekStart(d)
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekEnd.getDate() + 6)

    const label = `KW ${getWeekNumber(new Date(weekStart))}: ${formatDateShort(weekStart)} - ${formatDateShort(weekEnd.toISOString().split('T')[0])}`
    options.push({ value: weekStart, label })
  }

  return options
}

/**
 * Kalenderwoche ermitteln
 */
function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}

/**
 * Kurzes Datumsformat
 */
function formatDateShort(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })
}

// ============================================================
// FAHRER-FUNKTIONEN (eigene Verfügbarkeit)
// ============================================================

/**
 * Lädt eigene Verfügbarkeiten für einen Fahrer (aktuelle + kommende Wochen)
 */
export async function getMyAvailability(userId: string): Promise<DriverAvailability[]> {
  const today = new Date()
  const startOfWeek = new Date(today)
  startOfWeek.setDate(today.getDate() - today.getDay() + 1) // Montag
  // 2 Wochen zurück als Buffer
  startOfWeek.setDate(startOfWeek.getDate() - 14)
  const weekStart = startOfWeek.toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('driver_availability')
    .select('*')
    .eq('user_id', userId)
    .gte('week_start_date', weekStart)
    .order('date', { ascending: true })

  if (error) {
    console.error('Fehler beim Laden der eigenen Verfügbarkeiten:', error)
    throw new Error(error.message)
  }

  return data || []
}

/**
 * Speichert/aktualisiert Verfügbarkeit für einen Tag (Fahrer)
 */
export async function saveMyAvailability(
  userId: string,
  fahrerId: string,
  data: {
    date: string
    weekStartDate: string
    isAvailable: boolean
    availableFrom?: string | null
    availableUntil?: string | null
    timeRestrictionNote?: string | null
    preferredTourType?: PreferredTourType
    note?: string | null
  }
): Promise<DriverAvailability> {
  // Prüfe ob schon ein Eintrag existiert
  const { data: existing } = await supabase
    .from('driver_availability')
    .select('id, availability_status, submitted_at')
    .eq('user_id', userId)
    .eq('date', data.date)
    .single()

  // Bestimme Status: Wenn bereits eingereicht und Deadline überschritten, markiere als geändert
  let newStatus: AvailabilityStatus = 'submitted'
  if (existing && existing.availability_status === 'confirmed_by_dispo') {
    // Einmal bestätigt -> nachträgliche Änderung
    newStatus = 'changed_after_deadline'
  } else if (existing && existing.submitted_at) {
    // War schon eingereicht, aber nicht bestätigt -> prüfe ob Deadline überschritten
    // Deadline: Donnerstag 18:00 vor der Woche
    const deadline = getWeekDeadline(data.weekStartDate)
    if (new Date() > deadline) {
      newStatus = 'changed_after_deadline'
    }
  }

  const record = {
    user_id: userId,
    fahrer_id: fahrerId,
    date: data.date,
    week_start_date: data.weekStartDate,
    is_available: data.isAvailable,
    available_from: data.availableFrom || null,
    available_until: data.availableUntil || null,
    time_restriction_note: data.timeRestrictionNote || null,
    preferred_tour_type: data.preferredTourType || null,
    note: data.note || null,
    availability_status: newStatus,
    submitted_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }

  if (existing) {
    // Update
    const { data: updated, error } = await supabase
      .from('driver_availability')
      .update(record)
      .eq('id', existing.id)
      .select()
      .single()

    if (error) {
      console.error('Fehler beim Aktualisieren der Verfügbarkeit:', error)
      throw new Error(error.message)
    }

    return updated
  } else {
    // Insert
    const { data: inserted, error } = await supabase
      .from('driver_availability')
      .insert(record)
      .select()
      .single()

    if (error) {
      console.error('Fehler beim Speichern der Verfügbarkeit:', error)
      throw new Error(error.message)
    }

    return inserted
  }
}

/**
 * Speichert Verfügbarkeit für eine ganze Woche (Batch)
 */
export async function saveWeekAvailability(
  userId: string,
  fahrerId: string,
  weekStartDate: string,
  days: Array<{
    date: string
    isAvailable: boolean
    availableFrom?: string | null
    availableUntil?: string | null
    timeRestrictionNote?: string | null
    preferredTourType?: PreferredTourType
    note?: string | null
  }>
): Promise<void> {
  for (const day of days) {
    await saveMyAvailability(userId, fahrerId, {
      ...day,
      weekStartDate
    })
  }
}

/**
 * Berechnet Deadline für eine Woche (Donnerstag 18:00 vor der Woche)
 */
export function getWeekDeadline(weekStartDate: string): Date {
  const weekStart = new Date(weekStartDate)
  // Donnerstag der Vorwoche = weekStart (Montag) - 4 Tage
  const deadline = new Date(weekStart)
  deadline.setDate(deadline.getDate() - 4)
  deadline.setHours(18, 0, 0, 0)
  return deadline
}

/**
 * Prüft ob Deadline für eine Woche überschritten ist
 */
export function isDeadlinePassed(weekStartDate: string): boolean {
  const deadline = getWeekDeadline(weekStartDate)
  return new Date() > deadline
}

/**
 * Generiert Tage für eine Woche
 */
export function generateWeekDays(weekStartDate: string): Array<{
  date: string
  dayName: string
  dayShort: string
  dateDisplay: string
}> {
  const days: Array<{
    date: string
    dayName: string
    dayShort: string
    dateDisplay: string
  }> = []
  const weekStart = new Date(weekStartDate)

  const dayNames = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag']
  const dayShorts = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']

  for (let i = 0; i < 7; i++) {
    const date = new Date(weekStart)
    date.setDate(weekStart.getDate() + i)
    days.push({
      date: date.toISOString().split('T')[0],
      dayName: dayNames[i],
      dayShort: dayShorts[i],
      dateDisplay: date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })
    })
  }

  return days
}
