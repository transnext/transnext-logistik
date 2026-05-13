/**
 * Alerts Calculator - Automatische Berechnung von System-Warnungen
 *
 * Diese Datei berechnet Alerts aus echten operativen Daten.
 * Alerts werden NICHT in die DB geschrieben, sondern nur berechnet.
 * Sie verschwinden automatisch, wenn die Ursache behoben ist.
 *
 * Rollenfilterung:
 * - Admin/GF: Alle Alerts inkl. Finanzdetails
 * - Disponent: Nur operative Alerts ohne Finanzdetails
 */

import type { Alert, AlertSeverity } from "./alerts-api"

// =====================================================
// TYPES
// =====================================================

export type ComputedAlertType =
  | 'arbeitsnachweis_offen'
  | 'auslage_offen'
  | 'auslage_nicht_ueberwiesen'
  | 'verfuegbarkeit_fehlt'
  | 'fahrer_wenig_fahrtage'
  | 'tour_nicht_berechenbar'
  | 'tour_fallback_konstanten'
  | 'rechnung_nicht_gesperrt'
  | 'negative_marge'
  | 'korrekturanfrage_offen'
  // Neue Typen für Verfügbarkeit und Upload-Compliance
  | 'verfuegbar_ohne_tour'
  | 'upload_verspaetet'
  | 'fahrer_verspaetungen_wiederholt'
  | 'fahrer_viele_verfuegbar_ohne_tour'

export interface ComputedAlert {
  /** Synthetische ID für Frontend-Keys */
  synthetic_id: string
  /** Alert-Typ für Kategorisierung */
  type: ComputedAlertType
  /** Schweregrad */
  severity: AlertSeverity
  /** Kurztitel */
  title: string
  /** Beschreibung */
  message: string
  /** Betroffene Entitätsart */
  entity_type: string
  /** Betroffene Entitäts-ID (optional) */
  entity_id: string | null
  /** Link zur Aktion */
  action_href: string
  /** Erkennungszeitpunkt */
  detected_at: string
  /** Sichtbar für Rollen */
  role_visibility: ('admin' | 'gf' | 'disponent')[]
  /** Details (nur für Admin/GF) */
  details?: Record<string, unknown>
  /** Anzahl betroffener Elemente */
  count?: number
  /** Betrag in € (nur für Admin/GF) */
  amount?: number
  /** Fahrer-Name (für fahrerbezogene Alerts) */
  fahrer_name?: string
}

// Input-Typen für den Calculator
export interface Arbeitsnachweis {
  id: number
  tour_nr?: string
  datum: string
  status: string
  created_at?: string
  gefahrene_km?: number | null
  customer_id?: string | null
  auftraggeber?: string | null
  customer_amount?: number | null
  driver_amount_final?: number | null
  estimated_employer_costs?: number | null
  calculation_source?: string | null
  pricing_calculated_at?: string | null
  // Für Matching mit Verfügbarkeit
  user_id?: string
}

export interface Auslage {
  id: number
  datum: string
  status: string
  kosten: number
  created_at?: string
  driver_reimbursement_status?: string | null
  reimbursed_at?: string | null
}

export interface Fahrer {
  id: number | string
  vorname: string
  nachname: string
  status: 'aktiv' | 'inaktiv'
  user_id?: string
}

export interface DriverAvailability {
  id: string
  fahrer_id: string
  user_id?: string
  week_start_date: string
  date: string
  is_available: boolean
  availability_status?: 'not_submitted' | 'submitted' | 'changed_after_deadline' | 'confirmed_by_dispo'
  submitted_at?: string | null
}

export interface CorrectionRequest {
  id: string
  arbeitsnachweis_id: number
  status: string
  reason: string
  requested_at: string
}

export interface WeeklyInvoice {
  id: string
  client: string
  year: number
  week_number: number
  status: string
  exported_at?: string | null
  locked_at?: string | null
}

export interface AlertCalculatorInput {
  arbeitsnachweise: Arbeitsnachweis[]
  auslagen: Auslage[]
  fahrer: Fahrer[]
  driverAvailability?: DriverAvailability[]
  correctionRequests?: CorrectionRequest[]
  weeklyInvoices?: WeeklyInvoice[]
  /** Aktuelle Benutzerrolle für Filterung */
  userRole: 'admin' | 'gf' | 'disponent'
  /** Set von dismissten synthetic_ids zum Ausfiltern */
  dismissedSyntheticIds?: Set<string>
}

