"use client"

import { useEffect, useState, useMemo, useCallback } from "react"
import { useRouter } from "next/navigation"
import { AdminLayout } from "@/components/admin/AdminLayout"
import { FahrerTab, type FahrerTabFahrer } from "@/components/admin/tabs/FahrerTab"
import { FahrerFormModal, type FahrerFormData } from "@/components/admin/FahrerFormModal"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { getCurrentUser, getUserProfile, signOut } from "@/lib/api"
import {
  getAllFahrerAdmin,
  createFahrer,
  updateFahrer,
  updateFahrerStatus,
  archiveFahrer,
  unarchiveFahrer
} from "@/lib/admin-api"
import { Search, Filter, RefreshCw, X, UserPlus, Archive } from "lucide-react"

// Filter-Optionen für Status
const STATUS_OPTIONS = [
  { value: "all", label: "Alle Status" },
  { value: "aktiv", label: "Aktiv" },
  { value: "inaktiv", label: "Inaktiv" }
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

// Leeres Fahrer-Formular
const emptyFahrerForm: FahrerFormData = {
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
  zeitmodell: "minijob",
  festesGehalt: 0
}

export default function FahrerPage() {
  const router = useRouter()
  const [userName, setUserName] = useState("")
  const [userRole, setUserRole] = useState<'admin' | 'disponent'>('admin')
  const [isLoading, setIsLoading] = useState(true)

  // Data State
  const [allFahrer, setAllFahrer] = useState<FahrerTabFahrer[]>([])

  // Filter State
  const [searchTerm, setSearchTerm] = useState("")
  const [filterStatus, setFilterStatus] = useState("all")
  const [showArchived, setShowArchived] = useState(false)

  // Form State
  const [showAddForm, setShowAddForm] = useState(false)
  const [showEditForm, setShowEditForm] = useState(false)
  const [newFahrer, setNewFahrer] = useState<FahrerFormData>(emptyFahrerForm)
  const [editingFahrer, setEditingFahrer] = useState<FahrerFormData & { id?: number }>(emptyFahrerForm)
  const [showPassword, setShowPassword] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Archive Modal State
  const [showArchiveModal, setShowArchiveModal] = useState(false)
  const [archiveTargetId, setArchiveTargetId] = useState<number | null>(null)
  const [archiveTargetName, setArchiveTargetName] = useState("")
  const [archiveReason, setArchiveReason] = useState("")
  const [isArchiving, setIsArchiving] = useState(false)

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
      if (profile.role !== 'admin' && profile.role !== 'disponent' && profile.role !== 'gf') {
        router.push("/admin")
        return
      }
      // GF hat gleiche Rechte wie Admin
      const effectiveRole = profile.role === 'gf' ? 'admin' : profile.role as 'admin' | 'disponent'
      setUserRole(effectiveRole)
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
      const data = await getAllFahrerAdmin()
      setAllFahrer(data.map((f: any) => ({
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
        archived_at: f.archived_at,
        archive_reason: f.archive_reason
      })))
    } catch (error) {
      console.error("Fehler beim Laden der Fahrer:", error)
    }
  }

  const handleLogout = async () => {
    await signOut()
    router.push("/admin")
  }

  // Gefilterte Fahrer berechnen
  const filteredFahrer = useMemo(() => {
    return allFahrer.filter(fahrer => {
      // Archivierte ausblenden wenn nicht aktiviert
      if (!showArchived && fahrer.archived_at) {
        return false
      }

      // Suche
      const searchLower = searchTerm.toLowerCase()
      const fullName = `${fahrer.vorname} ${fahrer.nachname}`.toLowerCase()
      const matchesSearch = !searchTerm ||
        fullName.includes(searchLower) ||
        fahrer.ort.toLowerCase().includes(searchLower) ||
        fahrer.fuehrerscheinNr.toLowerCase().includes(searchLower)

      // Status-Filter (ignoriert archivierte wenn showArchived)
      const matchesStatus = filterStatus === "all" || fahrer.status === filterStatus

      return matchesSearch && matchesStatus
    })
  }, [allFahrer, searchTerm, filterStatus, showArchived])

  // Handler: Fahrer hinzufügen
  const handleAddFahrer = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (userRole !== 'admin') {
      alert("Nur Admin/Geschäftsführer dürfen Fahrer anlegen.")
      return
    }

    if (!newFahrer.fuehrerscheinklassen || newFahrer.fuehrerscheinklassen.length === 0) {
      alert("Bitte mindestens eine Führerscheinklasse auswählen.")
      return
    }

    setIsSaving(true)
    try {
      // E-Mail-Logik: Wenn bereits @ enthalten, als echte E-Mail verwenden
      // Sonst @transnext.fahrer anhängen
      const benutzername = newFahrer.benutzername?.trim() || ""
      const email = benutzername.includes('@')
        ? benutzername  // Echte E-Mail eingegeben
        : `${benutzername}@transnext.fahrer`  // Nur Benutzername, Domain anhängen

      await createFahrer({
        email,
        password: newFahrer.passwort || "",
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
        zeitmodell: (newFahrer.zeitmodell as 'minijob' | 'werkstudent' | 'teilzeit' | 'vollzeit') || 'minijob'
      })

      setShowAddForm(false)
      setNewFahrer(emptyFahrerForm)
      await loadData()
      alert("Fahrer erfolgreich angelegt!")
    } catch (error: any) {
      console.error("Fehler beim Anlegen:", error)
      alert(error.message || "Fehler beim Anlegen des Fahrers.")
    } finally {
      setIsSaving(false)
    }
  }, [newFahrer, userRole])

  // Handler: Fahrer bearbeiten öffnen
  const handleEditFahrer = useCallback((fahrer: FahrerTabFahrer) => {
    if (userRole !== 'admin') {
      alert("Nur Admin/Geschäftsführer dürfen Fahrer bearbeiten.")
      return
    }
    setEditingFahrer({
      id: fahrer.id,
      vorname: fahrer.vorname,
      nachname: fahrer.nachname,
      geburtsdatum: fahrer.geburtsdatum,
      adresse: fahrer.adresse,
      plz: fahrer.plz,
      ort: fahrer.ort,
      fuehrerscheinNr: fahrer.fuehrerscheinNr,
      fuehrerscheinDatum: fahrer.fuehrerscheinDatum,
      ausstellendeBehoerde: fahrer.ausstellendeBehoerde,
      fuehrerscheinklassen: fahrer.fuehrerscheinklassen,
      ausweisnummer: fahrer.ausweisnummer,
      ausweisAblauf: fahrer.ausweisAblauf,
      zeitmodell: fahrer.zeitmodell || "minijob"
    })
    setShowEditForm(true)
  }, [userRole])

  // Handler: Fahrer speichern
  const handleSaveEdit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingFahrer.id) return

    setIsSaving(true)
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
        zeitmodell: editingFahrer.zeitmodell as 'minijob' | 'werkstudent' | 'teilzeit' | 'vollzeit'
      })

      setShowEditForm(false)
      setEditingFahrer(emptyFahrerForm)
      await loadData()
    } catch (error: any) {
      console.error("Fehler beim Speichern:", error)
      alert(error.message || "Fehler beim Speichern.")
    } finally {
      setIsSaving(false)
    }
  }, [editingFahrer])

  // Handler: Fahrer-Status umschalten
  const handleToggleStatus = useCallback(async (id: number) => {
    if (userRole !== 'admin') {
      alert("Nur Admin/Geschäftsführer dürfen den Status ändern.")
      return
    }

    const fahrer = allFahrer.find(f => f.id === id)
    if (!fahrer) return

    const newStatus = fahrer.status === 'aktiv' ? 'inaktiv' : 'aktiv'

    try {
      await updateFahrerStatus(id.toString(), newStatus)
      await loadData()
    } catch (error: any) {
      console.error("Fehler beim Status-Wechsel:", error)
      alert(error.message || "Fehler beim Ändern des Status.")
    }
  }, [allFahrer, userRole])

  // Handler: Archivieren öffnen
  const handleOpenArchiveModal = useCallback((id: number) => {
    const fahrer = allFahrer.find(f => f.id === id)
    if (!fahrer) return

    setArchiveTargetId(id)
    setArchiveTargetName(`${fahrer.vorname} ${fahrer.nachname}`)
    setArchiveReason("")
    setShowArchiveModal(true)
  }, [allFahrer])

  // Handler: Archivieren bestätigen
  const handleConfirmArchive = useCallback(async () => {
    if (!archiveTargetId) return

    setIsArchiving(true)
    try {
      const result = await archiveFahrer(archiveTargetId, archiveReason || undefined)
      if (!result.success) {
        alert(result.error || "Fehler beim Archivieren")
        return
      }
      setShowArchiveModal(false)
      setArchiveTargetId(null)
      setArchiveReason("")
      await loadData()
    } catch (error: any) {
      console.error("Fehler beim Archivieren:", error)
      alert(error.message || "Fehler beim Archivieren.")
    } finally {
      setIsArchiving(false)
    }
  }, [archiveTargetId, archiveReason])

  // Handler: Archivierung aufheben
  const handleUnarchiveFahrer = useCallback(async (id: number) => {
    if (userRole !== 'admin') {
      alert("Nur Admin/Geschäftsführer dürfen Archivierungen aufheben.")
      return
    }

    if (!confirm("Archivierung aufheben? Der Fahrer bleibt inaktiv und muss separat aktiviert werden.")) {
      return
    }

    try {
      const result = await unarchiveFahrer(id)
      if (!result.success) {
        alert(result.error || "Fehler beim Aufheben der Archivierung")
        return
      }
      await loadData()
    } catch (error: any) {
      console.error("Fehler beim Entarchivieren:", error)
      alert(error.message || "Fehler beim Aufheben der Archivierung.")
    }
  }, [userRole])

  // Handler: Führerscheinklasse ändern (Add)
  const handleKlassenChangeAdd = useCallback((klasse: string, checked: boolean) => {
    setNewFahrer(prev => ({
      ...prev,
      fuehrerscheinklassen: checked
        ? [...(prev.fuehrerscheinklassen || []), klasse]
        : (prev.fuehrerscheinklassen || []).filter(k => k !== klasse)
    }))
  }, [])

  // Handler: Führerscheinklasse ändern (Edit)
  const handleKlassenChangeEdit = useCallback((klasse: string, checked: boolean) => {
    setEditingFahrer(prev => ({
      ...prev,
      fuehrerscheinklassen: checked
        ? [...(prev.fuehrerscheinklassen || []), klasse]
        : (prev.fuehrerscheinklassen || []).filter(k => k !== klasse)
    }))
  }, [])

  // Handler: Filter zurücksetzen
  const handleResetFilters = () => {
    setSearchTerm("")
    setFilterStatus("all")
    setShowArchived(false)
  }

  // Anzahl archivierter Fahrer
  const archivedCount = useMemo(() => {
    return allFahrer.filter(f => f.archived_at).length
  }, [allFahrer])

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
            <h1 className="text-2xl font-bold text-gray-900">Fahrer</h1>
            <p className="text-gray-500 mt-1">
              {filteredFahrer.length} von {allFahrer.length - (showArchived ? 0 : archivedCount)} Fahrern
              {archivedCount > 0 && !showArchived && (
                <span className="text-orange-500 ml-1">({archivedCount} archiviert)</span>
              )}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Aktualisieren
            </Button>
            {userRole === 'admin' && !showAddForm && !showEditForm && (
              <Button
                size="sm"
                onClick={() => setShowAddForm(true)}
                className="bg-primary-blue hover:bg-blue-700"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Fahrer hinzufügen
              </Button>
            )}
          </div>
        </div>

        {/* Add Fahrer Form */}
        {showAddForm && userRole === 'admin' && (
          <FahrerFormModal
            mode="create"
            fahrer={newFahrer}
            onFahrerChange={setNewFahrer}
            onSubmit={handleAddFahrer}
            onCancel={() => {
              setShowAddForm(false)
              setNewFahrer(emptyFahrerForm)
            }}
            onKlassenChange={handleKlassenChangeAdd}
            showPassword={showPassword}
            onTogglePassword={() => setShowPassword(!showPassword)}
          />
        )}

        {/* Edit Fahrer Form */}
        {showEditForm && userRole === 'admin' && (
          <FahrerFormModal
            mode="edit"
            fahrer={editingFahrer}
            onFahrerChange={setEditingFahrer}
            onSubmit={handleSaveEdit}
            onCancel={() => {
              setShowEditForm(false)
              setEditingFahrer(emptyFahrerForm)
            }}
            onKlassenChange={handleKlassenChangeEdit}
          />
        )}

        {/* Filter Card */}
        {!showAddForm && !showEditForm && (
          <Card className="border-gray-100 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-gray-500" />
                  <CardTitle className="text-base font-medium text-gray-900">Filter & Suche</CardTitle>
                </div>
                {(searchTerm || filterStatus !== "all" || showArchived) && (
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
                      placeholder="Suche nach Name, Ort oder Führerschein-Nr..."
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

                {/* Archivierte anzeigen Toggle (nur Admin) */}
                {userRole === 'admin' && archivedCount > 0 && (
                  <div className="flex items-center gap-2">
                    <Switch
                      id="showArchived"
                      checked={showArchived}
                      onCheckedChange={setShowArchived}
                    />
                    <Label htmlFor="showArchived" className="text-sm text-gray-600 cursor-pointer flex items-center gap-1">
                      <Archive className="h-3.5 w-3.5 text-orange-500" />
                      Archivierte ({archivedCount})
                    </Label>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Fahrer-Tabelle */}
        {!showAddForm && !showEditForm && (
          <FahrerTab
            alleFahrer={allFahrer}
            filteredFahrer={filteredFahrer}
            onEditFahrer={handleEditFahrer}
            onToggleStatus={handleToggleStatus}
            onArchiveFahrer={handleOpenArchiveModal}
            onUnarchiveFahrer={handleUnarchiveFahrer}
            formatDate={formatDate}
            isAdmin={userRole === 'admin'}
          />
        )}
      </div>

      {/* Archive Modal */}
      <Dialog open={showArchiveModal} onOpenChange={setShowArchiveModal}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Archive className="h-5 w-5 text-orange-500" />
              Fahrer archivieren
            </DialogTitle>
            <DialogDescription>
              Archivierte Fahrer haben keinen Zugang mehr zum Fahrerportal und werden
              nicht mehr in der Verfügbarkeitsplanung angezeigt.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
              <p className="font-medium text-gray-900">{archiveTargetName}</p>
              <p className="text-sm text-orange-700 mt-1">
                Historische Daten (Touren, Auslagen) bleiben erhalten.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="archiveReason">Grund (optional)</Label>
              <Textarea
                id="archiveReason"
                placeholder="z.B. Kündigung, Ruhestand, Ende der Zusammenarbeit..."
                value={archiveReason}
                onChange={(e) => setArchiveReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowArchiveModal(false)}
              disabled={isArchiving}
            >
              Abbrechen
            </Button>
            <Button
              onClick={handleConfirmArchive}
              disabled={isArchiving}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {isArchiving ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Archive className="h-4 w-4 mr-2" />
              )}
              Archivieren
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  )
}
