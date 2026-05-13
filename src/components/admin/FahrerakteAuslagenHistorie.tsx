"use client"

import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import {
  Receipt,
  ExternalLink,
  Calendar,
  CheckCircle,
  Clock,
  XCircle,
  AlertTriangle,
  Banknote
} from "lucide-react"

// ============================================================
// TYPES
// ============================================================

export interface AuslageHistorieItem {
  id: number
  datum: string
  tour_nr: string | null
  kennzeichen: string | null
  belegart: string | null
  status: string
  kosten: number | null // null für Dispo
  driver_reimbursement_status: string | null
  reimbursed_at: string | null
  beleg_url: string | null
  notiz: string | null
}

interface FahrerakteAuslagenHistorieProps {
  auslagen: AuslageHistorieItem[]
  zeitraumLabel: string
  isAdmin: boolean
  isLoading?: boolean
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

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
 * Formatiert Betrag als Währung
 */
function formatCurrency(value: number | null): string {
  if (value === null || value === undefined) return '-'
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2
  }).format(value)
}

/**
 * Status-Konfiguration für Auslagen
 */
const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  pending: { label: 'Offen', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  eingereicht: { label: 'Eingereicht', className: 'bg-blue-50 text-blue-700 border-blue-200' },
  in_pruefung: { label: 'In Prüfung', className: 'bg-blue-50 text-blue-700 border-blue-200' },
  approved: { label: 'Genehmigt', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  bestaetigt: { label: 'Bestätigt', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  paid: { label: 'Erstattet', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  rejected: { label: 'Abgelehnt', className: 'bg-red-50 text-red-700 border-red-200' },
  abgelehnt: { label: 'Abgelehnt', className: 'bg-red-50 text-red-700 border-red-200' }
}

function getStatusConfig(status: string): { label: string; className: string } {
  return STATUS_CONFIG[status] || { label: status, className: 'bg-gray-50 text-gray-700 border-gray-200' }
}

/**
 * Erstattungsstatus-Konfiguration
 */
const ERSTATTUNG_CONFIG: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
  nicht_erstattet: {
    label: 'Nicht erstattet',
    className: 'bg-gray-50 text-gray-600 border-gray-200',
    icon: <Clock className="h-3 w-3" />
  },
  ausstehend: {
    label: 'Ausstehend',
    className: 'bg-amber-50 text-amber-700 border-amber-200',
    icon: <Clock className="h-3 w-3" />
  },
  genehmigt: {
    label: 'Genehmigt',
    className: 'bg-blue-50 text-blue-700 border-blue-200',
    icon: <CheckCircle className="h-3 w-3" />
  },
  erstattet: {
    label: 'Erstattet',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: <Banknote className="h-3 w-3" />
  },
  ueberwiesen: {
    label: 'Überwiesen',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: <Banknote className="h-3 w-3" />
  },
  abgelehnt: {
    label: 'Abgelehnt',
    className: 'bg-red-50 text-red-700 border-red-200',
    icon: <XCircle className="h-3 w-3" />
  }
}

function getErstattungConfig(status: string | null, reimbursedAt: string | null): { label: string; className: string; icon: React.ReactNode } {
  // Wenn erstattet_at vorhanden, dann erstattet
  if (reimbursedAt) {
    return ERSTATTUNG_CONFIG.erstattet
  }

  // Sonst nach Status
  if (status && ERSTATTUNG_CONFIG[status]) {
    return ERSTATTUNG_CONFIG[status]
  }

  return ERSTATTUNG_CONFIG.nicht_erstattet
}

/**
 * Belegart formatieren
 */
function formatBelegart(belegart: string | null): string {
  if (!belegart) return '-'

  const belegartMap: Record<string, string> = {
    'tankbeleg': 'Tankbeleg',
    'parkgebuehr': 'Parkgebühr',
    'maut': 'Maut',
    'sonstiges': 'Sonstiges',
    'verpflegung': 'Verpflegung',
    'uebernachtung': 'Übernachtung',
    'werkstatt': 'Werkstatt',
    'reinigung': 'Reinigung'
  }

  return belegartMap[belegart.toLowerCase()] || belegart
}

// ============================================================
// COMPONENT
// ============================================================

export function FahrerakteAuslagenHistorie({
  auslagen,
  zeitraumLabel,
  isAdmin,
  isLoading = false
}: FahrerakteAuslagenHistorieProps) {
  if (isLoading) {
    return (
      <Card className="border-gray-100">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Receipt className="h-5 w-5 text-gray-400" />
            Auslagenhistorie
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-blue" />
            <span className="ml-2 text-gray-500">Lade Auslagen...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Zähle nach Status
  const genehmigt = auslagen.filter(a => a.status === 'approved' || a.status === 'bestaetigt' || a.status === 'paid').length
  const offen = auslagen.filter(a => a.status === 'pending' || a.status === 'eingereicht' || a.status === 'in_pruefung').length
  const abgelehnt = auslagen.filter(a => a.status === 'rejected' || a.status === 'abgelehnt').length

  // Gesamtbetrag nur für Admin
  const gesamtBetrag = isAdmin
    ? auslagen.reduce((sum, a) => sum + (a.kosten || 0), 0)
    : null

  return (
    <Card className="border-gray-100">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Receipt className="h-5 w-5 text-gray-400" />
              Auslagenhistorie
            </CardTitle>
            <CardDescription>
              {auslagen.length} Auslage{auslagen.length !== 1 ? 'n' : ''} im Zeitraum {zeitraumLabel}
              {isAdmin && gesamtBetrag !== null && gesamtBetrag > 0 && (
                <span className="ml-2 font-medium text-gray-700">
                  (Gesamt: {formatCurrency(gesamtBetrag)})
                </span>
              )}
            </CardDescription>
          </div>
          {auslagen.length > 0 && (
            <div className="flex gap-2 text-sm flex-wrap">
              {genehmigt > 0 && (
                <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 border">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  {genehmigt} genehmigt
                </Badge>
              )}
              {offen > 0 && (
                <Badge className="bg-amber-50 text-amber-700 border-amber-200 border">
                  <Clock className="h-3 w-3 mr-1" />
                  {offen} offen
                </Badge>
              )}
              {abgelehnt > 0 && (
                <Badge className="bg-red-50 text-red-700 border-red-200 border">
                  <XCircle className="h-3 w-3 mr-1" />
                  {abgelehnt} abgelehnt
                </Badge>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {auslagen.length === 0 ? (
          <EmptyState
            title="Keine Auslagen im Zeitraum"
            description={`Für den Zeitraum "${zeitraumLabel}" wurden keine Auslagen gefunden.`}
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
                    <TableHead className="font-medium text-gray-600">Datum</TableHead>
                    <TableHead className="font-medium text-gray-600">Tour-Nr.</TableHead>
                    <TableHead className="font-medium text-gray-600">Kennzeichen</TableHead>
                    <TableHead className="font-medium text-gray-600">Belegart</TableHead>
                    {isAdmin && (
                      <TableHead className="font-medium text-gray-600 text-right">Betrag</TableHead>
                    )}
                    <TableHead className="font-medium text-gray-600">Status</TableHead>
                    <TableHead className="font-medium text-gray-600">Erstattung</TableHead>
                    <TableHead className="font-medium text-gray-600">Aktion</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auslagen.map((auslage) => {
                    const statusConfig = getStatusConfig(auslage.status)
                    const erstattungConfig = getErstattungConfig(
                      auslage.driver_reimbursement_status,
                      auslage.reimbursed_at
                    )
                    const hatBeleg = !!auslage.beleg_url

                    return (
                      <TableRow key={auslage.id} className="hover:bg-gray-50/50">
                        <TableCell className="text-sm">
                          {formatDate(auslage.datum)}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {auslage.tour_nr || '-'}
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {auslage.kennzeichen || '-'}
                        </TableCell>
                        <TableCell className="text-sm">
                          {formatBelegart(auslage.belegart)}
                        </TableCell>
                        {isAdmin && (
                          <TableCell className="text-sm text-right font-mono font-medium">
                            {formatCurrency(auslage.kosten)}
                          </TableCell>
                        )}
                        <TableCell>
                          <Badge className={`border text-xs ${statusConfig.className}`}>
                            {statusConfig.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={`border text-xs ${erstattungConfig.className}`}>
                            {erstattungConfig.icon}
                            <span className="ml-1">{erstattungConfig.label}</span>
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {hatBeleg ? (
                              <a href={auslage.beleg_url!} target="_blank" rel="noopener noreferrer">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-primary-blue hover:bg-blue-50 h-7 px-2"
                                >
                                  <ExternalLink className="h-3 w-3 mr-1" />
                                  Beleg
                                </Button>
                              </a>
                            ) : (
                              <span className="text-xs text-gray-400 flex items-center gap-1">
                                <AlertTriangle className="h-3 w-3" />
                                Kein Beleg
                              </span>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Mobile: Karten */}
            <div className="md:hidden space-y-3">
              {auslagen.map((auslage) => {
                const statusConfig = getStatusConfig(auslage.status)
                const erstattungConfig = getErstattungConfig(
                  auslage.driver_reimbursement_status,
                  auslage.reimbursed_at
                )
                const hatBeleg = !!auslage.beleg_url

                return (
                  <div
                    key={auslage.id}
                    className="p-4 border border-gray-100 rounded-lg bg-white"
                  >
                    {/* Kopfzeile: Datum + Status */}
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-gray-900">
                        {formatDate(auslage.datum)}
                      </span>
                      <Badge className={`border text-xs ${statusConfig.className}`}>
                        {statusConfig.label}
                      </Badge>
                    </div>

                    {/* Details */}
                    <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                      <div>
                        <span className="text-gray-500">Tour:</span>
                        <span className="ml-1 text-gray-900 font-mono">
                          {auslage.tour_nr || '-'}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">Kennz.:</span>
                        <span className="ml-1 text-gray-900">
                          {auslage.kennzeichen || '-'}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">Art:</span>
                        <span className="ml-1 text-gray-900">
                          {formatBelegart(auslage.belegart)}
                        </span>
                      </div>
                      {isAdmin && (
                        <div>
                          <span className="text-gray-500">Betrag:</span>
                          <span className="ml-1 text-gray-900 font-mono font-medium">
                            {formatCurrency(auslage.kosten)}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Erstattung + Beleg */}
                    <div className="flex items-center justify-between pt-3 border-t border-gray-50">
                      <Badge className={`border text-xs ${erstattungConfig.className}`}>
                        {erstattungConfig.icon}
                        <span className="ml-1">{erstattungConfig.label}</span>
                      </Badge>
                      {hatBeleg ? (
                        <a href={auslage.beleg_url!} target="_blank" rel="noopener noreferrer">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-primary-blue hover:bg-blue-50 h-7 px-2"
                          >
                            <ExternalLink className="h-3 w-3 mr-1" />
                            Beleg
                          </Button>
                        </a>
                      ) : (
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          Kein Beleg
                        </span>
                      )}
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
