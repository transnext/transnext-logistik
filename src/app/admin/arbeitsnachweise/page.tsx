"use client"

import { useEffect, useState, useMemo, useCallback } from "react"
import { useRouter } from "next/navigation"
import { AdminLayout } from "@/components/admin/AdminLayout"
import { ArbeitsnachweiseTab, type Tour } from "@/components/admin/tabs/ArbeitsnachweiseTab"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { StatusBadge } from "@/components/ui/status-badge"
import { getCurrentUser, getUserProfile, signOut } from "@/lib/api"
import {
  getAllArbeitsnachweiseAdmin,
  updateTour,
  deleteTour,
  billMultipleTours,
  markTourAsRuecklaufer,
  bulkUpdateTourenStatus
} from "@/lib/admin-api"
import { Search, Filter, RefreshCw, Calendar, X, FileText } from "lucide-react"

// Filter-Optionen für Status
const STATUS_OPTIONS = [
  { value: "all", label: "Alle Status" },
  { value: "pending", label: "Ausstehend" },
  { value: "approved", label: "Genehmigt" },
  { value: "rejected", label: "Abgelehnt" },
  { value: "billed", label: "Abgerechnet" }
]

// Hilfsfunktion: Datum formatieren
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

// Hilfsfunktion: Generiere Monatsliste
function generateMonthOptions(): { value: string; label: string }[] {
  const options: { value: string; label: string }[] = [
    { value: "all", label: "Alle Monate" }
  ]
  const now = new Date()

  for (let i = 0; i < 13; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    const label = date.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })
    options.push({ value, label })
  }

  return options
}

