"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { TransNextLogo, TransNextIcon } from "@/components/ui/logo"
import { ArrowLeft, Upload, CheckCircle } from "lucide-react"
import { getCurrentUser, getUserProfile, createAuslagennachweis } from "@/lib/api"
import { uploadBeleg } from "@/lib/storage"

export default function AuslagennachweisPage() {
  const router = useRouter()
  const [fahrerName, setFahrerName] = useState("")
  const [saved, setSaved] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [formData, setFormData] = useState({
    tourNr: "",
    kennzeichen: "",
    datum: "",
    startort: "",
    zielort: "",
    belegart: "tankbeleg" as "tankbeleg" | "waschbeleg" | "bahnticket" | "bc50" | "taxi" | "uber",
    kosten: "",
    beleg: null as File | null
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

      const profile = await getUserProfile(user.id)
      if (profile.role !== 'fahrer') {
        router.push("/fahrerportal")
        return
      }

      setFahrerName(profile.full_name)
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

      // Erstelle Auslagennachweis mit Beleg-URL
      await createAuslagennachweis({
        tour_nr: formData.tourNr,
        kennzeichen: formData.kennzeichen,
        datum: formData.datum,
        startort: formData.startort,
        zielort: formData.zielort,
        belegart: formData.belegart,
        kosten: parseFloat(formData.kosten),
        beleg_url: belegUrl
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
          beleg: null
        })
        setIsLoading(false)
      }, 2000)
    } catch (err) {
      console.error("Fehler beim Speichern:", err)
      setError(err instanceof Error ? err.message : "Fehler beim Speichern des Auslagennachweises")
      setIsLoading(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFormData({ ...formData, beleg: e.target.files[0] })
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Header - Mobile Optimized */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="sm:hidden">
              <TransNextIcon size={32} />
            </div>
            <div className="hidden sm:block">
              <TransNextLogo width={130} height={40} showText={true} />
            </div>
            <div className="h-6 sm:h-8 w-px bg-gray-300" />
            <h1 className="text-base sm:text-xl font-semibold text-primary-blue">Fahrerportal</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 max-w-3xl">
        <Link href="/fahrerportal/dashboard">
          <Button variant="ghost" className="mb-4 sm:mb-6 text-primary-blue hover:bg-blue-50 px-2 sm:px-4">
            <ArrowLeft className="mr-1 sm:mr-2 h-4 w-4" />
            <span className="text-sm sm:text-base">Zurück</span>
          </Button>
        </Link>

        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-xl sm:text-2xl text-primary-blue">Auslagennachweis hochladen</CardTitle>
            <CardDescription className="text-sm">
              Erfassen Sie hier Ihre angefallenen Auslagen
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
            {saved ? (
              <div className="flex flex-col items-center justify-center py-8 sm:py-12 text-center">
                <CheckCircle className="h-12 w-12 sm:h-16 sm:w-16 text-green-600 mb-4" />
                <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">
                  Erfolgreich gespeichert!
                </h3>
                <p className="text-sm sm:text-base text-gray-600">
                  Ihr Auslagennachweis wurde erfolgreich hochgeladen.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="tourNr">Tour-Nr. *</Label>
                    <Input
                      id="tourNr"
                      type="text"
                      placeholder="z.B. T-2025-001"
                      value={formData.tourNr}
                      onChange={(e) => setFormData({ ...formData, tourNr: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="kennzeichen">Kennzeichen *</Label>
                    <Input
                      id="kennzeichen"
                      type="text"
                      placeholder="z.B. BO-TN 123"
                      value={formData.kennzeichen}
                      onChange={(e) => setFormData({ ...formData, kennzeichen: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="datum">Datum der Tour *</Label>
                    <Input
                      id="datum"
                      type="date"
                      value={formData.datum}
                      onChange={(e) => setFormData({ ...formData, datum: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="belegart">Belegart *</Label>
                    <Select
                      value={formData.belegart}
                      onValueChange={(value) => setFormData({ ...formData, belegart: value as "tankbeleg" | "waschbeleg" | "bahnticket" | "bc50" | "taxi" | "uber" })}
                      required
                    >
                      <SelectTrigger>
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

                  <div className="space-y-2">
                    <Label htmlFor="startort">Startort *</Label>
                    <Input
                      id="startort"
                      type="text"
                      placeholder="z.B. Bochum"
                      value={formData.startort}
                      onChange={(e) => setFormData({ ...formData, startort: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="zielort">Zielort *</Label>
                    <Input
                      id="zielort"
                      type="text"
                      placeholder="z.B. Hamburg"
                      value={formData.zielort}
                      onChange={(e) => setFormData({ ...formData, zielort: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="kosten">Kosten (in €) *</Label>
                  <Input
                    id="kosten"
                    type="number"
                    step="0.01"
                    placeholder="z.B. 45.50"
                    value={formData.kosten}
                    onChange={(e) => setFormData({ ...formData, kosten: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="beleg">Beleg hochladen *</Label>
                  <div className="flex items-center gap-4">
                    <Input
                      id="beleg"
                      type="file"
                      accept="application/pdf,image/jpeg,image/jpg,image/png,image/heic,image/heif"
                      onChange={handleFileChange}
                      required
                      className="cursor-pointer"
                    />
                  </div>
                </div>

                {error && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-800 text-sm">{error}</p>
                  </div>
                )}

                <div className="flex flex-col-reverse sm:flex-row gap-3 sm:gap-4 pt-4">
                  <Link href="/fahrerportal/dashboard" className="sm:flex-1">
                    <Button type="button" variant="outline" className="w-full" disabled={isLoading}>
                      Abbrechen
                    </Button>
                  </Link>
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="sm:flex-1 bg-primary-blue hover:bg-blue-700"
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    {isLoading ? "Wird hochgeladen..." : "Hochladen"}
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
