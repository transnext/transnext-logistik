"use client"

import { useEffect, useState, useMemo, useCallback } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { AdminLayout } from "@/components/admin/AdminLayout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getCurrentUser, getUserProfile, signOut } from "@/lib/api"
import { getAllFahrerAdmin, getAllArbeitsnachweiseAdmin, getAllAuslagennachweiseAdmin } from "@/lib/admin-api"
import { getAvailabilityAlertReviewsForFahrer, markAvailableWithoutTour } from "@/lib/availability-alert-reviews-api"
import { getAllAvailability } from "@/lib/availability-api"
import { FahrerakteKPICards, type FahrerakteKPIs } from "@/components/admin/FahrerakteKPICards"
import {
  FahrerakteTourenHistorie,
  calculateUploadDelay,
  type TourHistorieItem
} from "@/components/admin/FahrerakteTourenHistorie"
import {
  FahrerakteAuslagenHistorie,
  type AuslageHistorieItem
} from "@/components/admin/FahrerakteAuslagenHistorie"
import {
  FahrerakteUploadPuenktlichkeit,
  type UploadPuenktlichkeitItem
} from "@/components/admin/FahrerakteUploadPuenktlichkeit"
import {
  FahrerakteVerfuegbarkeit,
  type VerfuegbarkeitOhneTourItem,
  type VerfuegbarkeitKPIs,
  type VerfuegbarkeitStatus
} from "@/components/admin/FahrerakteVerfuegbarkeit"
import {
  calculateDetailedUploadCompliance,
  calculateDetailedAvailabilityCompliance,
  type ComplianceArbeitsnachweis,
  type ComplianceFahrer,
  type ComplianceDriverAvailability,
  type AvailabilityAlertReview
} from "@/lib/driver-compliance-calculator"
import {
  ArrowLeft,
  User,
  Calendar,
  Clock,
  MapPin,
  CreditCard,
  RefreshCw,
  AlertTriangle
} from "lucide-react"

// ============================================================
// TYPES
// ============================================================

interface FahrerDetails {
  id: number
  user_id: string | null
  vorname: string
  nachname: string
  status: 'aktiv' | 'inaktiv'
  zeitmodell: string | null
  geburtsdatum: string | null
  adresse: string | null
  plz: string | null
  ort: string | null
  fuehrerschein_nr: string | null
  fuehrerschein_datum: string | null
  ausstellende_behoerde: string | null
  fuehrerscheinklassen: string[] | null
  ausweisnummer: string | null
  ausweis_ablauf: string | null
  created_at: string | null
}

type TimeRange = 'current_month' | 'last_month' | 'current_quarter' | 'current_year' | 'since_dec_2025' | 'custom'