export default function ArbeitsnachweisePage() {
  const router = useRouter()
  const [userName, setUserName] = useState("")
  const [userRole, setUserRole] = useState<'admin' | 'gf' | 'disponent'>('admin')
  const [isLoading, setIsLoading] = useState(true)

  // Data State
  const [allTouren, setAllTouren] = useState<Tour[]>([])
  const [selectedTourIds, setSelectedTourIds] = useState<number[]>([])

  // Filter State
  const [searchTerm, setSearchTerm] = useState("")
  const [filterStatus, setFilterStatus] = useState("all")
  const [filterMonth, setFilterMonth] = useState("all")
  const monthOptions = generateMonthOptions()

  // Dialog State
  const [editingTour, setEditingTour] = useState<Tour | null>(null)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showBelegDialog, setShowBelegDialog] = useState(false)
  const [currentBeleg, setCurrentBeleg] = useState<{ tourNr: string; datum: string; typ: string; belegUrl?: string } | null>(null)
  const [isSaving, setIsSaving] = useState(false)

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
      const allowedRoles: Array<string> = ['admin', 'gf', 'disponent']
      if (!allowedRoles.includes(profile.role)) {
        router.push("/admin")
        return
      }
      setUserRole(profile.role as 'admin' | 'gf' | 'disponent')
      setUserName(profile.full_name)

      await loadData()
      setIsLoading(false)
    } catch (error) {
      console.error("Auth/Load Fehler:", error)
      router.push("/admin")
    }
  }

  const loadData = async () => {
    try {
      const data = await getAllArbeitsnachweiseAdmin()
      setAllTouren(data.map((t: any) => ({
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
    } catch (error) {
      console.error("Fehler beim Laden der Arbeitsnachweise:", error)
    }
  }

  const handleLogout = async () => {
    await signOut()
    router.push("/admin")
  }

  // Gefilterte Touren berechnen
  const filteredTouren = useMemo(() => {
    return allTouren.filter(tour => {
      // Suche
      const searchLower = searchTerm.toLowerCase()
      const matchesSearch = !searchTerm ||
        tour.tourNr.toLowerCase().includes(searchLower) ||
        tour.fahrer.toLowerCase().includes(searchLower) ||
        tour.datum.includes(searchTerm)

      // Status-Filter
      const matchesStatus = filterStatus === "all" || tour.status === filterStatus

      // Monats-Filter
      const matchesMonth = filterMonth === "all" || tour.datum.startsWith(filterMonth)

      return matchesSearch && matchesStatus && matchesMonth
    })
  }, [allTouren, searchTerm, filterStatus, filterMonth])

  // Handler: Status aktualisieren
  const handleUpdateStatus = useCallback(async (id: number, status: string) => {
    try {
      // Verwendet bestehende updateTour-Funktion die RPC für Disponenten nutzt
      await updateTour(id, { status: status as 'pending' | 'approved' | 'rejected' | 'billed' })
      // Daten neu laden
      await loadData()
    } catch (error: any) {
      console.error("Fehler beim Aktualisieren des Status:", error)
      alert(error.message || "Fehler beim Aktualisieren des Status")
    }
  }, [])

  // Handler: Rückläufer-Status umschalten (nur Admin)
  const handleToggleRuecklaufer = useCallback(async (id: number, currentValue: boolean) => {
    try {
      await markTourAsRuecklaufer(id, !currentValue)
      await loadData()
    } catch (error: any) {
      console.error("Fehler beim Ändern des Rückläufer-Status:", error)
      alert(error.message || "Nur Admin/Geschäftsführer dürfen den Rückläufer-Status ändern.")
    }
  }, [])

  // Handler: Tour löschen (nur Admin)
  const handleDeleteTour = useCallback(async (id: number) => {
    if (!confirm("Möchten Sie diese Tour wirklich löschen?")) return
    try {
      await deleteTour(id)
      setSelectedTourIds(prev => prev.filter(tourId => tourId !== id))
      await loadData()
    } catch (error: any) {
      console.error("Fehler beim Löschen:", error)
      alert(error.message || "Nur Admin/Geschäftsführer dürfen Touren löschen.")
    }
  }, [])

  // Handler: Ausgewählte abrechnen (nur Admin)
  const handleBillSelected = useCallback(async () => {
    if (selectedTourIds.length === 0) return
    if (!confirm(`Möchten Sie ${selectedTourIds.length} Tour(en) abrechnen?`)) return
    try {
      await billMultipleTours(selectedTourIds)
      setSelectedTourIds([])
      await loadData()
    } catch (error: any) {
      console.error("Fehler beim Abrechnen:", error)
      alert(error.message || "Nur Admin/Geschäftsführer dürfen Touren abrechnen.")
    }
  }, [selectedTourIds])

  // Handler: Alle auswählen/abwählen
  const handleToggleAllSelection = useCallback(() => {
    if (selectedTourIds.length === filteredTouren.length) {
      setSelectedTourIds([])
    } else {
      setSelectedTourIds(filteredTouren.map(t => t.id))
    }
  }, [filteredTouren, selectedTourIds.length])

  // Handler: Einzelne Tour auswählen/abwählen
  const handleToggleTourSelection = useCallback((id: number) => {
    setSelectedTourIds(prev =>
      prev.includes(id)
        ? prev.filter(tourId => tourId !== id)
        : [...prev, id]
    )
  }, [])

  // Handler: Auswahl aufheben
  const handleClearSelection = useCallback(() => {
    setSelectedTourIds([])
  }, [])

  // Handler: Tour bearbeiten
  const handleEditTour = useCallback((tour: Tour) => {
    setEditingTour({ ...tour })
    setShowEditDialog(true)
  }, [])

  // Handler: Tour speichern
  const handleSaveEdit = async () => {
    if (!editingTour) return
    setIsSaving(true)
    try {
      await updateTour(editingTour.id, {
        tour_nr: editingTour.tourNr,
        datum: editingTour.datum,
        gefahrene_km: parseFloat(editingTour.gefahreneKm) || 0,
        wartezeit: editingTour.wartezeit as '30-60' | '60-90' | '90-120' | 'keine' | undefined
      })
      setShowEditDialog(false)
      setEditingTour(null)
      await loadData()
    } catch (error: any) {
      console.error("Fehler beim Speichern:", error)
      alert(error.message || "Fehler beim Speichern. Möglicherweise fehlen die Berechtigungen.")
    } finally {
      setIsSaving(false)
    }
  }

  // Handler: Beleg anzeigen
  const handleShowBeleg = useCallback((beleg: { tourNr: string; datum: string; typ: "arbeitsnachweis"; belegUrl?: string }) => {
    setCurrentBeleg(beleg)
    setShowBelegDialog(true)
  }, [])

  // Hilfsfunktion: Status-Badge rendern
  const getStatusBadge = useCallback((status: string, istRuecklaufer?: boolean) => {
    if (istRuecklaufer) {
      return <StatusBadge status="retoure" label="Rückläufer" />
    }
    return <StatusBadge status={status} />
  }, [])

  // Handler: Filter zurücksetzen
  const handleResetFilters = () => {
    setSearchTerm("")
    setFilterStatus("all")
    setFilterMonth("all")
  }

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
            <h1 className="text-2xl font-bold text-gray-900">Arbeitsnachweise</h1>
            <p className="text-gray-500 mt-1">
              {filteredTouren.length} von {allTouren.length} Arbeitsnachweisen
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            className="self-start sm:self-auto"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Aktualisieren
          </Button>
        </div>

        {/* Filter Card */}
        <Card className="border-gray-100 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-gray-500" />
                <CardTitle className="text-base font-medium text-gray-900">Filter & Suche</CardTitle>
              </div>
              {(searchTerm || filterStatus !== "all" || filterMonth !== "all") && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleResetFilters}
                  className="text-gray-500 hover:text-gray-900"
                >
                  <X className="h-4 w-4 mr-1" />
                  Filter zurücksetzen
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Suche */}
              <div className="lg:col-span-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Suche nach Tour-Nr., Fahrer oder Datum..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Status-Filter */}
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Monats-Filter */}
              <Select value={filterMonth} onValueChange={setFilterMonth}>
                <SelectTrigger>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <SelectValue placeholder="Monat" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {monthOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Arbeitsnachweise-Tabelle */}
        <ArbeitsnachweiseTab
          filteredTouren={filteredTouren}
          selectedTourIds={selectedTourIds}
          searchTerm={searchTerm}
          filterStatus={filterStatus}
          userRole={userRole}
          onBillSelected={handleBillSelected}
          onClearSelection={handleClearSelection}
          onToggleAllSelection={handleToggleAllSelection}
          onToggleTourSelection={handleToggleTourSelection}
          onUpdateStatus={handleUpdateStatus}
          onToggleRuecklaufer={handleToggleRuecklaufer}
          onEditTour={handleEditTour}
          onDeleteTour={handleDeleteTour}
          onShowBeleg={handleShowBeleg}
          formatDate={formatDate}
          getStatusBadge={getStatusBadge}
        />

        {/* Edit Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Tour bearbeiten</DialogTitle>
              <DialogDescription>
                Ändern Sie die Daten der Tour {editingTour?.tourNr}
              </DialogDescription>
            </DialogHeader>
            {editingTour && (
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="tourNr">Tour-Nummer</Label>
                  <Input
                    id="tourNr"
                    value={editingTour.tourNr}
                    onChange={(e) => setEditingTour({ ...editingTour, tourNr: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="datum">Datum</Label>
                  <Input
                    id="datum"
                    type="date"
                    value={editingTour.datum}
                    onChange={(e) => setEditingTour({ ...editingTour, datum: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="km">Gefahrene KM</Label>
                  <Input
                    id="km"
                    type="number"
                    value={editingTour.gefahreneKm}
                    onChange={(e) => setEditingTour({ ...editingTour, gefahreneKm: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="wartezeit">Wartezeit</Label>
                  <Select
                    value={editingTour.wartezeit || "keine"}
                    onValueChange={(value) => setEditingTour({ ...editingTour, wartezeit: value === "keine" ? "" : value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="keine">Keine</SelectItem>
                      <SelectItem value="30-60">30-60 Min.</SelectItem>
                      <SelectItem value="60-90">60-90 Min.</SelectItem>
                      <SelectItem value="90-120">90-120 Min.</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowEditDialog(false)}
                disabled={isSaving}
              >
                Abbrechen
              </Button>
              <Button
                onClick={handleSaveEdit}
                disabled={isSaving}
                className="bg-primary-blue hover:bg-blue-700"
              >
                {isSaving ? "Speichert..." : "Speichern"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Beleg Dialog */}
        <Dialog open={showBelegDialog} onOpenChange={setShowBelegDialog}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary-blue" />
                Arbeitsnachweis {currentBeleg?.tourNr}
              </DialogTitle>
              <DialogDescription>
                Datum: {currentBeleg?.datum ? formatDate(currentBeleg.datum) : "—"}
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              {currentBeleg?.belegUrl ? (
                <div className="border rounded-lg overflow-hidden bg-gray-50">
                  <iframe
                    src={currentBeleg.belegUrl}
                    className="w-full h-[500px]"
                    title="PDF Beleg"
                  />
                </div>
              ) : (
                <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                  <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">Kein Beleg verfügbar</p>
                  <p className="text-sm text-gray-400 mt-1">
                    Für diese Tour wurde kein PDF-Beleg hochgeladen.
                  </p>
                </div>
              )}
            </div>
            <DialogFooter>
              {currentBeleg?.belegUrl && (
                <Button
                  variant="outline"
                  onClick={() => window.open(currentBeleg.belegUrl, '_blank')}
                >
                  In neuem Tab öffnen
                </Button>
              )}
              <Button onClick={() => setShowBelegDialog(false)}>
                Schließen
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  )
}
