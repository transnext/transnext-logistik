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
  FileText,
  CheckCircle,
  Clock,
  XCircle,
  Eye,
  RefreshCw,
  BarChart3,
  Calendar,
  ChevronLeft,
  ChevronRight
} from "lucide-react"
import { getCurrentUser, canAccessFahrerportal, getArbeitsnachweiseByUser } from "@/lib/api"

interface Arbeitsnachweis {
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

interface MonthStats {
  month: string
  label: string
  total: number
  approved: number
  pending: number
  rejected: number
  km: number
}

export default function StatistikenPage() {
  const router = useRouter()
  const [fahrerName, setFahrerName] = useState("")
  const [nachweise, setNachweise] = useState<Arbeitsnachweis[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [showBelegDialog, setShowBelegDialog] = useState(false)
  const [selectedNachweis, setSelectedNachweis] = useState<Arbeitsnachweis | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null)
  const ITEMS_PER_PAGE = 25

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

      // Lade alle Arbeitsnachweise
      const data = await getArbeitsnachweiseByUser(user.id)
      setNachweise(data.map((t: any) => ({
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
        const data = await getArbeitsnachweiseByUser(user.id)
        setNachweise(data.map((t: any) => ({
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

  const formatMonthLabel = (monthStr: string) => {
    const [year, month] = monthStr.split("-")
    const date = new Date(Number.parseInt(year), Number.parseInt(month) - 1, 1)
    return date.toLocaleDateString("de-DE", { month: "long", year: "numeric" })
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
      case "billed":
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Abgerechnet</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const handleViewBeleg = (nachweis: Arbeitsnachweis) => {
    setSelectedNachweis(nachweis)
    setShowBelegDialog(true)
  }

  // Berechne Monatsstatistiken
  const calculateMonthStats = (): MonthStats[] => {
    const monthMap = new Map<string, MonthStats>()

    for (const n of nachweise) {
      const month = n.datum.substring(0, 7) // YYYY-MM

      if (!monthMap.has(month)) {
        monthMap.set(month, {
          month,
          label: formatMonthLabel(month),
          total: 0,
          approved: 0,
          pending: 0,
          rejected: 0,
          km: 0
        })
      }

      const stats = monthMap.get(month)!
      stats.total++
      stats.km += n.gefahrene_km || 0

      switch (n.status) {
        case 'approved':
        case 'billed':
          stats.approved++
          break
        case 'pending':
          stats.pending++
          break
        case 'rejected':
          stats.rejected++
          break
      }
    }

    // Sortiere nach Monat absteigend
    return Array.from(monthMap.values()).sort((a, b) => b.month.localeCompare(a.month))
  }

  const monthStats = calculateMonthStats()

  // Filtere Nachweise nach ausgewähltem Monat
  const filteredNachweise = selectedMonth
    ? nachweise.filter(n => n.datum.startsWith(selectedMonth))
    : nachweise

  // Sortiere nach Datum absteigend
  const sortedNachweise = [...filteredNachweise].sort(
    (a, b) => new Date(b.datum).getTime() - new Date(a.datum).getTime()
  )

  // Pagination
  const totalPages = Math.ceil(sortedNachweise.length / ITEMS_PER_PAGE)
  const paginatedNachweise = sortedNachweise.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  )

  // Gesamtstatistik
  const totalStats = {
    total: nachweise.length,
    approved: nachweise.filter(n => n.status === 'approved' || n.status === 'billed').length,
    pending: nachweise.filter(n => n.status === 'pending').length,
    rejected: nachweise.filter(n => n.status === 'rejected').length,
    totalKm: nachweise.reduce((sum, n) => sum + (n.gefahrene_km || 0), 0)
  }

  if (isLoading) {
    return (
      <FahrerportalLayout title="Statistiken">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-blue" />
        </div>
      </FahrerportalLayout>
    )
  }

  return (
    <FahrerportalLayout title="Statistiken">
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link href="/fahrerportal/touren">
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

        {/* Gesamtübersicht */}
        <Card className="border-gray-100 shadow-sm mb-6">
          <CardHeader className="border-b border-gray-50 bg-gray-50/30 pb-3">
            <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary-blue" />
              Gesamtübersicht
            </CardTitle>
            <CardDescription>Alle eingereichten Arbeitsnachweise</CardDescription>
          </CardHeader>
          <CardContent className="p-4">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-gray-900">{totalStats.total}</p>
                <p className="text-xs text-gray-500">Gesamt</p>
              </div>
              <div className="text-center p-3 bg-emerald-50 rounded-lg">
                <p className="text-2xl font-bold text-emerald-600">{totalStats.approved}</p>
                <p className="text-xs text-gray-500">Genehmigt</p>
              </div>
              <div className="text-center p-3 bg-amber-50 rounded-lg">
                <p className="text-2xl font-bold text-amber-600">{totalStats.pending}</p>
                <p className="text-xs text-gray-500">Ausstehend</p>
              </div>
              <div className="text-center p-3 bg-red-50 rounded-lg">
                <p className="text-2xl font-bold text-red-600">{totalStats.rejected}</p>
                <p className="text-xs text-gray-500">Abgelehnt</p>
              </div>
              <div className="text-center p-3 bg-blue-50 rounded-lg col-span-2 sm:col-span-1">
                <p className="text-2xl font-bold text-blue-600">{totalStats.totalKm.toLocaleString('de-DE')}</p>
                <p className="text-xs text-gray-500">km gesamt</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Monatsübersicht */}
        {monthStats.length > 0 && (
          <Card className="border-gray-100 shadow-sm mb-6">
            <CardHeader className="border-b border-gray-50 bg-gray-50/30 pb-3">
              <CardTitle className="text-base font-medium text-gray-700 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-500" />
                Monatsübersicht
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {monthStats.slice(0, 6).map((month) => (
                  <button
                    key={month.month}
                    onClick={() => {
                      setSelectedMonth(selectedMonth === month.month ? null : month.month)
                      setCurrentPage(1)
                    }}
                    className={`p-3 rounded-lg border transition-all text-left ${
                      selectedMonth === month.month
                        ? 'border-primary-blue bg-blue-50/50 ring-1 ring-primary-blue'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-gray-900">{month.label}</span>
                      <span className="text-sm font-bold text-gray-700">{month.total}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="flex items-center gap-1">
                        <CheckCircle className="h-3 w-3 text-emerald-600" />
                        {month.approved}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-amber-600" />
                        {month.pending}
                      </span>
                      {month.rejected > 0 && (
                        <span className="flex items-center gap-1">
                          <XCircle className="h-3 w-3 text-red-600" />
                          {month.rejected}
                        </span>
                      )}
                      <span className="text-gray-500 ml-auto">
                        {month.km.toLocaleString('de-DE')} km
                      </span>
                    </div>
                  </button>
                ))}
              </div>
              {selectedMonth && (
                <div className="mt-3 text-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedMonth(null)
                      setCurrentPage(1)
                    }}
                    className="text-gray-500"
                  >
                    Filter zurücksetzen
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Arbeitsnachweise-Liste */}
        <Card className="border-gray-100 shadow-sm">
          <CardHeader className="border-b border-gray-50 bg-gray-50/30 pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-medium text-gray-700 flex items-center gap-2">
                <FileText className="h-4 w-4 text-gray-500" />
                Arbeitsnachweise
                {selectedMonth && (
                  <Badge variant="outline" className="ml-2 bg-blue-50 text-blue-700">
                    {formatMonthLabel(selectedMonth)}
                  </Badge>
                )}
              </CardTitle>
              <span className="text-sm text-gray-500">
                {sortedNachweise.length} Einträge
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {sortedNachweise.length === 0 ? (
              <div className="p-8">
                <EmptyState
                  title="Keine Arbeitsnachweise gefunden"
                  description={selectedMonth
                    ? "In diesem Monat wurden keine Arbeitsnachweise eingereicht."
                    : "Sie haben noch keine Arbeitsnachweise eingereicht."
                  }
                  icon="car"
                />
              </div>
            ) : (
              <>
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
                      {paginatedNachweise.map((nachweis) => (
                        <TableRow key={nachweis.id} className="hover:bg-gray-50/50">
                          <TableCell className="font-medium">{nachweis.tour_nr}</TableCell>
                          <TableCell>{formatDate(nachweis.datum)}</TableCell>
                          <TableCell className="text-right">{nachweis.gefahrene_km}</TableCell>
                          <TableCell>{getStatusBadge(nachweis.status, nachweis.ist_ruecklaufer)}</TableCell>
                          <TableCell className="text-right">
                            {nachweis.beleg_url ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleViewBeleg(nachweis)}
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
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="p-4 border-t border-gray-100 flex items-center justify-between">
                    <span className="text-sm text-gray-500">
                      Seite {currentPage} von {totalPages}
                    </span>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Beleg Dialog */}
      {selectedNachweis && (
        <PDFViewerDialog
          open={showBelegDialog}
          onOpenChange={setShowBelegDialog}
          tourNr={selectedNachweis.tour_nr}
          datum={selectedNachweis.datum}
          typ="arbeitsnachweis"
          belegUrl={selectedNachweis.beleg_url}
        />
      )}
    </FahrerportalLayout>
  )
}
