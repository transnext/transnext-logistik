/**
 * Kunden-Preisberechnung (10% Aufschlag auf Fahrerlohn)
 * Für Abrechnungen an Kunden
 */

export interface CustomerKmRange {
  maxKm: number
  kundenpreis: number
}

// Kunden-KM-Range mit 10% Aufschlag (gerundet)
export const CUSTOMER_KM_RANGES: CustomerKmRange[] = [
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

/**
 * Berechnet den Kundenpreis basierend auf gefahrenen Kilometern
 */
export function calculateCustomerPrice(km: number): number {
  if (km <= 0) return 0

  // Finde die passende Range
  for (const range of CUSTOMER_KM_RANGES) {
    if (km <= range.maxKm) {
      return range.kundenpreis
    }
  }

  // Über 1000 km: 319€ (höchster Preis)
  return 319
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
 */
export function calculateCustomerTotal(km: number, wartezeit?: string): number {
  const kmPrice = calculateCustomerPrice(km)
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
