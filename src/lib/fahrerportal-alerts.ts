/**
 * Fahrerportal Alerts API
 *
 * Berechnet operative Alerts für das Fahrerportal-Dashboard.
 * Diese Alerts zeigen dem Fahrer seine offenen Aufgaben an.
 *
 * WICHTIG: KEINE Dokumenten-/Compliance-Alerts!
 * - Keine Führerschein-Ablauf-Warnungen
 * - Keine UVV/Schulungs-Erinnerungen
 * - Keine Fahrerakte-Hinweise
 *
 * Nur operative Aufgaben:
 * - Verfügbarkeit melden
 * - Offene Touren
 * - Arbeitsnachweise hochladen
 * - Abgelehnte Nachweise prüfen
 */

import { supabase } from './supabase'
import { isHoliday, isWeekdayMoFr } from './holidays'
import { getWeekStart, isDeadlinePassed, getWeekDeadline } from './availability-api'
import type { Tour, TourStatus, Arbeitsnachweis, Auslagennachweis } from './supabase'

// =====================================================
// TYPES
// =====================================================

export type FahrerAlertPriority = 'high' | 'medium' | 'low'

export type FahrerAlertType =
  | 'verfuegbarkeit_fehlt'
  | 'verfuegbarkeit_deadline_ueberschritten'
  | 'tour_offen'
  | 'protokoll_offen'
  | 'arbeitsnachweis_fehlt'
  | 'arbeitsnachweis_abgelehnt'
  | 'auslage_abgelehnt'

export interface FahrerAlert {
  id: string
  type: FahrerAlertType
  priority: FahrerAlertPriority
  title: string
  message: string
  actionLabel: string
  actionHref: string
  /** Details für Anzeige */
  details?: {
    count?: number
    tourNummer?: string | number
    datum?: string
    grund?: string
    betrag?: number
  }
}

