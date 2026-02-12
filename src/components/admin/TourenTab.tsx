"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Search, Edit, Trash2, Car, MapPin, Clock, FileText, X, Check } from "lucide-react"
import type { Tour, TourStatus, Fahrzeugart } from "@/lib/supabase"
import {
  getAllTouren,
  createTour,
  updateTourAdmin,
  deleteTourById,
  assignFahrerToTour,
  formatTourStatus,
  getTourStatusColor,
  formatFahrzeugart,
  type CreateTourData
} from "@/lib/touren-api"

interface Fahrer {
  id: string
  vorname: string
  nachname: string
  status: string
}

interface TourenTabProps {
  fahrer: Fahrer[]
  onRefresh?: () => void
}

const emptyFormData: CreateTourData = {
  fahrzeugart: 'pkw',
  kennzeichen: '',
  fin: '',
  abholort_name: '',
  abholort_strasse: '',
  abholort_plz: '',
  abholort_ort: '',
  abholort_ansprechpartner_name: '',
  abholort_ansprechpartner_telefon: '',
  abgabeort_name: '',
  abgabeort_strasse: '',
  abgabeort_plz: '',
  abgabeort_ort: '',
  abgabeort_ansprechpartner_name: '',
  abgabeort_ansprechpartner_telefon: '',
  abholzeit_ab: '',
  abgabezeit_bis: '',
  hinweise: '',
  distance_km: undefined,
  fahrer_id: undefined
}

