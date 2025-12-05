"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { PDFViewerDialog } from "@/components/pdf-viewer-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { TransNextLogo } from "@/components/ui/logo"
import { ArrowLeft, FileText, Euro, Clock, CheckCircle, XCircle, RefreshCw } from "lucide-react"
import { getCurrentUser, getUserProfile, getArbeitsnachweiseByUser } from "@/lib/api"
import { calculateTourVerdienst, calculateMonthlyPayout, MONTHLY_LIMIT } from "@/lib/salary-calculator"
import { getMonatsueberschuss } from "@/lib/admin-api"

interface Tour {
  id: number
  tourNr: string
  datum: string
  gefahreneKm: string
  wartezeit: string
  verdienst?: number
  status?: string
  belegUrl?: string
  istRuecklaufer?: boolean
}

export default function MonatsabrechnungPage() {
  const router = useRouter()
  const [fahrerName, setFahrerName] = useState("")
  const [selectedMonth, setSelectedMonth] = useState("")
  const [touren, setTouren] = useState<Tour[]>([])
  const [gesamtVerdienst, setGesamtVerdienst] = useState(0)
  const [vormonatUeberschuss, setVormonatUeberschuss] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [showBelegDialog, setShowBelegDialog] = useState(false)
  const [selectedBeleg, setSelectedBeleg] = useState<{ tourNr: string; datum: string; belegUrl?: string } | null>(null)

  useEffect(() => {
    checkAuthAndLoadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const checkAuthAndLoadData = async () => {
    try {
      const user = await getCurrentUser()
      if (!user) {
        router.push("/fahrerportal")
        return
      }

      const profile = await getUserProfile(user.id)
      if (profile.role !== 'fahrer') {
        router.push("/fahrerportal")
        return
      }

      setFahrerName(profile.full_name)

      // Setze aktuellen Monat als Standard
      const now = new Date()
      const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
      setSelectedMonth(currentMonth)

      // Lade Touren des aktuellen Monats
      await loadTouren(user.id, currentMonth)

      // Berechne Überschuss des Vormonats
      await loadVormonatUeberschuss(user.id, currentMonth)

      setIsLoading(false)
    } catch (error) {
      console.error("Auth/Load Fehler:", error)
      router.push("/fahrerportal")
    }
  }

  useEffect(() => {
    if (selectedMonth && !isLoading) {
      reloadTouren()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth])

  const reloadTouren = async () => {
    try {
      const user = await getCurrentUser()
      if (user) {
        await loadTouren(user.id, selectedMonth)
      }
    } catch (error) {
      console.error("Fehler beim Neuladen:", error)
    }
  }

  const loadTouren = async (userId: string, month: string) => {
    try {
      const arbeitsnachweise = await getArbeitsnachweiseByUser(userId)

      // Filter nach Monat
      const filtered = arbeitsnachweise.filter((item) => {
        return item.datum.startsWith(month)
      })

      // Berechne Verdienst für jede Tour mit offizieller KM-Range
      const tourenMitVerdienst = filtered.map((tour) => {
        const km = tour.gefahrene_km || 0
        // Rückläufer werden mit 0€ berechnet
        const verdienst = tour.ist_ruecklaufer ? 0 : calculateTourVerdienst(km, tour.wartezeit)

        return {
          id: tour.id,
          tourNr: tour.tour_nr,
          datum: tour.datum,
          gefahreneKm: tour.gefahrene_km.toString(),
          wartezeit: tour.wartezeit,
          status: tour.status,
          verdienst: verdienst,
          belegUrl: tour.beleg_url,
          istRuecklaufer: tour.ist_ruecklaufer
        }
      })

      setTouren(tourenMitVerdienst)

      // Berechne Gesamtverdienst
      const gesamt = tourenMitVerdienst.reduce((sum, tour) => sum + (tour.verdienst || 0), 0)
      setGesamtVerdienst(gesamt)
    } catch (error) {
      console.error("Fehler beim Laden der Touren:", error)
    }
  }

  const loadVormonatUeberschuss = async (userId: string, currentMonth: string) => {
    try {
      // Berechne Vormonat
      const [year, month] = currentMonth.split('-')
      const date = new Date(parseInt(year), parseInt(month) - 2, 1) // -2 weil Monat 0-basiert ist
      const vormonat = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

      // Prüfe zuerst, ob ein manueller Überschuss eingetragen wurde
      const manuellerUeberschuss = await getMonatsueberschuss(userId, vormonat)

      if (manuellerUeberschuss) {
        // Verwende den manuell eingetragenen Überschuss
        console.log(`Manueller Überschuss gefunden für ${vormonat}:`, manuellerUeberschuss.ueberschuss)
        setVormonatUeberschuss(manuellerUeberschuss.ueberschuss)
        return
      }

      // Kein manueller Überschuss -> berechne aus Touren
      const arbeitsnachweise = await getArbeitsnachweiseByUser(userId)

      // Filter nach Vormonat
      const vormonatTouren = arbeitsnachweise.filter((item) => {
        return item.datum.startsWith(vormonat)
      })

      // Berechne Gesamtverdienst des Vormonats
      const vormonatGesamt = vormonatTouren.reduce((sum, tour) => {
        const km = tour.gefahrene_km || 0
        // Rückläufer werden mit 0€ berechnet
        const verdienst = tour.ist_ruecklaufer ? 0 : calculateTourVerdienst(km, tour.wartezeit)
        return sum + verdienst
      }, 0)

      // Berechne Überschuss
      const { ueberschuss } = calculateMonthlyPayout(vormonatGesamt)
      setVormonatUeberschuss(ueberschuss)
    } catch (error) {
      console.error("Fehler beim Laden des Vormonat-Überschusses:", error)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount)
  }

  const getWartezeitText = (wartezeit: string) => {
    if (!wartezeit || wartezeit === "keine") return "-"
    const map: Record<string, string> = {
      "30-60": "30-60 Min.",
      "60-90": "60-90 Min.",
      "90-120": "90-120 Min."
    }
    return map[wartezeit] || wartezeit
  }

  const getStatusBadge = (status?: string, istRuecklaufer?: boolean) => {
    // Retoure hat Priorität über alle anderen Status
    if (istRuecklaufer) {
      return (
        <Badge className="bg-orange-100 text-orange-800 border-orange-200 flex items-center gap-1 w-fit">
          <RefreshCw className="h-3 w-3" />
          Retoure
        </Badge>
      )
    }

    const currentStatus = status || "pending"

    if (currentStatus === "approved") {
      return (
        <Badge className="bg-green-100 text-green-800 border-green-200 flex items-center gap-1 w-fit">
          <CheckCircle className="h-3 w-3" />
          Genehmigt
        </Badge>
      )
    }

    if (currentStatus === "rejected") {
      return (
        <Badge className="bg-red-100 text-red-800 border-red-200 flex items-center gap-1 w-fit">
          <XCircle className="h-3 w-3" />
          Abgelehnt
        </Badge>
      )
    }

    return (
      <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 flex items-center gap-1 w-fit">
        <Clock className="h-3 w-3" />
        Ausstehend
      </Badge>
    )
  }

  const generateMonthOptions = () => {
    const options = []
    const now = new Date()
    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      const label = date.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })
      options.push({ value, label })
    }
    return options
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <TransNextLogo width={150} height={45} showText={true} />
              <div className="h-8 w-px bg-gray-300" />
              <h1 className="text-xl font-semibold text-primary-blue">Fahrerportal</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <Link href="/fahrerportal/dashboard">
          <Button variant="ghost" className="mb-6 text-primary-blue hover:bg-blue-50">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Zurück zum Dashboard
          </Button>
        </Link>

        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-gray-600">Lade Daten...</p>
          </div>
        ) : (
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <CardTitle className="text-2xl text-primary-blue">Monatsabrechnung</CardTitle>
                  <CardDescription>
                    Übersicht aller Touren und Verdienst
                  </CardDescription>
                </div>
                <div className="w-full md:w-64">
                  <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                    <SelectTrigger>
                      <SelectValue placeholder="Monat wählen" />
                    </SelectTrigger>
                    <SelectContent>
                      {generateMonthOptions().map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {touren.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Keine Touren gefunden
                  </h3>
                  <p className="text-gray-600">
                    Für den gewählten Monat sind keine Arbeitsnachweise vorhanden.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Tour-Nr.</TableHead>
                          <TableHead>Datum</TableHead>
                          <TableHead className="text-right">Gefahrene KM</TableHead>
                          <TableHead>Wartezeit</TableHead>
                          <TableHead className="text-right">Verdienst</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-center">Beleg</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {touren.map((tour) => (
                          <TableRow key={tour.id}>
                            <TableCell className="font-medium">{tour.tourNr}</TableCell>
                            <TableCell>{formatDate(tour.datum)}</TableCell>
                            <TableCell className="text-right">{tour.gefahreneKm} km</TableCell>
                            <TableCell>{getWartezeitText(tour.wartezeit)}</TableCell>
                            <TableCell className="text-right font-semibold text-green-700">
                              {formatCurrency(tour.verdienst || 0)}
                            </TableCell>
                            <TableCell>
                              {getStatusBadge(tour.status, tour.istRuecklaufer)}
                            </TableCell>
                            <TableCell className="text-center">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedBeleg({ tourNr: tour.tourNr, datum: tour.datum, belegUrl: tour.belegUrl })
                                  setShowBelegDialog(true)
                                }}
                                title="Beleg ansehen"
                              >
                                <FileText className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Überschuss Vormonat */}
                  {vormonatUeberschuss > 0 && (
                    <div className="border-t pt-6">
                      <Card className="bg-gradient-to-r from-orange-50 to-amber-50 border-orange-200">
                        <CardContent className="p-6">
                          <div className="flex items-center gap-3">
                            <div className="p-3 rounded-lg bg-orange-100">
                              <Euro className="h-6 w-6 text-orange-700" />
                            </div>
                            <div>
                              <p className="text-sm text-gray-600">Überschuss aus Vormonat</p>
                              <p className="text-2xl font-bold text-orange-700">
                                {formatCurrency(vormonatUeberschuss)}
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                Verdienst über {formatCurrency(MONTHLY_LIMIT)} (Minijob-Grenze)
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  )}

                  {/* Gesamtverdienst */}
                  <div className="border-t pt-6">
                    <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-3 rounded-lg bg-green-100">
                              <Euro className="h-6 w-6 text-green-700" />
                            </div>
                            <div>
                              <p className="text-sm text-gray-600">Gesamtverdienst</p>
                              <p className="text-3xl font-bold text-green-700">
                                {formatCurrency(gesamtVerdienst)}
                              </p>
                              {gesamtVerdienst > MONTHLY_LIMIT && (
                                <div className="mt-2 text-sm">
                                  <p className="text-gray-600">
                                    Auszahlung: <span className="font-semibold text-green-700">{formatCurrency(MONTHLY_LIMIT)}</span>
                                  </p>
                                  <p className="text-orange-600">
                                    Überschuss: <span className="font-semibold">{formatCurrency(gesamtVerdienst - MONTHLY_LIMIT)}</span>
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="text-right text-sm text-gray-600">
                            <p>{touren.length} {touren.length === 1 ? 'Tour' : 'Touren'}</p>
                            <p className="text-xs mt-1">Vorläufige Berechnung</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="text-sm text-gray-500 mt-4 p-4 bg-blue-50 rounded-lg">
                    <p className="font-medium text-gray-700 mb-2">Hinweis zur Berechnung:</p>
                    <p>Der angezeigte Verdienst wird nach der offiziellen KM-Range-Tabelle berechnet. Wartezeiten werden zusätzlich vergütet (10€ pro Stunde: 30-60 Min: +10€, 60-90 Min: +15€, 90-120 Min: +20€).</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </main>

      {/* Beleg Dialog */}
      {selectedBeleg && (
        <PDFViewerDialog
          open={showBelegDialog}
          onOpenChange={setShowBelegDialog}
          tourNr={selectedBeleg.tourNr}
          datum={selectedBeleg.datum}
          typ="arbeitsnachweis"
          belegUrl={selectedBeleg.belegUrl}
        />
      )}
    </div>
  )
}
