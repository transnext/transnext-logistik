/**
 * PDF Helper Functions
 *
 * Gemeinsame Funktionen für einheitliches PDF-Layout in Touren- und Auslagenabrechnungen.
 *
 * Wichtig:
 * - Deutsches Währungsformat: 1.234,56 €
 * - Rechtsbündige Beträge
 * - Einheitliche Schriftgrößen und Abstände
 * - TransNext-Blau als Akzentfarbe
 */

import type jsPDF from 'jspdf'

// =====================================================
// KONSTANTEN
// =====================================================

/** TransNext Blau RGB */
export const TRANSNEXT_BLUE = { r: 1, g: 90, b: 164 }

/** TransNext Blau als Array für jspdf-autotable */
export const TRANSNEXT_BLUE_ARRAY: [number, number, number] = [1, 90, 164]

/** Hellgrau für Hintergründe */
export const LIGHT_GRAY = { r: 245, g: 245, b: 245 }

/** Dunkelgrau für Text */
export const DARK_GRAY = { r: 60, g: 60, b: 60 }

/** Standardabstände in mm */
export const PDF_MARGINS = {
  left: 14,
  right: 14,
  top: 15,
  bottom: 20
}

/** Schriftgrößen */
export const PDF_FONT_SIZES = {
  title: 20,
  subtitle: 14,
  heading: 12,
  body: 10,
  small: 8,
  tiny: 7
}

/** Seitenbreite A4 in mm */
export const PAGE_WIDTH = 210

/** Nutzbare Breite (A4 - Margins) */
export const CONTENT_WIDTH = PAGE_WIDTH - PDF_MARGINS.left - PDF_MARGINS.right

// =====================================================
// WÄHRUNGSFORMATIERUNG
// =====================================================

/**
 * Formatiert einen Betrag im deutschen Währungsformat
 *
 * @param amount - Betrag als Zahl
 * @param includeEuro - ob "€" angehängt werden soll (default: true)
 * @returns Formatierter String, z.B. "1.234,56 €"
 *
 * Beispiele:
 * - formatPdfCurrency(19) => "19,00 €"
 * - formatPdfCurrency(248.45) => "248,45 €"
 * - formatPdfCurrency(1234.56) => "1.234,56 €"
 * - formatPdfCurrency(12345.67) => "12.345,67 €"
 * - formatPdfCurrency(12345.67, false) => "12.345,67"
 */
