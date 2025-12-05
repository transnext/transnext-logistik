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
            <CardTitle className="text-2xl text-primary-blue">Auslagennachweis hochladen</CardTitle>
            <CardDescription>
              Erfassen Sie hier Ihre angefallenen Auslagen
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
                  Ihr Auslagennachweis wurde erfolgreich hochgeladen.
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
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-800 text-sm">{error}</p>
                  </div>
                )}

                <div className="flex gap-4 pt-4">
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="flex-1 bg-primary-blue hover:bg-blue-700"
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    {isLoading ? "Wird hochgeladen..." : "Auslagennachweis hochladen"}
                  </Button>
                  <Link href="/fahrerportal/dashboard" className="flex-1">
                    <Button type="button" variant="outline" className="w-full" disabled={isLoading}>
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
