/**
 * NRW-Feiertage Berechnung
 *
 * Berechnet alle gesetzlichen Feiertage für Nordrhein-Westfalen.
 * Keine externe API erforderlich - alles lokal berechenbar.
 *
 * Feste Feiertage NRW:
 * - Neujahr: 1. Januar
 * - Tag der Arbeit: 1. Mai
 * - Tag der Deutschen Einheit: 3. Oktober
 * - Allerheiligen: 1. November (NRW-spezifisch)
 * - 1. Weihnachtstag: 25. Dezember
 * - 2. Weihnachtstag: 26. Dezember
 *
 * Bewegliche Feiertage (abhängig von Ostern):
 * - Karfreitag: Ostersonntag - 2 Tage
 * - Ostermontag: Ostersonntag + 1 Tag
 * - Christi Himmelfahrt: Ostersonntag + 39 Tage
 * - Pfingstmontag: Ostersonntag + 50 Tage
 * - Fronleichnam: Ostersonntag + 60 Tage (NRW-spezifisch)
 */

export interface Holiday {
  date: string // YYYY-MM-DD
  name: string
  type: 'fixed' | 'easter_based'
}

/**
 * Berechnet das Ostersonntag-Datum für ein gegebenes Jahr
 * Verwendet den Gauss'schen Osteralgorithmus
 */
function calculateEasterSunday(year: number): Date {
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31) - 1 // 0-indexed
  const day = ((h + l - 7 * m + 114) % 31) + 1

  return new Date(year, month, day)
}

/**
 * Formatiert ein Datum als YYYY-MM-DD String
 */
