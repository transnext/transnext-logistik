/**
 * Driver Compliance Calculator
 *
 * Berechnet detaillierte Compliance-KPIs pro Fahrer:
 * - Upload-Pünktlichkeit mit Einzelliste verspäteter Uploads
 * - Verfügbarkeit vs. Einsatz mit Einzelliste der Tage ohne Tour
 * - 7-Tage-Automatik für "Verfügbar, aber keine Tour"
 *
 * KEINE Daten werden geschrieben, nur berechnet.
 * Verspätete Uploads bleiben historisch sichtbar.
 */

// ============================================================
// TYPES
// ============================================================

export type AvailabilityReviewStatus =
  | 'unreviewed'                      // Noch nicht geprüft
  | 'marked_available_no_tour'         // Manuell markiert: Verfügbar, aber keine Tour
  | 'auto_available_no_tour_after_7_days' // Automatisch nach 7 Tagen markiert
  | 'tour_uploaded_later'              // Tour nachträglich hochgeladen

export interface DelayedUploadItem {
  /** Arbeitsnachweis ID */
  arbeitsnachweis_id: number
  /** Tour-Nummer */
  tour_nr: string
  /** Tour-Datum (YYYY-MM-DD) */
  tour_date: string
  /** Upload-Zeitpunkt (ISO) */
  uploaded_at: string
  /** Deadline = Tour-Datum 23:59 Europe/Berlin */
  upload_deadline: string
  /** Verspätung in vollen Tagen */
  delay_days: number
  /** Verspätung in Stunden */
  delay_hours: number
  /** Status des Arbeitsnachweises */
  status: string
  /** Kunde/Auftraggeber */
  customer: string | null
  /** Link zur Bearbeitung */
  action_href: string
}

export interface DetailedUploadCompliance {
  /** User-ID des Fahrers */
  user_id: string
  /** Fahrer-ID (aus fahrer-Tabelle) */
  fahrer_id: string | null
  /** Fahrer-Name */
  fahrer_name: string
  /** Gesamtanzahl Uploads */
  totalUploads: number
  /** Pünktliche Uploads */
  punctualUploads: number
  /** Verspätete Uploads */
  delayedUploads: number
  /** Pünktlichkeitsquote (0-100) */
  punctualityRate: number
  /** Durchschnittliche Verspätung in Stunden */
  averageDelayHours: number
  /** Maximale Verspätung in Stunden */
  maxDelayHours: number
  /** Liste aller verspäteten Uploads */
  delayedUploadItems: DelayedUploadItem[]
}

export interface AvailabilityWithoutTourItem {
  /** Datum (YYYY-MM-DD) */
  date: string
  /** Verfügbarkeits-ID (aus driver_availability) */
  availability_id: string | null
  /** Verfügbar von (HH:MM oder null) */
  available_from: string | null
  /** Verfügbar bis (HH:MM oder null) */
  available_until: string | null
  /** Bevorzugte Touren */
  preferred_tours: string | null
  /** Notiz aus Verfügbarkeit */
  availability_note: string | null
  /** Hatte der Tag eine Tour? */
  hasTour: boolean
  /** Review-Status */
  review_status: AvailabilityReviewStatus
  /** Wer hat markiert (user_id) */
  marked_by: string | null
  /** Wann markiert (ISO) */
  marked_at: string | null
  /** Notiz zur Markierung */
  review_note: string | null
  /** Automatisch markiert? */
  auto_marked: boolean
  /** Tage seit Verfügbarkeit */
  days_since_availability: number
}

export interface DetailedAvailabilityCompliance {
  /** User-ID des Fahrers */
  user_id: string | null
  /** Fahrer-ID (aus fahrer-Tabelle) */
  fahrer_id: string
  /** Fahrer-Name */
  fahrer_name: string
  /** Verfügbare Tage gesamt */
  availableDays: number
  /** Verfügbare Tage mit Tour */
  availableDaysWithTour: number
  /** Verfügbare Tage ohne Tour */
  availableDaysWithoutTour: number
  /** Einsatzquote (0-100) */
  deploymentRate: number
  /** Liste aller verfügbaren Tage ohne Tour */
  availabilityWithoutTourItems: AvailabilityWithoutTourItem[]
}

