"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { PDFViewerDialog } from "@/components/pdf-viewer-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { TransNextLogo } from "@/components/ui/logo"
import { LogOut, FileText, Search, Clock, CheckCircle, XCircle, TrendingUp, Euro, Download, CreditCard, Users, UserPlus, UserX, Eye, EyeOff, Edit, ArrowLeft, Trash2, RefreshCw } from "lucide-react"
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
  updateFahrer,
  deleteTour,
  billMultipleTours,
  deleteAuslage,
  billMultipleAuslagen,
  markTourAsRuecklaufer,
  getMonatsueberschuss
} from "@/lib/admin-api"
import { exportTourenPDF, exportAuslagenPDF, exportAuslagenWithBelege } from "@/lib/pdf-export"
import { calculateTourVerdienst, MONTHLY_LIMIT, calculateMonthlyPayout } from "@/lib/salary-calculator"

interface Tour {
  id: number
  tourNr: string
  datum: string
  gefahreneKm: string
  wartezeit: string
  fahrer: string
  status: string
  erstelltAm: string
  belegUrl?: string
  istRuecklaufer?: boolean
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
  belegUrl?: string
}

interface Fahrer {
  user_id?: string
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
  zeitmodell?: 'minijob' | 'werkstudent' | 'teilzeit' | 'vollzeit' | 'geschaeftsfuehrer'
  festesGehalt?: number
  erstelltAm: string
}

