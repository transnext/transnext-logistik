"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { TransNextLogo } from "@/components/ui/logo"
import { ArrowLeft, Upload, CheckCircle } from "lucide-react"
import { getCurrentUser, getUserProfile, createArbeitsnachweis } from "@/lib/api"
import { uploadBeleg } from "@/lib/storage"

export default function ArbeitsnachweiPage() {
  const router = useRouter()
  const [fahrerName, setFahrerName] = useState("")
  const [saved, setSaved] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [formData, setFormData] = useState({
    tourNr: "",
    datum: "",
    gefahreneKm: "",
    wartezeit: "keine" as "30-60" | "60-90" | "90-120" | "keine",
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
          'arbeitsnachweis',
          formData.tourNr
        )
        belegUrl = url
      }

      // Erstelle Arbeitsnachweis mit Beleg-URL
      await createArbeitsnachweis({
        tour_nr: formData.tourNr,
        datum: formData.datum,
        gefahrene_km: parseFloat(formData.gefahreneKm),
        wartezeit: formData.wartezeit,
        beleg_url: belegUrl
      })

      setSaved(true)
      setTimeout(() => {
        setSaved(false)
        setFormData({
          tourNr: "",
          datum: "",
          gefahreneKm: "",
          wartezeit: "keine",
          beleg: null
        })
        setIsLoading(false)
      }, 2000)
    } catch (err) {
      console.error("Fehler beim Speichern:", err)
      setError(err instanceof Error ? err.message : "Fehler beim Speichern des Arbeitsnachweises")
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
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <TransNextLogo width={150} height={45} showText={true} />
              <div className="h-8 w-px bg-gray-300" />
              <h1 className="text-xl font-semibold text-primary-blue">Fahrerportal</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <Link href="/fahrerportal/dashboard">
          <Button variant="ghost" className="mb-6 text-primary-blue hover:bg-blue-50">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Zurück zum Dashboard
          </Button>
        </Link>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl text-primary-blue">Arbeitsnachweis hochladen</CardTitle>
            <CardDescription>
              Erfassen Sie hier Ihre abgeschlossene Tour
            </CardDescription>
          </CardHeader>
          <CardContent>
            {saved ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <CheckCircle className="h-16 w-16 text-green-600 mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Erfolgreich gespeichert!
                </h3>
                <p className="text-gray-600">
                  Ihr Arbeitsnachweis wurde erfolgreich hochgeladen.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                    <Label htmlFor="gefahreneKm">Gefahrene KM *</Label>
                    <Input
                      id="gefahreneKm"
                      type="number"
                      step="0.1"
                      placeholder="z.B. 450.5"
                      value={formData.gefahreneKm}
                      onChange={(e) => setFormData({ ...formData, gefahreneKm: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="wartezeit">Wartezeit *</Label>
                    <Select
                      value={formData.wartezeit}
                      onValueChange={(value) => setFormData({ ...formData, wartezeit: value as "30-60" | "60-90" | "90-120" | "keine" })}
                      required
                    >
                      <SelectTrigger>
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

                <div className="space-y-2">
                  <Label htmlFor="beleg">Beleg hochladen *</Label>
                  <div className="flex items-center gap-4">
                    <Input
                      id="beleg"
                      type="file"
                      accept="application/pdf,image/*"
                      onChange={handleFileChange}
                      required
                      className="cursor-pointer"
                    />
                  </div>
                  <p className="text-sm text-gray-500">
                    PDF oder Bild (max. 10 MB)
                  </p>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                    {error}
                  </div>
                )}

                <div className="flex gap-4 pt-4">
                  <Button
                    type="submit"
                    className="flex-1 bg-primary-blue hover-primary-darken"
                    disabled={isLoading}
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    {isLoading ? "Wird hochgeladen..." : "Arbeitsnachweis hochladen"}
                  </Button>
                  <Link href="/fahrerportal/dashboard" className="flex-1">
                    <Button type="button" variant="outline" className="w-full">
                      Abbrechen
                    </Button>
                  </Link>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
