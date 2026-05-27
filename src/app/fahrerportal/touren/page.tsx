"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Suspense } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { FahrerportalLayout } from "@/components/fahrerportal/FahrerportalLayout"
import { EmptyState } from "@/components/ui/empty-state"
import {
  ArrowLeft,
  Car,
  Calendar,
  MapPin,
  FileText,
  CheckCircle,
  Clock,
  Play,
  Eye,
  RefreshCw,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Truck,
  Zap,
  AlertCircle
} from "lucide-react"
import { getCurrentUser, canAccessFahrerportal } from "@/lib/api"
import { getFahrerTouren, getFahrerTourenHistorie, formatTourStatus, getTourStatusColor, formatFahrzeugart } from "@/lib/touren-api"
import type { Tour, TourStatus } from "@/lib/supabase"

function MeineTourenContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [fahrerName, setFahrerName] = useState("")
  const [aktivTouren, setAktivTouren] = useState<Tour[]>([])
  const [historieTouren, setHistorieTouren] = useState<Tour[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [showHistorie, setShowHistorie] = useState(false)
  const [historiePage, setHistoriePage] = useState(1)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const ITEMS_PER_PAGE = 20

  useEffect(() => {
    checkAuthAndLoad()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    // Erfolgsmeldung aus URL-Parameter
    const success = searchParams.get("success")
    if (success === "uebernahme") {
      setSuccessMessage("Übernahme-Protokoll erfolgreich abgeschlossen!")
    } else if (success === "abgabe") {
      setSuccessMessage("Abgabe-Protokoll erfolgreich abgeschlossen! Die Tour ist nun abgeschlossen.")
    }
    // Nach 5 Sekunden ausblenden
    if (success) {
      const timer = setTimeout(() => setSuccessMessage(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [searchParams])

  const checkAuthAndLoad = async () => {
    try {
      const user = await getCurrentUser()
      if (!user) {
        router.push("/fahrerportal")
        return
      }

      const accessResult = await canAccessFahrerportal(user.id)

      if (!accessResult.canAccess) {
        console.log("Fahrerportal-Zugang verweigert:", accessResult.reason)
        router.push("/fahrerportal")
        return
      }

      const name = accessResult.fahrer
        ? `${accessResult.fahrer.vorname} ${accessResult.fahrer.nachname}`
        : 'Fahrer'
      setFahrerName(name)

      // Lade aktive Touren (nicht abgeschlossen)
      const aktiv = await getFahrerTouren(user.id)
      setAktivTouren(aktiv)

      // Lade Historie
      const historie = await getFahrerTourenHistorie(user.id)
      setHistorieTouren(historie)

      setIsLoading(false)
    } catch (error) {
      console.error("Auth Fehler:", error)
      router.push("/fahrerportal")
    }
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      const user = await getCurrentUser()
      if (user) {
        const aktiv = await getFahrerTouren(user.id)
        setAktivTouren(aktiv)
        const historie = await getFahrerTourenHistorie(user.id)
        setHistorieTouren(historie)
      }
    } catch (error) {
      console.error("Fehler beim Aktualisieren:", error)
    } finally {
      setIsRefreshing(false)
    }
  }

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return "-"
    return new Date(dateString).toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    })
  }

  const formatTime = (dateString: string | undefined) => {
    if (!dateString) return ""
    return new Date(dateString).toLocaleTimeString("de-DE", {
      hour: "2-digit",
      minute: "2-digit"
    })
  }

  const getStatusBadge = (status: TourStatus) => {
    const colors = getTourStatusColor(status)
    return (
      <Badge variant="outline" className={`${colors.bg} ${colors.text} ${colors.border}`}>
        {formatTourStatus(status)}
      </Badge>
    )
  }

  const getFahrzeugIcon = (art: string) => {
    switch (art) {
      case 'e-auto':
        return <Zap className="h-4 w-4 text-green-600" />
      case 'transporter':
        return <Truck className="h-4 w-4 text-gray-600" />
      default:
        return <Car className="h-4 w-4 text-blue-600" />
    }
  }

  // Protokoll-Aktion basierend auf Status
  const getProtocolAction = (tour: Tour) => {
    switch (tour.status) {
      case 'neu':
      case 'uebernahme_offen':
        return {
          label: "Übernahme starten",
          href: `/fahrerportal/touren/protokoll?tourId=${tour.id}&typ=uebernahme`,
          color: "bg-green-600 hover:bg-green-700 text-white",
          icon: Play
        }
      case 'abgabe_offen':
        return {
          label: "Abgabe starten",
          href: `/fahrerportal/touren/protokoll?tourId=${tour.id}&typ=abgabe`,
          color: "bg-blue-600 hover:bg-blue-700 text-white",
          icon: Play
        }
      case 'abgeschlossen':
        return {
          label: "Ansehen",
          href: `/fahrerportal/touren/protokoll?tourId=${tour.id}&typ=abgabe`,
          color: "bg-gray-100 hover:bg-gray-200 text-gray-700",
          icon: Eye
        }
      default:
        return null
    }
  }

  // Sortiere Touren nach Priorität
  const sortedAktivTouren = [...aktivTouren].sort((a, b) => {
    // Abgabe offen hat höchste Priorität
    if (a.status === 'abgabe_offen' && b.status !== 'abgabe_offen') return -1
    if (b.status === 'abgabe_offen' && a.status !== 'abgabe_offen') return 1
    // Dann Übernahme offen
    if (a.status === 'uebernahme_offen' && b.status === 'neu') return -1
    if (b.status === 'uebernahme_offen' && a.status === 'neu') return 1
    // Nach Datum
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })

  // Pagination für Historie
  const paginatedHistorie = historieTouren.slice(0, historiePage * ITEMS_PER_PAGE)
  const hasMoreHistorie = historieTouren.length > paginatedHistorie.length

  if (isLoading) {
    return (
      <FahrerportalLayout title="Meine Touren">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-blue" />
        </div>
      </FahrerportalLayout>
    )
  }

  return (
    <FahrerportalLayout title="Meine Touren">
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Link href="/fahrerportal/dashboard">
              <Button variant="ghost" size="sm" className="text-gray-600">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Zurück
              </Button>
            </Link>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Aktualisieren
          </Button>
        </div>

        {/* Erfolgsmeldung */}
        {successMessage && (
          <Card className="mb-4 border-green-200 bg-green-50">
            <CardContent className="p-4 flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
              <p className="text-sm text-green-800">{successMessage}</p>
            </CardContent>
          </Card>
        )}

        {/* Kurzübersicht */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <Card className="border-gray-100">
            <CardContent className="p-3 sm:p-4 text-center">
              <p className="text-2xl font-bold text-gray-900">{aktivTouren.length}</p>
              <p className="text-xs sm:text-sm text-gray-500">Offen</p>
            </CardContent>
          </Card>
          <Card className="border-orange-100 bg-orange-50/30">
            <CardContent className="p-3 sm:p-4 text-center">
              <p className="text-2xl font-bold text-orange-600">
                {aktivTouren.filter(t => t.status === 'abgabe_offen').length}
              </p>
              <p className="text-xs sm:text-sm text-gray-500">Abgabe offen</p>
            </CardContent>
          </Card>
          <Card className="border-yellow-100 bg-yellow-50/30">
            <CardContent className="p-3 sm:p-4 text-center">
              <p className="text-2xl font-bold text-yellow-600">
                {aktivTouren.filter(t => t.status === 'uebernahme_offen' || t.status === 'neu').length}
              </p>
              <p className="text-xs sm:text-sm text-gray-500">Übernahme offen</p>
            </CardContent>
          </Card>
        </div>

        {/* Aktive Touren */}
        <Card className="border-gray-100 shadow-sm mb-6">
          <CardHeader className="border-b border-gray-50 bg-gray-50/30 pb-3">
            <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Car className="h-5 w-5 text-primary-blue" />
              Aktive Touren
            </CardTitle>
            <CardDescription>Zugewiesene Überführungen, die noch nicht abgeschlossen sind</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {sortedAktivTouren.length === 0 ? (
              <div className="p-8">
                <EmptyState
                  title="Keine aktiven Touren"
                  description="Ihnen wurden aktuell keine Touren zugewiesen."
                  icon="car"
                />
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {sortedAktivTouren.map((tour) => {
                  const action = getProtocolAction(tour)
                  return (
                    <div key={tour.id} className="p-4 hover:bg-gray-50/50 transition-colors">
                      {/* Tour Header */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          {getFahrzeugIcon(tour.fahrzeugart)}
                          <span className="font-semibold text-gray-900">Tour {tour.tour_nummer}</span>
                          {getStatusBadge(tour.status)}
                        </div>
                        <div className="text-sm text-gray-500">
                          {formatFahrzeugart(tour.fahrzeugart)}
                        </div>
                      </div>

                      {/* Tour Details */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3 text-sm">
                        <div className="flex items-start gap-2">
                          <MapPin className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="font-medium text-gray-900">{tour.abholort_name || tour.abholort_ort}</p>
                            <p className="text-gray-500 text-xs">{tour.abholort_strasse}, {tour.abholort_plz} {tour.abholort_ort}</p>
                            {tour.abholzeit_ab && (
                              <p className="text-xs text-gray-400">ab {formatDate(tour.abholzeit_ab)} {formatTime(tour.abholzeit_ab)}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <MapPin className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="font-medium text-gray-900">{tour.abgabeort_name || tour.abgabeort_ort}</p>
                            <p className="text-gray-500 text-xs">{tour.abgabeort_strasse}, {tour.abgabeort_plz} {tour.abgabeort_ort}</p>
                            {tour.abgabezeit_bis && (
                              <p className="text-xs text-gray-400">bis {formatDate(tour.abgabezeit_bis)} {formatTime(tour.abgabezeit_bis)}</p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Fahrzeug Info */}
                      <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                        <span className="font-mono bg-gray-100 px-2 py-0.5 rounded">{tour.kennzeichen}</span>
                        {tour.distance_km && (
                          <span className="text-gray-500">ca. {tour.distance_km} km</span>
                        )}
                      </div>

                      {/* Hinweise */}
                      {tour.hinweise && (
                        <div className="flex items-start gap-2 text-sm text-amber-700 bg-amber-50 p-2 rounded mb-3">
                          <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                          <p>{tour.hinweise}</p>
                        </div>
                      )}

                      {/* Aktion */}
                      {action && (
                        <Link href={action.href}>
                          <Button className={`w-full sm:w-auto ${action.color}`}>
                            <action.icon className="h-4 w-4 mr-2" />
                            {action.label}
                            <ChevronRight className="h-4 w-4 ml-2" />
                          </Button>
                        </Link>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Historie (eingeklappt) */}
        <Card className="border-gray-100 shadow-sm">
          <CardHeader
            className="cursor-pointer hover:bg-gray-50/50 transition-colors"
            onClick={() => setShowHistorie(!showHistorie)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-gray-500" />
                <CardTitle className="text-base font-medium text-gray-700">
                  Abgeschlossene Touren ({historieTouren.length})
                </CardTitle>
              </div>
              {showHistorie ? (
                <ChevronUp className="h-5 w-5 text-gray-400" />
              ) : (
                <ChevronDown className="h-5 w-5 text-gray-400" />
              )}
            </div>
          </CardHeader>

          {showHistorie && (
            <CardContent className="pt-0">
              {paginatedHistorie.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">
                  Noch keine abgeschlossenen Touren
                </p>
              ) : (
                <>
                  <div className="divide-y divide-gray-100">
                    {paginatedHistorie.map((tour) => (
                      <div key={tour.id} className="py-3 flex items-center justify-between">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="flex-shrink-0">
                            {getFahrzeugIcon(tour.fahrzeugart)}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 truncate">
                              Tour {tour.tour_nummer}
                            </p>
                            <p className="text-xs text-gray-500 truncate">
                              {tour.abholort_ort} → {tour.abgabeort_ort}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <span className="text-sm text-gray-500">
                            {formatDate(tour.updated_at)}
                          </span>
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            Abgeschlossen
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                  {hasMoreHistorie && (
                    <div className="pt-4 text-center">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setHistoriePage(prev => prev + 1)}
                      >
                        Mehr laden ({historieTouren.length - paginatedHistorie.length} weitere)
                      </Button>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          )}
        </Card>

        {/* Link zu Statistiken */}
        <div className="mt-6 text-center">
          <Link href="/fahrerportal/statistiken">
            <Button variant="outline" className="text-gray-600">
              <FileText className="h-4 w-4 mr-2" />
              Arbeitsnachweise & Statistiken anzeigen
            </Button>
          </Link>
        </div>
      </div>
    </FahrerportalLayout>
  )
}

export default function MeineTourenPage() {
  return (
    <Suspense fallback={
      <FahrerportalLayout title="Meine Touren">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-blue" />
        </div>
      </FahrerportalLayout>
    }>
      <MeineTourenContent />
    </Suspense>
  )
}
