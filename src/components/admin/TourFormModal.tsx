"use client"
import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { AddressAutocomplete, type AddressData } from "@/components/ui/address-autocomplete"
import { Car, MapPin, Clock, X, Check, Loader2 } from "lucide-react"
import type { Fahrzeugart } from "@/lib/supabase"
import { calculateDistanceViaAPI, type CreateTourData } from "@/lib/touren-api"

interface Fahrer {
  id: string
  vorname: string
  nachname: string
}

interface TourFormModalProps {
  isOpen: boolean
  isCreate: boolean
  selectedTour: any
  formData: CreateTourData
  setFormData: (data: CreateTourData | ((prev: CreateTourData) => CreateTourData)) => void
  onClose: () => void
  onSubmit: (e: React.FormEvent) => void
  isSubmitting: boolean
  error: string
  fahrer: Fahrer[]
}

export function TourFormModal({
  isOpen,
  isCreate,
  selectedTour,
  formData,
  setFormData,
  onClose,
  onSubmit,
  isSubmitting,
  error,
  fahrer
}: TourFormModalProps) {
  const [isCalculatingDistance, setIsCalculatingDistance] = useState(false)
  const [distanceError, setDistanceError] = useState<string | null>(null)

  const calculateDistance = useCallback(async (updatedFormData: CreateTourData) => {
    const hasAbholortCoords = updatedFormData.abholort_lat && updatedFormData.abholort_lng
    const hasAbgabeortCoords = updatedFormData.abgabeort_lat && updatedFormData.abgabeort_lng

    const abholortAddress = !hasAbholortCoords && updatedFormData.abholort_strasse && updatedFormData.abholort_plz && updatedFormData.abholort_ort
      ? `${updatedFormData.abholort_strasse}, ${updatedFormData.abholort_plz} ${updatedFormData.abholort_ort}, Germany`
      : null
    const abgabeortAddress = !hasAbgabeortCoords && updatedFormData.abgabeort_strasse && updatedFormData.abgabeort_plz && updatedFormData.abgabeort_ort
      ? `${updatedFormData.abgabeort_strasse}, ${updatedFormData.abgabeort_plz} ${updatedFormData.abgabeort_ort}, Germany`
      : null

    if (!hasAbholortCoords && !abholortAddress) return
    if (!hasAbgabeortCoords && !abgabeortAddress) return

    setIsCalculatingDistance(true)
    setDistanceError(null)
    try {
      const result = await calculateDistanceViaAPI(
        hasAbholortCoords ? { lat: updatedFormData.abholort_lat, lng: updatedFormData.abholort_lng } : { address: abholortAddress! },
        hasAbgabeortCoords ? { lat: updatedFormData.abgabeort_lat, lng: updatedFormData.abgabeort_lng } : { address: abgabeortAddress! }
      )
      if (result.distance_km) {
        setFormData((prev) => ({ ...prev, distance_km: result.distance_km ?? undefined }))
        setDistanceError(null)
      } else if (result.error) {
        setDistanceError(result.error)
        console.warn("Distanzberechnung:", result.error, result.error_code)
      }
    } catch (err) {
      console.error("Distanzberechnung fehlgeschlagen:", err)
      setDistanceError("Unerwarteter Fehler bei Distanzberechnung")
    } finally {
      setIsCalculatingDistance(false)
    }
  }, [setFormData])

  // WICHTIG: Funktionale Updates verwenden, um Stale Closure zu vermeiden!
  const handleAbholortSelect = useCallback((address: AddressData) => {
    setFormData((prev) => {
      const newFormData = {
        ...prev,
        abholort_strasse: address.street,
        abholort_plz: address.zip,
        abholort_ort: address.city,
        abholort_place_id: address.place_id,
        abholort_lat: address.lat,
        abholort_lng: address.lng,
      }
      setTimeout(() => calculateDistance(newFormData), 100)
      return newFormData
    })
  }, [setFormData, calculateDistance])

  const handleAbgabeortSelect = useCallback((address: AddressData) => {
    setFormData((prev) => {
      const newFormData = {
        ...prev,
        abgabeort_strasse: address.street,
        abgabeort_plz: address.zip,
        abgabeort_ort: address.city,
        abgabeort_place_id: address.place_id,
        abgabeort_lat: address.lat,
        abgabeort_lng: address.lng,
      }
      setTimeout(() => calculateDistance(newFormData), 100)
      return newFormData
    })
  }, [setFormData, calculateDistance])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl text-primary-blue">
              {isCreate ? "Neue Tour erstellen" : `Tour ${selectedTour?.tour_nummer} bearbeiten`}
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
                  <Select value={formData.fahrzeugart} onValueChange={(v: Fahrzeugart) => setFormData((prev) => ({...prev, fahrzeugart: v}))}>
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
                  <Input value={formData.kennzeichen} onChange={(e) => setFormData((prev) => ({...prev, kennzeichen: e.target.value.toUpperCase()}))} required />
                </div>
                <div>
                  <Label>FIN (17 Zeichen) *</Label>
                  <Input value={formData.fin} onChange={(e) => setFormData((prev) => ({...prev, fin: e.target.value.toUpperCase().slice(0, 17)}))} maxLength={17} required />
                  <p className="text-xs text-gray-500 mt-1">{formData.fin.length}/17</p>
                </div>
              </div>
            </div>

            {/* Abholort */}
            <div className="border-b pb-6">
              <h3 className="font-semibold text-lg mb-4 text-primary-blue flex items-center gap-2"><MapPin className="h-5 w-5 text-green-600" />Abholort</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><Label>Name/Firma *</Label><Input value={formData.abholort_name} onChange={(e) => setFormData((prev) => ({...prev, abholort_name: e.target.value}))} required /></div>
                <div>
                  <Label>Straße * (mit Autocomplete)</Label>
                  <AddressAutocomplete
                    value={formData.abholort_strasse}
                    onChange={(v) => setFormData((prev) => ({...prev, abholort_strasse: v}))}
                    onAddressSelect={handleAbholortSelect}
                    placeholder="Straße + Hausnummer eingeben"
                  />
                </div>
                <div><Label>PLZ *</Label><Input value={formData.abholort_plz} onChange={(e) => setFormData((prev) => ({...prev, abholort_plz: e.target.value}))} required /></div>
                <div><Label>Ort *</Label><Input value={formData.abholort_ort} onChange={(e) => setFormData((prev) => ({...prev, abholort_ort: e.target.value}))} required /></div>
                <div><Label>Ansprechpartner *</Label><Input value={formData.abholort_ansprechpartner_name} onChange={(e) => setFormData((prev) => ({...prev, abholort_ansprechpartner_name: e.target.value}))} required /></div>
                <div><Label>Telefon *</Label><Input value={formData.abholort_ansprechpartner_telefon} onChange={(e) => setFormData((prev) => ({...prev, abholort_ansprechpartner_telefon: e.target.value}))} required /></div>
              </div>
            </div>

            {/* Abgabeort */}
            <div className="border-b pb-6">
              <h3 className="font-semibold text-lg mb-4 text-primary-blue flex items-center gap-2"><MapPin className="h-5 w-5 text-red-600" />Abgabeort</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><Label>Name/Firma *</Label><Input value={formData.abgabeort_name} onChange={(e) => setFormData((prev) => ({...prev, abgabeort_name: e.target.value}))} required /></div>
                <div>
                  <Label>Straße * (mit Autocomplete)</Label>
                  <AddressAutocomplete
                    value={formData.abgabeort_strasse}
                    onChange={(v) => setFormData((prev) => ({...prev, abgabeort_strasse: v}))}
                    onAddressSelect={handleAbgabeortSelect}
                    placeholder="Straße + Hausnummer eingeben"
                  />
                </div>
                <div><Label>PLZ *</Label><Input value={formData.abgabeort_plz} onChange={(e) => setFormData((prev) => ({...prev, abgabeort_plz: e.target.value}))} required /></div>
                <div><Label>Ort *</Label><Input value={formData.abgabeort_ort} onChange={(e) => setFormData((prev) => ({...prev, abgabeort_ort: e.target.value}))} required /></div>
                <div><Label>Ansprechpartner *</Label><Input value={formData.abgabeort_ansprechpartner_name} onChange={(e) => setFormData((prev) => ({...prev, abgabeort_ansprechpartner_name: e.target.value}))} required /></div>
                <div><Label>Telefon *</Label><Input value={formData.abgabeort_ansprechpartner_telefon} onChange={(e) => setFormData((prev) => ({...prev, abgabeort_ansprechpartner_telefon: e.target.value}))} required /></div>
              </div>
            </div>

            {/* Zeiten & Details */}
            <div className="border-b pb-6">
              <h3 className="font-semibold text-lg mb-4 text-primary-blue flex items-center gap-2"><Clock className="h-5 w-5" />Zeiten & Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><Label>Abholung ab</Label><Input type="datetime-local" value={formData.abholzeit_ab || ''} onChange={(e) => setFormData((prev) => ({...prev, abholzeit_ab: e.target.value}))} /></div>
                <div><Label>Abgabe bis</Label><Input type="datetime-local" value={formData.abgabezeit_bis || ''} onChange={(e) => setFormData((prev) => ({...prev, abgabezeit_bis: e.target.value}))} /></div>
                <div>
                  <Label>Distanz (automatisch berechnet)</Label>
                  <div className="relative">
                    <Input
                      type="number"
                      value={formData.distance_km || ''}
                      readOnly
                      disabled
                      className={`bg-gray-100 pr-10 ${distanceError ? 'border-amber-400' : ''}`}
                      placeholder="Wird automatisch berechnet"
                    />
                    {isCalculatingDistance && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <Loader2 className="h-4 w-4 animate-spin text-primary-blue" />
                      </div>
                    )}
                  </div>
                  {distanceError ? (
                    <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                      <span className="inline-block w-3 h-3 text-amber-500">⚠</span>
                      {distanceError}
                    </p>
                  ) : (
                    <p className="text-xs text-gray-500 mt-1">
                      {formData.distance_km ? `${formData.distance_km} km` : "Adressen eingeben für Berechnung"}
                    </p>
                  )}
                </div>
                <div>
                  <Label>Fahrer</Label>
                  <Select value={formData.fahrer_id || "none"} onValueChange={(v) => setFormData((prev) => ({...prev, fahrer_id: v === "none" ? undefined : v}))}>
                    <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nicht zuweisen</SelectItem>
                      {fahrer.map((f) => <SelectItem key={f.id} value={f.id}>{f.vorname} {f.nachname}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-2"><Label>Hinweise</Label><Textarea value={formData.hinweise || ''} onChange={(e) => setFormData((prev) => ({...prev, hinweise: e.target.value}))} rows={3} /></div>
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
