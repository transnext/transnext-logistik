"use client"

import { Card, CardContent } from "@/components/ui/card"
import { CurrencyDisplay } from "@/components/ui/currency-display"
import { KpiTrafficLight } from "./KpiTrafficLight"
import {
  Clock,
  FileText,
  Wallet,
  CheckCircle,
  BarChart3,
  AlertTriangle,
  TrendingUp,
  Users
} from "lucide-react"

export type DashboardUserRole = 'admin' | 'disponent'

interface DashboardKPIsProps {
  /** Anzahl der ausstehenden Touren (pending) */
  tourenPending: number
  /** Anzahl der ausstehenden Auslagen (pending) */
  auslagenPending: number
  /** Summe der offenen Auslagen in EUR */
  offeneAuslagen: number
  /** Gesamtlohn genehmigt (nur für Admin sichtbar) */
  gesamtlohnGenehmigt: number
  /** Monatsumsatz (nur für Admin sichtbar) */
  monatsumsatz: number
  /** Benutzerrolle - bestimmt Sichtbarkeit der Finanz-KPIs */
  userRole: DashboardUserRole
}

/**
 * Formatiert einen Betrag als deutsches Währungsformat (EUR)
 */
function formatCurrency(amount: number | string): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR'
  }).format(num)
}

/**
 * PrimaryKPICard - Große Management-KPI-Karte mit Ampel
 */
interface PrimaryKPICardProps {
  title: string
  value: React.ReactNode
  subtitle: string
  icon: React.ReactNode
  iconBgClass: string
  iconTextClass: string
  trafficLight: {
    value: number
    max: number
    yellowThreshold: number
    redThreshold: number
    inverted: boolean
  }
}

