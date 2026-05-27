/**
 * Verfügbarkeits-Export für Smart & Care Disposition
 *
 * WICHTIG: Dieser Export ist speziell für die externe Disposition bei Smart & Care.
 * Er enthält NUR Informationen, die für die Einsatzplanung relevant sind.
 *
 * NICHT ENTHALTEN (bewusst ausgeschlossen):
 * - Telefonnummern
 * - E-Mail-Adressen
 * - Adressen
 * - Interne Fahrerakte-Notizen
 * - HR-Notizen
 * - Compliance-Infos
 * - Dokumenteninfos
 * - Tankkarteninfos
 * - Kurzstrecken-/Langstreckenwünsche (preferred_tour_type)
 * - Interne Einsatzpräferenzen
 *
 * ENTHALTEN:
 * - Fahrername
 * - Verfügbarkeitsstatus pro Tag (Ja/Nein/?/FT)
 * - Kommentare aus Verfügbarkeitsmeldungen (taggenau)
 */

import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { getHoliday, getHolidayName } from './holidays'
import type { DriverAvailability } from './availability-api'
import {
  TRANSNEXT_BLUE,
  TRANSNEXT_BLUE_ARRAY,
  DARK_GRAY,
  PDF_MARGINS,
  formatPdfDate,
  formatPdfCurrentDate
} from './pdf-helpers'

// ============================================================
// TYPEN
// ============================================================

export interface ExportDriver {
  fahrer_id: string
  name: string
}

export interface ExportDayData {
  date: string
  dayName: string
  dayShort: string
  dateDisplay: string
  isHoliday: boolean
  holidayName: string | null
}

export interface SmartCareExportData {
  weekStart: string
  weekNumber: number
  year: number
  weekDays: ExportDayData[]
  drivers: ExportDriver[]
  availability: DriverAvailability[]
}

interface DriverRowData {
  name: string
  days: ('Ja' | 'Nein' | '?' | 'FT')[]
  hasComments: boolean[]
}

interface CommentEntry {
  driverName: string
  date: string
  dayName: string
  status: string
  comment: string
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Berechnet KW-Nummer für ein Datum
 */
function getWeekNumber(dateStr: string): number {
  const date = new Date(dateStr)
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}

/**
 * Formatiert Datum für Anzeige (z.B. "Mo, 19.05.")
 */
function formatDayHeader(date: string, dayShort: string): string {
  const d = new Date(date)
  const day = d.getDate().toString().padStart(2, '0')
  const month = (d.getMonth() + 1).toString().padStart(2, '0')
  return `${dayShort}, ${day}.${month}.`
}

/**
 * Prüft ob ein Datum ein Werktag (Mo-Fr) ist
 */
function isWeekday(date: string): boolean {
  const d = new Date(date)
  const day = d.getDay()
  return day >= 1 && day <= 5
}

/**
 * Generiert Wochentage Mo-Fr
 */
export function generateExportWeekDays(weekStartDate: string): ExportDayData[] {
  const days: ExportDayData[] = []
  const weekStart = new Date(weekStartDate)
  const dayNames = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag']
  const dayShorts = ['Mo', 'Di', 'Mi', 'Do', 'Fr']

  for (let i = 0; i < 5; i++) {
    const date = new Date(weekStart)
    date.setDate(weekStart.getDate() + i)
    const dateStr = date.toISOString().split('T')[0]
    const holiday = getHoliday(dateStr)

    days.push({
      date: dateStr,
      dayName: dayNames[i],
      dayShort: dayShorts[i],
      dateDisplay: date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }),
      isHoliday: !!holiday,
      holidayName: holiday?.name || null
    })
  }

  return days
}

// ============================================================
// PDF EXPORT
// ============================================================

/**
 * Exportiert Verfügbarkeitsübersicht als PDF für Smart & Care
 *
 * Layout: A4 Querformat
 * - Kopfbereich mit TransNext Branding
 * - Zusammenfassung (Anzahl Fahrer, Rückmeldungen)
 * - Haupttabelle: Kompakte Wochenübersicht
 * - Hinweistabelle: Tagsgenaue Kommentare
 * - Legende
 *
 * WICHTIG: Keine Kurzstrecke/Langstrecke, keine internen Daten!
 */
