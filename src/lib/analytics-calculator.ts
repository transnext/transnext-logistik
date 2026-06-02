/**
 * Analytics Calculator - KPI-Berechnungen für Admin/GF
 * Verwendet echte Daten aus arbeitsnachweise, auslagennachweise, fahrer
 * Keine Dummy-Daten, keine Änderungen an bestehenden Daten
 */

import { supabase } from "./supabase"
import { calculateTourVerdienst, hasNoSalary, MONTHLY_LIMIT } from "./salary-calculator"
import { calculateCustomerTotal, type Auftraggeber } from "./customer-pricing"
import { calculateCustomerAmountsForTours, type CustomerPriceResult } from "./pricing-calculator"
import { getActiveSystemSettings } from "./settings-api"
import { getAvailabilityForDateRange, type DriverAvailability } from "./availability-api"
import {
  calculateFahrerUploadCompliance,
  calculateFahrerVerfuegbarkeitsAuslastung,
  type FahrerUploadCompliance,
  type FahrerVerfuegbarkeitsAuslastung
} from "./alerts-calculator"
import { countWorkdays as countWorkdaysWithHolidays, isWorkday } from "./holidays"

// ============================================================
// FESTGEHALT-KOSTENLOGIK (INTERNE PLANWERTE)
// ============================================================
// Diese Konstanten sind interne Analytics-Planwerte für die
// Controlling-Berechnung von Festgehaltfahrern.
// NICHT in Fahrerakte anzeigen, NICHT für Kundenabrechnung verwenden.

/** Planwert: Bruttogehalt für Festgehaltfahrer (€) */
export const FIXED_SALARY_DEFAULT_GROSS = 1200

/** Planwert: Arbeitgeber-Kostenaufschlag (25% = 0.25) */
export const FIXED_SALARY_EMPLOYER_COST_RATE = 0.25

/** Planwert: Zusatzkosten netto (Fahrzeug, Versicherung, etc.) (€) */
export const FIXED_SALARY_ADDITIONAL_COST = 900

/**
 * Berechnet die kalkulatorischen monatlichen Gesamtkosten für einen Festgehaltfahrer.
 * Formula: Brutto + AG-Kosten + Zusatzkosten = 1200 + 300 + 900 = 2400 €
 */
export function calculateFixedSalaryMonthlyCost(): number {
  return FIXED_SALARY_DEFAULT_GROSS
    + (FIXED_SALARY_DEFAULT_GROSS * FIXED_SALARY_EMPLOYER_COST_RATE)
    + FIXED_SALARY_ADDITIONAL_COST
}

/**
 * Berechnet den erforderlichen Tagesumsatz zur Kostendeckung.
 * @param sollArbeitstage - Anzahl der Soll-Arbeitstage im Monat
 */
export function calculateDailyBreakEvenRevenue(sollArbeitstage: number): number {
  if (sollArbeitstage <= 0) return 0
  return calculateFixedSalaryMonthlyCost() / sollArbeitstage
}

// ============================================================
// TYPES
// ============================================================

export type AnalyticsTimeRange =
  | "current_month"
  | "last_month"
  | "current_quarter"
  | "last_quarter"
  | "current_year"
  | "last_year"
  | "since_dec_2025"
  | "custom"

export type MonthlyTrendType = "up" | "down" | "flat" | "n/a"

export interface TimeRangeParams {
  range: AnalyticsTimeRange
  customStart?: string // YYYY-MM-DD
  customEnd?: string   // YYYY-MM-DD
}

/**
 * Validiert einen benutzerdefinierten Zeitraum.
 * @returns null wenn gültig, sonst Fehlermeldung
 */
export function validateCustomTimeRange(start?: string, end?: string): string | null {
  if (!start || !end) {
    return "Bitte Start- und Enddatum angeben."
  }

  // Format prüfen (YYYY-MM-DD)
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/
  if (!dateRegex.test(start) || !dateRegex.test(end)) {
    return "Ungültiges Datumsformat. Bitte YYYY-MM-DD verwenden."
  }

  const startDate = new Date(start)
  const endDate = new Date(end)

  // Gültige Datumskonvertierung prüfen
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    return "Ungültiges Datum."
  }

  // Enddatum nicht vor Startdatum
  if (endDate < startDate) {
    return "Enddatum darf nicht vor Startdatum liegen."
  }

  // Nicht mehr als 2 Jahre Spanne (Performance)
  const maxDays = 365 * 2
  const diffDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays > maxDays) {
    return "Zeitraum darf maximal 2 Jahre umfassen."
  }

  // Nicht in der Zukunft
  const today = new Date()
  today.setHours(23, 59, 59, 999)
  if (startDate > today) {
    return "Startdatum liegt in der Zukunft."
  }

  return null // Gültig
}

export interface FinanceKPIs {
  /** Summe customer_amount aller relevanten Touren */
  umsatz: number
  /** Summe driver_amount_final oder driver_amount_original */
  fahrerlohn: number
  /** Arbeitgeberkosten (aus estimated_employer_costs oder berechnet) */
  arbeitgeberkosten: number
  /** Verwendeter Arbeitgeberabgaben-Satz (in %) */
  employerContributionRateUsed: number
  /** Quelle der AG-Kosten: 'tour' wenn estimated_employer_costs, 'setting' wenn aus system_settings, 'fallback' wenn 31.17% */
  arbeitgeberkostenQuelle: "tour" | "setting" | "fallback" | "mixed"
  /** Umsatz - Fahrerlohn */
  margeVorArbeitgeberkosten: number
  /** Umsatz - Fahrerlohn - Arbeitgeberkosten */
  margeNachArbeitgeberkosten: number
  /** (Marge nach AG-Kosten / Umsatz) * 100 */
  margenquote: number | null
  /** Durchschnittlicher Ertrag pro Tour */
  ertragProTour: number | null
  /** Durchschnittlicher Umsatz pro aktivem Fahrtag */
  umsatzProFahrtag: number | null
  /** Durchschnittlicher Ertrag pro aktivem Fahrtag */
  ertragProFahrtag: number | null
  /** Ob alle Berechnungen möglich waren */
  vollstaendig: boolean
  /** Fehlermeldungen falls Daten fehlen */
  fehler: string[]
  /** Quelle der Umsatzberechnung */
  umsatzQuelle: "pricing_table" | "fallback_constant" | "mixed"
  /** Anzahl Touren mit Umsatz aus pricing_tables */
  tourenMitPricingTable: number
  /** Anzahl Touren mit Umsatz aus Fallback-Konstanten */
  tourenMitFallback: number
  /** Anzahl Touren ohne berechenbaren Umsatz */
  tourenOhneUmsatz: number
}

export interface QualityKPIs {
  /** Anzahl Touren gesamt im Zeitraum */
  tourenGesamt: number
  /** Anzahl genehmigte Touren (approved + billed) */
  tourenGenehmigt: number
  /** Anzahl abgelehnte Touren */
  tourenAbgelehnt: number
  /** Anzahl Rückläufer */
  tourenRuecklaufer: number
  /** Anzahl pending */
  tourenOffen: number
  /** (Abgelehnt / Gesamt) * 100 */
  ablehnungsquote: number | null
  /** (Rückläufer / Gesamt) * 100 */
  ruecklauferquote: number | null
}

export interface AuslagenKPIs {
  /** Summe aller Auslagen-Kosten */
  auslagenGesamt: number
  /** Summe offener Auslagen (pending + approved) */
  auslagenOffen: number
  /** Summe erstatteter Auslagen (paid) */
  auslagenErstattet: number
  /** Summe abgelehnter Auslagen */
  auslagenAbgelehnt: number
  /** Anzahl Auslagen */
  anzahlGesamt: number
  anzahlOffen: number
  anzahlErstattet: number
  anzahlAbgelehnt: number
  /** (Auslagen / Umsatz) * 100 */
  auslagenquote: number | null
}

/** Wirtschaftliche Bewertung eines Fahrers */
export type FahrerBewertung = "stark" | "ausbauen" | "pruefen" | "inaktiv"

/** Vergütungsmodell-Typ */
export type CompensationModelType = 'tour_based_minijob' | 'fixed_salary_part_time' | 'fixed_salary_full_time'

export interface FahrerLeistungKPI {
  /** Canonical Key (normalisierter Name) */
  canonicalKey: string
  /** Fahrer-ID aus der Fahrer-Tabelle (für Link zur Fahrerakte) */
  fahrerId: number | null
  /** Anzeige-Name */
  name: string
  /** Anzahl Touren im Zeitraum */
  touren: number
  /** Anzahl aktive Fahrtage (distinct Tage mit Touren) */
  aktiveFahrtage: number
  /** Ziel mindestens 6 aktive Tage erreicht (für Monatszeitraum, nur für tour_based_minijob) */
  zielErreicht: boolean | null
  /** Umsatz im Zeitraum */
  umsatz: number
  /** Fahrerlohn im Zeitraum */
  lohn: number
  /** Arbeitgeberkosten im Zeitraum */
  arbeitgeberkosten: number
  /** Ertrag nach Arbeitgeberkosten */
  ertrag: number
  /** Margenquote (Ertrag / Umsatz * 100) */
  margenquote: number | null
  /** Umsatz pro aktivem Tag */
  umsatzProTag: number | null
  /** Ertrag pro aktivem Tag */
  ertragProTag: number | null
  /** Kostenquote ((Lohn + AG-Kosten) / Umsatz * 100) */
  kostenquote: number | null
  /** Anteil am Gesamtumsatz (%) */
  anteilUmsatz: number | null
  /** Anteil am Gesamtertrag (%) */
  anteilErtrag: number | null
  /** Wirtschaftliche Bewertung */
  bewertung: FahrerBewertung
  /** Monatlicher Lohn relativ zum Minijob-Limit (in %) - nur für tour_based_minijob */
  minijobAuslastung: number | null
  /** Vergütungsmodell des Fahrers */
  compensationModel: CompensationModelType
  /** Soll-Arbeitstage im Zeitraum (nur für Festgehalt-Vollzeit) */
  sollArbeitstage: number | null
  /** Leerlauftage (Soll-Arbeitstage ohne Tour, nur für Festgehalt) */
  leerlauftage: number | null
  /** Auslastungsquote (Einsatztage / Soll-Arbeitstage * 100, nur für Festgehalt) */
  auslastungsquote: number | null
  /** Umsatz pro Soll-Arbeitstag (nur für Festgehalt-Vollzeit) */
  umsatzProSollArbeitstag: number | null
  /** Kalkulatorische Monatskosten (nur für Festgehalt, aus Planwerten) */
  planMonatskosten: number | null
  /** Erforderlicher Tagesumsatz zur Kostendeckung (nur für Festgehalt) */
  tageszielKostendeckung: number | null
  /** Kostendeckungs-Status */
  kostendeckungsStatus: 'ueber_ziel' | 'nahe_ziel' | 'unter_ziel' | 'operativ_pruefen' | null
  /** Arbeitstage im Zeitraum (Mo-Fr minus Feiertage) - für alle Festgehaltfahrer */
  monatsArbeitstage: number | null
  /** Umsatz pro Monatsarbeitstag (als Orientierungswert, auch für Teilzeit) */
  umsatzProMonatsArbeitstag: number | null
  /** Differenz zum Tagesziel (Umsatz pro Monatsarbeitstag - Tagesziel) */
  differenzZumTagesziel: number | null
  /** NEU: Saldo gegen Plan-Monatskosten (Umsatz - 2400€) für Festgehalt */
  saldoGegenPlan: number | null
  /** NEU: Bisherige Arbeitstage im aktuellen Monat */
  bisherigArbeitstage: number | null
  /** NEU: Anteilige Plan-Kosten bis heute */
  anteiligePlanKosten: number | null
  /** NEU: Anteiliger Saldo bis heute */
  anteiligenSaldo: number | null
}