function PrimaryKPICard({
  title,
  value,
  subtitle,
  icon,
  iconBgClass,
  iconTextClass,
  trafficLight
}: PrimaryKPICardProps) {
  return (
    <Card className="bg-white border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200">
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
            <div className="text-3xl font-bold text-gray-900 tracking-tight">
              {value}
            </div>
            <p className="text-xs text-gray-400 mt-1">{subtitle}</p>
          </div>
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${iconBgClass}`}>
            <div className={iconTextClass}>{icon}</div>
          </div>
        </div>

        {/* Ampel */}
        <KpiTrafficLight
          value={trafficLight.value}
          min={0}
          max={trafficLight.max}
          yellowThreshold={trafficLight.yellowThreshold}
          redThreshold={trafficLight.redThreshold}
          inverted={trafficLight.inverted}
        />
      </CardContent>
    </Card>
  )
}

/**
 * FinanceKPICard - Finanz-KPI ohne Ampel (nur für Admin)
 */
interface FinanceKPICardProps {
  title: string
  value: React.ReactNode
  subtitle: string
  icon: React.ReactNode
  iconBgClass: string
  iconTextClass: string
}

function FinanceKPICard({
  title,
  value,
  subtitle,
  icon,
  iconBgClass,
  iconTextClass
}: FinanceKPICardProps) {
  return (
    <Card className="bg-white border border-gray-100 shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-500 mb-1 truncate">{title}</p>
            <div className="text-2xl font-bold text-gray-900 tracking-tight">
              {value}
            </div>
            <p className="text-xs text-gray-400 mt-1 truncate">{subtitle}</p>
          </div>
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${iconBgClass}`}>
            <div className={iconTextClass}>{icon}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * MiniKPICard - Kleine operative Karte ohne prominente Ampel
 */
interface MiniKPICardProps {
  title: string
  value: number
  icon: React.ReactNode
  iconClass: string
}

function MiniKPICard({ title, value, icon, iconClass }: MiniKPICardProps) {
  return (
    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
      <div className={`w-8 h-8 rounded-md flex items-center justify-center ${iconClass}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-500 truncate">{title}</p>
        <p className="text-lg font-semibold text-gray-900">{value}</p>
      </div>
    </div>
  )
}

/**
 * DashboardKPIs - Management-Cockpit für das Admin-Dashboard
 *
 * Struktur:
 * 1. Primäre Management-KPIs mit Ampel (für alle Rollen)
 * 2. Finanz-KPIs ohne Ampel (nur für Admin)
 * 3. Operative Mini-Karten
 */
export function DashboardKPIs({
  tourenPending,
  auslagenPending,
  offeneAuslagen,
  gesamtlohnGenehmigt,
  monatsumsatz,
  userRole
}: DashboardKPIsProps) {
  // Berechnung: Operativer Rückstand
  const backlogTotal = tourenPending + auslagenPending

  return (
    <div className="space-y-6 mb-6">

      {/* === PRIMÄRE MANAGEMENT-KPIs MIT AMPEL === */}
      <div>
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
          Operations-Übersicht
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* A) Operativer Rückstand */}
          <PrimaryKPICard
            title="Operativer Rückstand"
            value={backlogTotal}
            subtitle="Nachweise & Auslagen offen"
            icon={<AlertTriangle className="h-6 w-6" />}
            iconBgClass={backlogTotal > 15 ? "bg-red-50" : backlogTotal > 5 ? "bg-amber-50" : "bg-emerald-50"}
            iconTextClass={backlogTotal > 15 ? "text-red-600" : backlogTotal > 5 ? "text-amber-600" : "text-emerald-600"}
            trafficLight={{
              value: backlogTotal,
              max: 30,
              yellowThreshold: 5,
              redThreshold: 15,
              inverted: true
            }}
          />

          {/* B) Offene Auslagen */}
          <PrimaryKPICard
            title="Offene Auslagen"
            value={<CurrencyDisplay amount={offeneAuslagen} bold size="lg" />}
            subtitle="Noch nicht geklärter Betrag"
            icon={<Wallet className="h-6 w-6" />}
            iconBgClass={offeneAuslagen > 1000 ? "bg-red-50" : offeneAuslagen > 250 ? "bg-amber-50" : "bg-emerald-50"}
            iconTextClass={offeneAuslagen > 1000 ? "text-red-600" : offeneAuslagen > 250 ? "text-amber-600" : "text-emerald-600"}
            trafficLight={{
              value: offeneAuslagen,
              max: 2000,
              yellowThreshold: 250,
              redThreshold: 1000,
              inverted: true
            }}
          />
        </div>
      </div>

      {/* === FINANZ-KPIs NUR FÜR ADMIN (OHNE AMPEL) === */}
      {userRole === 'admin' && (
        <div>
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Finanz-Indikatoren
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

            {/* C) Monatsumsatz */}
            <FinanceKPICard
              title="Monatsumsatz"
              value={<CurrencyDisplay amount={monatsumsatz} bold size="lg" className="text-sky-700" />}
              subtitle="Abgerechneter/erfasster Umsatz"
              icon={<BarChart3 className="h-5 w-5" />}
              iconBgClass="bg-sky-50"
              iconTextClass="text-sky-600"
            />

            {/* D) Genehmigter Fahrerlohn */}
            <FinanceKPICard
              title="Genehmigter Fahrerlohn"
              value={<CurrencyDisplay amount={gesamtlohnGenehmigt} bold size="lg" className="text-violet-700" />}
              subtitle="Kostenindikator, keine Marge"
              icon={<Users className="h-5 w-5" />}
              iconBgClass="bg-violet-50"
              iconTextClass="text-violet-600"
            />
          </div>
        </div>
      )}

      {/* === OPERATIVE MINI-KARTEN === */}
      <div>
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
          Wartende Vorgänge
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <MiniKPICard
            title="Touren zur Prüfung"
            value={tourenPending}
            icon={<Clock className="h-4 w-4 text-amber-600" />}
            iconClass="bg-amber-50"
          />
          <MiniKPICard
            title="Auslagen zur Prüfung"
            value={auslagenPending}
            icon={<FileText className="h-4 w-4 text-orange-600" />}
            iconClass="bg-orange-50"
          />
        </div>
      </div>
    </div>
  )
}

// Export für externe Nutzung
export { formatCurrency }
