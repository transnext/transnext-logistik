"use client"

import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import {
  Truck,
  Clock,
  CheckCircle,
  AlertTriangle,
  ExternalLink,
  Calendar
} from "lucide-react"

// ============================================================
// TYPES
// ============================================================

export interface TourHistorieItem {
  id: number
  tour_nr: string | null
  datum: string
  auftraggeber: string | null
  status: string
  gefahrene_km: number | null
  created_at: string | null
  // Berechnete Felder
  isPuenktlich: boolean
  delayDays: number
  delayHours: number
}

interface FahrerakteTourenHistorieProps {
  touren: TourHistorieItem[]
  zeitraumLabel: string
  isLoading?: boolean
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Berechnet ob ein Upload verspätet ist
 * Regel: Upload ist verspätet wenn created_at > datum 23:59 Uhr Europe/Berlin
 */
export function calculateUploadDelay(
  createdAt: string | null | undefined,
  tourDatum: string
): { isPuenktlich: boolean; delayDays: number; delayHours: number } {
  if (!createdAt) {
    // Kein Upload-Zeitpunkt bekannt -> als pünktlich behandeln
    return { isPuenktlich: true, delayDays: 0, delayHours: 0 }
  }

  const uploadDate = new Date(createdAt)
  // Deadline = Ende des Tour-Datums (23:59:59.999)
  const deadline = new Date(tourDatum)
  deadline.setHours(23, 59, 59, 999)

  if (uploadDate <= deadline) {
    return { isPuenktlich: true, delayDays: 0, delayHours: 0 }
  }

  // Berechne Verspätung
  const diffMs = uploadDate.getTime() - deadline.getTime()
  const delayHours = Math.ceil(diffMs / (1000 * 60 * 60))
  const delayDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

  return { isPuenktlich: false, delayDays, delayHours }
}

/**
 * Formatiert die Verspätung als Text
 */
function formatDelay(delayDays: number, delayHours: number): string {
  if (delayDays === 0 && delayHours === 0) return ''

  if (delayDays >= 1) {
    return `${delayDays} Tag${delayDays > 1 ? 'e' : ''} verspätet`
  }

  return `${delayHours} Std. verspätet`
}

/**
 * Formatiert Datum für Anzeige
 */
function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

/**
 * Formatiert Datum und Uhrzeit für Anzeige
 */
function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

/**
 * Status-Konfiguration
 */
const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  pending: { label: 'Offen', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  eingereicht: { label: 'Eingereicht', className: 'bg-blue-50 text-blue-700 border-blue-200' },
  in_pruefung: { label: 'In Prüfung', className: 'bg-blue-50 text-blue-700 border-blue-200' },
  approved: { label: 'Genehmigt', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  billed: { label: 'Abgerechnet', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  rejected: { label: 'Abgelehnt', className: 'bg-red-50 text-red-700 border-red-200' }
}

function getStatusConfig(status: string): { label: string; className: string } {
  return STATUS_CONFIG[status] || { label: status, className: 'bg-gray-50 text-gray-700 border-gray-200' }
}

// ============================================================
// COMPONENT
// ============================================================

export function FahrerakteTourenHistorie({
  touren,
  zeitraumLabel,
  isLoading = false
}: FahrerakteTourenHistorieProps) {
  if (isLoading) {
    return (
      <Card className="border-gray-100">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Truck className="h-5 w-5 text-gray-400" />
            Tourenhistorie
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-blue" />
            <span className="ml-2 text-gray-500">Lade Touren...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Zähle pünktliche und verspätete Uploads
  const puenktlichCount = touren.filter(t => t.isPuenktlich).length
  const verspaetetCount = touren.filter(t => !t.isPuenktlich).length

  return (
    <Card className="border-gray-100">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Truck className="h-5 w-5 text-gray-400" />
              Tourenhistorie
            </CardTitle>
            <CardDescription>
              {touren.length} Tour{touren.length !== 1 ? 'en' : ''} im Zeitraum {zeitraumLabel}
            </CardDescription>
          </div>
          {touren.length > 0 && (
            <div className="flex gap-2 text-sm">
              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 border">
                <CheckCircle className="h-3 w-3 mr-1" />
                {puenktlichCount} pünktlich
              </Badge>
              {verspaetetCount > 0 && (
                <Badge className="bg-amber-50 text-amber-700 border-amber-200 border">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  {verspaetetCount} verspätet
                </Badge>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {touren.length === 0 ? (
          <EmptyState
            title="Keine Touren im Zeitraum"
            description={`Für den Zeitraum "${zeitraumLabel}" wurden keine Touren gefunden.`}
            icon={<Calendar className="h-12 w-12 text-gray-400" />}
            iconSize="sm"
          />
        ) : (
          <>
            {/* Desktop: Tabelle */}
            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50/50 hover:bg-gray-50/50">
                    <TableHead className="font-medium text-gray-600">Tour-Nr.</TableHead>
                    <TableHead className="font-medium text-gray-600">Datum</TableHead>
                    <TableHead className="font-medium text-gray-600">Kunde</TableHead>
                    <TableHead className="font-medium text-gray-600">Status</TableHead>
                    <TableHead className="font-medium text-gray-600 text-right">KM</TableHead>
                    <TableHead className="font-medium text-gray-600">Upload</TableHead>
                    <TableHead className="font-medium text-gray-600">Pünktlichkeit</TableHead>
                    <TableHead className="font-medium text-gray-600">Aktion</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {touren.map((tour) => {
                    const statusConfig = getStatusConfig(tour.status)
                    const delayText = formatDelay(tour.delayDays, tour.delayHours)

                    return (
                      <TableRow key={tour.id} className="hover:bg-gray-50/50">
                        <TableCell className="font-mono text-sm font-medium">
                          {tour.tour_nr || `#${tour.id}`}
                        </TableCell>
                        <TableCell className="text-sm">
                          {formatDate(tour.datum)}
                        </TableCell>
                        <TableCell className="text-sm text-gray-600 max-w-[150px] truncate" title={tour.auftraggeber || '-'}>
                          {tour.auftraggeber || '-'}
                        </TableCell>
                        <TableCell>
                          <Badge className={`border text-xs ${statusConfig.className}`}>
                            {statusConfig.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-right font-mono">
                          {tour.gefahrene_km != null ? `${tour.gefahrene_km} km` : '-'}
                        </TableCell>
                        <TableCell className="text-xs text-gray-500">
                          {formatDateTime(tour.created_at)}
                        </TableCell>
                        <TableCell>
                          {tour.isPuenktlich ? (
                            <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 border text-xs">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Pünktlich
                            </Badge>
                          ) : (
                            <div className="space-y-1">
                              <Badge className="bg-amber-50 text-amber-700 border-amber-200 border text-xs">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                Verspätet
                              </Badge>
                              <p className="text-xs text-amber-600">{delayText}</p>
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Link href="/admin/arbeitsnachweise">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-primary-blue hover:bg-blue-50 h-7 px-2"
                            >
                              <ExternalLink className="h-3 w-3 mr-1" />
                              Öffnen
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Mobile: Karten */}
            <div className="md:hidden space-y-3">
              {touren.map((tour) => {
                const statusConfig = getStatusConfig(tour.status)
                const delayText = formatDelay(tour.delayDays, tour.delayHours)

                return (
                  <div
                    key={tour.id}
                    className="p-4 border border-gray-100 rounded-lg bg-white"
                  >
                    {/* Kopfzeile: Tour-Nr + Status */}
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-mono text-sm font-semibold text-gray-900">
                        {tour.tour_nr || `#${tour.id}`}
                      </span>
                      <Badge className={`border text-xs ${statusConfig.className}`}>
                        {statusConfig.label}
                      </Badge>
                    </div>

                    {/* Details */}
                    <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                      <div>
                        <span className="text-gray-500">Datum:</span>
                        <span className="ml-1 text-gray-900">{formatDate(tour.datum)}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">KM:</span>
                        <span className="ml-1 text-gray-900 font-mono">
                          {tour.gefahrene_km != null ? tour.gefahrene_km : '-'}
                        </span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-gray-500">Kunde:</span>
                        <span className="ml-1 text-gray-900">{tour.auftraggeber || '-'}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-gray-500">Upload:</span>
                        <span className="ml-1 text-gray-600 text-xs">
                          {formatDateTime(tour.created_at)}
                        </span>
                      </div>
                    </div>

                    {/* Pünktlichkeit + Aktion */}
                    <div className="flex items-center justify-between pt-3 border-t border-gray-50">
                      <div>
                        {tour.isPuenktlich ? (
                          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 border text-xs">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Pünktlich
                          </Badge>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Badge className="bg-amber-50 text-amber-700 border-amber-200 border text-xs">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Verspätet
                            </Badge>
                            <span className="text-xs text-amber-600">{delayText}</span>
                          </div>
                        )}
                      </div>
                      <Link href="/admin/arbeitsnachweise">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-primary-blue hover:bg-blue-50 h-7 px-2"
                        >
                          <ExternalLink className="h-3 w-3 mr-1" />
                          Öffnen
                        </Button>
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
