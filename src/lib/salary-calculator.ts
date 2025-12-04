/**
 * Vergütungsberechnung nach KM-Range
 * Basierend auf der offiziellen Fahrerliste
 */

export interface KmRange {
  maxKm: number
  verguetung: number
}

export const KM_RANGES: KmRange[] = [
  { maxKm: 10, verguetung: 10 },
  { maxKm: 20, verguetung: 12 },
  { maxKm: 30, verguetung: 20 },
  { maxKm: 50, verguetung: 28 },
  { maxKm: 100, verguetung: 36 },
  { maxKm: 150, verguetung: 42 },
  { maxKm: 200, verguetung: 56 },
  { maxKm: 250, verguetung: 61 },
  { maxKm: 350, verguetung: 68 },
  { maxKm: 450, verguetung: 81 },
  { maxKm: 550, verguetung: 100 },
  { maxKm: 650, verguetung: 118 },
  { maxKm: 750, verguetung: 125 },
  { maxKm: 800, verguetung: 144 },
  { maxKm: 900, verguetung: 163 },
  { maxKm: 1000, verguetung: 181 },
]

/**
 * Berechnet die Vergütung basierend auf gefahrenen Kilometern
 */
export function calculateVerguetung(km: number): number {
  if (km <= 0) return 0

  // Finde die passende Range
  for (const range of KM_RANGES) {
    if (km <= range.maxKm) {
      return range.verguetung
    }
  }

  // Über 1000 km: 181€ (höchste Vergütung)
  return 181
}

/**
 * Berechnet Wartezeit-Bonus
 */
export function calculateWartezeitBonus(wartezeit?: string): number {
  if (!wartezeit || wartezeit === "keine") return 0

  switch (wartezeit) {
    case "30-60":
      return 15
    case "60-90":
      return 25
    case "90-120":
      return 35
    default:
      return 0
  }
}

/**
 * Berechnet den Gesamtverdienst für eine Tour
 */
export function calculateTourVerdienst(km: number, wartezeit?: string): number {
  const baseVerguetung = calculateVerguetung(km)
  const wartezeitBonus = calculateWartezeitBonus(wartezeit)
  return baseVerguetung + wartezeitBonus
}

/**
 * Gibt die KM-Range als Text zurück
 */
export function getKmRangeText(km: number): string {
  if (km <= 0) return "-"

  for (const range of KM_RANGES) {
    if (km <= range.maxKm) {
      return `bis ${range.maxKm} km`
    }
  }

  return "über 1000 km"
}
