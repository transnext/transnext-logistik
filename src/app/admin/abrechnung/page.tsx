"use client"

import { useEffect, useState, useMemo, useCallback } from "react"
import { useRouter } from "next/navigation"
import { AdminLayout } from "@/components/admin/AdminLayout"
import {
  AbrechnungTab,
  type AbrechnungFahrer,
  type AbrechnungTour,
  type AbrechnungAuslage
} from "@/components/admin/tabs/AbrechnungTab"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/ui/status-badge"
import { CurrencyDisplay } from "@/components/ui/currency-display"
import { LockIndicator } from "@/components/ui/lock-indicator"
import { EmptyState } from "@/components/ui/empty-state"
import { getCurrentUser, getUserProfile, signOut } from "@/lib/api"
import {
  getAllArbeitsnachweiseAdmin,
  getAllAuslagennachweiseAdmin,
  getAllFahrerAdmin,
  getMonatsueberschuss
} from "@/lib/admin-api"
import {
  getBillableTours,
  getBillableExpenses,
  getWeeklyInvoice,
  getAllWeeklyInvoices,
  createToursInvoice,
  createExpensesInvoice,
  lockInvoice,
  markInvoiceExported,
  generateWeekOptions,
  BILLING_SYSTEM_START_WEEK,
  BILLING_SYSTEM_START_YEAR,
  type BillableTour,
  type BillableAuslage,
  type WeeklyInvoice,
  type WeekInfo
} from "@/lib/invoice-api"
import { exportTourenPDF, exportAuslagenWithBelege } from "@/lib/pdf-export"
import {
  RefreshCw,
  Calendar,
  FileText,
  Receipt,
  Lock,
  Download,
  Plus,
  AlertTriangle,
  CheckCircle,
  Loader2
} from "lucide-react"

// =====================================================
// HELPER FUNCTIONS
// =====================================================

function formatDate(dateString: string): string {
  if (!dateString) return "—"
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    })
  } catch {
    return dateString
  }
}

function formatCurrency(amount: number | string): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR"
  }).format(num || 0)
}

function namesMatch(name1: string, name2: string): boolean {
  if (!name1 || !name2) return false
  const normalize = (s: string) => s.toLowerCase().trim()
  if (normalize(name1) === normalize(name2)) return true

  const parts1 = name1.split(' ')
  const parts2 = name2.split(' ')
  if (parts1.length === 2 && parts2.length === 2) {
    return (normalize(parts1[0]) === normalize(parts2[1]) && normalize(parts1[1]) === normalize(parts2[0]))
  }
  return false
}

function generateMonthOptions(): { value: string; label: string }[] {
  const options: { value: string; label: string }[] = []
  const now = new Date()

  for (let i = 0; i < 13; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    const label = date.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })
    options.push({ value, label })
  }

  return options
}

function getVormonat(monat: string): string {
  const [year, month] = monat.split('-').map(Number)
  const prevDate = new Date(year, month - 2, 1)
  return `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`
}

// =====================================================
// MAIN COMPONENT
// =====================================================

