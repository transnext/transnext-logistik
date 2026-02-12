import { PDFDocument } from 'pdf-lib'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { calculateCustomerTotal, wartezeitToCode, getWartezeitText, type Auftraggeber } from './customer-pricing'

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

/**
 * Exportiert Touren-Abrechnung als PDF
 */
export function exportTourenPDF(
  touren: TourForExport[],
  kw: string,
  year: number
): void {
  const doc = new jsPDF()

  // Header
  doc.setFontSize(18)
  doc.text('TransNext Logistik', 14, 15)
  doc.setFontSize(12)
  doc.text(`Nicholas Mandzel & Burak Aydin GbR`, 14, 22)
  doc.setFontSize(10)
  doc.text(`Datum: ${new Date().toLocaleDateString('de-DE')}`, 150, 15)

  // Titel
  doc.setFontSize(16)
  doc.text(`Tourenabrechnung KW ${kw}-${year}`, 14, 35)

  // Tabellen-Daten vorbereiten (mit Auftraggeber-spezifischen Preisen)
  const tableData = touren.map((tour, index) => {
    const wartezeitCode = wartezeitToCode(tour.wartezeit)
    const betrag = calculateCustomerTotal(tour.gefahrene_km, tour.wartezeit, tour.auftraggeber)

    // Bei Onlogist wird Wartezeit NICHT berechnet - zeige 0 an
    const wartezeitAnzeige = tour.auftraggeber === 'onlogist' ? '0' : wartezeitCode.toString()

    return [
      tour.tour_nr,
      new Date(tour.datum).toLocaleDateString('de-DE'),
      tour.gefahrene_km.toString(),
      wartezeitAnzeige,
      `${betrag.toFixed(2)} €`
    ]
  })

  // Gesamtsumme berechnen (mit Auftraggeber-spezifischen Preisen)
  const gesamt = touren.reduce((sum, tour) => {
    return sum + calculateCustomerTotal(tour.gefahrene_km, tour.wartezeit, tour.auftraggeber)
  }, 0)

  // Tabelle erstellen (mit automatischem Seitenumbruch)
  autoTable(doc, {
    head: [['TourNr.', 'Datum', 'KM', 'Wartezeit', 'Betrag']],
    body: tableData,
    startY: 45,
    theme: 'grid',
    headStyles: {
      fillColor: [1, 90, 164], // TransNext Blau
      textColor: 255,
      fontStyle: 'bold'
    },
    styles: {
      fontSize: 10,
      cellPadding: 3
    },
    columnStyles: {
      0: { cellWidth: 30 },
      1: { cellWidth: 30 },
      2: { cellWidth: 20, halign: 'right' },
      3: { cellWidth: 25, halign: 'center' },
      4: { cellWidth: 35, halign: 'right' }
    },
    // Wichtig: Ermöglicht mehrere Seiten
    showHead: 'everyPage',
    margin: { top: 45, bottom: 20 },
    didDrawPage: (data) => {
      // Header auf jeder Seite
      if (data.pageNumber > 1) {
        doc.setFontSize(18)
        doc.text('TransNext Logistik', 14, 15)
        doc.setFontSize(12)
        doc.text(`Nicholas Mandzel & Burak Aydin GbR`, 14, 22)
        doc.setFontSize(10)
        doc.text(`Datum: ${new Date().toLocaleDateString('de-DE')}`, 150, 15)
        doc.setFontSize(16)
        doc.text(`Tourenabrechnung KW ${kw}-${year}`, 14, 35)
      }
    }
  })

  // Gesamtsumme auf der letzten Seite
  const finalY = (doc as any).lastAutoTable.finalY || 45

  // Prüfe ob genug Platz auf der Seite ist (max 280mm)
  if (finalY > 260) {
    doc.addPage()
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text(`Gesamt: `, 120, 20)
    doc.text(`${gesamt.toFixed(2)} €`, 155, 20, { align: 'right' })

    // Disclaimer
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100, 100, 100)
    doc.text('Dieses Dokument wurde automatisiert erstellt.', 14, 35)
  } else {
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text(`Gesamt: `, 120, finalY + 10)
    doc.text(`${gesamt.toFixed(2)} €`, 155, finalY + 10, { align: 'right' })

    // Disclaimer
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100, 100, 100)
    doc.text('Dieses Dokument wurde automatisiert erstellt.', 14, finalY + 25)
  }

  // Download
  doc.save(`Tourenabrechnung_KW${kw}_${year}.pdf`)
}