interface TimeRangeOption {
  value: TimeRange
  label: string
  start: string
  end: string
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function getTimeRangeOptions(): TimeRangeOption[] {
  const now = new Date()
  const today = now.toISOString().split('T')[0]

  // Aktueller Monat
  const currentMonthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]
  const currentMonthLabel = now.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })

  // Letzter Monat
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const lastMonthStart = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}-01`
  const lastMonthEnd = new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0).toISOString().split('T')[0]
  const lastMonthLabel = lastMonth.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })

  // Aktuelles Quartal
  const quarter = Math.floor(now.getMonth() / 3)
  const quarterStart = new Date(now.getFullYear(), quarter * 3, 1)
  const quarterEnd = new Date(now.getFullYear(), (quarter + 1) * 3, 0)

  // Aktuelles Jahr
  const yearStart = `${now.getFullYear()}-01-01`
  const yearEnd = `${now.getFullYear()}-12-31`

  return [
    { value: 'current_month', label: currentMonthLabel, start: currentMonthStart, end: currentMonthEnd },
    { value: 'last_month', label: lastMonthLabel, start: lastMonthStart, end: lastMonthEnd },
    { value: 'current_quarter', label: `Q${quarter + 1} ${now.getFullYear()}`, start: quarterStart.toISOString().split('T')[0], end: quarterEnd.toISOString().split('T')[0] },
    { value: 'current_year', label: `Jahr ${now.getFullYear()}`, start: yearStart, end: yearEnd },
    { value: 'since_dec_2025', label: 'Seit Dezember 2025', start: '2025-12-01', end: today }
  ]
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('de-DE')
}

function formatZeitmodell(zeitmodell: string | null): string {
  switch (zeitmodell) {
    case 'minijob': return 'Minijob'
    case 'werkstudent': return 'Werkstudent'
    case 'teilzeit': return 'Teilzeit'
    case 'vollzeit': return 'Vollzeit'
    default: return zeitmodell || '-'
  }
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

// ============================================================
// COMPONENT
// ============================================================

export default function FahreraktePage() {
  const router = useRouter()
  const params = useParams()
  const fahrerId = params.id as string

  const [userName, setUserName] = useState("")
  const [userRole, setUserRole] = useState<'admin' | 'gf' | 'disponent'>('admin')
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Fahrer-Daten
  const [fahrer, setFahrer] = useState<FahrerDetails | null>(null)

  // KPI-Daten
  const [kpis, setKpis] = useState<FahrerakteKPIs | null>(null)

  // Rohdaten für KPI-Berechnung
  const [arbeitsnachweise, setArbeitsnachweise] = useState<any[]>([])
  const [auslagen, setAuslagen] = useState<any[]>([])
  const [verfuegbarkeiten, setVerfuegbarkeiten] = useState<any[]>([])
  const [reviews, setReviews] = useState<AvailabilityAlertReview[]>([])

  // Zeitraum-Filter
  const timeRangeOptions = getTimeRangeOptions()
  const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRange>('current_month')

  const currentRange = useMemo(() => {
    return timeRangeOptions.find(r => r.value === selectedTimeRange) || timeRangeOptions[0]
  }, [selectedTimeRange, timeRangeOptions])

  const isAdmin = userRole === 'admin' || userRole === 'gf'

  // Tourenhistorie mit Verspätungsberechnung
  const tourenHistorie = useMemo<TourHistorieItem[]>(() => {
    if (!currentRange || arbeitsnachweise.length === 0) return []

    const { start, end } = currentRange

    // Filtere nach Zeitraum
    const tourenImZeitraum = arbeitsnachweise.filter((t: any) =>
      t.datum >= start && t.datum <= end
    )

    // Berechne Verspätung für jede Tour und konvertiere zu TourHistorieItem
    const items: TourHistorieItem[] = tourenImZeitraum.map((t: any) => {
      const delay = calculateUploadDelay(t.created_at, t.datum)
      return {
        id: t.id,
        tour_nr: t.tour_nr || null,
        datum: t.datum,
        auftraggeber: t.auftraggeber || null,
        status: t.status,
        gefahrene_km: t.gefahrene_km != null ? parseFloat(t.gefahrene_km) : null,
        created_at: t.created_at || null,
        isPuenktlich: delay.isPuenktlich,
        delayDays: delay.delayDays,
        delayHours: delay.delayHours
      }
    })

    // Sortiere nach Datum (neueste zuerst)
    items.sort((a, b) => new Date(b.datum).getTime() - new Date(a.datum).getTime())

    return items
  }, [arbeitsnachweise, currentRange])

  // Auslagenhistorie mit Zeitraumfilter
  const auslagenHistorie = useMemo<AuslageHistorieItem[]>(() => {
    if (!currentRange || auslagen.length === 0) return []

    const { start, end } = currentRange

    // Filtere nach Zeitraum
    const auslagenImZeitraum = auslagen.filter((a: any) =>
      a.datum >= start && a.datum <= end
    )

    // Konvertiere zu AuslageHistorieItem
    const items: AuslageHistorieItem[] = auslagenImZeitraum.map((a: any) => ({
      id: a.id,
      datum: a.datum,
      tour_nr: a.tour_nr || null,
      kennzeichen: a.kennzeichen || null,
      belegart: a.belegart || a.beleg_art || null,
      status: a.status,
      kosten: isAdmin && a.kosten != null ? parseFloat(a.kosten) : null,
      driver_reimbursement_status: a.driver_reimbursement_status || null,
      reimbursed_at: a.reimbursed_at || null,
      beleg_url: a.beleg_url || a.beleg || null,
      notiz: a.notiz || null
    }))

    // Sortiere nach Datum (neueste zuerst)
    items.sort((a, b) => new Date(b.datum).getTime() - new Date(a.datum).getTime())

    return items
  }, [auslagen, currentRange, isAdmin])

  // Upload-Pünktlichkeit Items (nutzt tourenHistorie-Daten)
  const uploadPuenktlichkeitItems = useMemo<UploadPuenktlichkeitItem[]>(() => {
    // tourenHistorie enthält bereits berechnete Verspätungsdaten
    return tourenHistorie.map(t => ({
      id: t.id,
      tour_nr: t.tour_nr,
      datum: t.datum,
      created_at: t.created_at,
      status: t.status,
      isPuenktlich: t.isPuenktlich,
      delayDays: t.delayDays,
      delayHours: t.delayHours
    }))
  }, [tourenHistorie])

  // Verfügbarkeit & Einsatz: KPIs und Tage ohne Tour
  const verfuegbarkeitData = useMemo<{
    kpis: VerfuegbarkeitKPIs
    tageOhneTour: VerfuegbarkeitOhneTourItem[]
  }>(() => {
    if (!currentRange || !fahrer) {
      return {
        kpis: {
          verfuegbareTage: 0,
          verfuegbareMitTour: 0,
          verfuegbareOhneTour: 0,
          einsatzQuote: 0,
          manuellMarkiert: 0,
          autoNach7Tagen: 0
        },
        tageOhneTour: []
      }
    }

    const { start, end } = currentRange
    const today = new Date().toISOString().split('T')[0]

    // Filtere Verfügbarkeiten nach Zeitraum - nur vergangene Tage
    const verfuegbarkeitenImZeitraum = verfuegbarkeiten.filter((v: any) =>
      v.date >= start &&
      v.date <= end &&
      v.date < today &&
      v.is_available === true &&
      (v.availability_status === 'submitted' ||
       v.availability_status === 'confirmed_by_dispo' ||
       v.availability_status === 'changed_after_deadline' ||
       !v.availability_status) // Fallback für alte Einträge
    )

    // Map: user_id + date -> true (hat Tour)
    const tourenMap = new Map<string, boolean>()
    arbeitsnachweise.forEach((a: any) => {
      if (a.user_id && a.datum) {
        tourenMap.set(`${a.user_id}_${a.datum}`, true)
      }
    })

    // Map: fahrer_id + date -> Review
    const reviewMap = new Map<string, AvailabilityAlertReview>()
    reviews.forEach(r => {
      reviewMap.set(`${r.fahrer_id}_${r.date}`, r)
    })

    let verfuegbareTage = 0
    let verfuegbareMitTour = 0
    let verfuegbareOhneTour = 0
    let manuellMarkiert = 0
    let autoNach7Tagen = 0
    const tageOhneTour: VerfuegbarkeitOhneTourItem[] = []

    verfuegbarkeitenImZeitraum.forEach((v: any) => {
      verfuegbareTage++

      // Prüfe ob Tour existiert
      const userIdForMatch = v.user_id || fahrer.user_id
      const key = userIdForMatch ? `${userIdForMatch}_${v.date}` : null
      const hatTour = key ? tourenMap.has(key) : false

      if (hatTour) {
        verfuegbareMitTour++
      } else {
        verfuegbareOhneTour++

        // Prüfe Review-Status
        const reviewKey = `${fahrerId}_${v.date}`
        const review = reviewMap.get(reviewKey)
        const daysSince = daysSinceDate(v.date)

        // Bestimme Status
        let status: VerfuegbarkeitStatus = 'ungeklaert'
        let markedBy: string | null = null
        let markedAt: string | null = null
        let reviewNote: string | null = null

        if (review) {
          // Manuelle Markierung vorhanden
          status = 'markiert_verfuegbar_keine_tour'
          markedBy = review.marked_by
          markedAt = review.marked_at
          reviewNote = review.note || null
          manuellMarkiert++
        } else if (daysSince > 7) {
          // Automatisch nach 7 Tagen
          status = 'auto_nach_7_tagen'
          autoNach7Tagen++
        }
        // Sonst bleibt ungeklärt

        tageOhneTour.push({
          availability_id: v.id,
          fahrer_id: fahrerId,
          user_id: fahrer.user_id,
          date: v.date,
          available_from: v.available_from || null,
          available_until: v.available_until || null,
          note: v.note || null,
          status,
          marked_by: markedBy,
          marked_at: markedAt,
          review_note: reviewNote,
          days_since: daysSince
        })
      }
    })

    // Sortiere Tage ohne Tour nach Datum (neueste zuerst)
    tageOhneTour.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    // Einsatzquote berechnen
    const einsatzQuote = verfuegbareTage > 0
      ? Math.round((verfuegbareMitTour / verfuegbareTage) * 100)
      : 0

    return {
      kpis: {
        verfuegbareTage,
        verfuegbareMitTour,
        verfuegbareOhneTour,
        einsatzQuote,
        manuellMarkiert,
        autoNach7Tagen
      },
      tageOhneTour
    }
  }, [verfuegbarkeiten, arbeitsnachweise, reviews, currentRange, fahrer, fahrerId])

  // Handler für Markierung "Verfügbar, aber keine Tour"
  const handleMarkAvailableNoTour = useCallback(async (
    item: VerfuegbarkeitOhneTourItem,
    note: string | null
  ) => {
    const result = await markAvailableWithoutTour({
      fahrer_id: item.fahrer_id,
      user_id: item.user_id,
      date: item.date,
      note
    })

    if (!result.success) {
      console.error("Fehler beim Markieren:", result.error)
      throw new Error(result.error || "Unbekannter Fehler")
    }

    // Nach erfolgreicher Markierung: Reviews neu laden
    const updatedReviews = await getAvailabilityAlertReviewsForFahrer(fahrerId)
    setReviews(updatedReviews)
  }, [fahrerId])

  useEffect(() => {
    checkAuthAndLoad()
  }, [fahrerId])

  // Neu laden wenn Zeitraum sich ändert
  useEffect(() => {
    if (fahrer && currentRange) {
      calculateKPIs()
    }
  }, [selectedTimeRange, fahrer, arbeitsnachweise, verfuegbarkeiten, reviews])

  const checkAuthAndLoad = async () => {
    try {
      const user = await getCurrentUser()
      if (!user) {
        router.push("/admin")
        return
      }
      const profile = await getUserProfile(user.id)
      const role = profile.role as string
      if (!['admin', 'disponent', 'gf'].includes(role)) {
        router.push("/admin")
        return
      }

      // Fahrer darf diese Seite nicht sehen
      if (role === 'fahrer') {
        router.push("/fahrerportal/dashboard")
        return
      }

      setUserRole(role as 'admin' | 'gf' | 'disponent')
      setUserName(profile.full_name)

      await loadFahrerData()
      setIsLoading(false)
    } catch (err) {
      console.error("Auth/Load Fehler:", err)
      router.push("/admin")
    }
  }

  const loadFahrerData = async () => {
    try {
      setIsRefreshing(true)

      // Parallel laden: Fahrer, Arbeitsnachweise, Auslagen, Verfügbarkeiten, Reviews
      const [allFahrer, allTouren, allAuslagen, allVerfuegbarkeiten, fahrerReviews] = await Promise.all([
        getAllFahrerAdmin(),
        getAllArbeitsnachweiseAdmin().catch(() => []),
        getAllAuslagennachweiseAdmin().catch(() => []),
        getAllAvailability(500).catch(() => []),
        getAvailabilityAlertReviewsForFahrer(fahrerId).catch(() => [])
      ])

      const found = allFahrer.find((f: any) => String(f.id) === fahrerId)

      if (!found) {
        router.push("/admin/fahrer")
        return
      }

      setFahrer({
        id: found.id,
        user_id: found.user_id,
        vorname: found.vorname,
        nachname: found.nachname,
        status: found.status,
        zeitmodell: found.zeitmodell,
        geburtsdatum: found.geburtsdatum,
        adresse: found.adresse,
        plz: found.plz,
        ort: found.ort,
        fuehrerschein_nr: found.fuehrerschein_nr,
        fuehrerschein_datum: found.fuehrerschein_datum,
        ausstellende_behoerde: found.ausstellende_behoerde,
        fuehrerscheinklassen: found.fuehrerscheinklassen,
        ausweisnummer: found.ausweisnummer,
        ausweis_ablauf: found.ausweis_ablauf,
        created_at: found.created_at
      })

      // Filtere Touren für diesen Fahrer
      const fahrerTouren = allTouren.filter((t: any) =>
        t.user_id === found.user_id
      )
      setArbeitsnachweise(fahrerTouren)

      // Filtere Auslagen für diesen Fahrer
      const fahrerAuslagen = allAuslagen.filter((a: any) =>
        a.user_id === found.user_id
      )
      setAuslagen(fahrerAuslagen)

      // Filtere Verfügbarkeiten für diesen Fahrer
      const fahrerVerfuegbarkeiten = allVerfuegbarkeiten.filter((v: any) =>
        v.fahrer_id === fahrerId || v.user_id === found.user_id
      )
      setVerfuegbarkeiten(fahrerVerfuegbarkeiten)
      setReviews(fahrerReviews)
    } catch (err) {
      console.error("Fehler beim Laden:", err)
    } finally {
      setIsRefreshing(false)
    }
  }

  // KPIs aus geladenen Daten berechnen
  const calculateKPIs = () => {
    if (!fahrer || !currentRange) return

    const { start, end } = currentRange

    // Filtere Touren nach Zeitraum
    const tourenImZeitraum = arbeitsnachweise.filter((t: any) =>
      t.datum >= start && t.datum <= end
    )

    // Filtere Verfügbarkeiten nach Zeitraum
    const verfuegbarkeitenImZeitraum = verfuegbarkeiten.filter((v: any) =>
      v.date >= start && v.date <= end
    )

    // Bereite Daten für Compliance-Berechnung vor
    const complianceArbeitsnachweise: ComplianceArbeitsnachweis[] = tourenImZeitraum.map((t: any) => ({
      id: t.id,
      tour_nr: t.tour_nr,
      datum: t.datum,
      status: t.status,
      created_at: t.created_at,
      user_id: t.user_id,
      auftraggeber: t.auftraggeber,
      customer_id: t.customer_id
    }))

    const complianceFahrer: ComplianceFahrer[] = [{
      id: fahrer.id,
      vorname: fahrer.vorname,
      nachname: fahrer.nachname,
      status: fahrer.status,
      user_id: fahrer.user_id
    }]

    const complianceVerfuegbarkeiten: ComplianceDriverAvailability[] = verfuegbarkeitenImZeitraum.map((v: any) => ({
      id: v.id,
      fahrer_id: v.fahrer_id,
      user_id: v.user_id,
      date: v.date,
      is_available: v.is_available,
      available_from: v.available_from,
      available_until: v.available_until,
      preferred_tour_type: v.preferred_tour_type,
      note: v.note,
      availability_status: v.availability_status
    }))

    // Upload-Compliance berechnen
    const uploadCompliance = calculateDetailedUploadCompliance(
      complianceArbeitsnachweise,
      complianceFahrer
    )
    const fahrerUploadCompliance = uploadCompliance.find(u => u.user_id === fahrer.user_id)

    // Verfügbarkeits-Compliance berechnen
    const verfuegbarkeitsCompliance = calculateDetailedAvailabilityCompliance(
      complianceFahrer,
      complianceVerfuegbarkeiten,
      complianceArbeitsnachweise,
      reviews
    )
    const fahrerVerfuegbarkeitsCompliance = verfuegbarkeitsCompliance.find(v => v.fahrer_id === fahrerId)

    // Aktive Fahrtage (distinct Tage mit Touren)
    const aktiveTageSet = new Set(tourenImZeitraum.map((t: any) => t.datum))
    const aktiveFahrtage = aktiveTageSet.size

    // Finanz-KPIs (nur für Admin/GF aus genehmigten Touren)
    const genehmigteTouren = tourenImZeitraum.filter((t: any) =>
      t.status === 'approved' || t.status === 'billed'
    )

    let umsatz: number | null = null
    let fahrerlohn: number | null = null
    let arbeitgeberkosten: number | null = null
    let ertrag: number | null = null
    let margenQuote: number | null = null
    let finanzDatenVerfuegbar = false

    // Finanzwerte aus den Touren extrahieren, wenn vorhanden
    if (genehmigteTouren.length > 0) {
      const mitFinanzdaten = genehmigteTouren.filter((t: any) =>
        t.customer_amount != null && t.driver_amount_final != null
      )

      if (mitFinanzdaten.length > 0) {
        finanzDatenVerfuegbar = true
        umsatz = mitFinanzdaten.reduce((sum: number, t: any) => sum + (parseFloat(t.customer_amount) || 0), 0)
        fahrerlohn = mitFinanzdaten.reduce((sum: number, t: any) => sum + (parseFloat(t.driver_amount_final) || 0), 0)
        arbeitgeberkosten = mitFinanzdaten.reduce((sum: number, t: any) => sum + (parseFloat(t.estimated_employer_costs) || 0), 0)
        ertrag = umsatz - fahrerlohn - arbeitgeberkosten
        margenQuote = umsatz > 0 ? (ertrag / umsatz) * 100 : 0
      }
    }

    setKpis({
      tourenImZeitraum: tourenImZeitraum.length,
      aktiveFahrtage,
      puenktlicheUploads: fahrerUploadCompliance?.punctualUploads || 0,
      verspaeteteUploads: fahrerUploadCompliance?.delayedUploads || 0,
      puenktlichkeitsQuote: fahrerUploadCompliance?.punctualityRate || 100,
      verfuegbareTage: fahrerVerfuegbarkeitsCompliance?.availableDays || 0,
      verfuegbareTageOhneTour: fahrerVerfuegbarkeitsCompliance?.availableDaysWithoutTour || 0,
      einsatzQuote: fahrerVerfuegbarkeitsCompliance?.deploymentRate || 0,
      umsatz,
      fahrerlohn,
      arbeitgeberkosten,
      ertrag,
      margenQuote,
      finanzDatenVerfuegbar
    })
  }

  const handleRefresh = async () => {
    await loadFahrerData()
  }

  const handleLogout = async () => {
    await signOut()
    router.push("/admin")
  }

  if (isLoading) {
    return (
      <AdminLayout userName={userName} userRole={userRole === 'gf' ? 'admin' : userRole} onLogout={handleLogout}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-blue" />
        </div>
      </AdminLayout>
    )
  }

  if (!fahrer) {
    return (
      <AdminLayout userName={userName} userRole={userRole === 'gf' ? 'admin' : userRole} onLogout={handleLogout}>
        <div className="text-center py-12">
          <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900">Fahrer nicht gefunden</h2>
          <p className="text-gray-500 mt-2">Der angeforderte Fahrer konnte nicht geladen werden.</p>
          <Link href="/admin/fahrer">
            <Button className="mt-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Zurück zur Übersicht
            </Button>
          </Link>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout userName={userName} userRole={userRole === 'gf' ? 'admin' : userRole} onLogout={handleLogout}>
      <div className="space-y-6">
        {/* Header mit Zurück-Link */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/admin/fahrer">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Übersicht
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {fahrer.vorname} {fahrer.nachname}
              </h1>
              <p className="text-gray-500">Fahrerakte</p>
            </div>
          </div>
          <Button variant="outline" onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Aktualisieren
          </Button>
        </div>

        {/* Kopfbereich: Status, Zeitmodell, Kontakt */}
        <Card className="border-gray-100">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row lg:items-start gap-6">
              {/* Avatar/Icon */}
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center shrink-0">
                <User className="h-10 w-10 text-gray-400" />
              </div>

              {/* Haupt-Info */}
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Status */}
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Status</p>
                  <div className="mt-1">
                    <Badge className={
                      fahrer.status === 'aktiv'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 border'
                        : 'bg-gray-50 text-gray-700 border-gray-200 border'
                    }>
                      {fahrer.status === 'aktiv' ? 'Aktiv' : 'Inaktiv'}
                    </Badge>
                  </div>
                </div>

                {/* Zeitmodell */}
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Zeitmodell</p>
                  <div className="mt-1 flex items-center gap-2">
                    <Clock className="h-4 w-4 text-gray-400" />
                    <span className="font-medium">{formatZeitmodell(fahrer.zeitmodell)}</span>
                  </div>
                </div>

                {/* Geburtsdatum */}
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Geburtsdatum</p>
                  <div className="mt-1 flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span>{formatDate(fahrer.geburtsdatum)}</span>
                  </div>
                </div>

                {/* Adresse */}
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Adresse</p>
                  <div className="mt-1 flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-gray-400" />
                    <span className="text-sm">
                      {fahrer.adresse && fahrer.plz && fahrer.ort
                        ? `${fahrer.adresse}, ${fahrer.plz} ${fahrer.ort}`
                        : '-'
                      }
                    </span>
                  </div>
                </div>

                {/* Führerschein */}
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Führerschein</p>
                  <div className="mt-1 flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-gray-400" />
                    <span className="text-sm">{fahrer.fuehrerschein_nr || '-'}</span>
                  </div>
                  {fahrer.fuehrerscheinklassen && fahrer.fuehrerscheinklassen.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {fahrer.fuehrerscheinklassen.map((klasse, i) => (
                        <Badge key={i} variant="outline" className="text-xs">{klasse}</Badge>
                      ))}
                    </div>
                  )}
                </div>

                {/* IDs (nur für Admin/GF) */}
                {isAdmin && (
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">System-IDs</p>
                    <div className="mt-1 text-xs text-gray-500">
                      <div>Fahrer-ID: {fahrer.id}</div>
                      <div>User-ID: {fahrer.user_id || '-'}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Zeitraumfilter */}
        <Card className="border-gray-100">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Zeitraum:</span>
              </div>
              <Select value={selectedTimeRange} onValueChange={(v) => setSelectedTimeRange(v as TimeRange)}>
                <SelectTrigger className="w-[220px]">
                  <SelectValue placeholder="Zeitraum wählen" />
                </SelectTrigger>
                <SelectContent>
                  {timeRangeOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-xs text-gray-500">
                {formatDate(currentRange.start)} – {formatDate(currentRange.end)}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Übersichtskarten */}
        {kpis ? (
          <FahrerakteKPICards
            kpis={kpis}
            isAdmin={isAdmin}
            zeitraumLabel={currentRange.label}
          />
        ) : (
          <Card className="border-gray-100 border-dashed">
            <CardContent className="p-6 text-center">
              <div className="flex items-center justify-center gap-2 text-gray-400">
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Lade Kennzahlen...</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tourenhistorie */}
        <FahrerakteTourenHistorie
          touren={tourenHistorie}
          zeitraumLabel={currentRange.label}
          isLoading={isRefreshing}
        />

        {/* Auslagenhistorie */}
        <FahrerakteAuslagenHistorie
          auslagen={auslagenHistorie}
          zeitraumLabel={currentRange.label}
          isAdmin={isAdmin}
          isLoading={isRefreshing}
        />

        {/* Upload-Pünktlichkeit */}
        <FahrerakteUploadPuenktlichkeit
          items={uploadPuenktlichkeitItems}
          zeitraumLabel={currentRange.label}
          isLoading={isRefreshing}
        />

        {/* Verfügbarkeit & Einsatz */}
        <FahrerakteVerfuegbarkeit
          kpis={verfuegbarkeitData.kpis}
          tageOhneTour={verfuegbarkeitData.tageOhneTour}
          zeitraumLabel={currentRange.label}
          fahrerId={fahrerId}
          isLoading={isRefreshing}
          onMarkAvailableNoTour={handleMarkAvailableNoTour}
        />
      </div>
    </AdminLayout>
  )
}
