"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FahrerportalLayout } from "@/components/fahrerportal/FahrerportalLayout"
import { ArrowLeft, Upload, CheckCircle, CreditCard, AlertCircle, FileText, Receipt } from "lucide-react"
import { getCurrentUser, canAccessFahrerportal, createAuslagennachweis } from "@/lib/api"
import { uploadBeleg } from "@/lib/storage"
import { processFileForUpload, isHeicFile } from "@/lib/heic-converter"

export default function AuslagennachweisPage() {
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
    kennzeichen: "",
    datum: "",
    startort: "",
    zielort: "",
    belegart: "tankbeleg" as "tankbeleg" | "waschbeleg" | "bahnticket" | "bc50" | "taxi" | "uber",
    kosten: "",
    beleg: null as File | null,
    paymentMethod: "private" as "private" | "company_card"
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
          'auslagennachweis',
          formData.tourNr
        )
        belegUrl = url
      }

      // Erstelle Auslagennachweis mit Beleg-URL und Zahlungsart
      await createAuslagennachweis({
        tour_nr: formData.tourNr,
        kennzeichen: formData.kennzeichen,
        datum: formData.datum,
        startort: formData.startort,
        zielort: formData.zielort,
        belegart: formData.belegart,
        kosten: parseFloat(formData.kosten),
        beleg_url: belegUrl,
        payment_method: formData.paymentMethod
      })

      setSaved(true)
      setTimeout(() => {
        setSaved(false)
        setFormData({
          tourNr: "",
          kennzeichen: "",
          datum: "",
          startort: "",
          zielort: "",
          belegart: "tankbeleg",
          kosten: "",
          beleg: null,
          paymentMethod: "private"
        })
        setIsLoading(false)
      }, 2000)
    } catch (err) {
      console.error("Fehler beim Speichern:", err)
      setError(err instanceof Error ? err.message : "Fehler beim Speichern des Auslagennachweises")
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
    <FahrerportalLayout title="Auslagennachweis">
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 max-w-2xl">
        <Link href="/fahrerportal/dashboard">
          <Button variant="ghost" className="mb-4 text-primary-blue hover:bg-blue-50 -ml-2 px-2">
            <ArrowLeft className="mr-1 h-4 w-4" />
            <span className="text-sm">Zurück</span>
          </Button>
        </Link>

        <Card className="border-gray-100 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl text-primary-blue flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Auslagennachweis hochladen
            </CardTitle>
            <CardDescription>
              Erfassen Sie hier Ihre angefallenen Auslagen
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
                  Ihr Auslagennachweis wurde erfolgreich hochgeladen.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Tour-Nr. und Kennzeichen */}
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
                    <Label htmlFor="kennzeichen" className="text-sm font-medium">
                      Kennzeichen <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="kennzeichen"
                      type="text"
                      placeholder="z.B. BO-TN 123"
                      value={formData.kennzeichen}
                      onChange={(e) => setFormData({ ...formData, kennzeichen: e.target.value })}
                      required
                      className="h-11"
                    />
                  </div>
                </div>

                {/* Datum und Belegart */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

                  <div className="space-y-2">
                    <Label htmlFor="belegart" className="text-sm font-medium">
                      Belegart <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={formData.belegart}
                      onValueChange={(value) => setFormData({ ...formData, belegart: value as "tankbeleg" | "waschbeleg" | "bahnticket" | "bc50" | "taxi" | "uber" })}
                      required
                    >
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Bitte wählen" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="tankbeleg">Tankbeleg</SelectItem>
                        <SelectItem value="waschbeleg">Waschbeleg</SelectItem>
                        <SelectItem value="bahnticket">Bahnticket</SelectItem>
                        <SelectItem value="bc50">BC50</SelectItem>
                        <SelectItem value="taxi">Taxi</SelectItem>
                        <SelectItem value="uber">Uber</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Start/Zielort */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startort" className="text-sm font-medium">
                      Startort <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="startort"
                      type="text"
                      placeholder="z.B. Bochum"
                      value={formData.startort}
                      onChange={(e) => setFormData({ ...formData, startort: e.target.value })}
                      required
                      className="h-11"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="zielort" className="text-sm font-medium">
                      Zielort <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="zielort"
                      type="text"
                      placeholder="z.B. Hamburg"
                      value={formData.zielort}
                      onChange={(e) => setFormData({ ...formData, zielort: e.target.value })}
                      required
                      className="h-11"
                    />
                  </div>
                </div>

                {/* Kosten */}
                <div className="space-y-2">
                  <Label htmlFor="kosten" className="text-sm font-medium">
                    Kosten (€) <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="kosten"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="z.B. 45.50"
                    value={formData.kosten}
                    onChange={(e) => setFormData({ ...formData, kosten: e.target.value })}
                    required
                    className="h-11"
                  />
                </div>

                {/* Zahlungsart - für ALLE Belegtypen */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">
                    Zahlungsart <span className="text-red-500">*</span>
                  </Label>
                  <div className="grid grid-cols-1 gap-3">
                    {/* Eigene Tasche */}
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, paymentMethod: "private" })}
                      className={`flex items-start p-4 rounded-xl border-2 transition-all text-left ${
                        formData.paymentMethod === "private"
                          ? "border-emerald-500 bg-emerald-50"
                          : "border-gray-200 hover:border-gray-300 bg-white"
                      }`}
                    >
                      <div className={`flex-shrink-0 w-5 h-5 rounded-full border-2 mr-3 mt-0.5 flex items-center justify-center ${
                        formData.paymentMethod === "private"
                          ? "border-emerald-500 bg-emerald-500"
                          : "border-gray-300"
                      }`}>
                        {formData.paymentMethod === "private" && (
                          <CheckCircle className="h-3 w-3 text-white" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className={`font-medium ${
                          formData.paymentMethod === "private" ? "text-emerald-700" : "text-gray-900"
                        }`}>
                          Aus eigener Tasche bezahlt
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Der Betrag soll nach Prüfung erstattet werden.
                        </p>
                      </div>
                    </button>

                    {/* Firmenkreditkarte */}
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, paymentMethod: "company_card" })}
                      className={`flex items-start p-4 rounded-xl border-2 transition-all text-left ${
                        formData.paymentMethod === "company_card"
                          ? "border-amber-500 bg-amber-50"
                          : "border-gray-200 hover:border-gray-300 bg-white"
                      }`}
                    >
                      <div className={`flex-shrink-0 w-5 h-5 rounded-full border-2 mr-3 mt-0.5 flex items-center justify-center ${
                        formData.paymentMethod === "company_card"
                          ? "border-amber-500 bg-amber-500"
                          : "border-gray-300"
                      }`}>
                        {formData.paymentMethod === "company_card" && (
                          <CreditCard className="h-3 w-3 text-white" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className={`font-medium ${
                          formData.paymentMethod === "company_card" ? "text-amber-700" : "text-gray-900"
                        }`}>
                          Mit Firmenkreditkarte bezahlt
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Der Beleg dient nur zur Dokumentation. Es erfolgt keine Auszahlung an dich.
                        </p>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Beleg-Upload */}
                <div className="space-y-2">
                  <Label htmlFor="beleg" className="text-sm font-medium">
                    Beleg hochladen <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="beleg"
                    type="file"
                    accept="application/pdf,image/jpeg,image/jpg,image/png,image/heic,image/heif"
                    onChange={handleFileChange}
                    required
                    className="h-12 cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary-blue file:text-white hover:file:bg-blue-700"
                  />
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
                    disabled={isLoading}
                    className="sm:flex-1 h-11 bg-emerald-600 hover:bg-emerald-700"
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
