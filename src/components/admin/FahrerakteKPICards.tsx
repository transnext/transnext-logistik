"use client"

import { Card, CardContent } from "@/components/ui/card"
import {
  Truck,
  Calendar,
  Euro,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertTriangle,
  Percent,
  Activity
} from "lucide-react"

// ============================================================
// TYPES
// ============================================================

export interface FahrerakteKPIs {
  // Operative KPIs (für alle sichtbar)
  tourenImZeitraum: number
  aktiveFahrtage: number
  puenktlicheUploads: number
  verspaeteteUploads: number
  puenktlichkeitsQuote: number
  verfuegbareTage: number
  verfuegbareTageOhneTour: number
  einsatzQuote: number

  // Finanz-KPIs (nur für Admin/GF)
  umsatz: number | null
  fahrerlohn: number | null
  arbeitgeberkosten: number | null
  ertrag: number | null
  margenQuote: number | null

  // Flags
  finanzDatenVerfuegbar: boolean
}

interface FahrerakteKPICardsProps {
  kpis: FahrerakteKPIs
  isAdmin: boolean
  zeitraumLabel: string
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function formatCurrency(value: number | null): string {
  if (value === null) return '-'
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value)
}

function formatPercent(value: number | null): string {
  if (value === null) return '-'
  return `${Math.round(value)}%`
}

// ============================================================
// COMPONENT
// ============================================================