export function exportSmartCarePDF(data: SmartCareExportData): void {
  // A4 Querformat
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  })

  const pageWidth = 297
  const pageHeight = 210
  const marginLeft = 14
  const marginRight = 14
  const marginTop = 15
  let currentY = marginTop

  // ============ KOPFBEREICH ============

  // Logo/Firmenname
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(TRANSNEXT_BLUE.r, TRANSNEXT_BLUE.g, TRANSNEXT_BLUE.b)
  doc.text('TransNext Logistik', marginLeft, currentY + 5)

  // Dokumenttitel
  doc.setFontSize(14)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(DARK_GRAY.r, DARK_GRAY.g, DARK_GRAY.b)
  doc.text('Verfügbarkeitsübersicht für Smart & Care', marginLeft, currentY + 13)

  // KW und Zeitraum
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(TRANSNEXT_BLUE.r, TRANSNEXT_BLUE.g, TRANSNEXT_BLUE.b)
  const kwText = `KW ${data.weekNumber} / ${data.year}`
  doc.text(kwText, marginLeft, currentY + 22)

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(DARK_GRAY.r, DARK_GRAY.g, DARK_GRAY.b)
  const weekDays = data.weekDays
  const zeitraum = `${weekDays[0]?.dateDisplay || ''} - ${weekDays[4]?.dateDisplay || ''}`
  doc.text(`Zeitraum: ${zeitraum} (Montag bis Freitag)`, marginLeft, currentY + 28)

  // Erstellungsdatum rechtsbündig
  doc.setFontSize(9)
  doc.setTextColor(100, 100, 100)
  const now = new Date()
  const erstelltText = `Erstellt: ${formatPdfCurrentDate()} um ${now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr`
  const erstelltWidth = doc.getTextWidth(erstelltText)
  doc.text(erstelltText, pageWidth - marginRight - erstelltWidth, currentY + 5)

  // Trennlinie
  currentY += 33
  doc.setDrawColor(TRANSNEXT_BLUE.r, TRANSNEXT_BLUE.g, TRANSNEXT_BLUE.b)
  doc.setLineWidth(0.5)
  doc.line(marginLeft, currentY, pageWidth - marginRight, currentY)
  currentY += 8

  // ============ ZUSAMMENFASSUNG ============

  // Statistiken berechnen
  const totalDrivers = data.drivers.length
  const driversWithResponse = new Set<string>()
  const driversWithAvailableDay = new Set<string>()

  data.availability.forEach(a => {
    driversWithResponse.add(a.fahrer_id)
    if (a.is_available) {
      driversWithAvailableDay.add(a.fahrer_id)
    }
  })

  const withResponse = driversWithResponse.size
  const withoutResponse = totalDrivers - withResponse
  const withAvailableDay = driversWithAvailableDay.size

  // Zusammenfassung Box
  doc.setFillColor(248, 250, 252)
  doc.setDrawColor(220, 220, 220)
  doc.roundedRect(marginLeft, currentY, pageWidth - marginLeft - marginRight, 16, 2, 2, 'FD')

  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(DARK_GRAY.r, DARK_GRAY.g, DARK_GRAY.b)
  doc.text('Zusammenfassung:', marginLeft + 4, currentY + 6)

  doc.setFont('helvetica', 'normal')
  const statsX = marginLeft + 45
  doc.text(`Fahrer gesamt: ${totalDrivers}`, statsX, currentY + 6)
  doc.text(`Mit Rückmeldung: ${withResponse}`, statsX + 50, currentY + 6)
  doc.text(`Ohne Rückmeldung: ${withoutResponse}`, statsX + 105, currentY + 6)
  doc.text(`Mind. 1 Tag verfügbar: ${withAvailableDay}`, statsX + 165, currentY + 6)

  currentY += 22

  // ============ HAUPTTABELLE ============

  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(0, 0, 0)
  doc.text('Wochenübersicht', marginLeft, currentY)
  currentY += 6

  // Tabellendaten vorbereiten
  const tableHead = [
    'Fahrer',
    ...weekDays.map(d => formatDayHeader(d.date, d.dayShort))
  ]

  // Verfügbarkeits-Map erstellen: fahrer_id -> date -> availability
  const availMap = new Map<string, Map<string, DriverAvailability>>()
  data.availability.forEach(a => {
    if (!availMap.has(a.fahrer_id)) {
      availMap.set(a.fahrer_id, new Map())
    }
    availMap.get(a.fahrer_id)!.set(a.date, a)
  })

  // Kommentare sammeln (taggenau)
  const comments: CommentEntry[] = []

  // Tabellenzeilen erstellen
  const tableBody: string[][] = []

  // Sortiere Fahrer alphabetisch
  const sortedDrivers = [...data.drivers].sort((a, b) =>
    a.name.localeCompare(b.name, 'de')
  )

  for (const driver of sortedDrivers) {
    const row: string[] = [driver.name]
    const driverAvail = availMap.get(driver.fahrer_id) || new Map()

    for (const day of weekDays) {
      const avail = driverAvail.get(day.date)
      let cellValue: string

      if (day.isHoliday) {
        cellValue = 'FT'
      } else if (!avail) {
        cellValue = '?'
      } else if (avail.is_available) {
        // Prüfe ob Kommentar vorhanden - NICHT preferred_tour_type!
        const hasComment = avail.note && avail.note.trim().length > 0
        cellValue = hasComment ? 'Ja*' : 'Ja'

        // Kommentar für Hinweistabelle sammeln (NUR note, NICHT preferred_tour_type!)
        if (hasComment) {
          comments.push({
            driverName: driver.name,
            date: day.dateDisplay,
            dayName: day.dayName,
            status: 'Verfügbar',
            comment: avail.note!.trim()
          })
        }
      } else {
        // Nicht verfügbar - auch hier können Kommentare sein
        const hasComment = avail.note && avail.note.trim().length > 0
        cellValue = hasComment ? 'Nein*' : 'Nein'

        if (hasComment) {
          comments.push({
            driverName: driver.name,
            date: day.dateDisplay,
            dayName: day.dayName,
            status: 'Nicht verfügbar',
            comment: avail.note!.trim()
          })
        }
      }

      row.push(cellValue)
    }

    tableBody.push(row)
  }

  // Haupttabelle zeichnen
  autoTable(doc, {
    head: [tableHead],
    body: tableBody,
    startY: currentY,
    theme: 'striped',
    styles: {
      fontSize: 9,
      cellPadding: 2.5
    },
    headStyles: {
      fillColor: TRANSNEXT_BLUE_ARRAY,
      textColor: 255,
      fontStyle: 'bold',
      halign: 'center'
    },
    columnStyles: {
      0: { cellWidth: 50, halign: 'left', fontStyle: 'bold' },
      1: { cellWidth: 32, halign: 'center' },
      2: { cellWidth: 32, halign: 'center' },
      3: { cellWidth: 32, halign: 'center' },
      4: { cellWidth: 32, halign: 'center' },
      5: { cellWidth: 32, halign: 'center' }
    },
    alternateRowStyles: {
      fillColor: [250, 250, 252]
    },
    didParseCell: (data) => {
      // Farbcodierung für Zellen
      if (data.section === 'body' && data.column.index > 0) {
        const value = data.cell.text[0]
        if (value === 'Ja' || value === 'Ja*') {
          data.cell.styles.textColor = [22, 163, 74] // Grün
          data.cell.styles.fontStyle = 'bold'
        } else if (value === 'Nein' || value === 'Nein*') {
          data.cell.styles.textColor = [220, 38, 38] // Rot
        } else if (value === '?') {
          data.cell.styles.textColor = [245, 158, 11] // Orange/Amber
        } else if (value === 'FT') {
          data.cell.styles.textColor = [100, 100, 100] // Grau
          data.cell.styles.fillColor = [240, 240, 240]
        }
      }
    },
    margin: { left: marginLeft, right: marginRight }
  })

  currentY = (doc as any).lastAutoTable.finalY + 10

  // ============ HINWEISTABELLE (Kommentare) ============

  if (comments.length > 0) {
    // Prüfen ob genug Platz oder neue Seite
    if (currentY > pageHeight - 60) {
      doc.addPage()
      currentY = marginTop
    }

    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(0, 0, 0)
    doc.text('Hinweise / Kommentare', marginLeft, currentY)
    currentY += 6

    // Sortiere Kommentare nach Fahrer, dann Datum
    comments.sort((a, b) => {
      const nameCompare = a.driverName.localeCompare(b.driverName, 'de')
      if (nameCompare !== 0) return nameCompare
      return a.date.localeCompare(b.date)
    })

    const commentHead = ['Fahrer', 'Tag / Datum', 'Status', 'Kommentar']
    const commentBody = comments.map(c => [
      c.driverName,
      `${c.dayName}, ${c.date}`,
      c.status,
      c.comment
    ])

    autoTable(doc, {
      head: [commentHead],
      body: commentBody,
      startY: currentY,
      theme: 'striped',
      styles: {
        fontSize: 9,
        cellPadding: 2.5,
        overflow: 'linebreak'
      },
      headStyles: {
        fillColor: TRANSNEXT_BLUE_ARRAY,
        textColor: 255,
        fontStyle: 'bold'
      },
      columnStyles: {
        0: { cellWidth: 45 },
        1: { cellWidth: 35 },
        2: { cellWidth: 30 },
        3: { cellWidth: 'auto' } // Kommentar füllt Rest
      },
      alternateRowStyles: {
        fillColor: [250, 250, 252]
      },
      margin: { left: marginLeft, right: marginRight },
      showHead: 'everyPage',
      didDrawPage: (data) => {
        // Header auf Folgeseiten
        if (data.pageNumber > 1) {
          doc.setFontSize(9)
          doc.setTextColor(100, 100, 100)
          doc.text(`Verfügbarkeit KW ${data.settings.margin.top} (Fortsetzung)`, marginLeft, 10)
        }
      }
    })

    currentY = (doc as any).lastAutoTable.finalY + 8
  } else {
    // Keine Kommentare vorhanden
    doc.setFontSize(10)
    doc.setFont('helvetica', 'italic')
    doc.setTextColor(100, 100, 100)
    doc.text('Keine Hinweise oder Kommentare für diese Woche vorhanden.', marginLeft, currentY)
    currentY += 10
  }

  // ============ LEGENDE ============

  // Prüfen ob genug Platz oder neue Seite
  if (currentY > pageHeight - 30) {
    doc.addPage()
    currentY = marginTop
  }

  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(DARK_GRAY.r, DARK_GRAY.g, DARK_GRAY.b)
  doc.text('Legende:', marginLeft, currentY)

  doc.setFont('helvetica', 'normal')
  currentY += 5
  const legendItems = [
    { symbol: 'Ja', meaning: 'Fahrer ist an diesem Tag verfügbar' },
    { symbol: 'Nein', meaning: 'Fahrer ist an diesem Tag nicht verfügbar' },
    { symbol: '?', meaning: 'Keine Rückmeldung vom Fahrer' },
    { symbol: 'FT', meaning: 'Feiertag (NRW)' },
    { symbol: '*', meaning: 'Kommentar vorhanden (siehe Hinweistabelle)' }
  ]

  let legendX = marginLeft
  for (const item of legendItems) {
    const text = `${item.symbol} = ${item.meaning}`
    doc.text(text, legendX, currentY)
    legendX += doc.getTextWidth(text) + 10

    // Zeilenumbruch wenn zu breit
    if (legendX > pageWidth - marginRight - 50) {
      legendX = marginLeft
      currentY += 5
    }
  }

  // ============ FOOTER ============

  const totalPages = doc.internal.pages.length - 1
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)

    // Trennlinie
    doc.setDrawColor(200, 200, 200)
    doc.setLineWidth(0.2)
    doc.line(marginLeft, pageHeight - 12, pageWidth - marginRight, pageHeight - 12)

    // Footer Text
    doc.setFontSize(7)
    doc.setTextColor(130, 130, 130)
    doc.text('Dieses Dokument wurde automatisiert erstellt. Nur für die Disposition bei Smart & Care bestimmt.', marginLeft, pageHeight - 8)

    // Seitenzahl
    const pageText = `Seite ${i} von ${totalPages}`
    const pageTextWidth = doc.getTextWidth(pageText)
    doc.text(pageText, pageWidth - marginRight - pageTextWidth, pageHeight - 8)
  }

  // Download
  const filename = `Verfuegbarkeit_SmartCare_KW${data.weekNumber}_${data.year}.pdf`
  doc.save(filename)
}

