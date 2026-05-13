/**
 * Dashboard Calculator - Cockpit-Kennzahlen für Tagessteuerung
 *
 * Berechnet operative Kennzahlen für das Dashboard.
 * Keine Finanz-Analytics (gehört zu analytics-calculator.ts).
 * Verwendet bestehende API-Funktionen ohne neue Backend-Abhängigkeiten.
 *
 * Integration mit alerts-calculator.ts für automatisch berechnete Alerts.
 */

import type { Alert, AlertSeverity } from "./alerts-api"
import type { CorrectionRequest } from "./corrections-api"
import type { DriverAvailability } from "./availability-api"
import {
  calculateSystemAlerts,
  getTopAlerts,
  type ComputedAlert,
  type AlertCalculatorResult
} from "./alerts-calculator"

// =====================================================
// TYPES
// =====================================================

export interface Arbeitsnachweis {
  id: number
  datum: string
  status: 'pending' | 'approved' | 'rejected' | 'billed'
  created_at?: string
  user_id?: string
}

export interface Auslage {
  id: number
  datum: string
  status: 'pending' | 'approved' | 'rejected' | 'transferred'
  kosten: number
  created_at?: string
  driver_reimbursement_status?: string | null
  reimbursed_at?: string | null
}

export interface Fahrer {
  id: number
  vorname: string
  nachname: string
  status: 'aktiv' | 'inaktiv'
  user_id?: string
}

/**
 * Cockpit-Kennzahlen für das Dashboard
 */
export interface CockpitKennzahlen {
  // === 1. HEUTE / AKTUELL ZU ERLEDIGEN ===
  arbeitsnachweisePending: number
  auslagenPending: number
  korrekturanfragenOffen: number
  alertsOffen: number
  fahrerOhneVerfuegbarkeit: number

  // === 2. KRITISCH / HANDLUNGSBEDARF ===
  arbeitsnachweiseAelterAlsZweiTage: number
  auslagenAelterAlsZweiTage: number
  alertsKritisch: number
  auslagenGenehmigtNichtUeberwiesen: number
  auslagenGenehmigtNichtUeberwiesenBetrag: number

  // === 3. SCHNELLSTATUS ===
  aktiveFahrer: number
  tourenAktuellerMonat: number
  offeneAuslagenAnzahl: number
  offeneWarnungen: number

  // === 4. LISTEN FÜR UI ===
  kritischeHinweise: KritischerHinweis[]
  alertsNachSeverity: {
    critical: number
    warning: number
    info: number
  }

  // === META ===
  datenVerfuegbar: {
    alerts: boolean
    korrekturen: boolean
    verfuegbarkeit: boolean
  }

  // === 5. AUTOMATISCH BERECHNETE ALERTS ===
  computedAlerts: ComputedAlert[]
  computedAlertsSummary: {
    critical: number
    warning: number
    info: number
    total: number
  }
}