export default function AdminDashboardPage() {
  const router = useRouter()
  const [adminName, setAdminName] = useState("")
  const [activeTab, setActiveTab] = useState<"touren" | "auslagen" | "fahrer" | "abrechnung">("touren")
  const [touren, setTouren] = useState<Tour[]>([])
  const [auslagen, setAuslagen] = useState<Auslage[]>([])
  const [fahrer, setFahrer] = useState<Fahrer[]>([])
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [searchTerm, setSearchTerm] = useState("")
  const [showAddFahrer, setShowAddFahrer] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showEditFahrer, setShowEditFahrer] = useState(false)
  const [editingFahrer, setEditingFahrer] = useState<Partial<Fahrer> | null>(null)
  const [selectedTourIds, setSelectedTourIds] = useState<number[]>([])
  const [selectedAuslagenIds, setSelectedAuslagenIds] = useState<number[]>([])
  const [showBelegDialog, setShowBelegDialog] = useState(false)
  const [selectedBeleg, setSelectedBeleg] = useState<{ tourNr: string; datum: string; typ: "arbeitsnachweis" | "auslagennachweis"; belegUrl?: string } | null>(null)
  const [selectedFahrerId, setSelectedFahrerId] = useState<number | null>(null)
  const [fahrerTouren, setFahrerTouren] = useState<Tour[]>([])
  const [fahrerAuslagen, setFahrerAuslagen] = useState<Auslage[]>([])
  const [fahrerVormonatUeberschuss, setFahrerVormonatUeberschuss] = useState(0)

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
    status: "aktiv",
    festesGehalt: 0
    zeitmodell: "minijob"
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
    gesamtlohnGenehmigt: number
    monatsumsatz: number
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
        belegUrl: t.beleg_url,
        istRuecklaufer: t.ist_ruecklaufer,
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
        belegUrl: a.beleg_url,
      })))

      setFahrer(fahrerData.map((f: any) => ({
        id: f.id,
        user_id: f.user_id, // NEU: Für Vormonat-Überschuss
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
        zeitmodell: f.zeitmodell || 'minijob',
        festesGehalt: f.festes_gehalt || 0,
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
        zeitmodell: newFahrer.zeitmodell || 'minijob',
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
        status: "aktiv",
        zeitmodell: "minijob"
        festesGehalt: 0
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

    const loadFahrerAbrechnung = async (fahrerId: number) => {
    setSelectedFahrerId(fahrerId)
    setFahrerVormonatUeberschuss(0) // Reset

    // Filter Touren für diesen Fahrer
    const fahrerData = fahrer.find(f => f.id === fahrerId)
    if (!fahrerData) return

    const fahrerTourenFiltered = touren.filter(t => t.fahrer === `${fahrerData.vorname} ${fahrerData.nachname}`)
    const fahrerAuslagenFiltered = auslagen.filter(a => a.fahrer === `${fahrerData.vorname} ${fahrerData.nachname}`)
    setFahrerTouren(fahrerTourenFiltered)
    setFahrerAuslagen(fahrerAuslagenFiltered)

    // Lade Vormonat-Überschuss
    try {
      // Berechne Vormonat (aktuell Dezember 2024, Vormonat = November 2024)
      const now = new Date()
      const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
      const [year, month] = currentMonth.split('-')
      const date = new Date(parseInt(year), parseInt(month) - 2, 1)
      const vormonat = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

      console.log('=== VORMONAT-ÜBERSCHUSS DEBUG ===')
      console.log('Fahrer:', fahrerData.vorname, fahrerData.nachname)
      console.log('Fahrer-ID:', fahrerId)
      console.log('User-ID:', (fahrerData as any).user_id)
      console.log('Vormonat:', vormonat)

      // Verwende die bereits geladenen Fahrer-Daten
      const userId = (fahrerData as any).user_id

      if (userId) {
        // Prüfe auf manuellen Überschuss
        const manuellerUeberschuss = await getMonatsueberschuss(userId, vormonat)
        console.log('Manueller Überschuss Ergebnis:', manuellerUeberschuss)

        if (manuellerUeberschuss && manuellerUeberschuss.ueberschuss) {
          console.log(`✅ Manueller Überschuss gefunden: €${manuellerUeberschuss.ueberschuss}`)
          setFahrerVormonatUeberschuss(Number(manuellerUeberschuss.ueberschuss))
        } else {
          console.log('ℹ️ Kein manueller Überschuss, berechne aus Touren')
          // Kein manueller Überschuss, berechne aus Touren
          const vormonatTouren = touren.filter(t =>
            t.fahrer === `${fahrerData.vorname} ${fahrerData.nachname}` &&
            t.datum.startsWith(vormonat)
          )
          console.log('Vormonat-Touren gefunden:', vormonatTouren.length)

          const vormonatGesamt = vormonatTouren.reduce((sum, t) => {
            const km = parseFloat(t.gefahreneKm) || 0
            const verdienst = t.istRuecklaufer ? 0 : calculateTourVerdienst(km, t.wartezeit)
            return sum + verdienst
          }, 0)

          const { ueberschuss } = calculateMonthlyPayout(vormonatGesamt)
          console.log('Berechneter Überschuss:', ueberschuss)
          setFahrerVormonatUeberschuss(ueberschuss)
        }
      } else {
        console.warn('❌ Keine user_id gefunden für Fahrer:', fahrerData.vorname, fahrerData.nachname)
        setFahrerVormonatUeberschuss(0)
      }
    } catch (error) {
      console.error("❌ Fehler beim Laden des Vormonat-Überschusses:", error)
      setFahrerVormonatUeberschuss(0)
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
        zeitmodell: editingFahrer.zeitmodell,
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


  const toggleRuecklaufer = async (id: number, currentValue: boolean) => {
    try {
      console.log("Toggling Rückläufer:", id, "current:", currentValue, "new:", !currentValue)
      const result = await markTourAsRuecklaufer(id, !currentValue)
      console.log("Result:", result)
      await loadAllData() // Reload
      alert(`Tour erfolgreich als ${!currentValue ? 'Retoure' : 'normale Tour'} markiert`)
    } catch (error) {
      console.error("Fehler beim Rückläufer-Update:", error)
      alert("Fehler beim Aktualisieren des Rückläufer-Status: " + (error as Error).message)
    }
  }

  const handleDeleteTour = async (id: number) => {
    if (!confirm("Möchten Sie diese Tour wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.")) {
      return
    }
    try {
      await deleteTour(id)
      alert("Tour erfolgreich gelöscht")
      await loadAllData()
    } catch (error) {
      console.error("Fehler beim Löschen:", error)
      alert("Fehler beim Löschen der Tour")
    }
  }

  const handleBillSelected = async () => {
    if (selectedTourIds.length === 0) {
      alert("Bitte wählen Sie mindestens eine Tour aus")
      return
    }
    if (!confirm(`Möchten Sie ${selectedTourIds.length} Touren als abgerechnet markieren und PDF exportieren?`)) {
      return
    }
    try {
      // Hole die ausgewählten Touren
      const selectedTouren = touren.filter(t => selectedTourIds.includes(t.id))

      // Gruppiere nach KW
      const tourenByKW = new Map<string, typeof selectedTouren>()
      selectedTouren.forEach(tour => {
        const kw = getKWFromDate(tour.datum)
        if (!tourenByKW.has(kw)) {
          tourenByKW.set(kw, [])
        }
        tourenByKW.get(kw)!.push(tour)
      })

      // Erstelle PDFs für jede KW
      tourenByKW.forEach((kwTouren, kw) => {
        const [year, kwPart] = kw.split('-KW')
        const kwNumber = parseInt(kwPart)

        // Konvertiere zu Format für PDF-Export
        const tourenForExport = kwTouren.map(tour => ({
          tour_nr: tour.tourNr,
          datum: tour.datum,
          gefahrene_km: parseFloat(tour.gefahreneKm),
          wartezeit: tour.wartezeit,
          fahrer_name: tour.fahrer
        }))

        // PDF exportieren
        exportTourenPDF(tourenForExport, kwNumber.toString(), parseInt(year))
      })

      // Markiere als abgerechnet
      await billMultipleTours(selectedTourIds)
      alert(`${selectedTourIds.length} Touren wurden als PDF exportiert und als abgerechnet markiert`)
      setSelectedTourIds([])
      await loadAllData()
    } catch (error) {
      console.error("Fehler beim Abrechnen:", error)
      alert("Fehler beim Abrechnen der Touren")
    }
  }

  const toggleTourSelection = (id: number) => {
    if (selectedTourIds.includes(id)) {
      setSelectedTourIds(selectedTourIds.filter(tourId => tourId !== id))
    } else {
      setSelectedTourIds([...selectedTourIds, id])
    }
  }

  const toggleAllToursSelection = () => {
    if (selectedTourIds.length === filteredTouren.length) {
      setSelectedTourIds([])
    } else {
      setSelectedTourIds(filteredTouren.map(tour => tour.id))
    }
  }


  // AUSLAGEN BULK OPERATIONS
  const handleDeleteSelectedAuslagen = async () => {
    if (selectedAuslagenIds.length === 0) {
      alert("Bitte wählen Sie mindestens eine Auslage aus")
      return
    }
    if (!confirm(`Möchten Sie ${selectedAuslagenIds.length} Auslagen wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.`)) {
      return
    }
    try {
      for (const id of selectedAuslagenIds) {
        await deleteAuslage(id)
      }
      alert(`${selectedAuslagenIds.length} Auslagen wurden gelöscht`)
      setSelectedAuslagenIds([])
      await loadAllData()
    } catch (error) {
      console.error("Fehler beim Löschen:", error)
      alert("Fehler beim Löschen der Auslagen")
    }
  }

  const handleBillSelectedAuslagen = async () => {
    if (selectedAuslagenIds.length === 0) {
      alert("Bitte wählen Sie mindestens eine Auslage aus")
      return
    }
    if (!confirm(`Möchten Sie ${selectedAuslagenIds.length} Auslagen als abgerechnet markieren und PDF exportieren?`)) {
      return
    }
    try {
      // Hole die ausgewählten Auslagen
      const selectedAuslagen = auslagen.filter(a => selectedAuslagenIds.includes(a.id))

      // Konvertiere zu Format für PDF-Export
      const auslagenForExport = selectedAuslagen.map(a => ({
        tour_nr: a.tourNr,
        kennzeichen: a.kennzeichen,
        datum: a.datum,
        startort: a.startort,
        zielort: a.zielort,
        belegart: a.belegart,
        kosten: parseFloat(a.kosten),
        beleg_url: a.belegUrl
      }))

      // Erstelle PDF mit Belegen
      await exportAuslagenWithBelege(auslagenForExport)

      // Markiere als "billed"
      await billMultipleAuslagen(selectedAuslagenIds)
      alert(`${selectedAuslagenIds.length} Auslagen wurden als abgerechnet markiert und PDF exportiert`)
      setSelectedAuslagenIds([])
      await loadAllData()
    } catch (error) {
      console.error("❌ Fehler beim Abrechnen:", error)
      console.error("Error-Details:", (error as Error).message, (error as Error).stack)
      alert(`Fehler beim Abrechnen:\n\n${(error as Error).message}`)
    }
  }
  const toggleAuslagenSelection = (id: number) => {
    if (selectedAuslagenIds.includes(id)) {
      setSelectedAuslagenIds(selectedAuslagenIds.filter(auslagenId => auslagenId !== id))
    } else {
      setSelectedAuslagenIds([...selectedAuslagenIds, id])
    }
  }

  const toggleAllAuslagenSelection = () => {
    if (selectedAuslagenIds.length === filteredAuslagen.length) {
      setSelectedAuslagenIds([])
    } else {
      setSelectedAuslagenIds(filteredAuslagen.map(auslage => auslage.id))
    }
  }

  const getStatusBadge = (status: string, istRuecklaufer?: boolean) => {
    // Retoure hat Priorität über alle anderen Status
    if (istRuecklaufer) {
      return (
        <Badge className="bg-orange-100 text-orange-800 border-orange-200 flex items-center gap-1 w-fit">
          <RefreshCw className="h-3 w-3" />
          Retoure
        </Badge>
      )
    }

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

        {/* Statistiken - Zeile 1 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
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

        {/* Statistiken - Zeile 2 (NEU) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <Card className="border-2 border-green-200 bg-green-50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Gesamtlohn Genehmigt</p>
                  <p className="text-2xl font-bold text-green-700">{formatCurrency(stats?.gesamtlohnGenehmigt || 0)}</p>
                  <p className="text-xs text-gray-500 mt-1">Alle genehmigten Touren</p>
                </div>
                <CheckCircle className="h-10 w-10 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-purple-200 bg-purple-50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Monatsumsatz</p>
                  <p className="text-2xl font-bold text-purple-700">{formatCurrency(stats?.monatsumsatz || 0)}</p>
                  <p className="text-xs text-gray-500 mt-1">Laufender Monat (Kundenpreise)</p>
                </div>
                <TrendingUp className="h-10 w-10 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <Button
            variant={activeTab === "touren" ? "default" : "outline"}
            onClick={() => { setActiveTab("touren"); setFilterStatus("all"); setSearchTerm(""); setSelectedFahrerId(null) }}
            className={activeTab === "touren" ? "bg-primary-blue" : ""}
          >
            <TrendingUp className="mr-2 h-4 w-4" />
            Touren ({touren.length})
          </Button>
          <Button
            variant={activeTab === "auslagen" ? "default" : "outline"}
            onClick={() => { setActiveTab("auslagen"); setFilterStatus("all"); setSearchTerm(""); setSelectedFahrerId(null) }}
            className={activeTab === "auslagen" ? "bg-primary-blue" : ""}
          >
            <Euro className="mr-2 h-4 w-4" />
            Auslagen ({auslagen.length})
          </Button>
          <Button
            variant={activeTab === "fahrer" ? "default" : "outline"}
            onClick={() => { setActiveTab("fahrer"); setFilterStatus("all"); setSearchTerm(""); setSelectedFahrerId(null) }}
            className={activeTab === "fahrer" ? "bg-primary-blue" : ""}
          >
            <Users className="mr-2 h-4 w-4" />
            Fahrer ({fahrer.length})
          </Button>
          <Button
            variant={activeTab === "abrechnung" ? "default" : "outline"}
            onClick={() => { setActiveTab("abrechnung"); setFilterStatus("all"); setSearchTerm(""); setSelectedFahrerId(null) }}
            className={activeTab === "abrechnung" ? "bg-primary-blue" : ""}
          >
            <CreditCard className="mr-2 h-4 w-4" />
            Abrechnung
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

        {/* Touren Tabelle */}
        {activeTab === "touren" && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl text-primary-blue">Touren-Verwaltung</CardTitle>
                  <CardDescription>
                    Alle Arbeitsnachweise der Fahrer
                  </CardDescription>
                </div>
                {selectedTourIds.length > 0 && (
                  <div className="flex gap-2">
                    <Button
                      onClick={handleBillSelected}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <CreditCard className="mr-2 h-4 w-4" />
                      {selectedTourIds.length} abrechnen
                    </Button>
                    <Button
                      onClick={() => setSelectedTourIds([])}
                      variant="outline"
                    >
                      Auswahl aufheben
                    </Button>
                  </div>
                )}
              </div>
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
                        <TableHead className="w-12">
                          <input
                            type="checkbox"
                            checked={selectedTourIds.length === filteredTouren.length && filteredTouren.length > 0}
                            onChange={toggleAllToursSelection}
                            className="rounded border-gray-300 cursor-pointer"
                          />
                        </TableHead>
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
                          <TableCell>
                            <input
                              type="checkbox"
                              checked={selectedTourIds.includes(tour.id)}
                              onChange={() => toggleTourSelection(tour.id)}
                              className="rounded border-gray-300 cursor-pointer"
                            />
                          </TableCell>
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
                          <TableCell>{getStatusBadge(tour.status, tour.istRuecklaufer)}</TableCell>
                          <TableCell className="text-sm text-gray-600">
                            {formatDate(tour.erstelltAm)}
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedBeleg({ tourNr: tour.tourNr, datum: tour.datum, typ: "arbeitsnachweis", belegUrl: tour.belegUrl })
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
                                title="Genehmigen"
                              >
                                <CheckCircle className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateTourStatus(tour.id, "rejected")}
                                className="text-red-700 border-red-300 hover:bg-red-50"
                                disabled={tour.status === "rejected" || tour.status === "billed"}
                                title="Ablehnen"
                              >
                                <XCircle className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => toggleRuecklaufer(tour.id, tour.istRuecklaufer || false)}
                                className={tour.istRuecklaufer ? "text-orange-700 bg-orange-100 border-orange-300" : "text-gray-700 border-gray-300 hover:bg-gray-50"}
                                title={tour.istRuecklaufer ? "Als normale Tour markieren" : "Als Rückläufer markieren"}
                              >
                                <RefreshCw className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDeleteTour(tour.id)}
                                className="text-red-700 border-red-300 hover:bg-red-50"
                                title="Löschen"
                              >
                                <Trash2 className="h-3 w-3" />
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
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl text-primary-blue">Auslagen-Verwaltung</CardTitle>
                  <CardDescription>
                    Alle Auslagennachweise der Fahrer
                  </CardDescription>
                </div>
                {selectedAuslagenIds.length > 0 && (
                  <div className="flex gap-2">
                    <Button
                      onClick={handleBillSelectedAuslagen}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <CreditCard className="mr-2 h-4 w-4" />
                      {selectedAuslagenIds.length} abrechnen & PDF
                    </Button>
                    <Button
                      onClick={handleDeleteSelectedAuslagen}
                      variant="outline"
                      className="text-red-600 border-red-300 hover:bg-red-50"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Löschen
                    </Button>
                    <Button
                      onClick={() => setSelectedAuslagenIds([])}
                      variant="outline"
                    >
                      Auswahl aufheben
                    </Button>
                  </div>
                )}
              </div>
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
                        <TableHead className="w-12">
                          <input
                            type="checkbox"
                            checked={selectedAuslagenIds.length === filteredAuslagen.length && filteredAuslagen.length > 0}
                            onChange={toggleAllAuslagenSelection}
                            className="rounded border-gray-300 cursor-pointer"
                          />
                        </TableHead>
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
                          <TableCell>
                            <input
                              type="checkbox"
                              checked={selectedAuslagenIds.includes(auslage.id)}
                              onChange={() => toggleAuslagenSelection(auslage.id)}
                              className="rounded border-gray-300 cursor-pointer"
                            />
                          </TableCell>
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
                                setSelectedBeleg({ tourNr: auslage.tourNr, datum: auslage.datum, typ: "auslagennachweis", belegUrl: auslage.belegUrl })
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
                    {/* Zeitmodell */}
                    <div className="border-b pb-6">
                      <h3 className="font-semibold text-lg mb-4 text-primary-blue">Beschäftigungsart</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="edit-zeitmodell">Zeitmodell *</Label>
                          <Select
                            value={editingFahrer.zeitmodell || 'minijob'}
                            onValueChange={(value) => setEditingFahrer({...editingFahrer, zeitmodell: value as 'minijob' | 'werkstudent' | 'teilzeit' | 'vollzeit' | 'geschaeftsfuehrer' | 'geschaeftsfuehrer'})}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Zeitmodell wählen" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="minijob">Minijob</SelectItem>
                              <SelectItem value="werkstudent">Werkstudent</SelectItem>
                              <SelectItem value="teilzeit">Teilzeit</SelectItem>
                              <SelectItem value="vollzeit">Vollzeit</SelectItem>
                              <SelectItem value="geschaeftsfuehrer">Geschäftsführer</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex items-end">
                          <p className="text-sm text-gray-600">
                            {editingFahrer.zeitmodell === 'minijob' && 'Abrechnung nach KM-Range-Tabelle'}
                            {editingFahrer.zeitmodell === 'werkstudent' && 'Stundenlohn: 12,82€ + Zeiterfassung'}
                            {editingFahrer.zeitmodell === 'teilzeit' && 'Stundenlohn: 12,82€ + Zeiterfassung'}
                            {editingFahrer.zeitmodell === 'vollzeit' && 'Gehalt nach Vereinbarung'}
                            {editingFahrer.zeitmodell === 'geschaeftsfuehrer' && 'Festes monatliches Gehalt (Touren zählen nicht zum Lohn)'}
                          </p>
                        </div>
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
                    {/* Zeitmodell */}
                    <div className="border-b pb-6">
                      <h3 className="font-semibold text-lg mb-4 text-primary-blue">Beschäftigungsart</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="zeitmodell">Zeitmodell *</Label>
                          <Select
                            value={newFahrer.zeitmodell || 'minijob'}
                            onValueChange={(value) => setNewFahrer({...newFahrer, zeitmodell: value as 'minijob' | 'werkstudent' | 'teilzeit' | 'vollzeit' | 'geschaeftsfuehrer' | 'geschaeftsfuehrer'})}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Zeitmodell wählen" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="minijob">Minijob</SelectItem>
                              <SelectItem value="werkstudent">Werkstudent</SelectItem>
                              <SelectItem value="teilzeit">Teilzeit</SelectItem>
                              <SelectItem value="vollzeit">Vollzeit</SelectItem>
                              <SelectItem value="geschaeftsfuehrer">Geschäftsführer</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex items-end">
                          <p className="text-sm text-gray-600">
                            {newFahrer.zeitmodell === 'minijob' && 'Abrechnung nach KM-Range-Tabelle'}
                            {newFahrer.zeitmodell === 'werkstudent' && 'Stundenlohn: 12,82€ + Zeiterfassung'}
                            {newFahrer.zeitmodell === 'teilzeit' && 'Stundenlohn: 12,82€ + Zeiterfassung'}
                            {newFahrer.zeitmodell === 'vollzeit' && 'Gehalt nach Vereinbarung'}
                            {newFahrer.zeitmodell === 'geschaeftsfuehrer' && 'Festes monatliches Gehalt (Touren zählen nicht zum Lohn)'}
                          </p>
                        </div>
                      </div>
                    </div>
                      {/* Festes Gehalt (nur für Geschäftsführer/Vollzeit) */}
                      {(newFahrer.zeitmodell === 'geschaeftsfuehrer' || newFahrer.zeitmodell === 'vollzeit') && (
                        <div className="mt-4">
                          <Label htmlFor="festesGehalt">Festes monatliches Gehalt (€) *</Label>
                          <Input
                            id="festesGehalt"
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="z.B. 1500"
                            value={newFahrer.festesGehalt || 0}
                            onChange={(e) => setNewFahrer({...newFahrer, festesGehalt: parseFloat(e.target.value) || 0})}
                          />
                        </div>
                      )}

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
                          <TableHead>Zeitmodell</TableHead>
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
                            <TableCell>
                              <Badge className={`border-0 ${
                                f.zeitmodell === 'minijob' ? 'bg-blue-100 text-blue-800' :
                                f.zeitmodell === 'werkstudent' ? 'bg-purple-100 text-purple-800' :
                                f.zeitmodell === 'teilzeit' ? 'bg-orange-100 text-orange-800' :
                                f.zeitmodell === 'geschaeftsfuehrer' ? 'bg-green-100 text-green-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {f.zeitmodell === 'minijob' && 'Minijob'}
                                {f.zeitmodell === 'werkstudent' && 'Werkstudent'}
                                {f.zeitmodell === 'teilzeit' && 'Teilzeit'}
                                {f.zeitmodell === 'vollzeit' && 'Vollzeit'}
                                {f.zeitmodell === 'geschaeftsfuehrer' && 'Geschäftsführer'}
                                {!f.zeitmodell && 'Minijob'}
                              </Badge>
                            </TableCell>
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

        {/* ABRECHNUNG TAB */}
        {activeTab === "abrechnung" && (
          <>
            {!selectedFahrerId ? (
              // Fahrer-Liste
              <Card>
                <CardHeader>
                  <CardTitle className="text-2xl text-primary-blue">Fahrer-Abrechnung</CardTitle>
                  <CardDescription>
                    Wählen Sie einen Fahrer aus, um die Abrechnung zu sehen
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {fahrer.filter(f => f.status === 'aktiv').map((f) => {
                      // Berechne Statistiken für diesen Fahrer
                      const fahrerName = `${f.vorname} ${f.nachname}`
                      const fahrerTourenCount = touren.filter(t => t.fahrer === fahrerName).length
                      const fahrerAuslagenCount = auslagen.filter(a => a.fahrer === fahrerName).length

                      // Berechne Verdienst basierend auf Zeitmodell
                      const fahrerGesamtverdienst = f.zeitmodell === 'geschaeftsfuehrer' 
                        ? (f.festesGehalt || 0)  // Geschäftsführer: Festes Gehalt
                        : touren
                            .filter(t => t.fahrer === fahrerName && (t.status === 'approved' || t.status === 'billed'))
                            .reduce((sum, t) => {
                              const km = parseFloat(t.gefahreneKm) || 0
                              return sum + calculateTourVerdienst(km, t.wartezeit)
                            }, 0)

                      const fahrerAuslagenSumme = auslagen
                        .filter(a => a.fahrer === fahrerName && (a.status === 'approved' || a.status === 'paid'))
                        .reduce((sum, a) => sum + parseFloat(a.kosten), 0)

                      return (
                        <Card
                          key={f.id}
                          className="hover:shadow-lg transition-shadow cursor-pointer border-2 hover:border-primary-blue"
                          onClick={() => {
                            loadFahrerAbrechnung(f.id)
                          }}
                        >
                          <CardContent className="p-6">
                            <div className="flex items-start justify-between mb-4">
                              <div>
                                <h3 className="font-semibold text-lg text-gray-900">
                                  {f.vorname} {f.nachname}
                                </h3>
                                <p className="text-sm text-gray-500">{f.plz} {f.ort}</p>
                              </div>
                              <Badge className="bg-green-100 text-green-800 border-green-200">
                                Aktiv
                              </Badge>
                            </div>

                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-gray-600">Touren:</span>
                                <span className="font-semibold">{fahrerTourenCount}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Auslagen:</span>
                                <span className="font-semibold">{fahrerAuslagenCount}</span>
                              </div>
                              <div className="flex justify-between border-t pt-2">
                                <span className="text-gray-600">Verdienst:</span>
                                <span className="font-semibold text-green-700">
                                  {formatCurrency(fahrerGesamtverdienst)}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Auslagen:</span>
                                <span className="font-semibold text-orange-700">
                                  {formatCurrency(fahrerAuslagenSumme)}
                                </span>
                              </div>
                            </div>

                            <Button
                              variant="outline"
                              className="w-full mt-4 text-primary-blue border-primary-blue hover:bg-blue-50"
                              onClick={(e) => {
                                e.stopPropagation()
                                loadFahrerAbrechnung(f.id)
                              }}
                            >
                              Details ansehen
                            </Button>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            ) : (
              // Fahrer-Detail-Ansicht
              <>
                <Button
                  variant="ghost"
                  onClick={() => setSelectedFahrerId(null)}
                  className="mb-4 text-primary-blue hover:bg-blue-50"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Zurück zur Übersicht
                </Button>

                {(() => {
                  const selectedFahrerData = fahrer.find(f => f.id === selectedFahrerId)
                  if (!selectedFahrerData) return null

                  const fahrerName = `${selectedFahrerData.vorname} ${selectedFahrerData.nachname}`

                  // Berechne Gesamtverdienst
                  const gesamtverdienst = fahrerTouren
                    .filter(t => t.status === 'approved' || t.status === 'billed')
                    .reduce((sum, t) => {
                      const km = parseFloat(t.gefahreneKm) || 0
                      // Retoure-Touren = 0€
                      const verdienst = t.istRuecklaufer ? 0 : calculateTourVerdienst(km, t.wartezeit)
                      return sum + verdienst
                    }, 0)

                  console.log('=== AUSZAHLUNGS-BERECHNUNG ===')
                  console.log('Gesamtverdienst:', gesamtverdienst)
                  console.log('Vormonat-Überschuss:', fahrerVormonatUeberschuss)
                  const { ausgeZahlt, ueberschuss } = calculateMonthlyPayout(gesamtverdienst, fahrerVormonatUeberschuss)
                  console.log('Berechnete Auszahlung:', ausgeZahlt)
                  console.log('Neuer Überschuss:', ueberschuss)

                  const auslagenSumme = fahrerAuslagen
                    .filter(a => a.status === 'approved' || a.status === 'paid')
                    .reduce((sum, a) => sum + parseFloat(a.kosten), 0)

                  return (
                    <>
                      {/* Header Card */}
                      <Card className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200">
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between mb-4">
                            <div>
                              <h2 className="text-2xl font-bold text-primary-blue">
                                {fahrerName}
                              </h2>
                              <p className="text-gray-600">
                                {selectedFahrerData.adresse}, {selectedFahrerData.plz} {selectedFahrerData.ort}
                              </p>
                            </div>
                            <Badge className="bg-green-100 text-green-800 border-green-200 text-lg px-4 py-2">
                              Aktiv
                            </Badge>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
                            <div className="bg-white p-4 rounded-lg border">
                              <p className="text-sm text-gray-600">Gesamtverdienst</p>
                              <p className="text-2xl font-bold text-green-700">
                                {formatCurrency(gesamtverdienst)}
                              </p>
                            </div>
                            <div className="bg-white p-4 rounded-lg border">
                              <p className="text-sm text-gray-600">Auszahlung</p>
                              <p className="text-2xl font-bold text-blue-700">
                                {formatCurrency(ausgeZahlt)}
                              </p>
                            </div>
                            <div className="bg-white p-4 rounded-lg border">
                              <p className="text-sm text-gray-600">Überschuss Vormonat</p>
                              <p className="text-2xl font-bold text-amber-700">
                                {formatCurrency(fahrerVormonatUeberschuss)}
                              </p>
                            </div>
                            <div className="bg-white p-4 rounded-lg border">
                              <p className="text-sm text-gray-600">Auslagen</p>
                              <p className="text-2xl font-bold text-purple-700">
                                {formatCurrency(auslagenSumme)}
                              </p>
                            </div>
                          </div>

                          {gesamtverdienst > MONTHLY_LIMIT && (
                            <div className="mt-4 p-3 bg-orange-100 border border-orange-200 rounded-lg text-sm">
                              <p className="text-orange-800">
                                <strong>Hinweis:</strong> Verdienst überschreitet Minijob-Grenze ({formatCurrency(MONTHLY_LIMIT)}).
                                Überschuss von {formatCurrency(ueberschuss)} wird dem Fahrer zugerechnet.
                              </p>
                            </div>
                          )}
                        </CardContent>
                      </Card>

                      {/* Touren */}
                      <Card className="mb-6">
                        <CardHeader>
                          <CardTitle className="text-xl text-primary-blue">
                            Touren ({fahrerTouren.length})
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          {fahrerTouren.length === 0 ? (
                            <p className="text-center text-gray-500 py-8">Keine Touren vorhanden</p>
                          ) : (
                            <div className="overflow-x-auto">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Tour-Nr.</TableHead>
                                    <TableHead>Datum</TableHead>
                                    <TableHead className="text-right">KM</TableHead>
                                    <TableHead>Wartezeit</TableHead>
                                    <TableHead className="text-right">Verdienst</TableHead>
                                    <TableHead>Status</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {fahrerTouren.map((tour) => {
                                    const km = parseFloat(tour.gefahreneKm) || 0
                                    // Retoure-Touren = 0€
                                    const verdienst = tour.istRuecklaufer ? 0 : calculateTourVerdienst(km, tour.wartezeit)

                                    return (
                                      <TableRow key={tour.id}>
                                        <TableCell className="font-medium">{tour.tourNr}</TableCell>
                                        <TableCell>{formatDate(tour.datum)}</TableCell>
                                        <TableCell className="text-right">{tour.gefahreneKm} km</TableCell>
                                        <TableCell className="text-sm">
                                          {tour.wartezeit === "30-60" && "30-60 Min."}
                                          {tour.wartezeit === "60-90" && "60-90 Min."}
                                          {tour.wartezeit === "90-120" && "90-120 Min."}
                                          {!tour.wartezeit && "-"}
                                        </TableCell>
                                        <TableCell className="text-right font-semibold text-green-700">
                                          {formatCurrency(verdienst)}
                                        </TableCell>
                                        <TableCell>{getStatusBadge(tour.status, tour.istRuecklaufer)}</TableCell>
                                      </TableRow>
                                    )
                                  })}
                                </TableBody>
                              </Table>
                            </div>
                          )}
                        </CardContent>
                      </Card>

                      {/* Auslagen */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-xl text-primary-blue">
                            Auslagen ({fahrerAuslagen.length})
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          {fahrerAuslagen.length === 0 ? (
                            <p className="text-center text-gray-500 py-8">Keine Auslagen vorhanden</p>
                          ) : (
                            <div className="overflow-x-auto">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Tour-Nr.</TableHead>
                                    <TableHead>Datum</TableHead>
                                    <TableHead>Kennzeichen</TableHead>
                                    <TableHead>Strecke</TableHead>
                                    <TableHead>Belegart</TableHead>
                                    <TableHead className="text-right">Kosten</TableHead>
                                    <TableHead>Status</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {fahrerAuslagen.map((auslage) => (
                                    <TableRow key={auslage.id}>
                                      <TableCell className="font-medium">{auslage.tourNr}</TableCell>
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
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </>
                  )
                })()}
              </>
            )}
          </>
        )}
      </main>

      {/* Beleg Dialog */}
      {selectedBeleg && (
        <PDFViewerDialog
          open={showBelegDialog}
          onOpenChange={setShowBelegDialog}
          tourNr={selectedBeleg.tourNr}
          datum={selectedBeleg.datum}
          typ={selectedBeleg.typ}
          belegUrl={selectedBeleg.belegUrl}
        />
      )}
    </div>
  )
}
