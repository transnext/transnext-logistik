"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, XCircle, HelpCircle, AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"

export interface DayCardData {
  date: string
  dayName: string
  dayShort: string
  dateDisplay: string
  availableCount: number
  notAvailableCount: number
  notReportedCount: number
  withoutTourCount: number
  confirmedCount: number
  totalDrivers: number
  isToday: boolean
  isPast: boolean
  isHoliday: boolean
  holidayName: string | null
}

interface VerfuegbarkeitDayCardProps {
  day: DayCardData
  isSelected: boolean
  onClick: () => void
}

export function VerfuegbarkeitDayCard({ day, isSelected, onClick }: VerfuegbarkeitDayCardProps) {
  const hasIssues = day.notReportedCount > 0 || day.withoutTourCount > 0

  // Feiertag: Spezielle Darstellung
  if (day.isHoliday) {
    return (
      <Card
        className={cn(
          "cursor-pointer transition-all hover:shadow-md border-2",
          isSelected
            ? "border-purple-400 bg-purple-50 shadow-md"
            : "border-purple-200 bg-purple-50/50 hover:border-purple-300",
          "opacity-80"
        )}
        onClick={onClick}
      >
        <CardContent className="p-3">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className={cn(
                "text-sm font-semibold",
                isSelected ? "text-purple-700" : "text-gray-900"
              )}>
                {day.dayShort}
              </p>
              <p className="text-xs text-gray-500">{day.dateDisplay}</p>
            </div>
            <Badge className="bg-purple-100 text-purple-700 border-purple-200 border text-[10px] px-1.5">
              Feiertag
            </Badge>
          </div>
          <p className="text-xs text-purple-600 font-medium truncate" title={day.holidayName || ''}>
            {day.holidayName}
          </p>
          <p className="text-[10px] text-gray-500 mt-1">
            Keine Meldung nötig
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card
      className={cn(
        "cursor-pointer transition-all hover:shadow-md border-2",
        isSelected
          ? "border-primary-blue bg-blue-50/50 shadow-md"
          : "border-gray-100 hover:border-gray-200",
        day.isToday && !isSelected && "border-blue-200 bg-blue-50/30",
        day.isPast && !isSelected && "opacity-75"
      )}
      onClick={onClick}
    >
      <CardContent className="p-3">
        {/* Tag-Header */}
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className={cn(
              "text-sm font-semibold",
              isSelected ? "text-primary-blue" : "text-gray-900"
            )}>
              {day.dayShort}
            </p>
            <p className="text-xs text-gray-500">{day.dateDisplay}</p>
          </div>
          {day.isToday && (
            <Badge className="bg-blue-100 text-blue-700 border-blue-200 border text-[10px] px-1.5">
              Heute
            </Badge>
          )}
        </div>

        {/* Zähler */}
        <div className="space-y-1.5">
          {/* Verfügbar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
              <span className="text-xs text-gray-600">Verfügbar</span>
            </div>
            <span className={cn(
              "text-sm font-semibold",
              day.availableCount > 0 ? "text-emerald-700" : "text-gray-400"
            )}>
              {day.availableCount}
            </span>
          </div>

          {/* Nicht verfügbar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <XCircle className="h-3.5 w-3.5 text-red-500" />
              <span className="text-xs text-gray-600">Nicht verf.</span>
            </div>
            <span className={cn(
              "text-sm font-semibold",
              day.notAvailableCount > 0 ? "text-red-600" : "text-gray-400"
            )}>
              {day.notAvailableCount}
            </span>
          </div>

          {/* Nicht gemeldet */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <HelpCircle className="h-3.5 w-3.5 text-amber-500" />
              <span className="text-xs text-gray-600">Fehlt</span>
            </div>
            <span className={cn(
              "text-sm font-semibold",
              day.notReportedCount > 0 ? "text-amber-600" : "text-gray-400"
            )}>
              {day.notReportedCount}
            </span>
          </div>

          {/* Ohne Tour (nur wenn > 0 und vergangen) */}
          {day.isPast && day.withoutTourCount > 0 && (
            <div className="flex items-center justify-between pt-1 border-t border-gray-100">
              <div className="flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 text-orange-500" />
                <span className="text-xs text-gray-600">Ohne Tour</span>
              </div>
              <span className="text-sm font-semibold text-orange-600">
                {day.withoutTourCount}
              </span>
            </div>
          )}
        </div>

        {/* Warnung bei Problemen */}
        {hasIssues && !day.isPast && (
          <div className="mt-2 pt-2 border-t border-gray-100">
            <p className="text-[10px] text-amber-600 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              Handlungsbedarf
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
