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
import { FahrerportalLayout } from "@/components/fahrerportal/FahrerportalLayout"
import { ArrowLeft, FileText, Euro } from "lucide-react"
import { getCurrentUser, canAccessFahrerportal, getUserProfile, getArbeitsnachweiseByUser } from "@/lib/api"
import { calculateTourVerdienst, calculateMonthlyPayout } from "@/lib/salary-calculator"
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

  useEffect(() => {
    checkAuthAndLoadData()
  }, [])

  const checkAuthAndLoadData = async () => {
    try {
      const user = await getCurrentUser()
      if (!user) {
        router.push("/fahrerportal")
        return
      }
      
      const accessResult = await canAccessFahrerportal(user.id)
      
      if (!accessResult.canAccess) {
        router.push("/fahrerportal")
        return
      }
      
      const name = accessResult.fahrer 
        ? `${accessResult.fahrer.vorname} ${accessResult.fahrer.nachname}`
        : 'Fahrer'
      setFahrerName(name)
      
      const now = new Date()
      const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
      setSelectedMonth(currentMonth)
      
      await loadTouren(user.id, currentMonth, name)
      await loadVormonatUeberschuss(user.id, currentMonth, name)
      
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
  }, [selectedMonth])

  const reloadTouren = async () => {
    try {
      const user = await getCurrentUser()
      if (user) {
        await loadTouren(user.id, selectedMonth, fahrerName)
        await loadVormonatUeberschuss(user.id, selectedMonth, fahrerName)
      }
    } catch (error) {
      console.error("Reload Fehler:", error)
    }
  }

  const loadTouren = async (userId: string, month: string, fahrer: string) => {
    const nachweise = await getArbeitsnachweiseByUser(userId)
    const filtered = nachweise.filter((n: any) => n.datum.startsWith(month))
    
    const mapped = filtered.map((n: any) => ({
      id: n.id,
      tourNr: n.tour_nr,
      datum: n.datum,
      gefahreneKm: n.gefahrene_km?.toString() || "0",
      wartezeit: n.wartezeit || "",
      verdienst: calculateTourVerdienst(
        Number(n.gefahrene_km) || 0,
        n.wartezeit || "",
        fahrer
      ),
      status: n.status,
      belegUrl: n.beleg_url,
      istRuecklaufer: n.ist_ruecklaufer
    }))
    
    setTouren(mapped)
    setGesamtVerdienst(mapped.reduce((sum, t) => sum + (t.verdienst || 0), 0))
  }

  const loadVormonatUeberschuss = async (userId: string, month: string, fahrer: string) => {
    try {
      const [year, mon] = month.split('-').map(Number)
      const prevDate = new Date(year, mon - 2, 1)
      const vormonat = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`
      const result = await getMonatsueberschuss(fahrer, vormonat)
      setVormonatUeberschuss(result?.ueberschuss || 0)
    } catch {
      setVormonatUeberschuss(0)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(amount)
  }

  const generateMonthOptions = () => {
    const options = []
    const now = new Date()
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const label = d.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })
      options.push({ value, label })
    }
    return options
  }

  const payout = calculateMonthlyPayout(gesamtVerdienst, vormonatUeberschuss)

  if (isLoading) {
    return (
      <FahrerportalLayout title="Monatsabrechnung">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-blue" />
        </div>
      </FahrerportalLayout>
    )
  }

  return (
    <FahrerportalLayout title="Monatsabrechnung">
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 max-w-4xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <Link href="/fahrerportal/dashboard">
            <Button variant="ghost" size="sm" className="text-gray-600">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Zurück
            </Button>
          </Link>
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Monat wählen" />
            </SelectTrigger>
            <SelectContent>
              {generateMonthOptions().map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Card className="border-gray-100 shadow-sm mb-6">
          <CardHeader className="bg-gray-50/30 border-b border-gray-50">
            <CardTitle className="text-lg flex items-center gap-2">
              <Euro className="h-5 w-5 text-primary-blue" />
              Verdienst-Übersicht
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-500">Touren</p>
                <p className="text-xl font-bold">{touren.length}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Brutto-Verdienst</p>
                <p className="text-xl font-bold">{formatCurrency(gesamtVerdienst)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Vormonat-Überschuss</p>
                <p className="text-xl font-bold text-amber-600">{formatCurrency(vormonatUeberschuss)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Auszahlung</p>
                <p className="text-xl font-bold text-emerald-600">{formatCurrency(payout.ausgeZahlt)}</p>
              </div>
            </div>
            {payout.ueberschuss > 0 && (
              <div className="mt-4 p-3 bg-amber-50 rounded-lg text-sm text-amber-800">
                Überschuss für nächsten Monat: {formatCurrency(payout.ueberschuss)}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-gray-100 shadow-sm">
          <CardHeader className="bg-gray-50/30 border-b border-gray-50">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary-blue" />
              Touren im Monat
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {touren.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                Keine Touren in diesem Monat
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50/50">
                      <TableHead>Tour-Nr.</TableHead>
                      <TableHead>Datum</TableHead>
                      <TableHead className="text-right">KM</TableHead>
                      <TableHead className="text-right">Verdienst</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {touren.map((tour) => (
                      <TableRow key={tour.id}>
                        <TableCell className="font-medium">{tour.tourNr}</TableCell>
                        <TableCell>{formatDate(tour.datum)}</TableCell>
                        <TableCell className="text-right">{tour.gefahreneKm}</TableCell>
                        <TableCell className="text-right">{formatCurrency(tour.verdienst || 0)}</TableCell>
                        <TableCell>
                          {tour.status === 'approved' ? (
                            <Badge variant="outline" className="bg-emerald-50 text-emerald-700">Genehmigt</Badge>
                          ) : tour.status === 'pending' ? (
                            <Badge variant="outline" className="bg-amber-50 text-amber-700">Ausstehend</Badge>
                          ) : (
                            <Badge variant="outline">{tour.status}</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </FahrerportalLayout>
  )
}