function formatDateString(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Addiert Tage zu einem Datum
 */
function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

/**
 * Berechnet alle NRW-Feiertage für ein gegebenes Jahr
 */
export function getNRWHolidays(year: number): Holiday[] {
  const holidays: Holiday[] = []

  // Feste Feiertage
  holidays.push({
    date: `${year}-01-01`,
    name: 'Neujahr',
    type: 'fixed'
  })

  holidays.push({
    date: `${year}-05-01`,
    name: 'Tag der Arbeit',
    type: 'fixed'
  })

  holidays.push({
    date: `${year}-10-03`,
    name: 'Tag der Deutschen Einheit',
    type: 'fixed'
  })

  holidays.push({
    date: `${year}-11-01`,
    name: 'Allerheiligen',
    type: 'fixed'
  })

  holidays.push({
    date: `${year}-12-25`,
    name: '1. Weihnachtstag',
    type: 'fixed'
  })

  holidays.push({
    date: `${year}-12-26`,
    name: '2. Weihnachtstag',
    type: 'fixed'
  })

  // Bewegliche Feiertage (basierend auf Ostern)
  const easterSunday = calculateEasterSunday(year)

  // Karfreitag: Ostersonntag - 2 Tage
  holidays.push({
    date: formatDateString(addDays(easterSunday, -2)),
    name: 'Karfreitag',
    type: 'easter_based'
  })

  // Ostermontag: Ostersonntag + 1 Tag
  holidays.push({
    date: formatDateString(addDays(easterSunday, 1)),
    name: 'Ostermontag',
    type: 'easter_based'
  })

  // Christi Himmelfahrt: Ostersonntag + 39 Tage
  holidays.push({
    date: formatDateString(addDays(easterSunday, 39)),
    name: 'Christi Himmelfahrt',
    type: 'easter_based'
  })

  // Pfingstmontag: Ostersonntag + 50 Tage
  holidays.push({
    date: formatDateString(addDays(easterSunday, 50)),
    name: 'Pfingstmontag',
    type: 'easter_based'
  })

  // Fronleichnam: Ostersonntag + 60 Tage (nur in NRW!)
  holidays.push({
    date: formatDateString(addDays(easterSunday, 60)),
    name: 'Fronleichnam',
    type: 'easter_based'
  })

  // Sortieren nach Datum
  holidays.sort((a, b) => a.date.localeCompare(b.date))

  return holidays
}

/**
 * Cache für Feiertage pro Jahr
 */
const holidayCache = new Map<number, Map<string, Holiday>>()

/**
 * Holt oder erstellt den Holiday-Cache für ein Jahr
 */
function getHolidayMap(year: number): Map<string, Holiday> {
  if (!holidayCache.has(year)) {
    const holidays = getNRWHolidays(year)
    const map = new Map<string, Holiday>()
    holidays.forEach(h => map.set(h.date, h))
    holidayCache.set(year, map)
  }
  return holidayCache.get(year)!
}

/**
 * Prüft ob ein Datum ein Feiertag ist
 * @param dateStr Datum im Format YYYY-MM-DD
 * @returns Holiday-Objekt wenn Feiertag, sonst null
 */
export function getHoliday(dateStr: string): Holiday | null {
  const year = parseInt(dateStr.substring(0, 4), 10)
  if (isNaN(year)) return null

  const map = getHolidayMap(year)
  return map.get(dateStr) || null
}

/**
 * Prüft ob ein Datum ein Feiertag ist (Boolean-Version)
 * @param dateStr Datum im Format YYYY-MM-DD
 */
export function isHoliday(dateStr: string): boolean {
  return getHoliday(dateStr) !== null
}

/**
 * Holt den Feiertags-Namen für ein Datum
 * @param dateStr Datum im Format YYYY-MM-DD
 * @returns Feiertags-Name oder null
 */
export function getHolidayName(dateStr: string): string | null {
  const holiday = getHoliday(dateStr)
  return holiday?.name || null
}

/**
 * Prüft ob ein Datum ein Wochenende ist (Samstag oder Sonntag)
 * @param dateStr Datum im Format YYYY-MM-DD
 */
export function isWeekend(dateStr: string): boolean {
  const date = new Date(dateStr)
  const dayOfWeek = date.getDay()
  return dayOfWeek === 0 || dayOfWeek === 6 // 0 = Sonntag, 6 = Samstag
}

/**
 * Prüft ob ein Datum ein Werktag ist (Mo-Fr, kein Feiertag)
 * @param dateStr Datum im Format YYYY-MM-DD
 */
export function isWorkday(dateStr: string): boolean {
  return !isWeekend(dateStr) && !isHoliday(dateStr)
}

/**
 * Holt den Wochentag-Namen für ein Datum
 * @param dateStr Datum im Format YYYY-MM-DD
 */
export function getWeekdayName(dateStr: string): string {
  const date = new Date(dateStr)
  const dayNames = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag']
  return dayNames[date.getDay()]
}

/**
 * Holt den kurzen Wochentag-Namen für ein Datum
 * @param dateStr Datum im Format YYYY-MM-DD
 */
export function getWeekdayShort(dateStr: string): string {
  const date = new Date(dateStr)
  const dayShorts = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']
  return dayShorts[date.getDay()]
}

/**
 * Zählt die Werktage (Mo-Fr, ohne Feiertage) in einem Datumsbereich
 * @param startDate Start-Datum YYYY-MM-DD
 * @param endDate End-Datum YYYY-MM-DD (inklusive)
 */
export function countWorkdays(startDate: string, endDate: string): number {
  let count = 0
  const current = new Date(startDate)
  const end = new Date(endDate)

  while (current <= end) {
    const dateStr = formatDateString(current)
    if (isWorkday(dateStr)) {
      count++
    }
    current.setDate(current.getDate() + 1)
  }

  return count
}

/**
 * Prüft ob ein Datum ein Werktag ist (nur Mo-Fr, Feiertage ignoriert)
 * Für die Verfügbarkeitsanzeige relevant
 */
export function isWeekdayMoFr(dateStr: string): boolean {
  const date = new Date(dateStr)
  const dayOfWeek = date.getDay()
  // 1 = Montag, 2 = Dienstag, ..., 5 = Freitag
  return dayOfWeek >= 1 && dayOfWeek <= 5
}
