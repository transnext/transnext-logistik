"use client"

import { useEffect, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TransNextLogo, TransNextIcon } from "@/components/ui/logo"
import { ArrowLeft, Car, MapPin, Phone, User, X, Play, CheckCircle, PartyPopper } from "lucide-react"
import { getCurrentUser, getUserProfile } from "@/lib/api"
import type { Tour, TourStatus } from "@/lib/supabase"
import { getFahrerTouren, formatTourStatus, getTourStatusColor, formatFahrzeugart } from "@/lib/touren-api"

function FahrerTourenContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const successType = searchParams.get("success")

  const [touren, setTouren] = useState<Tour[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedTour, setSelectedTour] = useState<Tour | null>(null)
  const [showSuccess, setShowSuccess] = useState<string | null>(successType)

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (successType) {
      setShowSuccess(successType)
      // URL bereinigen
      const url = new URL(window.location.href)
      url.searchParams.delete("success")
      window.history.replaceState({}, "", url.toString())
      // Nach 3 Sekunden ausblenden
      setTimeout(() => setShowSuccess(null), 4000)
    }
  }, [successType])

  const loadData = async () => {
    try {
      const user = await getCurrentUser()
      if (!user) {
        router.push("/fahrerportal")
        return
      }
      const profile = await getUserProfile(user.id)
      if (profile.role !== "fahrer") {
        router.push("/fahrerportal")
        return
      }
      const data = await getFahrerTouren(user.id)
      setTouren(data)
    } catch (e) {
      console.error(e)
      router.push("/fahrerportal")
    } finally {
      setIsLoading(false)
    }
  }

  const navigateToProtokoll = (tourId: string, typ: "uebernahme" | "abgabe") => {
    router.push(`/fahrerportal/touren/protokoll?tourId=${tourId}&typ=${typ}`)
  }

  const getStatusBadge = (status: TourStatus) => {
    const c = getTourStatusColor(status)
    return (
      <Badge className={`${c.bg} ${c.text} ${c.border} border`}>
        {formatTourStatus(status)}
      </Badge>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <header className="bg-white border-b shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <div className="sm:hidden">
            <TransNextIcon size={32} />
          </div>
          <div className="hidden sm:block">
            <TransNextLogo width={130} height={40} showText />
          </div>
          <div className="h-8 w-px bg-gray-300" />
          <h1 className="text-xl font-semibold text-primary-blue">Meine Touren</h1>
        </div>
      </header>

      {/* Success Banner */}
      {showSuccess && (
        <div
          className={`${
            showSuccess === "uebernahme" ? "bg-green-500" : "bg-blue-500"
          } text-white py-3 px-4 flex items-center justify-center gap-3 animate-pulse`}
        >
          <PartyPopper className="h-5 w-5" />
          <span className="font-medium">
            {showSuccess === "uebernahme"
              ? "Fahrzeugübernahme erfolgreich abgeschlossen!"
              : "Fahrzeugabgabe erfolgreich abgeschlossen!"}
          </span>
        </div>
      )}

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <Link href="/fahrerportal/dashboard">
          <Button variant="ghost" className="mb-6 text-primary-blue">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Zurück
          </Button>
        </Link>

        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-blue mx-auto" />
          </div>
        ) : touren.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Car className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold">Keine aktiven Touren</h3>
              <p className="text-gray-600">Ihnen wurden noch keine Touren zugewiesen.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {touren.map((t) => (
              <Card
                key={t.id}
                className="cursor-pointer hover:shadow-lg border-2 hover:border-primary-blue transition-all"
                onClick={() => setSelectedTour(t)}
              >
                <CardContent className="p-4">
                  <div className="flex justify-between mb-3">
                    <div>
                      <h3 className="font-bold text-lg text-primary-blue">{t.tour_nummer}</h3>
                      <p className="text-sm text-gray-600">{t.kennzeichen}</p>
                    </div>
                    {getStatusBadge(t.status)}
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-green-600" />
                    {t.abholort_ort}
                    <span className="text-gray-400">→</span>
                    <MapPin className="h-4 w-4 text-red-600" />
                    {t.abgabeort_ort}
                  </div>
                  {t.distance_km && (
                    <p className="text-sm text-gray-500 mt-2">
                      <Car className="h-4 w-4 inline mr-1" />
                      {t.distance_km} km
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Tour Detail Modal */}
      {selectedTour && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-primary-blue">Tour {selectedTour.tour_nummer}</CardTitle>
                <div className="mt-1">{getStatusBadge(selectedTour.status)}</div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSelectedTour(null)}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Fahrzeugdaten */}
              <div className="bg-gray-50 p-4 rounded-lg grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-gray-500">Typ:</span> {formatFahrzeugart(selectedTour.fahrzeugart)}
                </div>
                <div>
                  <span className="text-gray-500">Kennzeichen:</span> {selectedTour.kennzeichen}
                </div>
                <div className="col-span-2">
                  <span className="text-gray-500">FIN:</span>{" "}
                  <span className="font-mono text-xs">{selectedTour.fin}</span>
                </div>
              </div>

              {/* Abholort */}
              <div className="bg-green-50 p-4 rounded-lg">
                <h4 className="font-semibold text-green-800 mb-2">
                  <MapPin className="h-4 w-4 inline mr-1" />
                  Abholort
                </h4>
                <p className="font-medium">{selectedTour.abholort_name}</p>
                <p className="text-sm">
                  {selectedTour.abholort_strasse}, {selectedTour.abholort_plz} {selectedTour.abholort_ort}
                </p>
                <p className="text-sm mt-2">
                  <User className="h-3 w-3 inline mr-1" />
                  {selectedTour.abholort_ansprechpartner_name}
                </p>
                <p className="text-sm">
                  <Phone className="h-3 w-3 inline mr-1" />
                  <a
                    href={`tel:${selectedTour.abholort_ansprechpartner_telefon}`}
                    className="text-blue-600"
                  >
                    {selectedTour.abholort_ansprechpartner_telefon}
                  </a>
                </p>
              </div>

              {/* Abgabeort */}
              <div className="bg-red-50 p-4 rounded-lg">
                <h4 className="font-semibold text-red-800 mb-2">
                  <MapPin className="h-4 w-4 inline mr-1" />
                  Abgabeort
                </h4>
                <p className="font-medium">{selectedTour.abgabeort_name}</p>
                <p className="text-sm">
                  {selectedTour.abgabeort_strasse}, {selectedTour.abgabeort_plz} {selectedTour.abgabeort_ort}
                </p>
                <p className="text-sm mt-2">
                  <User className="h-3 w-3 inline mr-1" />
                  {selectedTour.abgabeort_ansprechpartner_name}
                </p>
                <p className="text-sm">
                  <Phone className="h-3 w-3 inline mr-1" />
                  <a
                    href={`tel:${selectedTour.abgabeort_ansprechpartner_telefon}`}
                    className="text-blue-600"
                  >
                    {selectedTour.abgabeort_ansprechpartner_telefon}
                  </a>
                </p>
              </div>

              {/* Distanz */}
              {selectedTour.distance_km && (
                <div className="bg-blue-50 p-4 rounded-lg text-center">
                  <p className="text-gray-500 text-sm">Distanz</p>
                  <p className="text-2xl font-bold text-blue-700">{selectedTour.distance_km} km</p>
                </div>
              )}

              {/* Hinweise */}
              {selectedTour.hinweise && (
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <h4 className="font-semibold mb-1">Hinweise</h4>
                  <p className="text-sm">{selectedTour.hinweise}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-4 border-t space-y-2">
                {(selectedTour.status === "uebernahme_offen" || selectedTour.status === "neu") && (
                  <Button
                    className="w-full bg-green-600 hover:bg-green-700"
                    onClick={() => navigateToProtokoll(selectedTour.id, "uebernahme")}
                  >
                    <Play className="mr-2 h-4 w-4" />
                    Übernahme starten
                  </Button>
                )}
                {selectedTour.status === "abgabe_offen" && (
                  <Button
                    className="w-full bg-blue-600 hover:bg-blue-700"
                    onClick={() => navigateToProtokoll(selectedTour.id, "abgabe")}
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Abgabe starten
                  </Button>
                )}
                <Button variant="outline" className="w-full" onClick={() => setSelectedTour(null)}>
                  Schließen
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

export default function FahrerTourenPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-blue" />
        </div>
      }
    >
      <FahrerTourenContent />
    </Suspense>
  )
}