export interface FahrerAlertsResult {
  alerts: FahrerAlert[]
  summary: {
    high: number
    medium: number
    total: number
  }
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Berechnet den Start der nächsten Woche (kommender Montag)
 */
function getNextWeekStart(): string {
  const today = new Date()
  const dayOfWeek = today.getDay()
  // Wenn heute Sonntag (0), dann ist nächster Montag +1 Tag
  // Wenn heute Montag (1), dann ist nächster Montag +7 Tage
  // usw.
  const daysUntilNextMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek
  const nextMonday = new Date(today)
  nextMonday.setDate(today.getDate() + daysUntilNextMonday)
  return nextMonday.toISOString().split('T')[0]
}

/**
 * Berechnet den Start der aktuellen Woche (aktueller Montag)
 */
function getCurrentWeekStart(): string {
  return getWeekStart(new Date())
}

/**
 * Formatiert ein Datum für Anzeige
 */
function formatDateDE(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

/**
 * Generiert die Werktage (Mo-Fr) für eine Woche, ohne Feiertage
 */
function getWorkdaysForWeek(weekStartDate: string): string[] {
  const days: string[] = []
  const weekStart = new Date(weekStartDate)

  for (let i = 0; i < 5; i++) { // Mo-Fr
    const date = new Date(weekStart)
    date.setDate(weekStart.getDate() + i)
    const dateStr = date.toISOString().split('T')[0]

    // Nur Werktage (Mo-Fr) ohne Feiertage
    if (isWeekdayMoFr(dateStr) && !isHoliday(dateStr)) {
      days.push(dateStr)
    }
  }

  return days
}

// =====================================================
// ALERT CALCULATIONS
// =====================================================

/**
 * Prüft ob Verfügbarkeit für nächste Woche fehlt
 */
async function checkVerfuegbarkeitFehlt(
  userId: string,
  fahrerId: string
): Promise<FahrerAlert | null> {
  const nextWeekStart = getNextWeekStart()
  const requiredWorkdays = getWorkdaysForWeek(nextWeekStart)

  // Keine Werktage in der Woche? (z.B. nur Feiertage)
  if (requiredWorkdays.length === 0) {
    return null
  }

  // Lade existierende Verfügbarkeiten für nächste Woche
  const { data: availabilities, error } = await supabase
    .from('driver_availability')
    .select('date, is_available, submitted_at')
    .eq('user_id', userId)
    .eq('week_start_date', nextWeekStart)

  if (error) {
    console.error('[FahrerAlerts] Fehler beim Laden der Verfügbarkeit:', error)
    return null
  }

  // Prüfe welche Werktage noch fehlen (kein submitted_at)
  const submittedDates = new Set(
    (availabilities || [])
      .filter(a => a.submitted_at)
      .map(a => a.date)
  )

  const missingDays = requiredWorkdays.filter(day => !submittedDates.has(day))

  if (missingDays.length === 0) {
    return null
  }

  // Prüfe ob Deadline bereits überschritten
  const deadlinePassed = isDeadlinePassed(nextWeekStart)

  if (deadlinePassed) {
    // Höhere Priorität wenn Deadline überschritten
    return {
      id: `verfuegbarkeit_deadline_${nextWeekStart}`,
      type: 'verfuegbarkeit_deadline_ueberschritten',
      priority: 'high',
      title: 'Frist überschritten: Verfügbarkeit fehlt',
      message: `Für ${missingDays.length} Werktag${missingDays.length > 1 ? 'e' : ''} fehlt noch die Meldung.`,
      actionLabel: 'Jetzt nachmelden',
      actionHref: '/fahrerportal/verfuegbarkeit',
      details: {
        count: missingDays.length
      }
    }
  }

  // Normale Meldung vor Deadline
  return {
    id: `verfuegbarkeit_fehlt_${nextWeekStart}`,
    type: 'verfuegbarkeit_fehlt',
    priority: 'medium',
    title: 'Verfügbarkeit für nächste Woche melden',
    message: `Bitte für ${missingDays.length} Werktag${missingDays.length > 1 ? 'e' : ''} Verfügbarkeit eintragen.`,
    actionLabel: 'Verfügbarkeit melden',
    actionHref: '/fahrerportal/verfuegbarkeit',
    details: {
      count: missingDays.length
    }
  }
}

/**
 * Prüft auf offene Touren (zugewiesen aber nicht abgeschlossen)
 */
async function checkOffeneTouren(
  fahrerId: number
): Promise<FahrerAlert | null> {
  const { data: touren, error } = await supabase
    .from('tours')
    .select('id, tour_no, status, pickup_data, dropoff_data')
    .eq('assigned_driver_id', fahrerId)
    .neq('status', 'abgeschlossen')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[FahrerAlerts] Fehler beim Laden der Touren:', error)
    return null
  }

  if (!touren || touren.length === 0) {
    return null
  }

  // Gruppiere nach Status für bessere Anzeige
  const uebernahmeOffen = touren.filter(t => t.status === 'uebernahme_offen' || t.status === 'neu')
  const abgabeOffen = touren.filter(t => t.status === 'abgabe_offen')
  const unterwegs = touren.filter(t => t.status === 'unterwegs')

  // Priorität basierend auf Status
  let priority: FahrerAlertPriority = 'medium'
  let title = `${touren.length} offene Tour${touren.length > 1 ? 'en' : ''}`
  let message = ''

  if (abgabeOffen.length > 0) {
    priority = 'high'
    message = `${abgabeOffen.length}x Abgabe offen`
    if (uebernahmeOffen.length > 0) {
      message += `, ${uebernahmeOffen.length}x Übernahme offen`
    }
  } else if (unterwegs.length > 0) {
    message = `${unterwegs.length}x unterwegs`
    if (uebernahmeOffen.length > 0) {
      message += `, ${uebernahmeOffen.length}x Übernahme offen`
    }
  } else {
    message = `${uebernahmeOffen.length}x Übernahme offen`
  }

  return {
    id: `touren_offen_${fahrerId}`,
    type: 'tour_offen',
    priority,
    title,
    message,
    actionLabel: 'Meine Touren',
    actionHref: '/fahrerportal/touren',
    details: {
      count: touren.length
    }
  }
}

/**
 * Prüft auf fehlende Arbeitsnachweise (Tour abgeschlossen, aber kein AN)
 */
async function checkArbeitsnachweiseFehlen(
  userId: string,
  fahrerId: number
): Promise<FahrerAlert | null> {
  // Lade abgeschlossene Touren der letzten 30 Tage
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const minDate = thirtyDaysAgo.toISOString().split('T')[0]

  const { data: abgeschlosseneTouren, error: tourenError } = await supabase
    .from('tours')
    .select('id, tour_no, updated_at')
    .eq('assigned_driver_id', fahrerId)
    .eq('status', 'abgeschlossen')
    .gte('updated_at', minDate)

  if (tourenError || !abgeschlosseneTouren || abgeschlosseneTouren.length === 0) {
    return null
  }

  // Lade hochgeladene Arbeitsnachweise
  const { data: arbeitsnachweise, error: anError } = await supabase
    .from('arbeitsnachweise')
    .select('tour_nr, status')
    .eq('user_id', userId)
    .gte('datum', minDate)

  if (anError) {
    console.error('[FahrerAlerts] Fehler beim Laden der Arbeitsnachweise:', anError)
    return null
  }

  // Erstelle Set der hochgeladenen Tour-Nummern
  const hochgeladeneTouren = new Set(
    (arbeitsnachweise || []).map(a => String(a.tour_nr))
  )

  // Finde Touren ohne Arbeitsnachweis
  const ohneNachweis = abgeschlosseneTouren.filter(t =>
    !hochgeladeneTouren.has(String(t.tour_no))
  )

  if (ohneNachweis.length === 0) {
    return null
  }

  return {
    id: `arbeitsnachweis_fehlt_${userId}`,
    type: 'arbeitsnachweis_fehlt',
    priority: 'high',
    title: `Arbeitsnachweis${ohneNachweis.length > 1 ? 'e' : ''} fehlt`,
    message: `Für ${ohneNachweis.length} abgeschlossene Tour${ohneNachweis.length > 1 ? 'en' : ''} bitte hochladen.`,
    actionLabel: 'Arbeitsnachweis hochladen',
    actionHref: '/fahrerportal/arbeitsnachweis',
    details: {
      count: ohneNachweis.length,
      tourNummer: ohneNachweis.length === 1 ? ohneNachweis[0].tour_no : undefined
    }
  }
}

/**
 * Prüft auf abgelehnte Arbeitsnachweise
 */
async function checkAbgelehnteArbeitsnachweise(
  userId: string
): Promise<FahrerAlert | null> {
  const { data: abgelehnte, error } = await supabase
    .from('arbeitsnachweise')
    .select('id, tour_nr, datum, rejection_reason')
    .eq('user_id', userId)
    .eq('status', 'rejected')
    .order('datum', { ascending: false })

  if (error || !abgelehnte || abgelehnte.length === 0) {
    return null
  }

  const neueste = abgelehnte[0]

  return {
    id: `arbeitsnachweis_abgelehnt_${userId}`,
    type: 'arbeitsnachweis_abgelehnt',
    priority: 'high',
    title: `Arbeitsnachweis abgelehnt`,
    message: abgelehnte.length > 1
      ? `${abgelehnte.length} Nachweise wurden abgelehnt. Bitte prüfen.`
      : `Tour ${neueste.tour_nr || neueste.id} vom ${formatDateDE(neueste.datum)}`,
    actionLabel: 'Prüfen',
    actionHref: '/fahrerportal/statistiken',
    details: {
      count: abgelehnte.length,
      tourNummer: neueste.tour_nr,
      datum: neueste.datum,
      grund: neueste.rejection_reason
    }
  }
}

/**
 * Prüft auf abgelehnte Auslagen
 */
async function checkAbgelehnteAuslagen(
  userId: string
): Promise<FahrerAlert | null> {
  const { data: abgelehnte, error } = await supabase
    .from('auslagennachweise')
    .select('id, tour_nr, datum, kosten, rejection_reason')
    .eq('user_id', userId)
    .eq('status', 'rejected')
    .order('datum', { ascending: false })

  if (error || !abgelehnte || abgelehnte.length === 0) {
    return null
  }

  const neueste = abgelehnte[0]
  const gesamtBetrag = abgelehnte.reduce((sum, a) => sum + (a.kosten || 0), 0)

  return {
    id: `auslage_abgelehnt_${userId}`,
    type: 'auslage_abgelehnt',
    priority: 'medium',
    title: `Auslage${abgelehnte.length > 1 ? 'n' : ''} abgelehnt`,
    message: abgelehnte.length > 1
      ? `${abgelehnte.length} Auslagen (${gesamtBetrag.toFixed(2)} €) wurden abgelehnt.`
      : `${neueste.kosten?.toFixed(2) || '0.00'} € vom ${formatDateDE(neueste.datum)}`,
    actionLabel: 'Prüfen',
    actionHref: '/fahrerportal/auslagenabrechnung',
    details: {
      count: abgelehnte.length,
      betrag: gesamtBetrag,
      datum: neueste.datum,
      grund: neueste.rejection_reason
    }
  }
}

// =====================================================
// MAIN FUNCTION
// =====================================================

/**
 * Berechnet alle operativen Alerts für einen Fahrer
 *
 * WICHTIG: Keine Dokumenten-/Compliance-Alerts!
 *
 * @param userId - Auth User ID
 * @returns FahrerAlertsResult mit allen Alerts
 */
export async function calculateFahrerAlerts(userId: string): Promise<FahrerAlertsResult> {
  // Lade Fahrer-ID
  const { data: fahrerData, error: fahrerError } = await supabase
    .from('fahrer')
    .select('id, status')
    .eq('user_id', userId)
    .single()

  if (fahrerError || !fahrerData) {
    console.error('[FahrerAlerts] Fahrer nicht gefunden:', fahrerError)
    return { alerts: [], summary: { high: 0, medium: 0, total: 0 } }
  }

  // Nur aktive Fahrer bekommen Alerts
  if (fahrerData.status !== 'aktiv') {
    return { alerts: [], summary: { high: 0, medium: 0, total: 0 } }
  }

  const fahrerId = fahrerData.id

  // Alle Prüfungen parallel ausführen
  const [
    verfuegbarkeitAlert,
    tourenAlert,
    arbeitsnachweiseFehlenAlert,
    abgelehnteANAlert,
    abgelehnteAuslagenAlert
  ] = await Promise.all([
    checkVerfuegbarkeitFehlt(userId, String(fahrerId)),
    checkOffeneTouren(fahrerId),
    checkArbeitsnachweiseFehlen(userId, fahrerId),
    checkAbgelehnteArbeitsnachweise(userId),
    checkAbgelehnteAuslagen(userId)
  ])

  // Alle nicht-null Alerts sammeln
  const alerts: FahrerAlert[] = [
    verfuegbarkeitAlert,
    tourenAlert,
    arbeitsnachweiseFehlenAlert,
    abgelehnteANAlert,
    abgelehnteAuslagenAlert
  ].filter((a): a is FahrerAlert => a !== null)

  // Nach Priorität sortieren (high > medium > low)
  const priorityOrder: Record<FahrerAlertPriority, number> = { high: 0, medium: 1, low: 2 }
  alerts.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])

  // Summary berechnen
  const summary = {
    high: alerts.filter(a => a.priority === 'high').length,
    medium: alerts.filter(a => a.priority === 'medium').length,
    total: alerts.length
  }

  return { alerts, summary }
}

