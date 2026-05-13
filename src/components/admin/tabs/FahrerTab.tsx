"use client"

import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { StatusBadge } from "@/components/ui/status-badge"
import { EmptyState } from "@/components/ui/empty-state"
import { Edit, UserX, CheckCircle, FileText, Archive, ArchiveRestore } from "lucide-react"

// Fahrer-Interface
export interface FahrerTabFahrer {
  id: number
  vorname: string
  nachname: string
  geburtsdatum: string
  adresse: string
  plz: string
  ort: string
  fuehrerscheinNr: string
  fuehrerscheinDatum: string
  ausstellendeBehoerde: string
  fuehrerscheinklassen: string[]
  ausweisnummer: string
  ausweisAblauf: string
  benutzername: string
  status: string
  erstelltAm: string
  zeitmodell?: string
  festes_gehalt?: number
  archived_at?: string | null
  archive_reason?: string | null
}

interface FahrerTabProps {
  /** Alle Fahrer (ungefiltert) - für Statistiken */
  alleFahrer: FahrerTabFahrer[]
  /** Gefilterte Fahrer-Liste */
  filteredFahrer: FahrerTabFahrer[]
  /** Handler: Fahrer bearbeiten */
  onEditFahrer: (fahrer: FahrerTabFahrer) => void
  /** Handler: Fahrer-Status umschalten (aktivieren/deaktivieren) */
  onToggleStatus: (id: number) => void
  /** Handler: Fahrer archivieren */
  onArchiveFahrer?: (id: number) => void
  /** Handler: Archivierung aufheben */
  onUnarchiveFahrer?: (id: number) => void
  /** Hilfsfunktion: Datum formatieren */
  formatDate: (dateString: string) => string
  /** Ob User Admin/GF ist (für Archiv-Aktionen) */
  isAdmin?: boolean
}

// Zeitmodell-Konfiguration
const ZEITMODELL_CONFIG: Record<string, { label: string; className: string }> = {
  minijob: { label: "Minijob", className: "bg-sky-50 text-sky-700 border-sky-200" },
  werkstudent: { label: "Werkstudent", className: "bg-violet-50 text-violet-700 border-violet-200" },
  teilzeit: { label: "Teilzeit", className: "bg-amber-50 text-amber-700 border-amber-200" },
  vollzeit: { label: "Vollzeit", className: "bg-emerald-50 text-emerald-700 border-emerald-200" }
}

/**
 * FahrerTab - Fahrer-Liste im Admin-Dashboard
 *
 * Zeigt die Fahrer-Übersicht mit:
 * - Tabelle aller Fahrer
 * - Status-Badge (aktiv/inaktiv/archiviert)
 * - Zeitmodell-Badge
 * - Aktionen (Bearbeiten, Aktivieren/Deaktivieren, Archivieren)
 *
 * HINWEIS: Fahrer-Formulare (Erstellen/Bearbeiten) bleiben in dashboard/page.tsx
 */
