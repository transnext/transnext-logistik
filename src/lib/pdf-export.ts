import { PDFDocument } from 'pdf-lib'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { calculateCustomerTotal, wartezeitToCode, getWartezeitText, type Auftraggeber } from './customer-pricing'
import { convertHeicBufferToJpeg } from './heic-converter'
import {
  formatPdfCurrency,
  formatPdfDate,
  drawPdfHeader,
  drawPdfTitle,
  drawPdfInfoLine,
  drawPdfSummaryBox,
  drawPdfFooter,
  PDF_MARGINS,
  PAGE_WIDTH,
  TRANSNEXT_BLUE_ARRAY,
  PDF_TABLE_HEAD_STYLES,
  PDF_TABLE_BODY_STYLES,
  getAmountColumnWidth,
  TRANSNEXT_BLUE,
  DARK_GRAY
} from './pdf-helpers'

interface TourForExport {
  tour_nr: string
  datum: string
  gefahrene_km: number
  wartezeit: string
  fahrer_name: string
  auftraggeber?: Auftraggeber
}

interface AuslageForExport {
  tour_nr: string
  kennzeichen: string
  datum: string
  startort: string
  zielort: string
  belegart: string
  kosten: number
  beleg_url?: string
}

// =====================================================
// FILE TYPE DETECTION
// =====================================================

type DetectedFileType = 'jpeg' | 'png' | 'pdf' | 'webp' | 'heic' | 'unknown'

interface FileTypeResult {
  type: DetectedFileType
  mimeType: string | null
  isSupported: boolean
  errorMessage?: string
}

/**
 * Erkennt den Dateityp anhand von Magic Bytes
 * JPEG: FF D8 FF
 * PNG: 89 50 4E 47 0D 0A 1A 0A
 * PDF: 25 50 44 46 (%PDF)
 * WebP: 52 49 46 46 ... 57 45 42 50 (RIFF...WEBP)
 * HEIC: ... 66 74 79 70 68 65 69 63 (...ftypheic) oder ...ftypmif1
 */
function detectFromMagicBytes(bytes: Uint8Array): DetectedFileType | null {
  if (bytes.length < 12) return null

  // JPEG: FF D8 FF
  if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) {
    return 'jpeg'
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4E &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0D &&
    bytes[5] === 0x0A &&
    bytes[6] === 0x1A &&
    bytes[7] === 0x0A
  ) {
    return 'png'
  }

  // PDF: %PDF (25 50 44 46)
  if (
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46
  ) {
    return 'pdf'
  }

  // WebP: RIFF....WEBP
  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return 'webp'
  }

  // HEIC: ftyp an Position 4-7, dann heic/mif1/msf1/hevc
  // Typisch: ....ftypheic, ....ftypmif1, ....ftypmsf1
  if (
    bytes[4] === 0x66 && // f
    bytes[5] === 0x74 && // t
    bytes[6] === 0x79 && // y
    bytes[7] === 0x70    // p
  ) {
    // Prüfe auf HEIC-Varianten
    const brand = String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11])
    if (['heic', 'heix', 'mif1', 'msf1', 'hevc'].includes(brand)) {
      return 'heic'
    }
  }

  return null
}

/**
 * Erkennt den Dateityp anhand der Dateiendung im URL
 */
function detectFromUrl(url: string): DetectedFileType | null {
  const lowerUrl = url.toLowerCase()

  // Entferne Query-Parameter für bessere Erkennung
  const pathPart = lowerUrl.split('?')[0]

  if (pathPart.endsWith('.jpg') || pathPart.endsWith('.jpeg')) return 'jpeg'
  if (pathPart.endsWith('.png')) return 'png'
  if (pathPart.endsWith('.pdf')) return 'pdf'
  if (pathPart.endsWith('.webp')) return 'webp'
  if (pathPart.endsWith('.heic') || pathPart.endsWith('.heif')) return 'heic'

  // Check für .jpg/.jpeg/.png/.pdf irgendwo im URL (für Signed URLs etc.)
  if (lowerUrl.includes('.jpg') || lowerUrl.includes('.jpeg')) return 'jpeg'
  if (lowerUrl.includes('.png')) return 'png'
  if (lowerUrl.includes('.pdf')) return 'pdf'

  return null
}

