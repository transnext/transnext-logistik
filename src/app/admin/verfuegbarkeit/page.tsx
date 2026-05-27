"use client"

import { useEffect, useState, useMemo, useCallback } from "react"
import { useRouter } from "next/navigation"
import { AdminLayout } from "@/components/admin/AdminLayout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { VerfuegbarkeitDayCard, type DayCardData } from "@/components/admin/VerfuegbarkeitDayCard"
import { VerfuegbarkeitDayDetail, type DayDetailDriver } from "@/components/admin/VerfuegbarkeitDayDetail"
import { getCurrentUser, getUserProfile, signOut } from "@/lib/api"
import {
  getAvailabilityForWeek,
  confirmAvailability,
  generateWeekOptions,
  generateWeekDays,
  getWeekStart,
  getWeekDeadline,
  isDeadlinePassed,
  type DriverAvailability
} from "@/lib/availability-api"
import {
  getAvailabilityAlertReviewsForDateRange,
  markAvailableWithoutTour,
  type AvailabilityAlertReview
} from "@/lib/availability-alert-reviews-api"
import { getAllArbeitsnachweiseAdmin, getAllFahrerAdmin } from "@/lib/admin-api"
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Clock,
  AlertTriangle,
  Users,
  Info
} from "lucide-react"

// Typen
interface TourExistsMap {
  [key: string]: boolean
}

interface ActiveFahrer {
  id: string
  name: string
  user_id: string | null
}