export function FahrerTab({
  alleFahrer,
  filteredFahrer,
  onEditFahrer,
  onToggleStatus,
  onArchiveFahrer,
  onUnarchiveFahrer,
  formatDate,
  isAdmin = false
}: FahrerTabProps) {
  const aktivCount = alleFahrer.filter(f => f.status === 'aktiv' && !f.archived_at).length
  const inaktivCount = alleFahrer.filter(f => f.status === 'inaktiv' && !f.archived_at).length
  const archivedCount = alleFahrer.filter(f => f.archived_at).length

  return (
    <Card className="border-gray-100 shadow-sm">
      <CardHeader className="border-b border-gray-50 bg-gray-50/30">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl font-semibold text-gray-900">Fahrer-Übersicht</CardTitle>
            <CardDescription className="text-gray-500">
              <span className="text-emerald-600 font-medium">{aktivCount} aktiv</span>
              {inaktivCount > 0 && (
                <span className="text-gray-400 ml-2">• {inaktivCount} inaktiv</span>
              )}
              {archivedCount > 0 && (
                <span className="text-orange-500 ml-2">• {archivedCount} archiviert</span>
              )}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {filteredFahrer.length === 0 ? (
          <div className="p-6">
            {alleFahrer.length === 0 ? (
              <EmptyState
                title="Keine Fahrer vorhanden"
                description="Legen Sie den ersten Fahrer an, um zu beginnen."
                icon="users"
              />
            ) : (
              <EmptyState
                title="Keine Fahrer gefunden"
                description="Versuchen Sie andere Filtereinstellungen."
                icon="search"
              />
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50/50 hover:bg-gray-50/50">
                  <TableHead className="font-medium text-gray-600">Name</TableHead>
                  <TableHead className="font-medium text-gray-600">Benutzername</TableHead>
                  <TableHead className="font-medium text-gray-600">Geburtsdatum</TableHead>
                  <TableHead className="font-medium text-gray-600">Adresse</TableHead>
                  <TableHead className="font-medium text-gray-600">Führerschein</TableHead>
                  <TableHead className="font-medium text-gray-600">Klassen</TableHead>
                  <TableHead className="font-medium text-gray-600">Status</TableHead>
                  <TableHead className="font-medium text-gray-600">Zeitmodell</TableHead>
                  <TableHead className="font-medium text-gray-600">Erstellt</TableHead>
                  <TableHead className="font-medium text-gray-600">Aktionen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFahrer.map((f) => {
                  const zeitmodellConfig = ZEITMODELL_CONFIG[f.zeitmodell || 'minijob'] || ZEITMODELL_CONFIG.minijob
                  const isArchived = !!f.archived_at
                  const isInactive = f.status === 'inaktiv'

                  return (
                    <TableRow
                      key={f.id}
                      className={
                        isArchived
                          ? 'bg-orange-50/30 opacity-70'
                          : isInactive
                            ? 'bg-gray-50/50 opacity-60'
                            : 'hover:bg-gray-50/50'
                      }
                    >
                      <TableCell className="font-medium text-gray-900">
                        {f.vorname} {f.nachname}
                      </TableCell>
                      <TableCell className="text-gray-600 font-mono text-sm">{f.benutzername}</TableCell>
                      <TableCell className="text-gray-600">{formatDate(f.geburtsdatum)}</TableCell>
                      <TableCell className="text-sm text-gray-600">
                        <div>{f.adresse}</div>
                        <div className="text-gray-400">{f.plz} {f.ort}</div>
                      </TableCell>
                      <TableCell className="text-sm">
                        <div className="text-gray-900">{f.fuehrerscheinNr}</div>
                        <div className="text-gray-400 text-xs">seit {formatDate(f.fuehrerscheinDatum)}</div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
                          {f.fuehrerscheinklassen.join(', ')}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {isArchived ? (
                            <Badge className="bg-orange-100 text-orange-700 border-orange-200 border">
                              <Archive className="h-3 w-3 mr-1" />
                              Archiviert
                            </Badge>
                          ) : (
                            <StatusBadge
                              status={f.status === 'aktiv' ? 'success' : 'neutral'}
                              label={f.status === 'aktiv' ? 'Aktiv' : 'Inaktiv'}
                              showIcon={false}
                            />
                          )}
                          {isArchived && f.archive_reason && (
                            <span className="text-xs text-orange-600 truncate max-w-[120px]" title={f.archive_reason}>
                              {f.archive_reason}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={`border ${zeitmodellConfig.className}`}>
                          {zeitmodellConfig.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {formatDate(f.erstelltAm)}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          <Link href={`/admin/fahrer/${f.id}`}>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-primary-blue hover:bg-blue-50 h-8 px-2"
                              title="Fahrerakte öffnen"
                            >
                              <FileText className="h-4 w-4 mr-1" />
                              <span className="hidden sm:inline">Akte</span>
                            </Button>
                          </Link>
                          {!isArchived && (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => onEditFahrer(f)}
                                className="text-blue-600 hover:bg-blue-50 h-8 px-2"
                              >
                                <Edit className="h-4 w-4 mr-1" />
                                <span className="hidden sm:inline">Bearbeiten</span>
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => onToggleStatus(f.id)}
                                className={f.status === 'aktiv'
                                  ? "text-orange-600 hover:bg-orange-50 h-8 px-2"
                                  : "text-emerald-600 hover:bg-emerald-50 h-8 px-2"}
                              >
                                {f.status === 'aktiv' ? (
                                  <>
                                    <UserX className="h-4 w-4 mr-1" />
                                    <span className="hidden sm:inline">Deaktivieren</span>
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle className="h-4 w-4 mr-1" />
                                    <span className="hidden sm:inline">Aktivieren</span>
                                  </>
                                )}
                              </Button>
                            </>
                          )}
                          {/* Archiv-Aktionen (nur für Admin/GF) */}
                          {isAdmin && (
                            isArchived ? (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => onUnarchiveFahrer?.(f.id)}
                                className="text-blue-600 hover:bg-blue-50 h-8 px-2"
                                title="Archivierung aufheben"
                              >
                                <ArchiveRestore className="h-4 w-4 mr-1" />
                                <span className="hidden sm:inline">Entarchivieren</span>
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => onArchiveFahrer?.(f.id)}
                                className="text-orange-600 hover:bg-orange-50 h-8 px-2"
                                title="Fahrer archivieren (dauerhaft ausgeschieden)"
                              >
                                <Archive className="h-4 w-4 mr-1" />
                                <span className="hidden sm:inline">Archivieren</span>
                              </Button>
                            )
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