/**
 * Erkennt den Dateityp anhand des MIME-Types aus dem Response Header
 */
function detectFromMimeType(mimeType: string | null): DetectedFileType | null {
  if (!mimeType) return null

  const lower = mimeType.toLowerCase()

  if (lower === 'image/jpeg' || lower === 'image/jpg') return 'jpeg'
  if (lower === 'image/png') return 'png'
  if (lower === 'application/pdf') return 'pdf'
  if (lower === 'image/webp') return 'webp'
  if (lower === 'image/heic' || lower === 'image/heif') return 'heic'

  return null
}

/**
 * Robuste Dateityp-Erkennung mit mehreren Methoden
 * Priorität: Magic Bytes > MIME-Type > URL-Endung
 */
async function detectFileType(
  bytes: ArrayBuffer,
  mimeType: string | null,
  url: string
): Promise<FileTypeResult> {
  const uint8 = new Uint8Array(bytes)

  // 1. Priorität: Magic Bytes (zuverlässigste Methode)
  const fromBytes = detectFromMagicBytes(uint8)
  if (fromBytes) {
    const isSupported = fromBytes === 'jpeg' || fromBytes === 'png' || fromBytes === 'pdf'
    return {
      type: fromBytes,
      mimeType,
      isSupported,
      errorMessage: !isSupported ? getUnsupportedMessage(fromBytes) : undefined
    }
  }

  // 2. Priorität: MIME-Type aus Response
  const fromMime = detectFromMimeType(mimeType)
  if (fromMime) {
    const isSupported = fromMime === 'jpeg' || fromMime === 'png' || fromMime === 'pdf'
    return {
      type: fromMime,
      mimeType,
      isSupported,
      errorMessage: !isSupported ? getUnsupportedMessage(fromMime) : undefined
    }
  }

  // 3. Priorität: URL-Endung
  const fromUrl = detectFromUrl(url)
  if (fromUrl) {
    const isSupported = fromUrl === 'jpeg' || fromUrl === 'png' || fromUrl === 'pdf'
    return {
      type: fromUrl,
      mimeType,
      isSupported,
      errorMessage: !isSupported ? getUnsupportedMessage(fromUrl) : undefined
    }
  }

  // Unbekannter Dateityp
  return {
    type: 'unknown',
    mimeType,
    isSupported: false,
    errorMessage: 'Unbekannter Dateityp. Nur JPEG, PNG und PDF werden unterstützt.'
  }
}

/**
 * Gibt eine verständliche Fehlermeldung für nicht unterstützte Dateitypen
 */
function getUnsupportedMessage(type: DetectedFileType): string {
  switch (type) {
    case 'heic':
      return 'HEIC/HEIF-Format wird nicht unterstützt. Bitte als JPEG oder PNG hochladen.'
    case 'webp':
      return 'WebP-Format wird nicht unterstützt. Bitte als JPEG oder PNG hochladen.'
    default:
      return `Dateityp "${type}" wird nicht unterstützt. Nur JPEG, PNG und PDF sind erlaubt.`
  }
}

/**
 * Exportiert Touren-Abrechnung als PDF
 *
 * Redesigned Layout:
 * - Professioneller Header mit TransNext-Blau Akzent
 * - Klare Dokumenthierarchie
 * - Deutsches Währungsformat (1.234,56 €)
 * - Rechtsbündige Beträge mit ausreichend Platz
 * - Summary-Box für Gesamtbetrag
 */