export function formatPdfCurrency(amount: number, includeEuro = true): string {
  // Deutsches Format: Tausendertrennzeichen = Punkt, Dezimaltrennzeichen = Komma
  const formatted = amount.toLocaleString('de-DE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })

  return includeEuro ? `${formatted} €` : formatted
}

/**
 * Formatiert ein Datum im deutschen Format
 *
 * @param dateString - ISO-Datumstring oder Date
 * @returns Formatierter String, z.B. "15.05.2026"
 */
export function formatPdfDate(dateString: string | Date): string {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString
  return date.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

/**
 * Formatiert das aktuelle Datum für PDF-Header
 */
export function formatPdfCurrentDate(): string {
  return new Date().toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

// =====================================================
// LAYOUT-HELPER
// =====================================================

/**
 * Zeichnet den TransNext-Header auf eine PDF-Seite
 *
 * Layout:
 * - Links: "TransNext Logistik" + GbR-Zeile
 * - Rechts: Erstelldatum
 * - Dezenter blauer Akzentbalken
 *
 * @param doc - jsPDF Dokument
 * @param options - Optionale Konfiguration
 * @returns Y-Position nach dem Header für weitere Inhalte
 */
export function drawPdfHeader(
  doc: jsPDF,
  options?: {
    showAccentLine?: boolean
  }
): number {
  const showAccentLine = options?.showAccentLine ?? true

  // Firmenname
  doc.setFontSize(PDF_FONT_SIZES.title)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(TRANSNEXT_BLUE.r, TRANSNEXT_BLUE.g, TRANSNEXT_BLUE.b)
  doc.text('TransNext Logistik', PDF_MARGINS.left, PDF_MARGINS.top + 5)

  // GbR-Zeile
  doc.setFontSize(PDF_FONT_SIZES.body)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(DARK_GRAY.r, DARK_GRAY.g, DARK_GRAY.b)
  doc.text('Nicholas Mandzel & Burak Aydin GbR', PDF_MARGINS.left, PDF_MARGINS.top + 12)

  // Datum rechts
  doc.setFontSize(PDF_FONT_SIZES.small)
  doc.setTextColor(100, 100, 100)
  const dateText = `Erstellt: ${formatPdfCurrentDate()}`
  const dateWidth = doc.getTextWidth(dateText)
  doc.text(dateText, PAGE_WIDTH - PDF_MARGINS.right - dateWidth, PDF_MARGINS.top + 5)

  // Akzentbalken
  if (showAccentLine) {
    doc.setDrawColor(TRANSNEXT_BLUE.r, TRANSNEXT_BLUE.g, TRANSNEXT_BLUE.b)
    doc.setLineWidth(0.5)
    doc.line(PDF_MARGINS.left, PDF_MARGINS.top + 18, PAGE_WIDTH - PDF_MARGINS.right, PDF_MARGINS.top + 18)
  }

  // Reset Textfarbe
  doc.setTextColor(0, 0, 0)

  return PDF_MARGINS.top + 25 // Y-Position für nächsten Inhalt
}

/**
 * Zeichnet einen Dokumenttitel mit optionalem Untertitel
 *
 * @param doc - jsPDF Dokument
 * @param title - Haupttitel (z.B. "Tourenabrechnung")
 * @param subtitle - Untertitel (z.B. "KW 17 / 2026")
 * @param startY - Y-Startposition
 * @returns Y-Position nach dem Titel
 */
export function drawPdfTitle(
  doc: jsPDF,
  title: string,
  subtitle?: string,
  startY: number = 30
): number {
  // Haupttitel
  doc.setFontSize(PDF_FONT_SIZES.subtitle + 2)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(0, 0, 0)
  doc.text(title, PDF_MARGINS.left, startY)

  let currentY = startY + 8

  // Untertitel
  if (subtitle) {
    doc.setFontSize(PDF_FONT_SIZES.heading)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(TRANSNEXT_BLUE.r, TRANSNEXT_BLUE.g, TRANSNEXT_BLUE.b)
    doc.text(subtitle, PDF_MARGINS.left, currentY)
    currentY += 8
  }

  // Reset
  doc.setTextColor(0, 0, 0)

  return currentY
}

/**
 * Zeichnet eine Info-Zeile mit Key-Value-Paaren
 *
 * @param doc - jsPDF Dokument
 * @param items - Array von {label, value} Objekten
 * @param startY - Y-Startposition
 * @returns Y-Position nach der Info-Zeile
 */
export function drawPdfInfoLine(
  doc: jsPDF,
  items: Array<{ label: string; value: string | number }>,
  startY: number
): number {
  doc.setFontSize(PDF_FONT_SIZES.body)

  let xPos = PDF_MARGINS.left
  const spacing = 50 // Abstand zwischen Items

  for (const item of items) {
    // Label
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100, 100, 100)
    doc.text(`${item.label}:`, xPos, startY)

    // Value
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(0, 0, 0)
    const labelWidth = doc.getTextWidth(`${item.label}: `)
    doc.text(String(item.value), xPos + labelWidth, startY)

    xPos += spacing
  }

  return startY + 8
}

/**
 * Zeichnet eine Summary-Box mit Gesamtbetrag
 *
 * @param doc - jsPDF Dokument
 * @param label - Label (z.B. "Gesamtbetrag")
 * @param amount - Betrag
 * @param startY - Y-Startposition
 * @param options - Optionale Konfiguration
 * @returns Y-Position nach der Box
 */
export function drawPdfSummaryBox(
  doc: jsPDF,
  label: string,
  amount: number,
  startY: number,
  options?: {
    boxWidth?: number
    alignRight?: boolean
  }
): number {
  const boxWidth = options?.boxWidth ?? 80
  const alignRight = options?.alignRight ?? true

  const boxX = alignRight
    ? PAGE_WIDTH - PDF_MARGINS.right - boxWidth
    : PDF_MARGINS.left

  const boxHeight = 14
  const padding = 4

  // Box-Hintergrund
  doc.setFillColor(LIGHT_GRAY.r, LIGHT_GRAY.g, LIGHT_GRAY.b)
  doc.setDrawColor(TRANSNEXT_BLUE.r, TRANSNEXT_BLUE.g, TRANSNEXT_BLUE.b)
  doc.setLineWidth(0.3)
  doc.roundedRect(boxX, startY, boxWidth, boxHeight, 2, 2, 'FD')

  // Label
  doc.setFontSize(PDF_FONT_SIZES.body)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(DARK_GRAY.r, DARK_GRAY.g, DARK_GRAY.b)
  doc.text(label, boxX + padding, startY + boxHeight / 2 + 1)

  // Betrag rechtsbündig
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(0, 0, 0)
  const amountText = formatPdfCurrency(amount)
  const amountWidth = doc.getTextWidth(amountText)
  doc.text(amountText, boxX + boxWidth - padding - amountWidth, startY + boxHeight / 2 + 1)

  return startY + boxHeight + 6
}

/**
 * Zeichnet den PDF-Footer
 *
 * @param doc - jsPDF Dokument
 * @param pageNumber - Aktuelle Seitenzahl (optional)
 * @param totalPages - Gesamtseitenzahl (optional)
 */
export function drawPdfFooter(
  doc: jsPDF,
  pageNumber?: number,
  totalPages?: number
): void {
  const pageHeight = doc.internal.pageSize.height
  const footerY = pageHeight - 10

  // Trennlinie
  doc.setDrawColor(200, 200, 200)
  doc.setLineWidth(0.2)
  doc.line(PDF_MARGINS.left, footerY - 3, PAGE_WIDTH - PDF_MARGINS.right, footerY - 3)

  // Disclaimer links
  doc.setFontSize(PDF_FONT_SIZES.tiny)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(130, 130, 130)
  doc.text('Dieses Dokument wurde automatisiert erstellt.', PDF_MARGINS.left, footerY)

  // Seitenzahl rechts
  if (pageNumber !== undefined) {
    const pageText = totalPages
      ? `Seite ${pageNumber} von ${totalPages}`
      : `Seite ${pageNumber}`
    const pageTextWidth = doc.getTextWidth(pageText)
    doc.text(pageText, PAGE_WIDTH - PDF_MARGINS.right - pageTextWidth, footerY)
  }
}

// =====================================================
// AUTOTABLE STYLE PRESETS
// =====================================================

/**
 * Standard Head-Styles für autoTable
 */
export const PDF_TABLE_HEAD_STYLES = {
  fillColor: TRANSNEXT_BLUE_ARRAY,
  textColor: 255,
  fontStyle: 'bold' as const,
  fontSize: 9,
  cellPadding: 3,
  halign: 'left' as const
}

/**
 * Standard Body-Styles für autoTable
 */
export const PDF_TABLE_BODY_STYLES = {
  fontSize: 9,
  cellPadding: 3,
  textColor: [40, 40, 40] as [number, number, number]
}

/**
 * Alternating Row Styles
 */
export const PDF_TABLE_ALTERNATING_STYLES = {
  fillColor: [250, 250, 250] as [number, number, number]
}

/**
 * Berechnet Spaltenbreiten für Beträge
 * Stellt sicher, dass 5-stellige Beträge (99.999,99 €) passen
 */
export function getAmountColumnWidth(): number {
  // "99.999,99 €" braucht ca. 28-30mm bei Schriftgröße 9
  return 32
}

/**
 * Spalten-Stil für rechtsbündige Beträge
 */
export function getAmountColumnStyle(): { halign: 'right'; cellWidth: number } {
  return {
    halign: 'right',
    cellWidth: getAmountColumnWidth()
  }
}
