"use client"

import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import {
  Upload,
  CheckCircle,
  AlertTriangle,
  Clock,
  ExternalLink,
  Calendar,
  TrendingUp,
  Percent
} from "lucide-react"

// ============================================================
// TYPES
// ============================================================

export interface UploadPuenktlichkeitItem {
  id: number
  tour_nr: string | null
  datum: string
  created_at: string | null
  status: string
  isPuenktlich: boolean
  delayDays: number
  delayHours: number
}

export interface UploadPuenktlichkeitKPIs {
  gesamtUploads: number
  puenktlicheUploads: number
  verspaeteteUploads: number
  puenktlichkeitsQuote: number
  durchschnittlicheVerspaetungStunden: number
  maximaleVerspaetungStunden: number
}

interface FahrerakteUploadPuenktlichkeitProps {
  items: UploadPuenktlichkeitItem[]
  zeitraumLabel: string
  isLoading?: boolean
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
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

function formatDeadline(tourDatum: string): string {
  return `${formatDate(tourDatum)} 23:59`
}

function formatVerspaetung(delayDays: number, delayHours: number): string {
  if (delayDays === 0 && delayHours === 0) return '-'

  if (delayDays >= 1) {
    return `${delayDays} Tag${delayDays > 1 ? 'e' : ''}`
  }

  return `${delayHours} Std.`
}

function formatDurchschnitt(stunden: number): string {
  if (stunden === 0) return '-'
  if (stunden < 24) {
    return `${Math.round(stunden)} Std.`
  }
  const tage = stunden / 24
  return `${tage.toFixed(1)} Tage`
}

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
// KPI CALCULATION
// ============================================================

function calculateKPIs(items: UploadPuenktlichkeitItem[]): UploadPuenktlichkeitKPIs {
  const gesamtUploads = items.length
  const puenktlicheUploads = items.filter(i => i.isPuenktlich).length
  const verspaeteteUploads = items.filter(i => !i.isPuenktlich).length

  const puenktlichkeitsQuote = gesamtUploads > 0
    ? Math.round((puenktlicheUploads / gesamtUploads) * 100)
    : 100

  // Berechne Durchschnitt und Maximum nur aus verspäteten
  const verspaetete = items.filter(i => !i.isPuenktlich)

  let durchschnittlicheVerspaetungStunden = 0
  let maximaleVerspaetungStunden = 0

  if (verspaetete.length > 0) {
    const totalStunden = verspaetete.reduce((sum, i) => sum + i.delayHours, 0)
    durchschnittlicheVerspaetungStunden = totalStunden / verspaetete.length
    maximaleVerspaetungStunden = Math.max(...verspaetete.map(i => i.delayHours))
  }

  return {
    gesamtUploads,
    puenktlicheUploads,
    verspaeteteUploads,
    puenktlichkeitsQuote,
    durchschnittlicheVerspaetungStunden,
    maximaleVerspaetungStunden
  }
}

// ============================================================
// COMPONENT
// ============================================================

export function FahrerakteUploadPuenktlichkeit({
  items,
  zeitraumLabel,
  isLoading = false
}: FahrerakteUploadPuenktlichkeitProps) {
  if (isLoading) {
    return (
      <Card className="border-gray-100">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Upload className="h-5 w-5 text-gray-400" />
            Upload-Pünktlichkeit
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

  // Keine Uploads im Zeitraum
  if (items.length === 0) {
    return (
      <Card className="border-gray-100">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Upload className="h-5 w-5 text-gray-400" />
            Upload-Pünktlichkeit
          </CardTitle>
          <CardDescription>
            Zeitraum: {zeitraumLabel}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EmptyState
            title="Keine Uploads im Zeitraum"
            description={`Für den Zeitraum "${zeitraumLabel}" wurden keine Uploads gefunden.`}
            icon={<Calendar className="h-12 w-12 text-gray-400" />}
            iconSize="sm"
          />
        </CardContent>
      </Card>
    )
  }

  const kpis = calculateKPIs(items)
  const verspaeteteItems = items.filter(i => !i.isPuenktlich)
    .sort((a, b) => new Date(b.datum).getTime() - new Date(a.datum).getTime())

  return (
    <Card className="border-gray-100">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Upload className="h-5 w-5 text-gray-400" />
              Upload-Pünktlichkeit
            </CardTitle>
            <CardDescription>
              Zeitraum: {zeitraumLabel}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            {kpis.puenktlichkeitsQuote >= 90 ? (
              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 border">
                <CheckCircle className="h-3 w-3 mr-1" />
                {kpis.puenktlichkeitsQuote}% pünktlich
              </Badge>
            ) : kpis.puenktlichkeitsQuote >= 70 ? (
              <Badge className="bg-amber-50 text-amber-700 border-amber-200 border">
                <AlertTriangle className="h-3 w-3 mr-1" />
                {kpis.puenktlichkeitsQuote}% pünktlich
              </Badge>
            ) : (
              <Badge className="bg-red-50 text-red-700 border-red-200 border">
                <AlertTriangle className="h-3 w-3 mr-1" />
                {kpis.puenktlichkeitsQuote}% pünktlich
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* KPI-Zeile */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Gesamt Uploads */}
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Upload className="h-4 w-4 text-gray-500" />
              <span className="text-xs text-gray-500">Gesamt</span>
            </div>
            <p className="text-xl font-bold text-gray-900">{kpis.gesamtUploads}</p>
          </div>

          {/* Pünktliche Uploads */}
          <div className="p-3 bg-emerald-50 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="h-4 w-4 text-emerald-600" />
              <span className="text-xs text-emerald-600">Pünktlich</span>
            </div>
            <p className="text-xl font-bold text-emerald-700">{kpis.puenktlicheUploads}</p>
          </div>

          {/* Verspätete Uploads */}
          <div className={`p-3 rounded-lg ${kpis.verspaeteteUploads > 0 ? 'bg-amber-50' : 'bg-gray-50'}`}>
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className={`h-4 w-4 ${kpis.verspaeteteUploads > 0 ? 'text-amber-600' : 'text-gray-500'}`} />
              <span className={`text-xs ${kpis.verspaeteteUploads > 0 ? 'text-amber-600' : 'text-gray-500'}`}>Verspätet</span>
            </div>
            <p className={`text-xl font-bold ${kpis.verspaeteteUploads > 0 ? 'text-amber-700' : 'text-gray-900'}`}>
              {kpis.verspaeteteUploads}
            </p>
          </div>

          {/* Pünktlichkeitsquote */}
          <div className={`p-3 rounded-lg ${kpis.puenktlichkeitsQuote >= 90 ? 'bg-emerald-50' : kpis.puenktlichkeitsQuote >= 70 ? 'bg-amber-50' : 'bg-red-50'}`}>
            <div className="flex items-center gap-2 mb-1">
              <Percent className={`h-4 w-4 ${kpis.puenktlichkeitsQuote >= 90 ? 'text-emerald-600' : kpis.puenktlichkeitsQuote >= 70 ? 'text-amber-600' : 'text-red-600'}`} />
              <span className={`text-xs ${kpis.puenktlichkeitsQuote >= 90 ? 'text-emerald-600' : kpis.puenktlichkeitsQuote >= 70 ? 'text-amber-600' : 'text-red-600'}`}>Quote</span>
            </div>
            <p className={`text-xl font-bold ${kpis.puenktlichkeitsQuote >= 90 ? 'text-emerald-700' : kpis.puenktlichkeitsQuote >= 70 ? 'text-amber-700' : 'text-red-700'}`}>
              {kpis.puenktlichkeitsQuote}%
            </p>
          </div>

          {/* Durchschnittliche Verspätung */}
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-gray-500" />
              <span className="text-xs text-gray-500">Ø Verspätung</span>
            </div>
            <p className="text-xl font-bold text-gray-900">
              {formatDurchschnitt(kpis.durchschnittlicheVerspaetungStunden)}
            </p>
          </div>

          {/* Maximale Verspätung */}
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-gray-500" />
              <span className="text-xs text-gray-500">Max. Verspätung</span>
            </div>
            <p className="text-xl font-bold text-gray-900">
              {formatDurchschnitt(kpis.maximaleVerspaetungStunden)}
            </p>
          </div>
        </div>

        {/* Liste verspäteter Uploads */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">
            Verspätete Uploads ({verspaeteteItems.length})
          </h4>

          {verspaeteteItems.length === 0 ? (
            <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-lg text-center">
              <CheckCircle className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
              <p className="text-sm text-emerald-700 font-medium">Keine verspäteten Uploads</p>
              <p className="text-xs text-emerald-600 mt-1">
                Alle Uploads im Zeitraum "{zeitraumLabel}" waren pünktlich.
              </p>
            </div>
          ) : (
            <>
              {/* Desktop: Tabelle */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50/50 hover:bg-gray-50/50">
                      <TableHead className="font-medium text-gray-600">Tour-Nr.</TableHead>
                      <TableHead className="font-medium text-gray-600">Tourdatum</TableHead>
                      <TableHead className="font-medium text-gray-600">Upload</TableHead>
                      <TableHead className="font-medium text-gray-600">Frist</TableHead>
                      <TableHead className="font-medium text-gray-600">Verspätung</TableHead>
                      <TableHead className="font-medium text-gray-600">Status</TableHead>
                      <TableHead className="font-medium text-gray-600">Aktion</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {verspaeteteItems.map((item) => {
                      const statusConfig = getStatusConfig(item.status)

                      return (
                        <TableRow key={item.id} className="hover:bg-gray-50/50">
                          <TableCell className="font-mono text-sm font-medium">
                            {item.tour_nr || `#${item.id}`}
                          </TableCell>
                          <TableCell className="text-sm">
                            {formatDate(item.datum)}
                          </TableCell>
                          <TableCell className="text-sm text-gray-600">
                            {formatDateTime(item.created_at)}
                          </TableCell>
                          <TableCell className="text-sm text-gray-500">
                            {formatDeadline(item.datum)}
                          </TableCell>
                          <TableCell>
                            <Badge className="bg-amber-50 text-amber-700 border-amber-200 border text-xs">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              {formatVerspaetung(item.delayDays, item.delayHours)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={`border text-xs ${statusConfig.className}`}>
                              {statusConfig.label}
                            </Badge>
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
                {verspaeteteItems.map((item) => {
                  const statusConfig = getStatusConfig(item.status)

                  return (
                    <div
                      key={item.id}
                      className="p-4 border border-amber-100 rounded-lg bg-amber-50/30"
                    >
                      {/* Kopfzeile */}
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-mono text-sm font-semibold text-gray-900">
                          {item.tour_nr || `#${item.id}`}
                        </span>
                        <Badge className="bg-amber-50 text-amber-700 border-amber-200 border text-xs">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          {formatVerspaetung(item.delayDays, item.delayHours)}
                        </Badge>
                      </div>

                      {/* Details */}
                      <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                        <div>
                          <span className="text-gray-500">Tourdatum:</span>
                          <span className="ml-1 text-gray-900">{formatDate(item.datum)}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Frist:</span>
                          <span className="ml-1 text-gray-600 text-xs">23:59</span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-gray-500">Upload:</span>
                          <span className="ml-1 text-gray-900 text-xs">
                            {formatDateTime(item.created_at)}
                          </span>
                        </div>
                      </div>

                      {/* Status + Aktion */}
                      <div className="flex items-center justify-between pt-3 border-t border-amber-100">
                        <Badge className={`border text-xs ${statusConfig.className}`}>
                          {statusConfig.label}
                        </Badge>
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
        </div>
      </CardContent>
    </Card>
  )
}