/**
 * Exportiert Auslagen-Abrechnung als PDF mit Belegen
 */
export async function exportAuslagenPDF(
  auslagen: AuslageForExport[],
  kw: string,
  year: number
): Promise<void> {
  const doc = new jsPDF()

  // Header
  doc.setFontSize(18)
  doc.text('TransNext Logistik', 14, 15)
  doc.setFontSize(12)
  doc.text(`Nicholas Mandzel & Burak Aydin GbR`, 14, 22)
  doc.setFontSize(10)
  doc.text(`Datum: ${new Date().toLocaleDateString('de-DE')}`, 150, 15)

  // Titel
  doc.setFontSize(16)
  doc.text(`Auslagenabrechnung KW ${kw}-${year}`, 14, 35)

  // Tabellen-Daten vorbereiten
  const tableData = auslagen.map((auslage) => {
    return [
      `${auslage.tour_nr}/${auslage.kennzeichen}`,
      new Date(auslage.datum).toLocaleDateString('de-DE'),
      auslage.startort || '-',
      auslage.zielort || '-',
      auslage.belegart,
      `€`,
      `${auslage.kosten.toFixed(2)}`
    ]
  })

  // Gesamtsumme berechnen
  const gesamt = auslagen.reduce((sum, auslage) => sum + auslage.kosten, 0)

  // Tabelle erstellen
  autoTable(doc, {
    head: [['Tour/ Kennzeichen', 'Datum', 'von', 'nach', 'Bemerkung', '', 'Betrag']],
    body: tableData,
    startY: 45,
    theme: 'grid',
    headStyles: {
      fillColor: [1, 90, 164], // TransNext Blau
      textColor: 255,
      fontStyle: 'bold'
    },
    styles: {
      fontSize: 9,
      cellPadding: 2
    },
    columnStyles: {
      0: { cellWidth: 35 },
      1: { cellWidth: 25 },
      2: { cellWidth: 25 },
      3: { cellWidth: 25 },
      4: { cellWidth: 40 },
      5: { cellWidth: 10, halign: 'center' },
      6: { cellWidth: 25, halign: 'right' }
    }
  })

  // Gesamtsumme
  const finalY = (doc as any).lastAutoTable.finalY || 45
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text(`Summe:`, 150, finalY + 10)
  doc.text(`€`, 175, finalY + 10)
  doc.text(`${gesamt.toFixed(2)}`, 190, finalY + 10, { align: 'right' })

  // Disclaimer
  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100, 100, 100)
  doc.text('Dieses Dokument wurde automatisiert erstellt.', 14, finalY + 25)

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
        doc.text(`Betrag: ${auslage.kosten.toFixed(2)} €`, 14, 29)
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
 */