export function exportTourenPDF(
  touren: TourForExport[],
  kw: string,
  year: number
): void {
  const doc = new jsPDF()
  let currentPage = 1

  // Gesamtsumme vorab berechnen
  const gesamt = touren.reduce((sum, tour) => {
    return sum + calculateCustomerTotal(tour.gefahrene_km, tour.wartezeit, tour.auftraggeber)
  }, 0)

  // === ERSTE SEITE: Header und Titel ===
  let yPos = drawPdfHeader(doc)
  yPos = drawPdfTitle(doc, 'Tourenabrechnung', `KW ${kw} / ${year}`, yPos)

  // Info-Zeile
  yPos = drawPdfInfoLine(doc, [
    { label: 'Touren', value: touren.length },
    { label: 'Summe', value: formatPdfCurrency(gesamt) }
  ], yPos)

  yPos += 4

  // Tabellen-Daten vorbereiten (mit deutschem Währungsformat)
  const tableData = touren.map((tour) => {
    const wartezeitCode = wartezeitToCode(tour.wartezeit)
    const betrag = calculateCustomerTotal(tour.gefahrene_km, tour.wartezeit, tour.auftraggeber)
    const wartezeitAnzeige = tour.auftraggeber === 'onlogist' ? '0' : wartezeitCode.toString()

    return [
      tour.tour_nr,
      formatPdfDate(tour.datum),
      tour.gefahrene_km.toString(),
      wartezeitAnzeige,
      formatPdfCurrency(betrag)
    ]
  })

  // Tabelle erstellen mit modernem Design
  autoTable(doc, {
    head: [['Tour-Nr.', 'Datum', 'KM', 'Wartezeit', 'Betrag']],
    body: tableData,
    startY: yPos,
    theme: 'striped',
    headStyles: {
      fillColor: TRANSNEXT_BLUE_ARRAY,
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 9,
      cellPadding: 4
    },
    bodyStyles: {
      fontSize: 9,
      cellPadding: 3,
      textColor: [40, 40, 40]
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    },
    columnStyles: {
      0: { cellWidth: 35 },
      1: { cellWidth: 28 },
      2: { cellWidth: 20, halign: 'right' },
      3: { cellWidth: 25, halign: 'center' },
      4: { cellWidth: getAmountColumnWidth(), halign: 'right' }
    },
    showHead: 'everyPage',
    margin: { top: 50, bottom: 30, left: PDF_MARGINS.left, right: PDF_MARGINS.right },
    didDrawPage: (data) => {
      currentPage = data.pageNumber
      // Header auf Folgeseiten
      if (data.pageNumber > 1) {
        drawPdfHeader(doc)
        doc.setFontSize(10)
        doc.setTextColor(DARK_GRAY.r, DARK_GRAY.g, DARK_GRAY.b)
        doc.text(`Tourenabrechnung KW ${kw} / ${year} (Fortsetzung)`, PDF_MARGINS.left, 45)
      }
    }
  })

  // Gesamtsumme auf der letzten Seite
  const finalY = (doc as any).lastAutoTable.finalY || yPos

  // Prüfe ob genug Platz für Summary-Box (mind. 30mm)
  if (finalY > 250) {
    doc.addPage()
    currentPage++
    drawPdfHeader(doc)
    drawPdfSummaryBox(doc, 'Gesamtbetrag', gesamt, 50)
    drawPdfFooter(doc, currentPage)
  } else {
    drawPdfSummaryBox(doc, 'Gesamtbetrag', gesamt, finalY + 8)
    drawPdfFooter(doc, currentPage)
  }

  // Footer auf allen vorherigen Seiten (wenn mehrere Seiten)
  if (currentPage > 1) {
    for (let i = 1; i < currentPage; i++) {
      doc.setPage(i)
      drawPdfFooter(doc, i, currentPage)
    }
    doc.setPage(currentPage)
    drawPdfFooter(doc, currentPage, currentPage)
  }

  // Download
  doc.save(`Tourenabrechnung_KW${kw}_${year}.pdf`)
}

/**
 * Exportiert Auslagen-Abrechnung als PDF mit Belegen
 *
 * Redesigned Layout:
 * - Professioneller Header mit TransNext-Blau Akzent
 * - Deutsches Währungsformat (1.234,56 €)
 * - Einzelne Betragsspalte (kein separates €-Zeichen)
 * - Rechtsbündige Beträge mit ausreichend Platz
 */
