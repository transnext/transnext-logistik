"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { BelegDialog } from "@/components/beleg-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { TransNextLogo } from "@/components/ui/logo"
import { LogOut, FileText, Search, Clock, CheckCircle, XCircle, TrendingUp, Euro, Download, CreditCard, Users, UserPlus, UserX, Eye, EyeOff, Edit } from "lucide-react"
import {
  getCurrentUser,
  getUserProfile,
  signOut,
  updateArbeitsnachweisStatus,
  updateAuslagennachweisStatus
} from "@/lib/api"
import {
  getAllArbeitsnachweiseAdmin,
  getAllAuslagennachweiseAdmin,
  getAllFahrerAdmin,
  getAdminStatistics,
  createFahrer,
  updateFahrerStatus,
  updateFahrer
} from "@/lib/admin-api"

interface Tour {
  id: number
  tourNr: string
  datum: string
  gefahreneKm: string
  wartezeit: string
  fahrer: string
  status: string
  erstelltAm: string
  beleg?: File | null
}

interface Auslage {
  id: number
  tourNr: string
  kennzeichen: string
  datum: string
  startort: string
  zielort: string
  belegart: string
  kosten: string
  fahrer: string
  status: string
  erstelltAm: string
  beleg?: File | null
}

interface Fahrer {
  id: number
  vorname: string
  nachname: string
  geburtsdatum: string
  adresse: string
  plz: string
  ort: string
  fuehrerscheinNr: string
  fuehrerscheinDatum: string
  ausstellendeBehoerde: string
  fuehrerscheinklassen: string[]
  ausweisnummer: string
  ausweisAblauf: string
  benutzername: string
  passwort: string
  status: 'aktiv' | 'inaktiv'
  erstelltAm: string
}

