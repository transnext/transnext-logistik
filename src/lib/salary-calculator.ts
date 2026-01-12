/**
 * Vergütungsberechnung nach KM-Range
 * Basierend auf der offiziellen Fahrerliste
 */

export interface KmRange {
  maxKm: number
  verguetung: number
}

// Monatliches Verdienst-Limit für Fahrer (Minijob)
export const MONTHLY_LIMIT = 556

// Standard KM-Tabelle für alle Fahrer
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

// Spezielle KM-Tabelle für Phillip Sander
export const PHILLIP_SANDER_KM_RANGES: KmRange[] = [
  { maxKm: 10, verguetung: 12 },
  { maxKm: 20, verguetung: 14 },
  { maxKm: 30, verguetung: 22 },
  { maxKm: 40, verguetung: 27 },
  { maxKm: 50, verguetung: 32 },
  { maxKm: 60, verguetung: 36 },
  { maxKm: 70, verguetung: 40 },
  { maxKm: 80, verguetung: 44 },
  { maxKm: 90, verguetung: 48 },
  { maxKm: 100, verguetung: 52 },
  { maxKm: 120, verguetung: 56 },
  { maxKm: 140, verguetung: 60 },
  { maxKm: 160, verguetung: 64 },
  { maxKm: 180, verguetung: 68 },
  { maxKm: 200, verguetung: 72 },
  { maxKm: 220, verguetung: 76 },
  { maxKm: 240, verguetung: 80 },
  { maxKm: 260, verguetung: 84 },
  { maxKm: 280, verguetung: 88 },
  { maxKm: 300, verguetung: 92 },
  { maxKm: 320, verguetung: 96 },
  { maxKm: 340, verguetung: 100 },
  { maxKm: 360, verguetung: 105 },
  { maxKm: 380, verguetung: 110 },
  { maxKm: 400, verguetung: 115 },
  { maxKm: 450, verguetung: 120 },
  { maxKm: 500, verguetung: 125 },
  { maxKm: 550, verguetung: 130 },
  { maxKm: 600, verguetung: 140 },
  { maxKm: 650, verguetung: 150 },
  { maxKm: 700, verguetung: 160 },
  { maxKm: 750, verguetung: 170 },
  { maxKm: 800, verguetung: 180 },
  { maxKm: 900, verguetung: 195 },
  { maxKm: 1000, verguetung: 210 },
]

// Fahrernamen die die spezielle Tabelle nutzen
const SPECIAL_RATE_DRIVERS = ["Phillip Sander", "phillip sander"]

// Fahrer ohne Lohnberechnung (Touren werden nicht vergütet)
const NO_SALARY_DRIVERS = [
  "Nicholas Mandzel",
  "nicholas mandzel",
  "Mandzel Nicholas",
  "Burak Aydin",
  "burak aydin",
  "Aydin Burak"
]

/**
 * Prüft ob ein Fahrer keine Lohnberechnung hat
 */
export function hasNoSalary(fahrerName?: string): boolean {
  if (!fahrerName) return false
  const normalizedName = fahrerName.toLowerCase().trim()
  return NO_SALARY_DRIVERS.some(name =>
    normalizedName === name.toLowerCase().trim() ||
    normalizedName.split(' ').sort().join(' ') === name.toLowerCase().split(' ').sort().join(' ')
  )
}

/**
 * Prüft ob ein Fahrer die spezielle KM-Tabelle nutzt
 */
export function usesSpecialKmTable(fahrerName?: string): boolean {
  if (!fahrerName) return false
  return SPECIAL_RATE_DRIVERS.some(name =>
    fahrerName.toLowerCase().trim() === name.toLowerCase().trim()
  )
}

/**
 * Gibt die passende KM-Tabelle für einen Fahrer zurück
 */
export function getKmRangesForDriver(fahrerName?: string): KmRange[] {
  if (usesSpecialKmTable(fahrerName)) {
    return PHILLIP_SANDER_KM_RANGES
  }
  return KM_RANGES
}

/**
 * Berechnet die Vergütung basierend auf gefahrenen Kilometern
 * Optional: fahrerName für fahrerspezifische Tabellen
 */
export function calculateVerguetung(km: number, fahrerName?: string): number {
  if (km <= 0) return 0

  const ranges = getKmRangesForDriver(fahrerName)
  const maxVerguetung = ranges[ranges.length - 1].verguetung

  // Finde die passende Range
  for (const range of ranges) {
    if (km <= range.maxKm) {
      return range.verguetung
    }
  }

  // Über max km: höchste Vergütung der jeweiligen Tabelle
  return maxVerguetung
}

/**
 * Berechnet Wartezeit-Bonus (10€ pro Stunde)
 */
export function calculateWartezeitBonus(wartezeit?: string): number {
  if (!wartezeit || wartezeit === "keine") return 0

  switch (wartezeit) {
    case "30-60":
      return 10 // ~0.5-1h = 10€
    case "60-90":
      return 15 // ~1-1.5h = 15€
    case "90-120":
      return 20 // ~1.5-2h = 20€
    default:
      return 0
  }
}

/**
 * Berechnet den Gesamtverdienst für eine Tour
 * Optional: fahrerName für fahrerspezifische Tabellen
 * Fahrer ohne Lohnberechnung (Nicholas Mandzel, Burak Aydin) erhalten 0€
 */
export function calculateTourVerdienst(km: number, wartezeit?: string, fahrerName?: string): number {
  // Fahrer ohne Lohnberechnung
  if (hasNoSalary(fahrerName)) {
    return 0
  }

  const baseVerguetung = calculateVerguetung(km, fahrerName)
  const wartezeitBonus = calculateWartezeitBonus(wartezeit)
  return baseVerguetung + wartezeitBonus
}

/**
 * Berechnet den Monatsverdienst mit 556€ Cap
 * Berücksichtigt auch den Überschuss aus dem Vormonat
 * Gibt zurück: { ausgeZahlt: number, ueberschuss: number }
 */
export function calculateMonthlyPayout(
  totalVerdienst: number,
  vormonatUeberschuss: number = 0
): {
  ausgeZahlt: number
  ueberschuss: number
} {
  // Gesamt verfügbar = aktueller Verdienst + Überschuss Vormonat
  const gesamtVerfuegbar = totalVerdienst + vormonatUeberschuss

  if (gesamtVerfuegbar <= MONTHLY_LIMIT) {
    return {
      ausgeZahlt: gesamtVerfuegbar,
      ueberschuss: 0
    }
  }

  return {
    ausgeZahlt: MONTHLY_LIMIT,
    ueberschuss: gesamtVerfuegbar - MONTHLY_LIMIT
  }
}

/**
 * Gibt die KM-Range als Text zurück
 * Optional: fahrerName für fahrerspezifische Tabellen
 */
export function getKmRangeText(km: number, fahrerName?: string): string {
  if (km <= 0) return "-"

  const ranges = getKmRangesForDriver(fahrerName)
  const maxKm = ranges[ranges.length - 1].maxKm

  for (const range of ranges) {
    if (km <= range.maxKm) {
      return `bis ${range.maxKm} km`
    }
  }

  return `über ${maxKm} km`
}
