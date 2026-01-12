/**
 * Kunden-Preisberechnung
 * Smart and Care: Standard-Tabelle
 * Onlogist: Eigene Tabelle mit anderen Preisen
 */

export interface CustomerKmRange {
  maxKm: number
  kundenpreis: number
}

// Auftraggeber-Typen
export type Auftraggeber = 'onlogist' | 'smartandcare'

// Smart and Care - Standard KM-Tabelle (bisherige Tabelle)
export const SMARTANDCARE_KM_RANGES: CustomerKmRange[] = [
  { maxKm: 10, kundenpreis: 19 },
  { maxKm: 20, kundenpreis: 23 },
  { maxKm: 30, kundenpreis: 39 },
  { maxKm: 50, kundenpreis: 50 },
  { maxKm: 100, kundenpreis: 66 },
  { maxKm: 150, kundenpreis: 75 },
  { maxKm: 200, kundenpreis: 101 },
  { maxKm: 250, kundenpreis: 109 },
  { maxKm: 350, kundenpreis: 121 },
  { maxKm: 450, kundenpreis: 143 },
  { maxKm: 550, kundenpreis: 176 },
  { maxKm: 650, kundenpreis: 209 },
  { maxKm: 750, kundenpreis: 220 },
  { maxKm: 800, kundenpreis: 253 },
  { maxKm: 900, kundenpreis: 286 },
  { maxKm: 1000, kundenpreis: 319 },
]

// Onlogist - Eigene KM-Tabelle
export const ONLOGIST_KM_RANGES: CustomerKmRange[] = [
  { maxKm: 10, kundenpreis: 19.57 },
  { maxKm: 20, kundenpreis: 23.01 },
  { maxKm: 30, kundenpreis: 35.65 },
  { maxKm: 50, kundenpreis: 48.67 },
  { maxKm: 100, kundenpreis: 62.80 },
  { maxKm: 150, kundenpreis: 73.87 },
  { maxKm: 200, kundenpreis: 97.20 },
  { maxKm: 250, kundenpreis: 106.73 },
  { maxKm: 300, kundenpreis: 119.33 },
  { maxKm: 350, kundenpreis: 121.20 },
  { maxKm: 400, kundenpreis: 143.00 },
  { maxKm: 450, kundenpreis: 144.87 },
  { maxKm: 500, kundenpreis: 175.87 },
  { maxKm: 550, kundenpreis: 177.73 },
  { maxKm: 600, kundenpreis: 207.20 },
  { maxKm: 650, kundenpreis: 209.07 },
  { maxKm: 700, kundenpreis: 221.67 },
  { maxKm: 750, kundenpreis: 222.33 },
  { maxKm: 800, kundenpreis: 251.47 },
  { maxKm: 850, kundenpreis: 251.47 },
  { maxKm: 900, kundenpreis: 280.60 },
  { maxKm: 950, kundenpreis: 280.60 },
  { maxKm: 1000, kundenpreis: 308.20 },
]

// Alias für Rückwärtskompatibilität
export const CUSTOMER_KM_RANGES = SMARTANDCARE_KM_RANGES

/**
 * Gibt die passende KM-Tabelle für einen Auftraggeber zurück
 */
export function getCustomerKmRangesForAuftraggeber(auftraggeber?: Auftraggeber): CustomerKmRange[] {
  if (auftraggeber === 'onlogist') {
    return ONLOGIST_KM_RANGES
  }
  return SMARTANDCARE_KM_RANGES
}

/**
 * Berechnet den Kundenpreis basierend auf gefahrenen Kilometern
 * Optional: auftraggeber für auftraggeberspezifische Tabellen
 */
export function calculateCustomerPrice(km: number, auftraggeber?: Auftraggeber): number {
  if (km <= 0) return 0

  const ranges = getCustomerKmRangesForAuftraggeber(auftraggeber)
  const maxPrice = ranges[ranges.length - 1].kundenpreis

  // Finde die passende Range
  for (const range of ranges) {
    if (km <= range.maxKm) {
      return range.kundenpreis
    }
  }

  // Über max km: höchster Preis der jeweiligen Tabelle
  return maxPrice
}

/**
 * Berechnet Wartezeit-Aufschlag für Kunden
 * 0 = keine, 1 = 12€, 2 = 24€, 3 = 36€
 */
export function calculateCustomerWaitingTime(wartezeitCode: number): number {
  switch (wartezeitCode) {
    case 0:
      return 0
    case 1:
      return 12
    case 2:
      return 24
    case 3:
      return 36
    default:
      return 0
  }
}

/**
 * Konvertiert Wartezeit-String zu Code
 * "keine" = 0, "30-60" = 1, "60-90" = 2, "90-120" = 3
 */
export function wartezeitToCode(wartezeit?: string): number {
  if (!wartezeit || wartezeit === "keine") return 0

  switch (wartezeit) {
    case "30-60":
      return 1
    case "60-90":
      return 2
    case "90-120":
      return 3
    default:
      return 0
  }
}

/**
 * Berechnet den Gesamtpreis für Kunden (KM + Wartezeit)
 * Optional: auftraggeber für auftraggeberspezifische Tabellen
 * WICHTIG: Bei Onlogist wird KEINE Wartezeit berechnet (immer 0€)
 */
export function calculateCustomerTotal(km: number, wartezeit?: string, auftraggeber?: Auftraggeber): number {
  const kmPrice = calculateCustomerPrice(km, auftraggeber)

  // Bei Onlogist wird keine Wartezeit berechnet
  if (auftraggeber === 'onlogist') {
    return kmPrice
  }

  const wartezeitCode = wartezeitToCode(wartezeit)
  const waitingPrice = calculateCustomerWaitingTime(wartezeitCode)

  return kmPrice + waitingPrice
}

/**
 * Gibt die Wartezeit als formatierten Text zurück
 */
export function getWartezeitText(wartezeitCode: number): string {
  switch (wartezeitCode) {
    case 0:
      return "-"
    case 1:
      return "30-60 Min"
    case 2:
      return "60-90 Min"
    case 3:
      return "90-120 Min"
    default:
      return "-"
  }
}
