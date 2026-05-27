"use client"

import { useEffect, useState, useMemo, useCallback } from "react"
import { useRouter } from "next/navigation"
import { AdminLayout } from "@/components/admin/AdminLayout"
import { AuslagenTab, type Auslage } from "@/components/admin/tabs/AuslagenTab"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { StatusBadge } from "@/components/ui/status-badge"
import { getCurrentUser, getUserProfile, signOut } from "@/lib/api"
import {
  getAllAuslagennachweiseAdmin,
  updateAuslage,
  deleteAuslage,
  billMultipleAuslagen,
  markAuslageAsReimbursed
} from "@/lib/admin-api"
import { Search, Filter, RefreshCw, Calendar, X, FileText } from "lucide-react"

// Filter-Optionen für Status
const STATUS_OPTIONS = [
  { value: "all", label: "Alle Status" },
  { value: "pending", label: "Ausstehend" },
  { value: "approved", label: "Genehmigt" },
  { value: "rejected", label: "Abgelehnt" },
  { value: "paid", label: "Überwiesen" }
]

// Belegart-Optionen
const BELEGART_OPTIONS = [
  { value: "tankbeleg", label: "Tankbeleg" },
  { value: "waschbeleg", label: "Waschbeleg" },
  { value: "bahnticket", label: "Bahnticket" },
  { value: "bc50", label: "BC50" },
  { value: "taxi", label: "Taxi" },
  { value: "uber", label: "Uber" }
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

// Hilfsfunktion: Währung formatieren
function formatCurrency(amount: number | string): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR"
  }).format(num || 0)
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

