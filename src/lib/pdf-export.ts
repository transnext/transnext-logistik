import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { calculateCustomerTotal, wartezeitToCode, getWartezeitText } from './customer-pricing'

interface TourForExport {
  tour_nr: string
  datum: string
  gefahrene_km: number
  wartezeit: string
  fahrer_name: string
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

  // Tabellen-Daten vorbereiten
  const tableData = touren.map((tour, index) => {
    const wartezeitCode = wartezeitToCode(tour.wartezeit)
    const betrag = calculateCustomerTotal(tour.gefahrene_km, tour.wartezeit)

    return [
      tour.tour_nr,
      new Date(tour.datum).toLocaleDateString('de-DE'),
      tour.gefahrene_km.toString(),
      wartezeitCode.toString(),
      `${betrag.toFixed(2)} €`
    ]
  })

  // Gesamtsumme berechnen
  const gesamt = touren.reduce((sum, tour) => {
    return sum + calculateCustomerTotal(tour.gefahrene_km, tour.wartezeit)
  }, 0)

  // Tabelle erstellen
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
    }
  })

  // Gesamtsumme
  const finalY = (doc as any).lastAutoTable.finalY || 45
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text(`Gesamt:`, 120, finalY + 10)
  doc.text(`${gesamt.toFixed(2)} €`, 155, finalY + 10, { align: 'right' })

  // Download
  doc.save(`Tourenabrechnung_KW${kw}_${year}.pdf`)
}

/**
 * Exportiert Auslagen-Abrechnung als PDF (nur Tabelle, ohne Belege)
 */
export function exportAuslagenPDF(
  auslagen: AuslageForExport[],
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

  // Download
  doc.save(`Auslagenabrechnung_KW${kw}_${year}.pdf`)
}

/**
 * Hilfsfunktion: Berechnet KW-Nummer aus Datum
 */
export function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}
