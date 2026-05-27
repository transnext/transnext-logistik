"use client"

import { useState, useRef, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { EmptyState, FilterEmptyState } from "@/components/ui/empty-state"
import { CurrencyDisplay } from "@/components/ui/currency-display"
import {
  FileText,
  CheckCircle,
  XCircle,
  Trash2,
  MoreVertical,
  Eye,
  Edit,
  CreditCard
} from "lucide-react"
import { cn } from "@/lib/utils"

// Auslage-Interface (identisch mit dem in der Dashboard-Seite)
export interface Auslage {
  id: number
  tourNr: string
  kennzeichen: string
  datum: string
  startort: string
  zielort: string
  belegart: string
  kosten: string
  fahrer: string
  status: string
  erstelltAm: string
  belegUrl?: string
}

interface AuslagenTabProps {
  /** Gefilterte Auslagen-Liste */
  filteredAuslagen: Auslage[]
  /** Ausgewählte Auslagen-IDs für Mehrfachaktionen */
  selectedAuslagenIds: number[]
  /** Aktueller Suchbegriff (für Anzeige) */
  searchTerm: string
  /** Aktueller Filterstatus (für Anzeige) */
  filterStatus: string
  /** Benutzerrolle für rollenbasierte Aktionen */
  userRole?: 'admin' | 'gf' | 'disponent'
  /** @deprecated Manuelle Abrechnung wurde entfernt - nutze Abrechnungsmodul */
  onBillSelected?: () => void
  /** Handler: Ausgewählte Auslagen löschen */
  onDeleteSelected: () => void
  /** Handler: Auswahl aufheben */
  onClearSelection: () => void
  /** Handler: Alle Auslagen auswählen/abwählen */
  onToggleAllSelection: () => void
  /** Handler: Einzelne Auslage auswählen/abwählen */
  onToggleAuslageSelection: (id: number) => void
  /** Handler: Auslagen-Status aktualisieren */
  onUpdateStatus: (id: number, status: string) => void
  /** Handler: Auslage bearbeiten */
  onEditAuslage?: (auslage: Auslage) => void
  /** Handler: Auslage löschen */
  onDeleteAuslage?: (id: number) => void
  /** Handler: Auslage als überwiesen/erstattet markieren (nur Admin/GF) */
  onMarkAsReimbursed?: (id: number) => void
  /** Handler: Beleg anzeigen */
  onShowBeleg: (beleg: { tourNr: string; datum: string; typ: "auslagennachweis"; belegUrl?: string }) => void
  /** Hilfsfunktion: Datum formatieren */
  formatDate: (dateString: string) => string
  /** Hilfsfunktion: Währung formatieren (Kompatibilität) */
  formatCurrency: (amount: number | string) => string
  /** Hilfsfunktion: Status-Badge rendern */
  getStatusBadge: (status: string) => React.ReactNode
}

/**
 * RowActionMenu - Einfaches 3-Punkte-Menü ohne externe Abhängigkeiten
 *
 * WICHTIG für Bearbeiten:
 * - Disponenten dürfen NUR den Status ändern (keine operativen Felder wie Kosten)
 * - Da Statusänderungen bereits über die Genehmigen/Ablehnen-Buttons möglich sind,
 *   wird der Bearbeiten-Menüpunkt für Disponenten NICHT angezeigt.
 * - Admin/GF dürfen alle Felder bearbeiten, daher sehen sie den Menüpunkt.
 */
function RowActionMenu({
  auslage,
  userRole,
  onEdit,
  onShowBeleg,
  onMarkAsReimbursed,
  onDelete
}: {
  auslage: Auslage
  userRole: 'admin' | 'gf' | 'disponent'
  onEdit?: () => void
  onShowBeleg: () => void
  onMarkAsReimbursed?: () => void
  onDelete?: () => void
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
  const isLocked = auslage.status === 'paid' || auslage.status === 'billed'
  const isPaid = auslage.status === 'paid'
  const isRejected = auslage.status === 'rejected'
  // Überweisen nur wenn genehmigt (approved) und noch nicht bezahlt/abgelehnt
  const canMarkAsReimbursed = isAdmin && auslage.status === 'approved' && !isLocked

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
          {onEdit && isAdmin && (
            <button
              onClick={() => { onEdit(); setIsOpen(false) }}
              className={cn(
                "flex items-center gap-2 w-full px-3 py-2 text-sm text-left",
                isLocked
                  ? "text-gray-400 cursor-not-allowed"
                  : "text-gray-700 hover:bg-gray-50"
              )}
              disabled={isLocked}
              title={isLocked ? "Gesperrt - bereits abgerechnet/bezahlt" : "Auslage bearbeiten"}
            >
              <Edit className="h-4 w-4 text-gray-400" />
              Bearbeiten
            </button>
          )}

          {/* Als überwiesen markieren - nur Admin/GF, nur wenn genehmigt */}
          {onMarkAsReimbursed && canMarkAsReimbursed && (
            <button
              onClick={() => { onMarkAsReimbursed(); setIsOpen(false) }}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-emerald-600 hover:bg-emerald-50 text-left"
            >
              <CreditCard className="h-4 w-4" />
              Als überwiesen markieren
            </button>
          )}

          {/* Löschen - nur Admin/GF */}
          {isAdmin && onDelete && (
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
 * AuslagenTab - Tabelle für Auslagen im Admin-Dashboard
 *
 * Zeigt alle Auslagennachweise mit:
 * - Mehrfachauswahl für Abrechnungen (im Header, nur Admin/GF)
 * - Genehmigen/Ablehnen direkt sichtbar in jeder Zeile
 * - 3-Punkte-Menü für weitere Aktionen (Beleg, Bearbeiten, Löschen)
 * - Rollenbasierte Sichtbarkeit (Admin/GF vs. Disponent)
 */
export function AuslagenTab({
  filteredAuslagen,
  selectedAuslagenIds,
  searchTerm,
  filterStatus,
  userRole = 'admin',
  // onBillSelected removed - manuelles Abrechnen nicht mehr möglich
  onDeleteSelected,
  onClearSelection,
  onToggleAllSelection,
  onToggleAuslageSelection,
  onUpdateStatus,
  onEditAuslage,
  onDeleteAuslage,
  onMarkAsReimbursed,
  onShowBeleg,
  formatDate,
  formatCurrency,
  getStatusBadge
}: AuslagenTabProps) {
  const isAdmin = userRole === 'admin' || userRole === 'gf'

  return (
    <Card className="border-gray-100 shadow-sm">
      <CardHeader className="border-b border-gray-50 bg-gray-50/30">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl font-semibold text-gray-900">Auslagen-Verwaltung</CardTitle>
            <CardDescription className="text-gray-500">
              Alle Auslagennachweise der Fahrer
            </CardDescription>
          </div>
          {/* Batch-Aktionen - nur wenn Auswahl vorhanden UND Admin/GF */}
          {selectedAuslagenIds.length > 0 && isAdmin && (
            <div className="flex gap-2">
              <Button
                onClick={onDeleteSelected}
                variant="outline"
                size="sm"
                className="text-red-600 border-red-200 hover:bg-red-50"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Löschen
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
          {selectedAuslagenIds.length > 0 && !isAdmin && (
            <Button
              onClick={onClearSelection}
              variant="outline"
              size="sm"
              className="border-gray-200"
            >
              Auswahl aufheben ({selectedAuslagenIds.length})
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {filteredAuslagen.length === 0 ? (
          <div className="p-6">
            {searchTerm || filterStatus !== "all" ? (
              <FilterEmptyState entityName="Auslagen" />
            ) : (
              <EmptyState
                title="Keine Auslagen vorhanden"
                description="Es wurden noch keine Auslagennachweise eingereicht."
                icon="euro"
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
                      checked={selectedAuslagenIds.length === filteredAuslagen.length && filteredAuslagen.length > 0}
                      onChange={onToggleAllSelection}
                      className="rounded border-gray-300 cursor-pointer"
                    />
                  </TableHead>
                  <TableHead className="font-medium text-gray-600">Tour-Nr.</TableHead>
                  <TableHead className="font-medium text-gray-600">Fahrer</TableHead>
                  <TableHead className="font-medium text-gray-600">Datum</TableHead>
                  <TableHead className="font-medium text-gray-600">Kennzeichen</TableHead>
                  <TableHead className="font-medium text-gray-600">Strecke</TableHead>
                  <TableHead className="font-medium text-gray-600">Belegart</TableHead>
                  <TableHead className="font-medium text-gray-600 text-right">Kosten</TableHead>
                  <TableHead className="font-medium text-gray-600">Status</TableHead>
                  <TableHead className="font-medium text-gray-600 text-right">Aktionen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAuslagen.map((auslage) => {
                  const canApprove = auslage.status !== 'approved' && auslage.status !== 'paid'
                  const canReject = auslage.status !== 'rejected' && auslage.status !== 'paid'

                  return (
                    <TableRow key={auslage.id} className="hover:bg-gray-50/50 group">
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={selectedAuslagenIds.includes(auslage.id)}
                          onChange={() => onToggleAuslageSelection(auslage.id)}
                          className="rounded border-gray-300 cursor-pointer"
                        />
                      </TableCell>
                      <TableCell className="font-medium text-gray-900">{auslage.tourNr}</TableCell>
                      <TableCell className="text-gray-700">{auslage.fahrer}</TableCell>
                      <TableCell className="text-gray-600">{formatDate(auslage.datum)}</TableCell>
                      <TableCell className="text-gray-700 font-mono text-sm">{auslage.kennzeichen}</TableCell>
                      <TableCell className="text-sm text-gray-600">
                        <span className="truncate max-w-[100px] inline-block">
                          {auslage.startort}
                        </span>
                        <span className="text-gray-400 mx-1">→</span>
                        <span className="truncate max-w-[100px] inline-block">
                          {auslage.zielort}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-700 capitalize px-2 py-0.5 bg-gray-100 rounded">
                          {auslage.belegart}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <CurrencyDisplay
                          amount={parseFloat(auslage.kosten)}
                          bold
                          size="sm"
                        />
                      </TableCell>
                      <TableCell>{getStatusBadge(auslage.status)}</TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          {/* Genehmigen - direkt sichtbar */}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onUpdateStatus(auslage.id, "approved")}
                            className={cn(
                              "h-8 px-2 text-xs font-medium transition-colors",
                              canApprove
                                ? "text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
                                : "text-gray-300 cursor-not-allowed"
                            )}
                            disabled={!canApprove}
                            title="Genehmigen"
                            aria-label="Auslage genehmigen"
                          >
                            <CheckCircle className="h-4 w-4 sm:mr-1" />
                            <span className="hidden sm:inline">Genehmigen</span>
                          </Button>

                          {/* Ablehnen - direkt sichtbar */}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onUpdateStatus(auslage.id, "rejected")}
                            className={cn(
                              "h-8 px-2 text-xs font-medium transition-colors",
                              canReject
                                ? "text-red-500 hover:bg-red-50 hover:text-red-600"
                                : "text-gray-300 cursor-not-allowed"
                            )}
                            disabled={!canReject}
                            title="Ablehnen"
                            aria-label="Auslage ablehnen"
                          >
                            <XCircle className="h-4 w-4 sm:mr-1" />
                            <span className="hidden sm:inline">Ablehnen</span>
                          </Button>

                          {/* 3-Punkte-Menü */}
                          <RowActionMenu
                            auslage={auslage}
                            userRole={userRole}
                            onEdit={onEditAuslage ? () => onEditAuslage(auslage) : undefined}
                            onShowBeleg={() => onShowBeleg({
                              tourNr: auslage.tourNr,
                              datum: auslage.datum,
                              typ: "auslagennachweis",
                              belegUrl: auslage.belegUrl
                            })}
                            onMarkAsReimbursed={onMarkAsReimbursed ? () => onMarkAsReimbursed(auslage.id) : undefined}
                            onDelete={onDeleteAuslage ? () => onDeleteAuslage(auslage.id) : undefined}
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
