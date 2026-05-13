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
import {
  calculateFahrerUploadCompliance,
  calculateFahrerVerfuegbarkeitsAuslastung,
  type FahrerUploadCompliance,
  type FahrerVerfuegbarkeitsAuslastung
} from "./alerts-calculator"

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
  /** Ziel mindestens 6 aktive Tage erreicht (für Monatszeitraum) */
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
  /** Monatlicher Lohn relativ zum Minijob-Limit (in %) - nur Info, kein Risiko */
  minijobAuslastung: number | null
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
  /** Top Fahrer nach Ertrag */
  topFahrerErtrag: FahrerLeistungKPI[]
  /** Top Fahrer nach Umsatz */
  topFahrerUmsatz: FahrerLeistungKPI[]
  /** Top Fahrer nach Touren */
  topFahrerTouren: FahrerLeistungKPI[]
  /** Fahrer mit guter Marge aber wenig Tagen (Ausbauen) */
  fahrerAusbauen: FahrerLeistungKPI[]
  /** Fahrer mit vielen Tagen aber schwacher Marge (Prüfen) */
  fahrerPruefen: FahrerLeistungKPI[]
  /** Anzahl Fahrer unter Ziel (< 6 aktive Tage, nur bei Monatszeitraum) */
  fahrerUnterZiel: number
}

// NEU: Compliance KPIs
export interface ComplianceKPIs {
  /** Upload-Pünktlichkeit pro Fahrer */
  uploadCompliance: FahrerUploadCompliance[]
  /** Verfügbarkeit vs. Einsatz pro Fahrer */
  verfuegbarkeitsAuslastung: FahrerVerfuegbarkeitsAuslastung[]
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

  // 1d. Fahrer laden
  interface FahrerRow {
    id: number
    user_id: string
    status: string
    vorname: string
    nachname: string
    profiles?: {
      full_name: string
      zeitmodell: string | null
    } | { full_name: string; zeitmodell: string | null }[] | null
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
          zeitmodell
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

  // Mapping: user_id -> { fahrerId, displayName, normalizedName }
  interface FahrerInfo {
    fahrerId: number
    displayName: string
    normalizedName: string
  }
  const userIdToFahrerMap = new Map<string, FahrerInfo>()

  // Mapping: normalizedName -> kanonischer displayName (erster gefundener)
  // Fallback für migrierte Alt-Daten; langfristig Stammdaten bereinigen.
  const normalizedNameToCanonical = new Map<string, string>()