export async function exportAuslagenPDF(
  auslagen: AuslageForExport[],
  kw: string,
  year: number
): Promise<void> {
  const doc = new jsPDF()

  // Gesamtsumme vorab berechnen
  const gesamt = auslagen.reduce((sum, auslage) => sum + auslage.kosten, 0)

  // === Header und Titel ===
  let yPos = drawPdfHeader(doc)
  yPos = drawPdfTitle(doc, 'Auslagenabrechnung', `KW ${kw} / ${year}`, yPos)

  // Info-Zeile
  yPos = drawPdfInfoLine(doc, [
    { label: 'Auslagen', value: auslagen.length },
    { label: 'Summe', value: formatPdfCurrency(gesamt) }
  ], yPos)

  yPos += 4

  // Tabellen-Daten vorbereiten (Betrag als ein Feld mit deutschem Format)
  const tableData = auslagen.map((auslage) => {
    // Bemerkung kürzen wenn zu lang
    const bemerkung = auslage.belegart.length > 20
      ? auslage.belegart.substring(0, 18) + '...'
      : auslage.belegart

    return [
      `${auslage.tour_nr} / ${auslage.kennzeichen}`,
      formatPdfDate(auslage.datum),
      auslage.startort || '-',
      auslage.zielort || '-',
      bemerkung,
      formatPdfCurrency(auslage.kosten)
    ]
  })

  // Tabelle erstellen mit modernem Design (6 Spalten statt 7)
  autoTable(doc, {
    head: [['Tour / Kennzeichen', 'Datum', 'von', 'nach', 'Bemerkung', 'Betrag']],
    body: tableData,
    startY: yPos,
    theme: 'striped',
    headStyles: {
      fillColor: TRANSNEXT_BLUE_ARRAY,
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 9,
      cellPadding: 4
    },
    bodyStyles: {
      fontSize: 9,
      cellPadding: 3,
      textColor: [40, 40, 40]
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    },
    columnStyles: {
      0: { cellWidth: 38 },
      1: { cellWidth: 24 },
      2: { cellWidth: 28 },
      3: { cellWidth: 28 },
      4: { cellWidth: 30 },
      5: { cellWidth: getAmountColumnWidth(), halign: 'right' }
    },
    margin: { left: PDF_MARGINS.left, right: PDF_MARGINS.right }
  })

  // Gesamtsumme
  const finalY = (doc as any).lastAutoTable.finalY || yPos
  drawPdfSummaryBox(doc, 'Gesamtbetrag', gesamt, finalY + 8)
  drawPdfFooter(doc, 1)

  // Belege anhängen
  for (let i = 0; i < auslagen.length; i++) {
    const auslage = auslagen[i]
    if (auslage.beleg_url) {
      try {
        // Neue Seite für Beleg
        doc.addPage()

        // Beleg-Header
        doc.setFontSize(12)
        doc.setFont('helvetica', 'bold')
        doc.text(`Beleg ${i + 1}: ${auslage.tour_nr}/${auslage.kennzeichen}`, 14, 15)
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(10)
        doc.text(`Datum: ${new Date(auslage.datum).toLocaleDateString('de-DE')}`, 14, 22)
        doc.text(`Betrag: ${formatPdfCurrency(auslage.kosten)}`, 14, 29)
        doc.text(`Bemerkung: ${auslage.belegart}`, 14, 36)

        // Beleg laden und als Bild einfügen
        const img = await loadImage(auslage.beleg_url)
        if (img) {
          const imgWidth = 180
          const imgHeight = (img.height * imgWidth) / img.width
          const maxHeight = 240

          if (imgHeight > maxHeight) {
            const scaledWidth = (img.width * maxHeight) / img.height
            doc.addImage(img.src, 'JPEG', 15, 45, scaledWidth, maxHeight)
          } else {
            doc.addImage(img.src, 'JPEG', 15, 45, imgWidth, imgHeight)
          }
        }
      } catch (error) {
        console.error(`Fehler beim Laden des Belegs ${i + 1}:`, error)
        // Fehlermeldung auf der Seite anzeigen
        doc.setFontSize(10)
        doc.text(`Beleg konnte nicht geladen werden.`, 14, 50)
      }
    }
  }

  // Download
  doc.save(`Auslagenabrechnung_KW${kw}_${year}.pdf`)
}

/**
 * Exportiert ausgewählte Auslagen als PDF mit Belegen (ohne KW-Zuordnung)
 * Mit robuster Dateitypenerkennung und PDF-Beleg-Unterstützung
 *
 * Redesigned Layout:
 * - Professioneller Header mit TransNext-Blau Akzent
 * - Deutsches Währungsformat (1.234,56 €)
 * - Einzelne Betragsspalte (kein separates €-Zeichen)
 */
