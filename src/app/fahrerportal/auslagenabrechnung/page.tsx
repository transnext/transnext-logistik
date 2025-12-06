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
import { ArrowLeft, FileText, Euro, Clock, CheckCircle, XCircle, CreditCard } from "lucide-react"
import { getCurrentUser, getUserProfile, getAuslagennachweiseByUser } from "@/lib/api"

interface Auslage {
  id: number
  tourNr: string
  kennzeichen: string
  datum: string
  startort: string
  zielort: string
  belegart: string
  kosten: string
  status?: string
  belegUrl?: string
}

export default function AuslagenabrechnungPage() {
  const router = useRouter()
  const [fahrerName, setFahrerName] = useState("")
  const [selectedMonth, setSelectedMonth] = useState("")
  const [auslagen, setAuslagen] = useState<Auslage[]>([])
  const [gesamtKosten, setGesamtKosten] = useState(0)
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

      // Lade Auslagen
      await loadAuslagen(user.id, currentMonth)
      setIsLoading(false)
    } catch (error) {
      console.error("Auth/Load Fehler:", error)
      router.push("/fahrerportal")
    }
  }

  useEffect(() => {
    if (selectedMonth && !isLoading) {
      reloadAuslagen()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth])

  const reloadAuslagen = async () => {
    try {
      const user = await getCurrentUser()
      if (user) {
        await loadAuslagen(user.id, selectedMonth)
      }
    } catch (error) {
      console.error("Fehler beim Neuladen:", error)
    }
  }

  const loadAuslagen = async (userId: string, month: string) => {
    try {
      const auslagennachweise = await getAuslagennachweiseByUser(userId)

      // Filter nach Monat
      const filtered = auslagennachweise.filter((item) => {
        return item.datum.startsWith(month)
      })

      // Konvertiere zu lokalem Format
      const convertedAuslagen = filtered.map((a) => ({
        id: a.id,
        tourNr: a.tour_nr,
        kennzeichen: a.kennzeichen,
        datum: a.datum,
        startort: a.startort,
        zielort: a.zielort,
        belegart: a.belegart,
        kosten: a.kosten.toString(),
        status: a.status,
        belegUrl: a.beleg_url
      }))

      setAuslagen(convertedAuslagen)

      // Berechne Gesamtkosten
      const gesamt = convertedAuslagen.reduce((sum, auslage) => {
        return sum + (Number.parseFloat(auslage.kosten) || 0)
      }, 0)
      setGesamtKosten(gesamt)
    } catch (error) {
      console.error("Fehler beim Laden der Auslagen:", error)
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

  const formatCurrency = (amount: number | string) => {
    const num = typeof amount === 'string' ? Number.parseFloat(amount) : amount
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR'
    }).format(num)
  }

  const getBelegartBadge = (belegart: string) => {
    const map: Record<string, { label: string; color: string }> = {
      tankbeleg: { label: "Tankbeleg", color: "bg-blue-100 text-blue-800" },
      waschbeleg: { label: "Waschbeleg", color: "bg-cyan-100 text-cyan-800" },
      bahnticket: { label: "Bahnticket", color: "bg-purple-100 text-purple-800" },
      bc50: { label: "BC50", color: "bg-violet-100 text-violet-800" },
      taxi: { label: "Taxi", color: "bg-yellow-100 text-yellow-800" },
      uber: { label: "Uber", color: "bg-green-100 text-green-800" }
    }

    const info = map[belegart] || { label: belegart, color: "bg-gray-100 text-gray-800" }

    return (
      <Badge className={`${info.color} border-0`}>
        {info.label}
      </Badge>
    )
  }

  const getStatusBadge = (status?: string) => {
    const currentStatus = status || "pending"
    
    // Für Fahrer: "billed" und "paid" beide als "Überwiesen" anzeigen
    if (currentStatus === "paid" || currentStatus === "billed") {
      return (
        <Badge className="bg-purple-100 text-purple-800 border-purple-200 flex items-center gap-1 w-fit">
          <CreditCard className="h-3 w-3" />
          Überwiesen
        </Badge>
      )
    }
    
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
                  <CardTitle className="text-2xl text-primary-blue">Auslagenabrechnung</CardTitle>
                  <CardDescription>
                    Übersicht aller Auslagen pro Monat
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
              {auslagen.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Keine Auslagen gefunden
                  </h3>
                  <p className="text-gray-600">
                    Für den gewählten Monat sind keine Auslagennachweise vorhanden.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Datum</TableHead>
                          <TableHead>Tour-Nr.</TableHead>
                          <TableHead>Kennzeichen</TableHead>
                          <TableHead>Strecke</TableHead>
                          <TableHead>Belegart</TableHead>
                          <TableHead className="text-right">Kosten</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-center">Beleg</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {auslagen.map((auslage) => (
                          <TableRow key={auslage.id}>
                            <TableCell>{formatDate(auslage.datum)}</TableCell>
                            <TableCell className="font-medium">{auslage.tourNr}</TableCell>
                            <TableCell>{auslage.kennzeichen}</TableCell>
                            <TableCell className="text-sm">
                              {auslage.startort} → {auslage.zielort}
                            </TableCell>
                            <TableCell>{getBelegartBadge(auslage.belegart)}</TableCell>
                            <TableCell className="text-right font-semibold">
                              {formatCurrency(auslage.kosten)}
                            </TableCell>
                            <TableCell>
                              {getStatusBadge(auslage.status)}
                            </TableCell>
                            <TableCell className="text-center">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedBeleg({ tourNr: auslage.tourNr, datum: auslage.datum, belegUrl: auslage.belegUrl })
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

                  {/* Gesamtkosten */}
                  <div className="border-t pt-6">
                    <Card className="bg-gradient-to-r from-orange-50 to-amber-50 border-orange-200">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-3 rounded-lg bg-orange-100">
                              <Euro className="h-6 w-6 text-orange-700" />
                            </div>
                            <div>
                              <p className="text-sm text-gray-600">Gesamtkosten Auslagen</p>
                              <p className="text-3xl font-bold text-orange-700">
                                {formatCurrency(gesamtKosten)}
                              </p>
                            </div>
                          </div>
                          <div className="text-right text-sm text-gray-600">
                            <p>{auslagen.length} {auslagen.length === 1 ? 'Auslage' : 'Auslagen'}</p>
                            <p className="text-xs mt-1">Zur Erstattung</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="text-sm text-gray-500 mt-4 p-4 bg-blue-50 rounded-lg">
                    <p className="font-medium text-gray-700 mb-2">Hinweis:</p>
                    <p>Die Erstattung der Auslagen erfolgt innerhalb einer Woche nach Genehmigung. Den Status Ihrer Auslagen können Sie hier im Portal verfolgen.</p>
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
          typ="auslagennachweis"
          belegUrl={selectedBeleg.belegUrl}
        />
      )}
    </div>
  )
}