export interface AlertCalculatorResult {
  alerts: ComputedAlert[]
  summary: {
    critical: number
    warning: number
    info: number
    total: number
  }
  /** Ausgeblendete/erledigte Alerts (optional für Anzeige) */
  dismissedAlerts?: ComputedAlert[]
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Generiert eine stabile synthetische ID für berechnete Alerts
 *
 * Die ID muss stabil sein, damit Dismissals funktionieren.
 * Verwende spezifische Entity-IDs oder Zeiträume als Suffix.
 *
 * Beispiele:
 * - `upload_verspaetet:tour_123`
 * - `fahrer_verspaetungen_wiederholt:user_abc:2026-05`
 * - `verfuegbar_ohne_tour:2026-05`
 * - `auslage_nicht_ueberwiesen:batch_2026-05-12`
 */
function generateSyntheticId(type: ComputedAlertType, suffix?: string | number): string {
  if (suffix !== undefined && suffix !== null) {
    return `${type}:${suffix}`
  }
  // Fallback mit aktuellem Monat für Stabilität
  const currentMonth = new Date().toISOString().slice(0, 7) // YYYY-MM
  return `${type}:${currentMonth}`
}

/**
 * Generiert eine stabile ID für fahrerbezogene Alerts
 */
function generateFahrerAlertId(type: ComputedAlertType, fahrerId: string | number, monat?: string): string {
  const month = monat || new Date().toISOString().slice(0, 7)
  return `${type}:fahrer_${fahrerId}:${month}`
}

/**
 * Generiert eine stabile ID für tourbezogene Alerts
 */
function generateTourAlertId(type: ComputedAlertType, tourId: number): string {
  return `${type}:tour_${tourId}`
}

/**
 * Generiert eine stabile ID für auslagenbezogene Alerts
 */
function generateAuslageAlertId(type: ComputedAlertType, auslageId: number): string {
  return `${type}:auslage_${auslageId}`
}

/**
 * Generiert eine stabile ID für Batch-Alerts (mehrere Einträge)
 */
function generateBatchAlertId(type: ComputedAlertType, severity: AlertSeverity, monat?: string): string {
  const month = monat || new Date().toISOString().slice(0, 7)
  return `${type}:batch_${severity}:${month}`
}

/**
 * Prüft ob ein Datum älter als n Tage ist
 */
function isOlderThanDays(dateString: string | undefined, days: number): boolean {
  if (!dateString) return false
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = diffMs / (1000 * 60 * 60 * 24)
  return diffDays > days
}

/**
 * Berechnet Wochenstart (Montag) für kommende Woche
 */
function getNextWeekStart(): string {
  const today = new Date()
  const dayOfWeek = today.getDay()
  const daysUntilNextMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek
  const nextMonday = new Date(today)
  nextMonday.setDate(today.getDate() + daysUntilNextMonday)
  return nextMonday.toISOString().split('T')[0]
}

/**
 * Prüft ob Datum im aktuellen Monat liegt
 */
function isCurrentMonth(dateString: string): boolean {
  const date = new Date(dateString)
  const now = new Date()
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth()
}

/**
 * Gibt den aktuellen Tag des Monats zurück
 */
function getCurrentDayOfMonth(): number {
  return new Date().getDate()
}

/**
 * Prüft ob Alert für Rolle sichtbar ist
 */
function isVisibleForRole(alert: ComputedAlert, role: 'admin' | 'gf' | 'disponent'): boolean {
  return alert.role_visibility.includes(role)
}

/**
 * Entfernt Finanzdetails für Disponent
 */
function sanitizeAlertForDisponent(alert: ComputedAlert): ComputedAlert {
  return {
    ...alert,
    details: undefined,
    amount: undefined
  }
}

/**
 * Prüft ob ein Datum in der Vergangenheit liegt (Europe/Berlin 23:59)
 */
function isDatePast(dateString: string): boolean {
  const date = new Date(dateString)
  // Setze auf Ende des Tages (23:59:59)
  date.setHours(23, 59, 59, 999)
  const now = new Date()
  return now > date
}

/**
 * Berechnet die Verspätung eines Uploads in Tagen
 * @param uploadTimestamp - created_at (ISO Timestamp)
 * @param tourDate - datum (YYYY-MM-DD)
 * @returns Anzahl Tage Verspätung (0 = pünktlich, >0 = verspätet)
 */
function calculateUploadDelay(uploadTimestamp: string | undefined, tourDate: string): number {
  if (!uploadTimestamp) return 0

  const upload = new Date(uploadTimestamp)
  // Tour-Deadline ist Ende des Tour-Datums (23:59:59 Europe/Berlin)
  // Vereinfacht: Verwenden wir lokale Zeit des Servers
  const deadline = new Date(tourDate)
  deadline.setHours(23, 59, 59, 999)

  if (upload <= deadline) return 0

  // Berechne Differenz in Tagen
  const diffMs = upload.getTime() - deadline.getTime()
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
  return diffDays
}

/**
 * Formatiert ein Datum für Anzeige
 */
function formatDateDE(dateString: string): string {
  return new Date(dateString).toLocaleDateString('de-DE')
}

// =====================================================
// ALERT RULES
// =====================================================

/**
 * Regel 1: Arbeitsnachweise länger als 2 Tage offen
 */
function checkArbeitsnachweiseOffen(arbeitsnachweise: Arbeitsnachweis[]): ComputedAlert[] {
  const alerts: ComputedAlert[] = []

  const pendingNachweise = arbeitsnachweise.filter(a =>
    (a.status === 'pending' || a.status === 'eingereicht' || a.status === 'in_pruefung')
  )

  // Älter als 2 Tage
  const olderThan2Days = pendingNachweise.filter(a =>
    isOlderThanDays(a.created_at || a.datum, 2)
  )

  // Älter als 5 Tage (kritisch)
  const olderThan5Days = olderThan2Days.filter(a =>
    isOlderThanDays(a.created_at || a.datum, 5)
  )

  if (olderThan5Days.length > 0) {
    alerts.push({
      synthetic_id: generateBatchAlertId('arbeitsnachweis_offen', 'critical'),
      type: 'arbeitsnachweis_offen',
      severity: 'critical',
      title: `${olderThan5Days.length} Arbeitsnachweis${olderThan5Days.length > 1 ? 'e' : ''} seit >5 Tagen offen`,
      message: 'Kritisch: Diese Arbeitsnachweise erfordern sofortige Bearbeitung.',
      entity_type: 'arbeitsnachweis',
      entity_id: null,
      action_href: '/admin/arbeitsnachweise',
      detected_at: new Date().toISOString(),
      role_visibility: ['admin', 'gf', 'disponent'],
      count: olderThan5Days.length,
      details: {
        ids: olderThan5Days.map(a => a.id)
      }
    })
  }

  const only2to5Days = olderThan2Days.filter(a =>
    !isOlderThanDays(a.created_at || a.datum, 5)
  )

  if (only2to5Days.length > 0) {
    alerts.push({
      synthetic_id: generateBatchAlertId('arbeitsnachweis_offen', 'warning'),
      type: 'arbeitsnachweis_offen',
      severity: 'warning',
      title: `${only2to5Days.length} Arbeitsnachweis${only2to5Days.length > 1 ? 'e' : ''} seit >2 Tagen offen`,
      message: 'Bitte zeitnah prüfen und genehmigen.',
      entity_type: 'arbeitsnachweis',
      entity_id: null,
      action_href: '/admin/arbeitsnachweise',
      detected_at: new Date().toISOString(),
      role_visibility: ['admin', 'gf', 'disponent'],
      count: only2to5Days.length,
      details: {
        ids: only2to5Days.map(a => a.id)
      }
    })
  }

  return alerts
}

/**
 * Regel 2: Auslagen länger als 2 Tage offen
 */
function checkAuslagenOffen(auslagen: Auslage[]): ComputedAlert[] {
  const alerts: ComputedAlert[] = []

  const pendingAuslagen = auslagen.filter(a =>
    (a.status === 'pending' || a.status === 'eingereicht' || a.status === 'in_pruefung')
  )

  // Älter als 2 Tage
  const olderThan2Days = pendingAuslagen.filter(a =>
    isOlderThanDays(a.created_at || a.datum, 2)
  )

  // Älter als 5 Tage (kritisch)
  const olderThan5Days = olderThan2Days.filter(a =>
    isOlderThanDays(a.created_at || a.datum, 5)
  )

  if (olderThan5Days.length > 0) {
    alerts.push({
      synthetic_id: generateBatchAlertId('auslage_offen', 'critical'),
      type: 'auslage_offen',
      severity: 'critical',
      title: `${olderThan5Days.length} Auslage${olderThan5Days.length > 1 ? 'n' : ''} seit >5 Tagen offen`,
      message: 'Kritisch: Diese Auslagen erfordern sofortige Bearbeitung.',
      entity_type: 'auslage',
      entity_id: null,
      action_href: '/admin/auslagen',
      detected_at: new Date().toISOString(),
      role_visibility: ['admin', 'gf', 'disponent'],
      count: olderThan5Days.length
    })
  }

  const only2to5Days = olderThan2Days.filter(a =>
    !isOlderThanDays(a.created_at || a.datum, 5)
  )

  if (only2to5Days.length > 0) {
    alerts.push({
      synthetic_id: generateBatchAlertId('auslage_offen', 'warning'),
      type: 'auslage_offen',
      severity: 'warning',
      title: `${only2to5Days.length} Auslage${only2to5Days.length > 1 ? 'n' : ''} seit >2 Tagen offen`,
      message: 'Bitte zeitnah prüfen und freigeben.',
      entity_type: 'auslage',
      entity_id: null,
      action_href: '/admin/auslagen',
      detected_at: new Date().toISOString(),
      role_visibility: ['admin', 'gf', 'disponent'],
      count: only2to5Days.length
    })
  }

  return alerts
}

/**
 * Regel 3: Genehmigte Auslagen noch nicht überwiesen
 */
function checkAuslagenNichtUeberwiesen(auslagen: Auslage[]): ComputedAlert[] {
  const alerts: ComputedAlert[] = []

  // Status approved/bestaetigt, aber noch nicht überwiesen
  const genehmigtNichtUeberwiesen = auslagen.filter(a =>
    (a.status === 'approved' || a.status === 'bestaetigt') &&
    (a.driver_reimbursement_status !== 'erstattet') &&
    !a.reimbursed_at
  )

  if (genehmigtNichtUeberwiesen.length > 0) {
    const totalBetrag = genehmigtNichtUeberwiesen.reduce((sum, a) => sum + (a.kosten || 0), 0)

    alerts.push({
      synthetic_id: generateBatchAlertId('auslage_nicht_ueberwiesen', 'warning'),
      type: 'auslage_nicht_ueberwiesen',
      severity: 'warning',
      title: `${genehmigtNichtUeberwiesen.length} genehmigte Auslage${genehmigtNichtUeberwiesen.length > 1 ? 'n' : ''} noch nicht überwiesen`,
      message: `Betrag: ${totalBetrag.toFixed(2)} €`,
      entity_type: 'auslage',
      entity_id: null,
      action_href: '/admin/auslagen',
      detected_at: new Date().toISOString(),
      role_visibility: ['admin', 'gf', 'disponent'],
      count: genehmigtNichtUeberwiesen.length,
      amount: totalBetrag,
      details: {
        ids: genehmigtNichtUeberwiesen.map(a => a.id),
        betrag: totalBetrag
      }
    })
  }

  return alerts
}

/**
 * Regel 4: Fahrer-Verfügbarkeit für kommende Woche fehlt
 */
function checkVerfuegbarkeitFehlt(
  fahrer: Fahrer[],
  driverAvailability: DriverAvailability[] | undefined
): ComputedAlert[] {
  const alerts: ComputedAlert[] = []

  if (!driverAvailability) return alerts

  const aktiveFahrer = fahrer.filter(f => f.status === 'aktiv')
  const nextWeekStart = getNextWeekStart()

  // Welche Fahrer haben Verfügbarkeiten für kommende Woche?
  const fahrerMitVerfuegbarkeit = new Set(
    driverAvailability
      .filter(v => v.week_start_date === nextWeekStart)
      .map(v => v.fahrer_id)
  )

  const fahrerOhneVerfuegbarkeit = aktiveFahrer.filter(f =>
    !fahrerMitVerfuegbarkeit.has(String(f.id))
  )

  if (fahrerOhneVerfuegbarkeit.length > 0) {
    // Stabile ID mit Wochen-Info
    const weekInfo = nextWeekStart
    alerts.push({
      synthetic_id: `verfuegbarkeit_fehlt:week_${weekInfo}`,
      type: 'verfuegbarkeit_fehlt',
      severity: 'info',
      title: `${fahrerOhneVerfuegbarkeit.length} Fahrer ohne Verfügbarkeit`,
      message: 'Für kommende Woche keine Meldung eingegangen.',
      entity_type: 'fahrer',
      entity_id: null,
      action_href: '/admin/verfuegbarkeit',
      detected_at: new Date().toISOString(),
      role_visibility: ['admin', 'gf', 'disponent'],
      count: fahrerOhneVerfuegbarkeit.length,
      details: {
        fahrer_namen: fahrerOhneVerfuegbarkeit.map(f => `${f.vorname} ${f.nachname}`)
      }
    })
  }

  return alerts
}

/**
 * Regel 5: Fahrer unter 6 Fahrtagen im aktuellen Monat
 * Nur ab dem 15. des Monats anzeigen
 */
function checkFahrerWenigFahrtage(
  fahrer: Fahrer[],
  arbeitsnachweise: Arbeitsnachweis[]
): ComputedAlert[] {
  const alerts: ComputedAlert[] = []

  // Nur ab dem 15. des Monats prüfen
  if (getCurrentDayOfMonth() < 15) return alerts

  // Mangels zuverlässiger user_id-Verknüpfung überspringen wir diese Regel temporär

  return alerts
}

/**
 * Regel 6: Tour nicht berechenbar (keine KM oder keine gültige Preisliste)
 * NUR für Admin/GF sichtbar
 */
function checkTourNichtBerechenbar(arbeitsnachweise: Arbeitsnachweis[]): ComputedAlert[] {
  const alerts: ComputedAlert[] = []

  // Touren ohne gefahrene_km oder mit 0
  const ohneKm = arbeitsnachweise.filter(a =>
    a.status === 'approved' &&
    (!a.gefahrene_km || a.gefahrene_km <= 0)
  )

  if (ohneKm.length > 0) {
    alerts.push({
      synthetic_id: generateBatchAlertId('tour_nicht_berechenbar', 'critical'),
      type: 'tour_nicht_berechenbar',
      severity: 'critical',
      title: `${ohneKm.length} Tour${ohneKm.length > 1 ? 'en' : ''} ohne KM-Angabe`,
      message: 'Genehmigte Touren ohne Kilometer können nicht berechnet werden.',
      entity_type: 'arbeitsnachweis',
      entity_id: null,
      action_href: '/admin/abrechnung',
      detected_at: new Date().toISOString(),
      role_visibility: ['admin', 'gf'], // NUR Admin/GF
      count: ohneKm.length,
      details: {
        tour_nrs: ohneKm.map(a => a.tour_nr || `#${a.id}`)
      }
    })
  }

  return alerts
}

/**
 * Regel 7: Tour nutzt Fallback-Konstanten statt pricing_tables
 * NUR für Admin/GF sichtbar
 */
function checkTourFallbackKonstanten(arbeitsnachweise: Arbeitsnachweis[]): ComputedAlert[] {
  const alerts: ComputedAlert[] = []

  // Touren mit calculation_source = 'fallback_constant'
  const fallbackTouren = arbeitsnachweise.filter(a =>
    a.calculation_source === 'fallback_constant'
  )

  if (fallbackTouren.length > 0) {
    alerts.push({
      synthetic_id: generateBatchAlertId('tour_fallback_konstanten', 'warning'),
      type: 'tour_fallback_konstanten',
      severity: 'warning',
      title: `${fallbackTouren.length} Tour${fallbackTouren.length > 1 ? 'en' : ''} mit Fallback-Preisen`,
      message: 'Diese Touren verwenden Code-Konstanten statt Preislisten.',
      entity_type: 'arbeitsnachweis',
      entity_id: null,
      action_href: '/admin/abrechnung',
      detected_at: new Date().toISOString(),
      role_visibility: ['admin', 'gf'], // NUR Admin/GF
      count: fallbackTouren.length,
      details: {
        tour_nrs: fallbackTouren.map(a => a.tour_nr || `#${a.id}`)
      }
    })
  }

  return alerts
}

/**
 * Regel 8: Rechnung exportiert, aber noch nicht gesperrt
 * NUR für Admin/GF sichtbar
 */
function checkRechnungNichtGesperrt(weeklyInvoices: WeeklyInvoice[] | undefined): ComputedAlert[] {
  const alerts: ComputedAlert[] = []

  if (!weeklyInvoices) return alerts

  // Status = 'exported' aber locked_at = null
  const exportedNotLocked = weeklyInvoices.filter(inv =>
    inv.status === 'exported' && !inv.locked_at
  )

  if (exportedNotLocked.length > 0) {
    alerts.push({
      synthetic_id: generateBatchAlertId('rechnung_nicht_gesperrt', 'warning'),
      type: 'rechnung_nicht_gesperrt',
      severity: 'warning',
      title: `${exportedNotLocked.length} Rechnung${exportedNotLocked.length > 1 ? 'en' : ''} exportiert, nicht gesperrt`,
      message: 'Exportierte Rechnungen sollten gesperrt werden, um Änderungen zu verhindern.',
      entity_type: 'weekly_invoice',
      entity_id: null,
      action_href: '/admin/abrechnung',
      detected_at: new Date().toISOString(),
      role_visibility: ['admin', 'gf'], // NUR Admin/GF
      count: exportedNotLocked.length,
      details: {
        kw: exportedNotLocked.map(inv => `KW${inv.week_number}/${inv.year}`)
      }
    })
  }

  return alerts
}

/**
 * Regel 9: Negative oder auffällig niedrige Marge
 * NUR für Admin/GF sichtbar
 */
function checkNegativeMarge(arbeitsnachweise: Arbeitsnachweis[]): ComputedAlert[] {
  const alerts: ComputedAlert[] = []

  // Touren mit berechneten Beträgen
  const mitFinanzdaten = arbeitsnachweise.filter(a =>
    a.customer_amount != null &&
    a.driver_amount_final != null &&
    a.customer_amount > 0
  )

  // Negative Marge: customer_amount < driver_amount_final + employer_costs
  const negativeMarge = mitFinanzdaten.filter(a => {
    const customerAmount = a.customer_amount || 0
    const driverAmount = a.driver_amount_final || 0
    const employerCosts = a.estimated_employer_costs || 0
    const marge = customerAmount - driverAmount - employerCosts
    return marge < 0
  })

  if (negativeMarge.length > 0) {
    const totalVerlust = negativeMarge.reduce((sum, a) => {
      const customerAmount = a.customer_amount || 0
      const driverAmount = a.driver_amount_final || 0
      const employerCosts = a.estimated_employer_costs || 0
      return sum + (customerAmount - driverAmount - employerCosts)
    }, 0)

    const severity: AlertSeverity = negativeMarge.length > 5 ? 'critical' : 'warning'
    alerts.push({
      synthetic_id: generateBatchAlertId('negative_marge', severity),
      type: 'negative_marge',
      severity,
      title: `${negativeMarge.length} Tour${negativeMarge.length > 1 ? 'en' : ''} mit negativer Marge`,
      message: `Gesamtverlust: ${Math.abs(totalVerlust).toFixed(2)} €`,
      entity_type: 'arbeitsnachweis',
      entity_id: null,
      action_href: '/admin/analytics',
      detected_at: new Date().toISOString(),
      role_visibility: ['admin', 'gf'], // NUR Admin/GF
      count: negativeMarge.length,
      amount: totalVerlust,
      details: {
        tour_nrs: negativeMarge.map(a => a.tour_nr || `#${a.id}`),
        verlust: Math.abs(totalVerlust)
      }
    })
  }

  return alerts
}

/**
 * Regel 10: Offene Korrekturanfragen
 */
function checkKorrekturanfragenOffen(correctionRequests: CorrectionRequest[] | undefined): ComputedAlert[] {
  const alerts: ComputedAlert[] = []

  if (!correctionRequests) return alerts

  const offeneAnfragen = correctionRequests.filter(r =>
    r.status === 'open' || r.status === 'reviewed'
  )

  if (offeneAnfragen.length > 0) {
    alerts.push({
      synthetic_id: generateBatchAlertId('korrekturanfrage_offen', 'warning'),
      type: 'korrekturanfrage_offen',
      severity: 'warning',
      title: `${offeneAnfragen.length} offene Korrekturanfrage${offeneAnfragen.length > 1 ? 'n' : ''}`,
      message: 'Bitte Korrekturanfragen bearbeiten.',
      entity_type: 'correction_request',
      entity_id: null,
      action_href: '/admin/korrekturen',
      detected_at: new Date().toISOString(),
      role_visibility: ['admin', 'gf', 'disponent'], // Alle, aber ohne Beträge
      count: offeneAnfragen.length,
      details: {
        ids: offeneAnfragen.map(r => r.id)
      }
    })
  }

  return alerts
}

// =====================================================
// NEUE REGELN: VERFÜGBARKEIT UND UPLOAD-COMPLIANCE
// =====================================================

/**
 * Regel 11: Verfügbar gemeldet, aber keine Tour hochgeladen
 * Prüft: Fahrer war verfügbar (is_available=true, Status submitted/confirmed/changed),
 * aber für diesen Tag existiert keine Tour.
 */
function checkVerfuegbarOhneTour(
  fahrer: Fahrer[],
  driverAvailability: DriverAvailability[] | undefined,
  arbeitsnachweise: Arbeitsnachweis[]
): ComputedAlert[] {
  const alerts: ComputedAlert[] = []

  if (!driverAvailability || driverAvailability.length === 0) return alerts

  // Nur vergangene Tage prüfen (Datum liegt in Vergangenheit)
  const today = new Date().toISOString().split('T')[0]

  // Verfügbarkeiten mit is_available=true und gültigem Status
  const gueltigeVerfuegbarkeiten = driverAvailability.filter(v =>
    v.is_available === true &&
    v.date < today && // Nur vergangene Tage
    (v.availability_status === 'submitted' ||
     v.availability_status === 'confirmed_by_dispo' ||
     v.availability_status === 'changed_after_deadline')
  )

  if (gueltigeVerfuegbarkeiten.length === 0) return alerts

  // Erstelle Map: user_id + date -> Tour existiert?
  const tourenMap = new Map<string, boolean>()
  arbeitsnachweise.forEach(a => {
    if (a.user_id && a.datum) {
      tourenMap.set(`${a.user_id}_${a.datum}`, true)
    }
  })

  // Erstelle Map: fahrer_id -> Fahrer-Name
  const fahrerNamenMap = new Map<string, string>()
  fahrer.forEach(f => {
    fahrerNamenMap.set(String(f.id), `${f.vorname} ${f.nachname}`)
    if (f.user_id) {
      fahrerNamenMap.set(f.user_id, `${f.vorname} ${f.nachname}`)
    }
  })

  // Zähle verfügbare Tage ohne Tour pro Fahrer (nur aktueller Monat)
  const ohneToursProFahrer = new Map<string, { count: number; dates: string[]; fahrer_name: string }>()

  gueltigeVerfuegbarkeiten.forEach(v => {
    // Prüfe ob Tour existiert
    const key = v.user_id ? `${v.user_id}_${v.date}` : null
    const hatTour = key ? tourenMap.has(key) : false

    if (!hatTour && isCurrentMonth(v.date)) {
      const fahrerId = v.fahrer_id
      const fahrerName = fahrerNamenMap.get(fahrerId) || fahrerNamenMap.get(v.user_id || '') || 'Unbekannt'

      if (!ohneToursProFahrer.has(fahrerId)) {
        ohneToursProFahrer.set(fahrerId, { count: 0, dates: [], fahrer_name: fahrerName })
      }
      const entry = ohneToursProFahrer.get(fahrerId)!
      entry.count++
      entry.dates.push(v.date)
    }
  })

  // Erzeuge Alert wenn mindestens 1 Tag ohne Tour
  const gesamtOhneTour = Array.from(ohneToursProFahrer.values()).reduce((sum, e) => sum + e.count, 0)

  if (gesamtOhneTour > 0) {
    const fahrerDetails = Array.from(ohneToursProFahrer.entries())
      .filter(([_, e]) => e.count > 0)
      .map(([fahrerId, e]) => ({
        fahrer_id: fahrerId,
        fahrer_name: e.fahrer_name,
        tage: e.count,
        dates: e.dates
      }))

    const severity: AlertSeverity = gesamtOhneTour > 5 ? 'warning' : 'info'

    alerts.push({
      synthetic_id: generateBatchAlertId('verfuegbar_ohne_tour', severity),
      type: 'verfuegbar_ohne_tour',
      severity,
      title: `${gesamtOhneTour} verfügbare Tage ohne Tour`,
      message: `${fahrerDetails.length} Fahrer waren verfügbar, aber ohne hinterlegte Tour.`,
      entity_type: 'driver_availability',
      entity_id: null,
      action_href: '/admin/verfuegbarkeit',
      detected_at: new Date().toISOString(),
      role_visibility: ['admin', 'gf', 'disponent'], // Operative Info
      count: gesamtOhneTour,
      details: {
        fahrer: fahrerDetails
      }
    })
  }

  return alerts
}

/**
 * Regel 12: Tour/Abliefernachweis verspätet hochgeladen
 * Prüft: created_at > datum 23:59
 */
function checkUploadsVerspaetet(
  arbeitsnachweise: Arbeitsnachweis[],
  fahrer: Fahrer[]
): ComputedAlert[] {
  const alerts: ComputedAlert[] = []

  // Map für Fahrer-Namen
  const fahrerNamenMap = new Map<string, string>()
  fahrer.forEach(f => {
    if (f.user_id) {
      fahrerNamenMap.set(f.user_id, `${f.vorname} ${f.nachname}`)
    }
  })

  // Nur Touren des aktuellen Monats prüfen
  const aktuelleTouren = arbeitsnachweise.filter(a => isCurrentMonth(a.datum))

  // Berechne Verspätungen
  interface VerspaeteteUpload {
    id: number
    tour_nr: string
    datum: string
    delay_days: number
    user_id?: string
    fahrer_name?: string
  }

  const verspaeteteUploads: VerspaeteteUpload[] = []

  aktuelleTouren.forEach(a => {
    const delay = calculateUploadDelay(a.created_at, a.datum)
    if (delay > 0) {
      verspaeteteUploads.push({
        id: a.id,
        tour_nr: a.tour_nr || `#${a.id}`,
        datum: a.datum,
        delay_days: delay,
        user_id: a.user_id,
        fahrer_name: a.user_id ? fahrerNamenMap.get(a.user_id) : undefined
      })
    }
  })

  if (verspaeteteUploads.length === 0) return alerts

  // Teile in kritisch (>= 2 Tage) und warning (1 Tag)
  const kritisch = verspaeteteUploads.filter(v => v.delay_days >= 2)
  const warning = verspaeteteUploads.filter(v => v.delay_days === 1)

  if (kritisch.length > 0) {
    alerts.push({
      synthetic_id: generateBatchAlertId('upload_verspaetet', 'critical'),
      type: 'upload_verspaetet',
      severity: 'critical',
      title: `${kritisch.length} stark verspätete Upload${kritisch.length > 1 ? 's' : ''}`,
      message: `Abliefernachweise wurden 2+ Tage verspätet hochgeladen.`,
      entity_type: 'arbeitsnachweis',
      entity_id: null,
      action_href: '/admin/arbeitsnachweise',
      detected_at: new Date().toISOString(),
      role_visibility: ['admin', 'gf', 'disponent'],
      count: kritisch.length,
      details: {
        touren: kritisch.map(v => ({
          tour_nr: v.tour_nr,
          datum: v.datum,
          delay_days: v.delay_days,
          fahrer_name: v.fahrer_name
        }))
      }
    })
  }

  if (warning.length > 0) {
    alerts.push({
      synthetic_id: generateBatchAlertId('upload_verspaetet', 'warning'),
      type: 'upload_verspaetet',
      severity: 'warning',
      title: `${warning.length} verspätete Upload${warning.length > 1 ? 's' : ''}`,
      message: `Abliefernachweise wurden 1 Tag verspätet hochgeladen.`,
      entity_type: 'arbeitsnachweis',
      entity_id: null,
      action_href: '/admin/arbeitsnachweise',
      detected_at: new Date().toISOString(),
      role_visibility: ['admin', 'gf', 'disponent'],
      count: warning.length,
      details: {
        touren: warning.map(v => ({
          tour_nr: v.tour_nr,
          datum: v.datum,
          delay_days: v.delay_days,
          fahrer_name: v.fahrer_name
        }))
      }
    })
  }

  return alerts
}

/**
 * Regel 13: Fahrer mit wiederholten verspäteten Uploads
 * Prüft: Fahrer hat im aktuellen Monat >= 2 verspätete Uploads
 */
function checkFahrerWiederholteVerspaetungen(
  arbeitsnachweise: Arbeitsnachweis[],
  fahrer: Fahrer[]
): ComputedAlert[] {
  const alerts: ComputedAlert[] = []

  // Map für Fahrer-Namen
  const fahrerNamenMap = new Map<string, string>()
  fahrer.forEach(f => {
    if (f.user_id) {
      fahrerNamenMap.set(f.user_id, `${f.vorname} ${f.nachname}`)
    }
  })

  // Nur Touren des aktuellen Monats
  const aktuelleTouren = arbeitsnachweise.filter(a => isCurrentMonth(a.datum))

  // Zähle verspätete Uploads pro Fahrer
  const verspaetungenProFahrer = new Map<string, {
    count: number
    total_delay_days: number
    fahrer_name: string
    touren: { tour_nr: string; datum: string; delay_days: number }[]
  }>()

  aktuelleTouren.forEach(a => {
    if (!a.user_id) return

    const delay = calculateUploadDelay(a.created_at, a.datum)
    if (delay > 0) {
      if (!verspaetungenProFahrer.has(a.user_id)) {
        verspaetungenProFahrer.set(a.user_id, {
          count: 0,
          total_delay_days: 0,
          fahrer_name: fahrerNamenMap.get(a.user_id) || 'Unbekannt',
          touren: []
        })
      }
      const entry = verspaetungenProFahrer.get(a.user_id)!
      entry.count++
      entry.total_delay_days += delay
      entry.touren.push({
        tour_nr: a.tour_nr || `#${a.id}`,
        datum: a.datum,
        delay_days: delay
      })
    }
  })

  // Filtere Fahrer mit >= 2 Verspätungen
  const fahrerMitWiederholtenVerspaetungen = Array.from(verspaetungenProFahrer.entries())
    .filter(([_, e]) => e.count >= 2)
    .map(([userId, e]) => ({
      user_id: userId,
      fahrer_name: e.fahrer_name,
      count: e.count,
      avg_delay: e.total_delay_days / e.count,
      touren: e.touren
    }))

  if (fahrerMitWiederholtenVerspaetungen.length === 0) return alerts

  const kritischeFahrer = fahrerMitWiederholtenVerspaetungen.filter(f => f.count >= 4)
  const warnungFahrer = fahrerMitWiederholtenVerspaetungen.filter(f => f.count >= 2 && f.count < 4)

  if (kritischeFahrer.length > 0) {
    alerts.push({
      synthetic_id: generateSyntheticId('fahrer_verspaetungen_wiederholt', 'critical'),
      type: 'fahrer_verspaetungen_wiederholt',
      severity: 'critical',
      title: `${kritischeFahrer.length} Fahrer mit ≥4 verspäteten Uploads`,
      message: `Diese Fahrer haben im aktuellen Monat wiederholte Verspätungen.`,
      entity_type: 'fahrer',
      entity_id: null,
      action_href: '/admin/analytics',
      detected_at: new Date().toISOString(),
      role_visibility: ['admin', 'gf', 'disponent'],
      count: kritischeFahrer.length,
      details: {
        fahrer: kritischeFahrer
      }
    })
  }

  if (warnungFahrer.length > 0) {
    alerts.push({
      synthetic_id: generateSyntheticId('fahrer_verspaetungen_wiederholt', 'warning'),
      type: 'fahrer_verspaetungen_wiederholt',
      severity: 'warning',
      title: `${warnungFahrer.length} Fahrer mit 2-3 verspäteten Uploads`,
      message: `Diese Fahrer haben im aktuellen Monat mehrere Verspätungen.`,
      entity_type: 'fahrer',
      entity_id: null,
      action_href: '/admin/analytics',
      detected_at: new Date().toISOString(),
      role_visibility: ['admin', 'gf', 'disponent'],
      count: warnungFahrer.length,
      details: {
        fahrer: warnungFahrer
      }
    })
  }

  return alerts
}

/**
 * Regel 14: Viele verfügbare Tage ohne Tour
 * Prüft: Fahrer hat im aktuellen Monat >= 3 verfügbare Tage ohne Tour
 * Neutral formuliert - kann Disposition bedeuten, nicht Fahrerfehler
 */
function checkFahrerVieleVerfuegbarOhneTour(
  fahrer: Fahrer[],
  driverAvailability: DriverAvailability[] | undefined,
  arbeitsnachweise: Arbeitsnachweis[]
): ComputedAlert[] {
  const alerts: ComputedAlert[] = []

  if (!driverAvailability || driverAvailability.length === 0) return alerts

  const today = new Date().toISOString().split('T')[0]

  // Verfügbarkeiten mit is_available=true, vergangene Tage, aktueller Monat
  const gueltigeVerfuegbarkeiten = driverAvailability.filter(v =>
    v.is_available === true &&
    v.date < today &&
    isCurrentMonth(v.date) &&
    (v.availability_status === 'submitted' ||
     v.availability_status === 'confirmed_by_dispo' ||
     v.availability_status === 'changed_after_deadline')
  )

  if (gueltigeVerfuegbarkeiten.length === 0) return alerts

  // Erstelle Map: user_id + date -> Tour existiert?
  const tourenMap = new Map<string, boolean>()
  arbeitsnachweise.forEach(a => {
    if (a.user_id && a.datum) {
      tourenMap.set(`${a.user_id}_${a.datum}`, true)
    }
  })

  // Map: fahrer_id -> Fahrer-Name und user_id
  const fahrerNamenMap = new Map<string, { name: string; user_id?: string }>()
  fahrer.forEach(f => {
    fahrerNamenMap.set(String(f.id), { name: `${f.vorname} ${f.nachname}`, user_id: f.user_id })
  })

  // Zähle verfügbare Tage ohne Tour pro Fahrer
  const ohneToursProFahrer = new Map<string, {
    count: number
    dates: string[]
    fahrer_name: string
  }>()

  gueltigeVerfuegbarkeiten.forEach(v => {
    const fahrerInfo = fahrerNamenMap.get(v.fahrer_id)
    const userIdForMatch = v.user_id || fahrerInfo?.user_id

    const key = userIdForMatch ? `${userIdForMatch}_${v.date}` : null
    const hatTour = key ? tourenMap.has(key) : false

    if (!hatTour) {
      const fahrerId = v.fahrer_id
      const fahrerName = fahrerInfo?.name || 'Unbekannt'

      if (!ohneToursProFahrer.has(fahrerId)) {
        ohneToursProFahrer.set(fahrerId, { count: 0, dates: [], fahrer_name: fahrerName })
      }
      const entry = ohneToursProFahrer.get(fahrerId)!
      entry.count++
      if (!entry.dates.includes(v.date)) {
        entry.dates.push(v.date)
      }
    }
  })

  // Filtere Fahrer mit >= 3 Tagen (warning) oder >= 6 Tagen (critical)
  const fahrerMitVielenTagen = Array.from(ohneToursProFahrer.entries())
    .filter(([_, e]) => e.count >= 3)
    .map(([fahrerId, e]) => ({
      fahrer_id: fahrerId,
      fahrer_name: e.fahrer_name,
      tage: e.count,
      dates: e.dates
    }))

  if (fahrerMitVielenTagen.length === 0) return alerts

  const kritischeFahrer = fahrerMitVielenTagen.filter(f => f.tage >= 6)
  const warnungFahrer = fahrerMitVielenTagen.filter(f => f.tage >= 3 && f.tage < 6)

  if (kritischeFahrer.length > 0) {
    alerts.push({
      synthetic_id: generateSyntheticId('fahrer_viele_verfuegbar_ohne_tour', 'critical'),
      type: 'fahrer_viele_verfuegbar_ohne_tour',
      severity: 'warning', // Nicht critical, da nicht unbedingt Fahrerfehler
      title: `${kritischeFahrer.length} Fahrer mit ≥6 verfügbaren Tagen ohne Tour`,
      message: 'Diese Fahrer waren oft verfügbar, aber ohne hinterlegte Tour.',
      entity_type: 'fahrer',
      entity_id: null,
      action_href: '/admin/verfuegbarkeit',
      detected_at: new Date().toISOString(),
      role_visibility: ['admin', 'gf', 'disponent'],
      count: kritischeFahrer.length,
      details: {
        fahrer: kritischeFahrer
      }
    })
  }

  if (warnungFahrer.length > 0) {
    alerts.push({
      synthetic_id: generateSyntheticId('fahrer_viele_verfuegbar_ohne_tour', 'warning'),
      type: 'fahrer_viele_verfuegbar_ohne_tour',
      severity: 'info', // Info-Level, da neutral
      title: `${warnungFahrer.length} Fahrer mit 3-5 verfügbaren Tagen ohne Tour`,
      message: 'Diese Fahrer waren verfügbar, aber ohne hinterlegte Tour.',
      entity_type: 'fahrer',
      entity_id: null,
      action_href: '/admin/verfuegbarkeit',
      detected_at: new Date().toISOString(),
      role_visibility: ['admin', 'gf', 'disponent'],
      count: warnungFahrer.length,
      details: {
        fahrer: warnungFahrer
      }
    })
  }

  return alerts
}

// =====================================================
// MAIN CALCULATOR
// =====================================================

/**
 * Berechnet alle System-Alerts aus operativen Daten
 *
 * @param input - Eingabedaten (Arbeitsnachweise, Auslagen, Fahrer, etc.)
 * @returns AlertCalculatorResult mit gefilterten Alerts und Summary
 */
export function calculateSystemAlerts(input: AlertCalculatorInput): AlertCalculatorResult {
  const {
    arbeitsnachweise,
    auslagen,
    fahrer,
    driverAvailability,
    correctionRequests,
    weeklyInvoices,
    userRole,
    dismissedSyntheticIds
  } = input

  // Alle Alerts sammeln (inkl. neue Regeln 11-14)
  let allAlerts: ComputedAlert[] = [
    ...checkArbeitsnachweiseOffen(arbeitsnachweise),
    ...checkAuslagenOffen(auslagen),
    ...checkAuslagenNichtUeberwiesen(auslagen),
    ...checkVerfuegbarkeitFehlt(fahrer, driverAvailability),
    ...checkFahrerWenigFahrtage(fahrer, arbeitsnachweise),
    ...checkTourNichtBerechenbar(arbeitsnachweise),
    ...checkTourFallbackKonstanten(arbeitsnachweise),
    ...checkRechnungNichtGesperrt(weeklyInvoices),
    ...checkNegativeMarge(arbeitsnachweise),
    ...checkKorrekturanfragenOffen(correctionRequests),
    // Neue Regeln für Verfügbarkeit und Upload-Compliance
    ...checkVerfuegbarOhneTour(fahrer, driverAvailability, arbeitsnachweise),
    ...checkUploadsVerspaetet(arbeitsnachweise, fahrer),
    ...checkFahrerWiederholteVerspaetungen(arbeitsnachweise, fahrer),
    ...checkFahrerVieleVerfuegbarOhneTour(fahrer, driverAvailability, arbeitsnachweise)
  ]

  // Nach Rolle filtern
  allAlerts = allAlerts.filter(alert => isVisibleForRole(alert, userRole))

  // Für Disponent: Finanzdetails entfernen
  if (userRole === 'disponent') {
    allAlerts = allAlerts.map(sanitizeAlertForDisponent)
  }

  // Ausgeblendete Alerts filtern (Dismissals)
  let dismissedAlerts: ComputedAlert[] = []
  if (dismissedSyntheticIds && dismissedSyntheticIds.size > 0) {
    dismissedAlerts = allAlerts.filter(alert => dismissedSyntheticIds.has(alert.synthetic_id))
    allAlerts = allAlerts.filter(alert => !dismissedSyntheticIds.has(alert.synthetic_id))
  }

  // Nach Severity sortieren (critical > warning > info)
  const severityOrder: Record<AlertSeverity, number> = { critical: 0, warning: 1, info: 2 }
  allAlerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])

  // Summary berechnen (nur offene Alerts)
  const summary = {
    critical: allAlerts.filter(a => a.severity === 'critical').length,
    warning: allAlerts.filter(a => a.severity === 'warning').length,
    info: allAlerts.filter(a => a.severity === 'info').length,
    total: allAlerts.length
  }

  return { alerts: allAlerts, summary, dismissedAlerts }
}