// Input-Typen
export interface ComplianceArbeitsnachweis {
  id: number
  tour_nr?: string | null
  datum: string
  status: string
  created_at?: string | null
  user_id?: string | null
  auftraggeber?: string | null
  customer_id?: string | null
}

export interface ComplianceFahrer {
  id: number | string
  vorname: string
  nachname: string
  status: 'aktiv' | 'inaktiv'
  user_id?: string | null
}

export interface ComplianceDriverAvailability {
  id: string
  fahrer_id: string
  user_id?: string | null
  date: string
  is_available: boolean
  available_from?: string | null
  available_until?: string | null
  preferred_tour_type?: string | null
  note?: string | null
  availability_status?: string | null
}

export interface AvailabilityAlertReview {
  id: string
  fahrer_id: string
  user_id?: string | null
  date: string
  status: string
  note?: string | null
  marked_by: string
  marked_at: string
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Berechnet die Deadline für einen Tour-Upload
 * = Ende des Tour-Datums (23:59:59 Europe/Berlin)
 */
function calculateUploadDeadline(tourDate: string): Date {
  // Erstelle Datum im Format YYYY-MM-DD
  const deadline = new Date(tourDate)
  // Setze auf Ende des Tages (23:59:59.999)
  // Wir verwenden lokale Zeit, da der Server in der Regel Europe/Berlin ist
  deadline.setHours(23, 59, 59, 999)
  return deadline
}

/**
 * Berechnet Verspätung eines Uploads
 * @returns Objekt mit delay_days und delay_hours (0 wenn pünktlich)
 */
function calculateUploadDelayDetails(
  uploadTimestamp: string | null | undefined,
  tourDate: string
): { delay_days: number; delay_hours: number } {
  if (!uploadTimestamp) {
    return { delay_days: 0, delay_hours: 0 }
  }

  const upload = new Date(uploadTimestamp)
  const deadline = calculateUploadDeadline(tourDate)

  if (upload <= deadline) {
    return { delay_days: 0, delay_hours: 0 }
  }

  // Berechne Differenz
  const diffMs = upload.getTime() - deadline.getTime()
  const delay_hours = Math.ceil(diffMs / (1000 * 60 * 60))
  const delay_days = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

  return { delay_days, delay_hours }
}

/**
 * Formatiert ein Datum für Anzeige als Deadline-String
 */
function formatDeadline(tourDate: string): string {
  return `${tourDate} 23:59`
}

/**
 * Berechnet Tage seit einem Datum
 */
function daysSinceDate(dateString: string): number {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  return Math.floor(diffMs / (1000 * 60 * 60 * 24))
}

/**
 * Prüft ob ein Datum in der Vergangenheit liegt
 */
function isDateInPast(dateString: string): boolean {
  const date = new Date(dateString)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  date.setHours(0, 0, 0, 0)
  return date < today
}

// ============================================================
// MAIN CALCULATION FUNCTIONS
// ============================================================

/**
 * Berechnet detaillierte Upload-Compliance pro Fahrer
 * Inkl. Liste aller verspäteten Uploads mit Details
 */
export function calculateDetailedUploadCompliance(
  arbeitsnachweise: ComplianceArbeitsnachweis[],
  fahrer: ComplianceFahrer[]
): DetailedUploadCompliance[] {
  const results: DetailedUploadCompliance[] = []

  // Map: user_id -> { fahrer_id, fahrer_name }
  const userToFahrerMap = new Map<string, { fahrer_id: string; fahrer_name: string }>()
  fahrer.forEach(f => {
    if (f.user_id) {
      userToFahrerMap.set(f.user_id, {
        fahrer_id: String(f.id),
        fahrer_name: `${f.vorname} ${f.nachname}`
      })
    }
  })

  // Gruppiere Arbeitsnachweise nach user_id
  const uploadsProFahrer = new Map<string, {
    total: number
    punctual: number
    delayed: number
    totalDelayHours: number
    maxDelayHours: number
    fahrer_id: string | null
    fahrer_name: string
    delayedItems: DelayedUploadItem[]
  }>()

  arbeitsnachweise.forEach(a => {
    if (!a.user_id) return

    const fahrerInfo = userToFahrerMap.get(a.user_id)
    const fahrer_name = fahrerInfo?.fahrer_name || 'Unbekannt'
    const fahrer_id = fahrerInfo?.fahrer_id || null

    // Initialisiere wenn nötig
    if (!uploadsProFahrer.has(a.user_id)) {
      uploadsProFahrer.set(a.user_id, {
        total: 0,
        punctual: 0,
        delayed: 0,
        totalDelayHours: 0,
        maxDelayHours: 0,
        fahrer_id,
        fahrer_name,
        delayedItems: []
      })
    }

    const entry = uploadsProFahrer.get(a.user_id)!
    entry.total++

    // Berechne Verspätung
    const { delay_days, delay_hours } = calculateUploadDelayDetails(a.created_at, a.datum)

    if (delay_hours > 0) {
      entry.delayed++
      entry.totalDelayHours += delay_hours
      entry.maxDelayHours = Math.max(entry.maxDelayHours, delay_hours)

      // Füge zu delayedItems hinzu
      entry.delayedItems.push({
        arbeitsnachweis_id: a.id,
        tour_nr: a.tour_nr || `#${a.id}`,
        tour_date: a.datum,
        uploaded_at: a.created_at || '',
        upload_deadline: formatDeadline(a.datum),
        delay_days,
        delay_hours,
        status: a.status,
        customer: a.auftraggeber || null,
        action_href: `/admin/arbeitsnachweise`
      })
    } else {
      entry.punctual++
    }
  })

  // Konvertiere zu Ergebnis-Array
  uploadsProFahrer.forEach((stats, userId) => {
    // Sortiere delayedItems nach Datum (neueste zuerst)
    stats.delayedItems.sort((a, b) =>
      new Date(b.tour_date).getTime() - new Date(a.tour_date).getTime()
    )

    results.push({
      user_id: userId,
      fahrer_id: stats.fahrer_id,
      fahrer_name: stats.fahrer_name,
      totalUploads: stats.total,
      punctualUploads: stats.punctual,
      delayedUploads: stats.delayed,
      punctualityRate: stats.total > 0
        ? Math.round((stats.punctual / stats.total) * 100)
        : 100,
      averageDelayHours: stats.delayed > 0
        ? Math.round((stats.totalDelayHours / stats.delayed) * 10) / 10
        : 0,
      maxDelayHours: stats.maxDelayHours,
      delayedUploadItems: stats.delayedItems
    })
  })

  // Sortiere nach Pünktlichkeitsquote (niedrigste zuerst = problematischste)
  results.sort((a, b) => a.punctualityRate - b.punctualityRate)

  return results
}

/**
 * Berechnet detaillierte Verfügbarkeits-Compliance pro Fahrer
 * Inkl. Liste aller verfügbaren Tage ohne Tour mit Review-Status
 *
 * @param reviews - Manuelle Markierungen aus availability_alert_reviews
 */
export function calculateDetailedAvailabilityCompliance(
  fahrer: ComplianceFahrer[],
  driverAvailability: ComplianceDriverAvailability[],
  arbeitsnachweise: ComplianceArbeitsnachweis[],
  reviews: AvailabilityAlertReview[] = []
): DetailedAvailabilityCompliance[] {
  const results: DetailedAvailabilityCompliance[] = []

  const today = new Date().toISOString().split('T')[0]

  // Map: fahrer_id -> { fahrer_name, user_id }
  const fahrerInfoMap = new Map<string, { fahrer_name: string; user_id: string | null }>()
  fahrer.forEach(f => {
    fahrerInfoMap.set(String(f.id), {
      fahrer_name: `${f.vorname} ${f.nachname}`,
      user_id: f.user_id || null
    })
  })

  // Map: user_id + date -> true (hat Tour)
  const tourenMap = new Map<string, boolean>()
  arbeitsnachweise.forEach(a => {
    if (a.user_id && a.datum) {
      tourenMap.set(`${a.user_id}_${a.datum}`, true)
    }
  })

  // Map: fahrer_id + date -> Review
  const reviewMap = new Map<string, AvailabilityAlertReview>()
  reviews.forEach(r => {
    reviewMap.set(`${r.fahrer_id}_${r.date}`, r)
  })

  // Nur vergangene Verfügbarkeiten mit is_available=true und gültigem Status
  const gueltigeVerfuegbarkeiten = driverAvailability.filter(v =>
    v.is_available === true &&
    v.date < today &&
    (v.availability_status === 'submitted' ||
     v.availability_status === 'confirmed_by_dispo' ||
     v.availability_status === 'changed_after_deadline')
  )

  // Gruppiere nach fahrer_id
  const verfuegbarkeitProFahrer = new Map<string, {
    availableDays: number
    availableDaysWithTour: number
    fahrer_name: string
    user_id: string | null
    items: AvailabilityWithoutTourItem[]
  }>()

  gueltigeVerfuegbarkeiten.forEach(v => {
    const fahrerId = v.fahrer_id
    const fahrerInfo = fahrerInfoMap.get(fahrerId)
    const userIdForMatch = v.user_id || fahrerInfo?.user_id

    // Initialisiere wenn nötig
    if (!verfuegbarkeitProFahrer.has(fahrerId)) {
      verfuegbarkeitProFahrer.set(fahrerId, {
        availableDays: 0,
        availableDaysWithTour: 0,
        fahrer_name: fahrerInfo?.fahrer_name || 'Unbekannt',
        user_id: userIdForMatch || null,
        items: []
      })
    }

    const entry = verfuegbarkeitProFahrer.get(fahrerId)!
    entry.availableDays++

    // Prüfe ob Tour existiert
    const key = userIdForMatch ? `${userIdForMatch}_${v.date}` : null
    const hatTour = key ? tourenMap.has(key) : false

    if (hatTour) {
      entry.availableDaysWithTour++
    } else {
      // Prüfe Review-Status
      const reviewKey = `${fahrerId}_${v.date}`
      const review = reviewMap.get(reviewKey)
      const daysSince = daysSinceDate(v.date)

      // Bestimme Review-Status
      let reviewStatus: AvailabilityReviewStatus = 'unreviewed'
      let markedBy: string | null = null
      let markedAt: string | null = null
      let reviewNote: string | null = null
      let autoMarked = false

      if (review) {
        // Manuelle Markierung vorhanden
        reviewStatus = 'marked_available_no_tour'
        markedBy = review.marked_by
        markedAt = review.marked_at
        reviewNote = review.note || null
      } else if (daysSince >= 7) {
        // 7-Tage-Automatik: Automatisch als "Verfügbar, aber keine Tour" markieren
        reviewStatus = 'auto_available_no_tour_after_7_days'
        autoMarked = true
      }

      entry.items.push({
        date: v.date,
        availability_id: v.id,
        available_from: v.available_from || null,
        available_until: v.available_until || null,
        preferred_tours: v.preferred_tour_type || null,
        availability_note: v.note || null,
        hasTour: false,
        review_status: reviewStatus,
        marked_by: markedBy,
        marked_at: markedAt,
        review_note: reviewNote,
        auto_marked: autoMarked,
        days_since_availability: daysSince
      })
    }
  })

  // Konvertiere zu Ergebnis-Array
  verfuegbarkeitProFahrer.forEach((stats, fahrerId) => {
    // Sortiere Items nach Datum (neueste zuerst)
    stats.items.sort((a, b) =>
      new Date(b.date).getTime() - new Date(a.date).getTime()
    )

    const availableDaysWithoutTour = stats.availableDays - stats.availableDaysWithTour

    results.push({
      fahrer_id: fahrerId,
      user_id: stats.user_id,
      fahrer_name: stats.fahrer_name,
      availableDays: stats.availableDays,
      availableDaysWithTour: stats.availableDaysWithTour,
      availableDaysWithoutTour,
      deploymentRate: stats.availableDays > 0
        ? Math.round((stats.availableDaysWithTour / stats.availableDays) * 100)
        : 0,
      availabilityWithoutTourItems: stats.items
    })
  })

  // Sortiere nach availableDaysWithoutTour (meiste zuerst)
  results.sort((a, b) => b.availableDaysWithoutTour - a.availableDaysWithoutTour)

  return results
}

/**
 * Prüft ob für einen Fahrer + Datum nachträglich eine Tour hochgeladen wurde
 */
export function checkIfTourUploadedLater(
  fahrerId: string,
  date: string,
  arbeitsnachweise: ComplianceArbeitsnachweis[],
  fahrer: ComplianceFahrer[]
): boolean {
  // Finde user_id für fahrer_id
  const fahrerRecord = fahrer.find(f => String(f.id) === fahrerId)
  if (!fahrerRecord?.user_id) return false

  // Prüfe ob Tour für dieses Datum existiert
  return arbeitsnachweise.some(a =>
    a.user_id === fahrerRecord.user_id &&
    a.datum === date
  )
}

/**
 * Filtert offene (unreviewed) Verfügbarkeiten ohne Tour für Alerts
 * Exkludiert: manuell markierte, automatisch markierte nach 7 Tagen
 */
export function getUnreviewedAvailabilityWithoutTour(
  compliance: DetailedAvailabilityCompliance[]
): AvailabilityWithoutTourItem[] {
  const items: AvailabilityWithoutTourItem[] = []

  compliance.forEach(c => {
    c.availabilityWithoutTourItems.forEach(item => {
      if (item.review_status === 'unreviewed') {
        items.push(item)
      }
    })
  })

  return items
}

/**
 * Berechnet Zusammenfassung der Compliance-KPIs
 */
export interface ComplianceSummary {
  /** Durchschnittliche Pünktlichkeitsquote (0-100%) */
  avgPunctualityRate: number | null
  /** Durchschnittliche Einsatzquote (0-100%) */
  avgDeploymentRate: number | null
  /** Anzahl Fahrer mit verspäteten Uploads */
  driversWithDelayedUploads: number
  /** Anzahl Fahrer mit verfügbaren Tagen ohne Tour */
  driversWithUnusedAvailability: number
  /** Gesamt verspätete Uploads */
  totalDelayedUploads: number
  /** Gesamt verfügbare Tage ohne Tour */
  totalAvailableDaysWithoutTour: number
  /** Davon unreviewed */
  unreviewedAvailabilityDays: number
  /** Davon automatisch nach 7 Tagen */
  autoMarkedAfter7Days: number
  /** Davon manuell markiert */
  manuallyMarked: number
}

export function calculateComplianceSummary(
  uploadCompliance: DetailedUploadCompliance[],
  availabilityCompliance: DetailedAvailabilityCompliance[]
): ComplianceSummary {
  // Upload-Statistiken
  let avgPunctualityRate: number | null = null
  let driversWithDelayedUploads = 0
  let totalDelayedUploads = 0

  if (uploadCompliance.length > 0) {
    avgPunctualityRate = uploadCompliance.reduce((sum, u) => sum + u.punctualityRate, 0) / uploadCompliance.length
    driversWithDelayedUploads = uploadCompliance.filter(u => u.delayedUploads > 0).length
    totalDelayedUploads = uploadCompliance.reduce((sum, u) => sum + u.delayedUploads, 0)
  }

  // Verfügbarkeits-Statistiken
  let avgDeploymentRate: number | null = null
  let driversWithUnusedAvailability = 0
  let totalAvailableDaysWithoutTour = 0
  let unreviewedAvailabilityDays = 0
  let autoMarkedAfter7Days = 0
  let manuallyMarked = 0

  if (availabilityCompliance.length > 0) {
    avgDeploymentRate = availabilityCompliance.reduce((sum, a) => sum + a.deploymentRate, 0) / availabilityCompliance.length
    driversWithUnusedAvailability = availabilityCompliance.filter(a => a.availableDaysWithoutTour > 0).length

    availabilityCompliance.forEach(a => {
      totalAvailableDaysWithoutTour += a.availableDaysWithoutTour
      a.availabilityWithoutTourItems.forEach(item => {
        switch (item.review_status) {
          case 'unreviewed':
            unreviewedAvailabilityDays++
            break
          case 'auto_available_no_tour_after_7_days':
            autoMarkedAfter7Days++
            break
          case 'marked_available_no_tour':
            manuallyMarked++
            break
        }
      })
    })
  }

  return {
    avgPunctualityRate: avgPunctualityRate !== null ? Math.round(avgPunctualityRate * 10) / 10 : null,
    avgDeploymentRate: avgDeploymentRate !== null ? Math.round(avgDeploymentRate * 10) / 10 : null,
    driversWithDelayedUploads,
    driversWithUnusedAvailability,
    totalDelayedUploads,
    totalAvailableDaysWithoutTour,
    unreviewedAvailabilityDays,
    autoMarkedAfter7Days,
    manuallyMarked
  }
}
