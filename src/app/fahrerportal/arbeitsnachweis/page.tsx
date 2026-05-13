"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { FahrerportalLayout } from "@/components/fahrerportal/FahrerportalLayout"
import { ArrowLeft, Upload, CheckCircle, AlertCircle, Camera, FileText } from "lucide-react"
import { getCurrentUser, canAccessFahrerportal, createArbeitsnachweis } from "@/lib/api"
import { uploadBeleg } from "@/lib/storage"
import { processFileForUpload, isHeicFile } from "@/lib/heic-converter"

export default function ArbeitsnachweisPage() {
  const router = useRouter()
  const [fahrerName, setFahrerName] = useState("")
  const [fahrerRecord, setFahrerRecord] = useState<any>(null)
  const [saved, setSaved] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isAuthLoading, setIsAuthLoading] = useState(true)
  const [error, setError] = useState("")
  const [fileConversionMessage, setFileConversionMessage] = useState("")
  const [isConverting, setIsConverting] = useState(false)
  const [formData, setFormData] = useState({
    tourNr: "",
    datum: "",
    gefahreneKm: "",
    wartezeit: "keine" as "30-60" | "60-90" | "90-120" | "keine",
    beleg: null as File | null,
    auftraggeber: "" as "onlogist" | "smartandcare" | "",
    istRuecklaufer: false
  })

  useEffect(() => {
    checkAuth()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const checkAuth = async () => {
    try {
      const user = await getCurrentUser()
      if (!user) {
        router.push("/fahrerportal")
        return
      }

      // Nutze die neue Zugriffsprüfung (erlaubt Admin/GF mit Fahrer-Datensatz)
      const accessResult = await canAccessFahrerportal(user.id)

      if (!accessResult.canAccess) {
        console.log("Fahrerportal-Zugang verweigert:", accessResult.reason)
        router.push("/fahrerportal")
        return
      }

      // Speichere Fahrer-Datensatz für spätere Verwendung (z.B. beim Upload)
      setFahrerRecord(accessResult.fahrer)

      const name = accessResult.fahrer
        ? `${accessResult.fahrer.vorname} ${accessResult.fahrer.nachname}`
        : 'Fahrer'
      setFahrerName(name)
      setIsAuthLoading(false)
    } catch (error) {
      console.error("Auth Fehler:", error)
      router.push("/fahrerportal")
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      const user = await getCurrentUser()
      if (!user) throw new Error('Nicht angemeldet')

      let belegUrl: string | undefined

      // Upload PDF wenn vorhanden
      if (formData.beleg) {
        const { url } = await uploadBeleg(
          formData.beleg,
          user.id,
          'arbeitsnachweis',
          formData.tourNr
        )
        belegUrl = url
      }

      // Prüfe ob Auftraggeber ausgewählt wurde
      if (!formData.auftraggeber) {
        throw new Error('Bitte wählen Sie einen Auftraggeber aus')
      }

      // Erstelle Arbeitsnachweis mit Beleg-URL
      await createArbeitsnachweis({
        tour_nr: formData.tourNr,
        datum: formData.datum,
        gefahrene_km: parseFloat(formData.gefahreneKm),
        wartezeit: formData.wartezeit,
        beleg_url: belegUrl,
        auftraggeber: formData.auftraggeber,
        ist_ruecklaufer: formData.istRuecklaufer
      })

      setSaved(true)
      setTimeout(() => {
        setSaved(false)
        setFormData({
          tourNr: "",
          datum: "",
          gefahreneKm: "",
          wartezeit: "keine",
          beleg: null,
          auftraggeber: "",
          istRuecklaufer: false
        })
        setIsLoading(false)
      }, 2000)
    } catch (err) {
      console.error("Fehler beim Speichern:", err)
      setError(err instanceof Error ? err.message : "Fehler beim Speichern des Arbeitsnachweises")
      setIsLoading(false)
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const originalFile = e.target.files[0]
      setFileConversionMessage("")
      setError("")

      // Prüfe ob HEIC-Datei
      if (isHeicFile(originalFile)) {
        setIsConverting(true)
        setFileConversionMessage("iPhone-Foto wird konvertiert...")

        try {
          const result = await processFileForUpload(originalFile)
          setFormData({ ...formData, beleg: result.file })
          setFileConversionMessage(result.message)
        } catch (conversionError) {
          console.error("HEIC-Konvertierung fehlgeschlagen:", conversionError)
          setError(conversionError instanceof Error ? conversionError.message : "HEIC-Konvertierung fehlgeschlagen")
          setFormData({ ...formData, beleg: null })
          // Reset file input
          e.target.value = ""
        } finally {
          setIsConverting(false)
        }
      } else {
        // Andere Dateitypen direkt übernehmen
        setFormData({ ...formData, beleg: originalFile })
      }
    }
  }

  if (isAuthLoading) {
    return (
      <FahrerportalLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-blue" />
        </div>
      </FahrerportalLayout>
    )
  }

  return (
    <FahrerportalLayout title="Arbeitsnachweis">
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 max-w-2xl">
        {/* Zurück-Button */}
        <Link href="/fahrerportal/dashboard">
          <Button variant="ghost" className="mb-4 text-primary-blue hover:bg-blue-50 -ml-2 px-2">
            <ArrowLeft className="mr-1 h-4 w-4" />
            <span className="text-sm">Zurück</span>
          </Button>
        </Link>

        <Card className="border-gray-100 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl text-primary-blue flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Arbeitsnachweis hochladen
            </CardTitle>
            <CardDescription>
              Erfassen Sie hier Ihre abgeschlossene Tour
            </CardDescription>
          </CardHeader>
          <CardContent>
            {saved ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle className="h-8 w-8 text-emerald-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Erfolgreich gespeichert!
                </h3>
                <p className="text-gray-600">
                  Ihr Arbeitsnachweis wurde erfolgreich hochgeladen.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Tour-Nr. und Datum */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="tourNr" className="text-sm font-medium">
                      Tour-Nr. <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="tourNr"
                      type="text"
                      placeholder="z.B. T-2025-001"
                      value={formData.tourNr}
                      onChange={(e) => setFormData({ ...formData, tourNr: e.target.value })}
                      required
                      className="h-11"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="datum" className="text-sm font-medium">
                      Datum <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="datum"
                      type="date"
                      value={formData.datum}
                      onChange={(e) => setFormData({ ...formData, datum: e.target.value })}
                      required
                      className="h-11"
                    />
                  </div>
                </div>

                {/* KM und Wartezeit */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="gefahreneKm" className="text-sm font-medium">
                      Gefahrene KM <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="gefahreneKm"
                      type="number"
                      step="0.1"
                      min="0"
                      placeholder="z.B. 450"
                      value={formData.gefahreneKm}
                      onChange={(e) => setFormData({ ...formData, gefahreneKm: e.target.value })}
                      required
                      className="h-11"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="wartezeit" className="text-sm font-medium">
                      Wartezeit <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={formData.wartezeit}
                      onValueChange={(value) => setFormData({ ...formData, wartezeit: value as "30-60" | "60-90" | "90-120" | "keine" })}
                      required
                    >
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Bitte wählen" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="keine">Keine Wartezeit</SelectItem>
                        <SelectItem value="30-60">30-60 Min.</SelectItem>
                        <SelectItem value="60-90">60-90 Min.</SelectItem>
                        <SelectItem value="90-120">90-120 Min.</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Auftraggeber */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">
                    Auftraggeber <span className="text-red-500">*</span>
                  </Label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      className={`p-4 border-2 rounded-xl text-center transition-all ${
                        formData.auftraggeber === 'onlogist'
                          ? 'border-primary-blue bg-blue-50 ring-2 ring-primary-blue/20'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                      onClick={() => setFormData({ ...formData, auftraggeber: 'onlogist' })}
                    >
                      <span className={`font-semibold ${
                        formData.auftraggeber === 'onlogist' ? 'text-primary-blue' : 'text-gray-700'
                      }`}>
                        Onlogist
                      </span>
                    </button>

                    <button
                      type="button"
                      className={`p-4 border-2 rounded-xl text-center transition-all ${
                        formData.auftraggeber === 'smartandcare'
                          ? 'border-primary-blue bg-blue-50 ring-2 ring-primary-blue/20'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                      onClick={() => setFormData({ ...formData, auftraggeber: 'smartandcare' })}
                    >
                      <span className={`font-semibold ${
                        formData.auftraggeber === 'smartandcare' ? 'text-primary-blue' : 'text-gray-700'
                      }`}>
                        Smart and Care
                      </span>
                    </button>
                  </div>
                </div>

                {/* Rückläufer */}
                <div className="flex items-start space-x-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <Checkbox
                    id="istRuecklaufer"
                    checked={formData.istRuecklaufer}
                    onCheckedChange={(checked: boolean) => setFormData({ ...formData, istRuecklaufer: checked })}
                    className="mt-0.5"
                  />
                  <div>
                    <Label htmlFor="istRuecklaufer" className="font-medium cursor-pointer">
                      Diese Tour ist ein Rückläufer
                    </Label>
                    <p className="text-sm text-gray-500 mt-0.5">
                      Rückläufer werden mit 0€ vergütet
                    </p>
                  </div>
                </div>

                {/* Beleg-Upload */}
                <div className="space-y-2">
                  <Label htmlFor="beleg" className="text-sm font-medium">
                    Beleg hochladen <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="beleg"
                      type="file"
                      accept="application/pdf,image/jpeg,image/jpg,image/png,image/heic,image/heif"
                      onChange={handleFileChange}
                      required
                      className="h-12 cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary-blue file:text-white hover:file:bg-blue-700"
                    />
                  </div>
                  {isConverting && (
                    <div className="flex items-center gap-2 text-sm text-blue-700 bg-blue-50 p-2 rounded-lg">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-700" />
                      <span>iPhone-Foto wird konvertiert...</span>
                    </div>
                  )}
                  {formData.beleg && !isConverting && (
                    <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 p-2 rounded-lg">
                      <FileText className="h-4 w-4" />
                      <span className="truncate">{formData.beleg.name}</span>
                    </div>
                  )}
                  {fileConversionMessage && !isConverting && (
                    <div className="flex items-center gap-2 text-sm text-blue-700 bg-blue-50 p-2 rounded-lg">
                      <CheckCircle className="h-4 w-4" />
                      <span>{fileConversionMessage}</span>
                    </div>
                  )}
                  <p className="text-xs text-gray-500">
                    Erlaubt: PDF, JPG, PNG. iPhone-HEIC wird automatisch konvertiert.
                  </p>
                </div>

                {/* Fehleranzeige */}
                {error && (
                  <div className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-xl">
                    <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                    <p className="text-sm">{error}</p>
                  </div>
                )}

                {/* Buttons */}
                <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
                  <Link href="/fahrerportal/dashboard" className="sm:flex-1">
                    <Button type="button" variant="outline" className="w-full h-11" disabled={isLoading}>
                      Abbrechen
                    </Button>
                  </Link>
                  <Button
                    type="submit"
                    className="sm:flex-1 h-11 bg-primary-blue hover:bg-blue-700"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                        Wird hochgeladen...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" />
                        Hochladen
                      </>
                    )}
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </FahrerportalLayout>
  )
}