export interface KritischerHinweis {
  typ: 'arbeitsnachweise_alt' | 'auslagen_alt' | 'alert_kritisch' | 'auslage_nicht_ueberwiesen' | 'verfuegbarkeit_fehlt' | 'computed_alert'
  titel: string
  beschreibung: string
  anzahl?: number
  betrag?: number
  severity: 'critical' | 'warning' | 'info'
  link?: string
  /** Für computed alerts: der zugrundeliegende Alert */
  computedAlert?: ComputedAlert
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Prüft ob ein Datum älter als n Tage ist
 */
function isOlderThanDays(dateString: string, days: number): boolean {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = diffMs / (1000 * 60 * 60 * 24)
  return diffDays > days
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

// =====================================================
// MAIN CALCULATOR
// =====================================================

export interface WeeklyInvoice {
  id: string
  client: string
  year: number
  week_number: number
  status: string
  exported_at?: string | null
  locked_at?: string | null
}

interface CockpitCalculatorInput {
  arbeitsnachweise: Arbeitsnachweis[]
  auslagen: Auslage[]
  fahrer: Fahrer[]
  alerts?: Alert[]
  korrekturen?: CorrectionRequest[]
  verfuegbarkeiten?: DriverAvailability[]
  weeklyInvoices?: WeeklyInvoice[]
  /** Benutzerrolle für Alert-Filterung */
  userRole?: 'admin' | 'gf' | 'disponent'
  /** Set von dismissten synthetic_ids zum Ausfiltern */
  dismissedSyntheticIds?: Set<string>
}

/**
 * Berechnet alle Cockpit-Kennzahlen für das Dashboard
 */
export function calculateCockpitKennzahlen(input: CockpitCalculatorInput): CockpitKennzahlen {
  const {
    arbeitsnachweise,
    auslagen,
    fahrer,
    alerts,
    korrekturen,
    verfuegbarkeiten,
    weeklyInvoices,
    userRole = 'admin',
    dismissedSyntheticIds
  } = input

  // === AUTOMATISCH BERECHNETE ALERTS ===
  // Transformiere Daten für alerts-calculator
  const alertCalcResult = calculateSystemAlerts({
    arbeitsnachweise: arbeitsnachweise.map(a => ({
      id: a.id,
      datum: a.datum,
      status: a.status,
      created_at: a.created_at,
      user_id: a.user_id
    })),
    auslagen: auslagen.map(a => ({
      id: a.id,
      datum: a.datum,
      status: a.status,
      kosten: a.kosten,
      created_at: a.created_at,
      driver_reimbursement_status: a.driver_reimbursement_status,
      reimbursed_at: a.reimbursed_at
    })),
    fahrer: fahrer.map(f => ({
      id: f.id,
      vorname: f.vorname,
      nachname: f.nachname,
      status: f.status,
      user_id: f.user_id
    })),
    driverAvailability: verfuegbarkeiten,
    correctionRequests: korrekturen,
    weeklyInvoices: weeklyInvoices,
    userRole,
    dismissedSyntheticIds
  })

  const computedAlerts = alertCalcResult.alerts
  const computedAlertsSummary = alertCalcResult.summary

  // Datenquellen-Verfügbarkeit
  const datenVerfuegbar = {
    alerts: Array.isArray(alerts),
    korrekturen: Array.isArray(korrekturen),
    verfuegbarkeit: Array.isArray(verfuegbarkeiten)
  }

  // === 1. HEUTE / AKTUELL ZU ERLEDIGEN ===

  const arbeitsnachweisePending = arbeitsnachweise.filter(a => a.status === 'pending').length

  const auslagenPending = auslagen.filter(a => a.status === 'pending').length

  const korrekturanfragenOffen = datenVerfuegbar.korrekturen
    ? (korrekturen || []).filter(k => k.status === 'open').length
    : 0

  const alertsOffen = datenVerfuegbar.alerts
    ? (alerts || []).filter(a => a.status === 'open').length
    : 0

  // Fahrer ohne Verfügbarkeit für kommende Woche
  const aktiveFahrerListe = fahrer.filter(f => f.status === 'aktiv')
  const nextWeekStart = getNextWeekStart()
  let fahrerOhneVerfuegbarkeit = 0

  if (datenVerfuegbar.verfuegbarkeit && verfuegbarkeiten) {
    const fahrerMitVerfuegbarkeit = new Set(
      verfuegbarkeiten
        .filter(v => v.week_start_date === nextWeekStart)
        .map(v => v.fahrer_id)
    )
    fahrerOhneVerfuegbarkeit = aktiveFahrerListe.filter(f => !fahrerMitVerfuegbarkeit.has(String(f.id))).length
  }

  // === 2. KRITISCH / HANDLUNGSBEDARF ===

  const arbeitsnachweiseAelterAlsZweiTage = arbeitsnachweise.filter(a =>
    a.status === 'pending' && isOlderThanDays(a.datum, 2)
  ).length

  const auslagenAelterAlsZweiTage = auslagen.filter(a =>
    a.status === 'pending' && isOlderThanDays(a.datum, 2)
  ).length

  const alertsKritisch = datenVerfuegbar.alerts
    ? (alerts || []).filter(a => a.status === 'open' && a.severity === 'critical').length
    : 0

  // Genehmigte Auslagen, aber noch nicht überwiesen
  const auslagenGenehmigtNichtUeberwiesenListe = auslagen.filter(a => a.status === 'approved')
  const auslagenGenehmigtNichtUeberwiesen = auslagenGenehmigtNichtUeberwiesenListe.length
  const auslagenGenehmigtNichtUeberwiesenBetrag = auslagenGenehmigtNichtUeberwiesenListe.reduce(
    (sum, a) => sum + (a.kosten || 0),
    0
  )

  // === 3. SCHNELLSTATUS ===

  const aktiveFahrer = aktiveFahrerListe.length

  const tourenAktuellerMonat = arbeitsnachweise.filter(a => isCurrentMonth(a.datum)).length

  const offeneAuslagenAnzahl = auslagen.filter(a => a.status === 'pending' || a.status === 'approved').length

  const offeneWarnungen = datenVerfuegbar.alerts
    ? (alerts || []).filter(a => a.status === 'open' && (a.severity === 'critical' || a.severity === 'warning')).length
    : 0

  // === 4. LISTEN FÜR UI ===

  // Alerts nach Severity
  const alertsNachSeverity = {
    critical: datenVerfuegbar.alerts ? (alerts || []).filter(a => a.status === 'open' && a.severity === 'critical').length : 0,
    warning: datenVerfuegbar.alerts ? (alerts || []).filter(a => a.status === 'open' && a.severity === 'warning').length : 0,
    info: datenVerfuegbar.alerts ? (alerts || []).filter(a => a.status === 'open' && a.severity === 'info').length : 0
  }

  // Kritische Hinweise sammeln (max. 5 wichtigste)
  const kritischeHinweise: KritischerHinweis[] = []

  // 1. Kritische Alerts
  if (alertsKritisch > 0) {
    kritischeHinweise.push({
      typ: 'alert_kritisch',
      titel: `${alertsKritisch} kritische Warnung${alertsKritisch > 1 ? 'en' : ''}`,
      beschreibung: 'Sofortige Aufmerksamkeit erforderlich',
      anzahl: alertsKritisch,
      severity: 'critical',
      link: '/admin/alerts'
    })
  }

  // 2. Arbeitsnachweise älter als 2 Tage
  if (arbeitsnachweiseAelterAlsZweiTage > 0) {
    kritischeHinweise.push({
      typ: 'arbeitsnachweise_alt',
      titel: `${arbeitsnachweiseAelterAlsZweiTage} Arbeitsnachweis${arbeitsnachweiseAelterAlsZweiTage > 1 ? 'e' : ''} seit >2 Tagen offen`,
      beschreibung: 'Bitte zeitnah prüfen und genehmigen',
      anzahl: arbeitsnachweiseAelterAlsZweiTage,
      severity: 'warning',
      link: '/admin/arbeitsnachweise'
    })
  }

  // 3. Auslagen älter als 2 Tage
  if (auslagenAelterAlsZweiTage > 0) {
    kritischeHinweise.push({
      typ: 'auslagen_alt',
      titel: `${auslagenAelterAlsZweiTage} Auslage${auslagenAelterAlsZweiTage > 1 ? 'n' : ''} seit >2 Tagen offen`,
      beschreibung: 'Bitte zeitnah prüfen und freigeben',
      anzahl: auslagenAelterAlsZweiTage,
      severity: 'warning',
      link: '/admin/auslagen'
    })
  }

  // 4. Genehmigte Auslagen noch nicht überwiesen
  if (auslagenGenehmigtNichtUeberwiesen > 0) {
    kritischeHinweise.push({
      typ: 'auslage_nicht_ueberwiesen',
      titel: `${auslagenGenehmigtNichtUeberwiesen} Auslage${auslagenGenehmigtNichtUeberwiesen > 1 ? 'n' : ''} genehmigt, nicht überwiesen`,
      beschreibung: `Betrag: ${auslagenGenehmigtNichtUeberwiesenBetrag.toFixed(2)} €`,
      anzahl: auslagenGenehmigtNichtUeberwiesen,
      betrag: auslagenGenehmigtNichtUeberwiesenBetrag,
      severity: 'info',
      link: '/admin/auslagen'
    })
  }

  // 5. Verfügbarkeit fehlt
  if (fahrerOhneVerfuegbarkeit > 0) {
    kritischeHinweise.push({
      typ: 'verfuegbarkeit_fehlt',
      titel: `${fahrerOhneVerfuegbarkeit} Fahrer ohne Verfügbarkeit`,
      beschreibung: 'Für kommende Woche keine Meldung eingegangen',
      anzahl: fahrerOhneVerfuegbarkeit,
      severity: 'info',
      link: '/admin/verfuegbarkeit'
    })
  }

  // 6. Berechnete Alerts hinzufügen (die noch nicht abgedeckt sind)
  // Füge nur Alerts hinzu, die nicht bereits durch obige Hinweise abgedeckt sind
  const abgedeckteTypen = new Set([
    'arbeitsnachweis_offen',
    'auslage_offen',
    'auslage_nicht_ueberwiesen',
    'verfuegbarkeit_fehlt'
  ])

  const zusaetzlicheAlerts = computedAlerts.filter(a => !abgedeckteTypen.has(a.type))

  for (const alert of zusaetzlicheAlerts) {
    kritischeHinweise.push({
      typ: 'computed_alert',
      titel: alert.title,
      beschreibung: alert.message,
      anzahl: alert.count,
      betrag: alert.amount,
      severity: alert.severity,
      link: alert.action_href,
      computedAlert: alert
    })
  }

  // Nach Severity sortieren und auf 5 begrenzen
  const severityOrder: Record<string, number> = { critical: 0, warning: 1, info: 2 }
  kritischeHinweise.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])
  const kritischeHinweiseBegrenzt = kritischeHinweise.slice(0, 5)

