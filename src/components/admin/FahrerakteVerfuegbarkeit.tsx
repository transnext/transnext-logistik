"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Calendar,
  CheckCircle,
  Clock,
  AlertTriangle,
  Tag,
  Percent,
  RefreshCw,
  User
} from "lucide-react"

// ============================================================
// TYPES
// ============================================================

export type VerfuegbarkeitStatus =
  | 'ungeklaert'
  | 'markiert_verfuegbar_keine_tour'
  | 'auto_nach_7_tagen'
  | 'tour_spaeter_hochgeladen'

export interface VerfuegbarkeitOhneTourItem {
  availability_id: string | null
  fahrer_id: string
  user_id: string | null
  date: string
  available_from: string | null
  available_until: string | null
  note: string | null
  status: VerfuegbarkeitStatus
  marked_by: string | null
  marked_at: string | null
  review_note: string | null
  days_since: number
}

export interface VerfuegbarkeitKPIs {
  verfuegbareTage: number
  verfuegbareMitTour: number
  verfuegbareOhneTour: number
  einsatzQuote: number
  manuellMarkiert: number
  autoNach7Tagen: number
}

interface FahrerakteVerfuegbarkeitProps {
  kpis: VerfuegbarkeitKPIs
  tageOhneTour: VerfuegbarkeitOhneTourItem[]
  zeitraumLabel: string
  fahrerId: string
  isLoading?: boolean
  onMarkAvailableNoTour: (item: VerfuegbarkeitOhneTourItem, note: string | null) => Promise<void>
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('de-DE', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

function formatTime(time: string | null): string {
  if (!time) return '-'
  return time.slice(0, 5)
}

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

const STATUS_CONFIG: Record<VerfuegbarkeitStatus, { label: string; className: string; icon: React.ReactNode }> = {
  ungeklaert: {
    label: 'Ungeklärt',
    className: 'bg-red-50 text-red-700 border-red-200',
    icon: <AlertTriangle className="h-3 w-3" />
  },
  markiert_verfuegbar_keine_tour: {
    label: 'Markiert',
    className: 'bg-blue-50 text-blue-700 border-blue-200',
    icon: <Tag className="h-3 w-3" />
  },
  auto_nach_7_tagen: {
    label: 'Auto (7 Tage)',
    className: 'bg-amber-50 text-amber-700 border-amber-200',
    icon: <Clock className="h-3 w-3" />
  },
  tour_spaeter_hochgeladen: {
    label: 'Tour nachgereicht',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: <CheckCircle className="h-3 w-3" />
  }
}

function getStatusConfig(status: VerfuegbarkeitStatus) {
  return STATUS_CONFIG[status] || STATUS_CONFIG.ungeklaert
}

// ============================================================
// COMPONENT
// ============================================================

export function FahrerakteVerfuegbarkeit({
  kpis,
  tageOhneTour,
  zeitraumLabel,
  fahrerId,
  isLoading = false,
  onMarkAvailableNoTour
}: FahrerakteVerfuegbarkeitProps) {
  const [showMarkModal, setShowMarkModal] = useState(false)
  const [markItem, setMarkItem] = useState<VerfuegbarkeitOhneTourItem | null>(null)
  const [markNote, setMarkNote] = useState("")
  const [isMarking, setIsMarking] = useState(false)

  const handleOpenMarkModal = (item: VerfuegbarkeitOhneTourItem) => {
    setMarkItem(item)
    setMarkNote("")
    setShowMarkModal(true)
  }

  const handleMarkSubmit = async () => {
    if (!markItem) return

    setIsMarking(true)
    try {
      await onMarkAvailableNoTour(markItem, markNote || null)
      setShowMarkModal(false)
      setMarkItem(null)
    } catch (err) {
      console.error("Fehler beim Markieren:", err)
    } finally {
      setIsMarking(false)
    }
  }

  if (isLoading) {
    return (
      <Card className="border-gray-100">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="h-5 w-5 text-gray-400" />
            Verfügbarkeit & Einsatz
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-blue" />
            <span className="ml-2 text-gray-500">Lade Daten...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Keine Verfügbarkeiten
  if (kpis.verfuegbareTage === 0) {
    return (
      <Card className="border-gray-100">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="h-5 w-5 text-gray-400" />
            Verfügbarkeit & Einsatz
          </CardTitle>
          <CardDescription>Zeitraum: {zeitraumLabel}</CardDescription>
        </CardHeader>
        <CardContent>
          <EmptyState
            title="Keine Verfügbarkeiten im Zeitraum"
            description={`Für den Zeitraum "${zeitraumLabel}" wurden keine Verfügbarkeitsmeldungen gefunden.`}
            icon={<Calendar className="h-12 w-12 text-gray-400" />}
            iconSize="sm"
          />
        </CardContent>
      </Card>
    )
  }

  // Ungeklärte Tage (für Badge in Header)
  const ungeklaertCount = tageOhneTour.filter(t => t.status === 'ungeklaert').length

  return (
    <>
      <Card className="border-gray-100">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="h-5 w-5 text-gray-400" />
                Verfügbarkeit & Einsatz
              </CardTitle>
              <CardDescription>Zeitraum: {zeitraumLabel}</CardDescription>
            </div>
            <div className="flex gap-2">
              {kpis.einsatzQuote >= 80 ? (
                <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 border">
                  <Percent className="h-3 w-3 mr-1" />
                  {kpis.einsatzQuote}% Einsatz
                </Badge>
              ) : kpis.einsatzQuote >= 50 ? (
                <Badge className="bg-amber-50 text-amber-700 border-amber-200 border">
                  <Percent className="h-3 w-3 mr-1" />
                  {kpis.einsatzQuote}% Einsatz
                </Badge>
              ) : (
                <Badge className="bg-red-50 text-red-700 border-red-200 border">
                  <Percent className="h-3 w-3 mr-1" />
                  {kpis.einsatzQuote}% Einsatz
                </Badge>
              )}
              {ungeklaertCount > 0 && (
                <Badge className="bg-red-50 text-red-700 border-red-200 border">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  {ungeklaertCount} ungeklärt
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* KPI-Zeile */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* Verfügbare Tage */}
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Calendar className="h-4 w-4 text-gray-500" />
                <span className="text-xs text-gray-500">Verfügbar</span>
              </div>
              <p className="text-xl font-bold text-gray-900">{kpis.verfuegbareTage}</p>
            </div>

            {/* Mit Tour */}
            <div className="p-3 bg-emerald-50 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle className="h-4 w-4 text-emerald-600" />
                <span className="text-xs text-emerald-600">Mit Tour</span>
              </div>
              <p className="text-xl font-bold text-emerald-700">{kpis.verfuegbareMitTour}</p>
            </div>

            {/* Ohne Tour */}
            <div className={`p-3 rounded-lg ${kpis.verfuegbareOhneTour > 0 ? 'bg-amber-50' : 'bg-gray-50'}`}>
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className={`h-4 w-4 ${kpis.verfuegbareOhneTour > 0 ? 'text-amber-600' : 'text-gray-500'}`} />
                <span className={`text-xs ${kpis.verfuegbareOhneTour > 0 ? 'text-amber-600' : 'text-gray-500'}`}>Ohne Tour</span>
              </div>
              <p className={`text-xl font-bold ${kpis.verfuegbareOhneTour > 0 ? 'text-amber-700' : 'text-gray-900'}`}>
                {kpis.verfuegbareOhneTour}
              </p>
            </div>

            {/* Einsatzquote */}
            <div className={`p-3 rounded-lg ${kpis.einsatzQuote >= 80 ? 'bg-emerald-50' : kpis.einsatzQuote >= 50 ? 'bg-amber-50' : 'bg-red-50'}`}>
              <div className="flex items-center gap-2 mb-1">
                <Percent className={`h-4 w-4 ${kpis.einsatzQuote >= 80 ? 'text-emerald-600' : kpis.einsatzQuote >= 50 ? 'text-amber-600' : 'text-red-600'}`} />
                <span className={`text-xs ${kpis.einsatzQuote >= 80 ? 'text-emerald-600' : kpis.einsatzQuote >= 50 ? 'text-amber-600' : 'text-red-600'}`}>Quote</span>
              </div>
              <p className={`text-xl font-bold ${kpis.einsatzQuote >= 80 ? 'text-emerald-700' : kpis.einsatzQuote >= 50 ? 'text-amber-700' : 'text-red-700'}`}>
                {kpis.einsatzQuote}%
              </p>
            </div>

            {/* Manuell markiert */}
            <div className="p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Tag className="h-4 w-4 text-blue-600" />
                <span className="text-xs text-blue-600">Markiert</span>
              </div>
              <p className="text-xl font-bold text-blue-700">{kpis.manuellMarkiert}</p>
            </div>

            {/* Auto nach 7 Tagen */}
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="h-4 w-4 text-gray-500" />
                <span className="text-xs text-gray-500">Auto (7d)</span>
              </div>
              <p className="text-xl font-bold text-gray-900">{kpis.autoNach7Tagen}</p>
            </div>
          </div>

          {/* Liste Tage ohne Tour */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">
              Tage ohne Tour ({tageOhneTour.length})
            </h4>

            {tageOhneTour.length === 0 ? (
              <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-lg text-center">
                <CheckCircle className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                <p className="text-sm text-emerald-700 font-medium">Keine Tage ohne Tour</p>
                <p className="text-xs text-emerald-600 mt-1">
                  Alle verfügbaren Tage im Zeitraum hatten eine Tour.
                </p>
              </div>
            ) : (
              <>
                {/* Desktop: Tabelle */}
                <div className="hidden md:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50/50 hover:bg-gray-50/50">
                        <TableHead className="font-medium text-gray-600">Datum</TableHead>
                        <TableHead className="font-medium text-gray-600">Verfügbar</TableHead>
                        <TableHead className="font-medium text-gray-600">Fahrer-Notiz</TableHead>
                        <TableHead className="font-medium text-gray-600">Status</TableHead>
                        <TableHead className="font-medium text-gray-600">Markiert</TableHead>
                        <TableHead className="font-medium text-gray-600">Aktion</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tageOhneTour.map((item, index) => {
                        const statusConfig = getStatusConfig(item.status)
                        const canMark = item.status === 'ungeklaert'

                        return (
                          <TableRow key={`${item.date}-${index}`} className="hover:bg-gray-50/50">
                            <TableCell className="text-sm font-medium">
                              {formatDate(item.date)}
                            </TableCell>
                            <TableCell className="text-sm text-gray-600">
                              {item.available_from && item.available_until
                                ? `${formatTime(item.available_from)} - ${formatTime(item.available_until)}`
                                : 'Ganztägig'
                              }
                            </TableCell>
                            <TableCell className="text-sm text-gray-500 max-w-[150px] truncate" title={item.note || ''}>
                              {item.note || '-'}
                            </TableCell>
                            <TableCell>
                              <Badge className={`border text-xs ${statusConfig.className}`}>
                                {statusConfig.icon}
                                <span className="ml-1">{statusConfig.label}</span>
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs text-gray-500">
                              {item.marked_at ? (
                                <div>
                                  <div>{formatDateTime(item.marked_at)}</div>
                                  {item.review_note && (
                                    <div className="text-gray-400 truncate max-w-[100px]" title={item.review_note}>
                                      {item.review_note}
                                    </div>
                                  )}
                                </div>
                              ) : item.status === 'auto_nach_7_tagen' ? (
                                <span className="text-amber-600">Automatisch</span>
                              ) : (
                                '-'
                              )}
                            </TableCell>
                            <TableCell>
                              {canMark ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleOpenMarkModal(item)}
                                  className="text-blue-700 border-blue-200 hover:bg-blue-50 h-7"
                                >
                                  <Tag className="h-3 w-3 mr-1" />
                                  Markieren
                                </Button>
                              ) : (
                                <span className="text-xs text-gray-400">-</span>
                              )}
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile: Karten */}
                <div className="md:hidden space-y-3">
                  {tageOhneTour.map((item, index) => {
                    const statusConfig = getStatusConfig(item.status)
                    const canMark = item.status === 'ungeklaert'

                    return (
                      <div
                        key={`${item.date}-${index}`}
                        className={`p-4 border rounded-lg bg-white ${
                          item.status === 'ungeklaert' ? 'border-red-200' : 'border-gray-100'
                        }`}
                      >
                        {/* Kopfzeile */}
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm font-semibold text-gray-900">
                            {formatDate(item.date)}
                          </span>
                          <Badge className={`border text-xs ${statusConfig.className}`}>
                            {statusConfig.icon}
                            <span className="ml-1">{statusConfig.label}</span>
                          </Badge>
                        </div>

                        {/* Details */}
                        <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                          <div>
                            <span className="text-gray-500">Verfügbar:</span>
                            <span className="ml-1 text-gray-900">
                              {item.available_from && item.available_until
                                ? `${formatTime(item.available_from)} - ${formatTime(item.available_until)}`
                                : 'Ganztägig'
                              }
                            </span>
                          </div>
                          {item.note && (
                            <div className="col-span-2">
                              <span className="text-gray-500">Notiz:</span>
                              <span className="ml-1 text-gray-700">{item.note}</span>
                            </div>
                          )}
                          {item.marked_at && (
                            <div className="col-span-2 text-xs text-gray-400">
                              Markiert: {formatDateTime(item.marked_at)}
                              {item.review_note && ` - ${item.review_note}`}
                            </div>
                          )}
                        </div>

                        {/* Aktion */}
                        {canMark && (
                          <div className="pt-3 border-t border-gray-50">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleOpenMarkModal(item)}
                              className="w-full text-blue-700 border-blue-200 hover:bg-blue-50"
                            >
                              <Tag className="h-3 w-3 mr-1" />
                              Als verfügbar, aber keine Tour markieren
                            </Button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Modal: Markierung */}
      <Dialog open={showMarkModal} onOpenChange={setShowMarkModal}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>Verfügbar, aber keine Tour</DialogTitle>
            <DialogDescription>
              Markieren Sie diesen Tag als &quot;Verfügbar, aber keine Tour&quot;.
              Diese Markierung ist für Admin/GF und Dispo sichtbar, nicht für den Fahrer.
            </DialogDescription>
          </DialogHeader>

          {markItem && (
            <div className="space-y-4">
              {/* Info */}
              <div className="p-3 bg-gray-50 rounded-lg text-sm">
                <div className="flex justify-between">
                  <span className="font-medium">{formatDate(markItem.date)}</span>
                  <span>
                    {markItem.available_from && markItem.available_until
                      ? `${formatTime(markItem.available_from)} - ${formatTime(markItem.available_until)}`
                      : 'Ganztägig'
                    }
                  </span>
                </div>
                {markItem.note && (
                  <div className="text-gray-500 mt-1">
                    Fahrer-Notiz: {markItem.note}
                  </div>
                )}
              </div>

              {/* Notizfeld */}
              <div className="space-y-2">
                <Label htmlFor="markNote">Notiz (optional)</Label>
                <Textarea
                  id="markNote"
                  placeholder="z.B. Keine passende Tour verfügbar, Kein Bedarf..."
                  value={markNote}
                  onChange={(e) => setMarkNote(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowMarkModal(false)}
              disabled={isMarking}
            >
              Abbrechen
            </Button>
            <Button
              onClick={handleMarkSubmit}
              disabled={isMarking}
              className="bg-primary-blue hover:bg-blue-700"
            >
              {isMarking ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Speichern...
                </>
              ) : (
                <>
                  <Tag className="h-4 w-4 mr-2" />
                  Markieren
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