export default function VerfuegbarkeitPage() {
  const router = useRouter()
  const [userName, setUserName] = useState("")
  const [userRole, setUserRole] = useState<'admin' | 'disponent'>('admin')
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Daten
  const [availability, setAvailability] = useState<DriverAvailability[]>([])
  const [tourExistsMap, setTourExistsMap] = useState<TourExistsMap>({})
  const [reviews, setReviews] = useState<AvailabilityAlertReview[]>([])
  const [activeFahrer, setActiveFahrer] = useState<ActiveFahrer[]>([])

  // Filter
  const [selectedWeek, setSelectedWeek] = useState<string>("")
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [showOnlyActive, setShowOnlyActive] = useState(true)

  const weekOptions = generateWeekOptions(4, 8)

  useEffect(() => {
    checkAuthAndLoad()
  }, [])

  useEffect(() => {
    if (selectedWeek) {
      loadWeekData(selectedWeek)
    }
  }, [selectedWeek])

  const checkAuthAndLoad = async () => {
    try {
      const user = await getCurrentUser()
      if (!user) {
        router.push("/admin")
        return
      }
      const profile = await getUserProfile(user.id)
      const role = profile.role as string
      if (!['admin', 'disponent', 'gf'].includes(role)) {
        router.push("/admin")
        return
      }
      const effectiveRole = role === 'gf' ? 'admin' : role as 'admin' | 'disponent'
      setUserRole(effectiveRole)
      setUserName(profile.full_name)

      // Aktuelle Woche setzen
      const currentWeek = getWeekStart(new Date())
      setSelectedWeek(currentWeek)

      // Aktive Fahrer laden
      const fahrerData = await getAllFahrerAdmin()
      // Nur aktive, nicht-archivierte Fahrer für Verfügbarkeitsplanung
      const aktive = fahrerData
        .filter((f: any) => f.status === 'aktiv' && !f.archived_at)
        .map((f: any) => ({
          id: String(f.id),
          name: `${f.vorname} ${f.nachname}`,
          user_id: f.user_id
        }))
      setActiveFahrer(aktive)

      setIsLoading(false)
    } catch {
      router.push("/admin")
    }
  }

  const loadWeekData = async (weekStart: string) => {
    try {
      setIsRefreshing(true)

      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekEnd.getDate() + 6)
      const weekEndStr = weekEnd.toISOString().split('T')[0]

      const [availData, tourenData, reviewsData] = await Promise.all([
        getAvailabilityForWeek(weekStart),
        getAllArbeitsnachweiseAdmin().catch(() => []),
        getAvailabilityAlertReviewsForDateRange(weekStart, weekEndStr).catch(() => [])
      ])

      setAvailability(availData)
      setReviews(reviewsData)

      // Tour-Map erstellen
      const newTourMap: TourExistsMap = {}
      tourenData.forEach((tour: any) => {
        if (tour.user_id && tour.datum) {
          newTourMap[`${tour.user_id}_${tour.datum}`] = true
        }
      })
      setTourExistsMap(newTourMap)
    } catch (err) {
      console.error("Fehler beim Laden:", err)
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleRefresh = useCallback(async () => {
    if (selectedWeek) {
      await loadWeekData(selectedWeek)
    }
  }, [selectedWeek])

  const handleConfirm = useCallback(async (availabilityId: string) => {
    await confirmAvailability(availabilityId)
    await handleRefresh()
  }, [handleRefresh])

  const handleMarkNoTour = useCallback(async (item: DriverAvailability, note: string | null) => {
    const result = await markAvailableWithoutTour({
      fahrer_id: item.fahrer_id,
      user_id: item.user_id,
      date: item.date,
      note: note || undefined
    })
    if (!result.success) {
      throw new Error(result.error || "Fehler beim Markieren")
    }
    await handleRefresh()
  }, [handleRefresh])

  const handleLogout = async () => {
    await signOut()
    router.push("/admin")
  }

  // Navigiere Woche
  const navigateWeek = (direction: 'prev' | 'next') => {
    const current = new Date(selectedWeek)
    current.setDate(current.getDate() + (direction === 'next' ? 7 : -7))
    setSelectedWeek(current.toISOString().split('T')[0])
    setSelectedDay(null)
  }

  // Wochentage generieren
  const weekDays = useMemo(() => {
    if (!selectedWeek) return []
    return generateWeekDays(selectedWeek)
  }, [selectedWeek])

  // Hilfsfunktionen
  const isDatePast = (dateStr: string): boolean => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const date = new Date(dateStr)
    date.setHours(0, 0, 0, 0)
    return date < today
  }

  const isDateToday = (dateStr: string): boolean => {
    const today = new Date().toISOString().split('T')[0]
    return dateStr === today
  }

  const daysSinceDate = (dateStr: string): number => {
    const date = new Date(dateStr)
    const now = new Date()
    return Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
  }

  // Aktive User-IDs für Filterung
  const activeUserIds = useMemo(() => {
    return new Set(activeFahrer.map(f => f.user_id).filter(Boolean))
  }, [activeFahrer])

  // Gefilterte Verfügbarkeit (nur aktive Fahrer wenn showOnlyActive)
  const filteredAvailability = useMemo(() => {
    if (!showOnlyActive) return availability
    return availability.filter(a => activeUserIds.has(a.user_id))
  }, [availability, showOnlyActive, activeUserIds])

  // Day Cards Daten berechnen
  const dayCardsData = useMemo<DayCardData[]>(() => {
    return weekDays.map(day => {
      const dayAvail = filteredAvailability.filter(a => a.date === day.date)
      const isPast = isDatePast(day.date)
      const isHoliday = day.isHoliday || false
      const holidayName = day.holidayName || null

      // Bei Feiertagen: Keine Zähler, keine Warnungen
      if (isHoliday) {
        return {
          date: day.date,
          dayName: day.dayName,
          dayShort: day.dayShort,
          dateDisplay: day.dateDisplay,
          availableCount: 0,
          notAvailableCount: 0,
          notReportedCount: 0, // Feiertag: keine Meldung nötig
          withoutTourCount: 0,
          confirmedCount: 0,
          totalDrivers: activeFahrer.length,
          isToday: isDateToday(day.date),
          isPast,
          isHoliday: true,
          holidayName
        }
      }

      // Zähler
      const availableCount = dayAvail.filter(a => a.is_available).length
      const notAvailableCount = dayAvail.filter(a => !a.is_available).length

      // Nicht gemeldet: aktive Fahrer ohne Eintrag für diesen Tag
      const reportedUserIds = new Set(dayAvail.map(a => a.user_id))
      const notReportedCount = showOnlyActive
        ? activeFahrer.filter(f => f.user_id && !reportedUserIds.has(f.user_id)).length
        : 0

      // Ohne Tour (nur für verfügbare, vergangene Tage)
      let withoutTourCount = 0
      if (isPast) {
        dayAvail.forEach(a => {
          if (!a.is_available) return
          const hasTour = a.user_id ? tourExistsMap[`${a.user_id}_${day.date}`] : false
          const hasReview = reviews.some(r => r.fahrer_id === a.fahrer_id && r.date === day.date)
          if (!hasTour && !hasReview) {
            withoutTourCount++
          }
        })
      }

      // Bestätigt
      const confirmedCount = dayAvail.filter(a => a.availability_status === 'confirmed_by_dispo').length

      return {
        date: day.date,
        dayName: day.dayName,
        dayShort: day.dayShort,
        dateDisplay: day.dateDisplay,
        availableCount,
        notAvailableCount,
        notReportedCount,
        withoutTourCount,
        confirmedCount,
        totalDrivers: activeFahrer.length,
        isToday: isDateToday(day.date),
        isPast,
        isHoliday: false,
        holidayName: null
      }
    })
  }, [weekDays, filteredAvailability, activeFahrer, tourExistsMap, reviews, showOnlyActive])

  // Ausgewählter Tag Daten
  const selectedDayData = useMemo(() => {
    if (!selectedDay) return null
    return weekDays.find(d => d.date === selectedDay)
  }, [selectedDay, weekDays])

  // Fahrer für ausgewählten Tag
  const dayDrivers = useMemo<DayDetailDriver[]>(() => {
    if (!selectedDay) return []

    const dayAvail = filteredAvailability.filter(a => a.date === selectedDay)
    const isPast = isDatePast(selectedDay)

    return dayAvail.map(availability => {
      const hasTour = availability.user_id
        ? !!tourExistsMap[`${availability.user_id}_${selectedDay}`]
        : false
      const review = reviews.find(
        r => r.fahrer_id === availability.fahrer_id && r.date === selectedDay
      ) || null
      const days = daysSinceDate(selectedDay)
      const isAutoMarked = isPast && days >= 7 && !hasTour && !review && availability.is_available

      return {
        availability,
        hasTour,
        review,
        daysSince: days,
        isAutoMarked
      }
    })
  }, [selectedDay, filteredAvailability, tourExistsMap, reviews])

  // KW-Nummer
  const getWeekNumber = (dateStr: string): number => {
    const date = new Date(dateStr)
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
    const dayNum = d.getUTCDay() || 7
    d.setUTCDate(d.getUTCDate() + 4 - dayNum)
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
  }

  // Deadline
  const deadline = selectedWeek ? getWeekDeadline(selectedWeek) : null
  const deadlinePassed = selectedWeek ? isDeadlinePassed(selectedWeek) : false

  // Summary-Zähler
  const summaryStats = useMemo(() => {
    const totalAvailable = dayCardsData.reduce((sum, d) => sum + d.availableCount, 0)
    const totalNotReported = dayCardsData.reduce((sum, d) => sum + d.notReportedCount, 0)
    const totalWithoutTour = dayCardsData.reduce((sum, d) => sum + d.withoutTourCount, 0)
    const totalConfirmed = dayCardsData.reduce((sum, d) => sum + d.confirmedCount, 0)
    return { totalAvailable, totalNotReported, totalWithoutTour, totalConfirmed }
  }, [dayCardsData])

  if (isLoading) {
    return (
      <AdminLayout userName={userName} userRole={userRole} onLogout={handleLogout}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-blue" />
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout userName={userName} userRole={userRole} onLogout={handleLogout}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Verfügbarkeit</h1>
            <p className="text-gray-500 mt-1">Wochenplanung und Fahrer-Einsätze</p>
          </div>
          <Button variant="outline" onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Aktualisieren
          </Button>
        </div>

        {/* Wochen-Navigation */}
        <Card className="border-gray-100">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              {/* KW-Navigator */}
              <div className="flex items-center gap-3">
                <Button variant="outline" size="sm" onClick={() => navigateWeek('prev')}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="text-center min-w-[140px]">
                  <p className="font-semibold text-primary-blue">KW {getWeekNumber(selectedWeek)}</p>
                  <p className="text-xs text-gray-500">
                    {weekDays[0]?.dateDisplay} - {weekDays[4]?.dateDisplay || weekDays[weekDays.length - 1]?.dateDisplay}
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => navigateWeek('next')}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              {/* KW-Dropdown */}
              <div className="flex items-center gap-4">
                <Select value={selectedWeek} onValueChange={(v) => { setSelectedWeek(v); setSelectedDay(null) }}>
                  <SelectTrigger className="w-[240px]">
                    <SelectValue placeholder="Woche wählen" />
                  </SelectTrigger>
                  <SelectContent>
                    {weekOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Nur aktive Fahrer */}
                <div className="flex items-center gap-2">
                  <Switch
                    id="showOnlyActive"
                    checked={showOnlyActive}
                    onCheckedChange={setShowOnlyActive}
                  />
                  <Label htmlFor="showOnlyActive" className="text-sm text-gray-600 cursor-pointer">
                    Nur aktive
                  </Label>
                </div>
              </div>
            </div>

            {/* Deadline-Info */}
            {deadline && (
              <div className={`mt-3 p-2 rounded-lg text-sm flex items-center gap-2 ${
                deadlinePassed
                  ? "bg-amber-50 text-amber-800 border border-amber-200"
                  : "bg-blue-50 text-blue-800 border border-blue-200"
              }`}>
                {deadlinePassed ? (
                  <>
                    <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                    <span>Deadline überschritten - Änderungen werden als "nachträglich" markiert</span>
                  </>
                ) : (
                  <>
                    <Clock className="h-4 w-4 flex-shrink-0" />
                    <span>
                      Deadline: {deadline.toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit" })} um {deadline.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="border-gray-100">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-gray-400" />
                <span className="text-xs text-gray-500">Aktive Fahrer</span>
              </div>
              <p className="text-xl font-bold text-gray-900 mt-1">{activeFahrer.length}</p>
            </CardContent>
          </Card>
          <Card className="border-emerald-200 bg-emerald-50/50">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-emerald-600" />
                <span className="text-xs text-gray-500">Verfügbar (Woche)</span>
              </div>
              <p className="text-xl font-bold text-emerald-700 mt-1">{summaryStats.totalAvailable}</p>
            </CardContent>
          </Card>
          <Card className={summaryStats.totalNotReported > 0 ? "border-amber-200 bg-amber-50/50" : "border-gray-100"}>
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className={`h-4 w-4 ${summaryStats.totalNotReported > 0 ? 'text-amber-600' : 'text-gray-400'}`} />
                <span className="text-xs text-gray-500">Fehlt (Woche)</span>
              </div>
              <p className={`text-xl font-bold mt-1 ${summaryStats.totalNotReported > 0 ? 'text-amber-700' : 'text-gray-400'}`}>
                {summaryStats.totalNotReported}
              </p>
            </CardContent>
          </Card>
          <Card className={summaryStats.totalWithoutTour > 0 ? "border-orange-200 bg-orange-50/50" : "border-gray-100"}>
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <Info className={`h-4 w-4 ${summaryStats.totalWithoutTour > 0 ? 'text-orange-600' : 'text-gray-400'}`} />
                <span className="text-xs text-gray-500">Ohne Tour</span>
              </div>
              <p className={`text-xl font-bold mt-1 ${summaryStats.totalWithoutTour > 0 ? 'text-orange-700' : 'text-gray-400'}`}>
                {summaryStats.totalWithoutTour}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tageskarten Mo-Fr */}
        <div>
          <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">
            Wochenübersicht (Mo-Fr)
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {dayCardsData.map((day) => (
              <VerfuegbarkeitDayCard
                key={day.date}
                day={day}
                isSelected={selectedDay === day.date}
                onClick={() => setSelectedDay(selectedDay === day.date ? null : day.date)}
              />
            ))}
          </div>
        </div>

        {/* Tagesdetail */}
        {selectedDay && selectedDayData && (
          <VerfuegbarkeitDayDetail
            selectedDate={selectedDay}
            dayName={selectedDayData.dayName}
            dateDisplay={selectedDayData.dateDisplay}
            drivers={dayDrivers}
            isPast={isDatePast(selectedDay)}
            isLoading={isRefreshing}
            onConfirm={handleConfirm}
            onMarkNoTour={handleMarkNoTour}
            isHoliday={dayCardsData.find(d => d.date === selectedDay)?.isHoliday || false}
            holidayName={dayCardsData.find(d => d.date === selectedDay)?.holidayName || null}
          />
        )}

        {/* Hinweis wenn kein Tag ausgewählt */}
        {!selectedDay && (
          <Card className="border-gray-100 border-dashed">
            <CardContent className="p-8 text-center">
              <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">
                Klicken Sie auf einen Tag, um die Details anzuzeigen
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  )
}