/**
 * Konvertiert berechnete Alerts in das Alert-Format der alerts-api
 * für einheitliche Anzeige in der UI
 */
export function computedAlertToAlert(computed: ComputedAlert): Alert {
  return {
    id: computed.synthetic_id,
    type: computed.type,
    severity: computed.severity,
    entity_type: computed.entity_type,
    entity_id: computed.entity_id,
    message: computed.title, // Verwende title als message
    details: computed.details || null,
    assigned_to: null,
    status: 'open' as const,
    resolved_at: null,
    resolved_by: null,
    resolution_note: null,
    created_at: computed.detected_at
  }
}

/**
 * Holt die wichtigsten n Alerts für Dashboard-Anzeige
 */
export function getTopAlerts(result: AlertCalculatorResult, maxCount = 5): ComputedAlert[] {
  return result.alerts.slice(0, maxCount)
}

/**
 * Berechnet Upload-Compliance-Statistiken für einen Fahrer
 */
export interface FahrerUploadCompliance {
  user_id: string
  fahrer_name: string
  total_uploads: number
  verspaetete_uploads: number
  puenktliche_uploads: number
  puenktlichkeits_quote: number // 0-100%
  durchschnittliche_verspaetung_tage: number
  letzter_verspaeteter_upload?: string
}