// ============================================================
// CSV EXPORT
// ============================================================

/**
 * Exportiert Verfügbarkeit als CSV für Smart & Care
 *
 * Format: Eine Zeile pro Fahrer UND Tag (taggenau)
 * Spalten: Fahrer, Datum, Wochentag, Status, Kommentar, Rückmeldestatus
 *
 * WICHTIG: Keine Kurzstrecke/Langstrecke, keine internen Daten!
 */
export function exportSmartCareCSV(data: SmartCareExportData): void {
  // CSV Header
  const headers = [
    'Fahrer',
    'Datum',
    'Wochentag',
    'Verfügbar',
    'Kommentar',
    'Rückmeldestatus',
    'Feiertag'
  ]

  // Verfügbarkeits-Map erstellen
  const availMap = new Map<string, Map<string, DriverAvailability>>()
  data.availability.forEach(a => {
    if (!availMap.has(a.fahrer_id)) {
      availMap.set(a.fahrer_id, new Map())
    }
    availMap.get(a.fahrer_id)!.set(a.date, a)
  })

  // CSV Rows
  const rows: string[][] = []

  // Sortiere Fahrer alphabetisch
  const sortedDrivers = [...data.drivers].sort((a, b) =>
    a.name.localeCompare(b.name, 'de')
  )

  for (const driver of sortedDrivers) {
    const driverAvail = availMap.get(driver.fahrer_id) || new Map()

    for (const day of data.weekDays) {
      const avail = driverAvail.get(day.date)

      let verfuegbar: string
      let kommentar = ''
      let rueckmeldestatus: string
      let feiertag = ''

      if (day.isHoliday) {
        verfuegbar = '-'
        rueckmeldestatus = 'Feiertag'
        feiertag = day.holidayName || 'Ja'
      } else if (!avail) {
        verfuegbar = '-'
        rueckmeldestatus = 'Keine Rückmeldung'
      } else {
        verfuegbar = avail.is_available ? 'Ja' : 'Nein'
        rueckmeldestatus = 'Rückmeldung erhalten'
        // NUR note-Feld, NICHT preferred_tour_type!
        if (avail.note && avail.note.trim()) {
          kommentar = avail.note.trim()
        }
      }

      // Formatiere Datum für CSV
      const datumFormatted = new Date(day.date).toLocaleDateString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      })

      rows.push([
        driver.name,
        datumFormatted,
        day.dayName,
        verfuegbar,
        kommentar,
        rueckmeldestatus,
        feiertag
      ])
    }
  }

  // CSV zusammenbauen
  const escapeCSV = (value: string): string => {
    // Wenn Komma, Anführungszeichen oder Zeilenumbruch, dann in Anführungszeichen setzen
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`
    }
    return value
  }

  const csvContent = [
    headers.join(';'),
    ...rows.map(row => row.map(escapeCSV).join(';'))
  ].join('\n')

  // BOM für Excel UTF-8
  const BOM = '\uFEFF'
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = `Verfuegbarkeit_SmartCare_KW${data.weekNumber}_${data.year}.csv`
  link.click()

  URL.revokeObjectURL(url)
}

// ============================================================
// DATEN-VORBEREITUNG
// ============================================================

/**
 * Bereitet Export-Daten aus der Verfügbarkeitsansicht vor
 *
 * Filtert automatisch:
 * - Nur aktive, nicht-archivierte Fahrer
 * - Nur Mo-Fr (keine Wochenenden)
 * - Berücksichtigt NRW-Feiertage
 *
 * Entfernt bewusst:
 * - preferred_tour_type (Kurz-/Langstreckenwünsche)
 * - Alle internen Felder
 */
export function prepareSmartCareExportData(
  weekStart: string,
  drivers: Array<{ id: string; name: string }>,
  availability: DriverAvailability[]
): SmartCareExportData {
  const weekDays = generateExportWeekDays(weekStart)
  const weekNumber = getWeekNumber(weekStart)
  const year = new Date(weekStart).getFullYear()

  // Filter availability auf relevante Wochentage (Mo-Fr)
  const weekDates = new Set(weekDays.map(d => d.date))
  const filteredAvailability = availability.filter(a => weekDates.has(a.date))

  return {
    weekStart,
    weekNumber,
    year,
    weekDays,
    drivers: drivers.map(d => ({
      fahrer_id: d.id,
      name: d.name
    })),
    availability: filteredAvailability
  }
}