export interface FahrerKPIs {
  /** Anzahl aktiver Fahrer (Stammdaten) */
  aktiveFahrer: number
  /** Anzahl Fahrer mit Touren im Zeitraum */
  fahrerMitTouren: number
  /** Aktive Fahrtage gesamt (alle Fahrer, distinct) */
  aktiveFahrtageGesamt: number
  /** Durchschnitt Touren pro Fahrer */
  tourenProFahrer: number | null
  /** Durchschnitt Umsatz pro Fahrer */
  umsatzProFahrer: number | null
  /** Durchschnitt Ertrag pro Fahrer */
  ertragProFahrer: number | null
  /** Durchschnitt aktive Tage pro Fahrer */
  aktiveTageProFahrer: number | null
  /** Alle Fahrer mit KPIs (für Tabelle und Rankings) */
  alleFahrer: FahrerLeistungKPI[]
  /** Top Minijob-Fahrer nach Ertrag (NUR tour_based_minijob!) */
  topMinijobFahrerErtrag: FahrerLeistungKPI[]
  /** Top Fahrer nach Umsatz (alle Fahrer) */
  topFahrerUmsatz: FahrerLeistungKPI[]
  /** Top Fahrer nach Touren */
  topFahrerTouren: FahrerLeistungKPI[]
  /** Fahrer mit guter Marge aber wenig Tagen (Ausbauen) - nur Minijob */
  fahrerAusbauen: FahrerLeistungKPI[]
  /** Fahrer mit vielen Tagen aber schwacher Marge (Prüfen) - nur Minijob */
  fahrerPruefen: FahrerLeistungKPI[]
  /** Anzahl Minijob-Fahrer unter Ziel (< 6 aktive Tage, nur bei Monatszeitraum) */
  fahrerUnterZiel: number
  /** Anzahl Minijob-Fahrer mit Touren */
  minijobFahrerMitTouren: number
  /** Anzahl Festgehalt-Fahrer mit Touren */
  festgehaltFahrerMitTouren: number
  /** Nur Minijobfahrer für separate Charts */
  minijobFahrer: FahrerLeistungKPI[]
  /** Nur Festgehaltfahrer für Controlling-Bereich */
  festgehaltFahrer: FahrerLeistungKPI[]
  /** Arbeitstage im Zeitraum (Mo-Fr minus NRW-Feiertage) */
  monatsArbeitstage: number
}

/** Monatlicher Trend-Datenpunkt für Grafiken */
export interface MonthlyTrendDataPoint {
  /** Monat im Format "YYYY-MM" */
  monat: string
  /** Anzeige-Label (z.B. "Jan 26") */
  monatLabel: string
  /** Umsatz im Monat */
  umsatz: number
  /** Anzahl Touren */
  touren: number
  /** Anzahl Einsatztage */
  einsatztage: number
  /** Umsatz pro Einsatztag */
  umsatzProEinsatztag: number | null
  /** Soll-Arbeitstage (nur für Vollzeit-Festgehalt) */
  sollArbeitstage: number | null
  /** Auslastungsquote (nur für Vollzeit-Festgehalt) */
  auslastungsquote: number | null
  /** Tagesziel zur Kostendeckung (nur für Festgehalt) */
  tageszielKostendeckung: number | null
  /** Umsatz pro Soll-Arbeitstag (nur für Vollzeit-Festgehalt) */
  umsatzProSollArbeitstag: number | null
  /** NEU: Fahrerlohn im Monat (für Minijob tourbasiert) */
  fahrerlohn: number
  /** NEU: Arbeitgeberkosten im Monat */
  arbeitgeberkosten: number
  /** NEU: Marge/Deckungsbeitrag (Umsatz - Fahrerlohn - AG-Kosten) */
  marge: number
  /** NEU: Margenquote in % */
  margenquote: number | null
}

/** Trend-Daten für einen Fahrer oder aggregiert */
export interface TrendData {
  /** Fahrer-Name (oder "Alle Fahrer" für aggregiert) */
  fahrerName: string
  /** Fahrer-ID (null für aggregiert) */
  fahrerId: number | null
  /** Vergütungsmodell (null für aggregiert) */
  compensationModel: CompensationModelType | null
  /** Monatliche Datenpunkte */
  monatsDaten: MonthlyTrendDataPoint[]
  /** Trend-Richtung (basierend auf letzten 2 Monaten) */
  trend: MonthlyTrendType
}

/** Einzelne verspätete Tour mit Details */
export interface VerspaeteteTourDetail {
  tourId: number
  tourNr: string
  datum: string
  uploadZeitpunkt: string
  sollFrist: string // Ende des Tour-Datums (23:59:59)
  verspaetungMinuten: number
  verspaetungFormatiert: string // z.B. "1 Tag 3 Std" oder "45 Min"
  status: string
  fahrerId?: number
  fahrerName?: string
}

/** Erweiterte Upload-Compliance pro Fahrer mit Details */
export interface FahrerUploadComplianceDetail extends FahrerUploadCompliance {
  /** Maximale Verspätung in Minuten */
  maxVerspaetungMinuten: number
  /** Formatierte maximale Verspätung */
  maxVerspaetungFormatiert: string
  /** Liste der verspäteten Touren mit Details */
  verspaeteteTouren: VerspaeteteTourDetail[]
}

/** Verfügbarkeits-Tages-Detail */
export interface VerfuegbarkeitTagDetail {
  datum: string
  wochentag: string
  istVerfuegbar: boolean
  hatTour: boolean
  anzahlTouren: number
  status: 'eingesetzt' | 'verfuegbar_ohne_tour' | 'nicht_verfuegbar' | 'nicht_gemeldet'
  verfuegbarkeitStatus?: string
  preferredTourType?: string | null
  note?: string | null
}

/** Erweiterte Verfügbarkeits-Auslastung pro Fahrer */
export interface FahrerVerfuegbarkeitsDetail extends FahrerVerfuegbarkeitsAuslastung {
  /** Tagesweise Details */
  tageDetails: VerfuegbarkeitTagDetail[]
  /** Nicht gemeldete Tage */
  nichtGemeldeteTage: number
}

// NEU: Compliance KPIs
export interface ComplianceKPIs {
  /** Upload-Pünktlichkeit pro Fahrer */
  uploadCompliance: FahrerUploadCompliance[]
  /** Erweiterte Upload-Compliance mit Details */
  uploadComplianceDetail: FahrerUploadComplianceDetail[]
  /** Verfügbarkeit vs. Einsatz pro Fahrer */
  verfuegbarkeitsAuslastung: FahrerVerfuegbarkeitsAuslastung[]
  /** Erweiterte Verfügbarkeits-Details */
  verfuegbarkeitsDetail: FahrerVerfuegbarkeitsDetail[]
  /** Zusammenfassung */
  summary: {
    /** Durchschnittliche Pünktlichkeitsquote (0-100%) */
    avgPuenktlichkeitsQuote: number | null
    /** Durchschnittliche Einsatzquote (0-100%) */
    avgEinsatzQuote: number | null
    /** Anzahl Fahrer mit verspäteten Uploads im Zeitraum */
    fahrerMitVerspaetungen: number
    /** Anzahl Fahrer mit verfügbaren Tagen ohne Tour */
    fahrerMitUngenutzterVerfuegbarkeit: number
    /** Gesamt verfügbare Tage */
    gesamtVerfuegbareTage: number
    /** Gesamt Tage ohne Tour */
    gesamtTageOhneTour: number
    /** Gesamt nicht gemeldete Tage */
    gesamtNichtGemeldeteTage: number
    /** Gesamt eingesetzte Tage */
    gesamtEingesetzteTage: number
    /** Gesamt nicht verfügbare Tage */
    gesamtNichtVerfuegbareTage: number
  }
  /** Alle verspäteten Touren im Zeitraum (sortiert) */
  alleVerspaetetenTouren: VerspaeteteTourDetail[]
  /** Datenverfügbarkeit */
  datenStatus: {
    verfuegbarkeitGeladen: boolean
    verfuegbarkeitAnzahl: number
    fehler?: string
  }
}