  for (const f of fahrer) {
    const displayName = getFahrerDisplayName(f)
    const normalizedName = normalizeDriverName(displayName)

    // Kanonischen Namen merken (erster Treffer gewinnt)
    if (!normalizedNameToCanonical.has(normalizedName)) {
      normalizedNameToCanonical.set(normalizedName, displayName)
    }

    if (f.user_id) {
      userIdToFahrerMap.set(f.user_id, {
        fahrerId: f.id,
        displayName,
        normalizedName
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
  > & {
    tageSet: Set<string>
    umsatz: number
    lohn: number
    touren: number
    minijobAuslastung: number | null
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

  // Minijob-Auslastung berechnen
  for (const [, leistung] of fahrerLeistungMap) {
    if (minijobLimit > 0) {
      leistung.minijobAuslastung = (leistung.lohn / minijobLimit) * 100
    }
  }

  // Für Anteil-Berechnung
  const gesamtUmsatzFahrer = Array.from(fahrerLeistungMap.values()).reduce((sum, f) => sum + f.umsatz, 0)
  // Ertrag nach AG-Kosten pro Fahrer
  const gesamtErtragFahrer = Array.from(fahrerLeistungMap.values()).reduce((sum, f) => sum + (f.umsatz - f.lohn - (f.lohn * employerContributionRate)), 0)

  // Fahrer-KPIs berechnen
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

    // Ziel: mind. 6 aktive Tage im Monat (nur wenn Zeitraum ein Monat)
    let zielErreicht: boolean | null = null
    if (dateRange.istMonat) {
      zielErreicht = aktiveFahrtage >= 6
    }

    // Bewertung (Phase-1: Ziel-Margenquote 15%):
    // - "stark": Marge >= 15% UND Ziel erreicht (oder kein Monatszeitraum)
    // - "ausbauen": Marge >= 15% UND Ziel NICHT erreicht
    // - "pruefen": Marge < 15% UND aktiv
    // - "inaktiv": keine Touren oder keine aktiven Tage
    let bewertung: FahrerBewertung = "inaktiv"
    if (aktiveFahrtage > 0) {
      if ((margenquote ?? 0) >= 15) {
        bewertung = zielErreicht === false ? "ausbauen" : "stark"
      } else {
        bewertung = zielErreicht === true ? "pruefen" : "inaktiv"
      }
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
      minijobAuslastung: f.minijobAuslastung
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

  // Top Fahrer (max 5)
  const topFahrerErtrag = [...alleFahrer]
    .sort((a, b) => (b.ertrag ?? 0) - (a.ertrag ?? 0))
    .slice(0, 5)

  const topFahrerUmsatz = [...alleFahrer]
    .sort((a, b) => b.umsatz - a.umsatz)
    .slice(0, 5)

  const topFahrerTouren = [...alleFahrer]
    .sort((a, b) => b.touren - a.touren)
    .slice(0, 5)

  // Fahrer mit guter Marge aber wenig Tagen (ausbauen)
  const fahrerAusbauen = alleFahrer.filter(f =>
    f.bewertung === "ausbauen"
  )

  // Fahrer mit vielen Tagen aber schwacher Marge (pruefen)
  const fahrerPruefen = alleFahrer.filter(f =>
    f.bewertung === "pruefen"
  )

  // Fahrer unter Ziel (< 6 aktive Tage, nur bei Monatszeitraum)
  const fahrerUnterZiel = dateRange.istMonat
    ? alleFahrer.filter(f => f.aktiveFahrtage < 6).length
    : 0

  const fahrerKPIs: FahrerKPIs = {
    aktiveFahrer,
    fahrerMitTouren,
    aktiveFahrtageGesamt,
    tourenProFahrer,
    umsatzProFahrer,
    ertragProFahrer,
    aktiveTageProFahrer,
    alleFahrer,
    topFahrerErtrag,
    topFahrerUmsatz,
    topFahrerTouren,
    fahrerAusbauen,
    fahrerPruefen,
    fahrerUnterZiel
  }

  // ============================================================
  // 6. COMPLIANCE-KPIs BERECHNEN
  // ============================================================

  let compliance: ComplianceKPIs = {
    uploadCompliance: [],
    verfuegbarkeitsAuslastung: [],
    summary: {
      avgPuenktlichkeitsQuote: null,
      avgEinsatzQuote: null,
      fahrerMitVerspaetungen: 0,
      fahrerMitUngenutzterVerfuegbarkeit: 0,
      gesamtVerfuegbareTage: 0,
      gesamtTageOhneTour: 0
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

    // Upload-Compliance (synchron, direkte Arrays)
    const uploadCompliance = calculateFahrerUploadCompliance(
      arbeitsnachweiseFuerCompliance,
      fahrerFuerCompliance
    )

    // Verfügbarkeits-Auslastung - benötigt DriverAvailability aus driver_availability Tabelle
    // Da wir keine DriverAvailability-Daten haben, verwenden wir leeres Array
    const verfuegbarkeitsAuslastung = calculateFahrerVerfuegbarkeitsAuslastung(
      fahrerFuerCompliance,
      [], // driverAvailability - Daten werden in separater Tabelle gespeichert
      arbeitsnachweiseFuerCompliance
    )

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
      verfuegbarkeitsAuslastung,
      summary: {
        avgPuenktlichkeitsQuote,
        avgEinsatzQuote,
        fahrerMitVerspaetungen,
        fahrerMitUngenutzterVerfuegbarkeit,
        gesamtVerfuegbareTage,
        gesamtTageOhneTour
      }
    }
  } catch (err) {
    console.error("Compliance-KPIs Fehler:", err)
    fehler.push("Compliance-KPIs konnten nicht berechnet werden")
  }

  // ============================================================
  // 7. ERGEBNIS ZUSAMMENSTELLEN
  // ============================================================

  return {
    zeitraum: dateRange,
    finanzen,
    qualitaet,
    auslagen: auslagenKPIs,
    fahrer: fahrerKPIs,
    compliance,
    berechnetAm: new Date().toISOString()
  }
}
