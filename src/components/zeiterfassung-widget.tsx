"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Clock, Play, Pause, StopCircle } from "lucide-react"
import {
  startArbeitstag,
  startPause,
  endePause,
  beendeArbeitstag,
  getHeutigeZeiterfassung,
  type Zeiterfassung
} from "@/lib/zeiterfassung-api"

export function ZeiterfassungWidget() {
  const [zeiterfassung, setZeiterfassung] = useState<Zeiterfassung | null>(null)
  const [laufzeit, setLaufzeit] = useState(0)
  const [pausenzeit, setPausenzeit] = useState(0)
  const [pauseStartZeit, setPauseStartZeit] = useState<Date | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    loadHeutigeZeiterfassung()
    const interval = setInterval(() => {
      updateTimer()
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const loadHeutigeZeiterfassung = async () => {
    try {
      const data = await getHeutigeZeiterfassung()
      setZeiterfassung(data)
      if (data?.pause_minuten) {
        setPausenzeit(data.pause_minuten * 60)
      }
    } catch (error) {
      console.error("Fehler beim Laden:", error)
    }
  }

  const updateTimer = () => {
    if (!zeiterfassung || !zeiterfassung.start_zeit) return

    const start = new Date(zeiterfassung.start_zeit)
    const jetzt = new Date()
    const differenz = Math.floor((jetzt.getTime() - start.getTime()) / 1000)
    setLaufzeit(differenz)

    if (zeiterfassung.status === 'pause' && pauseStartZeit) {
      const pauseDauer = Math.floor((jetzt.getTime() - pauseStartZeit.getTime()) / 1000)
      setPausenzeit(zeiterfassung.pause_minuten * 60 + pauseDauer)
    }
  }

  const handleStart = async () => {
    setIsLoading(true)
    try {
      const data = await startArbeitstag()
      setZeiterfassung(data)
      setLaufzeit(0)
      setPausenzeit(0)
    } catch (error) {
      alert(error instanceof Error ? error.message : "Fehler beim Starten")
    } finally {
      setIsLoading(false)
    }
  }

  const handlePauseStart = async () => {
    if (!zeiterfassung) return
    setIsLoading(true)
    try {
      const data = await startPause(zeiterfassung.id)
      setZeiterfassung(data)
      setPauseStartZeit(new Date())
    } catch (error) {
      alert(error instanceof Error ? error.message : "Fehler beim Starten der Pause")
    } finally {
      setIsLoading(false)
    }
  }

  const handlePauseEnde = async () => {
    if (!zeiterfassung) return
    setIsLoading(true)
    try {
      const pausenMinuten = Math.floor(pausenzeit / 60)
      const data = await endePause(zeiterfassung.id, pausenMinuten)
      setZeiterfassung(data)
      setPauseStartZeit(null)
    } catch (error) {
      alert(error instanceof Error ? error.message : "Fehler beim Beenden der Pause")
    } finally {
      setIsLoading(false)
    }
  }

  const handleStop = async () => {
    if (!zeiterfassung) return
    if (!confirm("Arbeitstag wirklich beenden?")) {
      return
    }
    setIsLoading(true)
    try {
      await beendeArbeitstag(zeiterfassung.id)
      alert("Arbeitstag erfolgreich beendet!")
      await loadHeutigeZeiterfassung()
    } catch (error) {
      alert(error instanceof Error ? error.message : "Fehler beim Beenden")
    } finally {
      setIsLoading(false)
    }
  }

  const formatZeit = (sekunden: number) => {
    const stunden = Math.floor(sekunden / 3600)
    const minuten = Math.floor((sekunden % 3600) / 60)
    const sek = sekunden % 60
    return `${stunden.toString().padStart(2, '0')}:${minuten.toString().padStart(2, '0')}:${sek.toString().padStart(2, '0')}`
  }

  const berechneArbeitszeit = () => {
    return laufzeit - pausenzeit
  }

  const berechneVerdienst = () => {
    const arbeitszeit = berechneArbeitszeit()
    const stunden = arbeitszeit / 3600
    return (stunden * 12.82).toFixed(2)
  }

  return (
    <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-primary-blue">
          <Clock className="h-5 w-5" />
          Zeiterfassung
        </CardTitle>
        <CardDescription>
          Erfasse deine Arbeitszeit für heute
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!zeiterfassung || zeiterfassung.status === 'beendet' ? (
          <div className="text-center py-6">
            <p className="text-gray-600 mb-4">Noch kein Arbeitstag gestartet</p>
            <Button
              onClick={handleStart}
              disabled={isLoading}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <Play className="mr-2 h-4 w-4" />
              Arbeitstag starten
            </Button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-lg p-4 text-center shadow-sm">
                <p className="text-sm text-gray-600 mb-1">Gesamtzeit</p>
                <p className="text-2xl font-bold text-primary-blue">{formatZeit(laufzeit)}</p>
              </div>
              <div className="bg-white rounded-lg p-4 text-center shadow-sm">
                <p className="text-sm text-gray-600 mb-1">Pausenzeit</p>
                <p className="text-2xl font-bold text-orange-600">{formatZeit(pausenzeit)}</p>
              </div>
              <div className="bg-white rounded-lg p-4 text-center shadow-sm">
                <p className="text-sm text-gray-600 mb-1">Arbeitszeit</p>
                <p className="text-2xl font-bold text-green-600">{formatZeit(berechneArbeitszeit())}</p>
              </div>
            </div>

            <div className="bg-white rounded-lg p-4 text-center shadow-sm">
              <p className="text-sm text-gray-600 mb-1">Aktuelle Vergütung (12,82€/h)</p>
              <p className="text-3xl font-bold text-green-700">{berechneVerdienst()} €</p>
            </div>

            <div className="flex gap-2 justify-center">
              {zeiterfassung.status === 'laufend' && (
                <>
                  <Button
                    onClick={handlePauseStart}
                    disabled={isLoading}
                    variant="outline"
                    className="border-orange-300 text-orange-700 hover:bg-orange-50"
                  >
                    <Pause className="mr-2 h-4 w-4" />
                    Pause starten
                  </Button>
                  <Button
                    onClick={handleStop}
                    disabled={isLoading}
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    <StopCircle className="mr-2 h-4 w-4" />
                    Arbeitstag beenden
                  </Button>
                </>
              )}
              {zeiterfassung.status === 'pause' && (
                <Button
                  onClick={handlePauseEnde}
                  disabled={isLoading}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <Play className="mr-2 h-4 w-4" />
                  Pause beenden
                </Button>
              )}
            </div>

            <div className="text-center">
              {zeiterfassung.status === 'laufend' && (
                <p className="text-sm text-green-600 font-medium">● Arbeit läuft</p>
              )}
              {zeiterfassung.status === 'pause' && (
                <p className="text-sm text-orange-600 font-medium">● In Pause</p>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