export function calculateFahrerUploadCompliance(
  arbeitsnachweise: Arbeitsnachweis[],
  fahrer: Fahrer[]
): FahrerUploadCompliance[] {
  const results: FahrerUploadCompliance[] = []

  // Map für Fahrer-Namen
  const fahrerNamenMap = new Map<string, string>()
  fahrer.forEach(f => {
    if (f.user_id) {
      fahrerNamenMap.set(f.user_id, `${f.vorname} ${f.nachname}`)
    }
  })

  // Gruppiere Uploads nach Fahrer
  const uploadsProFahrer = new Map<string, {
    total: number
    verspaetet: number
    total_delay: number
    letzter_verspaeteter?: string
  }>()

  arbeitsnachweise.forEach(a => {
    if (!a.user_id) return

    if (!uploadsProFahrer.has(a.user_id)) {
      uploadsProFahrer.set(a.user_id, { total: 0, verspaetet: 0, total_delay: 0 })
    }

    const entry = uploadsProFahrer.get(a.user_id)!
    entry.total++

    const delay = calculateUploadDelay(a.created_at, a.datum)
    if (delay > 0) {
      entry.verspaetet++
      entry.total_delay += delay
      if (!entry.letzter_verspaeteter || a.datum > entry.letzter_verspaeteter) {
        entry.letzter_verspaeteter = a.datum
      }
    }
  })

  // Konvertiere zu Ergebnis-Array
  uploadsProFahrer.forEach((stats, userId) => {
    results.push({
      user_id: userId,
      fahrer_name: fahrerNamenMap.get(userId) || 'Unbekannt',
      total_uploads: stats.total,
      verspaetete_uploads: stats.verspaetet,
      puenktliche_uploads: stats.total - stats.verspaetet,
      puenktlichkeits_quote: stats.total > 0 ? Math.round(((stats.total - stats.verspaetet) / stats.total) * 100) : 100,
      durchschnittliche_verspaetung_tage: stats.verspaetet > 0 ? Math.round((stats.total_delay / stats.verspaetet) * 10) / 10 : 0,
      letzter_verspaeteter_upload: stats.letzter_verspaeteter
    })
  })

  return results
}