export async function exportAuslagenWithBelege(
  auslagen: AuslageForExport[]
): Promise<void> {
  // 1. Erstelle Deckblatt mit jsPDF
  const deckblatt = new jsPDF()

  // Gesamtsumme vorab berechnen
  const gesamt = auslagen.reduce((sum, auslage) => sum + auslage.kosten, 0)

  // === Header und Titel ===
  let yPos = drawPdfHeader(deckblatt)
  yPos = drawPdfTitle(deckblatt, 'Auslagenabrechnung', undefined, yPos)

  // Info-Zeile
  yPos = drawPdfInfoLine(deckblatt, [
    { label: 'Auslagen', value: auslagen.length },
    { label: 'Summe', value: formatPdfCurrency(gesamt) }
  ], yPos)

  yPos += 4

  // Tabellen-Daten vorbereiten (Betrag als ein Feld mit deutschem Format)
  const tableData = auslagen.map((auslage) => {
    const bemerkung = auslage.belegart.length > 20
      ? auslage.belegart.substring(0, 18) + '...'
      : auslage.belegart

    return [
      `${auslage.tour_nr} / ${auslage.kennzeichen}`,
      formatPdfDate(auslage.datum),
      auslage.startort || '-',
      auslage.zielort || '-',
      bemerkung,
      formatPdfCurrency(auslage.kosten)
    ]
  })

  // Tabelle erstellen mit modernem Design (6 Spalten statt 7)
  autoTable(deckblatt, {
    head: [['Tour / Kennzeichen', 'Datum', 'von', 'nach', 'Bemerkung', 'Betrag']],
    body: tableData,
    startY: yPos,
    theme: 'striped',
    headStyles: {
      fillColor: TRANSNEXT_BLUE_ARRAY,
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 9,
      cellPadding: 4
    },
    bodyStyles: {
      fontSize: 9,
      cellPadding: 3,
      textColor: [40, 40, 40]
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    },
    columnStyles: {
      0: { cellWidth: 38 },
      1: { cellWidth: 24 },
      2: { cellWidth: 28 },
      3: { cellWidth: 28 },
      4: { cellWidth: 30 },
      5: { cellWidth: getAmountColumnWidth(), halign: 'right' }
    },
    margin: { left: PDF_MARGINS.left, right: PDF_MARGINS.right }
  })

  // Gesamtsumme
  const finalY = (deckblatt as any).lastAutoTable.finalY || yPos
  drawPdfSummaryBox(deckblatt, 'Gesamtbetrag', gesamt, finalY + 8)
  drawPdfFooter(deckblatt, 1)

  // 2. Konvertiere Deckblatt zu PDF-Bytes
  const deckblattPdfBytes = deckblatt.output('arraybuffer')
  const finalPdf = await PDFDocument.load(deckblattPdfBytes)

  console.log(`Füge ${auslagen.length} Belege hinzu...`)

  // 3. Füge jeden Original-Beleg als PDF-Seite hinzu
  for (let i = 0; i < auslagen.length; i++) {
    const auslage = auslagen[i]
    console.log(`Verarbeite Auslage ${i + 1}:`, {
      tour_nr: auslage.tour_nr,
      beleg_url: auslage.beleg_url,
      has_url: !!auslage.beleg_url
    })

    if (auslage.beleg_url) {
      try {
        console.log(`Lade Beleg ${i + 1}/${auslagen.length}:`, auslage.beleg_url)

        // Lade Datei mit CORS-Modus
        const response = await fetch(auslage.beleg_url, {
          mode: 'cors',
          credentials: 'omit'
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        const contentType = response.headers.get('content-type')
        const fileBytes = await response.arrayBuffer()
        console.log(`Datei geladen: ${fileBytes.byteLength} bytes, Content-Type: ${contentType}`)

        // Robuste Dateityp-Erkennung
        const fileTypeResult = await detectFileType(fileBytes, contentType, auslage.beleg_url)
        console.log(`Erkannter Dateityp: ${fileTypeResult.type}, unterstützt: ${fileTypeResult.isSupported}`)

        // HEIC-Konvertierung für bestehende HEIC-Belege
        let processedBytes = fileBytes
        let processedType = fileTypeResult.type

        if (fileTypeResult.type === 'heic') {
          console.log(`[pdf-export] HEIC-Beleg erkannt, versuche Konvertierung...`)
          try {
            const jpegBytes = await convertHeicBufferToJpeg(fileBytes, auslage.beleg_url)
            processedBytes = jpegBytes
            processedType = 'jpeg'
            console.log(`[pdf-export] ✓ HEIC zu JPEG konvertiert`)
          } catch (heicError) {
            console.error(`[pdf-export] HEIC-Konvertierung fehlgeschlagen:`, heicError)
            // Fehlerseite für nicht konvertierbare HEIC-Datei
            const errorPage = finalPdf.addPage()
            const { height } = errorPage.getSize()

            errorPage.drawText(`Beleg ${i + 1}: ${auslage.tour_nr}/${auslage.kennzeichen}`, {
              x: 50,
              y: height - 50,
              size: 14
            })
            errorPage.drawText(`Datum: ${new Date(auslage.datum).toLocaleDateString('de-DE')}`, {
              x: 50,
              y: height - 70,
              size: 10
            })
            errorPage.drawText(`Betrag: ${auslage.kosten.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`, {
              x: 50,
              y: height - 85,
              size: 10
            })
            errorPage.drawText(`Dateityp: HEIC (iPhone-Foto)`, {
              x: 50,
              y: height - 110,
              size: 10
            })
            errorPage.drawText(`HEIC konnte nicht konvertiert werden.`, {
              x: 50,
              y: height - 130,
              size: 10
            })
            errorPage.drawText(`Bitte als JPEG oder PNG neu hochladen.`, {
              x: 50,
              y: height - 150,
              size: 10
            })

            console.log(`⚠ Beleg ${i + 1}: HEIC-Konvertierung fehlgeschlagen`)
            continue
          }
        } else if (!fileTypeResult.isSupported) {
          // Andere nicht unterstützte Dateitypen - Fehlerseite hinzufügen
          const errorPage = finalPdf.addPage()
          const { height } = errorPage.getSize()

          errorPage.drawText(`Beleg ${i + 1}: ${auslage.tour_nr}/${auslage.kennzeichen}`, {
            x: 50,
            y: height - 50,
            size: 14
          })
          errorPage.drawText(`Datum: ${new Date(auslage.datum).toLocaleDateString('de-DE')}`, {
            x: 50,
            y: height - 70,
            size: 10
          })
          errorPage.drawText(`Betrag: ${auslage.kosten.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`, {
            x: 50,
            y: height - 85,
            size: 10
          })
          errorPage.drawText(`Dateityp: ${fileTypeResult.type.toUpperCase()}`, {
            x: 50,
            y: height - 110,
            size: 10
          })
          errorPage.drawText(fileTypeResult.errorMessage || 'Dateityp nicht unterstützt', {
            x: 50,
            y: height - 130,
            size: 10
          })
          errorPage.drawText(`Original-URL: ${auslage.beleg_url.substring(0, 80)}${auslage.beleg_url.length > 80 ? '...' : ''}`, {
            x: 50,
            y: height - 160,
            size: 8
          })

          console.log(`⚠ Beleg ${i + 1}: ${fileTypeResult.errorMessage}`)
          continue
        }

        // Verarbeite nach Dateityp
        if (processedType === 'pdf') {
          // PDF-Beleg: Seiten kopieren
          try {
            const belegPdf = await PDFDocument.load(processedBytes)
            const pageCount = belegPdf.getPageCount()
            console.log(`PDF-Beleg mit ${pageCount} Seite(n)`)

            // Alle Seiten des PDF-Belegs kopieren
            const copiedPages = await finalPdf.copyPages(belegPdf, belegPdf.getPageIndices())
            for (const page of copiedPages) {
              finalPdf.addPage(page)
            }

            console.log(`✓ PDF-Beleg ${i + 1} hinzugefügt (${pageCount} Seite(n))`)
          } catch (pdfError) {
            console.error(`Fehler beim Verarbeiten des PDF-Belegs:`, pdfError)
            // Fehlerseite für defektes PDF
            const errorPage = finalPdf.addPage()
            const { height } = errorPage.getSize()
            errorPage.drawText(`Beleg ${i + 1}: PDF konnte nicht verarbeitet werden`, {
              x: 50,
              y: height - 50,
              size: 12
            })
            errorPage.drawText(`${auslage.tour_nr}/${auslage.kennzeichen}`, {
              x: 50,
              y: height - 70,
              size: 10
            })
            errorPage.drawText(`Fehler: ${(pdfError as Error).message}`, {
              x: 50,
              y: height - 90,
              size: 9
            })
          }
        } else {
          // Bild-Beleg (JPEG, PNG, oder konvertiertes HEIC)
          let image
          if (processedType === 'png') {
            image = await finalPdf.embedPng(processedBytes)
          } else {
            // JPEG (inkl. konvertiertes HEIC)
            image = await finalPdf.embedJpg(processedBytes)
          }

          // Hole Bild-Dimensionen
          const imgWidth = image.width
          const imgHeight = image.height

          // A4-Größe in Punkten (595 x 842)
          const pageWidth = 595
          const pageHeight = 842

          // Skaliere Bild, um auf A4-Seite zu passen (mit Rand)
          const margin = 40
          const maxWidth = pageWidth - (2 * margin)
          const maxHeight = pageHeight - (2 * margin)

          let scale = 1
          if (imgWidth > maxWidth || imgHeight > maxHeight) {
            const scaleWidth = maxWidth / imgWidth
            const scaleHeight = maxHeight / imgHeight
            scale = Math.min(scaleWidth, scaleHeight)
          }

          const scaledWidth = imgWidth * scale
          const scaledHeight = imgHeight * scale

          // Erstelle neue Seite (A4)
          const page = finalPdf.addPage([pageWidth, pageHeight])

          // Zentriere Bild auf Seite
          const x = (pageWidth - scaledWidth) / 2
          const y = (pageHeight - scaledHeight) / 2

          // Zeichne Bild auf Seite
          page.drawImage(image, {
            x: x,
            y: y,
            width: scaledWidth,
            height: scaledHeight
          })

          console.log(`✓ Bild-Beleg ${i + 1} hinzugefügt (${processedType.toUpperCase()}${fileTypeResult.type === 'heic' ? ' (aus HEIC konvertiert)' : ''}, ${Math.round(scaledWidth)}x${Math.round(scaledHeight)})`)
        }
      } catch (error) {
        console.error(`Fehler beim Laden des Belegs ${i + 1}:`, error)

        // Füge Fehlerseite hinzu - Export bricht NICHT ab
        const errorPage = finalPdf.addPage()
        const { height } = errorPage.getSize()

        errorPage.drawText(`Beleg ${i + 1} konnte nicht geladen werden.`, {
          x: 50,
          y: height - 50,
          size: 12
        })
        errorPage.drawText(`${auslage.tour_nr}/${auslage.kennzeichen}`, {
          x: 50,
          y: height - 70,
          size: 10
        })
        errorPage.drawText(`Datum: ${new Date(auslage.datum).toLocaleDateString('de-DE')}`, {
          x: 50,
          y: height - 85,
          size: 10
        })
        errorPage.drawText(`Betrag: ${auslage.kosten.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`, {
          x: 50,
          y: height - 100,
          size: 10
        })
        errorPage.drawText(`Fehler: ${(error as Error).message}`, {
          x: 50,
          y: height - 125,
          size: 9
        })
      }
    } else {
      console.log(`Beleg ${i + 1}: Kein Beleg hochgeladen`)
      // Füge Info-Seite hinzu wenn kein Beleg vorhanden
      const infoPage = finalPdf.addPage()
      const { height } = infoPage.getSize()

      infoPage.drawText(`Beleg ${i + 1}: Kein Beleg hochgeladen`, {
        x: 50,
        y: height - 50,
        size: 12
      })
      infoPage.drawText(`${auslage.tour_nr}/${auslage.kennzeichen}`, {
        x: 50,
        y: height - 70,
        size: 10
      })
      infoPage.drawText(`Datum: ${new Date(auslage.datum).toLocaleDateString('de-DE')}`, {
        x: 50,
        y: height - 85,
        size: 10
      })
      infoPage.drawText(`Betrag: ${auslage.kosten.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`, {
        x: 50,
        y: height - 100,
        size: 10
      })
    }
  }

  // 4. Speichere finales PDF
  const pdfBytes = await finalPdf.save()
  const blob = new Blob([pdfBytes], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  const datum = new Date().toLocaleDateString('de-DE').replace(/\./g, '-')
  link.download = `Auslagenabrechnung_${datum}.pdf`
  link.click()

  URL.revokeObjectURL(url)

  console.log(`✓ PDF erfolgreich erstellt mit ${auslagen.length} Auslagen und Belegen`)
}

/**
 * Helper: Lädt ein Bild von einer URL
 */
function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = url
  })
}