export function FahrerakteKPICards({ kpis, isAdmin, zeitraumLabel }: FahrerakteKPICardsProps) {
  return (
    <div className="space-y-4">
      {/* Operative KPIs - für alle sichtbar */}
      <div>
        <h3 className="text-sm font-medium text-gray-500 mb-3">Operative Kennzahlen</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {/* Touren */}
          <Card className="border-gray-100">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <Truck className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{kpis.tourenImZeitraum}</p>
                  <p className="text-xs text-gray-500">Touren</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Aktive Fahrtage */}
          <Card className="border-gray-100">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-50 rounded-lg">
                  <Calendar className="h-4 w-4 text-emerald-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{kpis.aktiveFahrtage}</p>
                  <p className="text-xs text-gray-500">Aktive Tage</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pünktlichkeitsquote */}
          <Card className={`border-gray-100 ${kpis.puenktlichkeitsQuote < 80 ? 'border-amber-200 bg-amber-50/30' : ''}`}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${kpis.puenktlichkeitsQuote >= 90 ? 'bg-emerald-50' : kpis.puenktlichkeitsQuote >= 80 ? 'bg-amber-50' : 'bg-red-50'}`}>
                  <CheckCircle className={`h-4 w-4 ${kpis.puenktlichkeitsQuote >= 90 ? 'text-emerald-600' : kpis.puenktlichkeitsQuote >= 80 ? 'text-amber-600' : 'text-red-600'}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{formatPercent(kpis.puenktlichkeitsQuote)}</p>
                  <p className="text-xs text-gray-500">Pünktlichkeit</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Verspätete Uploads */}
          <Card className={`border-gray-100 ${kpis.verspaeteteUploads > 0 ? 'border-amber-200 bg-amber-50/30' : ''}`}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${kpis.verspaeteteUploads === 0 ? 'bg-emerald-50' : 'bg-amber-50'}`}>
                  <AlertTriangle className={`h-4 w-4 ${kpis.verspaeteteUploads === 0 ? 'text-emerald-600' : 'text-amber-600'}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{kpis.verspaeteteUploads}</p>
                  <p className="text-xs text-gray-500">Verspätet</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Verfügbare Tage */}
          <Card className="border-gray-100">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <Clock className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{kpis.verfuegbareTage}</p>
                  <p className="text-xs text-gray-500">Verfügbar</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Verfügbare Tage ohne Tour */}
          <Card className={`border-gray-100 ${kpis.verfuegbareTageOhneTour > 3 ? 'border-amber-200 bg-amber-50/30' : ''}`}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${kpis.verfuegbareTageOhneTour === 0 ? 'bg-emerald-50' : 'bg-amber-50'}`}>
                  <Activity className={`h-4 w-4 ${kpis.verfuegbareTageOhneTour === 0 ? 'text-emerald-600' : 'text-amber-600'}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{kpis.verfuegbareTageOhneTour}</p>
                  <p className="text-xs text-gray-500">Ohne Tour</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Einsatzquote */}
          <Card className="border-gray-100">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${kpis.einsatzQuote >= 80 ? 'bg-emerald-50' : kpis.einsatzQuote >= 50 ? 'bg-amber-50' : 'bg-gray-50'}`}>
                  <Percent className={`h-4 w-4 ${kpis.einsatzQuote >= 80 ? 'text-emerald-600' : kpis.einsatzQuote >= 50 ? 'text-amber-600' : 'text-gray-600'}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{formatPercent(kpis.einsatzQuote)}</p>
                  <p className="text-xs text-gray-500">Einsatzquote</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Finanz-KPIs - nur für Admin/GF */}
      {isAdmin && (
        <div>
          <h3 className="text-sm font-medium text-gray-500 mb-3">Wirtschaftliche Kennzahlen</h3>
          {kpis.finanzDatenVerfuegbar ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {/* Umsatz */}
              <Card className="border-gray-100">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 rounded-lg">
                      <Euro className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-xl font-bold text-gray-900">{formatCurrency(kpis.umsatz)}</p>
                      <p className="text-xs text-gray-500">Umsatz</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Fahrerlohn */}
              <Card className="border-gray-100">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gray-100 rounded-lg">
                      <Euro className="h-4 w-4 text-gray-600" />
                    </div>
                    <div>
                      <p className="text-xl font-bold text-gray-900">{formatCurrency(kpis.fahrerlohn)}</p>
                      <p className="text-xs text-gray-500">Fahrerlohn</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* AG-Kosten */}
              <Card className="border-gray-100">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gray-100 rounded-lg">
                      <Euro className="h-4 w-4 text-gray-600" />
                    </div>
                    <div>
                      <p className="text-xl font-bold text-gray-900">{formatCurrency(kpis.arbeitgeberkosten)}</p>
                      <p className="text-xs text-gray-500">AG-Kosten</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Ertrag */}
              <Card className={`border-gray-100 ${(kpis.ertrag ?? 0) < 0 ? 'border-red-200 bg-red-50/30' : ''}`}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${(kpis.ertrag ?? 0) >= 0 ? 'bg-emerald-50' : 'bg-red-50'}`}>
                      <TrendingUp className={`h-4 w-4 ${(kpis.ertrag ?? 0) >= 0 ? 'text-emerald-600' : 'text-red-600'}`} />
                    </div>
                    <div>
                      <p className="text-xl font-bold text-gray-900">{formatCurrency(kpis.ertrag)}</p>
                      <p className="text-xs text-gray-500">Ertrag</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Marge */}
              <Card className={`border-gray-100 ${(kpis.margenQuote ?? 0) < 15 ? 'border-amber-200 bg-amber-50/30' : ''}`}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${(kpis.margenQuote ?? 0) >= 15 ? 'bg-emerald-50' : 'bg-amber-50'}`}>
                      <Percent className={`h-4 w-4 ${(kpis.margenQuote ?? 0) >= 15 ? 'text-emerald-600' : 'text-amber-600'}`} />
                    </div>
                    <div>
                      <p className="text-xl font-bold text-gray-900">{formatPercent(kpis.margenQuote)}</p>
                      <p className="text-xs text-gray-500">Marge</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card className="border-gray-100 border-dashed">
              <CardContent className="p-6 text-center">
                <p className="text-sm text-gray-400">
                  Finanzwerte werden aus genehmigten Touren berechnet. Für diesen Zeitraum sind noch keine vollständigen Daten verfügbar.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