export async function exportAuslagenWithBelege(
  auslagen: AuslageForExport[]
): Promise<void> {
  // 1. Erstelle Deckblatt mit jsPDF
  const deckblatt = new jsPDF()

  // Header / Deckblatt
  deckblatt.setFontSize(18)
  deckblatt.text('TransNext Logistik', 14, 15)
  deckblatt.setFontSize(12)
  deckblatt.text(`Nicholas Mandzel & Burak Aydin GbR`, 14, 22)
  deckblatt.setFontSize(10)
  deckblatt.text(`Datum: ${new Date().toLocaleDateString('de-DE')}`, 150, 15)

  // Titel
  deckblatt.setFontSize(16)
  deckblatt.text(`Auslagenabrechnung`, 14, 35)
  deckblatt.setFontSize(10)
  deckblatt.text(`${auslagen.length} Auslagen`, 14, 42)

  // Tabellen-Daten vorbereiten
  const tableData = auslagen.map((auslage) => {
    return [
      `${auslage.tour_nr}/${auslage.kennzeichen}`,
      new Date(auslage.datum).toLocaleDateString('de-DE'),
      auslage.startort || '-',
      auslage.zielort || '-',
      auslage.belegart,
      `€`,
      `${auslage.kosten.toFixed(2)}`
    ]
  })

  // Gesamtsumme berechnen
  const gesamt = auslagen.reduce((sum, auslage) => sum + auslage.kosten, 0)

  // Tabelle erstellen
  autoTable(deckblatt, {
    head: [['Tour/ Kennzeichen', 'Datum', 'von', 'nach', 'Bemerkung', '', 'Betrag']],
    body: tableData,
    startY: 50,
    theme: 'grid',
    headStyles: {
      fillColor: [1, 90, 164], // TransNext Blau
      textColor: 255,
      fontStyle: 'bold'
    },
    styles: {
      fontSize: 9,
      cellPadding: 2
    },
    columnStyles: {
      0: { cellWidth: 35 },
      1: { cellWidth: 25 },
      2: { cellWidth: 25 },
      3: { cellWidth: 25 },
      4: { cellWidth: 40 },
      5: { cellWidth: 10, halign: 'center' },
      6: { cellWidth: 25, halign: 'right' }
    }
  })

  // Gesamtsumme
  const finalY = (deckblatt as any).lastAutoTable.finalY || 50
  deckblatt.setFontSize(12)
  deckblatt.setFont('helvetica', 'bold')
  deckblatt.text(`Summe:`, 150, finalY + 10)
  deckblatt.text(`€`, 175, finalY + 10)
  deckblatt.text(`${gesamt.toFixed(2)}`, 190, finalY + 10, { align: 'right' })

  // Disclaimer
  deckblatt.setFontSize(7)
  deckblatt.setFont('helvetica', 'normal')
  deckblatt.setTextColor(100, 100, 100)
  deckblatt.text('Dieses Dokument wurde automatisiert erstellt.', 14, finalY + 25)

  // 2. Konvertiere Deckblatt zu PDF-Bytes
  const deckblattPdfBytes = deckblatt.output('arraybuffer')
  const finalPdf = await PDFDocument.load(deckblattPdfBytes)

  console.log(`Füge ${auslagen.length} Belege hinzu...`)

  // 3. Füge jeden Original-Beleg (JPG/PNG) als PDF-Seite hinzu
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

        // Lade Bild mit CORS-Modus
        const response = await fetch(auslage.beleg_url, {
          mode: 'cors',
          credentials: 'omit'
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        const imageBytes = await response.arrayBuffer()
        console.log(`Bild geladen: ${imageBytes.byteLength} bytes`)


        // Erkenne Bildformat
        const imageType = auslage.beleg_url.toLowerCase().includes('.png') ? 'png' : 'jpg'

        // Embed Image in neuem PDF
        let image
        if (imageType === 'png') {
          image = await finalPdf.embedPng(imageBytes)
        } else {
          image = await finalPdf.embedJpg(imageBytes)
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

        console.log(`✓ Beleg ${i + 1} hinzugefügt (${Math.round(scaledWidth)}x${Math.round(scaledHeight)})`)
      } catch (error) {
        console.error(`Fehler beim Laden des Belegs ${i + 1}:`, error)

        // Füge Fehlerseite hinzu
        const errorPage = finalPdf.addPage()
        errorPage.drawText(`Beleg ${i + 1} konnte nicht geladen werden.`, {
          x: 50,
          y: errorPage.getHeight() - 50,
          size: 12
        })
        errorPage.drawText(`${auslage.tour_nr}/${auslage.kennzeichen}`, {
          x: 50,
          y: errorPage.getHeight() - 70,
          size: 10
        })
        errorPage.drawText(`Fehler: ${(error as Error).message}`, {
          x: 50,
          y: errorPage.getHeight() - 90,
          size: 9
        })
      }
    } else {
      console.log(`Beleg ${i + 1}: Kein Beleg hochgeladen`)
      // Füge Info-Seite hinzu wenn kein Beleg vorhanden
      const infoPage = finalPdf.addPage()
      infoPage.drawText(`Beleg ${i + 1}: Kein Beleg hochgeladen`, {
        x: 50,
        y: infoPage.getHeight() - 50,
        size: 12
      })
      infoPage.drawText(`${auslage.tour_nr}/${auslage.kennzeichen}`, {
        x: 50,
        y: infoPage.getHeight() - 70,
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