/**
 * Berechnet Verfügbarkeits-Auslastung für einen Fahrer
 */
export interface FahrerVerfuegbarkeitsAuslastung {
  user_id?: string
  fahrer_id: string
  fahrer_name: string
  verfuegbare_tage: number
  tage_mit_tour: number
  tage_ohne_tour: number
  einsatzquote: number // 0-100%
}

export function calculateFahrerVerfuegbarkeitsAuslastung(
  fahrer: Fahrer[],
  driverAvailability: DriverAvailability[],
  arbeitsnachweise: Arbeitsnachweis[]
): FahrerVerfuegbarkeitsAuslastung[] {
  const results: FahrerVerfuegbarkeitsAuslastung[] = []

  const today = new Date().toISOString().split('T')[0]

  // Map: fahrer_id -> Fahrer-Name und user_id
  const fahrerNamenMap = new Map<string, { name: string; user_id?: string }>()
  fahrer.forEach(f => {
    fahrerNamenMap.set(String(f.id), { name: `${f.vorname} ${f.nachname}`, user_id: f.user_id })
  })

  // Erstelle Map: user_id + date -> Tour existiert?
  const tourenMap = new Map<string, boolean>()
  arbeitsnachweise.forEach(a => {
    if (a.user_id && a.datum) {
      tourenMap.set(`${a.user_id}_${a.datum}`, true)
    }
  })

  // Gruppiere Verfügbarkeiten nach Fahrer
  const verfuegbarkeitProFahrer = new Map<string, {
    verfuegbar: number
    mitTour: number
    fahrer_name: string
    user_id?: string
  }>()

  driverAvailability
    .filter(v =>
      v.is_available === true &&
      v.date < today &&
      isCurrentMonth(v.date) &&
      (v.availability_status === 'submitted' ||
       v.availability_status === 'confirmed_by_dispo' ||
       v.availability_status === 'changed_after_deadline')
    )
    .forEach(v => {
      const fahrerId = v.fahrer_id
      const fahrerInfo = fahrerNamenMap.get(fahrerId)

      if (!verfuegbarkeitProFahrer.has(fahrerId)) {
        verfuegbarkeitProFahrer.set(fahrerId, {
          verfuegbar: 0,
          mitTour: 0,
          fahrer_name: fahrerInfo?.name || 'Unbekannt',
          user_id: v.user_id || fahrerInfo?.user_id
        })
      }

      const entry = verfuegbarkeitProFahrer.get(fahrerId)!
      entry.verfuegbar++

      const userIdForMatch = v.user_id || entry.user_id
      const key = userIdForMatch ? `${userIdForMatch}_${v.date}` : null
      if (key && tourenMap.has(key)) {
        entry.mitTour++
      }
    })

  // Konvertiere zu Ergebnis-Array
  verfuegbarkeitProFahrer.forEach((stats, fahrerId) => {
    results.push({
      fahrer_id: fahrerId,
      user_id: stats.user_id,
      fahrer_name: stats.fahrer_name,
      verfuegbare_tage: stats.verfuegbar,
      tage_mit_tour: stats.mitTour,
      tage_ohne_tour: stats.verfuegbar - stats.mitTour,
      einsatzquote: stats.verfuegbar > 0 ? Math.round((stats.mitTour / stats.verfuegbar) * 100) : 0
    })
  })

  return results
}