export default function AbrechnungPage() {
  const router = useRouter()
  const [userName, setUserName] = useState("")
  const [userRole, setUserRole] = useState<'admin' | 'disponent' | 'gf'>('admin')
  const [isLoading, setIsLoading] = useState(true)

  // Tabs
  const [activeTab, setActiveTab] = useState<'fahrer' | 'weekly'>('weekly')

  // === FAHRER TAB STATE ===
  const [allFahrer, setAllFahrer] = useState<AbrechnungFahrer[]>([])
  const [allTouren, setAllTouren] = useState<AbrechnungTour[]>([])
  const [allAuslagen, setAllAuslagen] = useState<AbrechnungAuslage[]>([])
  const [selectedFahrerId, setSelectedFahrerId] = useState<number | null>(null)
  const [fahrerVormonatUeberschuss, setFahrerVormonatUeberschuss] = useState(0)
  const now = new Date()
  const currentMonthValue = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const [selectedMonth, setSelectedMonth] = useState(currentMonthValue)
  const monthOptions = generateMonthOptions()

  // === WEEKLY TAB STATE ===
  // Alle Wochen seit Dezember 2025 (ohne count-Parameter)
  const weekOptions = generateWeekOptions()
  const [selectedWeek, setSelectedWeek] = useState<WeekInfo>(weekOptions[0])
  const [billableTours, setBillableTours] = useState<BillableTour[]>([])
  const [billableExpenses, setBillableExpenses] = useState<BillableAuslage[]>([])
  const [existingToursInvoice, setExistingToursInvoice] = useState<WeeklyInvoice | null>(null)
  const [existingExpensesInvoice, setExistingExpensesInvoice] = useState<WeeklyInvoice | null>(null)
  const [existingOnlogistInvoice, setExistingOnlogistInvoice] = useState<WeeklyInvoice | null>(null)
  const [allInvoices, setAllInvoices] = useState<WeeklyInvoice[]>([])
  const [isLoadingWeekly, setIsLoadingWeekly] = useState(false)
  const [actionInProgress, setActionInProgress] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  // Kundenfilter: 'all' | 'smart_and_care' | 'onlogist'
  const [selectedClient, setSelectedClient] = useState<'all' | 'smart_and_care' | 'onlogist'>('all')

  // Check Auth und Daten laden
  useEffect(() => {
    checkAuthAndLoadData()
  }, [])

  const checkAuthAndLoadData = async () => {
    try {
      const user = await getCurrentUser()
      if (!user) {
        router.push("/admin")
        return
      }
      const profile = await getUserProfile(user.id)
      // Nur Admin/GF darf Abrechnung sehen
      if (profile.role !== 'admin' && profile.role !== 'gf') {
        router.push("/admin/dashboard")
        return
      }
      setUserRole(profile.role as 'admin' | 'disponent' | 'gf')
      setUserName(profile.full_name)

      await loadData()
      setIsLoading(false)
    } catch (error) {
      console.error("Auth/Load Fehler:", error)
      router.push("/admin")
    }
  }

  // === FAHRER DATA ===
  const loadData = async () => {
    try {
      const [fahrerData, tourenData, auslagenData] = await Promise.all([
        getAllFahrerAdmin(),
        getAllArbeitsnachweiseAdmin(),
        getAllAuslagennachweiseAdmin()
      ])

      setAllFahrer(fahrerData.map((f: any) => ({
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
        fuehrerscheinklassen: f.fuehrerscheinklassen || [],
        ausweisnummer: f.ausweisnummer,
        ausweisAblauf: f.ausweis_ablauf,
        benutzername: f.user_id ? `fahrer_${f.id}` : "",
        status: f.status,
        erstelltAm: f.created_at,
        zeitmodell: f.zeitmodell || "minijob",
        festes_gehalt: f.festes_gehalt,
        archived_at: f.archived_at
      })))

      setAllTouren(tourenData.map((t: any) => ({
        id: t.id,
        tourNr: t.tour_nr,
        datum: t.datum,
        gefahreneKm: t.gefahrene_km?.toString() || "0",
        wartezeit: t.wartezeit || "",
        fahrer: t.fahrer_name || "Unbekannt",
        status: t.status,
        erstelltAm: t.created_at,
        belegUrl: t.beleg_url,
        istRuecklaufer: t.ist_ruecklaufer,
        auftraggeber: t.auftraggeber,
        zeitmodell: t.zeitmodell,
        festes_gehalt: t.festes_gehalt
      })))

      setAllAuslagen(auslagenData.map((a: any) => ({
        id: a.id,
        tourNr: a.tour_nr || "",
        kennzeichen: a.kennzeichen || "",
        datum: a.datum,
        startort: a.startort || "",
        zielort: a.zielort || "",
        belegart: a.belegart || "",
        kosten: a.kosten?.toString() || "0",
        fahrer: a.fahrer_name || "Unbekannt",
        status: a.status,
        erstelltAm: a.created_at,
        belegUrl: a.beleg_url
      })))
    } catch (error) {
      console.error("Fehler beim Laden:", error)
    }
  }

  // === WEEKLY DATA ===
  const loadWeeklyData = useCallback(async () => {
    if (!selectedWeek) return

    setIsLoadingWeekly(true)
    setError(null)

    try {
      // Lade Touren und Auslagen - diese sollten immer funktionieren
      let tours: BillableTour[] = []
      let expenses: BillableAuslage[] = []
      let toursInvoice: WeeklyInvoice | null = null
      let expensesInvoice: WeeklyInvoice | null = null
      let invoices: WeeklyInvoice[] = []

      // Touren laden
      try {
        tours = await getBillableTours(selectedWeek.year, selectedWeek.week)
      } catch (tourErr: any) {
        console.error('Fehler beim Laden der Touren:', tourErr)
        // Kein Fehler anzeigen, leere Liste verwenden
      }

      // Auslagen laden
      try {
        expenses = await getBillableExpenses(selectedWeek.year, selectedWeek.week)
      } catch (expErr: any) {
        console.error('Fehler beim Laden der Auslagen:', expErr)
        // Kein Fehler anzeigen, leere Liste verwenden
      }

      // Weekly Invoices laden (optional - kann fehlschlagen wenn Tabelle leer/RLS)
      let onlogistInvoice: WeeklyInvoice | null = null

      try {
        toursInvoice = await getWeeklyInvoice(selectedWeek.year, selectedWeek.week, 'tours', 'smart_and_care')
      } catch (invErr: any) {
        console.warn('Keine Smart & Care Touren-Abrechnung gefunden:', invErr?.message)
      }

      try {
        onlogistInvoice = await getWeeklyInvoice(selectedWeek.year, selectedWeek.week, 'tours', 'onlogist')
      } catch (invErr: any) {
        console.warn('Keine Onlogist Touren-Abrechnung gefunden:', invErr?.message)
      }

      try {
        expensesInvoice = await getWeeklyInvoice(selectedWeek.year, selectedWeek.week, 'expenses')
      } catch (invErr: any) {
        console.warn('Keine Auslagen-Abrechnung gefunden:', invErr?.message)
      }

      try {
        invoices = await getAllWeeklyInvoices()
      } catch (invErr: any) {
        console.warn('Keine Wochenabrechnungen gefunden:', invErr?.message)
      }

      setBillableTours(tours)
      setBillableExpenses(expenses)
      setExistingToursInvoice(toursInvoice)
      setExistingOnlogistInvoice(onlogistInvoice)
      setExistingExpensesInvoice(expensesInvoice)
      setAllInvoices(invoices)
    } catch (err: any) {
      console.error('Unerwarteter Fehler beim Laden der Wochendaten:', err)
      setError(`Fehler: ${err?.message || 'Unbekannter Fehler'}`)
    } finally {
      setIsLoadingWeekly(false)
    }
  }, [selectedWeek])

  useEffect(() => {
    if (activeTab === 'weekly') {
      loadWeeklyData()
    }
  }, [activeTab, selectedWeek, loadWeeklyData])

  const handleLogout = async () => {
    await signOut()
    router.push("/admin")
  }

  // Gefilterte Touren/Auslagen nach Monat
  const filteredTouren = useMemo(() => {
    return allTouren.filter(t => t.datum.startsWith(selectedMonth))
  }, [allTouren, selectedMonth])

  const filteredAuslagen = useMemo(() => {
    return allAuslagen.filter(a => a.datum.startsWith(selectedMonth))
  }, [allAuslagen, selectedMonth])

  // Fahrer-Touren/Auslagen
  const fahrerTouren = useMemo(() => {
    if (!selectedFahrerId) return []
    const fahrer = allFahrer.find(f => f.id === selectedFahrerId)
    if (!fahrer) return []
    const fahrerName = `${fahrer.vorname} ${fahrer.nachname}`
    return filteredTouren.filter(t => namesMatch(t.fahrer, fahrerName))
  }, [selectedFahrerId, allFahrer, filteredTouren])

  const fahrerAuslagen = useMemo(() => {
    if (!selectedFahrerId) return []
    const fahrer = allFahrer.find(f => f.id === selectedFahrerId)
    if (!fahrer) return []
    const fahrerName = `${fahrer.vorname} ${fahrer.nachname}`
    return filteredAuslagen.filter(a => namesMatch(a.fahrer, fahrerName))
  }, [selectedFahrerId, allFahrer, filteredAuslagen])

  // Handler: Fahrer-Abrechnung laden
  const handleLoadFahrerAbrechnung = useCallback(async (id: number) => {
    setSelectedFahrerId(id)

    const fahrer = allFahrer.find(f => f.id === id)
    if (fahrer) {
      try {
        const vormonat = getVormonat(selectedMonth)
        const ueberschuss = await getMonatsueberschuss(fahrer.benutzername, vormonat)
        setFahrerVormonatUeberschuss(ueberschuss?.ueberschuss || 0)
      } catch {
        setFahrerVormonatUeberschuss(0)
      }
    }
  }, [allFahrer, selectedMonth])

  const handleBackToOverview = useCallback(() => {
    setSelectedFahrerId(null)
    setFahrerVormonatUeberschuss(0)
  }, [])

  const getStatusBadge = useCallback((status: string, istRuecklaufer?: boolean) => {
    if (istRuecklaufer) {
      return <StatusBadge status="retoure" label="Rückläufer" />
    }
    return <StatusBadge status={status} />
  }, [])

  // === WEEKLY ACTIONS ===

  const handleCreateToursInvoice = async (client: 'smart_and_care' | 'onlogist') => {
    setActionInProgress(`createTours_${client}`)
    setError(null)
    setSuccess(null)

    const tours = client === 'onlogist' ? onlogistTours : smartAndCareTours
    const clientName = client === 'onlogist' ? 'Onlogist' : 'Smart & Care'

    // Prüfe auf nicht berechenbare Touren
    const notCalculable = tours.filter(t => t.calculation_source === 'not_calculable')
    if (notCalculable.length > 0) {
      setError(`${notCalculable.length} Tour(en) können nicht berechnet werden (fehlende KM). Bitte zuerst korrigieren.`)
      setActionInProgress(null)
      return
    }

    try {
      const result = await createToursInvoice(selectedWeek.year, selectedWeek.week, tours, client)
      if (result.success) {
        setSuccess(`${clientName} Touren-Abrechnung für KW ${selectedWeek.week}/${selectedWeek.year} erstellt`)
        await loadWeeklyData()
      } else {
        setError(result.error || 'Fehler beim Erstellen')
      }
    } catch (err) {
      setError('Unerwarteter Fehler')
    } finally {
      setActionInProgress(null)
    }
  }

  const handleCreateExpensesInvoice = async () => {
    setActionInProgress('createExpenses')
    setError(null)
    setSuccess(null)

    try {
      const result = await createExpensesInvoice(selectedWeek.year, selectedWeek.week, billableExpenses)
      if (result.success) {
        setSuccess(`Auslagen-Abrechnung für KW ${selectedWeek.week}/${selectedWeek.year} erstellt`)
        await loadWeeklyData()
      } else {
        setError(result.error || 'Fehler beim Erstellen')
      }
    } catch (err) {
      setError('Unerwarteter Fehler')
    } finally {
      setActionInProgress(null)
    }
  }

  const handleExportToursPDF = async () => {
    if (!existingToursInvoice) return
    setActionInProgress('exportTours')

    try {
      // Snapshot-Daten für PDF verwenden
      const snapshot = existingToursInvoice.included_items_snapshot as any
      const tours = snapshot?.tours || []

      exportTourenPDF(tours.map((t: any) => ({
        tour_nr: t.tour_nr,
        datum: t.datum,
        gefahrene_km: t.gefahrene_km,
        wartezeit: t.wartezeit,
        fahrer_name: t.fahrer_name,
        auftraggeber: 'smartandcare'
      })), String(selectedWeek.week), selectedWeek.year)

      await markInvoiceExported(existingToursInvoice.id)
      setSuccess('PDF exportiert')
      await loadWeeklyData()
    } catch (err) {
      setError('Fehler beim PDF-Export')
    } finally {
      setActionInProgress(null)
    }
  }

  const handleExportExpensesPDF = async () => {
    if (!existingExpensesInvoice) return
    setActionInProgress('exportExpenses')

    try {
      // Snapshot-Daten für PDF verwenden
      const snapshot = existingExpensesInvoice.included_items_snapshot as any
      const expenses = snapshot?.expenses || []

      await exportAuslagenWithBelege(expenses.map((e: any) => ({
        tour_nr: e.tour_nr,
        kennzeichen: e.kennzeichen,
        datum: e.datum,
        startort: '',
        zielort: '',
        belegart: e.belegart,
        kosten: e.kosten,
        beleg_url: e.beleg_url
      })))

      await markInvoiceExported(existingExpensesInvoice.id)
      setSuccess('PDF exportiert')
      await loadWeeklyData()
    } catch (err) {
      setError('Fehler beim PDF-Export')
    } finally {
      setActionInProgress(null)
    }
  }

  const handleLockInvoice = async (invoiceId: string, type: 'tours' | 'expenses') => {
    setActionInProgress(`lock${type}`)
    setError(null)

    try {
      const result = await lockInvoice(invoiceId)
      if (result.success) {
        setSuccess(`Abrechnung gesperrt`)
        await loadWeeklyData()
      } else {
        setError(result.error || 'Fehler beim Sperren')
      }
    } catch (err) {
      setError('Unerwarteter Fehler')
    } finally {
      setActionInProgress(null)
    }
  }

  // Touren nach Kunde filtern
  const mapAuftraggeberToClient = (auftraggeber: string | null | undefined): string => {
    if (!auftraggeber) return 'smart_and_care'
    const lower = auftraggeber.toLowerCase().trim()
    if (lower === 'onlogist') return 'onlogist'
    return 'smart_and_care'
  }

  const smartAndCareTours = billableTours.filter(t => mapAuftraggeberToClient(t.auftraggeber) === 'smart_and_care')
  const onlogistTours = billableTours.filter(t => mapAuftraggeberToClient(t.auftraggeber) === 'onlogist')

  // Summen berechnen
  const smartAndCareSumme = smartAndCareTours.reduce((sum, t) => sum + (t.customer_amount || 0), 0)
  const onlogistSumme = onlogistTours.reduce((sum, t) => sum + (t.customer_amount || 0), 0)
  const toursSumme = billableTours.reduce((sum, t) => sum + (t.customer_amount || 0), 0)
  const expensesSumme = billableExpenses.reduce((sum, e) => sum + (e.kosten || 0), 0)

  // Warnung: Touren ohne Preisliste
  const toursWithWarnings = billableTours.filter(t => t.calculation_source === 'fallback_constant' || t.calculation_source === 'not_calculable')
  const toursNotCalculable = billableTours.filter(t => t.calculation_source === 'not_calculable')

  if (isLoading) {
    return (
      <AdminLayout userName={userName} userRole={userRole} onLogout={handleLogout}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-blue" />
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout userName={userName} userRole={userRole} onLogout={handleLogout}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Abrechnung</h1>
            <p className="text-gray-500 mt-1">Wochenabrechnungen und Fahrer-Lohnübersichten</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('weekly')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'weekly'
                ? 'border-primary-blue text-primary-blue'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Receipt className="inline h-4 w-4 mr-2" />
            Wochenabrechnung
          </button>
          <button
            onClick={() => setActiveTab('fahrer')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'fahrer'
                ? 'border-primary-blue text-primary-blue'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <FileText className="inline h-4 w-4 mr-2" />
            Fahrer-Abrechnung
          </button>
        </div>

        {/* =====================================================
            WEEKLY TAB
        ===================================================== */}
        {activeTab === 'weekly' && (
          <div className="space-y-6">
            {/* KW-Auswahl */}
            <div className="flex items-center gap-4">
              <Calendar className="h-4 w-4 text-gray-400" />
              <Select
                value={`${selectedWeek.year}-${selectedWeek.week}`}
                onValueChange={(v) => {
                  const [y, w] = v.split('-').map(Number)
                  const found = weekOptions.find(o => o.year === y && o.week === w)
                  if (found) setSelectedWeek(found)
                }}
              >
                <SelectTrigger className="w-[300px] bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {weekOptions.map((option) => (
                    <SelectItem key={`${option.year}-${option.week}`} value={`${option.year}-${option.week}`}>
                      KW {option.week}/{option.year} ({formatDate(option.weekStart)} - {formatDate(option.weekEnd)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={loadWeeklyData} disabled={isLoadingWeekly}>
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingWeekly ? 'animate-spin' : ''}`} />
                Aktualisieren
              </Button>
            </div>

            {/* Hinweis: Cutoff-Regel */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-start gap-2 text-slate-600 text-sm">
              <Calendar className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>
                Die automatische Nachberechnung berücksichtigt Positionen ab KW{BILLING_SYSTEM_START_WEEK}/{BILLING_SYSTEM_START_YEAR}.
                Ältere Positionen wurden bereits manuell abgerechnet.
              </span>
            </div>

            {/* Nachrichten */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-800">
                <AlertTriangle className="h-4 w-4" />
                {error}
              </div>
            )}
            {success && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2 text-emerald-800">
                <CheckCircle className="h-4 w-4" />
                {success}
              </div>
            )}

            {/* Warnungen bei Berechnungsproblemen */}
            {toursWithWarnings.length > 0 && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2 text-amber-800">
                <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-medium">{toursWithWarnings.length} Tour(en) mit Berechnungs-Hinweisen</p>
                  {toursNotCalculable.length > 0 && (
                    <p className="text-amber-700">{toursNotCalculable.length} Tour(en) können nicht berechnet werden (fehlende KM)</p>
                  )}
                  {toursWithWarnings.filter(t => t.calculation_source === 'fallback_constant').length > 0 && (
                    <p className="text-amber-700">
                      {toursWithWarnings.filter(t => t.calculation_source === 'fallback_constant').length} Tour(en) nutzen Fallback-Konstanten (keine Preisliste gefunden)
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Smart & Care Touren-Abrechnung */}
            <Card className="border-gray-100 shadow-sm">
              <CardHeader className="border-b border-gray-50 bg-blue-50/30">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <FileText className="h-5 w-5 text-primary-blue" />
                      Smart & Care - KW {selectedWeek.week}/{selectedWeek.year}
                    </CardTitle>
                    <CardDescription>Genehmigte Touren von Smart & Care</CardDescription>
                  </div>
                  {existingToursInvoice?.locked_at && (
                    <LockIndicator lockedAt={existingToursInvoice.locked_at} lockedBy="Admin" />
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-6">
                {isLoadingWeekly ? (
                  <div className="flex items-center justify-center h-32">
                    <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                  </div>
                ) : existingToursInvoice ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-100">
                      <div>
                        <p className="font-medium text-blue-900">Abrechnung erstellt</p>
                        <p className="text-sm text-blue-700">
                          {existingToursInvoice.items_count} Touren · <CurrencyDisplay amount={existingToursInvoice.items_amount} />
                        </p>
                        <p className="text-xs text-blue-600 mt-1">
                          Status: {existingToursInvoice.status}
                          {existingToursInvoice.exported_at && ` · Exportiert: ${formatDate(existingToursInvoice.exported_at)}`}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {!existingToursInvoice.exported_at && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleExportToursPDF}
                            disabled={actionInProgress === 'exportTours'}
                          >
                            {actionInProgress === 'exportTours' ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                              <Download className="h-4 w-4 mr-2" />
                            )}
                            PDF Export
                          </Button>
                        )}
                        {!existingToursInvoice.locked_at && existingToursInvoice.exported_at && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleLockInvoice(existingToursInvoice.id, 'tours')}
                            disabled={actionInProgress === 'locktours'}
                          >
                            <Lock className="h-4 w-4 mr-2" />
                            Sperren
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ) : smartAndCareTours.length > 0 ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-500">Anzahl Touren</p>
                        <p className="text-xl font-bold text-gray-900">{smartAndCareTours.length}</p>
                      </div>
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-500">Gesamtbetrag</p>
                        <p className="text-xl font-bold text-gray-900">
                          <CurrencyDisplay amount={smartAndCareSumme} />
                        </p>
                      </div>
                      <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                        <p className="text-xs text-amber-600">Status</p>
                        <p className="text-sm font-medium text-amber-800">Zur Abrechnung bereit</p>
                      </div>
                    </div>

                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="text-left p-3 font-medium text-gray-600">Tour-Nr.</th>
                            <th className="text-left p-3 font-medium text-gray-600">Datum</th>
                            <th className="text-left p-3 font-medium text-gray-600">Fahrer</th>
                            <th className="text-right p-3 font-medium text-gray-600">KM</th>
                            <th className="text-left p-3 font-medium text-gray-600">Preisliste</th>
                            <th className="text-right p-3 font-medium text-gray-600">Betrag</th>
                          </tr>
                        </thead>
                        <tbody>
                          {smartAndCareTours.slice(0, 5).map((tour) => (
                            <tr key={tour.id} className={`border-t ${tour.calculation_source === 'not_calculable' ? 'bg-red-50' : tour.calculation_source === 'fallback_constant' ? 'bg-amber-50' : ''}`}>
                              <td className="p-3">{tour.tour_nr}</td>
                              <td className="p-3">{formatDate(tour.datum)}</td>
                              <td className="p-3">{tour.fahrer_name}</td>
                              <td className="p-3 text-right">{tour.gefahrene_km || <span className="text-red-500">—</span>}</td>
                              <td className="p-3">
                                <span className={`text-xs px-2 py-0.5 rounded ${
                                  tour.calculation_source === 'pricing_table' ? 'bg-emerald-100 text-emerald-700' :
                                  tour.calculation_source === 'fallback_constant' ? 'bg-amber-100 text-amber-700' :
                                  'bg-red-100 text-red-700'
                                }`}>
                                  {tour.calculation_source === 'pricing_table' ? (tour.pricing_table_name || 'DB') :
                                   tour.calculation_source === 'fallback_constant' ? 'Fallback' : 'Fehlt'}
                                </span>
                              </td>
                              <td className="p-3 text-right">
                                <CurrencyDisplay amount={tour.customer_amount || 0} />
                              </td>
                            </tr>
                          ))}
                          {smartAndCareTours.length > 5 && (
                            <tr className="border-t bg-gray-50">
                              <td colSpan={6} className="p-3 text-center text-gray-500">
                                + {smartAndCareTours.length - 5} weitere Touren
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    <Button
                      onClick={() => handleCreateToursInvoice('smart_and_care')}
                      disabled={actionInProgress === 'createTours_smart_and_care' || smartAndCareTours.some(t => t.calculation_source === 'not_calculable')}
                      className="w-full"
                    >
                      {actionInProgress === 'createTours_smart_and_care' ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Plus className="h-4 w-4 mr-2" />
                      )}
                      Smart & Care Abrechnung erstellen ({smartAndCareTours.length} Touren)
                    </Button>
                  </div>
                ) : (
                  <EmptyState
                    title="Keine abrechenbaren Touren"
                    description={`Für KW ${selectedWeek.week}/${selectedWeek.year} liegen keine genehmigten Smart & Care Touren vor.`}
                    icon="file"
                  />
                )}
              </CardContent>
            </Card>

            {/* Onlogist Touren-Abrechnung */}
            <Card className="border-gray-100 shadow-sm">
              <CardHeader className="border-b border-gray-50 bg-orange-50/30">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <FileText className="h-5 w-5 text-orange-600" />
                      Onlogist - KW {selectedWeek.week}/{selectedWeek.year}
                    </CardTitle>
                    <CardDescription>Genehmigte Touren von Onlogist (keine Wartezeit-Berechnung)</CardDescription>
                  </div>
                  {existingOnlogistInvoice?.locked_at && (
                    <LockIndicator lockedAt={existingOnlogistInvoice.locked_at} lockedBy="Admin" />
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-6">
                {isLoadingWeekly ? (
                  <div className="flex items-center justify-center h-32">
                    <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                  </div>
                ) : existingOnlogistInvoice ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-orange-50 rounded-lg border border-orange-100">
                      <div>
                        <p className="font-medium text-orange-900">Abrechnung erstellt</p>
                        <p className="text-sm text-orange-700">
                          {existingOnlogistInvoice.items_count} Touren · <CurrencyDisplay amount={existingOnlogistInvoice.items_amount} />
                        </p>
                        <p className="text-xs text-orange-600 mt-1">
                          Status: {existingOnlogistInvoice.status}
                          {existingOnlogistInvoice.exported_at && ` · Exportiert: ${formatDate(existingOnlogistInvoice.exported_at)}`}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {!existingOnlogistInvoice.locked_at && existingOnlogistInvoice.exported_at && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleLockInvoice(existingOnlogistInvoice.id, 'tours')}
                            disabled={actionInProgress === 'locktours'}
                          >
                            <Lock className="h-4 w-4 mr-2" />
                            Sperren
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ) : onlogistTours.length > 0 ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-500">Anzahl Touren</p>
                        <p className="text-xl font-bold text-gray-900">{onlogistTours.length}</p>
                      </div>
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-500">Gesamtbetrag</p>
                        <p className="text-xl font-bold text-gray-900">
                          <CurrencyDisplay amount={onlogistSumme} />
                        </p>
                      </div>
                      <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                        <p className="text-xs text-amber-600">Status</p>
                        <p className="text-sm font-medium text-amber-800">Zur Abrechnung bereit</p>
                      </div>
                    </div>

                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="text-left p-3 font-medium text-gray-600">Tour-Nr.</th>
                            <th className="text-left p-3 font-medium text-gray-600">Datum</th>
                            <th className="text-left p-3 font-medium text-gray-600">Fahrer</th>
                            <th className="text-right p-3 font-medium text-gray-600">KM</th>
                            <th className="text-left p-3 font-medium text-gray-600">Preisliste</th>
                            <th className="text-right p-3 font-medium text-gray-600">Betrag</th>
                          </tr>
                        </thead>
                        <tbody>
                          {onlogistTours.slice(0, 5).map((tour) => (
                            <tr key={tour.id} className={`border-t ${tour.calculation_source === 'not_calculable' ? 'bg-red-50' : tour.calculation_source === 'fallback_constant' ? 'bg-amber-50' : ''}`}>
                              <td className="p-3">{tour.tour_nr}</td>
                              <td className="p-3">{formatDate(tour.datum)}</td>
                              <td className="p-3">{tour.fahrer_name}</td>
                              <td className="p-3 text-right">{tour.gefahrene_km || <span className="text-red-500">—</span>}</td>
                              <td className="p-3">
                                <span className={`text-xs px-2 py-0.5 rounded ${
                                  tour.calculation_source === 'pricing_table' ? 'bg-emerald-100 text-emerald-700' :
                                  tour.calculation_source === 'fallback_constant' ? 'bg-amber-100 text-amber-700' :
                                  'bg-red-100 text-red-700'
                                }`}>
                                  {tour.calculation_source === 'pricing_table' ? (tour.pricing_table_name || 'DB') :
                                   tour.calculation_source === 'fallback_constant' ? 'Fallback' : 'Fehlt'}
                                </span>
                              </td>
                              <td className="p-3 text-right">
                                <CurrencyDisplay amount={tour.customer_amount || 0} />
                              </td>
                            </tr>
                          ))}
                          {onlogistTours.length > 5 && (
                            <tr className="border-t bg-gray-50">
                              <td colSpan={6} className="p-3 text-center text-gray-500">
                                + {onlogistTours.length - 5} weitere Touren
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    <Button
                      onClick={() => handleCreateToursInvoice('onlogist')}
                      disabled={actionInProgress === 'createTours_onlogist' || onlogistTours.some(t => t.calculation_source === 'not_calculable')}
                      className="w-full bg-orange-600 hover:bg-orange-700"
                    >
                      {actionInProgress === 'createTours_onlogist' ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Plus className="h-4 w-4 mr-2" />
                      )}
                      Onlogist Abrechnung erstellen ({onlogistTours.length} Touren)
                    </Button>
                  </div>
                ) : (
                  <EmptyState
                    title="Keine abrechenbaren Onlogist-Touren"
                    description={`Für KW ${selectedWeek.week}/${selectedWeek.year} liegen keine genehmigten Onlogist Touren vor.`}
                    icon="file"
                  />
                )}
              </CardContent>
            </Card>

            {/* Auslagen-Abrechnung */}
            <Card className="border-gray-100 shadow-sm">
              <CardHeader className="border-b border-gray-50 bg-gray-50/30">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <Receipt className="h-5 w-5 text-orange-600" />
                      Auslagen-Abrechnung KW {selectedWeek.week}/{selectedWeek.year}
                    </CardTitle>
                    <CardDescription>Genehmigte Auslagen</CardDescription>
                  </div>
                  {existingExpensesInvoice?.locked_at && (
                    <LockIndicator lockedAt={existingExpensesInvoice.locked_at} lockedBy="Admin" />
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-6">
                {isLoadingWeekly ? (
                  <div className="flex items-center justify-center h-32">
                    <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                  </div>
                ) : existingExpensesInvoice ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-orange-50 rounded-lg border border-orange-100">
                      <div>
                        <p className="font-medium text-orange-900">Abrechnung erstellt</p>
                        <p className="text-sm text-orange-700">
                          {existingExpensesInvoice.items_count} Auslagen · <CurrencyDisplay amount={existingExpensesInvoice.items_amount} />
                        </p>
                        <p className="text-xs text-orange-600 mt-1">
                          Status: {existingExpensesInvoice.status}
                          {existingExpensesInvoice.exported_at && ` · Exportiert: ${formatDate(existingExpensesInvoice.exported_at)}`}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {!existingExpensesInvoice.exported_at && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleExportExpensesPDF}
                            disabled={actionInProgress === 'exportExpenses'}
                          >
                            {actionInProgress === 'exportExpenses' ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                              <Download className="h-4 w-4 mr-2" />
                            )}
                            PDF Export
                          </Button>
                        )}
                        {!existingExpensesInvoice.locked_at && existingExpensesInvoice.exported_at && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleLockInvoice(existingExpensesInvoice.id, 'expenses')}
                            disabled={actionInProgress === 'lockexpenses'}
                          >
                            <Lock className="h-4 w-4 mr-2" />
                            Sperren
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ) : billableExpenses.length > 0 ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-500">Anzahl Auslagen</p>
                        <p className="text-xl font-bold text-gray-900">{billableExpenses.length}</p>
                      </div>
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-500">Gesamtbetrag</p>
                        <p className="text-xl font-bold text-gray-900">
                          <CurrencyDisplay amount={expensesSumme} />
                        </p>
                      </div>
                      <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                        <p className="text-xs text-amber-600">Status</p>
                        <p className="text-sm font-medium text-amber-800">Zur Abrechnung bereit</p>
                      </div>
                    </div>

                    {/* Auslagen-Liste (max 5 anzeigen) */}
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="text-left p-3 font-medium text-gray-600">Tour/KZ</th>
                            <th className="text-left p-3 font-medium text-gray-600">Datum</th>
                            <th className="text-left p-3 font-medium text-gray-600">Belegart</th>
                            <th className="text-left p-3 font-medium text-gray-600">Fahrer</th>
                            <th className="text-right p-3 font-medium text-gray-600">Betrag</th>
                          </tr>
                        </thead>
                        <tbody>
                          {billableExpenses.slice(0, 5).map((expense) => (
                            <tr key={expense.id} className="border-t">
                              <td className="p-3">{expense.tour_nr}/{expense.kennzeichen}</td>
                              <td className="p-3">{formatDate(expense.datum)}</td>
                              <td className="p-3">{expense.belegart}</td>
                              <td className="p-3">{expense.fahrer_name}</td>
                              <td className="p-3 text-right">
                                <CurrencyDisplay amount={expense.kosten} />
                              </td>
                            </tr>
                          ))}
                          {billableExpenses.length > 5 && (
                            <tr className="border-t bg-gray-50">
                              <td colSpan={5} className="p-3 text-center text-gray-500">
                                + {billableExpenses.length - 5} weitere Auslagen
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    <Button
                      onClick={handleCreateExpensesInvoice}
                      disabled={actionInProgress === 'createExpenses'}
                      className="w-full"
                    >
                      {actionInProgress === 'createExpenses' ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Plus className="h-4 w-4 mr-2" />
                      )}
                      Abrechnung erstellen ({billableExpenses.length} Auslagen)
                    </Button>
                  </div>
                ) : (
                  <EmptyState
                    title="Keine abrechenbaren Auslagen"
                    description={`Für KW ${selectedWeek.week}/${selectedWeek.year} liegen keine genehmigten Auslagen vor.`}
                    icon="receipt"
                  />
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* =====================================================
            FAHRER TAB
        ===================================================== */}
        {activeTab === 'fahrer' && (
          <>
            {/* Monat-Auswahl */}
            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 text-gray-400" />
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-[200px] bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {monthOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={loadData}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Aktualisieren
              </Button>
            </div>

            {/* Stats Overview */}
            {!selectedFahrerId && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="border-gray-100 shadow-sm">
                  <CardContent className="p-4">
                    <p className="text-2xl font-bold text-gray-900">
                      {allFahrer.filter(f => f.status === 'aktiv' && !f.archived_at).length}
                    </p>
                    <p className="text-sm text-gray-500">Aktive Fahrer</p>
                  </CardContent>
                </Card>
                <Card className="border-gray-100 shadow-sm">
                  <CardContent className="p-4">
                    <p className="text-2xl font-bold text-gray-900">
                      {filteredTouren.length}
                    </p>
                    <p className="text-sm text-gray-500">Touren im Monat</p>
                  </CardContent>
                </Card>
                <Card className="border-gray-100 shadow-sm">
                  <CardContent className="p-4">
                    <p className="text-2xl font-bold text-gray-900">
                      {filteredTouren.filter(t => t.status === 'approved' || t.status === 'billed').length}
                    </p>
                    <p className="text-sm text-gray-500">Genehmigt/Abgerechnet</p>
                  </CardContent>
                </Card>
                <Card className="border-gray-100 shadow-sm">
                  <CardContent className="p-4">
                    <p className="text-2xl font-bold text-gray-900">
                      {filteredAuslagen.length}
                    </p>
                    <p className="text-sm text-gray-500">Auslagen im Monat</p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Abrechnung-Tab */}
            <AbrechnungTab
              fahrer={allFahrer}
              touren={filteredTouren}
              auslagen={filteredAuslagen}
              selectedFahrerId={selectedFahrerId}
              fahrerTouren={fahrerTouren}
              fahrerAuslagen={fahrerAuslagen}
              fahrerVormonatUeberschuss={fahrerVormonatUeberschuss}
              onLoadFahrerAbrechnung={handleLoadFahrerAbrechnung}
              onBackToOverview={handleBackToOverview}
              namesMatch={namesMatch}
              formatDate={formatDate}
              formatCurrency={formatCurrency}
              getStatusBadge={getStatusBadge}
            />
          </>
        )}
      </div>
    </AdminLayout>
  )
}