/**
 * Gibt Icon-Name für Alert-Typ zurück (für Lucide Icons)
 */
export function getAlertIcon(type: FahrerAlertType): string {
  switch (type) {
    case 'verfuegbarkeit_fehlt':
      return 'CalendarClock'
    case 'verfuegbarkeit_deadline_ueberschritten':
      return 'CalendarX'
    case 'tour_offen':
      return 'Car'
    case 'protokoll_offen':
      return 'FileText'
    case 'arbeitsnachweis_fehlt':
      return 'Upload'
    case 'arbeitsnachweis_abgelehnt':
      return 'FileX'
    case 'auslage_abgelehnt':
      return 'ReceiptX'
    default:
      return 'AlertCircle'
  }
}

/**
 * Gibt Farben für Alert-Priorität zurück
 */
export function getAlertColors(priority: FahrerAlertPriority): {
  bg: string
  border: string
  icon: string
  text: string
} {
  switch (priority) {
    case 'high':
      return {
        bg: 'bg-red-50',
        border: 'border-red-200',
        icon: 'text-red-600',
        text: 'text-red-900'
      }
    case 'medium':
      return {
        bg: 'bg-amber-50',
        border: 'border-amber-200',
        icon: 'text-amber-600',
        text: 'text-amber-900'
      }
    case 'low':
    default:
      return {
        bg: 'bg-blue-50',
        border: 'border-blue-200',
        icon: 'text-blue-600',
        text: 'text-blue-900'
      }
  }
}