export interface AnalyticsData {
  zeitraum: {
    start: string
    end: string
    label: string
    /** Ob es ein Monatszeitraum ist (für Ziel-Berechnung) */
    istMonat: boolean
  }
  finanzen: FinanceKPIs
  qualitaet: QualityKPIs
  auslagen: AuslagenKPIs
  fahrer: FahrerKPIs
  /** NEU: Compliance-KPIs */
  compliance: ComplianceKPIs
  /** NEU: Monatstrend-Daten (für aktuellen Filter-Zeitraum) */
  trend: TrendData | null
  /** NEU: 6-Monats-Trend (immer die letzten 6 Monate, unabhängig vom Filter) */
  trendSixMonths: TrendData | null
  /** Zeitpunkt der Berechnung */
  berechnetAm: string
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Berechnet Start- und Enddatum basierend auf TimeRange
 */
export function getDateRange(params: TimeRangeParams): { start: string; end: string; label: string; istMonat: boolean } {
  const now = new Date()
  const today = now.toISOString().split("T")[0]

  switch (params.range) {
    case "current_month": {
      const year = now.getFullYear()
      const month = now.getMonth() + 1
      const start = `${year}-${String(month).padStart(2, "0")}-01`
      const lastDay = new Date(year, month, 0).getDate()
      const end = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`
      const monthName = now.toLocaleDateString("de-DE", { month: "long", year: "numeric" })
      return { start, end, label: monthName, istMonat: true }
    }

    case "last_month": {
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const year = lastMonth.getFullYear()
      const month = lastMonth.getMonth() + 1
      const start = `${year}-${String(month).padStart(2, "0")}-01`
      const lastDay = new Date(year, month, 0).getDate()
      const end = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`
      const monthName = lastMonth.toLocaleDateString("de-DE", { month: "long", year: "numeric" })
      return { start, end, label: monthName, istMonat: true }
    }

    case "current_quarter": {
      const year = now.getFullYear()
      const month = now.getMonth() + 1
      const quarter = Math.floor((month - 1) / 3) + 1
      const startMonth = (quarter - 1) * 3 + 1
      const start = `${year}-${String(startMonth).padStart(2, "0")}-01`
      const endMonth = startMonth + 2
      const lastDay = new Date(year, endMonth, 0).getDate()
      const end = `${year}-${String(endMonth).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`
      const quarterLabel = `Q${quarter} ${year}`
      return { start, end, label: `Aktuelles Quartal (${quarterLabel})`, istMonat: false }
    }

    case "last_quarter": {
      let year = now.getFullYear()
      let month = now.getMonth() + 1
      let quarter = Math.floor((month - 1) / 3) + 1
      if (quarter === 1) {
        // Vorheriges Quartal ist Q4 des Vorjahres
        year = year - 1
        quarter = 4
      } else {
        quarter = quarter - 1
      }
      const startMonth = (quarter - 1) * 3 + 1
      const start = `${year}-${String(startMonth).padStart(2, "0")}-01`
      const endMonth = startMonth + 2
      const lastDay = new Date(year, endMonth, 0).getDate()
      const end = `${year}-${String(endMonth).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`
      const quarterLabel = `Q${quarter} ${year}`
      return { start, end, label: `Letztes Quartal (${quarterLabel})`, istMonat: false }
    }

    case "current_year": {
      const year = now.getFullYear()
      const start = `${year}-01-01`
      const end = `${year}-12-31`
      return { start, end, label: `Aktuelles Jahr (${year})`, istMonat: false }
    }

    case "last_year": {
      const year = now.getFullYear() - 1
      const start = `${year}-01-01`
      const end = `${year}-12-31`
      return { start, end, label: `Letztes Jahr (${year})`, istMonat: false }
    }

    case "since_dec_2025": {
      return { start: "2025-12-01", end: today, label: "Seit Dezember 2025", istMonat: false }
    }

    case "custom": {
      if (!params.customStart || !params.customEnd) {
        throw new Error("customStart und customEnd müssen für custom range angegeben werden")
      }
      // Heuristik: Wenn Zeitraum exakt ein Monat, dann istMonat = true
      const startDate = new Date(params.customStart)
      const endDate = new Date(params.customEnd)
      const isMonth =
        startDate.getDate() === 1 &&
        endDate.getDate() === new Date(endDate.getFullYear(), endDate.getMonth() + 1, 0).getDate() &&
        startDate.getMonth() === endDate.getMonth() &&
        startDate.getFullYear() === endDate.getFullYear()
      return {
        start: params.customStart,
        end: params.customEnd,
        label: `${formatDate(params.customStart)} - ${formatDate(params.customEnd)}`,
        istMonat: isMonth
      }
    }

    default:
      return { start: "2025-12-01", end: today, label: "Seit Dezember 2025", istMonat: false }
  }
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" })
}

/**
 * Sicher einen Zahlenwert aus unbekanntem Typ extrahieren
 */
function safeNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && !isNaN(value)) return value
  if (typeof value === "string") {
    const parsed = parseFloat(value)
    return isNaN(parsed) ? fallback : parsed
  }
  return fallback
}

// ============================================================
// MAIN CALCULATION FUNCTION
// ============================================================

/**
 * Berechnet alle Analytics-KPIs für einen gegebenen Zeitraum.
 *
 * WICHTIG:
 * - Verwendet NUR echte Daten aus der Datenbank
 * - Ändert KEINE Daten
 * - Gibt "nicht berechenbar" zurück wenn Daten fehlen
 * - Nur für Admin/GF (Aufruf muss rollengeprüft sein)
 */
