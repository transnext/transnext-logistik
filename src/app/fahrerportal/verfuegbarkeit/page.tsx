"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FahrerportalLayout } from "@/components/fahrerportal/FahrerportalLayout"
import {
  ArrowLeft,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  Save,
  CheckCircle,
  AlertTriangle,
  Info
} from "lucide-react"
import { getCurrentUser, canAccessFahrerportal } from "@/lib/api"
import {
  type DriverAvailability,
  type PreferredTourType,
  type AvailabilityStatus,
  getMyAvailability,
  saveWeekAvailability,
  generateWeekDays,
  getWeekStart,
  getWeekDeadline,
  isDeadlinePassed,
  formatAvailabilityStatus,
  getAvailabilityStatusColors,
  formatTourType
} from "@/lib/availability-api"

interface DayAvailability {
  date: string
  dayName: string
  dayShort: string
  dateDisplay: string
  isAvailable: boolean
  availableFrom: string
  availableUntil: string
  timeRestrictionNote: string
  preferredTourType: PreferredTourType
  note: string
  status: AvailabilityStatus
  hasExisting: boolean
  isHoliday: boolean
  holidayName: string | null
}

export default function VerfuegbarkeitPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [error, setError] = useState("")
  const [userId, setUserId] = useState("")
  const [fahrerId, setFahrerId] = useState("")

  const [selectedWeekStart, setSelectedWeekStart] = useState<string>("")
  const [weekDays, setWeekDays] = useState<DayAvailability[]>([])
  const [existingData, setExistingData] = useState<DriverAvailability[]>([])

  useEffect(() => {
    checkAuthAndLoad()
  }, [])

  useEffect(() => {
    if (selectedWeekStart && existingData.length >= 0) {
      initializeWeekDays()
    }
  }, [selectedWeekStart, existingData])

  const checkAuthAndLoad = async () => {
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

      setUserId(user.id)

      // Nutze den Fahrer-Datensatz aus dem Access-Check
      if (!accessResult.fahrer || !accessResult.fahrer.id) {
        setError("Kein Fahrerprofil für diesen Benutzer gefunden. Bitte Admin kontaktieren.")
        setIsLoading(false)
        return
      }
      setFahrerId(accessResult.fahrer.id)

      // Setze aktuelle Woche als Standard
      const today = new Date()
      const currentWeekStart = getWeekStart(today)
      setSelectedWeekStart(currentWeekStart)

      // Lade existierende Verfügbarkeiten
      const existing = await getMyAvailability(user.id)
      setExistingData(existing)

      setIsLoading(false)
    } catch (err) {
      console.error("Auth/Load Fehler:", err)
      router.push("/fahrerportal")
    }
  }

  const initializeWeekDays = () => {
    const days = generateWeekDays(selectedWeekStart)
    const initialized: DayAvailability[] = days.map(day => {
      const existing = existingData.find(e => e.date === day.date)

      return {
        date: day.date,
        dayName: day.dayName,
        dayShort: day.dayShort,
        dateDisplay: day.dateDisplay,
        // Feiertage: Standardmäßig als nicht verfügbar, keine Eingabe nötig
        isAvailable: day.isHoliday ? false : (existing?.is_available ?? true),
        availableFrom: existing?.available_from || "",
        availableUntil: existing?.available_until || "",
        timeRestrictionNote: existing?.time_restriction_note || "",
        preferredTourType: existing?.preferred_tour_type || null,
        note: day.isHoliday ? `Feiertag: ${day.holidayName}` : (existing?.note || ""),
        status: existing?.availability_status || "not_submitted",
        hasExisting: !!existing,
        isHoliday: day.isHoliday,
        holidayName: day.holidayName
      }
    })
    setWeekDays(initialized)
  }

  const navigateWeek = (direction: "prev" | "next") => {
    const current = new Date(selectedWeekStart)
    current.setDate(current.getDate() + (direction === "next" ? 7 : -7))
    setSelectedWeekStart(current.toISOString().split("T")[0])
  }

  const updateDay = (index: number, updates: Partial<DayAvailability>) => {
    setWeekDays(prev => {
      const newDays = [...prev]
      newDays[index] = { ...newDays[index], ...updates }
      return newDays
    })
  }

  const handleSave = async () => {
    // Prüfe ob Fahrer-Profil vorhanden ist
    if (!fahrerId) {
      setError("Kein Fahrerprofil für diesen Benutzer gefunden. Bitte Admin kontaktieren.")
      return
    }

    setIsSaving(true)
    setError("")
    setSaveSuccess(false)

    try {
      // Nur Nicht-Feiertage speichern (Feiertage werden automatisch übersprungen)
      await saveWeekAvailability(
        userId,
        fahrerId,
        selectedWeekStart,
        weekDays
          .filter(day => !day.isHoliday) // Feiertage überspringen
          .map(day => ({
            date: day.date,
            isAvailable: day.isAvailable,
            availableFrom: day.availableFrom || null,
            availableUntil: day.availableUntil || null,
            timeRestrictionNote: day.timeRestrictionNote || null,
            preferredTourType: day.preferredTourType,
            note: day.note || null
          }))
      )

      // Reload data
      const existing = await getMyAvailability(userId)
      setExistingData(existing)

      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (err) {
      console.error("Fehler beim Speichern:", err)
      setError(err instanceof Error ? err.message : "Fehler beim Speichern")
    } finally {
      setIsSaving(false)
    }
  }

  const getWeekNumber = (dateStr: string): number => {
    const date = new Date(dateStr)
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
    const dayNum = d.getUTCDay() || 7
    d.setUTCDate(d.getUTCDate() + 4 - dayNum)
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
  }

  const formatWeekRange = (weekStart: string): string => {
    const start = new Date(weekStart)
    const end = new Date(weekStart)
    end.setDate(end.getDate() + 6)
    return `${start.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" })} - ${end.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" })}`
  }

  const deadlinePassed = selectedWeekStart ? isDeadlinePassed(selectedWeekStart) : false
  const deadline = selectedWeekStart ? getWeekDeadline(selectedWeekStart) : null

  if (isLoading) {
    return (
      <FahrerportalLayout title="Verfügbarkeit">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-blue" />
        </div>
      </FahrerportalLayout>
    )
  }

  return (
    <FahrerportalLayout title="Verfügbarkeit">
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 max-w-2xl">
        {/* Zurück-Button */}
        <Link href="/fahrerportal/dashboard">
          <Button variant="ghost" className="mb-4 text-primary-blue hover:bg-blue-50 -ml-2 px-2">
            <ArrowLeft className="mr-1 h-4 w-4" />
            <span className="text-sm">Zurück</span>
          </Button>
        </Link>

        {/* Header Card */}
        <Card className="mb-4 border-gray-100">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-blue-50 text-primary-blue">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg text-primary-blue">Meine Verfügbarkeit</CardTitle>
                <CardDescription>Melden Sie Ihre Verfügbarkeit für kommende Wochen</CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Wochennavigation */}
        <Card className="mb-4 border-gray-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateWeek("prev")}
                className="h-9"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <div className="text-center">
                <p className="font-semibold text-primary-blue">KW {getWeekNumber(selectedWeekStart)}</p>
                <p className="text-sm text-gray-600">{formatWeekRange(selectedWeekStart)}</p>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateWeek("next")}
                className="h-9"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Deadline Info */}
            {deadline && (
              <div className={`mt-3 p-2 rounded-lg text-sm flex items-center gap-2 ${
                deadlinePassed
                  ? "bg-amber-50 text-amber-800"
                  : "bg-blue-50 text-blue-800"
              }`}>
                {deadlinePassed ? (
                  <>
                    <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                    <span>Deadline überschritten. Änderungen werden als "nachträglich" markiert.</span>
                  </>
                ) : (
                  <>
                    <Info className="h-4 w-4 flex-shrink-0" />
                    <span>
                      Deadline: {deadline.toLocaleDateString("de-DE", {
                        weekday: "short",
                        day: "2-digit",
                        month: "2-digit"
                      })} um {deadline.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tages-Karten */}
        <div className="space-y-3">
          {weekDays.map((day, index) => {
            const statusColors = getAvailabilityStatusColors(day.status)

            // Feiertag: Spezielle Darstellung (nicht editierbar)
            if (day.isHoliday) {
              return (
                <Card
                  key={day.date}
                  className="border border-purple-200 bg-purple-50/50 opacity-80"
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-gray-900">{day.dayName}</p>
                        <p className="text-sm text-gray-500">{day.dateDisplay}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-purple-100 text-purple-700 border-purple-200 border">
                          Feiertag
                        </Badge>
                        <span className="text-sm text-purple-700 font-medium">
                          {day.holidayName}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Keine Verfügbarkeitsmeldung erforderlich
                    </p>
                  </CardContent>
                </Card>
              )
            }

            return (
              <Card
                key={day.date}
                className={`border transition-all ${
                  day.isAvailable
                    ? "border-emerald-200 bg-emerald-50/30"
                    : "border-red-200 bg-red-50/30"
                }`}
              >
                <CardContent className="p-4">
                  {/* Tag Header */}
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="font-semibold text-gray-900">{day.dayName}</p>
                      <p className="text-sm text-gray-500">{day.dateDisplay}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      {day.hasExisting && (
                        <Badge className={`${statusColors.bg} ${statusColors.text} ${statusColors.border} border text-xs`}>
                          {formatAvailabilityStatus(day.status)}
                        </Badge>
                      )}
                      <div className="flex items-center gap-2">
                        <Label
                          htmlFor={`available-${index}`}
                          className={`text-sm font-medium ${day.isAvailable ? "text-emerald-700" : "text-red-700"}`}
                        >
                          {day.isAvailable ? "Verfügbar" : "Nicht verfügbar"}
                        </Label>
                        <Switch
                          id={`available-${index}`}
                          checked={day.isAvailable}
                          onCheckedChange={(checked: boolean) => updateDay(index, { isAvailable: checked })}
                          className="data-[state=checked]:bg-emerald-600"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Details wenn verfügbar */}
                  {day.isAvailable && (
                    <div className="space-y-3 pt-3 border-t border-gray-200">
                      {/* Zeitraum */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label htmlFor={`from-${index}`} className="text-xs text-gray-500">
                            Ab (optional)
                          </Label>
                          <Input
                            id={`from-${index}`}
                            type="time"
                            value={day.availableFrom}
                            onChange={(e) => updateDay(index, { availableFrom: e.target.value })}
                            className="h-9 text-sm"
                          />
                        </div>
                        <div>
                          <Label htmlFor={`until-${index}`} className="text-xs text-gray-500">
                            Bis (optional)
                          </Label>
                          <Input
                            id={`until-${index}`}
                            type="time"
                            value={day.availableUntil}
                            onChange={(e) => updateDay(index, { availableUntil: e.target.value })}
                            className="h-9 text-sm"
                          />
                        </div>
                      </div>

                      {/* Tour-Präferenz */}
                      <div>
                        <Label htmlFor={`tourType-${index}`} className="text-xs text-gray-500">
                          Bevorzugte Touren
                        </Label>
                        <Select
                          value={day.preferredTourType || "any"}
                          onValueChange={(value) => updateDay(index, {
                            preferredTourType: value === "any" ? "any" : value as PreferredTourType
                          })}
                        >
                          <SelectTrigger className="h-9 text-sm">
                            <SelectValue placeholder="Alle Touren" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="any">Alle Touren</SelectItem>
                            <SelectItem value="short">Kurze Touren (&lt; 200 km)</SelectItem>
                            <SelectItem value="long">Lange Touren (&gt; 200 km)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Notiz */}
                      <div>
                        <Label htmlFor={`note-${index}`} className="text-xs text-gray-500">
                          Hinweis (optional)
                        </Label>
                        <Textarea
                          id={`note-${index}`}
                          value={day.note}
                          onChange={(e) => updateDay(index, { note: e.target.value })}
                          placeholder="z.B. nur vormittags, Termine ab 14 Uhr"
                          rows={2}
                          className="text-sm resize-none"
                        />
                      </div>
                    </div>
                  )}

                  {/* Info wenn nicht verfügbar */}
                  {!day.isAvailable && (
                    <div className="pt-3 border-t border-gray-200">
                      <div>
                        <Label htmlFor={`note-${index}`} className="text-xs text-gray-500">
                          Grund (optional)
                        </Label>
                        <Textarea
                          id={`note-${index}`}
                          value={day.note}
                          onChange={(e) => updateDay(index, { note: e.target.value })}
                          placeholder="z.B. Urlaub, Arzttermin"
                          rows={2}
                          className="text-sm resize-none"
                        />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Fehleranzeige */}
        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Erfolgsanzeige */}
        {saveSuccess && (
          <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-sm flex items-center gap-2">
            <CheckCircle className="h-4 w-4 flex-shrink-0" />
            Verfügbarkeit erfolgreich gespeichert!
          </div>
        )}

        {/* Speichern Button */}
        <div className="mt-6 sticky bottom-20 md:bottom-0 bg-gradient-to-t from-white via-white pt-4 pb-4">
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full h-12 bg-primary-blue hover:bg-blue-700 text-white font-semibold shadow-lg"
          >
            {isSaving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Wird gespeichert...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Woche speichern
              </>
            )}
          </Button>
        </div>

        {/* Info Box */}
        <Card className="mt-4 bg-blue-50/50 border-blue-100">
          <CardContent className="p-4 space-y-1.5 text-sm text-gray-600">
            <p className="font-medium text-primary-blue">Hinweise zur Verfügbarkeit</p>
            <p>- Bitte melden Sie Ihre Verfügbarkeit für Montag bis Freitag</p>
            <p>- Deadline: Donnerstag 18:00 Uhr der Vorwoche</p>
            <p>- An Feiertagen ist keine Meldung erforderlich</p>
            <p>- Nachträgliche Änderungen werden markiert</p>
          </CardContent>
        </Card>
      </div>
    </FahrerportalLayout>
  )
}
