"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { EmptyState } from "@/components/ui/empty-state"
import { CurrencyDisplay } from "@/components/ui/currency-display"
import { StatusBadge } from "@/components/ui/status-badge"
import { ArrowLeft, Wallet, TrendingUp, Clock, Receipt } from "lucide-react"
import { calculateTourVerdienst, MONTHLY_LIMIT, calculateMonthlyPayout, hasNoSalary } from "@/lib/salary-calculator"

// Tour-Interface
export interface AbrechnungTour {
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

// Auslage-Interface
export interface AbrechnungAuslage {
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

// Fahrer-Interface
export interface AbrechnungFahrer {
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
}

interface AbrechnungTabProps {
  /** Alle aktiven Fahrer */
  fahrer: AbrechnungFahrer[]
  /** Gefilterte Touren (für Berechnungen in Fahrer-Karten) */
  touren: AbrechnungTour[]
  /** Gefilterte Auslagen (für Berechnungen in Fahrer-Karten) */
  auslagen: AbrechnungAuslage[]
  /** Ausgewählter Fahrer (null = Übersicht) */
  selectedFahrerId: number | null
  /** Touren für den ausgewählten Fahrer */
  fahrerTouren: AbrechnungTour[]
  /** Auslagen für den ausgewählten Fahrer */
  fahrerAuslagen: AbrechnungAuslage[]
  /** Überschuss aus Vormonat */
  fahrerVormonatUeberschuss: number
  /** Handler: Fahrer-Abrechnung laden */
  onLoadFahrerAbrechnung: (id: number) => void
  /** Handler: Zurück zur Übersicht */
  onBackToOverview: () => void
  /** Hilfsfunktion: Namen vergleichen */
  namesMatch: (name1: string, name2: string) => boolean
  /** Hilfsfunktion: Datum formatieren */
  formatDate: (dateString: string) => string
  /** Hilfsfunktion: Währung formatieren */
  formatCurrency: (amount: number | string) => string
  /** Hilfsfunktion: Status-Badge rendern */
  getStatusBadge: (status: string, istRuecklaufer?: boolean) => React.ReactNode
}

/**
 * AbrechnungTab - Fahrer-Abrechnung im Admin-Dashboard
 *
 * Zeigt zwei Ansichten:
 * 1. Fahrer-Liste mit Übersicht der Verdienste und Auslagen
 * 2. Detail-Ansicht für ausgewählten Fahrer mit allen Touren und Auslagen
 */
export function AbrechnungTab({
  fahrer,
  touren,
  auslagen,
  selectedFahrerId,
  fahrerTouren,
  fahrerAuslagen,
  fahrerVormonatUeberschuss,
  onLoadFahrerAbrechnung,
  onBackToOverview,
  namesMatch,
  formatDate,
  formatCurrency,
  getStatusBadge
}: AbrechnungTabProps) {
  return (
    <>
      {!selectedFahrerId ? (
        // Fahrer-Liste
        <Card className="border-gray-100 shadow-sm">
          <CardHeader className="border-b border-gray-50 bg-gray-50/30">
            <CardTitle className="text-xl font-semibold text-gray-900">Fahrer-Abrechnung</CardTitle>
            <CardDescription className="text-gray-500">
              Wählen Sie einen Fahrer aus, um die Abrechnung zu sehen
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            {fahrer.filter(f => f.status === 'aktiv' && !f.archived_at).length === 0 ? (
              <EmptyState
                title="Keine aktiven Fahrer"
                description="Es sind keine aktiven Fahrer für die Abrechnung vorhanden."
                icon="users"
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {fahrer.filter(f => f.status === 'aktiv' && !f.archived_at).map((f) => {
                  // Berechne Statistiken für diesen Fahrer
                  const fahrerName = `${f.vorname} ${f.nachname}`
                  // Verwende namesMatch() um auch "Nachname Vorname" Format zu erkennen
                  const fahrerTourenCount = touren.filter(t => namesMatch(t.fahrer, fahrerName)).length
                  const fahrerAuslagenCount = auslagen.filter(a => namesMatch(a.fahrer, fahrerName)).length

                  // Fahrer ohne Lohnberechnung (z.B. Nicholas Mandzel, Burak Aydin) erhalten 0€
                  const isNoSalary = hasNoSalary(fahrerName)
                  const fahrerGesamtverdienst = isNoSalary
                    ? 0
                    : touren
                        .filter(t => namesMatch(t.fahrer, fahrerName) && (t.status === 'approved' || t.status === 'billed'))
                        .reduce((sum, t) => {
                          const km = parseFloat(t.gefahreneKm) || 0
                          return sum + calculateTourVerdienst(km, t.wartezeit, fahrerName)
                        }, 0)

                  const fahrerAuslagenSumme = auslagen
                    .filter(a => namesMatch(a.fahrer, fahrerName) && (a.status === 'approved' || a.status === 'paid'))
                    .reduce((sum, a) => sum + parseFloat(a.kosten), 0)

                  return (
                    <Card
                      key={f.id}
                      className="hover:shadow-md transition-all duration-200 cursor-pointer border-gray-100 hover:border-gray-200 group"
                      onClick={() => {
                        onLoadFahrerAbrechnung(f.id)
                      }}
                    >
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h3 className="font-semibold text-gray-900 group-hover:text-primary-blue transition-colors">
                              {f.vorname} {f.nachname}
                            </h3>
                            <p className="text-sm text-gray-400">{f.plz} {f.ort}</p>
                          </div>
                          {isNoSalary && (
                            <Badge className="bg-gray-100 text-gray-600 border-gray-200 text-xs">
                              Keine Abrechnung
                            </Badge>
                          )}
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-500">Verdienst:</span>
                            <CurrencyDisplay
                              amount={fahrerGesamtverdienst}
                              bold
                              size="sm"
                              className="text-emerald-700"
                            />
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-500">Auslagen:</span>
                            <CurrencyDisplay
                              amount={fahrerAuslagenSumme}
                              bold
                              size="sm"
                              className="text-amber-700"
                            />
                          </div>
                          <div className="flex items-center justify-between text-xs text-gray-400 pt-2 border-t border-gray-100">
                            <span>{fahrerTourenCount} Touren</span>
                            <span>{fahrerAuslagenCount} Auslagen</span>
                          </div>
                        </div>

                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full mt-4 text-primary-blue border-gray-200 hover:bg-blue-50 hover:border-primary-blue"
                          onClick={(e) => {
                            e.stopPropagation()
                            onLoadFahrerAbrechnung(f.id)
                          }}
                        >
                          Details ansehen
                        </Button>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        // Fahrer-Detail-Ansicht
        <>
          <Button
            variant="ghost"
            onClick={onBackToOverview}
            className="mb-4 text-gray-600 hover:text-primary-blue hover:bg-blue-50"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Zurück zur Übersicht
          </Button>

          {(() => {
            const selectedFahrerData = fahrer.find(f => f.id === selectedFahrerId)
            if (!selectedFahrerData) return null

            const fahrerName = `${selectedFahrerData.vorname} ${selectedFahrerData.nachname}`
            const isNoSalary = hasNoSalary(fahrerName)

            // Berechne Gesamtverdienst (Fahrer ohne Lohnberechnung = 0€)
            // Bei anderen: Touren-Lohn
            const gesamtverdienst = isNoSalary
              ? 0
              : fahrerTouren
                  .filter(t => t.status === 'approved' || t.status === 'billed')
                  .reduce((sum, t) => {
                    const km = parseFloat(t.gefahreneKm) || 0
                    // Retoure-Touren = 0€
                    const verdienst = t.istRuecklaufer ? 0 : calculateTourVerdienst(km, t.wartezeit, fahrerName)
                    return sum + verdienst
                  }, 0)

            console.log('=== AUSZAHLUNGS-BERECHNUNG ===')
            console.log('Fahrer:', fahrerName)
            console.log('Zeitmodell:', selectedFahrerData.zeitmodell)
            console.log('Gesamtverdienst:', gesamtverdienst)
            console.log('Vormonat-Überschuss:', fahrerVormonatUeberschuss)

            // Fahrer ohne Lohnberechnung: Keine Minijob-Logik nötig
            const { ausgeZahlt, ueberschuss } = isNoSalary
              ? { ausgeZahlt: gesamtverdienst, ueberschuss: 0 }
              : calculateMonthlyPayout(gesamtverdienst, fahrerVormonatUeberschuss)

            console.log('Berechnete Auszahlung:', ausgeZahlt)
            console.log('Neuer Überschuss:', ueberschuss)

            const auslagenSumme = fahrerAuslagen
              .filter(a => a.status === 'approved' || a.status === 'paid')
              .reduce((sum, a) => sum + parseFloat(a.kosten), 0)

            return (
              <>
                {/* Header Card */}
                <Card className="mb-6 border-gray-100 shadow-sm overflow-hidden">
                  <div className="h-1 bg-gradient-to-r from-primary-blue via-blue-400 to-sky-400" />
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h2 className="text-2xl font-bold text-gray-900">
                          {fahrerName}
                        </h2>
                        <p className="text-gray-500 text-sm">
                          {selectedFahrerData.adresse}, {selectedFahrerData.plz} {selectedFahrerData.ort}
                        </p>
                      </div>
                      <StatusBadge status="success" label="Aktiv" />
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                        <div className="flex items-center gap-2 mb-2">
                          <TrendingUp className="h-4 w-4 text-emerald-600" />
                          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Gesamtverdienst</p>
                        </div>
                        <CurrencyDisplay
                          amount={gesamtverdienst}
                          bold
                          size="xl"
                          className="text-emerald-700"
                        />
                      </div>
                      <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                        <div className="flex items-center gap-2 mb-2">
                          <Wallet className="h-4 w-4 text-primary-blue" />
                          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Auszahlung</p>
                        </div>
                        <CurrencyDisplay
                          amount={ausgeZahlt}
                          bold
                          size="xl"
                          className="text-primary-blue"
                        />
                      </div>
                      <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                        <div className="flex items-center gap-2 mb-2">
                          <Clock className="h-4 w-4 text-amber-600" />
                          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Vormonat</p>
                        </div>
                        <CurrencyDisplay
                          amount={fahrerVormonatUeberschuss}
                          bold
                          size="xl"
                          className="text-amber-700"
                        />
                      </div>
                      <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                        <div className="flex items-center gap-2 mb-2">
                          <Receipt className="h-4 w-4 text-violet-600" />
                          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Auslagen</p>
                        </div>
                        <CurrencyDisplay
                          amount={auslagenSumme}
                          bold
                          size="xl"
                          className="text-violet-700"
                        />
                      </div>
                    </div>

                    {gesamtverdienst > MONTHLY_LIMIT && (
                      <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm flex items-start gap-2">
                        <Clock className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                        <p className="text-amber-800">
                          <strong>Hinweis:</strong> Verdienst überschreitet Minijob-Grenze ({formatCurrency(MONTHLY_LIMIT)}).
                          Überschuss von {formatCurrency(ueberschuss)} wird dem Fahrer zugerechnet.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Touren */}
                <Card className="mb-6 border-gray-100 shadow-sm">
                  <CardHeader className="border-b border-gray-50 bg-gray-50/30">
                    <CardTitle className="text-lg font-semibold text-gray-900">
                      Touren ({fahrerTouren.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    {fahrerTouren.length === 0 ? (
                      <div className="p-6">
                        <EmptyState
                          title="Keine Touren vorhanden"
                          description="Für diesen Zeitraum sind keine Touren erfasst."
                          icon="car"
                          iconSize="sm"
                        />
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-gray-50/50 hover:bg-gray-50/50">
                              <TableHead className="font-medium text-gray-600">Tour-Nr.</TableHead>
                              <TableHead className="font-medium text-gray-600">Datum</TableHead>
                              <TableHead className="font-medium text-gray-600 text-right">KM</TableHead>
                              <TableHead className="font-medium text-gray-600">Wartezeit</TableHead>
                              <TableHead className="font-medium text-gray-600 text-right">Verdienst</TableHead>
                              <TableHead className="font-medium text-gray-600">Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {fahrerTouren.map((tour) => {
                              const km = parseFloat(tour.gefahreneKm) || 0
                              // Retoure-Touren = 0€
                              const verdienst = tour.istRuecklaufer ? 0 : calculateTourVerdienst(km, tour.wartezeit, fahrerName)

                              return (
                                <TableRow key={tour.id} className="hover:bg-gray-50/50">
                                  <TableCell className="font-medium text-gray-900">{tour.tourNr}</TableCell>
                                  <TableCell className="text-gray-600">{formatDate(tour.datum)}</TableCell>
                                  <TableCell className="text-right text-gray-900">{tour.gefahreneKm} km</TableCell>
                                  <TableCell className="text-sm text-gray-600">
                                    {tour.wartezeit === "30-60" && "30-60 Min."}
                                    {tour.wartezeit === "60-90" && "60-90 Min."}
                                    {tour.wartezeit === "90-120" && "90-120 Min."}
                                    {!tour.wartezeit && "—"}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <CurrencyDisplay
                                      amount={verdienst}
                                      bold
                                      size="sm"
                                      className="text-emerald-700"
                                    />
                                  </TableCell>
                                  <TableCell>{getStatusBadge(tour.status, tour.istRuecklaufer)}</TableCell>
                                </TableRow>
                              )
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Auslagen */}
                <Card className="border-gray-100 shadow-sm">
                  <CardHeader className="border-b border-gray-50 bg-gray-50/30">
                    <CardTitle className="text-lg font-semibold text-gray-900">
                      Auslagen ({fahrerAuslagen.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    {fahrerAuslagen.length === 0 ? (
                      <div className="p-6">
                        <EmptyState
                          title="Keine Auslagen vorhanden"
                          description="Für diesen Zeitraum sind keine Auslagen erfasst."
                          icon="euro"
                          iconSize="sm"
                        />
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-gray-50/50 hover:bg-gray-50/50">
                              <TableHead className="font-medium text-gray-600">Tour-Nr.</TableHead>
                              <TableHead className="font-medium text-gray-600">Datum</TableHead>
                              <TableHead className="font-medium text-gray-600">Kennzeichen</TableHead>
                              <TableHead className="font-medium text-gray-600">Strecke</TableHead>
                              <TableHead className="font-medium text-gray-600">Belegart</TableHead>
                              <TableHead className="font-medium text-gray-600 text-right">Kosten</TableHead>
                              <TableHead className="font-medium text-gray-600">Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {fahrerAuslagen.map((auslage) => (
                              <TableRow key={auslage.id} className="hover:bg-gray-50/50">
                                <TableCell className="font-medium text-gray-900">{auslage.tourNr}</TableCell>
                                <TableCell className="text-gray-600">{formatDate(auslage.datum)}</TableCell>
                                <TableCell className="text-gray-700 font-mono text-sm">{auslage.kennzeichen}</TableCell>
                                <TableCell className="text-sm text-gray-600">
                                  {auslage.startort} → {auslage.zielort}
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
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            )
          })()}
        </>
      )}
    </>
  )
}