export async function calculateAnalytics(params: TimeRangeParams): Promise<AnalyticsData> {
  const dateRange = getDateRange(params)
  const fehler: string[] = []

  // ============================================================
  // 1. DATEN LADEN
  // ============================================================

  // 1a. System Settings für Minijob-Limit und Arbeitgeberbeitrag
  let minijobLimit = MONTHLY_LIMIT // Fallback 556
  let employerContributionRate = 0.3117 // Fallback 31.17% (Phase-1-konform)
  let employerRateSource: "setting" | "fallback" = "fallback"

  try {
    const settings = await getActiveSystemSettings()
    const minijobSetting = settings.find(s => s.key === "minijob_limit")
    const employerSetting = settings.find(s => s.key === "employer_contribution_rate")

    if (minijobSetting?.value !== undefined && minijobSetting.value !== null) {
      minijobLimit = safeNumber(minijobSetting.value, MONTHLY_LIMIT)
    }
    if (employerSetting?.value !== undefined && employerSetting.value !== null) {
      // Setting ist in Prozent gespeichert (z.B. 31.17 für 31.17%)
      employerContributionRate = safeNumber(employerSetting.value, 31.17) / 100
      employerRateSource = "setting"
    }
  } catch (err) {
    fehler.push("System-Einstellungen konnten nicht geladen werden")
  }

  // 1b. Arbeitsnachweise laden
  interface ArbeitsnachweisRow {
    id: number
    tour_nr: string | null
    user_id: string
    datum: string
    created_at?: string // Für Upload-Compliance
    gefahrene_km: number | null
    wartezeit: string | null
    auftraggeber: string | null
    customer_id: string | null
    status: string
    ist_ruecklaufer: boolean | null
    is_return: boolean | null
    driver_amount_final: number | null
    estimated_employer_costs: number | null // Phase-1: AG-Kosten pro Tour
    profiles?: {
      full_name: string
      zeitmodell: string | null
    } | { full_name: string; zeitmodell: string | null }[] | null
  }

  let arbeitsnachweise: ArbeitsnachweisRow[] = []
  try {
    const { data, error } = await supabase
      .from("arbeitsnachweise")
      .select(`
        id,
        tour_nr,
        user_id,
        datum,
        created_at,
        gefahrene_km,
        wartezeit,
        auftraggeber,
        customer_id,
        status,
        ist_ruecklaufer,
        is_return,
        driver_amount_final,
        estimated_employer_costs,
        profiles!arbeitsnachweise_user_id_fkey (
          full_name,
          zeitmodell
        )
      `)
      .gte("datum", dateRange.start)
      .lte("datum", dateRange.end)
      .order("datum", { ascending: false })

    if (error) throw error
    arbeitsnachweise = (data || []) as ArbeitsnachweisRow[]
  } catch (err) {
    fehler.push("Arbeitsnachweise konnten nicht geladen werden")
  }

  // 1c. Auslagennachweise laden
  interface AuslagennachweisRow {
    id: number
    user_id: string
    datum: string
    kosten: number | null
    status: string
  }

  let auslagennachweise: AuslagennachweisRow[] = []
  try {
    const { data, error } = await supabase
      .from("auslagennachweise")
      .select("id, user_id, datum, kosten, status")
      .gte("datum", dateRange.start)
      .lte("datum", dateRange.end)
      .order("datum", { ascending: false })

    if (error) throw error
    auslagennachweise = (data || []) as AuslagennachweisRow[]
  } catch (err) {
    fehler.push("Auslagennachweise konnten nicht geladen werden")
  }

  // 1d. Fahrer laden (mit compensation_model)
  interface FahrerRow {
    id: number
    user_id: string
    status: string
    vorname: string
    nachname: string
    profiles?: {
      full_name: string
      zeitmodell: string | null
      compensation_model: string | null
    } | { full_name: string; zeitmodell: string | null; compensation_model: string | null }[] | null
  }

  let fahrer: FahrerRow[] = []
  try {
    const { data, error } = await supabase
      .from("fahrer")
      .select(`
        id,
        user_id,
        status,
        vorname,
        nachname,
        profiles!fahrer_user_id_fkey (
          full_name,
          zeitmodell,
          compensation_model
        )
      `)

    if (error) throw error
    fahrer = (data || []) as FahrerRow[]
  } catch (err) {
    fehler.push("Fahrer konnten nicht geladen werden")
  }

  // ============================================================
  // 2. FINANZ-KPIs BERECHNEN
  // ============================================================

  let umsatz = 0
  let fahrerlohn = 0

  // Nur genehmigte Touren (approved, billed) für Finanzen
  const relevantTouren = arbeitsnachweise.filter(
    t => t.status === "approved" || t.status === "billed"
  )

  // Helper to extract profile data (handles array or object)
  function getProfileName(profiles: ArbeitsnachweisRow["profiles"]): string | undefined {
    if (!profiles) return undefined
    if (Array.isArray(profiles)) {
      return profiles[0]?.full_name || undefined
    }
    return profiles.full_name || undefined
  }

  // ============================================================
  // 2.1 UMSATZ aus pricing_tables berechnen (Primärquelle)
  // ============================================================

  // Zähler für Umsatz-Quelle
  let tourenMitPricingTable = 0
  let tourenMitFallback = 0
  let tourenOhneUmsatz = 0

  // Batch-Berechnung der Kundenpreise aus pricing_tables
  const tourenFuerPreisberechnung = relevantTouren.map(t => ({
    id: t.id,
    tour_nr: t.tour_nr || `T${t.id}`,  // Fallback für Analytics
    datum: t.datum,
    gefahrene_km: safeNumber(t.gefahrene_km, 0),
    wartezeit: t.wartezeit || undefined,
    customer_id: t.customer_id || undefined,
    auftraggeber: t.auftraggeber || undefined
  }))

  // Lade Kundenpreise aus pricing_tables (mit Fallback auf Code-Konstanten)
  const preisResults = await calculateCustomerAmountsForTours(tourenFuerPreisberechnung)

  // Map für schnellen Zugriff auf Preise
  const preisMap = new Map<number, CustomerPriceResult>()
  for (const [tourId, result] of preisResults) {
    preisMap.set(tourId, result)

    // Zähle Quelle
    if (result.calculation_source === 'pricing_table') {
      tourenMitPricingTable++
    } else if (result.calculation_source === 'fallback_constant') {
      tourenMitFallback++
    } else {
      tourenOhneUmsatz++
    }
  }

  // Zähler für AG-Kosten-Quelle
  let arbeitgeberkostenAusTour = 0
  let arbeitgeberkostenBerechnet = 0
  let countTourMitEstimatedCosts = 0

  for (const tour of relevantTouren) {
    const km = safeNumber(tour.gefahrene_km, 0)
    const wartezeit = tour.wartezeit || undefined
    const fahrerName = getProfileName(tour.profiles)

    // Umsatz = Kundenpreis aus pricing_tables (Primärquelle)
    const priceResult = preisMap.get(tour.id)
    if (priceResult) {
      umsatz += priceResult.amount
    } else {
      // Fallback auf Code-Konstanten (sollte nicht passieren, da calculateCustomerAmountsForTours alle Touren verarbeitet)
      const auftraggeber = (tour.auftraggeber as Auftraggeber) || undefined
      umsatz += calculateCustomerTotal(km, wartezeit, auftraggeber)
      tourenMitFallback++
    }

    // Fahrerlohn = driver_amount_final wenn vorhanden, sonst berechnen
    let tourFahrerlohn = 0
    if (tour.driver_amount_final !== null && tour.driver_amount_final !== undefined) {
      tourFahrerlohn = safeNumber(tour.driver_amount_final, 0)
    } else {
      // Fallback: berechnen (berücksichtigt hasNoSalary)
      tourFahrerlohn = calculateTourVerdienst(km, wartezeit, fahrerName)
    }
    fahrerlohn += tourFahrerlohn

    // Arbeitgeberkosten: estimated_employer_costs bevorzugen, sonst berechnen
    if (tour.estimated_employer_costs !== null && tour.estimated_employer_costs !== undefined) {
      arbeitgeberkostenAusTour += safeNumber(tour.estimated_employer_costs, 0)
      countTourMitEstimatedCosts++
    } else {
      arbeitgeberkostenBerechnet += tourFahrerlohn * employerContributionRate
    }
  }

  // Bestimme Umsatz-Quelle
  let umsatzQuelle: "pricing_table" | "fallback_constant" | "mixed" = "pricing_table"
  if (tourenMitPricingTable === 0 && tourenMitFallback > 0) {
    umsatzQuelle = "fallback_constant"
  } else if (tourenMitPricingTable > 0 && tourenMitFallback > 0) {
    umsatzQuelle = "mixed"
  }

  // Warnung bei Fallback-Nutzung
  if (tourenMitFallback > 0) {
    fehler.push(`${tourenMitFallback} Tour(en) mit Fallback-Konstanten berechnet (keine passende Preisliste)`)
  }
  if (tourenOhneUmsatz > 0) {
    fehler.push(`${tourenOhneUmsatz} Tour(en) ohne berechenbaren Umsatz (fehlende KM)`)
  }

  // Gesamte Arbeitgeberkosten
  const arbeitgeberkosten = arbeitgeberkostenAusTour + arbeitgeberkostenBerechnet

  // Bestimme Quelle der AG-Kosten
  let arbeitgeberkostenQuelle: "tour" | "setting" | "fallback" | "mixed" = "fallback"
  if (countTourMitEstimatedCosts === relevantTouren.length && relevantTouren.length > 0) {
    arbeitgeberkostenQuelle = "tour"
  } else if (countTourMitEstimatedCosts === 0) {
    arbeitgeberkostenQuelle = employerRateSource
  } else {
    arbeitgeberkostenQuelle = "mixed"
  }

  // Margen berechnen
  const margeVorArbeitgeberkosten = umsatz - fahrerlohn
  const margeNachArbeitgeberkosten = umsatz - fahrerlohn - arbeitgeberkosten
  const margenquote = umsatz > 0 ? (margeNachArbeitgeberkosten / umsatz) * 100 : null

  // Für neue KPIs: Ertrag pro Tour, Umsatz/Ertrag pro Fahrtag
  // Aktive Fahrtage = Anzahl distinct Tage mit genehmigten Touren
  const aktiveTageFinanzSet = new Set<string>()
  for (const tour of relevantTouren) {
    if (tour.datum) aktiveTageFinanzSet.add(tour.datum)
  }
  const aktiveTageFinanz = aktiveTageFinanzSet.size

  const ertragProTour = relevantTouren.length > 0 ? margeNachArbeitgeberkosten / relevantTouren.length : null
  const umsatzProFahrtag = aktiveTageFinanz > 0 ? umsatz / aktiveTageFinanz : null
  const ertragProFahrtag = aktiveTageFinanz > 0 ? margeNachArbeitgeberkosten / aktiveTageFinanz : null

  const finanzen: FinanceKPIs = {
    umsatz,
    fahrerlohn,
    arbeitgeberkosten,
    employerContributionRateUsed: employerContributionRate * 100, // In Prozent für Anzeige
    arbeitgeberkostenQuelle,
    margeVorArbeitgeberkosten,
    margeNachArbeitgeberkosten,
    margenquote,
    ertragProTour,
    umsatzProFahrtag,
    ertragProFahrtag,
    vollstaendig: fehler.length === 0,
    fehler,
    // Neue Felder für Umsatz-Quelle
    umsatzQuelle,
    tourenMitPricingTable,
    tourenMitFallback,
    tourenOhneUmsatz
  }

  // ============================================================
  // 3. QUALITÄTS-KPIs BERECHNEN
  // ============================================================

  const tourenGesamt = arbeitsnachweise.length
  const tourenGenehmigt = arbeitsnachweise.filter(
    t => t.status === "approved" || t.status === "billed"
  ).length
  const tourenAbgelehnt = arbeitsnachweise.filter(t => t.status === "rejected").length
  const tourenOffen = arbeitsnachweise.filter(t => t.status === "pending").length
  const tourenRuecklaufer = arbeitsnachweise.filter(
    t => t.ist_ruecklaufer === true || t.is_return === true
  ).length

  const ablehnungsquote = tourenGesamt > 0 ? (tourenAbgelehnt / tourenGesamt) * 100 : null
  const ruecklauferquote = tourenGesamt > 0 ? (tourenRuecklaufer / tourenGesamt) * 100 : null

  const qualitaet: QualityKPIs = {
    tourenGesamt,
    tourenGenehmigt,
    tourenAbgelehnt,
    tourenRuecklaufer,
    tourenOffen,
    ablehnungsquote,
    ruecklauferquote
  }

  // ============================================================
  // 4. AUSLAGEN-KPIs BERECHNEN
  // ============================================================

  const auslagenGesamt = auslagennachweise.reduce((sum, a) => sum + safeNumber(a.kosten, 0), 0)
  const auslagenOffenRows = auslagennachweise.filter(
    a => a.status === "pending" || a.status === "approved"
  )
  const auslagenErstattetRows = auslagennachweise.filter(a => a.status === "paid")
  const auslagenAbgelehntRows = auslagennachweise.filter(a => a.status === "rejected")

  const auslagenOffen = auslagenOffenRows.reduce((sum, a) => sum + safeNumber(a.kosten, 0), 0)
  const auslagenErstattet = auslagenErstattetRows.reduce((sum, a) => sum + safeNumber(a.kosten, 0), 0)
  const auslagenAbgelehnt = auslagenAbgelehntRows.reduce((sum, a) => sum + safeNumber(a.kosten, 0), 0)

  const auslagenquote = umsatz > 0 ? (auslagenGesamt / umsatz) * 100 : null

  const auslagenKPIs: AuslagenKPIs = {
    auslagenGesamt,
    auslagenOffen,
    auslagenErstattet,
    auslagenAbgelehnt,
    anzahlGesamt: auslagennachweise.length,
    anzahlOffen: auslagenOffenRows.length,
    anzahlErstattet: auslagenErstattetRows.length,
    anzahlAbgelehnt: auslagenAbgelehntRows.length,
    auslagenquote
  }

  // ============================================================
  // 5. FAHRER-KPIs BERECHNEN
  // ============================================================

  const aktiveFahrerList = fahrer.filter(f => f.status === "aktiv")
  const aktiveFahrer = aktiveFahrerList.length

  /**
   * Normalisiert einen Fahrernamen für eindeutige Gruppierung.
   * - lowercase
   * - trim
   * - mehrfache Leerzeichen entfernen
   * - Umlaute vereinheitlichen
   * - Sonderzeichen entfernen
   */
  function normalizeDriverName(name: string): string {
    if (!name) return "unbekannt"
    return name
      .toLowerCase()
      .trim()
      .replace(/\s+/g, " ")           // Mehrfache Leerzeichen -> ein Leerzeichen
      .replace(/ä/g, "ae")
      .replace(/ö/g, "oe")
      .replace(/ü/g, "ue")
      .replace(/ß/g, "ss")
      .replace(/[^a-z0-9 ]/g, "")     // Nur Buchstaben, Zahlen, Leerzeichen
      .trim()
  }

  /**
   * Extrahiert den Anzeige-Namen aus FahrerRow.
   */
  function getFahrerDisplayName(f: FahrerRow): string {
    if (f.profiles) {
      if (Array.isArray(f.profiles) && f.profiles.length > 0) {
        return f.profiles[0].full_name || `${f.vorname} ${f.nachname}`
      }
      if (!Array.isArray(f.profiles) && f.profiles.full_name) {
        return f.profiles.full_name
      }
    }
    return `${f.vorname} ${f.nachname}`
  }

  // Mapping: user_id -> { fahrerId, displayName, normalizedName, compensationModel }
  interface FahrerInfo {
    fahrerId: number
    displayName: string
    normalizedName: string
    compensationModel: CompensationModelType
  }
  const userIdToFahrerMap = new Map<string, FahrerInfo>()

  /**
   * Extrahiert das Vergütungsmodell aus FahrerRow.
   */
  function getFahrerCompensationModel(f: FahrerRow): CompensationModelType {
    if (f.profiles) {
      if (Array.isArray(f.profiles) && f.profiles.length > 0) {
        const model = f.profiles[0].compensation_model
        if (model === 'fixed_salary_part_time' || model === 'fixed_salary_full_time') {
          return model
        }
      } else if (!Array.isArray(f.profiles) && f.profiles.compensation_model) {
        const model = f.profiles.compensation_model
        if (model === 'fixed_salary_part_time' || model === 'fixed_salary_full_time') {
          return model as CompensationModelType
        }
      }
    }
    return 'tour_based_minijob' // Default
  }

  // Mapping: normalizedName -> kanonischer displayName (erster gefundener)
  // Fallback für migrierte Alt-Daten; langfristig Stammdaten bereinigen.
  const normalizedNameToCanonical = new Map<string, string>()

  // Mapping: normalizedName -> compensation_model (für Fahrer-Gruppierung)
  const normalizedNameToCompensationModel = new Map<string, CompensationModelType>()

  for (const f of fahrer) {
    const displayName = getFahrerDisplayName(f)
    const normalizedName = normalizeDriverName(displayName)
    const compensationModel = getFahrerCompensationModel(f)

    // Kanonischen Namen merken (erster Treffer gewinnt)
    if (!normalizedNameToCanonical.has(normalizedName)) {
      normalizedNameToCanonical.set(normalizedName, displayName)
    }

    // Vergütungsmodell für Name merken (für Fahrer-Gruppierung)
    if (!normalizedNameToCompensationModel.has(normalizedName)) {
      normalizedNameToCompensationModel.set(normalizedName, compensationModel)
    }

    if (f.user_id) {
      userIdToFahrerMap.set(f.user_id, {
        fahrerId: f.id,
        displayName,
        normalizedName,
        compensationModel
      })
    }
  }

  // Fahrer-Leistung aggregieren (nur genehmigte Touren)
  // Gruppierung: Canonical Key = normalisierter Name
  type FahrerLeistungKPIInternal = Omit<FahrerLeistungKPI,
    | "aktiveFahrtage"
    | "zielErreicht"
    | "arbeitgeberkosten"
    | "ertrag"
    | "margenquote"
    | "umsatzProTag"
    | "ertragProTag"
    | "kostenquote"
    | "anteilUmsatz"
    | "anteilErtrag"
    | "bewertung"
    | "sollArbeitstage"
    | "leerlauftage"
    | "auslastungsquote"
    | "umsatzProSollArbeitstag"
    | "planMonatskosten"
    | "tageszielKostendeckung"
    | "kostendeckungsStatus"
    | "monatsArbeitstage"
    | "umsatzProMonatsArbeitstag"
    | "differenzZumTagesziel"
    | "saldoGegenPlan"
    | "bisherigArbeitstage"
    | "anteiligePlanKosten"
    | "anteiligenSaldo"
  > & {
    tageSet: Set<string>
    umsatz: number
    lohn: number
    touren: number
    minijobAuslastung: number | null
    compensationModel: CompensationModelType
  }

  const fahrerLeistungMap = new Map<string, FahrerLeistungKPIInternal>()

  for (const tour of relevantTouren) {
    const userId = tour.user_id
    const fahrerInfo = userIdToFahrerMap.get(userId)

    // Ermittle Anzeige-Namen und normalisierten Namen
    let displayName: string
    let normalizedName: string

    if (fahrerInfo) {
      // Fahrer-Stammdaten vorhanden
      displayName = fahrerInfo.displayName
      normalizedName = fahrerInfo.normalizedName
    } else {
      // Fallback: Name aus Tour-Profil
      const profileName = getProfileName(tour.profiles)
      displayName = profileName || "Unbekannt"
      normalizedName = normalizeDriverName(displayName)
    }

    // Canonical Key = normalisierter Name
    // So werden alle Varianten desselben Namens zusammengeführt
    const canonicalKey = normalizedName

    // Kanonischen Anzeige-Namen verwenden (falls vorhanden)
    const canonicalDisplayName = normalizedNameToCanonical.get(normalizedName) || displayName

    const km = safeNumber(tour.gefahrene_km, 0)
    const wartezeit = tour.wartezeit || undefined

    // Umsatz aus preisMap (bereits aus pricing_tables berechnet)
    const priceResult = preisMap.get(tour.id)
    const tourUmsatz = priceResult?.amount ?? 0

    let tourLohn = 0
    if (tour.driver_amount_final !== null && tour.driver_amount_final !== undefined) {
      tourLohn = safeNumber(tour.driver_amount_final, 0)
    } else {
      tourLohn = calculateTourVerdienst(km, wartezeit, canonicalDisplayName)
    }

    // Vergütungsmodell ermitteln
    const compensationModel: CompensationModelType = fahrerInfo?.compensationModel
      ?? normalizedNameToCompensationModel.get(normalizedName)
      ?? 'tour_based_minijob'

    if (fahrerLeistungMap.has(canonicalKey)) {
      // Existierender Eintrag: Werte summieren
      const existing = fahrerLeistungMap.get(canonicalKey)!
      existing.touren += 1
      existing.umsatz += tourUmsatz
      existing.lohn += tourLohn
      if (tour.datum) existing.tageSet.add(tour.datum)
    } else {
      // Neuer Eintrag
      const tageSet = new Set<string>()
      if (tour.datum) tageSet.add(tour.datum)
      fahrerLeistungMap.set(canonicalKey, {
        canonicalKey,
        fahrerId: fahrerInfo?.fahrerId ?? null,
        name: canonicalDisplayName,
        touren: 1,
        umsatz: tourUmsatz,
        lohn: tourLohn,
        minijobAuslastung: null,
        compensationModel,
        tageSet
      })
    }
  }

  // Plausibilitätsprüfung
  const uniqueFahrerInAnalytics = fahrerLeistungMap.size
  const uniqueNormalizedNames = new Set(
    fahrer.map(f => normalizeDriverName(getFahrerDisplayName(f)))
  ).size
  // Erwartung: Analytics-Fahrer <= eindeutige Namen in Stammdaten + 1 (für "Unbekannt")
  if (uniqueFahrerInAnalytics > uniqueNormalizedNames + 1) {
    console.warn(
      `[Analytics] Plausibilitätswarnung: ${uniqueFahrerInAnalytics} Fahrer in Analytics, ` +
      `aber nur ${uniqueNormalizedNames} eindeutige Namen in Stammdaten. ` +
      `Mögliche Touren ohne Fahrer-Mapping.`
    )
  }

  // Minijob-Auslastung nur für tour_based_minijob berechnen
  for (const [, leistung] of fahrerLeistungMap) {
    if (leistung.compensationModel === 'tour_based_minijob' && minijobLimit > 0) {
      leistung.minijobAuslastung = (leistung.lohn / minijobLimit) * 100
    } else {
      leistung.minijobAuslastung = null
    }
  }

  // Berechne Soll-Arbeitstage (Mo-Fr minus Feiertage) für Vollzeit-Festgehalt
  // Hilfsfunktion: Anzahl Werktage (Mo-Fr) in einem Zeitraum
  function countWorkdays(start: string, end: string): number {
    return countWorkdaysWithHolidays(start, end)
  }

  const sollArbeitstageVollzeit = countWorkdays(dateRange.start, dateRange.end)

  // Für Anteil-Berechnung
  const gesamtUmsatzFahrer = Array.from(fahrerLeistungMap.values()).reduce((sum, f) => sum + f.umsatz, 0)
  // Ertrag nach AG-Kosten pro Fahrer
  const gesamtErtragFahrer = Array.from(fahrerLeistungMap.values()).reduce((sum, f) => sum + (f.umsatz - f.lohn - (f.lohn * employerContributionRate)), 0)

  // Fahrer-KPIs berechnen (nach Vergütungsmodell differenziert)
  const alleFahrer: FahrerLeistungKPI[] = Array.from(fahrerLeistungMap.values()).map(f => {
    const arbeitgeberkosten = f.lohn * employerContributionRate
    const ertrag = f.umsatz - f.lohn - arbeitgeberkosten
    const margenquote = f.umsatz > 0 ? (ertrag / f.umsatz) * 100 : null
    const aktiveFahrtage = f.tageSet.size
    const umsatzProTag = aktiveFahrtage > 0 ? f.umsatz / aktiveFahrtage : null
    const ertragProTag = aktiveFahrtage > 0 ? ertrag / aktiveFahrtage : null
    const kostenquote = f.umsatz > 0 ? ((f.lohn + arbeitgeberkosten) / f.umsatz) * 100 : null
    const anteilUmsatz = gesamtUmsatzFahrer > 0 ? (f.umsatz / gesamtUmsatzFahrer) * 100 : null
    const anteilErtrag = gesamtErtragFahrer > 0 ? (ertrag / gesamtErtragFahrer) * 100 : null

    // ============================================================
    // KPIs nach Vergütungsmodell differenzieren
    // ============================================================

    let zielErreicht: boolean | null = null
    let sollArbeitstage: number | null = null
    let leerlauftage: number | null = null
    let auslastungsquote: number | null = null
    let umsatzProSollArbeitstag: number | null = null
    let planMonatskosten: number | null = null
    let tageszielKostendeckung: number | null = null
    let kostendeckungsStatus: 'ueber_ziel' | 'nahe_ziel' | 'unter_ziel' | 'operativ_pruefen' | null = null
    let monatsArbeitstage: number | null = null
    let umsatzProMonatsArbeitstag: number | null = null
    let differenzZumTagesziel: number | null = null
    let bewertung: FahrerBewertung = "inaktiv"
    // NEU: Saldo-Felder für Festgehalt
    let saldoGegenPlan: number | null = null
    let bisherigArbeitstage: number | null = null
    let anteiligePlanKosten: number | null = null
    let anteiligenSaldo: number | null = null

    if (f.compensationModel === 'tour_based_minijob') {
      // Minijob-Fahrer: 6-Tage-Ziel nur im Monat
      if (dateRange.istMonat) {
        zielErreicht = aktiveFahrtage >= 6
      }

      // Bewertung für Minijob (bisherige Logik)
      if (aktiveFahrtage > 0) {
        if ((margenquote ?? 0) >= 15) {
          bewertung = zielErreicht === false ? "ausbauen" : "stark"
        } else {
          bewertung = zielErreicht === true ? "pruefen" : "inaktiv"
        }
      }

    } else if (f.compensationModel === 'fixed_salary_full_time') {
      // Vollzeit-Festgehalt: Soll-Arbeitstage und Auslastung
      sollArbeitstage = sollArbeitstageVollzeit
      monatsArbeitstage = sollArbeitstageVollzeit // Gleich für Vollzeit
      leerlauftage = Math.max(0, sollArbeitstage - aktiveFahrtage)
      auslastungsquote = sollArbeitstage > 0 ? (aktiveFahrtage / sollArbeitstage) * 100 : null
      umsatzProSollArbeitstag = sollArbeitstage > 0 ? f.umsatz / sollArbeitstage : null
      umsatzProMonatsArbeitstag = monatsArbeitstage > 0 ? f.umsatz / monatsArbeitstage : null

      // Plankosten und Kostendeckung
      planMonatskosten = calculateFixedSalaryMonthlyCost()
      tageszielKostendeckung = calculateDailyBreakEvenRevenue(monatsArbeitstage)

      // NEU: Saldo gegen Plan (Umsatz - Plan-Monatskosten)
      saldoGegenPlan = f.umsatz - planMonatskosten

      // NEU: Bisherige Arbeitstage (für anteilige Berechnung im laufenden Monat)
      const heute = new Date()
      const zeitraumStart = new Date(dateRange.start)
      const zeitraumEnde = new Date(dateRange.end)
      // Wenn aktueller Monat, berechne bisherige Arbeitstage
      if (heute >= zeitraumStart && heute <= zeitraumEnde) {
        const bisHeuteDateStr = heute.toISOString().split('T')[0]
        bisherigArbeitstage = countWorkdays(dateRange.start, bisHeuteDateStr)
        // Anteilige Plankosten = (Plan-Kosten / Monatsarbeitstage) * bisherige Arbeitstage
        if (monatsArbeitstage > 0 && bisherigArbeitstage !== null) {
          anteiligePlanKosten = (planMonatskosten / monatsArbeitstage) * bisherigArbeitstage
          anteiligenSaldo = f.umsatz - anteiligePlanKosten
        }
      } else {
        // Vergangener Zeitraum - volle Monatskosten
        bisherigArbeitstage = monatsArbeitstage
        anteiligePlanKosten = planMonatskosten
        anteiligenSaldo = saldoGegenPlan
      }

      // Differenz zum Tagesziel
      if (umsatzProMonatsArbeitstag !== null && tageszielKostendeckung !== null) {
        differenzZumTagesziel = umsatzProMonatsArbeitstag - tageszielKostendeckung
      }

      // Kostendeckungs-Status ermitteln basierend auf Saldo
      if (saldoGegenPlan >= 0) {
        kostendeckungsStatus = 'ueber_ziel'
      } else if (saldoGegenPlan >= -(planMonatskosten * 0.2)) {
        kostendeckungsStatus = 'nahe_ziel'
      } else {
        kostendeckungsStatus = 'unter_ziel'
      }

      // Bewertung für Festgehalt: IMMER "pruefen" (wird im Controlling bewertet)
      bewertung = "pruefen"

    } else if (f.compensationModel === 'fixed_salary_part_time') {
      // Teilzeit-Festgehalt: Individuelle Solltage, aber Monatsarbeitstage als Orientierung
      sollArbeitstage = null // Individuell - nicht berechenbar
      monatsArbeitstage = sollArbeitstageVollzeit // Als Orientierungswert trotzdem berechnen
      leerlauftage = null
      auslastungsquote = null
      umsatzProSollArbeitstag = null

      // Umsatz pro Monatsarbeitstag als Orientierungswert
      umsatzProMonatsArbeitstag = monatsArbeitstage > 0 ? f.umsatz / monatsArbeitstage : null

      // Plankosten und Tagesziel als Orientierungswert
      planMonatskosten = calculateFixedSalaryMonthlyCost()
      tageszielKostendeckung = calculateDailyBreakEvenRevenue(monatsArbeitstage)

      // NEU: Saldo gegen Plan auch für Teilzeit (Orientierungswert)
      saldoGegenPlan = f.umsatz - planMonatskosten

      // NEU: Bisherige Arbeitstage (für anteilige Berechnung im laufenden Monat)
      const heute = new Date()
      const zeitraumStart = new Date(dateRange.start)
      const zeitraumEnde = new Date(dateRange.end)
      if (heute >= zeitraumStart && heute <= zeitraumEnde) {
        const bisHeuteDateStr = heute.toISOString().split('T')[0]
        bisherigArbeitstage = countWorkdays(dateRange.start, bisHeuteDateStr)
        if (monatsArbeitstage > 0 && bisherigArbeitstage !== null) {
          anteiligePlanKosten = (planMonatskosten / monatsArbeitstage) * bisherigArbeitstage
          anteiligenSaldo = f.umsatz - anteiligePlanKosten
        }
      } else {
        bisherigArbeitstage = monatsArbeitstage
        anteiligePlanKosten = planMonatskosten
        anteiligenSaldo = saldoGegenPlan
      }

      // Differenz zum Tagesziel (als Orientierung)
      if (umsatzProMonatsArbeitstag !== null && tageszielKostendeckung !== null) {
        differenzZumTagesziel = umsatzProMonatsArbeitstag - tageszielKostendeckung
      }

      // Status: immer individuell prüfen für Teilzeit
      kostendeckungsStatus = 'operativ_pruefen'

      // Bewertung für Festgehalt: IMMER "pruefen" (wird im Controlling bewertet)
      bewertung = "pruefen"
    }

    return {
      canonicalKey: f.canonicalKey,
      fahrerId: f.fahrerId,
      name: f.name,
      touren: f.touren,
      aktiveFahrtage,
      zielErreicht,
      umsatz: f.umsatz,
      lohn: f.lohn,
      arbeitgeberkosten,
      ertrag,
      margenquote,
      umsatzProTag,
      ertragProTag,
      kostenquote,
      anteilUmsatz,
      anteilErtrag,
      bewertung,
      minijobAuslastung: f.minijobAuslastung,
      compensationModel: f.compensationModel,
      sollArbeitstage,
      leerlauftage,
      auslastungsquote,
      umsatzProSollArbeitstag,
      planMonatskosten,
      tageszielKostendeckung,
      kostendeckungsStatus,
      monatsArbeitstage,
      umsatzProMonatsArbeitstag,
      differenzZumTagesziel,
      saldoGegenPlan,
      bisherigArbeitstage,
      anteiligePlanKosten,
      anteiligenSaldo
    }
  })

  // Fahrer mit Touren
  const fahrerMitTouren = alleFahrer.length

  // Aktive Fahrtage gesamt (distinct Tage aller Fahrer)
  const alleAktivenTage = new Set<string>()
  for (const f of fahrerLeistungMap.values()) {
    for (const tag of f.tageSet) {
      alleAktivenTage.add(tag)
    }
  }
  const aktiveFahrtageGesamt = alleAktivenTage.size

  // Durchschnitte berechnen
  const tourenProFahrer = fahrerMitTouren > 0
    ? alleFahrer.reduce((sum, f) => sum + f.touren, 0) / fahrerMitTouren
    : null
  const umsatzProFahrer = fahrerMitTouren > 0
    ? alleFahrer.reduce((sum, f) => sum + f.umsatz, 0) / fahrerMitTouren
    : null
  const ertragProFahrer = fahrerMitTouren > 0
    ? alleFahrer.reduce((sum, f) => sum + (f.ertrag ?? 0), 0) / fahrerMitTouren
    : null
  const aktiveTageProFahrer = fahrerMitTouren > 0
    ? alleFahrer.reduce((sum, f) => sum + f.aktiveFahrtage, 0) / fahrerMitTouren
    : null

  // Nur Minijob-Fahrer für separate Rankings
  const minijobFahrer = alleFahrer.filter(f => f.compensationModel === 'tour_based_minijob')

  // Top MINIJOB-Fahrer nach Ertrag (NUR tour_based_minijob!)
  // Festgehaltfahrer dürfen NICHT in tourbasierter Ertragsrangliste erscheinen
  const topMinijobFahrerErtrag = [...minijobFahrer]
    .sort((a, b) => (b.ertrag ?? 0) - (a.ertrag ?? 0))
    .slice(0, 5)

  // Top Fahrer nach Umsatz (ALLE Fahrer - Umsatz ist vergütungsmodell-unabhängig)
  const topFahrerUmsatz = [...alleFahrer]
    .sort((a, b) => b.umsatz - a.umsatz)
    .slice(0, 5)

  const topFahrerTouren = [...alleFahrer]
    .sort((a, b) => b.touren - a.touren)
    .slice(0, 5)

  // Fahrer mit guter Marge aber wenig Tagen (ausbauen) - NUR MINIJOB
  // Festgehaltfahrer werden im Controlling bewertet, nicht hier
  const fahrerAusbauen = minijobFahrer.filter(f =>
    f.bewertung === "ausbauen"
  )

  // Fahrer mit vielen Tagen aber schwacher Marge (pruefen) - NUR MINIJOB
  const fahrerPruefen = minijobFahrer.filter(f =>
    f.bewertung === "pruefen"
  )

  // Fahrer unter Ziel (< 6 aktive Tage, nur für Minijob bei Monatszeitraum)
  const fahrerUnterZiel = dateRange.istMonat
    ? minijobFahrer.filter(f => f.aktiveFahrtage < 6).length
    : 0

  // Anzahl Fahrer nach Vergütungsmodell
  const minijobFahrerMitTouren = minijobFahrer.length
  const festgehaltFahrer = alleFahrer.filter(f =>
    f.compensationModel === 'fixed_salary_part_time' || f.compensationModel === 'fixed_salary_full_time'
  )
  const festgehaltFahrerMitTouren = festgehaltFahrer.length

  const fahrerKPIs: FahrerKPIs = {
    aktiveFahrer,
    fahrerMitTouren,
    aktiveFahrtageGesamt,
    tourenProFahrer,
    umsatzProFahrer,
    ertragProFahrer,
    aktiveTageProFahrer,
    alleFahrer,
    topMinijobFahrerErtrag,
    topFahrerUmsatz,
    topFahrerTouren,
    fahrerAusbauen,
    fahrerPruefen,
    fahrerUnterZiel,
    minijobFahrerMitTouren,
    festgehaltFahrerMitTouren,
    minijobFahrer,
    festgehaltFahrer,
    monatsArbeitstage: sollArbeitstageVollzeit
  }

  // ============================================================
  // 6. COMPLIANCE-KPIs BERECHNEN
  // ============================================================

  let compliance: ComplianceKPIs = {
    uploadCompliance: [],
    uploadComplianceDetail: [],
    verfuegbarkeitsAuslastung: [],
    verfuegbarkeitsDetail: [],
    summary: {
      avgPuenktlichkeitsQuote: null,
      avgEinsatzQuote: null,
      fahrerMitVerspaetungen: 0,
      fahrerMitUngenutzterVerfuegbarkeit: 0,
      gesamtVerfuegbareTage: 0,
      gesamtTageOhneTour: 0,
      gesamtNichtGemeldeteTage: 0,
      gesamtEingesetzteTage: 0,
      gesamtNichtVerfuegbareTage: 0
    },
    alleVerspaetetenTouren: [],
    datenStatus: {
      verfuegbarkeitGeladen: false,
      verfuegbarkeitAnzahl: 0
    }
  }

  try {
    // Transformiere Arbeitsnachweise für Compliance-Funktionen
    const arbeitsnachweiseFuerCompliance = arbeitsnachweise.map(a => ({
      id: a.id,
      tour_nr: a.tour_nr || undefined,
      datum: a.datum,
      status: a.status,
      created_at: a.created_at,
      user_id: a.user_id
    }))

    // Transformiere Fahrer für Compliance-Funktionen
    const fahrerFuerCompliance = fahrer.map(f => ({
      id: f.id,
      vorname: f.vorname,
      nachname: f.nachname,
      status: f.status as 'aktiv' | 'inaktiv',
      user_id: f.user_id
    }))

    // Map: user_id -> Fahrer-Info
    const userIdToFahrerInfoMap = new Map<string, { id: number; name: string }>()
    for (const f of fahrer) {
      if (f.user_id) {
        const name = getFahrerDisplayName(f)
        userIdToFahrerInfoMap.set(f.user_id, { id: f.id, name })
      }
    }

    // Upload-Compliance (synchron, direkte Arrays)
    const uploadCompliance = calculateFahrerUploadCompliance(
      arbeitsnachweiseFuerCompliance,
      fahrerFuerCompliance
    )

    // ============================================================
    // 6.1 DETAILLIERTE UPLOAD-COMPLIANCE BERECHNEN
    // ============================================================

    /**
     * Berechnet Verspätung eines Uploads
     */
    function calculateUploadDelay(createdAt: string | undefined, tourDatum: string): { minuten: number; formatiert: string } {
      if (!createdAt) return { minuten: 0, formatiert: "Pünktlich" }

      const upload = new Date(createdAt)
      // Soll-Frist: Ende des Tour-Datums (23:59:59)
      const deadline = new Date(tourDatum)
      deadline.setHours(23, 59, 59, 999)

      if (upload <= deadline) return { minuten: 0, formatiert: "Pünktlich" }

      const diffMs = upload.getTime() - deadline.getTime()
      const minuten = Math.ceil(diffMs / (1000 * 60))

      // Formatierung
      let formatiert = ""
      if (minuten < 60) {
        formatiert = `${minuten} Min`
      } else if (minuten < 1440) { // < 24 Stunden
        const stunden = Math.floor(minuten / 60)
        const restMin = minuten % 60
        formatiert = restMin > 0 ? `${stunden} Std ${restMin} Min` : `${stunden} Std`
      } else {
        const tage = Math.floor(minuten / 1440)
        const restStunden = Math.floor((minuten % 1440) / 60)
        formatiert = restStunden > 0 ? `${tage} Tag${tage > 1 ? 'e' : ''} ${restStunden} Std` : `${tage} Tag${tage > 1 ? 'e' : ''}`
      }

      return { minuten, formatiert }
    }

    // Formatiere Minuten als lesbare Dauer
    function formatMinutesAsDuration(totalMinuten: number): string {
      if (totalMinuten <= 0) return "Keine"
      if (totalMinuten < 60) {
        return `${totalMinuten} Min`
      } else if (totalMinuten < 1440) {
        const stunden = Math.floor(totalMinuten / 60)
        const restMin = totalMinuten % 60
        return restMin > 0 ? `${stunden} Std ${restMin} Min` : `${stunden} Std`
      } else {
        const tage = Math.floor(totalMinuten / 1440)
        const restStunden = Math.floor((totalMinuten % 1440) / 60)
        return restStunden > 0 ? `${tage} Tag${tage > 1 ? 'e' : ''} ${restStunden} Std` : `${tage} Tag${tage > 1 ? 'e' : ''}`
      }
    }

    // Gruppiere Arbeitsnachweise nach user_id
    const tourenProFahrerMap = new Map<string, typeof arbeitsnachweise>()
    for (const tour of arbeitsnachweise) {
      if (!tour.user_id) continue
      if (!tourenProFahrerMap.has(tour.user_id)) {
        tourenProFahrerMap.set(tour.user_id, [])
      }
      tourenProFahrerMap.get(tour.user_id)!.push(tour)
    }

    // Berechne detaillierte Upload-Compliance pro Fahrer
    const uploadComplianceDetail: FahrerUploadComplianceDetail[] = []
    const alleVerspaetetenTouren: VerspaeteteTourDetail[] = []

    for (const uc of uploadCompliance) {
      const touren = tourenProFahrerMap.get(uc.user_id) || []
      const verspaeteteTouren: VerspaeteteTourDetail[] = []
      let maxVerspaetungMinuten = 0

      for (const tour of touren) {
        const delay = calculateUploadDelay(tour.created_at, tour.datum)
        if (delay.minuten > 0) {
          const fahrerInfo = userIdToFahrerInfoMap.get(tour.user_id)
          const deadline = new Date(tour.datum)
          deadline.setHours(23, 59, 59, 999)

          const detail: VerspaeteteTourDetail = {
            tourId: tour.id,
            tourNr: tour.tour_nr || `#${tour.id}`,
            datum: tour.datum,
            uploadZeitpunkt: tour.created_at || "",
            sollFrist: deadline.toISOString(),
            verspaetungMinuten: delay.minuten,
            verspaetungFormatiert: delay.formatiert,
            status: tour.status,
            fahrerId: fahrerInfo?.id,
            fahrerName: fahrerInfo?.name || uc.fahrer_name
          }

          verspaeteteTouren.push(detail)
          alleVerspaetetenTouren.push(detail)

          if (delay.minuten > maxVerspaetungMinuten) {
            maxVerspaetungMinuten = delay.minuten
          }
        }
      }

      // Sortiere verspätete Touren nach Verspätung (absteigend)
      verspaeteteTouren.sort((a, b) => b.verspaetungMinuten - a.verspaetungMinuten)

      uploadComplianceDetail.push({
        ...uc,
        maxVerspaetungMinuten,
        maxVerspaetungFormatiert: formatMinutesAsDuration(maxVerspaetungMinuten),
        verspaeteteTouren
      })
    }

    // Sortiere alle verspäteten Touren nach Verspätung (absteigend)
    alleVerspaetetenTouren.sort((a, b) => b.verspaetungMinuten - a.verspaetungMinuten)

    // ============================================================
    // 6.2 VERFÜGBARKEITSDATEN LADEN
    // ============================================================

    let driverAvailabilityData: DriverAvailability[] = []
    let verfuegbarkeitGeladen = false
    let verfuegbarkeitFehler: string | undefined

    try {
      driverAvailabilityData = await getAvailabilityForDateRange(dateRange.start, dateRange.end)
      verfuegbarkeitGeladen = true
    } catch (err) {
      console.warn("Verfügbarkeitsdaten konnten nicht geladen werden:", err)
      verfuegbarkeitFehler = err instanceof Error ? err.message : "Unbekannter Fehler"
    }

    // Transformiere für alerts-calculator
    const driverAvailabilityForCalc = driverAvailabilityData.map(a => ({
      id: a.id,
      fahrer_id: a.fahrer_id,
      user_id: a.user_id,
      week_start_date: a.week_start_date,
      date: a.date,
      is_available: a.is_available,
      availability_status: a.availability_status
    }))

    // Verfügbarkeits-Auslastung berechnen
    const verfuegbarkeitsAuslastung = calculateFahrerVerfuegbarkeitsAuslastung(
      fahrerFuerCompliance,
      driverAvailabilityForCalc,
      arbeitsnachweiseFuerCompliance
    )

    // ============================================================
    // 6.3 DETAILLIERTE VERFÜGBARKEIT PRO FAHRER BERECHNEN
    // ============================================================

    const wochentage = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']

    // Map: user_id + datum -> Tour-Anzahl
    const tourenProTag = new Map<string, number>()
    for (const tour of arbeitsnachweise) {
      if (!tour.user_id) continue
      const key = `${tour.user_id}_${tour.datum}`
      tourenProTag.set(key, (tourenProTag.get(key) || 0) + 1)
    }

    // Map: fahrer_id -> user_id (für Matching)
    const fahrerIdToUserIdMap = new Map<string, string>()
    for (const f of fahrer) {
      if (f.user_id) {
        fahrerIdToUserIdMap.set(String(f.id), f.user_id)
      }
    }

    // Generiere alle Werktage im Zeitraum (Mo-Fr)
    function generateWorkdaysInRange(start: string, end: string): string[] {
      const days: string[] = []
      const current = new Date(start)
      const endDate = new Date(end)

      while (current <= endDate) {
        const dayOfWeek = current.getDay()
        // Nur Montag (1) bis Freitag (5)
        if (dayOfWeek >= 1 && dayOfWeek <= 5) {
          days.push(current.toISOString().split('T')[0])
        }
        current.setDate(current.getDate() + 1)
      }

      return days
    }

    const werktagsImZeitraum = generateWorkdaysInRange(dateRange.start, dateRange.end)

    // Verarbeite Verfügbarkeitsdaten
    const verfuegbarkeitProFahrerTag = new Map<string, DriverAvailability>()
    for (const v of driverAvailabilityData) {
      const key = `${v.fahrer_id}_${v.date}`
      verfuegbarkeitProFahrerTag.set(key, v)
    }

    // Berechne detaillierte Verfügbarkeit pro Fahrer
    const verfuegbarkeitsDetail: FahrerVerfuegbarkeitsDetail[] = []
    let gesamtNichtGemeldeteTage = 0
    let gesamtEingesetzteTage = 0
    let gesamtNichtVerfuegbareTage = 0

    for (const va of verfuegbarkeitsAuslastung) {
      const tageDetails: VerfuegbarkeitTagDetail[] = []
      const userId = va.user_id || fahrerIdToUserIdMap.get(va.fahrer_id)
      let nichtGemeldeteTage = 0

      for (const datum of werktagsImZeitraum) {
        const date = new Date(datum)
        const wochentag = wochentage[date.getDay()]

        const verfKey = `${va.fahrer_id}_${datum}`
        const verf = verfuegbarkeitProFahrerTag.get(verfKey)

        const tourKey = userId ? `${userId}_${datum}` : null
        const anzahlTouren = tourKey ? (tourenProTag.get(tourKey) || 0) : 0
        const hatTour = anzahlTouren > 0

        let status: VerfuegbarkeitTagDetail['status'] = 'nicht_gemeldet'

        if (verf) {
          if (verf.is_available) {
            if (hatTour) {
              status = 'eingesetzt'
              gesamtEingesetzteTage++
            } else {
              status = 'verfuegbar_ohne_tour'
            }
          } else {
            status = 'nicht_verfuegbar'
            gesamtNichtVerfuegbareTage++
          }
        } else {
          // Keine Verfügbarkeitsmeldung
          nichtGemeldeteTage++
          gesamtNichtGemeldeteTage++

          // Prüfe ob trotzdem eine Tour existiert
          if (hatTour) {
            status = 'eingesetzt'
            gesamtEingesetzteTage++
          }
        }

        tageDetails.push({
          datum,
          wochentag,
          istVerfuegbar: verf?.is_available ?? false,
          hatTour,
          anzahlTouren,
          status,
          verfuegbarkeitStatus: verf?.availability_status,
          preferredTourType: verf?.preferred_tour_type,
          note: verf?.note
        })
      }

      verfuegbarkeitsDetail.push({
        ...va,
        tageDetails,
        nichtGemeldeteTage
      })
    }

    // Summary berechnen
    let avgPuenktlichkeitsQuote: number | null = null
    let avgEinsatzQuote: number | null = null
    let fahrerMitVerspaetungen = 0
    let fahrerMitUngenutzterVerfuegbarkeit = 0
    let gesamtVerfuegbareTage = 0
    let gesamtTageOhneTour = 0

    if (uploadCompliance.length > 0) {
      avgPuenktlichkeitsQuote =
        uploadCompliance.reduce((sum, u) => sum + (u.puenktlichkeits_quote ?? 0), 0) /
        uploadCompliance.length
      fahrerMitVerspaetungen = uploadCompliance.filter(u => (u.verspaetete_uploads ?? 0) > 0).length
    }

    if (verfuegbarkeitsAuslastung.length > 0) {
      avgEinsatzQuote =
        verfuegbarkeitsAuslastung.reduce((sum, v) => sum + (v.einsatzquote ?? 0), 0) /
        verfuegbarkeitsAuslastung.length
      fahrerMitUngenutzterVerfuegbarkeit = verfuegbarkeitsAuslastung.filter(
        v => (v.tage_ohne_tour ?? 0) > 0
      ).length
      gesamtVerfuegbareTage = verfuegbarkeitsAuslastung.reduce((sum, v) => sum + (v.verfuegbare_tage ?? 0), 0)
      gesamtTageOhneTour = verfuegbarkeitsAuslastung.reduce((sum, v) => sum + (v.tage_ohne_tour ?? 0), 0)
    }

    compliance = {
      uploadCompliance,
      uploadComplianceDetail,
      verfuegbarkeitsAuslastung,
      verfuegbarkeitsDetail,
      summary: {
        avgPuenktlichkeitsQuote,
        avgEinsatzQuote,
        fahrerMitVerspaetungen,
        fahrerMitUngenutzterVerfuegbarkeit,
        gesamtVerfuegbareTage,
        gesamtTageOhneTour,
        gesamtNichtGemeldeteTage,
        gesamtEingesetzteTage,
        gesamtNichtVerfuegbareTage
      },
      alleVerspaetetenTouren,
      datenStatus: {
        verfuegbarkeitGeladen,
        verfuegbarkeitAnzahl: driverAvailabilityData.length,
        fehler: verfuegbarkeitFehler
      }
    }
  } catch (err) {
    console.error("Compliance-KPIs Fehler:", err)
    fehler.push("Compliance-KPIs konnten nicht berechnet werden")
  }

  // ============================================================
  // 7. MONATSTREND-DATEN BERECHNEN
  // ============================================================

  let trend: TrendData | null = null
  let trendSixMonths: TrendData | null = null

  try {
    // Monatstrend-Berechnung (aggregiert für alle Fahrer)
    // Gruppiere Touren nach Monat - jetzt mit Fahrerlohn und AG-Kosten
    const tourenProMonat = new Map<string, {
      umsatz: number
      touren: number
      einsatztagsSet: Set<string>
      fahrerlohn: number
      arbeitgeberkosten: number
    }>()

    for (const tour of relevantTouren) {
      if (!tour.datum) continue
      const monat = tour.datum.substring(0, 7) // YYYY-MM

      if (!tourenProMonat.has(monat)) {
        tourenProMonat.set(monat, {
          umsatz: 0,
          touren: 0,
          einsatztagsSet: new Set(),
          fahrerlohn: 0,
          arbeitgeberkosten: 0
        })
      }

      const priceResult = preisMap.get(tour.id)
      const tourUmsatz = priceResult?.amount ?? 0

      // Fahrerlohn für diesen Tour
      let tourFahrerlohn = 0
      if (tour.driver_amount_final !== null && tour.driver_amount_final !== undefined) {
        tourFahrerlohn = safeNumber(tour.driver_amount_final, 0)
      } else {
        const km = safeNumber(tour.gefahrene_km, 0)
        const wartezeit = tour.wartezeit || undefined
        const fahrerName = getProfileName(tour.profiles)
        tourFahrerlohn = calculateTourVerdienst(km, wartezeit, fahrerName)
      }

      // AG-Kosten für diesen Tour
      let tourArbeitgeberkosten = 0
      if (tour.estimated_employer_costs !== null && tour.estimated_employer_costs !== undefined) {
        tourArbeitgeberkosten = safeNumber(tour.estimated_employer_costs, 0)
      } else {
        tourArbeitgeberkosten = tourFahrerlohn * employerContributionRate
      }

      const entry = tourenProMonat.get(monat)!
      entry.umsatz += tourUmsatz
      entry.touren += 1
      entry.einsatztagsSet.add(tour.datum)
      entry.fahrerlohn += tourFahrerlohn
      entry.arbeitgeberkosten += tourArbeitgeberkosten
    }

    // Konvertiere zu MonthlyTrendDataPoint-Array
    const monatsDaten: MonthlyTrendDataPoint[] = []

    // Sortiere Monate chronologisch
    const sortedMonths = Array.from(tourenProMonat.keys()).sort()

    for (const monat of sortedMonths) {
      const data = tourenProMonat.get(monat)!
      const einsatztage = data.einsatztagsSet.size

      // Berechne Soll-Arbeitstage für diesen Monat (für Vollzeit-Referenz)
      const [jahr, mon] = monat.split('-').map(Number)
      const monatsStart = `${jahr}-${String(mon).padStart(2, '0')}-01`
      const letzterTag = new Date(jahr, mon, 0).getDate()
      const monatsEnde = `${jahr}-${String(mon).padStart(2, '0')}-${String(letzterTag).padStart(2, '0')}`
      const sollArbeitstageDieserMonat = countWorkdays(monatsStart, monatsEnde)

      // Monats-Label (z.B. "Jan 26")
      const monatLabel = new Date(jahr, mon - 1, 1).toLocaleDateString('de-DE', {
        month: 'short',
        year: '2-digit'
      })

      // Marge = Umsatz - Fahrerlohn - AG-Kosten
      const marge = data.umsatz - data.fahrerlohn - data.arbeitgeberkosten
      const margenquote = data.umsatz > 0 ? (marge / data.umsatz) * 100 : null

      monatsDaten.push({
        monat,
        monatLabel,
        umsatz: data.umsatz,
        touren: data.touren,
        einsatztage,
        umsatzProEinsatztag: einsatztage > 0 ? data.umsatz / einsatztage : null,
        sollArbeitstage: sollArbeitstageDieserMonat,
        auslastungsquote: sollArbeitstageDieserMonat > 0
          ? (einsatztage / sollArbeitstageDieserMonat) * 100
          : null,
        tageszielKostendeckung: calculateDailyBreakEvenRevenue(sollArbeitstageDieserMonat),
        umsatzProSollArbeitstag: sollArbeitstageDieserMonat > 0
          ? data.umsatz / sollArbeitstageDieserMonat
          : null,
        fahrerlohn: data.fahrerlohn,
        arbeitgeberkosten: data.arbeitgeberkosten,
        marge,
        margenquote
      })
    }

    // Trend-Richtung ermitteln (basierend auf letzten 2 Monaten Umsatz)
    let trendDirection: MonthlyTrendType = 'n/a'
    if (monatsDaten.length >= 2) {
      const letztesMonat = monatsDaten[monatsDaten.length - 1]
      const vorletzterMonat = monatsDaten[monatsDaten.length - 2]
      const diff = letztesMonat.umsatz - vorletzterMonat.umsatz
      const threshold = vorletzterMonat.umsatz * 0.05 // 5% Schwelle

      if (diff > threshold) {
        trendDirection = 'up'
      } else if (diff < -threshold) {
        trendDirection = 'down'
      } else {
        trendDirection = 'flat'
      }
    }

    trend = {
      fahrerName: 'Alle Fahrer',
      fahrerId: null,
      compensationModel: null,
      monatsDaten,
      trend: trendDirection
    }

    // 6-Monats-Trend (immer die letzten 6 Monate, unabhängig vom Filter)
    // Falls weniger Daten vorhanden, nutzen wir was da ist
    if (monatsDaten.length > 0) {
      const lastSix = monatsDaten.slice(-6)
      let trendSixDirection: MonthlyTrendType = 'n/a'
      if (lastSix.length >= 2) {
        const letztesMonat = lastSix[lastSix.length - 1]
        const vorletzterMonat = lastSix[lastSix.length - 2]
        const diff = letztesMonat.umsatz - vorletzterMonat.umsatz
        const threshold = vorletzterMonat.umsatz * 0.05

        if (diff > threshold) {
          trendSixDirection = 'up'
        } else if (diff < -threshold) {
          trendSixDirection = 'down'
        } else {
          trendSixDirection = 'flat'
        }
      }

      trendSixMonths = {
        fahrerName: 'Alle Fahrer',
        fahrerId: null,
        compensationModel: null,
        monatsDaten: lastSix,
        trend: trendSixDirection
      }
    }
  } catch (err) {
    console.error("Trend-Berechnung Fehler:", err)
    // trend bleibt null
  }

  // ============================================================
  // 8. ERGEBNIS ZUSAMMENSTELLEN
  // ============================================================

  return {
    zeitraum: dateRange,
    finanzen,
    qualitaet,
    auslagen: auslagenKPIs,
    fahrer: fahrerKPIs,
    compliance,
    trend,
    trendSixMonths,
    berechnetAm: new Date().toISOString()
  }
}
