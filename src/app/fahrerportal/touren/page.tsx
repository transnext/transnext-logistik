"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { FahrerportalLayout } from "@/components/fahrerportal/FahrerportalLayout"
import { PDFViewerDialog } from "@/components/pdf-viewer-dialog"
import { EmptyState } from "@/components/ui/empty-state"
import {
  ArrowLeft,
  Car,
  Calendar,
  MapPin,
  FileText,
  CheckCircle,
  Clock,
  XCircle,
  Eye,
  RefreshCw
} from "lucide-react"
import { getCurrentUser, canAccessFahrerportal, getArbeitsnachweiseByUser } from "@/lib/api"

interface Tour {
  id: number
  tour_nr: string
  datum: string
  gefahrene_km: number
  wartezeit: string
  status: string
  beleg_url?: string
  ist_ruecklaufer?: boolean
  auftraggeber?: string
}

export default function MeineTourenPage() {
  const router = useRouter()
  const [fahrerName, setFahrerName] = useState("")
  const [touren, setTouren] = useState<Tour[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [showBelegDialog, setShowBelegDialog] = useState(false)
  const [selectedTour, setSelectedTour] = useState<Tour | null>(null)

  useEffect(() => {
    checkAuthAndLoad()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const checkAuthAndLoad = async () => {
    try {
      const user = await getCurrentUser()
      if (!user) {
        router.push("/fahrerportal")
        return
      }

      // Nutze die neue Zugriffsprüfung (erlaubt Admin/GF mit Fahrer-Datensatz)
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

      // Lade Touren
      const tourenData = await getArbeitsnachweiseByUser(user.id)
      setTouren(tourenData.map((t: any) => ({
        id: t.id,
        tour_nr: t.tour_nr,
        datum: t.datum,
        gefahrene_km: t.gefahrene_km,
        wartezeit: t.wartezeit || '',
        status: t.status,
        beleg_url: t.beleg_url,
        ist_ruecklaufer: t.ist_ruecklaufer,
        auftraggeber: t.auftraggeber
      })))
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
        const tourenData = await getArbeitsnachweiseByUser(user.id)
        setTouren(tourenData.map((t: any) => ({
          id: t.id,
          tour_nr: t.tour_nr,
          datum: t.datum,
          gefahrene_km: t.gefahrene_km,
          wartezeit: t.wartezeit || '',
          status: t.status,
          beleg_url: t.beleg_url,
          ist_ruecklaufer: t.ist_ruecklaufer,
          auftraggeber: t.auftraggeber
        })))
      }
    } catch (error) {
      console.error("Fehler beim Aktualisieren:", error)
    } finally {
      setIsRefreshing(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    })
  }

  const getStatusBadge = (status: string, istRuecklaufer?: boolean) => {
    if (istRuecklaufer) {
      return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">Rückläufer</Badge>
    }
    switch (status) {
      case "approved":
        return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">Genehmigt</Badge>
      case "pending":
        return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">Ausstehend</Badge>
      case "rejected":
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Abgelehnt</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const handleViewBeleg = (tour: Tour) => {
    setSelectedTour(tour)
    setShowBelegDialog(true)
  }

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
        <div className="flex items-center justify-between mb-6">
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

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <Card className="border-gray-100">
            <CardContent className="p-3 sm:p-4">
              <p className="text-2xl font-bold text-gray-900">{touren.length}</p>
              <p className="text-xs sm:text-sm text-gray-500">Gesamt</p>
            </CardContent>
          </Card>
          <Card className="border-gray-100">
            <CardContent className="p-3 sm:p-4">
              <p className="text-2xl font-bold text-emerald-600">
                {touren.filter(t => t.status === 'approved').length}
              </p>
              <p className="text-xs sm:text-sm text-gray-500">Genehmigt</p>
            </CardContent>
          </Card>
          <Card className="border-gray-100">
            <CardContent className="p-3 sm:p-4">
              <p className="text-2xl font-bold text-amber-600">
                {touren.filter(t => t.status === 'pending').length}
              </p>
              <p className="text-xs sm:text-sm text-gray-500">Ausstehend</p>
            </CardContent>
          </Card>
          <Card className="border-gray-100">
            <CardContent className="p-3 sm:p-4">
              <p className="text-2xl font-bold text-gray-900">
                {touren.reduce((sum, t) => sum + (t.gefahrene_km || 0), 0).toLocaleString('de-DE')}
              </p>
              <p className="text-xs sm:text-sm text-gray-500">km gesamt</p>
            </CardContent>
          </Card>
        </div>

        {/* Touren-Liste */}
        <Card className="border-gray-100 shadow-sm">
          <CardHeader className="border-b border-gray-50 bg-gray-50/30">
            <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Car className="h-5 w-5 text-primary-blue" />
              Meine Touren
            </CardTitle>
            <CardDescription>Alle eingereichten Arbeitsnachweise</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {touren.length === 0 ? (
              <div className="p-8">
                <EmptyState
                  title="Keine Touren gefunden"
                  description="Sie haben noch keine Arbeitsnachweise eingereicht."
                  icon="car"
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50/50">
                      <TableHead className="font-medium">Tour-Nr.</TableHead>
                      <TableHead className="font-medium">Datum</TableHead>
                      <TableHead className="font-medium text-right">KM</TableHead>
                      <TableHead className="font-medium">Status</TableHead>
                      <TableHead className="font-medium text-right">Beleg</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {touren.slice(0, 50).map((tour) => (
                      <TableRow key={tour.id} className="hover:bg-gray-50/50">
                        <TableCell className="font-medium">{tour.tour_nr}</TableCell>
                        <TableCell>{formatDate(tour.datum)}</TableCell>
                        <TableCell className="text-right">{tour.gefahrene_km}</TableCell>
                        <TableCell>{getStatusBadge(tour.status, tour.ist_ruecklaufer)}</TableCell>
                        <TableCell className="text-right">
                          {tour.beleg_url ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewBeleg(tour)}
                              className="text-primary-blue hover:text-primary-blue/80"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          ) : (
                            <span className="text-gray-400 text-sm">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {touren.length > 50 && (
                  <div className="p-4 text-center text-sm text-gray-500 border-t">
                    Zeige 50 von {touren.length} Touren
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Beleg Dialog */}
      {selectedTour && (
        <PDFViewerDialog
          open={showBelegDialog}
          onOpenChange={setShowBelegDialog}
          tourNr={selectedTour.tour_nr}
          datum={selectedTour.datum}
          typ="arbeitsnachweis"
          belegUrl={selectedTour.beleg_url}
        />
      )}
    </FahrerportalLayout>
  )
}