export default function AdminDashboardPage() {
  const router = useRouter()
  const [adminName, setAdminName] = useState("")
  const [activeTab, setActiveTab] = useState<"touren" | "auslagen" | "fahrer">("touren")
  const [touren, setTouren] = useState<Tour[]>([])
  const [auslagen, setAuslagen] = useState<Auslage[]>([])
  const [fahrer, setFahrer] = useState<Fahrer[]>([])
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedKW, setSelectedKW] = useState<string>("")
  const [showAddFahrer, setShowAddFahrer] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showEditFahrer, setShowEditFahrer] = useState(false)
  const [editingFahrer, setEditingFahrer] = useState<Partial<Fahrer> | null>(null)
  const [showBelegDialog, setShowBelegDialog] = useState(false)
  const [selectedBeleg, setSelectedBeleg] = useState<{ tourNr: string; datum: string; typ: "arbeitsnachweis" | "auslagennachweis" } | null>(null)

  const [newFahrer, setNewFahrer] = useState<Partial<Fahrer>>({
    vorname: "",
    nachname: "",
    geburtsdatum: "",
    adresse: "",
    plz: "",
    ort: "",
    fuehrerscheinNr: "",
    fuehrerscheinDatum: "",
    ausstellendeBehoerde: "",
    fuehrerscheinklassen: [],
    ausweisnummer: "",
    ausweisAblauf: "",
    benutzername: "",
    passwort: "",
    status: "aktiv"
  })

  const [isLoading, setIsLoading] = useState(true)
  const [stats, setStats] = useState<{
    totalTouren: number
    pendingTouren: number
    approvedTouren: number
    billedTouren: number
    rejectedTouren: number
    totalKilometers: number
    totalAuslagen: number
    pendingAuslagen: number
    approvedAuslagen: number
    paidAuslagen: number
    rejectedAuslagen: number
    openAuslagenAmount: number
    paidAuslagenAmount: number
    totalFahrer: number
    activeFahrer: number
    inactiveFahrer: number
  } | null>(null)

  useEffect(() => {
    checkAuthAndLoadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const checkAuthAndLoadData = async () => {
    try {
      const user = await getCurrentUser()

      if (!user) {
        router.push("/admin")
        return
      }

      const profile = await getUserProfile(user.id)

      if (profile.role !== 'admin') {
        router.push("/admin")
        return
      }

      setAdminName(profile.full_name)

      // Lade alle Daten
      await loadAllData()
      setIsLoading(false)
    } catch (error) {
      console.error("Auth/Load Fehler:", error)
      router.push("/admin")
    }
  }

  const loadAllData = async () => {
    try {
      const [tourenData, auslagenData, fahrerData, statistiken] = await Promise.all([
        getAllArbeitsnachweiseAdmin(),
        getAllAuslagennachweiseAdmin(),
        getAllFahrerAdmin(),
        getAdminStatistics()
      ])

      // Konvertiere Daten ins alte Format für minimale Änderungen
      setTouren(tourenData.map((t) => ({
        id: t.id,
        tourNr: t.tour_nr,
        datum: t.datum,
        gefahreneKm: t.gefahrene_km.toString(),
        wartezeit: t.wartezeit,
        fahrer: t.fahrer_name,
        status: t.status,
        erstelltAm: t.created_at,
      })))

      setAuslagen(auslagenData.map((a) => ({
        id: a.id,
        tourNr: a.tour_nr,
        kennzeichen: a.kennzeichen,
        datum: a.datum,
        startort: a.startort,
        zielort: a.zielort,
        belegart: a.belegart,
        kosten: a.kosten.toString(),
        fahrer: a.fahrer_name,
        status: a.status,
        erstelltAm: a.created_at,
      })))

      setFahrer(fahrerData.map((f) => ({
        id: f.id,
        vorname: f.vorname,
        nachname: f.nachname,
        geburtsdatum: f.geburtsdatum,
        adresse: f.adresse,
        plz: f.plz,
        ort: f.ort,
        fuehrerscheinNr: f.fuehrerschein_nr,
        fuehrerscheinDatum: f.fuehrerschein_datum,
        ausstellendeBehoerde: f.ausstellende_behoerde,
        fuehrerscheinklassen: f.fuehrerscheinklassen,
        ausweisnummer: f.ausweisnummer,
        ausweisAblauf: f.ausweis_ablauf,
        benutzername: '', // Wird nicht mehr verwendet
        passwort: '', // Wird nicht mehr verwendet
        status: f.status,
        erstelltAm: f.created_at || new Date().toISOString(),
      })))

      setStats(statistiken)
    } catch (error) {
      console.error("Fehler beim Laden der Daten:", error)
    }
  }

  const handleLogout = async () => {
    try {
      await signOut()
      router.push("/admin")
    } catch (error) {
      console.error("Logout Fehler:", error)
    }
  }

  const [addFahrerLoading, setAddFahrerLoading] = useState(false)
  const [addFahrerError, setAddFahrerError] = useState("")

  const handleAddFahrer = async (e: React.FormEvent) => {
    e.preventDefault()
    setAddFahrerError("")
    setAddFahrerLoading(true)

    try {
      // Email muss ausgefüllt sein
      if (!newFahrer.benutzername) {
        throw new Error("E-Mail ist erforderlich")
      }
      if (!newFahrer.passwort) {
        throw new Error("Passwort ist erforderlich")
      }

      await createFahrer({
        email: newFahrer.benutzername, // Wird jetzt als E-Mail verwendet
        password: newFahrer.passwort,
        vorname: newFahrer.vorname || "",
        nachname: newFahrer.nachname || "",
        geburtsdatum: newFahrer.geburtsdatum || "",
        adresse: newFahrer.adresse || "",
        plz: newFahrer.plz || "",
        ort: newFahrer.ort || "",
        fuehrerschein_nr: newFahrer.fuehrerscheinNr || "",
        fuehrerschein_datum: newFahrer.fuehrerscheinDatum || "",
        ausstellende_behoerde: newFahrer.ausstellendeBehoerde || "",
        fuehrerscheinklassen: newFahrer.fuehrerscheinklassen || [],
        ausweisnummer: newFahrer.ausweisnummer || "",
        ausweis_ablauf: newFahrer.ausweisAblauf || "",
      })

      alert(`Fahrer ${newFahrer.vorname} ${newFahrer.nachname} erfolgreich angelegt!`)

      // Reset Form
      setNewFahrer({
        vorname: "",
        nachname: "",
        geburtsdatum: "",
        adresse: "",
        plz: "",
        ort: "",
        fuehrerscheinNr: "",
        fuehrerscheinDatum: "",
        ausstellendeBehoerde: "",
        fuehrerscheinklassen: [],
        ausweisnummer: "",
        ausweisAblauf: "",
        benutzername: "",
        passwort: "",
        status: "aktiv"
      })
      setShowAddFahrer(false)

      // Reload Daten
      await loadAllData()
      setAddFahrerLoading(false)
    } catch (err) {
      console.error("Fehler beim Anlegen:", err)
      setAddFahrerError(err instanceof Error ? err.message : "Fehler beim Anlegen des Fahrers")
      setAddFahrerLoading(false)
    }
  }

  const toggleFahrerStatus = async (id: number) => {
    const fahrerToToggle = fahrer.find(f => f.id === id)
    if (!fahrerToToggle) return

    try {
      const newStatus = fahrerToToggle.status === 'aktiv' ? 'inaktiv' : 'aktiv'
      await updateFahrerStatus(id.toString(), newStatus)
      await loadAllData() // Reload
    } catch (error) {
      console.error("Fehler beim Ändern des Status:", error)
      alert("Fehler beim Ändern des Fahrer-Status")
    }
  }

  const handleKlassenChange = (klasse: string, checked: boolean) => {
    const current = newFahrer.fuehrerscheinklassen || []
    if (checked) {
      setNewFahrer({ ...newFahrer, fuehrerscheinklassen: [...current, klasse] })
    } else {
      setNewFahrer({ ...newFahrer, fuehrerscheinklassen: current.filter(k => k !== klasse) })
    }
  }

  const handleEditKlassenChange = (klasse: string, checked: boolean) => {
    if (!editingFahrer) return
    const current = editingFahrer.fuehrerscheinklassen || []
    if (checked) {
      setEditingFahrer({ ...editingFahrer, fuehrerscheinklassen: [...current, klasse] })
    } else {
      setEditingFahrer({ ...editingFahrer, fuehrerscheinklassen: current.filter(k => k !== klasse) })
    }
  }

  const handleEditFahrer = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingFahrer || !editingFahrer.id) return

    try {
      await updateFahrer(editingFahrer.id, {
        vorname: editingFahrer.vorname,
        nachname: editingFahrer.nachname,
        geburtsdatum: editingFahrer.geburtsdatum,
        adresse: editingFahrer.adresse,
        plz: editingFahrer.plz,
        ort: editingFahrer.ort,
        fuehrerschein_nr: editingFahrer.fuehrerscheinNr,
        fuehrerschein_datum: editingFahrer.fuehrerscheinDatum,
        ausstellende_behoerde: editingFahrer.ausstellendeBehoerde,
        fuehrerscheinklassen: editingFahrer.fuehrerscheinklassen,
        ausweisnummer: editingFahrer.ausweisnummer,
        ausweis_ablauf: editingFahrer.ausweisAblauf,
      })

      alert(`Fahrer ${editingFahrer.vorname} ${editingFahrer.nachname} erfolgreich aktualisiert!`)
      setShowEditFahrer(false)
      setEditingFahrer(null)
      await loadAllData()
    } catch (err) {
      console.error("Fehler beim Aktualisieren:", err)
      alert("Fehler beim Aktualisieren des Fahrers")
    }
  }

  const updateTourStatus = async (id: number, newStatus: string) => {
    try {
      await updateArbeitsnachweisStatus(id, newStatus as 'pending' | 'approved' | 'rejected' | 'billed')
      await loadAllData() // Reload
    } catch (error) {
      console.error("Fehler beim Update:", error)
      alert("Fehler beim Aktualisieren des Status")
    }
  }

  const updateAuslageStatus = async (id: number, newStatus: string) => {
    try {
      await updateAuslagennachweisStatus(id, newStatus as 'pending' | 'approved' | 'rejected' | 'paid')
      await loadAllData() // Reload
    } catch (error) {
      console.error("Fehler beim Update:", error)
      alert("Fehler beim Aktualisieren des Status")
    }
  }

  const getStatusBadge = (status: string) => {
    if (status === "approved") {
      return (
        <Badge className="bg-green-100 text-green-800 border-green-200 flex items-center gap-1 w-fit">
          <CheckCircle className="h-3 w-3" />
          Genehmigt
        </Badge>
      )
    }

    if (status === "rejected") {
      return (
        <Badge className="bg-red-100 text-red-800 border-red-200 flex items-center gap-1 w-fit">
          <XCircle className="h-3 w-3" />
          Abgelehnt
        </Badge>
      )
    }

    if (status === "billed") {
      return (
        <Badge className="bg-blue-100 text-blue-800 border-blue-200 flex items-center gap-1 w-fit">
          <FileText className="h-3 w-3" />
          Abgerechnet
        </Badge>
      )
    }

    if (status === "paid") {
      return (
        <Badge className="bg-purple-100 text-purple-800 border-purple-200 flex items-center gap-1 w-fit">
          <CreditCard className="h-3 w-3" />
          Überwiesen
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  const formatCurrency = (amount: number | string) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR'
    }).format(num)
  }

  // Kalenderwoche berechnen
  const getWeekNumber = (date: Date): number => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
    const dayNum = d.getUTCDay() || 7
    d.setUTCDate(d.getUTCDate() + 4 - dayNum)
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
  }

  const getKWFromDate = (dateString: string): string => {
    const date = new Date(dateString)
    const year = date.getFullYear()
    const kw = getWeekNumber(date)
    return `${year}-KW${kw.toString().padStart(2, '0')}`
  }

  // Verfügbare KWs aus Touren generieren
  const getAvailableKWs = () => {
    const kws = new Set<string>()
    touren.forEach(tour => {
      kws.add(getKWFromDate(tour.datum))
    })
    return Array.from(kws).sort().reverse()
  }

  // KW-Export-Funktion
  const exportKW = () => {
    if (!selectedKW) {
      alert("Bitte wählen Sie eine Kalenderwoche aus")
      return
    }

    const kwTouren = touren.filter(tour =>
      getKWFromDate(tour.datum) === selectedKW && tour.status === "approved"
    )

    if (kwTouren.length === 0) {
      alert("Keine genehmigten Touren für diese KW gefunden")
      return
    }

    // CSV-Export
    let csv = "Tour-Nr.;Datum;KM;Wartezeit\n"
    kwTouren.forEach(tour => {
      const wartezeit = tour.wartezeit === "30-60" ? "30-60 Min." :
                       tour.wartezeit === "60-90" ? "60-90 Min." :
                       tour.wartezeit === "90-120" ? "90-120 Min." : "-"
      csv += `${tour.tourNr};${formatDate(tour.datum)};${tour.gefahreneKm};${wartezeit}\n`
    })

    // Download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", `Abrechnung_${selectedKW}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    // Touren als "abgerechnet" markieren
    const updatedTouren = touren.map(tour =>
      kwTouren.find(t => t.id === tour.id) ? { ...tour, status: "billed" } : tour
    )
    setTouren(updatedTouren)
    localStorage.setItem("arbeitsnachweise", JSON.stringify(updatedTouren))

    alert(`${kwTouren.length} Touren wurden exportiert und als abgerechnet markiert`)
  }

  // Filter Touren
  const filteredTouren = touren.filter(tour => {
    const matchesStatus = filterStatus === "all" || tour.status === filterStatus
    const matchesSearch =
      tour.tourNr.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tour.fahrer.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesStatus && matchesSearch
  })

  // Filter Auslagen
  const filteredAuslagen = auslagen.filter(auslage => {
    const matchesStatus = filterStatus === "all" || auslage.status === filterStatus
    const matchesSearch =
      auslage.tourNr.toLowerCase().includes(searchTerm.toLowerCase()) ||
      auslage.fahrer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      auslage.kennzeichen.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesStatus && matchesSearch
  })

  // Filter Fahrer
  const filteredFahrer = fahrer.filter(f => {
    const matchesStatus = filterStatus === "all" ||
                         (filterStatus === "aktiv" && f.status === "aktiv") ||
                         (filterStatus === "inaktiv" && f.status === "inaktiv")
    const matchesSearch =
      f.vorname.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.nachname.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.benutzername.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesStatus && matchesSearch
  })

  // Statistiken
  const tourenPending = touren.filter(t => t.status === "pending").length
  const auslagenPending = auslagen.filter(a => a.status === "pending").length
  const offeneAuslagen = auslagen
    .filter(a => a.status !== "paid")
    .reduce((sum, a) => sum + parseFloat(a.kosten || "0"), 0)

  const fuehrerscheinklassen = ['B', 'BE', 'C', 'CE', 'C1', 'C1E', 'D', 'DE', 'D1', 'D1E', 'AM', 'A1', 'A2', 'A', 'L', 'T']

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <TransNextLogo width={150} height={45} showText={true} />
          <Button
            variant="outline"
            onClick={handleLogout}
            className="text-red-600 border-red-300 hover:bg-red-50"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Abmelden
          </Button>
        </div>

        {/* Statistiken */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="border-2 border-yellow-200 bg-yellow-50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Touren Ausstehend</p>
                  <p className="text-3xl font-bold text-yellow-700">{tourenPending}</p>
                </div>
                <Clock className="h-10 w-10 text-yellow-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-orange-200 bg-orange-50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Auslagen Ausstehend</p>
                  <p className="text-3xl font-bold text-orange-700">{auslagenPending}</p>
                </div>
                <FileText className="h-10 w-10 text-orange-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-blue-200 bg-blue-50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Offene Auslagen</p>
                  <p className="text-2xl font-bold text-blue-700">{formatCurrency(offeneAuslagen)}</p>
                  <p className="text-xs text-gray-500 mt-1">Zur Überweisung</p>
                </div>
                <Euro className="h-10 w-10 text-blue-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <Button
            variant={activeTab === "touren" ? "default" : "outline"}
            onClick={() => { setActiveTab("touren"); setFilterStatus("all"); setSearchTerm("") }}
            className={activeTab === "touren" ? "bg-primary-blue" : ""}
          >
            <TrendingUp className="mr-2 h-4 w-4" />
            Touren ({touren.length})
          </Button>
          <Button
            variant={activeTab === "auslagen" ? "default" : "outline"}
            onClick={() => { setActiveTab("auslagen"); setFilterStatus("all"); setSearchTerm("") }}
            className={activeTab === "auslagen" ? "bg-primary-blue" : ""}
          >
            <Euro className="mr-2 h-4 w-4" />
            Auslagen ({auslagen.length})
          </Button>
          <Button
            variant={activeTab === "fahrer" ? "default" : "outline"}
            onClick={() => { setActiveTab("fahrer"); setFilterStatus("all"); setSearchTerm("") }}
            className={activeTab === "fahrer" ? "bg-primary-blue" : ""}
          >
            <Users className="mr-2 h-4 w-4" />
            Fahrer ({fahrer.length})
          </Button>
        </div>

        {/* Filter & Suche */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder={
                      activeTab === "touren" ? "Suche nach Tour-Nr. oder Fahrer..." :
                      activeTab === "auslagen" ? "Suche nach Tour-Nr., Fahrer oder Kennzeichen..." :
                      "Suche nach Name oder Benutzername..."
                    }
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="w-full md:w-64">
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Status filtern" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle Status</SelectItem>
                    {activeTab !== "fahrer" && <SelectItem value="pending">Ausstehend</SelectItem>}
                    {activeTab !== "fahrer" && <SelectItem value="approved">Genehmigt</SelectItem>}
                    {activeTab !== "fahrer" && <SelectItem value="rejected">Abgelehnt</SelectItem>}
                    {activeTab === "touren" && <SelectItem value="billed">Abgerechnet</SelectItem>}
                    {activeTab === "auslagen" && <SelectItem value="paid">Überwiesen</SelectItem>}
                    {activeTab === "fahrer" && <SelectItem value="aktiv">Aktiv</SelectItem>}
                    {activeTab === "fahrer" && <SelectItem value="inaktiv">Inaktiv</SelectItem>}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* KW-Export für Touren */}
        {activeTab === "touren" && (
          <Card className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row md:items-end gap-4">
                <div className="flex-1">
                  <h3 className="font-semibold text-primary-blue mb-2">Wochenabrechnung exportieren</h3>
                  <p className="text-sm text-gray-600">Wählen Sie eine Kalenderwoche, um alle genehmigten Touren zu exportieren und als abgerechnet zu markieren.</p>
                </div>
                <div className="flex gap-2">
                  <Select value={selectedKW} onValueChange={setSelectedKW}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="KW wählen" />
                    </SelectTrigger>
                    <SelectContent>
                      {getAvailableKWs().map(kw => (
                        <SelectItem key={kw} value={kw}>{kw}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={exportKW}
                    className="bg-primary-blue hover:bg-blue-700"
                    disabled={!selectedKW}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Exportieren
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Touren Tabelle */}
        {activeTab === "touren" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl text-primary-blue">Touren-Verwaltung</CardTitle>
              <CardDescription>
                Alle Arbeitsnachweise der Fahrer
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredTouren.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Keine Touren gefunden
                  </h3>
                  <p className="text-gray-600">
                    {searchTerm || filterStatus !== "all"
                      ? "Versuchen Sie andere Filtereinstellungen"
                      : "Es sind noch keine Arbeitsnachweise vorhanden."}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tour-Nr.</TableHead>
                        <TableHead>Fahrer</TableHead>
                        <TableHead>Datum</TableHead>
                        <TableHead className="text-right">KM</TableHead>
                        <TableHead>Wartezeit</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Erstellt am</TableHead>
                        <TableHead>Beleg</TableHead>
                        <TableHead>Aktionen</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTouren.map((tour) => (
                        <TableRow key={tour.id}>
                          <TableCell className="font-medium">{tour.tourNr}</TableCell>
                          <TableCell>{tour.fahrer}</TableCell>
                          <TableCell>{formatDate(tour.datum)}</TableCell>
                          <TableCell className="text-right">{tour.gefahreneKm} km</TableCell>
                          <TableCell className="text-sm">
                            {tour.wartezeit === "30-60" && "30-60 Min."}
                            {tour.wartezeit === "60-90" && "60-90 Min."}
                            {tour.wartezeit === "90-120" && "90-120 Min."}
                            {!tour.wartezeit && "-"}
                          </TableCell>
                          <TableCell>{getStatusBadge(tour.status)}</TableCell>
                          <TableCell className="text-sm text-gray-600">
                            {formatDate(tour.erstelltAm)}
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedBeleg({ tourNr: tour.tourNr, datum: tour.datum, typ: "arbeitsnachweis" })
                                setShowBelegDialog(true)
                              }}
                              className="text-primary-blue border-primary-blue hover:bg-blue-50"
                            >
                              <FileText className="h-3 w-3 mr-1" />
                              PDF
                            </Button>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateTourStatus(tour.id, "approved")}
                                className="text-green-700 border-green-300 hover:bg-green-50"
                                disabled={tour.status === "approved" || tour.status === "billed"}
                              >
                                <CheckCircle className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateTourStatus(tour.id, "rejected")}
                                className="text-red-700 border-red-300 hover:bg-red-50"
                                disabled={tour.status === "rejected" || tour.status === "billed"}
                              >
                                <XCircle className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Auslagen Tabelle */}
        {activeTab === "auslagen" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl text-primary-blue">Auslagen-Verwaltung</CardTitle>
              <CardDescription>
                Alle Auslagennachweise der Fahrer
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredAuslagen.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Keine Auslagen gefunden
                  </h3>
                  <p className="text-gray-600">
                    {searchTerm || filterStatus !== "all"
                      ? "Versuchen Sie andere Filtereinstellungen"
                      : "Es sind noch keine Auslagennachweise vorhanden."}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tour-Nr.</TableHead>
                        <TableHead>Fahrer</TableHead>
                        <TableHead>Datum</TableHead>
                        <TableHead>Kennzeichen</TableHead>
                        <TableHead>Strecke</TableHead>
                        <TableHead>Belegart</TableHead>
                        <TableHead className="text-right">Kosten</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Erstellt am</TableHead>
                        <TableHead>Beleg</TableHead>
                        <TableHead>Aktionen</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAuslagen.map((auslage) => (
                        <TableRow key={auslage.id}>
                          <TableCell className="font-medium">{auslage.tourNr}</TableCell>
                          <TableCell>{auslage.fahrer}</TableCell>
                          <TableCell>{formatDate(auslage.datum)}</TableCell>
                          <TableCell>{auslage.kennzeichen}</TableCell>
                          <TableCell className="text-sm">
                            {auslage.startort} → {auslage.zielort}
                          </TableCell>
                          <TableCell className="text-sm capitalize">{auslage.belegart}</TableCell>
                          <TableCell className="text-right font-semibold">
                            {formatCurrency(auslage.kosten)}
                          </TableCell>
                          <TableCell>{getStatusBadge(auslage.status)}</TableCell>
                          <TableCell className="text-sm text-gray-600">
                            {formatDate(auslage.erstelltAm)}
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedBeleg({ tourNr: auslage.tourNr, datum: auslage.datum, typ: "auslagennachweis" })
                                setShowBelegDialog(true)
                              }}
                              className="text-primary-blue border-primary-blue hover:bg-blue-50"
                            >
                              <FileText className="h-3 w-3 mr-1" />
                              PDF
                            </Button>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateAuslageStatus(auslage.id, "approved")}
                                className="text-green-700 border-green-300 hover:bg-green-50"
                                disabled={auslage.status === "approved" || auslage.status === "paid"}
                                title="Genehmigen"
                              >
                                <CheckCircle className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateAuslageStatus(auslage.id, "rejected")}
                                className="text-red-700 border-red-300 hover:bg-red-50"
                                disabled={auslage.status === "rejected" || auslage.status === "paid"}
                                title="Ablehnen"
                              >
                                <XCircle className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateAuslageStatus(auslage.id, "paid")}
                                className="text-purple-700 border-purple-300 hover:bg-purple-50"
                                disabled={auslage.status === "paid" || auslage.status === "pending" || auslage.status === "rejected"}
                                title="Als überwiesen markieren"
                              >
                                <CreditCard className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* FAHRER TAB */}
        {activeTab === "fahrer" && (
          <>
            {/* Fahrer hinzufügen Button */}
            <div className="mb-6">
              <Button
                onClick={() => setShowAddFahrer(!showAddFahrer)}
                className="bg-primary-blue hover:bg-blue-700"
              >
                <UserPlus className="mr-2 h-4 w-4" />
                Neuen Fahrer anlegen
              </Button>
            </div>

            {/* Edit Fahrer-Formular */}
            {showEditFahrer && editingFahrer && (
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="text-2xl text-primary-blue">Fahrer bearbeiten</CardTitle>
                  <CardDescription>
                    Fahrer-Daten aktualisieren (Email und Passwort können nicht geändert werden)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleEditFahrer} className="space-y-6">
                    {/* Persönliche Daten */}
                    <div className="border-b pb-6">
                      <h3 className="font-semibold text-lg mb-4 text-primary-blue">Persönliche Daten</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="edit-vorname">Vorname *</Label>
                          <Input
                            id="edit-vorname"
                            required
                            value={editingFahrer.vorname || ""}
                            onChange={(e) => setEditingFahrer({...editingFahrer, vorname: e.target.value})}
                          />
                        </div>
                        <div>
                          <Label htmlFor="edit-nachname">Nachname *</Label>
                          <Input
                            id="edit-nachname"
                            required
                            value={editingFahrer.nachname || ""}
                            onChange={(e) => setEditingFahrer({...editingFahrer, nachname: e.target.value})}
                          />
                        </div>
                        <div>
                          <Label htmlFor="edit-geburtsdatum">Geburtsdatum *</Label>
                          <Input
                            id="edit-geburtsdatum"
                            type="date"
                            required
                            value={editingFahrer.geburtsdatum || ""}
                            onChange={(e) => setEditingFahrer({...editingFahrer, geburtsdatum: e.target.value})}
                          />
                        </div>
                        <div>
                          <Label htmlFor="edit-adresse">Straße & Hausnummer *</Label>
                          <Input
                            id="edit-adresse"
                            required
                            value={editingFahrer.adresse || ""}
                            onChange={(e) => setEditingFahrer({...editingFahrer, adresse: e.target.value})}
                          />
                        </div>
                        <div>
                          <Label htmlFor="edit-plz">PLZ *</Label>
                          <Input
                            id="edit-plz"
                            required
                            value={editingFahrer.plz || ""}
                            onChange={(e) => setEditingFahrer({...editingFahrer, plz: e.target.value})}
                          />
                        </div>
                        <div>
                          <Label htmlFor="edit-ort">Ort *</Label>
                          <Input
                            id="edit-ort"
                            required
                            value={editingFahrer.ort || ""}
                            onChange={(e) => setEditingFahrer({...editingFahrer, ort: e.target.value})}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Führerschein-Daten */}
                    <div className="border-b pb-6">
                      <h3 className="font-semibold text-lg mb-4 text-primary-blue">Führerschein-Daten</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="edit-fuehrerscheinNr">Führerschein-Nummer *</Label>
                          <Input
                            id="edit-fuehrerscheinNr"
                            required
                            value={editingFahrer.fuehrerscheinNr || ""}
                            onChange={(e) => setEditingFahrer({...editingFahrer, fuehrerscheinNr: e.target.value})}
                          />
                        </div>
                        <div>
                          <Label htmlFor="edit-fuehrerscheinDatum">Ausstellungsdatum *</Label>
                          <Input
                            id="edit-fuehrerscheinDatum"
                            type="date"
                            required
                            value={editingFahrer.fuehrerscheinDatum || ""}
                            onChange={(e) => setEditingFahrer({...editingFahrer, fuehrerscheinDatum: e.target.value})}
                          />
                        </div>
                        <div className="md:col-span-2">
                          <Label htmlFor="edit-ausstellendeBehoerde">Ausstellende Behörde *</Label>
                          <Input
                            id="edit-ausstellendeBehoerde"
                            required
                            value={editingFahrer.ausstellendeBehoerde || ""}
                            onChange={(e) => setEditingFahrer({...editingFahrer, ausstellendeBehoerde: e.target.value})}
                          />
                        </div>
                        <div className="md:col-span-2">
                          <Label>Führerscheinklassen * (mindestens eine auswählen)</Label>
                          <div className="grid grid-cols-4 md:grid-cols-8 gap-2 mt-2">
                            {fuehrerscheinklassen.map(klasse => (
                              <label key={klasse} className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={editingFahrer.fuehrerscheinklassen?.includes(klasse) || false}
                                  onChange={(e) => handleEditKlassenChange(klasse, e.target.checked)}
                                  className="rounded border-gray-300"
                                />
                                <span className="text-sm font-medium">{klasse}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Ausweis-Daten */}
                    <div className="border-b pb-6">
                      <h3 className="font-semibold text-lg mb-4 text-primary-blue">Personalausweis-Daten</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="edit-ausweisnummer">Ausweisnummer *</Label>
                          <Input
                            id="edit-ausweisnummer"
                            required
                            value={editingFahrer.ausweisnummer || ""}
                            onChange={(e) => setEditingFahrer({...editingFahrer, ausweisnummer: e.target.value})}
                          />
                        </div>
                        <div>
                          <Label htmlFor="edit-ausweisAblauf">Ablaufdatum *</Label>
                          <Input
                            id="edit-ausweisAblauf"
                            type="date"
                            required
                            value={editingFahrer.ausweisAblauf || ""}
                            onChange={(e) => setEditingFahrer({...editingFahrer, ausweisAblauf: e.target.value})}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <Button type="submit" className="bg-primary-blue hover:bg-blue-700">
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Änderungen speichern
                      </Button>
                      <Button type="button" variant="outline" onClick={() => {
                        setShowEditFahrer(false)
                        setEditingFahrer(null)
                      }}>
                        Abbrechen
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}

            {/* Fahrer-Formular */}
            {showAddFahrer && (
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="text-2xl text-primary-blue">Neuen Fahrer anlegen</CardTitle>
                  <CardDescription>
                    Alle Felder ausfüllen um einen neuen Fahrer-Account zu erstellen
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleAddFahrer} className="space-y-6">
                    {/* Persönliche Daten */}
                    <div className="border-b pb-6">
                      <h3 className="font-semibold text-lg mb-4 text-primary-blue">Persönliche Daten</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="vorname">Vorname *</Label>
                          <Input
                            id="vorname"
                            required
                            value={newFahrer.vorname}
                            onChange={(e) => setNewFahrer({...newFahrer, vorname: e.target.value})}
                          />
                        </div>
                        <div>
                          <Label htmlFor="nachname">Nachname *</Label>
                          <Input
                            id="nachname"
                            required
                            value={newFahrer.nachname}
                            onChange={(e) => setNewFahrer({...newFahrer, nachname: e.target.value})}
                          />
                        </div>
                        <div>
                          <Label htmlFor="geburtsdatum">Geburtsdatum *</Label>
                          <Input
                            id="geburtsdatum"
                            type="date"
                            required
                            value={newFahrer.geburtsdatum}
                            onChange={(e) => setNewFahrer({...newFahrer, geburtsdatum: e.target.value})}
                          />
                        </div>
                        <div>
                          <Label htmlFor="adresse">Straße & Hausnummer *</Label>
                          <Input
                            id="adresse"
                            required
                            placeholder="z.B. Musterstr. 123"
                            value={newFahrer.adresse}
                            onChange={(e) => setNewFahrer({...newFahrer, adresse: e.target.value})}
                          />
                        </div>
                        <div>
                          <Label htmlFor="plz">PLZ *</Label>
                          <Input
                            id="plz"
                            required
                            placeholder="z.B. 44809"
                            value={newFahrer.plz}
                            onChange={(e) => setNewFahrer({...newFahrer, plz: e.target.value})}
                          />
                        </div>
                        <div>
                          <Label htmlFor="ort">Ort *</Label>
                          <Input
                            id="ort"
                            required
                            placeholder="z.B. Bochum"
                            value={newFahrer.ort}
                            onChange={(e) => setNewFahrer({...newFahrer, ort: e.target.value})}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Führerschein-Daten */}
                    <div className="border-b pb-6">
                      <h3 className="font-semibold text-lg mb-4 text-primary-blue">Führerschein-Daten</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="fuehrerscheinNr">Führerschein-Nummer *</Label>
                          <Input
                            id="fuehrerscheinNr"
                            required
                            placeholder="z.B. D123456789"
                            value={newFahrer.fuehrerscheinNr}
                            onChange={(e) => setNewFahrer({...newFahrer, fuehrerscheinNr: e.target.value})}
                          />
                        </div>
                        <div>
                          <Label htmlFor="fuehrerscheinDatum">Ausstellungsdatum *</Label>
                          <Input
                            id="fuehrerscheinDatum"
                            type="date"
                            required
                            value={newFahrer.fuehrerscheinDatum}
                            onChange={(e) => setNewFahrer({...newFahrer, fuehrerscheinDatum: e.target.value})}
                          />
                        </div>
                        <div className="md:col-span-2">
                          <Label htmlFor="ausstellendeBehoerde">Ausstellende Behörde *</Label>
                          <Input
                            id="ausstellendeBehoerde"
                            required
                            placeholder="z.B. Stadt Bochum"
                            value={newFahrer.ausstellendeBehoerde}
                            onChange={(e) => setNewFahrer({...newFahrer, ausstellendeBehoerde: e.target.value})}
                          />
                        </div>
                        <div className="md:col-span-2">
                          <Label>Führerscheinklassen * (mindestens eine auswählen)</Label>
                          <div className="grid grid-cols-4 md:grid-cols-8 gap-2 mt-2">
                            {fuehrerscheinklassen.map(klasse => (
                              <label key={klasse} className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={newFahrer.fuehrerscheinklassen?.includes(klasse)}
                                  onChange={(e) => handleKlassenChange(klasse, e.target.checked)}
                                  className="rounded border-gray-300"
                                />
                                <span className="text-sm font-medium">{klasse}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Ausweis-Daten */}
                    <div className="border-b pb-6">
                      <h3 className="font-semibold text-lg mb-4 text-primary-blue">Personalausweis-Daten</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="ausweisnummer">Ausweisnummer *</Label>
                          <Input
                            id="ausweisnummer"
                            required
                            placeholder="z.B. L123456789"
                            value={newFahrer.ausweisnummer}
                            onChange={(e) => setNewFahrer({...newFahrer, ausweisnummer: e.target.value})}
                          />
                        </div>
                        <div>
                          <Label htmlFor="ausweisAblauf">Ablaufdatum *</Label>
                          <Input
                            id="ausweisAblauf"
                            type="date"
                            required
                            value={newFahrer.ausweisAblauf}
                            onChange={(e) => setNewFahrer({...newFahrer, ausweisAblauf: e.target.value})}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Zugangsdaten */}
                    <div className="border-b pb-6">
                      <h3 className="font-semibold text-lg mb-4 text-primary-blue">Zugangsdaten für Fahrerportal</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="benutzername">Benutzername *</Label>
                          <Input
                            id="benutzername"
                            required
                            placeholder="z.B. max.mustermann"
                            value={newFahrer.benutzername}
                            onChange={(e) => setNewFahrer({...newFahrer, benutzername: e.target.value})}
                          />
                        </div>
                        <div>
                          <Label htmlFor="passwort">Passwort *</Label>
                          <div className="relative">
                            <Input
                              id="passwort"
                              type={showPassword ? "text" : "password"}
                              required
                              placeholder="Sicheres Passwort"
                              value={newFahrer.passwort}
                              onChange={(e) => setNewFahrer({...newFahrer, passwort: e.target.value})}
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3 top-3 text-gray-500"
                            >
                              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <Button type="submit" className="bg-primary-blue hover:bg-blue-700">
                        <UserPlus className="mr-2 h-4 w-4" />
                        Fahrer anlegen
                      </Button>
                      <Button type="button" variant="outline" onClick={() => setShowAddFahrer(false)}>
                        Abbrechen
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}

            {/* Fahrer-Liste */}
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl text-primary-blue">Fahrer-Übersicht</CardTitle>
                <CardDescription>
                  Alle registrierten Fahrer ({fahrer.filter(f => f.status === 'aktiv').length} aktiv, {fahrer.filter(f => f.status === 'inaktiv').length} inaktiv)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {filteredFahrer.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Keine Fahrer gefunden
                    </h3>
                    <p className="text-gray-600">
                      {fahrer.length === 0
                        ? "Legen Sie den ersten Fahrer an"
                        : "Versuchen Sie andere Filtereinstellungen"}
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Benutzername</TableHead>
                          <TableHead>Geburtsdatum</TableHead>
                          <TableHead>Adresse</TableHead>
                          <TableHead>Führerschein</TableHead>
                          <TableHead>Klassen</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Erstellt am</TableHead>
                          <TableHead>Aktionen</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredFahrer.map((f) => (
                          <TableRow key={f.id} className={f.status === 'inaktiv' ? 'bg-gray-50' : ''}>
                            <TableCell className="font-medium">
                              {f.vorname} {f.nachname}
                            </TableCell>
                            <TableCell>{f.benutzername}</TableCell>
                            <TableCell>{formatDate(f.geburtsdatum)}</TableCell>
                            <TableCell className="text-sm">
                              {f.adresse}<br />
                              {f.plz} {f.ort}
                            </TableCell>
                            <TableCell className="text-sm">
                              {f.fuehrerscheinNr}<br />
                              <span className="text-gray-500">seit {formatDate(f.fuehrerscheinDatum)}</span>
                            </TableCell>
                            <TableCell className="text-sm">
                              {f.fuehrerscheinklassen.join(', ')}
                            </TableCell>
                            <TableCell>
                              {f.status === 'aktiv' ? (
                                <Badge className="bg-green-100 text-green-800 border-green-200">
                                  Aktiv
                                </Badge>
                              ) : (
                                <Badge className="bg-gray-100 text-gray-800 border-gray-200">
                                  Inaktiv
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-sm text-gray-600">
                              {formatDate(f.erstelltAm)}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setEditingFahrer(f)
                                    setShowEditFahrer(true)
                                  }}
                                  className="text-blue-700 border-blue-300 hover:bg-blue-50"
                                >
                                  <Edit className="h-3 w-3 mr-1" />
                                  Bearbeiten
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => toggleFahrerStatus(f.id)}
                                  className={f.status === 'aktiv'
                                    ? "text-orange-700 border-orange-300 hover:bg-orange-50"
                                    : "text-green-700 border-green-300 hover:bg-green-50"}
                                >
                                  {f.status === 'aktiv' ? (
                                    <>
                                      <UserX className="h-3 w-3 mr-1" />
                                      Deaktivieren
                                    </>
                                  ) : (
                                    <>
                                      <CheckCircle className="h-3 w-3 mr-1" />
                                      Aktivieren
                                    </>
                                  )}
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </main>

      {/* Beleg Dialog */}
      {selectedBeleg && (
        <BelegDialog
          open={showBelegDialog}
          onOpenChange={setShowBelegDialog}
          tourNr={selectedBeleg.tourNr}
          datum={selectedBeleg.datum}
          typ={selectedBeleg.typ}
        />
      )}
    </div>
  )
}
