import { jsPDF } from 'jspdf'
import type {
  TourComplete,
  TourProtocol,
  TourPhoto,
  TourDamage,
  TourSignature,
  ProtocolPhase,
  PdfExport,
} from './tour-types'
import {
  FUEL_LEVEL_LABELS,
  DAMAGE_TYPE_LABELS,
  DAMAGE_COMPONENT_LABELS,
  VEHICLE_TYPE_LABELS,
  HANDOVER_TYPE_LABELS,
  PHOTO_CATEGORIES,
} from './tour-types'
import { formatLocation } from './tour-api'
import { supabase } from './supabase'
import { createPdfExport } from './tour-api'

// =====================================================
// PDF CONFIGURATION
// =====================================================

const PDF_CONFIG = {
  margin: 20,
  pageWidth: 210,
  pageHeight: 297,
  contentWidth: 170,
  lineHeight: 6,
  headerHeight: 30,
  footerHeight: 15,
  primaryColor: '#1a365d',
  secondaryColor: '#4a5568',
  lightGray: '#e2e8f0',
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatDateShort(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

async function loadImageAsBase64(url: string): Promise<string | null> {
  try {
    const response = await fetch(url)
    const blob = await response.blob()
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.onerror = () => resolve(null)
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

// =====================================================
// PDF GENERATION
// =====================================================

export async function generateTourProtocolPdf(
  tourData: TourComplete,
  changeReason?: string
): Promise<Blob> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  })

  const { tour, protocols, photos, damages, signatures } = tourData

  // Protokolle nach Phase sortieren
  const pickupProtocol = protocols.find(p => p.phase === 'pickup')
  const dropoffProtocol = protocols.find(p => p.phase === 'dropoff')

  // Fotos nach Phase gruppieren
  const pickupPhotos = photos.filter(p => p.phase === 'pickup')
  const dropoffPhotos = photos.filter(p => p.phase === 'dropoff')

  // Schäden nach Phase gruppieren
  const pickupDamages = damages.filter(d => d.phase === 'pickup')
  const dropoffDamages = damages.filter(d => d.phase === 'dropoff')

  // Signaturen nach Phase gruppieren
  const pickupSignatures = signatures.filter(s => s.phase === 'pickup')
  const dropoffSignatures = signatures.filter(s => s.phase === 'dropoff')

  let currentY = PDF_CONFIG.margin

  // =====================================================
  // SEITE 1: DECKBLATT
  // =====================================================

  // Header
  doc.setFillColor(26, 54, 93) // Primary color
  doc.rect(0, 0, PDF_CONFIG.pageWidth, 50, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(24)
  doc.setFont('helvetica', 'bold')
  doc.text('FAHRZEUGÜBERFÜHRUNG', PDF_CONFIG.margin, 25)

  doc.setFontSize(14)
  doc.setFont('helvetica', 'normal')
  doc.text(`Protokoll Nr. ${tour.tour_no}`, PDF_CONFIG.margin, 38)

  currentY = 65

  // Fahrzeugdaten Box
  doc.setFillColor(241, 245, 249)
  doc.roundedRect(PDF_CONFIG.margin, currentY - 5, PDF_CONFIG.contentWidth, 35, 3, 3, 'F')

  doc.setTextColor(26, 54, 93)
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('FAHRZEUGDATEN', PDF_CONFIG.margin + 5, currentY + 5)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(74, 85, 104)

  const vehicleInfo = [
    ['Fahrzeugart:', VEHICLE_TYPE_LABELS[tour.vehicle_type]],
    ['Kennzeichen:', tour.license_plate],
    ['FIN:', tour.fin],
  ]

  const col1X = PDF_CONFIG.margin + 5
  const col2X = PDF_CONFIG.margin + 90

  vehicleInfo.forEach((item, index) => {
    const x = index < 2 ? col1X : col2X
    const y = currentY + 12 + (index % 2) * 8
    doc.setFont('helvetica', 'bold')
    doc.text(item[0], x, y)
    doc.setFont('helvetica', 'normal')
    doc.text(item[1], x + 25, y)
  })

  currentY += 45

  // Abholort Box
  doc.setFillColor(241, 245, 249)
  doc.roundedRect(PDF_CONFIG.margin, currentY - 5, PDF_CONFIG.contentWidth, 40, 3, 3, 'F')

  doc.setTextColor(26, 54, 93)
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('ABHOLORT', PDF_CONFIG.margin + 5, currentY + 5)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(74, 85, 104)

  const pickupAddr = tour.pickup_data
  doc.text(pickupAddr.name || '-', PDF_CONFIG.margin + 5, currentY + 14)
  doc.text(pickupAddr.street || '-', PDF_CONFIG.margin + 5, currentY + 20)
  doc.text(`${pickupAddr.zip || ''} ${pickupAddr.city || ''}`.trim() || '-', PDF_CONFIG.margin + 5, currentY + 26)
  doc.text(`Ansprechpartner: ${pickupAddr.contact_name || '-'}`, PDF_CONFIG.margin + 5, currentY + 32)

  if (tour.pickup_from) {
    doc.text(`Abholung ab: ${formatDate(tour.pickup_from)}`, PDF_CONFIG.margin + 100, currentY + 14)
  }

  currentY += 50

  // Abgabeort Box
  doc.setFillColor(241, 245, 249)
  doc.roundedRect(PDF_CONFIG.margin, currentY - 5, PDF_CONFIG.contentWidth, 40, 3, 3, 'F')

  doc.setTextColor(26, 54, 93)
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('ABGABEORT', PDF_CONFIG.margin + 5, currentY + 5)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(74, 85, 104)

  const dropoffAddr = tour.dropoff_data
  doc.text(dropoffAddr.name || '-', PDF_CONFIG.margin + 5, currentY + 14)
  doc.text(dropoffAddr.street || '-', PDF_CONFIG.margin + 5, currentY + 20)
  doc.text(`${dropoffAddr.zip || ''} ${dropoffAddr.city || ''}`.trim() || '-', PDF_CONFIG.margin + 5, currentY + 26)
  doc.text(`Ansprechpartner: ${dropoffAddr.contact_name || '-'}`, PDF_CONFIG.margin + 5, currentY + 32)

  if (tour.dropoff_until) {
    doc.text(`Abgabe bis: ${formatDate(tour.dropoff_until)}`, PDF_CONFIG.margin + 100, currentY + 14)
  }

  currentY += 50

  // Distanz
  if (tour.distance_km) {
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(26, 54, 93)
    doc.text(`Distanz: ${tour.distance_km} km`, PDF_CONFIG.margin + 5, currentY)
    currentY += 10
  }

  // Hinweise
  if (tour.notes) {
    doc.setFillColor(255, 251, 235)
    doc.roundedRect(PDF_CONFIG.margin, currentY - 5, PDF_CONFIG.contentWidth, 25, 3, 3, 'F')

    doc.setTextColor(146, 64, 14)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text('Hinweise:', PDF_CONFIG.margin + 5, currentY + 5)
    doc.setFont('helvetica', 'normal')

    const lines = doc.splitTextToSize(tour.notes, PDF_CONFIG.contentWidth - 10)
    doc.text(lines, PDF_CONFIG.margin + 5, currentY + 12)
  }

  // Footer auf Deckblatt
  doc.setFontSize(8)
  doc.setTextColor(150, 150, 150)
  doc.text(
    `Erstellt am: ${formatDate(new Date().toISOString())}`,
    PDF_CONFIG.margin,
    PDF_CONFIG.pageHeight - 10
  )
  doc.text(
    'Seite 1',
    PDF_CONFIG.pageWidth - PDF_CONFIG.margin - 10,
    PDF_CONFIG.pageHeight - 10
  )

  // =====================================================
  // SEITE 2: ÜBERNAHME-DATEN
  // =====================================================

  if (pickupProtocol) {
    doc.addPage()
    currentY = PDF_CONFIG.margin

    doc.setFillColor(26, 54, 93)
    doc.rect(0, 0, PDF_CONFIG.pageWidth, 25, 'F')

    doc.setTextColor(255, 255, 255)
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.text('ÜBERNAHME-PROTOKOLL', PDF_CONFIG.margin, 17)

    currentY = 40

    // Protokoll-Daten
    await addProtocolSection(doc, pickupProtocol, currentY, 'Übernahme', tour.vehicle_type === 'e-auto')
  }

  // =====================================================
  // SEITE 3: ABGABE-DATEN
  // =====================================================

  if (dropoffProtocol) {
    doc.addPage()
    currentY = PDF_CONFIG.margin

    doc.setFillColor(26, 54, 93)
    doc.rect(0, 0, PDF_CONFIG.pageWidth, 25, 'F')

    doc.setTextColor(255, 255, 255)
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.text('ABGABE-PROTOKOLL', PDF_CONFIG.margin, 17)

    currentY = 40

    await addProtocolSection(doc, dropoffProtocol, currentY, 'Abgabe', tour.vehicle_type === 'e-auto')
  }

  // =====================================================
  // SEITE 4: SCHÄDEN
  // =====================================================

  if (pickupDamages.length > 0 || dropoffDamages.length > 0) {
    doc.addPage()
    currentY = PDF_CONFIG.margin

    doc.setFillColor(26, 54, 93)
    doc.rect(0, 0, PDF_CONFIG.pageWidth, 25, 'F')

    doc.setTextColor(255, 255, 255)
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.text('SCHADENSDOKUMENTATION', PDF_CONFIG.margin, 17)

    currentY = 40

    // Übernahme-Schäden
    if (pickupDamages.length > 0) {
      doc.setTextColor(26, 54, 93)
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.text('Schäden bei Übernahme', PDF_CONFIG.margin, currentY)
      currentY += 10

      for (const damage of pickupDamages) {
        currentY = await addDamageEntry(doc, damage, currentY)
        if (currentY > 250) {
          doc.addPage()
          currentY = PDF_CONFIG.margin
        }
      }

      currentY += 10
    }

    // Neue Schäden bei Abgabe
    const newDropoffDamages = dropoffDamages.filter(d => !d.is_pre_existing)
    if (newDropoffDamages.length > 0) {
      doc.setTextColor(220, 38, 38)
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.text('Neue Schäden bei Abgabe', PDF_CONFIG.margin, currentY)
      currentY += 10

      for (const damage of newDropoffDamages) {
        currentY = await addDamageEntry(doc, damage, currentY)
        if (currentY > 250) {
          doc.addPage()
          currentY = PDF_CONFIG.margin
        }
      }
    }
  }

  // =====================================================
  // SEITE 5+: FOTOS
  // =====================================================

  // Übernahme-Fotos
  if (pickupPhotos.length > 0) {
    await addPhotoPages(doc, pickupPhotos, 'Übernahme-Fotos')
  }

  // Abgabe-Fotos
  if (dropoffPhotos.length > 0) {
    await addPhotoPages(doc, dropoffPhotos, 'Abgabe-Fotos')
  }

  // =====================================================
  // LETZTE SEITE: UNTERSCHRIFTEN
  // =====================================================

  doc.addPage()
  currentY = PDF_CONFIG.margin

  doc.setFillColor(26, 54, 93)
  doc.rect(0, 0, PDF_CONFIG.pageWidth, 25, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text('UNTERSCHRIFTEN', PDF_CONFIG.margin, 17)

  currentY = 40

  // Übernahme-Unterschriften
  if (pickupSignatures.length > 0) {
    doc.setTextColor(26, 54, 93)
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('Übernahme', PDF_CONFIG.margin, currentY)
    currentY += 10

    currentY = await addSignatureSection(doc, pickupSignatures, currentY)
    currentY += 20
  }

  // Abgabe-Unterschriften
  if (dropoffSignatures.length > 0) {
    doc.setTextColor(26, 54, 93)
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('Abgabe', PDF_CONFIG.margin, currentY)
    currentY += 10

    currentY = await addSignatureSection(doc, dropoffSignatures, currentY)
  }

  // PDF als Blob zurückgeben
  return doc.output('blob')
}

// =====================================================
// HELPER: Protokoll-Sektion
// =====================================================

async function addProtocolSection(
  doc: jsPDF,
  protocol: TourProtocol,
  startY: number,
  title: string,
  isEAuto: boolean
): Promise<number> {
  let y = startY

  // KM und Tank/Ladestand
  doc.setFillColor(241, 245, 249)
  doc.roundedRect(PDF_CONFIG.margin, y - 5, PDF_CONFIG.contentWidth, 25, 3, 3, 'F')

  doc.setTextColor(26, 54, 93)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('KM-Stand:', PDF_CONFIG.margin + 5, y + 5)
  doc.setFont('helvetica', 'normal')
  doc.text(`${protocol.km.toLocaleString('de-DE')} km`, PDF_CONFIG.margin + 35, y + 5)

  doc.setFont('helvetica', 'bold')
  doc.text(isEAuto ? 'Ladezustand:' : 'Tankstand:', PDF_CONFIG.margin + 80, y + 5)
  doc.setFont('helvetica', 'normal')
  doc.text(FUEL_LEVEL_LABELS[protocol.fuel_level], PDF_CONFIG.margin + 115, y + 5)

  if (protocol.completed_at) {
    doc.setFont('helvetica', 'bold')
    doc.text('Abgeschlossen:', PDF_CONFIG.margin + 5, y + 15)
    doc.setFont('helvetica', 'normal')
    doc.text(formatDate(protocol.completed_at), PDF_CONFIG.margin + 40, y + 15)
  }

  y += 30

  // Zubehör
  doc.setTextColor(26, 54, 93)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('Zubehör:', PDF_CONFIG.margin, y)
  y += 8

  const acc = protocol.accessories
  const accessories = [
    ['Schlüssel:', `${acc.key_count || 1}`],
    ['Kfz-Schein:', acc.registration_original ? 'Ja' : 'Nein'],
    ['Bordmappe:', acc.service_booklet ? 'Ja' : 'Nein'],
    ['SD-Karte Navigation:', acc.sd_card_navigation ? 'Ja' : 'Nein'],
    ['Fußmatten:', acc.floor_mats ? 'Ja' : 'Nein'],
    ['Kennzeichen:', acc.license_plates_present ? 'Ja' : 'Nein'],
    ['Radio mit Code:', acc.radio_with_code ? 'Ja' : 'Nein'],
    ['Sicherheitsausrüstung:', acc.safety_kit ? 'Ja' : 'Nein'],
    ['Antenne:', acc.antenna_present ? 'Ja' : 'Nein'],
  ]

  doc.setFontSize(9)
  doc.setTextColor(74, 85, 104)

  let col = 0
  for (let i = 0; i < accessories.length; i++) {
    const x = PDF_CONFIG.margin + (col * 55)
    doc.setFont('helvetica', 'bold')
    doc.text(accessories[i][0], x, y)
    doc.setFont('helvetica', 'normal')
    doc.text(accessories[i][1], x + 35, y)

    col++
    if (col >= 3) {
      col = 0
      y += 6
    }
  }

  y += 15

  // Übergabe-Info (nur bei Abgabe)
  if (protocol.handover_type) {
    doc.setTextColor(26, 54, 93)
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('Übergabe:', PDF_CONFIG.margin, y)
    y += 8

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(74, 85, 104)
    doc.text(HANDOVER_TYPE_LABELS[protocol.handover_type], PDF_CONFIG.margin, y)
    y += 6

    if (protocol.recipient_name) {
      doc.text(`Empfänger: ${protocol.recipient_name}`, PDF_CONFIG.margin, y)
      y += 6
    }

    if (protocol.handover_note) {
      doc.text(`Notiz: ${protocol.handover_note}`, PDF_CONFIG.margin, y)
      y += 6
    }
  }

  return y
}

// =====================================================
// HELPER: Schaden-Eintrag
// =====================================================

async function addDamageEntry(doc: jsPDF, damage: TourDamage, startY: number): Promise<number> {
  let y = startY

  doc.setFillColor(254, 242, 242)
  doc.roundedRect(PDF_CONFIG.margin, y - 3, PDF_CONFIG.contentWidth, 20, 2, 2, 'F')

  doc.setTextColor(127, 29, 29)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text(DAMAGE_COMPONENT_LABELS[damage.component] || damage.component, PDF_CONFIG.margin + 3, y + 5)

  doc.setFont('helvetica', 'normal')
  doc.text(
    `${DAMAGE_TYPE_LABELS[damage.damage_type] || damage.damage_type} | ${damage.is_interior ? 'Innen' : 'Außen'}`,
    PDF_CONFIG.margin + 80,
    y + 5
  )

  doc.setFontSize(9)
  doc.setTextColor(74, 85, 104)
  const descLines = doc.splitTextToSize(damage.description, PDF_CONFIG.contentWidth - 10)
  doc.text(descLines.slice(0, 2), PDF_CONFIG.margin + 3, y + 12)

  y += 25

  return y
}

// =====================================================
// HELPER: Foto-Seiten
// =====================================================

async function addPhotoPages(doc: jsPDF, photos: TourPhoto[], title: string): Promise<void> {
  doc.addPage()
  let y = PDF_CONFIG.margin

  doc.setFillColor(26, 54, 93)
  doc.rect(0, 0, PDF_CONFIG.pageWidth, 25, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text(title.toUpperCase(), PDF_CONFIG.margin, 17)

  y = 35

  // 2 Fotos pro Zeile, 3 Zeilen pro Seite = 6 Fotos pro Seite
  const photoWidth = 80
  const photoHeight = 60
  const gap = 10

  let col = 0
  let photoCount = 0

  for (const photo of photos) {
    if (photoCount > 0 && photoCount % 6 === 0) {
      doc.addPage()
      y = PDF_CONFIG.margin
      col = 0
    }

    const x = PDF_CONFIG.margin + col * (photoWidth + gap)

    try {
      const base64 = await loadImageAsBase64(photo.file_url)
      if (base64) {
        doc.addImage(base64, 'JPEG', x, y, photoWidth, photoHeight)
      } else {
        // Placeholder wenn Bild nicht geladen werden kann
        doc.setFillColor(240, 240, 240)
        doc.rect(x, y, photoWidth, photoHeight, 'F')
        doc.setTextColor(100, 100, 100)
        doc.setFontSize(8)
        doc.text('Bild nicht verfügbar', x + 15, y + 30)
      }
    } catch {
      doc.setFillColor(240, 240, 240)
      doc.rect(x, y, photoWidth, photoHeight, 'F')
    }

    // Kategorie-Label
    const categoryConfig = PHOTO_CATEGORIES.find(c => c.id === photo.category)
    const categoryLabel = categoryConfig?.label || photo.category

    doc.setTextColor(74, 85, 104)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.text(categoryLabel, x, y + photoHeight + 5)

    // Upload-Zeit
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.text(formatDate(photo.uploaded_at), x, y + photoHeight + 10)

    col++
    if (col >= 2) {
      col = 0
      y += photoHeight + 20
    }

    photoCount++
  }
}

// =====================================================
// HELPER: Unterschriften-Sektion
// =====================================================

async function addSignatureSection(
  doc: jsPDF,
  signatures: TourSignature[],
  startY: number
): Promise<number> {
  let y = startY
  const sigWidth = 70
  const sigHeight = 30

  for (const sig of signatures) {
    const roleLabel = sig.role === 'driver' ? 'Fahrer' : 'Empfänger'

    doc.setTextColor(74, 85, 104)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text(`${roleLabel}:`, PDF_CONFIG.margin, y)

    if (sig.name) {
      doc.setFont('helvetica', 'normal')
      doc.text(sig.name, PDF_CONFIG.margin + 25, y)
    }

    y += 5

    try {
      const base64 = await loadImageAsBase64(sig.file_url)
      if (base64) {
        doc.addImage(base64, 'PNG', PDF_CONFIG.margin, y, sigWidth, sigHeight)
      }
    } catch {
      doc.setFillColor(240, 240, 240)
      doc.rect(PDF_CONFIG.margin, y, sigWidth, sigHeight, 'F')
    }

    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.text(`Unterschrieben am: ${formatDate(sig.signed_at)}`, PDF_CONFIG.margin, y + sigHeight + 5)

    y += sigHeight + 15
  }

  return y
}

// =====================================================
// UPLOAD & SPEICHERN
// =====================================================

/**
 * Generiert PDF und speichert in Supabase Storage
 */
export async function generateAndSavePdf(
  tourData: TourComplete,
  changeReason?: string
): Promise<PdfExport> {
  // PDF generieren
  const pdfBlob = await generateTourProtocolPdf(tourData, changeReason)

  // Dateiname und Pfad
  const timestamp = Date.now()
  const fileName = `protokoll_${tourData.tour.tour_no}_v${timestamp}.pdf`
  const filePath = `tours/${tourData.tour.id}/pdf/${fileName}`

  // Upload zu Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from('belege')
    .upload(filePath, pdfBlob, {
      contentType: 'application/pdf',
      upsert: true,
    })

  if (uploadError) throw uploadError

  // Public URL holen
  const { data: urlData } = supabase.storage
    .from('belege')
    .getPublicUrl(filePath)

  // PDF-Export in DB speichern
  const pdfExport = await createPdfExport(
    tourData.tour.id,
    urlData.publicUrl,
    filePath,
    pdfBlob.size,
    changeReason
  )

  return pdfExport
}
