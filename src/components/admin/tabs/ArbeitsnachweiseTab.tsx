"use client"

import { useState, useRef, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { EmptyState, FilterEmptyState } from "@/components/ui/empty-state"
import {
  FileText,
  CheckCircle,
  XCircle,
  RefreshCw,
  Edit,
  Trash2,
  CreditCard,
  MoreVertical,
  Eye,
  AlertTriangle
} from "lucide-react"
import { cn } from "@/lib/utils"

// Tour-Interface (identisch mit dem in der Dashboard-Seite)
export interface Tour {
  id: number
  tourNr: string
  datum: string
  gefahreneKm: string
  wartezeit: string
  fahrer: string
  status: string
  erstelltAm: string
  belegUrl?: string
  istRuecklaufer?: boolean
  auftraggeber?: string
  zeitmodell?: string
  festes_gehalt?: number
}

interface ArbeitsnachweiseTabProps {
  /** Gefilterte Touren-Liste */
  filteredTouren: Tour[]
  /** Ausgewählte Tour-IDs für Mehrfachaktionen */
  selectedTourIds: number[]
  /** Aktueller Suchbegriff (für Anzeige) */
  searchTerm: string
  /** Aktueller Filterstatus (für Anzeige) */
  filterStatus: string
  /** Benutzerrolle für rollenbasierte Aktionen */
  userRole?: 'admin' | 'gf' | 'disponent'
  /** Handler: Ausgewählte Touren abrechnen */
  onBillSelected: () => void
  /** Handler: Auswahl aufheben */
  onClearSelection: () => void
  /** Handler: Alle Touren auswählen/abwählen */
  onToggleAllSelection: () => void
  /** Handler: Einzelne Tour auswählen/abwählen */
  onToggleTourSelection: (id: number) => void
  /** Handler: Tour-Status aktualisieren */
  onUpdateStatus: (id: number, status: string) => void
  /** Handler: Rückläufer-Status umschalten */
  onToggleRuecklaufer: (id: number, currentValue: boolean) => void
  /** Handler: Tour bearbeiten */
  onEditTour: (tour: Tour) => void
  /** Handler: Tour löschen */
  onDeleteTour: (id: number) => void
  /** Handler: Beleg anzeigen */
  onShowBeleg: (beleg: { tourNr: string; datum: string; typ: "arbeitsnachweis"; belegUrl?: string }) => void
  /** Handler: Korrekturanfrage erstellen (optional) */
  onCreateCorrectionRequest?: (tour: Tour) => void
  /** Hilfsfunktion: Datum formatieren */
  formatDate: (dateString: string) => string
  /** Hilfsfunktion: Status-Badge rendern */
  getStatusBadge: (status: string, istRuecklaufer?: boolean) => React.ReactNode
}

/**
 * RowActionMenu - Einfaches 3-Punkte-Menü ohne externe Abhängigkeiten
 *
 * WICHTIG für Bearbeiten:
 * - Disponenten dürfen NUR den Status ändern (keine operativen Felder wie KM, Wartezeit)
 * - Da Statusänderungen bereits über die Genehmigen/Ablehnen-Buttons möglich sind,
 *   wird der Bearbeiten-Menüpunkt für Disponenten NICHT angezeigt.
 * - Admin/GF dürfen alle Felder bearbeiten, daher sehen sie den Menüpunkt.
 */
function RowActionMenu({
  tour,
  userRole,
  onEdit,
  onShowBeleg,
  onToggleRuecklaufer,
  onCreateCorrectionRequest,
  onDelete
}: {
  tour: Tour
  userRole: 'admin' | 'gf' | 'disponent'
  onEdit: () => void
  onShowBeleg: () => void
  onToggleRuecklaufer: () => void
  onCreateCorrectionRequest?: () => void
  onDelete: () => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Schließe Menü bei Klick außerhalb
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [isOpen])

  const isAdmin = userRole === 'admin' || userRole === 'gf'
  const isLocked = tour.status === 'billed'

  return (
    <div className="relative" ref={menuRef}>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => setIsOpen(!isOpen)}
        className="h-8 w-8 p-0 text-gray-500 hover:text-gray-700 hover:bg-gray-100"
        title="Weitere Aktionen"
      >
        <MoreVertical className="h-4 w-4" />
      </Button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 z-50 w-48 bg-white rounded-lg border border-gray-200 shadow-lg py-1">
          {/* Beleg ansehen */}
          <button
            onClick={() => { onShowBeleg(); setIsOpen(false) }}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left"
          >
            <Eye className="h-4 w-4 text-gray-400" />
            Beleg ansehen
          </button>

          {/* Bearbeiten - NUR für Admin/GF (Disponenten können nur Status ändern, was über Buttons geht) */}
          {isAdmin && (
            <button
              onClick={() => { onEdit(); setIsOpen(false) }}
              className={cn(
                "flex items-center gap-2 w-full px-3 py-2 text-sm text-left",
                isLocked
                  ? "text-gray-400 cursor-not-allowed"
                  : "text-gray-700 hover:bg-gray-50"
              )}
              disabled={isLocked}
              title={isLocked ? "Gesperrt - bereits abgerechnet" : "Tour bearbeiten"}
            >
              <Edit className="h-4 w-4 text-gray-400" />
              Bearbeiten
            </button>
          )}

          {/* Rückläufer markieren - nur Admin/GF */}
          {isAdmin && (
            <button
              onClick={() => { onToggleRuecklaufer(); setIsOpen(false) }}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left"
            >
              <RefreshCw className={cn(
                "h-4 w-4",
                tour.istRuecklaufer ? "text-orange-500" : "text-gray-400"
              )} />
              {tour.istRuecklaufer ? "Rückläufer entfernen" : "Als Rückläufer markieren"}
            </button>
          )}

          {/* Korrekturanfrage erstellen */}
          {onCreateCorrectionRequest && (
            <button
              onClick={() => { onCreateCorrectionRequest(); setIsOpen(false) }}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left"
            >
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Korrekturanfrage
            </button>
          )}

          {/* Trennlinie vor Löschen */}
          {isAdmin && (
            <>
              <div className="my-1 border-t border-gray-100" />
              <button
                onClick={() => { onDelete(); setIsOpen(false) }}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 text-left"
              >
                <Trash2 className="h-4 w-4" />
                Löschen
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * ArbeitsnachweiseTab - Tabelle für Arbeitsnachweise im Admin-Dashboard
 *
 * Zeigt alle Arbeitsnachweise/Touren mit:
 * - Mehrfachauswahl für Abrechnungen (im Header)
 * - Genehmigen/Ablehnen direkt sichtbar in jeder Zeile
 * - 3-Punkte-Menü für weitere Aktionen (Bearbeiten, Beleg, Rückläufer, Löschen)
 * - Rollenbasierte Sichtbarkeit (Admin/GF vs. Disponent)
 */
export function ArbeitsnachweiseTab({
  filteredTouren,
  selectedTourIds,
  searchTerm,
  filterStatus,
  userRole = 'admin',
  onBillSelected,
  onClearSelection,
  onToggleAllSelection,
  onToggleTourSelection,
  onUpdateStatus,
  onToggleRuecklaufer,
  onEditTour,
  onDeleteTour,
  onShowBeleg,
  onCreateCorrectionRequest,
  formatDate,
  getStatusBadge
}: ArbeitsnachweiseTabProps) {
  const isAdmin = userRole === 'admin' || userRole === 'gf'

  return (
    <Card className="border-gray-100 shadow-sm">
      <CardHeader className="border-b border-gray-50 bg-gray-50/30">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl font-semibold text-gray-900">Arbeitsnachweise</CardTitle>
            <CardDescription className="text-gray-500">
              Alle Arbeitsnachweise der Fahrer
            </CardDescription>
          </div>
          {/* Batch-Aktionen - nur wenn Auswahl vorhanden UND Admin/GF */}
          {selectedTourIds.length > 0 && isAdmin && (
            <div className="flex gap-2">
              <Button
                onClick={onBillSelected}
                className="bg-primary-blue hover:bg-blue-700 text-white shadow-sm"
                size="sm"
              >
                <CreditCard className="mr-2 h-4 w-4" />
                {selectedTourIds.length} abrechnen
              </Button>
              <Button
                onClick={onClearSelection}
                variant="outline"
                size="sm"
                className="border-gray-200"
              >
                Auswahl aufheben
              </Button>
            </div>
          )}
          {/* Disponent sieht nur Auswahl aufheben */}
          {selectedTourIds.length > 0 && !isAdmin && (
            <Button
              onClick={onClearSelection}
              variant="outline"
              size="sm"
              className="border-gray-200"
            >
              Auswahl aufheben ({selectedTourIds.length})
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {filteredTouren.length === 0 ? (
          <div className="p-6">
            {searchTerm || filterStatus !== "all" ? (
              <FilterEmptyState entityName="Arbeitsnachweise" />
            ) : (
              <EmptyState
                title="Keine Arbeitsnachweise vorhanden"
                description="Es wurden noch keine Arbeitsnachweise eingereicht."
                icon="document"
              />
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50/50 hover:bg-gray-50/50">
                  <TableHead className="w-12">
                    <input
                      type="checkbox"
                      checked={selectedTourIds.length === filteredTouren.length && filteredTouren.length > 0}
                      onChange={onToggleAllSelection}
                      className="rounded border-gray-300 cursor-pointer"
                    />
                  </TableHead>
                  <TableHead className="font-medium text-gray-600">Tour-Nr.</TableHead>
                  <TableHead className="font-medium text-gray-600">Fahrer</TableHead>
                  <TableHead className="font-medium text-gray-600">Datum</TableHead>
                  <TableHead className="font-medium text-gray-600 text-right">KM</TableHead>
                  <TableHead className="font-medium text-gray-600">Wartezeit</TableHead>
                  <TableHead className="font-medium text-gray-600">Status</TableHead>
                  <TableHead className="font-medium text-gray-600">Erstellt</TableHead>
                  <TableHead className="font-medium text-gray-600 text-right">Aktionen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTouren.map((tour) => {
                  const canApprove = tour.status !== 'approved' && tour.status !== 'billed'
                  const canReject = tour.status !== 'rejected' && tour.status !== 'billed'

                  return (
                    <TableRow key={tour.id} className="hover:bg-gray-50/50 group">
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={selectedTourIds.includes(tour.id)}
                          onChange={() => onToggleTourSelection(tour.id)}
                          className="rounded border-gray-300 cursor-pointer"
                        />
                      </TableCell>
                      <TableCell className="font-medium text-gray-900">{tour.tourNr}</TableCell>
                      <TableCell className="text-gray-700">{tour.fahrer}</TableCell>
                      <TableCell className="text-gray-600">{formatDate(tour.datum)}</TableCell>
                      <TableCell className="text-right font-medium text-gray-900">{tour.gefahreneKm} km</TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {tour.wartezeit === "30-60" && "30-60 Min."}
                        {tour.wartezeit === "60-90" && "60-90 Min."}
                        {tour.wartezeit === "90-120" && "90-120 Min."}
                        {!tour.wartezeit && "—"}
                      </TableCell>
                      <TableCell>{getStatusBadge(tour.status, tour.istRuecklaufer)}</TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {formatDate(tour.erstelltAm)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          {/* Genehmigen - direkt sichtbar */}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onUpdateStatus(tour.id, "approved")}
                            className={cn(
                              "h-8 px-2 text-xs font-medium transition-colors",
                              canApprove
                                ? "text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
                                : "text-gray-300 cursor-not-allowed"
                            )}
                            disabled={!canApprove}
                            title="Genehmigen"
                            aria-label="Arbeitsnachweis genehmigen"
                          >
                            <CheckCircle className="h-4 w-4 sm:mr-1" />
                            <span className="hidden sm:inline">Genehmigen</span>
                          </Button>

                          {/* Ablehnen - direkt sichtbar */}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onUpdateStatus(tour.id, "rejected")}
                            className={cn(
                              "h-8 px-2 text-xs font-medium transition-colors",
                              canReject
                                ? "text-red-500 hover:bg-red-50 hover:text-red-600"
                                : "text-gray-300 cursor-not-allowed"
                            )}
                            disabled={!canReject}
                            title="Ablehnen"
                            aria-label="Arbeitsnachweis ablehnen"
                          >
                            <XCircle className="h-4 w-4 sm:mr-1" />
                            <span className="hidden sm:inline">Ablehnen</span>
                          </Button>

                          {/* 3-Punkte-Menü */}
                          <RowActionMenu
                            tour={tour}
                            userRole={userRole}
                            onEdit={() => onEditTour(tour)}
                            onShowBeleg={() => onShowBeleg({
                              tourNr: tour.tourNr,
                              datum: tour.datum,
                              typ: "arbeitsnachweis",
                              belegUrl: tour.belegUrl
                            })}
                            onToggleRuecklaufer={() => onToggleRuecklaufer(tour.id, tour.istRuecklaufer || false)}
                            onCreateCorrectionRequest={onCreateCorrectionRequest ? () => onCreateCorrectionRequest(tour) : undefined}
                            onDelete={() => onDeleteTour(tour.id)}
                          />
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
