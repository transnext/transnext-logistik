"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { EmptyState } from "@/components/ui/empty-state"
import {
  CheckCircle,
  XCircle,
  Clock,
  Tag,
  AlertTriangle,
  Check,
  RefreshCw,
  User,
  Calendar
} from "lucide-react"
import type { DriverAvailability, AvailabilityStatus } from "@/lib/availability-api"
import { formatAvailabilityStatus, getAvailabilityStatusColors } from "@/lib/availability-api"
import type { AvailabilityAlertReview } from "@/lib/availability-alert-reviews-api"

export interface DayDetailDriver {
  availability: DriverAvailability
  hasTour: boolean
  review: AvailabilityAlertReview | null
  daysSince: number
  isAutoMarked: boolean
}

interface VerfuegbarkeitDayDetailProps {
  selectedDate: string
  dayName: string
  dateDisplay: string
  drivers: DayDetailDriver[]
  isPast: boolean
  isLoading: boolean
  onConfirm: (availabilityId: string) => Promise<void>
  onMarkNoTour: (item: DriverAvailability, note: string | null) => Promise<void>
  isHoliday?: boolean
  holidayName?: string | null
}

export function VerfuegbarkeitDayDetail({
  selectedDate,
  dayName,
  dateDisplay,
  drivers,
  isPast,
  isLoading,
  onConfirm,
  onMarkNoTour,
  isHoliday,
  holidayName
}: VerfuegbarkeitDayDetailProps) {
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [showMarkModal, setShowMarkModal] = useState(false)
  const [markItem, setMarkItem] = useState<DriverAvailability | null>(null)
  const [markNote, setMarkNote] = useState("")
  const [isMarking, setIsMarking] = useState(false)

  // Gruppiere nach Status
  const available = drivers.filter(d => d.availability.is_available)
  const notAvailable = drivers.filter(d => !d.availability.is_available)

  const formatTime = (time: string | null) => {
    if (!time) return null
    return time.slice(0, 5)
  }

  const handleConfirm = async (availabilityId: string) => {
    setActionLoading(availabilityId)
    try {
      await onConfirm(availabilityId)
    } finally {
      setActionLoading(null)
    }
  }

  const handleOpenMarkModal = (item: DriverAvailability) => {
    setMarkItem(item)
    setMarkNote("")
    setShowMarkModal(true)
  }

  const handleMarkNoTour = async () => {
    if (!markItem) return
    setIsMarking(true)
    try {
      await onMarkNoTour(markItem, markNote || null)
      setShowMarkModal(false)
      setMarkItem(null)
    } finally {
      setIsMarking(false)
    }
  }

  if (isLoading) {
    return (
      <Card className="border-gray-100">
        <CardContent className="p-8 flex items-center justify-center">
          <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
        </CardContent>
      </Card>
    )
  }

  // Feiertag: Spezielle Anzeige
  if (isHoliday) {
    return (
      <Card className="border-purple-200 bg-purple-50/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Calendar className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <CardTitle className="text-lg text-purple-700">{dayName}, {dateDisplay}</CardTitle>
                <CardDescription className="text-purple-600 font-medium">
                  {holidayName || 'Feiertag'}
                </CardDescription>
              </div>
            </div>
            <Badge className="bg-purple-100 text-purple-700 border-purple-200 border">
              Feiertag
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Calendar className="h-12 w-12 text-purple-300 mx-auto mb-3" />
            <p className="text-gray-600 font-medium">Gesetzlicher Feiertag in NRW</p>
            <p className="text-sm text-gray-500 mt-1">
              Keine Verfügbarkeitsmeldungen erforderlich
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card className="border-gray-100">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Calendar className="h-5 w-5 text-primary-blue" />
              </div>
              <div>
                <CardTitle className="text-lg">{dayName}, {dateDisplay}</CardTitle>
                <CardDescription>
                  {available.length} verfügbar, {notAvailable.length} nicht verfügbar
                </CardDescription>
              </div>
            </div>
            {isPast && (
              <Badge className="bg-gray-100 text-gray-600 border-gray-200 border">
                Vergangen
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {drivers.length === 0 ? (
            <EmptyState
              title="Keine Meldungen"
              description="Für diesen Tag liegen keine Verfügbarkeitsmeldungen vor."
              icon={<User className="h-12 w-12 text-gray-400" />}
              iconSize="sm"
            />
          ) : (
            <div className="space-y-4">
              {/* Verfügbare Fahrer */}
              {available.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-emerald-700 mb-2 flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    Verfügbar ({available.length})
                  </h4>
                  <div className="space-y-2">
                    {available.map(({ availability, hasTour, review, isAutoMarked }) => {
                      const statusColors = getAvailabilityStatusColors(availability.availability_status)
                      const canMark = isPast && !hasTour && !review && !isAutoMarked

                      return (
                        <div
                          key={availability.id}
                          className="flex items-center justify-between p-3 bg-emerald-50/50 rounded-lg border border-emerald-100"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-900 truncate">
                                {availability.fahrer_name}
                              </span>
                              <Badge className={`${statusColors.bg} ${statusColors.text} ${statusColors.border} border text-xs`}>
                                {formatAvailabilityStatus(availability.availability_status)}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                              {availability.available_from && availability.available_until ? (
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {formatTime(availability.available_from)} - {formatTime(availability.available_until)}
                                </span>
                              ) : (
                                <span>Ganztägig</span>
                              )}
                              {availability.preferred_tour_type && availability.preferred_tour_type !== 'any' && (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                  {availability.preferred_tour_type === 'short' ? 'Kurze Touren' : 'Lange Touren'}
                                </Badge>
                              )}
                            </div>
                            {/* Vollständige Notiz anzeigen - nicht mehr abgeschnitten */}
                            {availability.note && (
                              <div className="mt-2 p-2 bg-white/60 rounded border border-emerald-100/50 text-xs text-gray-600">
                                <span className="text-gray-400 font-medium">Notiz: </span>
                                {availability.note}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-2 ml-2">
                            {/* Tour-Status */}
                            {hasTour ? (
                              <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 border text-xs">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Tour
                              </Badge>
                            ) : review ? (
                              <Badge className="bg-blue-100 text-blue-700 border-blue-200 border text-xs">
                                <Tag className="h-3 w-3 mr-1" />
                                Markiert
                              </Badge>
                            ) : isAutoMarked ? (
                              <Badge className="bg-amber-100 text-amber-700 border-amber-200 border text-xs">
                                <Clock className="h-3 w-3 mr-1" />
                                Auto 7d
                              </Badge>
                            ) : isPast ? (
                              <Badge className="bg-red-100 text-red-700 border-red-200 border text-xs">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                Keine Tour
                              </Badge>
                            ) : null}

                            {/* Aktionen */}
                            {canMark && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenMarkModal(availability)}
                                className="text-blue-700 border-blue-200 hover:bg-blue-50 h-7 px-2"
                              >
                                <Tag className="h-3 w-3 mr-1" />
                                Markieren
                              </Button>
                            )}
                            {availability.availability_status !== 'confirmed_by_dispo' &&
                             availability.availability_status !== 'not_submitted' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleConfirm(availability.id)}
                                disabled={actionLoading === availability.id}
                                className="text-emerald-700 border-emerald-200 hover:bg-emerald-50 h-7 px-2"
                              >
                                {actionLoading === availability.id ? (
                                  <RefreshCw className="h-3 w-3 animate-spin" />
                                ) : (
                                  <Check className="h-3 w-3" />
                                )}
                              </Button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Nicht verfügbare Fahrer */}
              {notAvailable.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-red-700 mb-2 flex items-center gap-2">
                    <XCircle className="h-4 w-4" />
                    Nicht verfügbar ({notAvailable.length})
                  </h4>
                  <div className="space-y-2">
                    {notAvailable.map(({ availability }) => {
                      const statusColors = getAvailabilityStatusColors(availability.availability_status)

                      return (
                        <div
                          key={availability.id}
                          className="flex items-center justify-between p-3 bg-red-50/50 rounded-lg border border-red-100"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-900 truncate">
                                {availability.fahrer_name}
                              </span>
                              <Badge className={`${statusColors.bg} ${statusColors.text} ${statusColors.border} border text-xs`}>
                                {formatAvailabilityStatus(availability.availability_status)}
                              </Badge>
                            </div>
                            {/* Vollständige Notiz anzeigen - nicht mehr abgeschnitten */}
                            {availability.note && (
                              <div className="mt-2 p-2 bg-white/60 rounded border border-red-100/50 text-xs text-gray-600">
                                <span className="text-gray-400 font-medium">Grund: </span>
                                {availability.note}
                              </div>
                            )}
                          </div>

                          {/* Bestätigen */}
                          {availability.availability_status !== 'confirmed_by_dispo' &&
                           availability.availability_status !== 'not_submitted' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleConfirm(availability.id)}
                              disabled={actionLoading === availability.id}
                              className="text-emerald-700 border-emerald-200 hover:bg-emerald-50 h-7 px-2"
                            >
                              {actionLoading === availability.id ? (
                                <RefreshCw className="h-3 w-3 animate-spin" />
                              ) : (
                                <>
                                  <Check className="h-3 w-3 mr-1" />
                                  OK
                                </>
                              )}
                            </Button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal: "Verfügbar, aber keine Tour" markieren */}
      <Dialog open={showMarkModal} onOpenChange={setShowMarkModal}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>Verfügbar, aber keine Tour</DialogTitle>
            <DialogDescription>
              Markieren Sie diesen Tag als "Verfügbar, aber keine Tour".
            </DialogDescription>
          </DialogHeader>

          {markItem && (
            <div className="space-y-4">
              <div className="p-3 bg-gray-50 rounded-lg text-sm">
                <div className="flex justify-between">
                  <span className="font-medium">{markItem.fahrer_name}</span>
                  <span>{dateDisplay}</span>
                </div>
                <div className="text-gray-500 mt-1">
                  {markItem.available_from && markItem.available_until
                    ? `Verfügbar: ${formatTime(markItem.available_from)} - ${formatTime(markItem.available_until)}`
                    : 'Ganztägig verfügbar'
                  }
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="markNote">Notiz (optional)</Label>
                <Textarea
                  id="markNote"
                  placeholder="z.B. Keine passende Tour verfügbar..."
                  value={markNote}
                  onChange={(e) => setMarkNote(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMarkModal(false)} disabled={isMarking}>
              Abbrechen
            </Button>
            <Button onClick={handleMarkNoTour} disabled={isMarking} className="bg-primary-blue hover:bg-blue-700">
              {isMarking ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Tag className="h-4 w-4 mr-2" />
              )}
              Markieren
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