  return {
    // 1. Heute / aktuell
    arbeitsnachweisePending,
    auslagenPending,
    korrekturanfragenOffen,
    alertsOffen,
    fahrerOhneVerfuegbarkeit,

    // 2. Kritisch
    arbeitsnachweiseAelterAlsZweiTage,
    auslagenAelterAlsZweiTage,
    alertsKritisch,
    auslagenGenehmigtNichtUeberwiesen,
    auslagenGenehmigtNichtUeberwiesenBetrag,

    // 3. Schnellstatus
    aktiveFahrer,
    tourenAktuellerMonat,
    offeneAuslagenAnzahl,
    offeneWarnungen,

    // 4. Listen
    kritischeHinweise: kritischeHinweiseBegrenzt,
    alertsNachSeverity,

    // Meta
    datenVerfuegbar,

    // 5. Automatisch berechnete Alerts
    computedAlerts,
    computedAlertsSummary
  }
}

/**
 * Filtert Cockpit-Kennzahlen für Disponent
 * Disponent sieht keine Finanzdaten, aber alle operativen Kennzahlen
 */
export function filterCockpitForDisponent(kennzahlen: CockpitKennzahlen): CockpitKennzahlen {
  // Disponent sieht alles außer Finanzbeträge
  // Nur der Betrag bei genehmigten Auslagen wird ausgeblendet
  // computedAlerts sind bereits durch userRole='disponent' gefiltert
  return {
    ...kennzahlen,
    auslagenGenehmigtNichtUeberwiesenBetrag: 0, // Betrag ausblenden
    kritischeHinweise: kennzahlen.kritischeHinweise.map(h => {
      if (h.typ === 'auslage_nicht_ueberwiesen') {
        return {
          ...h,
          beschreibung: 'Noch nicht überwiesen',
          betrag: undefined
        }
      }
      // Für computed_alert: Finanzdetails entfernen
      if (h.typ === 'computed_alert' && h.computedAlert) {
        return {
          ...h,
          betrag: undefined,
          computedAlert: {
            ...h.computedAlert,
            details: undefined,
            amount: undefined
          }
        }
      }
      return h
    }),
    // computedAlerts ebenfalls bereinigen
    computedAlerts: kennzahlen.computedAlerts.map(a => ({
      ...a,
      details: undefined,
      amount: undefined
    }))
  }
}

// Re-export für Verwendung in anderen Modulen
export type { ComputedAlert } from "./alerts-calculator"