export default function AuslagenPage() {
  const router = useRouter()
  const [userName, setUserName] = useState("")
  const [userRole, setUserRole] = useState<'admin' | 'gf' | 'disponent'>('admin')
  const [isLoading, setIsLoading] = useState(true)

  // Data State
  const [allAuslagen, setAllAuslagen] = useState<Auslage[]>([])
  const [selectedAuslagenIds, setSelectedAuslagenIds] = useState<number[]>([])

  // Filter State
  const [searchTerm, setSearchTerm] = useState("")
  const [filterStatus, setFilterStatus] = useState("all")
  const [filterMonth, setFilterMonth] = useState("all")
  const monthOptions = generateMonthOptions()

  // Dialog State
  const [showBelegDialog, setShowBelegDialog] = useState(false)
  const [currentBeleg, setCurrentBeleg] = useState<{ tourNr: string; datum: string; typ: string; belegUrl?: string } | null>(null)
  const [editingAuslage, setEditingAuslage] = useState<Auslage | null>(null)
  const [showEditDialog, setShowEditDialog] = useState(false)
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
      const data = await getAllAuslagennachweiseAdmin()
      setAllAuslagen(data.map((a: any) => ({
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
      console.error("Fehler beim Laden der Auslagen:", error)
    }
  }

  const handleLogout = async () => {
    await signOut()
    router.push("/admin")
  }

  // Gefilterte Auslagen berechnen
  const filteredAuslagen = useMemo(() => {
    return allAuslagen.filter(auslage => {
      // Suche
      const searchLower = searchTerm.toLowerCase()
      const matchesSearch = !searchTerm ||
        auslage.tourNr.toLowerCase().includes(searchLower) ||
        auslage.fahrer.toLowerCase().includes(searchLower) ||
        auslage.kennzeichen.toLowerCase().includes(searchLower) ||
        auslage.datum.includes(searchTerm)

      // Status-Filter
      const matchesStatus = filterStatus === "all" || auslage.status === filterStatus

      // Monats-Filter
      const matchesMonth = filterMonth === "all" || auslage.datum.startsWith(filterMonth)

      return matchesSearch && matchesStatus && matchesMonth
    })
  }, [allAuslagen, searchTerm, filterStatus, filterMonth])

  // Handler: Status aktualisieren
  const handleUpdateStatus = useCallback(async (id: number, status: string) => {
    try {
      await updateAuslage(id, { status: status as 'pending' | 'approved' | 'rejected' | 'paid' })
      await loadData()
    } catch (error: any) {
      console.error("Fehler beim Aktualisieren des Status:", error)
      alert(error.message || "Fehler beim Aktualisieren des Status")
    }
  }, [])

  // Handler: Einzelne Auslage löschen (nur Admin)
  const handleDeleteAuslage = useCallback(async (id: number) => {
    if (!confirm("Möchten Sie diese Auslage wirklich löschen?")) return
    try {
      await deleteAuslage(id)
      setSelectedAuslagenIds(prev => prev.filter(auslagenId => auslagenId !== id))
      await loadData()
    } catch (error: any) {
      console.error("Fehler beim Löschen:", error)
      alert(error.message || "Nur Admin/Geschäftsführer dürfen Auslagen löschen.")
    }
  }, [])

  // Handler: Ausgewählte löschen (nur Admin)
  const handleDeleteSelected = useCallback(async () => {
    if (selectedAuslagenIds.length === 0) return
    if (!confirm(`Möchten Sie ${selectedAuslagenIds.length} Auslage(n) wirklich löschen?`)) return
    try {
      for (const id of selectedAuslagenIds) {
        await deleteAuslage(id)
      }
      setSelectedAuslagenIds([])
      await loadData()
    } catch (error: any) {
      console.error("Fehler beim Löschen:", error)
      alert(error.message || "Nur Admin/Geschäftsführer dürfen Auslagen löschen.")
    }
  }, [selectedAuslagenIds])

  // Handler: Ausgewählte abrechnen (nur Admin)
  const handleBillSelected = useCallback(async () => {
    if (selectedAuslagenIds.length === 0) return
    if (!confirm(`Möchten Sie ${selectedAuslagenIds.length} Auslage(n) abrechnen?`)) return
    try {
      await billMultipleAuslagen(selectedAuslagenIds)
      setSelectedAuslagenIds([])
      await loadData()
    } catch (error: any) {
      console.error("Fehler beim Abrechnen:", error)
      alert(error.message || "Nur Admin/Geschäftsführer dürfen Auslagen abrechnen.")
    }
  }, [selectedAuslagenIds])

  // Handler: Alle auswählen/abwählen
  const handleToggleAllSelection = useCallback(() => {
    if (selectedAuslagenIds.length === filteredAuslagen.length) {
      setSelectedAuslagenIds([])
    } else {
      setSelectedAuslagenIds(filteredAuslagen.map(a => a.id))
    }
  }, [filteredAuslagen, selectedAuslagenIds.length])

  // Handler: Einzelne Auslage auswählen/abwählen
  const handleToggleAuslageSelection = useCallback((id: number) => {
    setSelectedAuslagenIds(prev =>
      prev.includes(id)
        ? prev.filter(auslagenId => auslagenId !== id)
        : [...prev, id]
    )
  }, [])

  // Handler: Auswahl aufheben
  const handleClearSelection = useCallback(() => {
    setSelectedAuslagenIds([])
  }, [])

  // Handler: Auslage bearbeiten
  const handleEditAuslage = useCallback((auslage: Auslage) => {
    setEditingAuslage({ ...auslage })
    setShowEditDialog(true)
  }, [])

  // Handler: Auslage speichern
  // WICHTIG: Nur Admin/GF darf hier speichern - Kosten-Feld nur für Admin/GF sichtbar
  const handleSaveEdit = async () => {
    if (!editingAuslage) return
    setIsSaving(true)
    try {
      const isAdmin = userRole === 'admin' || userRole === 'gf'

      // Für Admin/GF: Alle Felder inkl. Kosten speichern
      // Für Disponenten: Diese Funktion wird nie aufgerufen (Bearbeiten ist versteckt)
      const updateData: any = {
        tour_nr: editingAuslage.tourNr,
        kennzeichen: editingAuslage.kennzeichen,
        datum: editingAuslage.datum,
        startort: editingAuslage.startort,
        zielort: editingAuslage.zielort,
        belegart: editingAuslage.belegart as 'tankbeleg' | 'waschbeleg' | 'bahnticket' | 'bc50' | 'taxi' | 'uber',
      }

      // Kosten nur für Admin/GF setzen
      if (isAdmin) {
        updateData.kosten = parseFloat(editingAuslage.kosten) || 0
      }

      await updateAuslage(editingAuslage.id, updateData)
      setShowEditDialog(false)
      setEditingAuslage(null)
      await loadData()
    } catch (error: any) {
      console.error("Fehler beim Speichern:", error)
      alert(error.message || "Fehler beim Speichern. Möglicherweise fehlen die Berechtigungen.")
    } finally {
      setIsSaving(false)
    }
  }

  // Handler: Auslage als überwiesen/erstattet markieren (nur Admin/GF)
  // Phase-1-konform: Setzt driver_reimbursement_status, reimbursed_at, reimbursed_by + status='paid' (Legacy)
  const handleMarkAsReimbursed = useCallback(async (id: number) => {
    const isAdmin = userRole === 'admin' || userRole === 'gf'
    if (!isAdmin) {
      alert("Nur Admin/Geschäftsführer dürfen Auslagen als überwiesen markieren.")
      return
    }

    if (!confirm("Möchten Sie diese Auslage als 'an Fahrer überwiesen' markieren?")) return

    try {
      // Nutzt neue Phase-1-konforme Funktion
      await markAuslageAsReimbursed(id)
      await loadData()
    } catch (error: any) {
      console.error("Fehler beim Markieren als überwiesen:", error)
      alert(error.message || "Fehler beim Markieren als überwiesen.")
    }
  }, [userRole])

  // Handler: Beleg anzeigen
  const handleShowBeleg = useCallback((beleg: { tourNr: string; datum: string; typ: "auslagennachweis"; belegUrl?: string }) => {
    setCurrentBeleg(beleg)
    setShowBelegDialog(true)
  }, [])

  // Hilfsfunktion: Status-Badge rendern
  const getStatusBadge = useCallback((status: string) => {
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
            <h1 className="text-2xl font-bold text-gray-900">Auslagen</h1>
            <p className="text-gray-500 mt-1">
              {filteredAuslagen.length} von {allAuslagen.length} Auslagen
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
                    placeholder="Suche nach Tour-Nr., Fahrer, Kennzeichen..."
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

        {/* Auslagen-Tabelle */}
        <AuslagenTab
          filteredAuslagen={filteredAuslagen}
          selectedAuslagenIds={selectedAuslagenIds}
          searchTerm={searchTerm}
          filterStatus={filterStatus}
          userRole={userRole}
          onBillSelected={handleBillSelected}
          onDeleteSelected={handleDeleteSelected}
          onClearSelection={handleClearSelection}
          onToggleAllSelection={handleToggleAllSelection}
          onToggleAuslageSelection={handleToggleAuslageSelection}
          onUpdateStatus={handleUpdateStatus}
          onEditAuslage={handleEditAuslage}
          onDeleteAuslage={handleDeleteAuslage}
          onMarkAsReimbursed={handleMarkAsReimbursed}
          onShowBeleg={handleShowBeleg}
          formatDate={formatDate}
          formatCurrency={formatCurrency}
          getStatusBadge={getStatusBadge}
        />

        {/* Edit Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Auslage bearbeiten</DialogTitle>
              <DialogDescription>
                Auslage für Tour {editingAuslage?.tourNr} bearbeiten
              </DialogDescription>
            </DialogHeader>
            {editingAuslage && (
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="tourNr">Tour-Nummer</Label>
                    <Input
                      id="tourNr"
                      value={editingAuslage.tourNr}
                      onChange={(e) => setEditingAuslage({ ...editingAuslage, tourNr: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="kennzeichen">Kennzeichen</Label>
                    <Input
                      id="kennzeichen"
                      value={editingAuslage.kennzeichen}
                      onChange={(e) => setEditingAuslage({ ...editingAuslage, kennzeichen: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="datum">Datum</Label>
                  <Input
                    id="datum"
                    type="date"
                    value={editingAuslage.datum}
                    onChange={(e) => setEditingAuslage({ ...editingAuslage, datum: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startort">Startort</Label>
                    <Input
                      id="startort"
                      value={editingAuslage.startort}
                      onChange={(e) => setEditingAuslage({ ...editingAuslage, startort: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="zielort">Zielort</Label>
                    <Input
                      id="zielort"
                      value={editingAuslage.zielort}
                      onChange={(e) => setEditingAuslage({ ...editingAuslage, zielort: e.target.value })}
                    />
                  </div>
                </div>
                <div className={`grid gap-4 ${(userRole === 'admin' || userRole === 'gf') ? 'grid-cols-2' : 'grid-cols-1'}`}>
                  <div className="space-y-2">
                    <Label htmlFor="belegart">Belegart</Label>
                    <Select
                      value={editingAuslage.belegart}
                      onValueChange={(value) => setEditingAuslage({ ...editingAuslage, belegart: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {BELEGART_OPTIONS.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {/* Kosten-Feld nur für Admin/GF - Abrechnungsrelevant! */}
                  {(userRole === 'admin' || userRole === 'gf') && (
                    <div className="space-y-2">
                      <Label htmlFor="kosten">Kosten (€)</Label>
                      <Input
                        id="kosten"
                        type="number"
                        step="0.01"
                        value={editingAuslage.kosten}
                        onChange={(e) => setEditingAuslage({ ...editingAuslage, kosten: e.target.value })}
                      />
                    </div>
                  )}
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

        {/* Beleg Dialog - Vergrößert für bessere Sichtbarkeit */}
        <Dialog open={showBelegDialog} onOpenChange={setShowBelegDialog}>
          <DialogContent className="max-w-[95vw] w-full md:max-w-5xl max-h-[95vh] flex flex-col">
            <DialogHeader className="flex-shrink-0">
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary-blue" />
                Auslagenbeleg {currentBeleg?.tourNr}
              </DialogTitle>
              <DialogDescription>
                Datum: {currentBeleg?.datum ? formatDate(currentBeleg.datum) : "—"}
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 min-h-0 py-4">
              {currentBeleg?.belegUrl ? (
                (() => {
                  const url = currentBeleg.belegUrl.toLowerCase()
                  const isImage = url.includes('.jpg') || url.includes('.jpeg') || url.includes('.png') || url.includes('.webp') || url.includes('.gif')

                  if (isImage) {
                    return (
                      <div className="h-full flex items-center justify-center bg-gray-50 rounded-lg border overflow-auto p-4">
                        <img
                          src={currentBeleg.belegUrl}
                          alt={`Auslagenbeleg ${currentBeleg.tourNr}`}
                          className="max-w-full max-h-[70vh] object-contain rounded shadow-sm"
                        />
                      </div>
                    )
                  }

                  return (
                    <div className="h-full border rounded-lg overflow-hidden bg-gray-50">
                      <iframe
                        src={currentBeleg.belegUrl}
                        className="w-full h-[70vh]"
                        title="PDF Beleg"
                      />
                    </div>
                  )
                })()
              ) : (
                <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                  <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">Kein Beleg verfügbar</p>
                  <p className="text-sm text-gray-400 mt-1">
                    Für diese Auslage wurde kein PDF-Beleg hochgeladen.
                  </p>
                </div>
              )}
            </div>
            <DialogFooter className="flex-shrink-0 flex-wrap gap-2">
              {currentBeleg?.belegUrl && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => {
                      const link = document.createElement('a')
                      link.href = currentBeleg.belegUrl!
                      link.download = `Auslagenbeleg_${currentBeleg.tourNr}_${currentBeleg.datum}.${currentBeleg.belegUrl!.split('.').pop() || 'pdf'}`
                      link.target = '_blank'
                      document.body.appendChild(link)
                      link.click()
                      document.body.removeChild(link)
                    }}
                    className="gap-2"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Beleg herunterladen
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => window.open(currentBeleg.belegUrl, '_blank')}
                  >
                    In neuem Tab öffnen
                  </Button>
                </>
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