export function TourenTab({ fahrer, onRefresh }: TourenTabProps) {
  const [touren, setTouren] = useState<Tour[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [filterFahrer, setFilterFahrer] = useState<string>("all")
  const [filterDateFrom, setFilterDateFrom] = useState<string>("")
  const [filterDateTo, setFilterDateTo] = useState<string>("")
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [selectedTour, setSelectedTour] = useState<Tour | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [formData, setFormData] = useState<CreateTourData>(emptyFormData)

  const aktiveFahrer = fahrer.filter(f => f.status === 'aktiv')

  useEffect(() => { loadTouren() }, [])

  const loadTouren = async () => {
    try {
      setIsLoading(true)
      const data = await getAllTouren()
      setTouren(data)
    } catch (err) {
      console.error("Fehler beim Laden:", err)
    } finally {
      setIsLoading(false)
    }
  }

  const resetForm = () => { setFormData(emptyFormData); setError("") }

  const formatDate = (dateString?: string) => {
    if (!dateString) return "-"
    return new Date(dateString).toLocaleDateString('de-DE', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
    })
  }

  const getStatusBadge = (status: TourStatus) => {
    const colors = getTourStatusColor(status)
    return <Badge className={`${colors.bg} ${colors.text} ${colors.border} border`}>{formatTourStatus(status)}</Badge>
  }

  // Handler werden im nächsten Teil hinzugefügt
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      await createTour(formData)
      await loadTouren()
      setShowCreateModal(false)
      resetForm()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedTour) return
    setIsSubmitting(true)
    try {
      await updateTourAdmin(selectedTour.id, formData)
      await loadTouren()
      setShowEditModal(false)
      resetForm()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (tour: Tour) => {
    if (!confirm(`Tour #${tour.tour_nummer} löschen?`)) return
    try {
      await deleteTourById(tour.id)
      await loadTouren()
    } catch (err) {
      alert("Fehler: " + (err instanceof Error ? err.message : ""))
    }
  }

  const handleAssignFahrer = async (tourId: string, fahrerId: string | null) => {
    try {
      await assignFahrerToTour(tourId, fahrerId)
      await loadTouren()
    } catch (err) {
      alert("Fehler: " + (err instanceof Error ? err.message : ""))
    }
  }

  const openEditModal = (tour: Tour) => {
    setSelectedTour(tour)
    setFormData({
      fahrzeugart: tour.fahrzeugart, kennzeichen: tour.kennzeichen, fin: tour.fin,
      abholort_name: tour.abholort_name, abholort_strasse: tour.abholort_strasse,
      abholort_plz: tour.abholort_plz, abholort_ort: tour.abholort_ort,
      abholort_ansprechpartner_name: tour.abholort_ansprechpartner_name,
      abholort_ansprechpartner_telefon: tour.abholort_ansprechpartner_telefon,
      abgabeort_name: tour.abgabeort_name, abgabeort_strasse: tour.abgabeort_strasse,
      abgabeort_plz: tour.abgabeort_plz, abgabeort_ort: tour.abgabeort_ort,
      abgabeort_ansprechpartner_name: tour.abgabeort_ansprechpartner_name,
      abgabeort_ansprechpartner_telefon: tour.abgabeort_ansprechpartner_telefon,
      abholzeit_ab: tour.abholzeit_ab || '', abgabezeit_bis: tour.abgabezeit_bis || '',
      hinweise: tour.hinweise || '', distance_km: tour.distance_km, fahrer_id: tour.fahrer_id
    })
    setShowEditModal(true)
  }

  const filteredTouren = touren.filter(tour => {
    const matchesSearch = tour.kennzeichen.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tour.fin.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tour.tour_nummer.toString().includes(searchTerm)
    const matchesStatus = filterStatus === "all" || tour.status === filterStatus
    const matchesFahrer = filterFahrer === "all" || tour.fahrer_id === filterFahrer
    const matchesDateFrom = !filterDateFrom || (tour.abholzeit_ab && new Date(tour.abholzeit_ab) >= new Date(filterDateFrom))
    const matchesDateTo = !filterDateTo || (tour.abholzeit_ab && new Date(tour.abholzeit_ab) <= new Date(filterDateTo + "T23:59:59"))
    return matchesSearch && matchesStatus && matchesFahrer && matchesDateFrom && matchesDateTo
  })

  // Render folgt in Teil 2...
  return (
    <>
      {/* Hauptkarte mit Tabelle */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl text-primary-blue">Touren-Verwaltung</CardTitle>
              <CardDescription>Fahrzeugüberführungen verwalten</CardDescription>
            </div>
            <Button onClick={() => { resetForm(); setShowCreateModal(true) }} className="bg-primary-blue hover:bg-blue-700">
              <Plus className="mr-2 h-4 w-4" />Neue Tour
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filter */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input placeholder="Suche..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full md:w-48"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Status</SelectItem>
                <SelectItem value="neu">Neu</SelectItem>
                <SelectItem value="uebernahme_offen">Übernahme offen</SelectItem>
                <SelectItem value="unterwegs">Unterwegs</SelectItem>
                <SelectItem value="abgabe_offen">Abgabe offen</SelectItem>
                <SelectItem value="abgeschlossen">Abgeschlossen</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterFahrer} onValueChange={setFilterFahrer}>
              <SelectTrigger className="w-full md:w-48"><SelectValue placeholder="Fahrer" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Fahrer</SelectItem>
                {aktiveFahrer.map(f => <SelectItem key={f.id} value={f.id}>{f.vorname} {f.nachname}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="flex gap-2 items-center">
              <Input type="date" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)} className="w-full md:w-40" placeholder="Von" />
              <span className="text-gray-400">-</span>
              <Input type="date" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)} className="w-full md:w-40" placeholder="Bis" />
            </div>
          </div>

          {/* Tabelle */}
          {isLoading ? (
            <div className="text-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-blue mx-auto" /></div>
          ) : filteredTouren.length === 0 ? (
            <div className="text-center py-12">
              <Car className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold">Keine Touren gefunden</h3>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tour-Nr.</TableHead>
                    <TableHead>Fahrzeug</TableHead>
                    <TableHead>Kennzeichen</TableHead>
                    <TableHead>Strecke</TableHead>
                    <TableHead>Distanz</TableHead>
                    <TableHead>Fahrer</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Aktionen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTouren.map((tour) => (
                    <TableRow key={tour.id}>
                      <TableCell className="font-bold text-primary-blue">#{tour.tour_nummer}</TableCell>
                      <TableCell><Badge variant="outline">{formatFahrzeugart(tour.fahrzeugart)}</Badge></TableCell>
                      <TableCell className="font-medium">{tour.kennzeichen}</TableCell>
                      <TableCell className="text-sm">
                        <div className="flex items-center gap-1"><MapPin className="h-3 w-3 text-green-600" />{tour.abholort_ort}</div>
                        <div className="flex items-center gap-1 text-gray-500"><MapPin className="h-3 w-3 text-red-600" />{tour.abgabeort_ort}</div>
                      </TableCell>
                      <TableCell>{tour.distance_km ? `${tour.distance_km} km` : "-"}</TableCell>
                      <TableCell>
                        <Select value={tour.fahrer_id || "none"} onValueChange={(v) => handleAssignFahrer(tour.id, v === "none" ? null : v)}>
                          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Zuweisen" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Nicht zugewiesen</SelectItem>
                            {aktiveFahrer.map(f => <SelectItem key={f.id} value={f.id}>{f.vorname} {f.nachname}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>{getStatusBadge(tour.status)}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => { setSelectedTour(tour); setShowDetailModal(true) }}><FileText className="h-3 w-3" /></Button>
                          <Button size="sm" variant="outline" onClick={() => openEditModal(tour)} className="text-blue-700 border-blue-300 hover:bg-blue-50"><Edit className="h-3 w-3" /></Button>
                          <Button size="sm" variant="outline" onClick={() => handleDelete(tour)} className="text-red-700 border-red-300 hover:bg-red-50"><Trash2 className="h-3 w-3" /></Button>
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

      {/* Modals werden separat importiert */}
      {(showCreateModal || showEditModal) && (
        <TourFormModal
          isOpen={showCreateModal || showEditModal}
          isCreate={showCreateModal}
          selectedTour={selectedTour}
          formData={formData}
          setFormData={setFormData}
          onClose={() => { setShowCreateModal(false); setShowEditModal(false); resetForm() }}
          onSubmit={showCreateModal ? handleCreate : handleUpdate}
          isSubmitting={isSubmitting}
          error={error}
          fahrer={aktiveFahrer}
        />
      )}

      {showDetailModal && selectedTour && (
        <TourDetailModal
          tour={selectedTour}
          onClose={() => { setShowDetailModal(false); setSelectedTour(null) }}
          formatDate={formatDate}
          getStatusBadge={getStatusBadge}
        />
      )}
    </>
  )
}

// Inline sub-components for modals to keep file smaller
function TourFormModal({ isOpen, isCreate, selectedTour, formData, setFormData, onClose, onSubmit, isSubmitting, error, fahrer }: any) {
  if (!isOpen) return null
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl text-primary-blue">
              {isCreate ? "Neue Tour erstellen" : `Tour #${selectedTour?.tour_nummer} bearbeiten`}
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}><X className="h-4 w-4" /></Button>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-6">
            {error && <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">{error}</div>}

            {/* Fahrzeugdaten */}
            <div className="border-b pb-6">
              <h3 className="font-semibold text-lg mb-4 text-primary-blue flex items-center gap-2"><Car className="h-5 w-5" />Fahrzeugdaten</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>Fahrzeugart *</Label>
                  <Select value={formData.fahrzeugart} onValueChange={(v: Fahrzeugart) => setFormData({...formData, fahrzeugart: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pkw">PKW</SelectItem>
                      <SelectItem value="e-auto">E-Auto</SelectItem>
                      <SelectItem value="transporter">Transporter</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Kennzeichen *</Label>
                  <Input value={formData.kennzeichen} onChange={(e) => setFormData({...formData, kennzeichen: e.target.value.toUpperCase()})} required />
                </div>
                <div>
                  <Label>FIN (17 Zeichen) *</Label>
                  <Input value={formData.fin} onChange={(e) => setFormData({...formData, fin: e.target.value.toUpperCase().slice(0, 17)})} maxLength={17} required />
                  <p className="text-xs text-gray-500 mt-1">{formData.fin.length}/17</p>
                </div>
              </div>
            </div>

            {/* Abholort */}
            <div className="border-b pb-6">
              <h3 className="font-semibold text-lg mb-4 text-primary-blue flex items-center gap-2"><MapPin className="h-5 w-5 text-green-600" />Abholort</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><Label>Name/Firma *</Label><Input value={formData.abholort_name} onChange={(e) => setFormData({...formData, abholort_name: e.target.value})} required /></div>
                <div><Label>Straße *</Label><Input value={formData.abholort_strasse} onChange={(e) => setFormData({...formData, abholort_strasse: e.target.value})} required /></div>
                <div><Label>PLZ *</Label><Input value={formData.abholort_plz} onChange={(e) => setFormData({...formData, abholort_plz: e.target.value})} required /></div>
                <div><Label>Ort *</Label><Input value={formData.abholort_ort} onChange={(e) => setFormData({...formData, abholort_ort: e.target.value})} required /></div>
                <div><Label>Ansprechpartner *</Label><Input value={formData.abholort_ansprechpartner_name} onChange={(e) => setFormData({...formData, abholort_ansprechpartner_name: e.target.value})} required /></div>
                <div><Label>Telefon *</Label><Input value={formData.abholort_ansprechpartner_telefon} onChange={(e) => setFormData({...formData, abholort_ansprechpartner_telefon: e.target.value})} required /></div>
              </div>
            </div>

            {/* Abgabeort */}
            <div className="border-b pb-6">
              <h3 className="font-semibold text-lg mb-4 text-primary-blue flex items-center gap-2"><MapPin className="h-5 w-5 text-red-600" />Abgabeort</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><Label>Name/Firma *</Label><Input value={formData.abgabeort_name} onChange={(e) => setFormData({...formData, abgabeort_name: e.target.value})} required /></div>
                <div><Label>Straße *</Label><Input value={formData.abgabeort_strasse} onChange={(e) => setFormData({...formData, abgabeort_strasse: e.target.value})} required /></div>
                <div><Label>PLZ *</Label><Input value={formData.abgabeort_plz} onChange={(e) => setFormData({...formData, abgabeort_plz: e.target.value})} required /></div>
                <div><Label>Ort *</Label><Input value={formData.abgabeort_ort} onChange={(e) => setFormData({...formData, abgabeort_ort: e.target.value})} required /></div>
                <div><Label>Ansprechpartner *</Label><Input value={formData.abgabeort_ansprechpartner_name} onChange={(e) => setFormData({...formData, abgabeort_ansprechpartner_name: e.target.value})} required /></div>
                <div><Label>Telefon *</Label><Input value={formData.abgabeort_ansprechpartner_telefon} onChange={(e) => setFormData({...formData, abgabeort_ansprechpartner_telefon: e.target.value})} required /></div>
              </div>
            </div>

            {/* Zeiten */}
            <div className="border-b pb-6">
              <h3 className="font-semibold text-lg mb-4 text-primary-blue flex items-center gap-2"><Clock className="h-5 w-5" />Zeiten & Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><Label>Abholung ab</Label><Input type="datetime-local" value={formData.abholzeit_ab} onChange={(e) => setFormData({...formData, abholzeit_ab: e.target.value})} /></div>
                <div><Label>Abgabe bis</Label><Input type="datetime-local" value={formData.abgabezeit_bis} onChange={(e) => setFormData({...formData, abgabezeit_bis: e.target.value})} /></div>
                <div><Label>Distanz (km)</Label><Input type="number" value={formData.distance_km || ''} onChange={(e) => setFormData({...formData, distance_km: e.target.value ? Number(e.target.value) : undefined})} /></div>
                <div>
                  <Label>Fahrer</Label>
                  <Select value={formData.fahrer_id || "none"} onValueChange={(v) => setFormData({...formData, fahrer_id: v === "none" ? undefined : v})}>
                    <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nicht zuweisen</SelectItem>
                      {fahrer.map((f: any) => <SelectItem key={f.id} value={f.id}>{f.vorname} {f.nachname}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-2"><Label>Hinweise</Label><Textarea value={formData.hinweise} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({...formData, hinweise: e.target.value})} rows={3} /></div>
              </div>
            </div>

            <div className="flex justify-end gap-4">
              <Button type="button" variant="outline" onClick={onClose}>Abbrechen</Button>
              <Button type="submit" disabled={isSubmitting} className="bg-primary-blue hover:bg-blue-700">
                <Check className="mr-2 h-4 w-4" />{isSubmitting ? "Speichert..." : isCreate ? "Erstellen" : "Speichern"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

function TourDetailModal({ tour, onClose, formatDate, getStatusBadge }: any) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl text-primary-blue">Tour #{tour.tour_nummer}</CardTitle>
              <CardDescription>{getStatusBadge(tour.status)}</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}><X className="h-4 w-4" /></Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-semibold mb-3 flex items-center gap-2"><Car className="h-4 w-4" />Fahrzeugdaten</h4>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div><p className="text-gray-500">Fahrzeugart</p><p className="font-medium">{formatFahrzeugart(tour.fahrzeugart)}</p></div>
              <div><p className="text-gray-500">Kennzeichen</p><p className="font-medium">{tour.kennzeichen}</p></div>
              <div><p className="text-gray-500">FIN</p><p className="font-medium font-mono text-xs">{tour.fin}</p></div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-green-50 p-4 rounded-lg">
              <h4 className="font-semibold mb-3 text-green-800"><MapPin className="h-4 w-4 inline mr-1" />Abholort</h4>
              <p className="font-medium">{tour.abholort_name}</p>
              <p className="text-sm">{tour.abholort_strasse}, {tour.abholort_plz} {tour.abholort_ort}</p>
              <p className="text-sm mt-2"><strong>Kontakt:</strong> {tour.abholort_ansprechpartner_name}, {tour.abholort_ansprechpartner_telefon}</p>
            </div>
            <div className="bg-red-50 p-4 rounded-lg">
              <h4 className="font-semibold mb-3 text-red-800"><MapPin className="h-4 w-4 inline mr-1" />Abgabeort</h4>
              <p className="font-medium">{tour.abgabeort_name}</p>
              <p className="text-sm">{tour.abgabeort_strasse}, {tour.abgabeort_plz} {tour.abgabeort_ort}</p>
              <p className="text-sm mt-2"><strong>Kontakt:</strong> {tour.abgabeort_ansprechpartner_name}, {tour.abgabeort_ansprechpartner_telefon}</p>
            </div>
          </div>
          <div className="bg-blue-50 p-4 rounded-lg grid grid-cols-3 gap-4 text-sm">
            <div><p className="text-gray-500">Distanz</p><p className="font-medium text-lg">{tour.distance_km ? `${tour.distance_km} km` : "-"}</p></div>
            <div><p className="text-gray-500">Abholung ab</p><p className="font-medium">{formatDate(tour.abholzeit_ab)}</p></div>
            <div><p className="text-gray-500">Abgabe bis</p><p className="font-medium">{formatDate(tour.abgabezeit_bis)}</p></div>
          </div>
          {tour.hinweise && <div className="bg-yellow-50 p-4 rounded-lg"><h4 className="font-semibold mb-2">Hinweise</h4><p className="text-sm">{tour.hinweise}</p></div>}
        </CardContent>
      </Card>
    </div>
  )
}
