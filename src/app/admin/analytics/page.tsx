"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { AdminLayout } from "@/components/admin/AdminLayout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CurrencyDisplay } from "@/components/ui/currency-display"
import { EmptyState } from "@/components/ui/empty-state"
import { KpiTrafficLight } from "@/components/admin/dashboard/KpiTrafficLight"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { getCurrentUser, getUserProfile, signOut } from "@/lib/api"
import {
  calculateAnalytics,
  validateCustomTimeRange,
  calculateFixedSalaryMonthlyCost,
  FIXED_SALARY_DEFAULT_GROSS,
  FIXED_SALARY_EMPLOYER_COST_RATE,
  FIXED_SALARY_ADDITIONAL_COST,
  type AnalyticsData,
  type AnalyticsTimeRange,
  type FahrerLeistungKPI,
  type FahrerBewertung,
  type FahrerUploadComplianceDetail,
  type VerspaeteteTourDetail,
  type FahrerVerfuegbarkeitsDetail,
  type TrendData,
  type MonthlyTrendDataPoint
} from "@/lib/analytics-calculator"
import {
  TrendingUp,
  Euro,
  Users,
  Activity,
  AlertCircle,
  Calendar,
  RefreshCw,
  XCircle,
  Wallet,
  BarChart3,
  Percent,
  Check,
  CalendarDays,
  Target,
  ArrowUp,
  ArrowDown,
  Minus,
  ChevronDown,
  ChevronUp,
  Clock,
  CalendarCheck,
  FileText,
  ExternalLink,
  Download,
  Eye,
  AlertTriangle,
  Info,
  Briefcase,
  DollarSign,
  LineChart as LineChartIcon
} from "lucide-react"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts"

// ============================================================
// HELPER COMPONENTS
// ============================================================

/** KPI-Karte für Management Summary */
function SummaryKPICard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconBgClass,
  iconTextClass
}: {
  title: string
  value: React.ReactNode
  subtitle?: string
  icon: React.ElementType
  iconBgClass: string
  iconTextClass: string
}) {
  return (
    <Card className="bg-white border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-500 mb-1 truncate">{title}</p>
            <div className="text-2xl font-bold text-gray-900 tracking-tight">
              {value}
            </div>
            {subtitle && <p className="text-xs text-gray-400 mt-1 truncate">{subtitle}</p>}
          </div>
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${iconBgClass}`}>
            <Icon className={`h-5 w-5 ${iconTextClass}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

/** Kleine KPI-Karte */
function DetailKPICard({
  label,
  value,
  sublabel,
  variant = "default"
}: {
  label: string
  value: React.ReactNode
  sublabel?: string
  variant?: "default" | "success" | "warning" | "danger"
}) {
  const variantClasses = {
    default: "bg-gray-50 border-gray-100",
    success: "bg-emerald-50 border-emerald-100",
    warning: "bg-amber-50 border-amber-100",
    danger: "bg-red-50 border-red-100"
  }

  return (
    <div className={`p-4 rounded-lg border ${variantClasses[variant]}`}>
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-lg font-semibold text-gray-900">{value}</p>
      {sublabel && <p className="text-xs text-gray-400 mt-0.5">{sublabel}</p>}
    </div>
  )
}

/** Bewertungs-Badge */
function BewertungBadge({ bewertung }: { bewertung: FahrerBewertung }) {
  const config = {
    stark: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", label: "Stark" },
    ausbauen: { bg: "bg-sky-50", text: "text-sky-700", border: "border-sky-200", label: "Ausbauen" },
    pruefen: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", label: "Prüfen" },
    inaktiv: { bg: "bg-gray-50", text: "text-gray-500", border: "border-gray-200", label: "Inaktiv" }
  }
  const c = config[bewertung]
  return (
    <Badge className={`${c.bg} ${c.text} ${c.border} border font-medium`}>
      {c.label}
    </Badge>
  )
}

/** Einfaches Balkendiagramm (CSS-basiert) */
function SimpleBarChart({
  data,
  maxValue,
  label,
  color = "bg-sky-500"
}: {
  data: { name: string; value: number }[]
  maxValue: number
  label: string
  color?: string
}) {
  if (data.length === 0) return <p className="text-sm text-gray-400">Keine Daten</p>

  return (
    <div className="space-y-2">
      {data.map((item, idx) => (
        <div key={idx} className="flex items-center gap-3">
          <div className="w-24 text-xs text-gray-600 truncate">{item.name}</div>
          <div className="flex-1 h-5 bg-gray-100 rounded overflow-hidden">
            <div
              className={`h-full ${color} rounded transition-all duration-300`}
              style={{ width: `${Math.min((item.value / maxValue) * 100, 100)}%` }}
            />
          </div>
          <div className="w-16 text-xs font-medium text-gray-700 text-right">{label === "€" ? `${item.value.toFixed(0)} €` : item.value}</div>
        </div>
      ))}
    </div>
  )
}

/** Einfache Linien-/Balkengrafik für Monatstrend (CSS-basiert) */
/** Formatierung für Euro-Werte im Tooltip */
function formatEuro(value: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value)
}

/** Custom Tooltip für Recharts */
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm">
      <p className="font-semibold text-gray-900 mb-2">{label}</p>
      {payload.map((entry: any, index: number) => (
        <div key={index} className="flex items-center gap-2 mb-1">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-gray-600">{entry.name}:</span>
          <span className="font-medium text-gray-900">
            {entry.name.includes('quote') ? `${entry.value?.toFixed(1)}%` : formatEuro(entry.value)}
          </span>
        </div>
      ))}
    </div>
  )
}

/** Echtes Liniendiagramm für Monatsentwicklung mit Recharts */
function MonthlyLineChart({
  data,
  showMarge = true
}: {
  data: MonthlyTrendDataPoint[]
  showMarge?: boolean
}) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        <p>Keine Daten für Trend verfügbar</p>
      </div>
    )
  }

  // Formatiere Daten für Recharts
  const chartData = data.map(d => ({
    name: d.monatLabel,
    monat: d.monat,
    Umsatz: Math.round(d.umsatz),
    Marge: Math.round(d.marge),
    Touren: d.touren,
    Einsatztage: d.einsatztage,
    'Umsatz/Tag': d.umsatzProEinsatztag ? Math.round(d.umsatzProEinsatztag) : 0
  }))

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={300}>
        <LineChart
          data={chartData}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 12, fill: '#6b7280' }}
            axisLine={{ stroke: '#d1d5db' }}
          />
          <YAxis
            tick={{ fontSize: 12, fill: '#6b7280' }}
            axisLine={{ stroke: '#d1d5db' }}
            tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: '12px' }}
          />
          <Line
            type="monotone"
            dataKey="Umsatz"
            stroke="#10b981"
            strokeWidth={3}
            dot={{ fill: '#10b981', strokeWidth: 2, r: 5 }}
            activeDot={{ r: 8 }}
            name="Umsatz"
          />
          {showMarge && (
            <Line
              type="monotone"
              dataKey="Marge"
              stroke="#6366f1"
              strokeWidth={3}
              dot={{ fill: '#6366f1', strokeWidth: 2, r: 5 }}
              activeDot={{ r: 8 }}
              name="Marge / Deckungsbeitrag"
            />
          )}
        </LineChart>
      </ResponsiveContainer>

      {/* Zusätzliche KPI-Zeile unter dem Chart */}
      <div className="mt-4 grid grid-cols-3 sm:grid-cols-6 gap-2 border-t border-gray-100 pt-4">
        {data.map((d, idx) => (
          <div key={idx} className="text-center">
            <div className="text-[10px] text-gray-400 mb-0.5">{d.monatLabel}</div>
            <div className={`text-xs font-semibold ${
              d.marge >= 0 ? 'text-emerald-600' : 'text-red-600'
            }`}>
              {formatEuro(d.marge)}
            </div>
            <div className="text-[10px] text-gray-400">
              {d.touren} Touren
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/** CSS-basiertes Balkendiagramm (Fallback/Alternative) */
function TrendChart({
  data,
  showSollArbeitstage = false
}: {
  data: MonthlyTrendDataPoint[]
  showSollArbeitstage?: boolean
}) {
  if (data.length === 0) return <p className="text-sm text-gray-400">Keine Daten für Trend verfügbar</p>

  const maxUmsatz = Math.max(...data.map(d => d.umsatz), 1)
  const maxEinsatztage = Math.max(...data.map(d => d.einsatztage), 1)

  return (
    <div className="space-y-4">
      {/* Umsatz-Balken */}
      <div>
        <p className="text-xs font-medium text-gray-500 mb-2">Umsatz pro Monat</p>
        <div className="flex items-end gap-1 h-24">
          {data.map((d, idx) => {
            const heightPercent = (d.umsatz / maxUmsatz) * 100
            return (
              <div key={idx} className="flex-1 flex flex-col items-center group relative">
                <div
                  className="w-full bg-emerald-500 rounded-t transition-all duration-300 hover:bg-emerald-600"
                  style={{ height: `${heightPercent}%`, minHeight: d.umsatz > 0 ? '4px' : '0' }}
                  title={`${d.monatLabel}: ${d.umsatz.toFixed(0)} €`}
                />
                <span className="text-[10px] text-gray-400 mt-1 truncate w-full text-center">{d.monatLabel}</span>
                {/* Tooltip */}
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
                  {d.umsatz.toFixed(0)} €
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Einsatztage-Balken */}
      <div>
        <p className="text-xs font-medium text-gray-500 mb-2">Einsatztage pro Monat</p>
        <div className="flex items-end gap-1 h-16">
          {data.map((d, idx) => {
            const heightPercent = (d.einsatztage / maxEinsatztage) * 100
            return (
              <div key={idx} className="flex-1 flex flex-col items-center group relative">
                <div
                  className="w-full bg-sky-500 rounded-t transition-all duration-300 hover:bg-sky-600"
                  style={{ height: `${heightPercent}%`, minHeight: d.einsatztage > 0 ? '4px' : '0' }}
                  title={`${d.monatLabel}: ${d.einsatztage} Tage`}
                />
                {/* Tooltip */}
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
                  {d.einsatztage} Tage
                  {showSollArbeitstage && d.sollArbeitstage && (
                    <span className="text-gray-300"> / {d.sollArbeitstage} Soll</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Umsatz/Einsatztag */}
      <div className="border-t border-gray-100 pt-3">
        <p className="text-xs font-medium text-gray-500 mb-2">Umsatz pro Einsatztag</p>
        <div className="flex gap-1 overflow-x-auto">
          {data.map((d, idx) => (
            <div key={idx} className="flex-1 min-w-[50px] text-center">
              <div className={`text-sm font-semibold ${
                (d.umsatzProEinsatztag ?? 0) >= 200 ? 'text-emerald-600' :
                (d.umsatzProEinsatztag ?? 0) >= 150 ? 'text-amber-600' : 'text-gray-600'
              }`}>
                {d.umsatzProEinsatztag !== null ? `${d.umsatzProEinsatztag.toFixed(0)}€` : '-'}
              </div>
              <div className="text-[10px] text-gray-400">{d.monatLabel}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/** Saldo-Anzeige mit großer Zahl für Festgehaltfahrer */
function SaldoDisplay({
  umsatz,
  planKosten,
  fahrername,
  isTeilzeit = false
}: {
  umsatz: number
  planKosten: number
  fahrername: string
  isTeilzeit?: boolean
}) {
  const saldo = umsatz - planKosten
  const isPositiv = saldo >= 0

  return (
    <div className={`rounded-xl p-4 ${
      isPositiv ? 'bg-emerald-50 border-2 border-emerald-200' : 'bg-red-50 border-2 border-red-200'
    }`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-600">Saldo gegen Plan</span>
        <Badge className={`${
          isPositiv
            ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
            : 'bg-red-100 text-red-800 border-red-300'
        } border font-semibold`}>
          {isPositiv ? 'Im Plus' : 'Im Minus'}
        </Badge>
      </div>
      <div className={`text-3xl font-bold tracking-tight ${
        isPositiv ? 'text-emerald-700' : 'text-red-700'
      }`}>
        {isPositiv ? '+' : ''}{formatEuro(saldo)}
      </div>
      <div className="mt-2 text-xs text-gray-500 space-y-0.5">
        <div className="flex justify-between">
          <span>Umsatz:</span>
          <span className="font-medium">{formatEuro(umsatz)}</span>
        </div>
        <div className="flex justify-between">
          <span>Plan-Kosten:</span>
          <span className="font-medium">{formatEuro(planKosten)}</span>
        </div>
      </div>
      {isTeilzeit && (
        <div className="mt-2 flex items-center gap-1 text-[10px] text-amber-600">
          <AlertTriangle className="h-3 w-3" />
          <span>Teilzeit - Orientierungswert</span>
        </div>
      )}
    </div>
  )
}

/** Kostendeckungs-Status Badge */
function KostendeckungsStatusBadge({ status }: {
  status: 'ueber_ziel' | 'nahe_ziel' | 'unter_ziel' | 'operativ_pruefen' | null
}) {
  if (!status) return null

  const config = {
    'ueber_ziel': { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", label: "Ziel erreicht" },
    'nahe_ziel': { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", label: "Nahe Ziel" },
    'unter_ziel': { bg: "bg-red-50", text: "text-red-700", border: "border-red-200", label: "Unter Ziel" },
    'operativ_pruefen': { bg: "bg-gray-50", text: "text-gray-600", border: "border-gray-200", label: "Individuell prüfen" }
  }
  const c = config[status]

  return (
    <Badge className={`${c.bg} ${c.text} ${c.border} border font-medium text-xs`}>
      {c.label}
    </Badge>
  )
}

// ============================================================
// MAIN PAGE COMPONENT
// ============================================================

export default function AnalyticsPage() {
  const router = useRouter()
  const [userName, setUserName] = useState("")
  const [userRole, setUserRole] = useState<"admin" | "disponent">("admin")
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [timeRange, setTimeRange] = useState<AnalyticsTimeRange>("current_month")
  const [customStart, setCustomStart] = useState("")
  const [customEnd, setCustomEnd] = useState("")
  const [customError, setCustomError] = useState<string | null>(null)
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)

  // UI State
  const [selectedFahrer, setSelectedFahrer] = useState<FahrerLeistungKPI | null>(null)
  const [sortColumn, setSortColumn] = useState<"ertrag" | "umsatz" | "aktiveFahrtage" | "margenquote">("ertrag")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")
  const [showOperativeKPIs, setShowOperativeKPIs] = useState(false)
  const [showUploadDetails, setShowUploadDetails] = useState(false)
  const [selectedUploadFahrer, setSelectedUploadFahrer] = useState<FahrerUploadComplianceDetail | null>(null)
  const [showVerfuegbarkeitDetails, setShowVerfuegbarkeitDetails] = useState(false)
  const [selectedVerfuegbarkeitFahrer, setSelectedVerfuegbarkeitFahrer] = useState<FahrerVerfuegbarkeitsDetail | null>(null)

  // PDF Export Handler für Verfügbarkeit vs. Einsatz
  const generateVerfuegbarkeitPDF = async () => {
    if (!analytics?.compliance?.verfuegbarkeitsDetail) return

    try {
      // Dynamischer Import von jspdf und jspdf-autotable
      const { jsPDF } = await import('jspdf')
      const autoTable = (await import('jspdf-autotable')).default

      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      })

      // Logo / Header
      doc.setFontSize(18)
      doc.setTextColor(0, 82, 147) // TransNext Blau
      doc.text('TransNext Logistik', 14, 15)

      doc.setFontSize(14)
      doc.setTextColor(60, 60, 60)
      doc.text('Verfügbarkeit vs. Einsatz Report', 14, 24)

      doc.setFontSize(10)
      doc.setTextColor(120, 120, 120)
      doc.text(`Zeitraum: ${analytics.zeitraum.label}`, 14, 31)
      doc.text(`Erstellt: ${new Date().toLocaleString('de-DE')}`, 14, 36)

      // Summary KPIs
      const summaryY = 44
      doc.setFontSize(11)
      doc.setTextColor(60, 60, 60)
      doc.text('Zusammenfassung:', 14, summaryY)

      doc.setFontSize(9)
      const summary = analytics.compliance.summary
      const summaryText = [
        `Ø Einsatzquote: ${summary.avgEinsatzQuote?.toFixed(0) ?? 'N/A'}%`,
        `Eingesetzte Tage: ${summary.gesamtEingesetzteTage}`,
        `Verfügbare Tage ohne Tour: ${summary.gesamtTageOhneTour}`,
        `Nicht gemeldete Tage: ${summary.gesamtNichtGemeldeteTage}`,
        `Fahrer mit ungenutzter Verfügbarkeit: ${summary.fahrerMitUngenutzterVerfuegbarkeit}`
      ]
      summaryText.forEach((text, idx) => {
        doc.text(text, 14 + (idx % 3) * 90, summaryY + 6 + Math.floor(idx / 3) * 5)
      })

      // Fahrer-Tabelle
      const tableData = analytics.compliance.verfuegbarkeitsDetail.map(f => [
        f.fahrer_name,
        `${f.einsatzquote}%`,
        f.verfuegbare_tage.toString(),
        f.tage_mit_tour.toString(),
        f.tage_ohne_tour.toString(),
        f.nichtGemeldeteTage.toString(),
        // Status-Zusammenfassung
        f.tageDetails.filter(t => t.status === 'eingesetzt').length.toString(),
        f.tageDetails.filter(t => t.status === 'verfuegbar_ohne_tour').length.toString(),
        f.tageDetails.filter(t => t.status === 'nicht_verfuegbar').length.toString(),
        f.tageDetails.filter(t => t.status === 'nicht_gemeldet').length.toString()
      ])

      autoTable(doc, {
        startY: summaryY + 18,
        head: [[
          'Fahrer',
          'Einsatz-%',
          'Verfügbar',
          'Mit Tour',
          'Ohne Tour',
          'N. gem.',
          'E (Tage)',
          'V (Tage)',
          '- (Tage)',
          '? (Tage)'
        ]],
        body: tableData,
        theme: 'striped',
        headStyles: {
          fillColor: [0, 82, 147],
          fontSize: 8,
          fontStyle: 'bold'
        },
        bodyStyles: {
          fontSize: 8
        },
        columnStyles: {
          0: { cellWidth: 40 },
          1: { cellWidth: 20, halign: 'center' },
          2: { cellWidth: 20, halign: 'center' },
          3: { cellWidth: 18, halign: 'center' },
          4: { cellWidth: 18, halign: 'center' },
          5: { cellWidth: 16, halign: 'center' },
          6: { cellWidth: 18, halign: 'center', fillColor: [220, 252, 231] },
          7: { cellWidth: 18, halign: 'center', fillColor: [254, 243, 199] },
          8: { cellWidth: 18, halign: 'center', fillColor: [243, 244, 246] },
          9: { cellWidth: 18, halign: 'center', fillColor: [254, 226, 226] }
        },
        margin: { left: 14, right: 14 }
      })

      // Legende
      const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10
      doc.setFontSize(8)
      doc.setTextColor(100, 100, 100)
      doc.text('Legende: E = Eingesetzt (Tour gefahren) | V = Verfügbar ohne Tour | - = Nicht verfügbar | ? = Nicht gemeldet', 14, finalY)
      doc.text('N. gem. = Nicht gemeldete Werktage (Mo-Fr) im Zeitraum', 14, finalY + 4)

      // Footer
      const pageCount = doc.getNumberOfPages()
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i)
        doc.setFontSize(8)
        doc.setTextColor(150, 150, 150)
        doc.text(
          `Seite ${i} von ${pageCount} | TransNext Logistik GmbH | Vertraulich`,
          doc.internal.pageSize.width / 2,
          doc.internal.pageSize.height - 10,
          { align: 'center' }
        )
      }

      // Download
      const filename = `Verfuegbarkeit_Einsatz_${analytics.zeitraum.start}_bis_${analytics.zeitraum.end}.pdf`
      doc.save(filename)

    } catch (err) {
      console.error('PDF-Export Fehler:', err)
      alert('PDF-Export fehlgeschlagen. Bitte versuchen Sie es erneut.')
    }
  }

  useEffect(() => {
    checkAuthAndLoad()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const checkAuthAndLoad = async () => {
    try {
      const user = await getCurrentUser()
      if (!user) {
        router.push("/admin")
        return
      }
      const profile = await getUserProfile(user.id)
      const role = profile.role as string
      if (role !== "admin" && role !== "gf") {
        router.push("/admin/dashboard")
        return
      }
      setUserRole("admin")
      setUserName(profile.full_name)
      await loadAnalytics(timeRange)
      setIsLoading(false)
    } catch {
      router.push("/admin")
    }
  }

  const loadAnalytics = async (range: AnalyticsTimeRange, start?: string, end?: string) => {
    try {
      setIsRefreshing(true)
      setLoadError(null)
      if (range === "custom") {
        const error = validateCustomTimeRange(start, end)
        if (error) {
          setCustomError(error)
          setIsRefreshing(false)
          return
        }
        setCustomError(null)
      }
      const data = await calculateAnalytics({ range, customStart: start, customEnd: end })
      setAnalytics(data)
      setSelectedFahrer(null)
    } catch (err) {
      console.error("Fehler beim Laden der Analytics:", err)
      setLoadError(err instanceof Error ? err.message : "Unbekannter Fehler")
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleTimeRangeChange = async (value: string) => {
    const newRange = value as AnalyticsTimeRange
    setTimeRange(newRange)
    setCustomError(null)
    if (newRange !== "custom") {
      await loadAnalytics(newRange)
    }
  }

  const handleApplyCustomRange = async () => {
    await loadAnalytics("custom", customStart, customEnd)
  }

  const handleRefresh = async () => {
    if (timeRange === "custom") {
      await loadAnalytics(timeRange, customStart, customEnd)
    } else {
      await loadAnalytics(timeRange)
    }
  }

  const handleLogout = async () => {
    await signOut()
    router.push("/admin")
  }

  // Sortierte Fahrerliste
  const sortedFahrer = analytics?.fahrer.alleFahrer
    ? [...analytics.fahrer.alleFahrer].sort((a, b) => {
        let aVal = 0, bVal = 0
        switch (sortColumn) {
          case "ertrag": aVal = a.ertrag ?? 0; bVal = b.ertrag ?? 0; break
          case "umsatz": aVal = a.umsatz; bVal = b.umsatz; break
          case "aktiveFahrtage": aVal = a.aktiveFahrtage; bVal = b.aktiveFahrtage; break
          case "margenquote": aVal = a.margenquote ?? 0; bVal = b.margenquote ?? 0; break
        }
        return sortDirection === "desc" ? bVal - aVal : aVal - bVal
      })
    : []

  const handleSort = (column: typeof sortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "desc" ? "asc" : "desc")
    } else {
      setSortColumn(column)
      setSortDirection("desc")
    }
  }

  if (isLoading) {
    return (
      <AdminLayout userName={userName} userRole={userRole} onLogout={handleLogout}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-blue" />
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout userName={userName} userRole={userRole} onLogout={handleLogout}>
      <div className="space-y-6">
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
            <p className="text-gray-500 mt-1">Umsatz, Ertrag und Fahrerprofitabilität</p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={timeRange} onValueChange={handleTimeRangeChange}>
              <SelectTrigger className="w-[220px]">
                <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                <SelectValue placeholder="Zeitraum wählen" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="current_month">Aktueller Monat</SelectItem>
                <SelectItem value="last_month">Letzter Monat</SelectItem>
                <SelectItem value="current_quarter">Aktuelles Quartal</SelectItem>
                <SelectItem value="last_quarter">Letztes Quartal</SelectItem>
                <SelectItem value="current_year">Aktuelles Jahr</SelectItem>
                <SelectItem value="last_year">Letztes Jahr</SelectItem>
                <SelectItem value="since_dec_2025">Seit Dezember 2025</SelectItem>
                <SelectItem value="custom">Benutzerdefiniert...</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={handleRefresh} disabled={isRefreshing}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
              Aktualisieren
            </Button>
          </div>
        </div>

        {/* Custom Zeitraum */}
        {timeRange === "custom" && (
          <Card className="border-gray-200 bg-white">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
                <div className="flex-1 grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="customStart" className="text-sm text-gray-600 mb-1 block">Startdatum</Label>
                    <Input id="customStart" type="date" value={customStart} onChange={(e) => { setCustomStart(e.target.value); setCustomError(null) }} />
                  </div>
                  <div>
                    <Label htmlFor="customEnd" className="text-sm text-gray-600 mb-1 block">Enddatum</Label>
                    <Input id="customEnd" type="date" value={customEnd} onChange={(e) => { setCustomEnd(e.target.value); setCustomError(null) }} />
                  </div>
                </div>
                <Button onClick={handleApplyCustomRange} disabled={isRefreshing || !customStart || !customEnd}>
                  <Check className="h-4 w-4 mr-2" />Anwenden
                </Button>
              </div>
              {customError && <p className="text-sm text-red-600 mt-2 flex items-center gap-1"><AlertCircle className="h-4 w-4" />{customError}</p>}
            </CardContent>
          </Card>
        )}

        {/* Error State */}
        {loadError && (
          <Card className="border-red-200 bg-red-50/50">
            <CardContent className="p-4 flex items-center gap-3">
              <XCircle className="h-5 w-5 text-red-600" />
              <div>
                <p className="text-sm font-medium text-red-900">Fehler beim Laden</p>
                <p className="text-sm text-red-700">{loadError}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {!analytics && !loadError && (
          <Card className="border-gray-100">
            <CardContent className="p-8">
              <EmptyState title="Keine Daten" description="Es wurden keine Daten für den gewählten Zeitraum gefunden." icon={<BarChart3 className="h-16 w-16 text-gray-400" />} />
            </CardContent>
          </Card>
        )}

        {analytics && (
          <>
            {/* Zeitraum-Info */}
            <Card className="border-gray-100 bg-gray-50/50">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-700">
                    Zeitraum: <strong>{analytics.zeitraum.label}</strong>
                    {analytics.zeitraum.istMonat && <Badge variant="outline" className="ml-2 text-xs">Monat</Badge>}
                  </span>
                </div>
                <span className="text-xs text-gray-400">
                  Berechnet: {new Date(analytics.berechnetAm).toLocaleString("de-DE")}
                </span>
              </CardContent>
            </Card>

            {/* ============================================================ */}
            {/* MANAGEMENT SUMMARY */}
            {/* ============================================================ */}
            <div>
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Management Summary</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                <SummaryKPICard
                  title="Umsatz"
                  value={<CurrencyDisplay amount={analytics.finanzen.umsatz} bold />}
                  subtitle={`${analytics.qualitaet.tourenGenehmigt} Touren`}
                  icon={Euro}
                  iconBgClass="bg-emerald-50"
                  iconTextClass="text-emerald-600"
                />
                <SummaryKPICard
                  title="Ertrag (netto)"
                  value={<CurrencyDisplay amount={analytics.finanzen.margeNachArbeitgeberkosten} bold />}
                  subtitle="Nach AG-Kosten"
                  icon={TrendingUp}
                  iconBgClass={analytics.finanzen.margeNachArbeitgeberkosten >= 0 ? "bg-emerald-50" : "bg-red-50"}
                  iconTextClass={analytics.finanzen.margeNachArbeitgeberkosten >= 0 ? "text-emerald-600" : "text-red-600"}
                />
                <SummaryKPICard
                  title="Margenquote"
                  value={analytics.finanzen.margenquote !== null ? `${analytics.finanzen.margenquote.toFixed(1)}%` : "N/A"}
                  subtitle="Ertrag / Umsatz"
                  icon={Percent}
                  iconBgClass={
                    (analytics.finanzen.margenquote ?? 0) >= 15 ? "bg-emerald-50" :
                    (analytics.finanzen.margenquote ?? 0) >= 5 ? "bg-amber-50" : "bg-red-50"
                  }
                  iconTextClass={
                    (analytics.finanzen.margenquote ?? 0) >= 15 ? "text-emerald-600" :
                    (analytics.finanzen.margenquote ?? 0) >= 5 ? "text-amber-600" : "text-red-600"
                  }
                />
                <SummaryKPICard
                  title="Fahrerlohn"
                  value={<CurrencyDisplay amount={analytics.finanzen.fahrerlohn} bold />}
                  subtitle="Kosten"
                  icon={Users}
                  iconBgClass="bg-violet-50"
                  iconTextClass="text-violet-600"
                />
                <SummaryKPICard
                  title="Aktive Fahrer"
                  value={analytics.fahrer.fahrerMitTouren}
                  subtitle={`${analytics.fahrer.aktiveFahrtageGesamt} Fahrtage`}
                  icon={CalendarDays}
                  iconBgClass="bg-sky-50"
                  iconTextClass="text-sky-600"
                />
                <SummaryKPICard
                  title="Ertrag/Tour"
                  value={analytics.finanzen.ertragProTour !== null ? <CurrencyDisplay amount={analytics.finanzen.ertragProTour} bold /> : "N/A"}
                  subtitle="Durchschnitt"
                  icon={Target}
                  iconBgClass="bg-amber-50"
                  iconTextClass="text-amber-600"
                />
              </div>
            </div>

            {/* ============================================================ */}
            {/* KPI AMPELN */}
            {/* ============================================================ */}
            <div>
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Status-Ampeln</h2>
              <Card className="border-gray-100">
                <CardContent className="p-5">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    {/* Margenquote */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">Margenquote</span>
                        <Badge className={`border font-semibold ${
                          (analytics.finanzen.margenquote ?? 0) >= 15 ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                          (analytics.finanzen.margenquote ?? 0) >= 5 ? "bg-amber-50 text-amber-700 border-amber-200" :
                          "bg-red-50 text-red-700 border-red-200"
                        }`}>
                          {analytics.finanzen.margenquote?.toFixed(1) ?? "N/A"}%
                        </Badge>
                      </div>
                      <KpiTrafficLight value={analytics.finanzen.margenquote ?? 0} min={0} max={30} yellowThreshold={5} redThreshold={15} description="Ziel: >15%" />
                    </div>

                    {/* Ertrag */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">Ertrag</span>
                        <Badge className={`border font-semibold ${
                          analytics.finanzen.margeNachArbeitgeberkosten > 500 ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                          analytics.finanzen.margeNachArbeitgeberkosten > 0 ? "bg-amber-50 text-amber-700 border-amber-200" :
                          "bg-red-50 text-red-700 border-red-200"
                        }`}>
                          {analytics.finanzen.margeNachArbeitgeberkosten >= 0 ? "Positiv" : "Negativ"}
                        </Badge>
                      </div>
                      <KpiTrafficLight value={Math.min(analytics.finanzen.margeNachArbeitgeberkosten, 2000)} min={0} max={2000} yellowThreshold={100} redThreshold={500} description="Ziel: Positiv" />
                    </div>

                    {/* Minijob-Zieltage (nur für Minijob-Fahrer relevant) */}
                    {analytics.zeitraum.istMonat && analytics.fahrer.minijobFahrerMitTouren > 0 && (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-700">Minijob-Zieltage</span>
                          <Badge className={`border font-semibold ${
                            analytics.fahrer.fahrerUnterZiel === 0 ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                            analytics.fahrer.fahrerUnterZiel <= 2 ? "bg-amber-50 text-amber-700 border-amber-200" :
                            "bg-red-50 text-red-700 border-red-200"
                          }`}>
                            {analytics.fahrer.minijobFahrerMitTouren - analytics.fahrer.fahrerUnterZiel}/{analytics.fahrer.minijobFahrerMitTouren} erreicht
                          </Badge>
                        </div>
                        <KpiTrafficLight value={analytics.fahrer.minijobFahrerMitTouren - analytics.fahrer.fahrerUnterZiel} min={0} max={analytics.fahrer.minijobFahrerMitTouren || 1} yellowThreshold={Math.floor((analytics.fahrer.minijobFahrerMitTouren || 1) * 0.7)} redThreshold={analytics.fahrer.minijobFahrerMitTouren || 1} description="Minijob: mind. 6 Tage" />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* ============================================================ */}
            {/* DIAGRAMME */}
            {/* ============================================================ */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Top Minijobfahrer nach Ertrag - NUR Minijob! */}
              <Card className="border-gray-100">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold text-gray-900">Top Minijobfahrer nach Ertrag</CardTitle>
                  <CardDescription>Nur tourbasierte Minijobfahrer (Festgehalt → Controlling)</CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  {(analytics.fahrer.topMinijobFahrerErtrag?.length ?? 0) > 0 ? (
                    <SimpleBarChart
                      data={(analytics.fahrer.topMinijobFahrerErtrag ?? []).slice(0, 5).map(f => ({ name: f.name.split(" ")[0], value: f.ertrag }))}
                      maxValue={Math.max(...(analytics.fahrer.topMinijobFahrerErtrag ?? []).map(f => f.ertrag), 1)}
                      label="€"
                      color="bg-emerald-500"
                    />
                  ) : (
                    <p className="text-sm text-gray-400">Keine Minijobfahrer mit Touren</p>
                  )}
                </CardContent>
              </Card>

              {/* Top Fahrer nach Umsatz - ALLE Fahrer */}
              <Card className="border-gray-100">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold text-gray-900">Top Fahrer nach Umsatz</CardTitle>
                  <CardDescription>Alle Fahrer nach generiertem Umsatz</CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  {(analytics.fahrer.topFahrerUmsatz?.length ?? 0) > 0 ? (
                    <SimpleBarChart
                      data={(analytics.fahrer.topFahrerUmsatz ?? []).slice(0, 5).map(f => ({ name: f.name.split(" ")[0], value: f.umsatz }))}
                      maxValue={Math.max(...(analytics.fahrer.topFahrerUmsatz ?? []).map(f => f.umsatz), 1)}
                      label="€"
                      color="bg-sky-500"
                    />
                  ) : (
                    <p className="text-sm text-gray-400">Keine Daten</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Einsatztage getrennt nach Vergütungsmodell */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Einsatztage Minijobfahrer */}
              {analytics.fahrer.minijobFahrerMitTouren > 0 && (
                <Card className="border-gray-100">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-semibold text-gray-900">Einsatztage Minijobfahrer</CardTitle>
                    <CardDescription>{analytics.zeitraum.istMonat ? "Minijob-Ziel: mind. 6 Tage" : "Sortiert nach Einsatztagen"}</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <SimpleBarChart
                      data={[...(analytics.fahrer.minijobFahrer ?? [])].sort((a, b) => b.aktiveFahrtage - a.aktiveFahrtage).slice(0, 5).map(f => ({ name: f.name.split(" ")[0], value: f.aktiveFahrtage }))}
                      maxValue={Math.max(...(analytics.fahrer.minijobFahrer ?? []).map(f => f.aktiveFahrtage), analytics.zeitraum.istMonat ? 6 : 1)}
                      label="Tage"
                      color="bg-sky-500"
                    />
                    {analytics.zeitraum.istMonat && (
                      <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                        <div className="w-3 h-0.5 bg-amber-400"></div>
                        <span>Minijob-Zielmarke: 6 Tage</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Einsatztage Festgehaltfahrer - OHNE 6-Tage-Ziel */}
              {analytics.fahrer.festgehaltFahrerMitTouren > 0 && (
                <Card className="border-gray-100">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-semibold text-gray-900">Einsatztage Festgehaltfahrer</CardTitle>
                    <CardDescription>
                      {analytics.fahrer.monatsArbeitstage > 0
                        ? `Monatsarbeitstage: ${analytics.fahrer.monatsArbeitstage} (Mo-Fr abzgl. Feiertage)`
                        : "Sortiert nach Einsatztagen"
                      }
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <SimpleBarChart
                      data={[...(analytics.fahrer.festgehaltFahrer ?? [])].sort((a, b) => b.aktiveFahrtage - a.aktiveFahrtage).slice(0, 5).map(f => ({ name: f.name.split(" ")[0], value: f.aktiveFahrtage }))}
                      maxValue={Math.max(...(analytics.fahrer.festgehaltFahrer ?? []).map(f => f.aktiveFahrtage), analytics.fahrer.monatsArbeitstage || 1)}
                      label="Tage"
                      color="bg-violet-500"
                    />
                    <div className="mt-2 text-xs text-gray-500">
                      <Info className="inline h-3 w-3 mr-1" />
                      Teilzeit: Solltage individuell. Vollzeit: {analytics.fahrer.monatsArbeitstage} Soll-Arbeitstage
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* ============================================================ */}
            {/* MONATLICHE LEISTUNGSENTWICKLUNG - LINIENDIAGRAMM */}
            {/* ============================================================ */}
            {analytics.trendSixMonths && analytics.trendSixMonths.monatsDaten.length >= 1 && (
              <Card className="border-gray-100">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <LineChartIcon className="h-5 w-5 text-violet-600" />
                    <CardTitle className="text-base font-semibold text-gray-900">Monatliche Leistungsentwicklung</CardTitle>
                    {analytics.trendSixMonths.trend !== 'n/a' && (
                      <Badge className={`ml-2 border font-medium ${
                        analytics.trendSixMonths.trend === 'up' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        analytics.trendSixMonths.trend === 'down' ? 'bg-red-50 text-red-700 border-red-200' :
                        'bg-gray-50 text-gray-600 border-gray-200'
                      }`}>
                        {analytics.trendSixMonths.trend === 'up' && <ArrowUp className="h-3 w-3 mr-1" />}
                        {analytics.trendSixMonths.trend === 'down' && <ArrowDown className="h-3 w-3 mr-1" />}
                        {analytics.trendSixMonths.trend === 'flat' && <Minus className="h-3 w-3 mr-1" />}
                        {analytics.trendSixMonths.trend === 'up' ? 'Aufwärts' :
                         analytics.trendSixMonths.trend === 'down' ? 'Abwärts' : 'Stabil'}
                      </Badge>
                    )}
                  </div>
                  <CardDescription>Umsatz und Marge im Monatsvergleich (letzte {analytics.trendSixMonths.monatsDaten.length} Monate)</CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <MonthlyLineChart
                    data={analytics.trendSixMonths.monatsDaten}
                    showMarge={true}
                  />
                </CardContent>
              </Card>
            )}

            {/* ============================================================ */}
            {/* FESTGEHALTFAHRER – CONTROLLING */}
            {/* ============================================================ */}
            {analytics.fahrer.festgehaltFahrer && analytics.fahrer.festgehaltFahrer.length > 0 && (
              <div>
                <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Briefcase className="h-4 w-4" />
                  Festgehaltfahrer – Controlling
                </h2>

                {/* Planwert-Hinweis */}
                <Card className="border-amber-200 bg-amber-50/30 mb-4">
                  <CardContent className="p-3 flex items-start gap-2">
                    <Info className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                    <div className="text-xs text-amber-800">
                      <span className="font-medium">Planwerte für Controlling:</span>{' '}
                      Bruttogehalt {FIXED_SALARY_DEFAULT_GROSS.toLocaleString('de-DE')} € +{' '}
                      {(FIXED_SALARY_EMPLOYER_COST_RATE * 100).toFixed(0)}% AG-Kosten +{' '}
                      {FIXED_SALARY_ADDITIONAL_COST.toLocaleString('de-DE')} € Zusatzkosten ={' '}
                      <strong>{calculateFixedSalaryMonthlyCost().toLocaleString('de-DE')} € / Monat</strong>.
                      Diese Werte dienen der internen Kalkulation und sind nicht in der Fahrerakte hinterlegt.
                    </div>
                  </CardContent>
                </Card>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {analytics.fahrer.festgehaltFahrer.map((fahrer) => (
                    <Card key={fahrer.canonicalKey} className="border-gray-100 hover:border-violet-200 transition-colors">
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <CardTitle className="text-sm font-semibold text-gray-900">{fahrer.name}</CardTitle>
                            <Badge className={`text-xs border font-medium ${
                              fahrer.compensationModel === 'fixed_salary_part_time'
                                ? "bg-violet-50 text-violet-700 border-violet-200"
                                : "bg-indigo-50 text-indigo-700 border-indigo-200"
                            }`}>
                              {fahrer.compensationModel === 'fixed_salary_part_time' ? 'Teilzeit' : 'Vollzeit'}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2">
                            <KostendeckungsStatusBadge status={fahrer.kostendeckungsStatus} />
                            {fahrer.fahrerId && (
                              <Link href={`/admin/fahrer/${fahrer.fahrerId}`} className="text-violet-600 hover:text-violet-800">
                                <FileText className="h-4 w-4" />
                              </Link>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        {/* PROMINENTE SALDO-ANZEIGE */}
                        <div className="mb-4">
                          <SaldoDisplay
                            umsatz={fahrer.umsatz}
                            planKosten={fahrer.planMonatskosten ?? calculateFixedSalaryMonthlyCost()}
                            fahrername={fahrer.name}
                            isTeilzeit={fahrer.compensationModel === 'fixed_salary_part_time'}
                          />
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {/* Umsatz */}
                          <div className="bg-gray-50 rounded p-2">
                            <p className="text-[10px] text-gray-500 uppercase">Umsatz</p>
                            <p className="text-sm font-semibold text-gray-900">
                              <CurrencyDisplay amount={fahrer.umsatz} />
                            </p>
                          </div>

                          {/* Touren */}
                          <div className="bg-gray-50 rounded p-2">
                            <p className="text-[10px] text-gray-500 uppercase">Touren</p>
                            <p className="text-sm font-semibold text-gray-900">{fahrer.touren}</p>
                          </div>

                          {/* Einsatztage */}
                          <div className="bg-gray-50 rounded p-2">
                            <p className="text-[10px] text-gray-500 uppercase">Einsatztage</p>
                            <p className="text-sm font-semibold text-gray-900">
                              {fahrer.aktiveFahrtage}
                            </p>
                          </div>

                          {/* Umsatz/Einsatztag */}
                          <div className="bg-gray-50 rounded p-2">
                            <p className="text-[10px] text-gray-500 uppercase">€/Einsatztag</p>
                            <p className="text-sm font-semibold text-gray-900">
                              {fahrer.umsatzProTag !== null ? <CurrencyDisplay amount={fahrer.umsatzProTag} /> : 'N/A'}
                            </p>
                          </div>

                          {/* Monatsarbeitstage (für ALLE Festgehaltfahrer) */}
                          <div className="bg-gray-50 rounded p-2">
                            <p className="text-[10px] text-gray-500 uppercase">Monatsarbeitstage</p>
                            <p className="text-sm font-semibold text-gray-900">
                              {fahrer.monatsArbeitstage ?? 'N/A'}
                            </p>
                            <p className="text-[10px] text-gray-400">Mo-Fr abzgl. Feiertage</p>
                          </div>

                          {/* Umsatz pro Monatsarbeitstag (für ALLE Festgehaltfahrer) */}
                          <div className={`rounded p-2 ${
                            fahrer.compensationModel === 'fixed_salary_part_time' ? 'bg-gray-50 border border-dashed border-gray-200' : 'bg-gray-50'
                          }`}>
                            <p className="text-[10px] text-gray-500 uppercase">
                              €/Monatsarbeitstag
                              {fahrer.compensationModel === 'fixed_salary_part_time' && <span className="text-amber-500"> *</span>}
                            </p>
                            <p className="text-sm font-semibold text-gray-900">
                              {fahrer.umsatzProMonatsArbeitstag !== null ? <CurrencyDisplay amount={fahrer.umsatzProMonatsArbeitstag} /> : 'N/A'}
                            </p>
                          </div>

                          {/* Plan-Monatskosten */}
                          <div className="bg-violet-50 rounded p-2">
                            <p className="text-[10px] text-violet-600 uppercase">Plan-Kosten</p>
                            <p className="text-sm font-semibold text-violet-700">
                              <CurrencyDisplay amount={fahrer.planMonatskosten ?? 0} />
                            </p>
                            <p className="text-[10px] text-violet-400">pro Monat</p>
                          </div>

                          {/* Tagesziel Kostendeckung (für ALLE Festgehaltfahrer als Orientierung) */}
                          <div className={`rounded p-2 ${
                            fahrer.compensationModel === 'fixed_salary_part_time' ? 'bg-gray-50 border border-dashed border-gray-200' : (
                              fahrer.kostendeckungsStatus === 'ueber_ziel' ? 'bg-emerald-50' :
                              fahrer.kostendeckungsStatus === 'nahe_ziel' ? 'bg-amber-50' :
                              fahrer.kostendeckungsStatus === 'unter_ziel' ? 'bg-red-50' : 'bg-gray-50'
                            )
                          }`}>
                            <p className="text-[10px] text-gray-500 uppercase">
                              Tagesziel
                              {fahrer.compensationModel === 'fixed_salary_part_time' && <span className="text-amber-500"> *</span>}
                            </p>
                            <p className={`text-sm font-semibold ${
                              fahrer.compensationModel === 'fixed_salary_part_time' ? 'text-gray-700' : (
                                fahrer.kostendeckungsStatus === 'ueber_ziel' ? 'text-emerald-700' :
                                fahrer.kostendeckungsStatus === 'nahe_ziel' ? 'text-amber-700' :
                                fahrer.kostendeckungsStatus === 'unter_ziel' ? 'text-red-700' : 'text-gray-700'
                              )
                            }`}>
                              {fahrer.tageszielKostendeckung !== null ? <CurrencyDisplay amount={fahrer.tageszielKostendeckung} /> : 'N/A'}
                            </p>
                            <p className="text-[10px] text-gray-400">zur Kostendeckung</p>
                          </div>

                          {/* Differenz zum Tagesziel */}
                          {fahrer.differenzZumTagesziel !== null && (
                            <div className={`rounded p-2 ${
                              fahrer.compensationModel === 'fixed_salary_part_time' ? 'bg-gray-50 border border-dashed border-gray-200' : (
                                fahrer.differenzZumTagesziel >= 0 ? 'bg-emerald-50' :
                                fahrer.differenzZumTagesziel >= -20 ? 'bg-amber-50' : 'bg-red-50'
                              )
                            }`}>
                              <p className="text-[10px] text-gray-500 uppercase">
                                Diff. Tagesziel
                                {fahrer.compensationModel === 'fixed_salary_part_time' && <span className="text-amber-500"> *</span>}
                              </p>
                              <p className={`text-sm font-semibold ${
                                fahrer.compensationModel === 'fixed_salary_part_time' ? 'text-gray-700' : (
                                  fahrer.differenzZumTagesziel >= 0 ? 'text-emerald-700' :
                                  fahrer.differenzZumTagesziel >= -20 ? 'text-amber-700' : 'text-red-700'
                                )
                              }`}>
                                {fahrer.differenzZumTagesziel >= 0 ? '+' : ''}<CurrencyDisplay amount={fahrer.differenzZumTagesziel} />
                              </p>
                            </div>
                          )}

                          {/* Vollzeit-spezifische Felder */}
                          {fahrer.compensationModel === 'fixed_salary_full_time' && (
                            <>
                              {/* Soll-Arbeitstage (nur Vollzeit) */}
                              {fahrer.sollArbeitstage !== null && (
                                <div className="bg-gray-50 rounded p-2">
                                  <p className="text-[10px] text-gray-500 uppercase">Soll-Arbeitstage</p>
                                  <p className="text-sm font-semibold text-gray-900">{fahrer.sollArbeitstage}</p>
                                </div>
                              )}

                              {/* Leerlauftage */}
                              {fahrer.leerlauftage !== null && (
                                <div className={`rounded p-2 ${
                                  fahrer.leerlauftage === 0 ? 'bg-emerald-50' :
                                  fahrer.leerlauftage <= 3 ? 'bg-amber-50' : 'bg-red-50'
                                }`}>
                                  <p className="text-[10px] text-gray-500 uppercase">Leerlauftage</p>
                                  <p className={`text-sm font-semibold ${
                                    fahrer.leerlauftage === 0 ? 'text-emerald-700' :
                                    fahrer.leerlauftage <= 3 ? 'text-amber-700' : 'text-red-700'
                                  }`}>
                                    {fahrer.leerlauftage}
                                  </p>
                                </div>
                              )}

                              {/* Auslastung */}
                              {fahrer.auslastungsquote !== null && (
                                <div className={`rounded p-2 ${
                                  fahrer.auslastungsquote >= 80 ? 'bg-emerald-50' :
                                  fahrer.auslastungsquote >= 50 ? 'bg-amber-50' : 'bg-red-50'
                                }`}>
                                  <p className="text-[10px] text-gray-500 uppercase">Auslastung</p>
                                  <p className={`text-sm font-semibold ${
                                    fahrer.auslastungsquote >= 80 ? 'text-emerald-700' :
                                    fahrer.auslastungsquote >= 50 ? 'text-amber-700' : 'text-red-700'
                                  }`}>
                                    {fahrer.auslastungsquote.toFixed(0)}%
                                  </p>
                                </div>
                              )}
                            </>
                          )}
                        </div>

                        {/* Teilzeit-Hinweis */}
                        {fahrer.compensationModel === 'fixed_salary_part_time' && (
                          <div className="mt-3 flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
                            <AlertTriangle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                            <span>
                              <strong>Teilzeit-Festgehalt:</strong> Individuelle Solltage nicht hinterlegt.
                              Werte mit <span className="text-amber-500 font-bold">*</span> sind Orientierungswerte basierend auf Vollzeit-Arbeitstagen.
                              Operative Einzelfallprüfung erforderlich.
                            </span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* ============================================================ */}
            {/* FAHRER PERFORMANCE TABELLE */}
            {/* ============================================================ */}
            <Card className="border-gray-100">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-semibold text-gray-900">Fahrer-Performance</CardTitle>
                    <CardDescription>Alle Fahrer mit KPIs (klicken für Details)</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left py-2 px-2 font-medium text-gray-500">Fahrer</th>
                        <th className="text-right py-2 px-2 font-medium text-gray-500 cursor-pointer hover:text-gray-700" onClick={() => handleSort("aktiveFahrtage")}>
                          Einsatztage {sortColumn === "aktiveFahrtage" && (sortDirection === "desc" ? <ChevronDown className="inline h-3 w-3" /> : <ChevronUp className="inline h-3 w-3" />)}
                        </th>
                        <th className="text-center py-2 px-2 font-medium text-gray-500">Typ</th>
                        <th className="text-right py-2 px-2 font-medium text-gray-500">Touren</th>
                        <th className="text-right py-2 px-2 font-medium text-gray-500 cursor-pointer hover:text-gray-700" onClick={() => handleSort("umsatz")}>
                          Umsatz {sortColumn === "umsatz" && (sortDirection === "desc" ? <ChevronDown className="inline h-3 w-3" /> : <ChevronUp className="inline h-3 w-3" />)}
                        </th>
                        <th className="text-right py-2 px-2 font-medium text-gray-500 cursor-pointer hover:text-gray-700" onClick={() => handleSort("ertrag")}>
                          Ertrag {sortColumn === "ertrag" && (sortDirection === "desc" ? <ChevronDown className="inline h-3 w-3" /> : <ChevronUp className="inline h-3 w-3" />)}
                        </th>
                        <th className="text-right py-2 px-2 font-medium text-gray-500 cursor-pointer hover:text-gray-700" onClick={() => handleSort("margenquote")}>
                          Marge {sortColumn === "margenquote" && (sortDirection === "desc" ? <ChevronDown className="inline h-3 w-3" /> : <ChevronUp className="inline h-3 w-3" />)}
                        </th>
                        <th className="text-center py-2 px-2 font-medium text-gray-500">Bewertung</th>
                        <th className="text-center py-2 px-2 font-medium text-gray-500 w-12">Akte</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedFahrer.map((f) => {
                        const isFixedSalary = f.compensationModel !== 'tour_based_minijob'
                        return (
                        <tr
                          key={f.canonicalKey}
                          className={`border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors ${selectedFahrer?.canonicalKey === f.canonicalKey ? "bg-sky-50" : ""}`}
                          onClick={() => setSelectedFahrer(selectedFahrer?.canonicalKey === f.canonicalKey ? null : f)}
                        >
                          <td className="py-2 px-2 font-medium text-gray-900">{f.name}</td>
                          <td className="py-2 px-2 text-right text-gray-700">
                            {f.aktiveFahrtage}
                            {f.compensationModel === 'tour_based_minijob' && analytics.zeitraum.istMonat && (
                              f.zielErreicht ? <Check className="inline h-4 w-4 text-emerald-600 ml-1" /> : <span className="text-amber-500 ml-1">/ 6</span>
                            )}
                          </td>
                          <td className="py-2 px-2 text-center">
                            <Badge className={`text-xs border font-medium ${
                              f.compensationModel === 'tour_based_minijob'
                                ? "bg-sky-50 text-sky-700 border-sky-200"
                                : "bg-violet-50 text-violet-700 border-violet-200"
                            }`}>
                              {f.compensationModel === 'tour_based_minijob' ? 'Minijob' :
                               f.compensationModel === 'fixed_salary_part_time' ? 'TZ' : 'VZ'}
                            </Badge>
                          </td>
                          <td className="py-2 px-2 text-right text-gray-700">{f.touren}</td>
                          <td className="py-2 px-2 text-right text-gray-700"><CurrencyDisplay amount={f.umsatz} /></td>
                          {/* Ertrag: NUR für Minijob anzeigen, Festgehalt = "—" */}
                          <td className={`py-2 px-2 text-right font-medium ${
                            isFixedSalary ? "text-gray-400" : (f.ertrag >= 0 ? "text-emerald-700" : "text-red-700")
                          }`}>
                            {isFixedSalary ? (
                              <span title="Festgehaltfahrer: Siehe Controlling-Bereich">—</span>
                            ) : (
                              <CurrencyDisplay amount={f.ertrag} />
                            )}
                          </td>
                          {/* Marge: NUR für Minijob anzeigen, Festgehalt = "—" */}
                          <td className="py-2 px-2 text-right text-gray-700">
                            {isFixedSalary ? (
                              <span className="text-gray-400" title="Festgehaltfahrer: Siehe Controlling-Bereich">—</span>
                            ) : (
                              `${f.margenquote?.toFixed(1) ?? "N/A"}%`
                            )}
                          </td>
                          {/* Bewertung: Festgehalt = "Controlling" Badge */}
                          <td className="py-2 px-2 text-center">
                            {isFixedSalary ? (
                              <Badge className="bg-violet-50 text-violet-700 border-violet-200 border font-medium text-xs">
                                Controlling
                              </Badge>
                            ) : (
                              <BewertungBadge bewertung={f.bewertung} />
                            )}
                          </td>
                          <td className="py-2 px-2 text-center">
                            {f.fahrerId ? (
                              <Link
                                href={`/admin/fahrer/${f.fahrerId}`}
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex items-center justify-center w-7 h-7 rounded hover:bg-sky-100 text-sky-600 hover:text-sky-800 transition-colors"
                                title="Fahrerakte öffnen"
                              >
                                <FileText className="h-4 w-4" />
                              </Link>
                            ) : (
                              <span className="text-gray-300" title="Keine Fahrerakte">
                                <Minus className="h-4 w-4" />
                              </span>
                            )}
                          </td>
                        </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* ============================================================ */}
            {/* FAHRER DETAIL */}
            {/* ============================================================ */}
            {selectedFahrer && (
              <Card className="border-sky-200 bg-sky-50/30">
                <CardHeader className="pb-3">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <CardTitle className="text-base font-semibold text-gray-900">
                        {selectedFahrer.name} - Details
                      </CardTitle>
                      <BewertungBadge bewertung={selectedFahrer.bewertung} />
                    </div>
                    {/* Link zur Fahrerakte */}
                    {selectedFahrer.fahrerId ? (
                      <Link href={`/admin/fahrer/${selectedFahrer.fahrerId}`}>
                        <Button variant="outline" size="sm" className="bg-white hover:bg-sky-50 border-sky-200 text-sky-700">
                          <FileText className="h-4 w-4 mr-2" />
                          Fahrerakte öffnen
                          <ExternalLink className="h-3 w-3 ml-1.5 opacity-60" />
                        </Button>
                      </Link>
                    ) : (
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        Keine Fahrerakte verfügbar
                      </span>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  {/* Vergütungsmodell-Badge */}
                  <div className="mb-4">
                    <Badge className={`text-xs border font-medium ${
                      selectedFahrer.compensationModel === 'tour_based_minijob'
                        ? "bg-sky-50 text-sky-700 border-sky-200"
                        : "bg-violet-50 text-violet-700 border-violet-200"
                    }`}>
                      {selectedFahrer.compensationModel === 'tour_based_minijob' ? 'Minijob / Tourbasiert' :
                       selectedFahrer.compensationModel === 'fixed_salary_part_time' ? 'Festgehalt Teilzeit' : 'Festgehalt Vollzeit'}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
                    <DetailKPICard label="Touren" value={selectedFahrer.touren} />

                    {/* Unterschiedliche KPIs je nach Vergütungsmodell */}
                    {selectedFahrer.compensationModel === 'tour_based_minijob' ? (
                      <>
                        <DetailKPICard
                          label="Einsatztage"
                          value={selectedFahrer.aktiveFahrtage}
                          sublabel={analytics.zeitraum.istMonat && selectedFahrer.zielErreicht ? "Minijob-Ziel erreicht" : analytics.zeitraum.istMonat ? "Minijob-Ziel: 6 Tage" : undefined}
                          variant={selectedFahrer.zielErreicht ? "success" : "default"}
                        />
                      </>
                    ) : selectedFahrer.compensationModel === 'fixed_salary_full_time' ? (
                      <>
                        <DetailKPICard
                          label="Einsatztage"
                          value={selectedFahrer.aktiveFahrtage}
                          sublabel={selectedFahrer.sollArbeitstage !== null ? `Soll: ${selectedFahrer.sollArbeitstage} Tage` : undefined}
                        />
                        <DetailKPICard
                          label="Auslastung"
                          value={selectedFahrer.auslastungsquote !== null ? `${selectedFahrer.auslastungsquote.toFixed(0)}%` : "N/A"}
                          variant={
                            (selectedFahrer.auslastungsquote ?? 0) >= 80 ? "success" :
                            (selectedFahrer.auslastungsquote ?? 0) >= 50 ? "warning" : "danger"
                          }
                        />
                        <DetailKPICard
                          label="Leerlauftage"
                          value={selectedFahrer.leerlauftage ?? "N/A"}
                          variant={
                            (selectedFahrer.leerlauftage ?? 0) === 0 ? "success" :
                            (selectedFahrer.leerlauftage ?? 0) <= 3 ? "warning" : "danger"
                          }
                        />
                      </>
                    ) : (
                      <>
                        <DetailKPICard
                          label="Einsatztage"
                          value={selectedFahrer.aktiveFahrtage}
                          sublabel="Teilzeit - individuelle Solltage"
                        />
                      </>
                    )}

                    <DetailKPICard label="Umsatz" value={<CurrencyDisplay amount={selectedFahrer.umsatz} />} />
                    <DetailKPICard label="Umsatz/Tag" value={selectedFahrer.umsatzProTag !== null ? <CurrencyDisplay amount={selectedFahrer.umsatzProTag} /> : "N/A"} />

                    {/* Ertrag/Marge NUR für Minijob anzeigen */}
                    {selectedFahrer.compensationModel === 'tour_based_minijob' ? (
                      <>
                        <DetailKPICard label="Ertrag" value={<CurrencyDisplay amount={selectedFahrer.ertrag} />} variant={selectedFahrer.ertrag >= 0 ? "success" : "danger"} />
                        <DetailKPICard label="Margenquote" value={`${selectedFahrer.margenquote?.toFixed(1) ?? "N/A"}%`} variant={(selectedFahrer.margenquote ?? 0) >= 15 ? "success" : (selectedFahrer.margenquote ?? 0) >= 5 ? "warning" : "danger"} />
                        <DetailKPICard label="Ertrag/Tag" value={selectedFahrer.ertragProTag !== null ? <CurrencyDisplay amount={selectedFahrer.ertragProTag} /> : "N/A"} variant={(selectedFahrer.ertragProTag ?? 0) > 0 ? "success" : "default"} />
                        <DetailKPICard label="Kostenquote" value={`${selectedFahrer.kostenquote?.toFixed(1) ?? "N/A"}%`} />
                      </>
                    ) : (
                      <>
                        {/* Festgehalt: Zeige Controlling-relevante KPIs statt tourbasierter Ertrag */}
                        <DetailKPICard label="Plan-Kosten" value={selectedFahrer.planMonatskosten !== null ? <CurrencyDisplay amount={selectedFahrer.planMonatskosten} /> : "N/A"} sublabel="pro Monat" />
                        {selectedFahrer.tageszielKostendeckung !== null && (
                          <DetailKPICard label="Tagesziel" value={<CurrencyDisplay amount={selectedFahrer.tageszielKostendeckung} />} sublabel="Kostendeckung" />
                        )}
                        {selectedFahrer.umsatzProMonatsArbeitstag !== null && (
                          <DetailKPICard
                            label="€/Monatsarbeitstag"
                            value={<CurrencyDisplay amount={selectedFahrer.umsatzProMonatsArbeitstag} />}
                            sublabel={selectedFahrer.compensationModel === 'fixed_salary_part_time' ? "Orientierung" : undefined}
                          />
                        )}
                        {selectedFahrer.differenzZumTagesziel !== null && (
                          <DetailKPICard
                            label="Diff. Tagesziel"
                            value={`${selectedFahrer.differenzZumTagesziel >= 0 ? '+' : ''}${selectedFahrer.differenzZumTagesziel.toFixed(0)} €`}
                            variant={selectedFahrer.differenzZumTagesziel >= 0 ? "success" : selectedFahrer.differenzZumTagesziel >= -20 ? "warning" : "danger"}
                          />
                        )}
                      </>
                    )}

                    <DetailKPICard label="Anteil Umsatz" value={`${selectedFahrer.anteilUmsatz?.toFixed(1) ?? "N/A"}%`} />
                  </div>

                  {/* Hinweise basierend auf Vergütungsmodell */}
                  {selectedFahrer.compensationModel === 'tour_based_minijob' && selectedFahrer.minijobAuslastung !== null && selectedFahrer.minijobAuslastung > 80 && (
                    <p className="mt-4 text-sm text-gray-500">
                      Hinweis: Fahrerlohn bei {selectedFahrer.minijobAuslastung.toFixed(0)}% der Minijob-Grenze. Ggf. Carryover oder Abrechnung beachten.
                    </p>
                  )}
                  {selectedFahrer.compensationModel === 'fixed_salary_part_time' && (
                    <p className="mt-4 text-sm text-gray-500 flex items-center gap-2">
                      <Info className="h-4 w-4" />
                      Teilzeit-Festgehalt: Individuelle Soll-Arbeitstage nicht hinterlegt. Auslastung kann nicht automatisch berechnet werden.
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* ============================================================ */}
            {/* FINANZÜBERSICHT */}
            {/* ============================================================ */}
            <Card className="border-gray-100">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Euro className="h-5 w-5 text-emerald-600" />
                  <CardTitle className="text-base font-semibold text-gray-900">Finanzübersicht</CardTitle>
                  <Badge variant="outline" className="text-xs text-gray-500 border-gray-200">Tourbasiert</Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                  <DetailKPICard label="Umsatz" value={<CurrencyDisplay amount={analytics.finanzen.umsatz} />} variant="success" />
                  <DetailKPICard label="Fahrerlohn" value={<CurrencyDisplay amount={analytics.finanzen.fahrerlohn} />} sublabel="tourbasiert" />
                  <DetailKPICard label="AG-Kosten" value={<CurrencyDisplay amount={analytics.finanzen.arbeitgeberkosten} />} sublabel="tourbasiert" />
                  <DetailKPICard label="Rohertrag" value={<CurrencyDisplay amount={analytics.finanzen.margeVorArbeitgeberkosten} />} sublabel="Vor AG-Kosten" />
                  <DetailKPICard label="Ertrag (netto)" value={<CurrencyDisplay amount={analytics.finanzen.margeNachArbeitgeberkosten} />} variant={analytics.finanzen.margeNachArbeitgeberkosten >= 0 ? "success" : "danger"} />
                  <DetailKPICard label="Margenquote" value={`${analytics.finanzen.margenquote?.toFixed(1) ?? "N/A"}%`} variant={(analytics.finanzen.margenquote ?? 0) >= 15 ? "success" : (analytics.finanzen.margenquote ?? 0) >= 5 ? "warning" : "danger"} />
                </div>
                {/* Hinweis bei Festgehaltfahrern */}
                {analytics.fahrer.festgehaltFahrerMitTouren > 0 && (
                  <div className="mt-4 flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
                    <AlertTriangle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                    <span>
                      <strong>Hinweis:</strong> Fahrerlohn/AG-Kosten/Ertrag/Marge enthalten nur tourbasierte Vergütung.
                      Festgehaltkosten ({analytics.fahrer.festgehaltFahrerMitTouren} Fahrer) werden im Bereich
                      <strong> Festgehaltfahrer – Controlling</strong> separat dargestellt.
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* ============================================================ */}
            {/* OPERATIVE KENNZAHLEN (SEKUNDÄR) */}
            {/* ============================================================ */}
            <div>
              <button
                onClick={() => setShowOperativeKPIs(!showOperativeKPIs)}
                className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-3"
              >
                {showOperativeKPIs ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                Operative Kennzahlen {showOperativeKPIs ? "ausblenden" : "anzeigen"}
              </button>

              {showOperativeKPIs && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Qualität */}
                  <Card className="border-gray-100">
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-2">
                        <Activity className="h-5 w-5 text-sky-600" />
                        <CardTitle className="text-base font-semibold text-gray-900">Touren-Qualität</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <DetailKPICard label="Gesamt" value={analytics.qualitaet.tourenGesamt} />
                        <DetailKPICard label="Genehmigt" value={analytics.qualitaet.tourenGenehmigt} variant="success" />
                        <DetailKPICard label="Offen" value={analytics.qualitaet.tourenOffen} variant={analytics.qualitaet.tourenOffen > 10 ? "warning" : "default"} />
                        <DetailKPICard label="Abgelehnt" value={analytics.qualitaet.tourenAbgelehnt} variant={analytics.qualitaet.tourenAbgelehnt > 0 ? "danger" : "default"} />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Auslagen */}
                  <Card className="border-gray-100">
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-2">
                        <Wallet className="h-5 w-5 text-amber-600" />
                        <CardTitle className="text-base font-semibold text-gray-900">Auslagen</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <DetailKPICard label="Gesamt" value={<CurrencyDisplay amount={analytics.auslagen.auslagenGesamt} />} sublabel={`${analytics.auslagen.anzahlGesamt} Nachweise`} />
                        <DetailKPICard label="Offen" value={<CurrencyDisplay amount={analytics.auslagen.auslagenOffen} />} variant={analytics.auslagen.anzahlOffen > 5 ? "warning" : "default"} />
                        <DetailKPICard label="Erstattet" value={<CurrencyDisplay amount={analytics.auslagen.auslagenErstattet} />} variant="success" />
                        <DetailKPICard label="Abgelehnt" value={<CurrencyDisplay amount={analytics.auslagen.auslagenAbgelehnt} />} variant={analytics.auslagen.anzahlAbgelehnt > 0 ? "danger" : "default"} />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>

            {/* ============================================================ */}
            {/* FAHRER-COMPLIANCE */}
            {/* ============================================================ */}
            {analytics.compliance && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Fahrer-Compliance</h2>

                  {/* Datenstatus-Anzeige */}
                  {analytics.compliance.datenStatus && (
                    <div className="flex items-center gap-2 text-xs">
                      {analytics.compliance.datenStatus.verfuegbarkeitGeladen ? (
                        <span className="flex items-center gap-1 text-emerald-600">
                          <Check className="h-3 w-3" />
                          {analytics.compliance.datenStatus.verfuegbarkeitAnzahl} Verfügbarkeiten geladen
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-amber-600">
                          <AlertTriangle className="h-3 w-3" />
                          Keine Verfügbarkeitsdaten
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Upload-Pünktlichkeit */}
                  <Card className="border-gray-100">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Clock className="h-5 w-5 text-blue-600" />
                          <CardTitle className="text-base font-semibold text-gray-900">Upload-Pünktlichkeit</CardTitle>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowUploadDetails(!showUploadDetails)}
                          className="text-xs"
                        >
                          {showUploadDetails ? <ChevronUp className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          <span className="ml-1">{showUploadDetails ? "Ausblenden" : "Details"}</span>
                        </Button>
                      </div>
                      <CardDescription>Abliefernachweise rechtzeitig hochgeladen</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
                        <DetailKPICard
                          label="Ø Pünktlichkeit"
                          value={analytics.compliance.summary.avgPuenktlichkeitsQuote !== null
                            ? `${analytics.compliance.summary.avgPuenktlichkeitsQuote.toFixed(0)}%`
                            : "N/A"
                          }
                          variant={(analytics.compliance.summary.avgPuenktlichkeitsQuote ?? 0) >= 90 ? "success" : (analytics.compliance.summary.avgPuenktlichkeitsQuote ?? 0) >= 70 ? "warning" : "danger"}
                        />
                        <DetailKPICard
                          label="Fahrer m. Verspätung"
                          value={analytics.compliance.summary.fahrerMitVerspaetungen}
                          variant={analytics.compliance.summary.fahrerMitVerspaetungen > 3 ? "warning" : "default"}
                        />
                        <DetailKPICard
                          label="Verspätete Touren"
                          value={analytics.compliance.alleVerspaetetenTouren?.length ?? 0}
                          variant={(analytics.compliance.alleVerspaetetenTouren?.length ?? 0) > 5 ? "warning" : "default"}
                        />
                      </div>

                      {/* Kurzliste der Fahrer */}
                      {!showUploadDetails && analytics.compliance.uploadCompliance.length > 0 && (
                        <div className="border-t border-gray-100 pt-3">
                          <p className="text-xs text-gray-500 mb-2">Top 5 Fahrer nach Pünktlichkeit:</p>
                          <div className="space-y-1.5">
                            {[...analytics.compliance.uploadCompliance]
                              .sort((a, b) => b.puenktlichkeits_quote - a.puenktlichkeits_quote)
                              .slice(0, 5)
                              .map((f) => (
                                <div key={f.user_id} className="flex items-center justify-between text-sm">
                                  <span className="text-gray-700">{f.fahrer_name}</span>
                                  <div className="flex items-center gap-2">
                                    <span className={`font-medium ${f.puenktlichkeits_quote >= 90 ? 'text-emerald-600' : f.puenktlichkeits_quote >= 70 ? 'text-amber-600' : 'text-red-600'}`}>
                                      {f.puenktlichkeits_quote}%
                                    </span>
                                    <span className="text-xs text-gray-400">
                                      ({f.verspaetete_uploads} verspätet)
                                    </span>
                                  </div>
                                </div>
                              ))}
                          </div>
                        </div>
                      )}

                      {/* Detaillierte Ansicht */}
                      {showUploadDetails && (
                        <div className="border-t border-gray-100 pt-3">
                          <p className="text-xs font-medium text-gray-600 mb-3">Alle Fahrer - klicken für Details:</p>
                          <div className="space-y-2 max-h-64 overflow-y-auto">
                            {[...analytics.compliance.uploadComplianceDetail]
                              .sort((a, b) => (b.verspaetete_uploads ?? 0) - (a.verspaetete_uploads ?? 0))
                              .map((f) => (
                                <div
                                  key={f.user_id}
                                  className={`p-2 rounded border cursor-pointer transition-colors ${
                                    selectedUploadFahrer?.user_id === f.user_id
                                      ? 'bg-blue-50 border-blue-200'
                                      : 'bg-gray-50 border-gray-100 hover:bg-gray-100'
                                  }`}
                                  onClick={() => setSelectedUploadFahrer(
                                    selectedUploadFahrer?.user_id === f.user_id ? null : f
                                  )}
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium text-gray-700">{f.fahrer_name}</span>
                                    <div className="flex items-center gap-3 text-xs">
                                      <span className={`font-medium ${f.puenktlichkeits_quote >= 90 ? 'text-emerald-600' : f.puenktlichkeits_quote >= 70 ? 'text-amber-600' : 'text-red-600'}`}>
                                        {f.puenktlichkeits_quote}%
                                      </span>
                                      <span className="text-gray-500">
                                        {f.total_uploads ?? 0} Touren
                                      </span>
                                      {(f.verspaetete_uploads ?? 0) > 0 && (
                                        <Badge variant="outline" className="text-amber-600 border-amber-200 text-xs">
                                          {f.verspaetete_uploads} verspätet
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                  {f.maxVerspaetungMinuten > 0 && (
                                    <p className="text-xs text-gray-400 mt-1">
                                      Max. Verspätung: {f.maxVerspaetungFormatiert}
                                    </p>
                                  )}
                                </div>
                              ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Verfügbarkeit vs. Einsatz */}
                  <Card className="border-gray-100">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CalendarCheck className="h-5 w-5 text-purple-600" />
                          <CardTitle className="text-base font-semibold text-gray-900">Verfügbarkeit vs. Einsatz</CardTitle>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowVerfuegbarkeitDetails(!showVerfuegbarkeitDetails)}
                            className="text-xs"
                          >
                            {showVerfuegbarkeitDetails ? <ChevronUp className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            <span className="ml-1">{showVerfuegbarkeitDetails ? "Ausblenden" : "Details"}</span>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => generateVerfuegbarkeitPDF()}
                            className="text-xs"
                            disabled={analytics.compliance.verfuegbarkeitsDetail.length === 0}
                          >
                            <Download className="h-4 w-4 mr-1" />
                            PDF
                          </Button>
                        </div>
                      </div>
                      <CardDescription>Gemeldete Verfügbarkeit und Touren-Einsätze</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                        <DetailKPICard
                          label="Ø Einsatzquote"
                          value={analytics.compliance.summary.avgEinsatzQuote !== null
                            ? `${analytics.compliance.summary.avgEinsatzQuote.toFixed(0)}%`
                            : "N/A"
                          }
                          variant={(analytics.compliance.summary.avgEinsatzQuote ?? 0) >= 80 ? "success" : (analytics.compliance.summary.avgEinsatzQuote ?? 0) >= 50 ? "warning" : "default"}
                        />
                        <DetailKPICard
                          label="Eingesetzt"
                          value={analytics.compliance.summary.gesamtEingesetzteTage}
                          sublabel="Tage"
                          variant="success"
                        />
                        <DetailKPICard
                          label="Ohne Tour"
                          value={analytics.compliance.summary.gesamtTageOhneTour}
                          sublabel="Tage"
                          variant={analytics.compliance.summary.gesamtTageOhneTour > 10 ? "warning" : "default"}
                        />
                        <DetailKPICard
                          label="Nicht gemeldet"
                          value={analytics.compliance.summary.gesamtNichtGemeldeteTage}
                          sublabel="Tage"
                          variant={analytics.compliance.summary.gesamtNichtGemeldeteTage > 20 ? "warning" : "default"}
                        />
                      </div>

                      {/* Kurzliste */}
                      {!showVerfuegbarkeitDetails && analytics.compliance.verfuegbarkeitsAuslastung.length > 0 && (
                        <div className="border-t border-gray-100 pt-3">
                          <p className="text-xs text-gray-500 mb-2">Fahrer mit verfügbaren Tagen ohne Tour:</p>
                          <div className="space-y-1.5">
                            {analytics.compliance.verfuegbarkeitsAuslastung
                              .filter(f => f.tage_ohne_tour > 0)
                              .sort((a, b) => b.tage_ohne_tour - a.tage_ohne_tour)
                              .slice(0, 5)
                              .map((f) => (
                                <div key={f.fahrer_id} className="flex items-center justify-between text-sm">
                                  <span className="text-gray-700">{f.fahrer_name}</span>
                                  <div className="flex items-center gap-2">
                                    <span className="text-amber-600 font-medium">
                                      {f.tage_ohne_tour} Tage
                                    </span>
                                    <span className="text-xs text-gray-400">
                                      (von {f.verfuegbare_tage} verfügbar)
                                    </span>
                                  </div>
                                </div>
                              ))}
                            {analytics.compliance.verfuegbarkeitsAuslastung.filter(f => f.tage_ohne_tour > 0).length === 0 && (
                              <p className="text-sm text-gray-400">Keine ungenutzten Verfügbarkeiten</p>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Detaillierte Ansicht */}
                      {showVerfuegbarkeitDetails && (
                        <div className="border-t border-gray-100 pt-3">
                          <p className="text-xs font-medium text-gray-600 mb-3">Alle Fahrer - klicken für Tagesdetails:</p>
                          <div className="space-y-2 max-h-64 overflow-y-auto">
                            {analytics.compliance.verfuegbarkeitsDetail.map((f) => (
                              <div
                                key={f.fahrer_id}
                                className={`p-2 rounded border cursor-pointer transition-colors ${
                                  selectedVerfuegbarkeitFahrer?.fahrer_id === f.fahrer_id
                                    ? 'bg-purple-50 border-purple-200'
                                    : 'bg-gray-50 border-gray-100 hover:bg-gray-100'
                                }`}
                                onClick={() => setSelectedVerfuegbarkeitFahrer(
                                  selectedVerfuegbarkeitFahrer?.fahrer_id === f.fahrer_id ? null : f
                                )}
                              >
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-medium text-gray-700">{f.fahrer_name}</span>
                                  <div className="flex items-center gap-2 text-xs">
                                    <span className={`font-medium ${f.einsatzquote >= 80 ? 'text-emerald-600' : f.einsatzquote >= 50 ? 'text-amber-600' : 'text-gray-500'}`}>
                                      {f.einsatzquote}%
                                    </span>
                                    <span className="text-gray-500">
                                      {f.tage_mit_tour}/{f.verfuegbare_tage} Tage
                                    </span>
                                    {f.nichtGemeldeteTage > 0 && (
                                      <Badge variant="outline" className="text-gray-500 border-gray-200 text-xs">
                                        {f.nichtGemeldeteTage} n.g.
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {analytics.compliance.verfuegbarkeitsAuslastung.length === 0 && (
                        <p className="text-sm text-gray-400">Keine Verfügbarkeitsdaten im Zeitraum</p>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Detailansicht: Verspätete Touren eines Fahrers */}
                {selectedUploadFahrer && selectedUploadFahrer.verspaeteteTouren.length > 0 && (
                  <Card className="mt-4 border-blue-200 bg-blue-50/30">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-semibold text-gray-900">
                          Verspätete Touren: {selectedUploadFahrer.fahrer_name}
                        </CardTitle>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedUploadFahrer(null)}
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-gray-200">
                              <th className="text-left py-2 px-2 text-xs font-medium text-gray-500">Tour-Nr</th>
                              <th className="text-left py-2 px-2 text-xs font-medium text-gray-500">Datum</th>
                              <th className="text-left py-2 px-2 text-xs font-medium text-gray-500">Soll-Frist</th>
                              <th className="text-left py-2 px-2 text-xs font-medium text-gray-500">Upload</th>
                              <th className="text-right py-2 px-2 text-xs font-medium text-gray-500">Verspätung</th>
                              <th className="text-center py-2 px-2 text-xs font-medium text-gray-500">Aktion</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedUploadFahrer.verspaeteteTouren.map((t) => (
                              <tr key={t.tourId} className="border-b border-gray-100 hover:bg-blue-50/50">
                                <td className="py-2 px-2 font-medium text-gray-700">{t.tourNr}</td>
                                <td className="py-2 px-2 text-gray-600">
                                  {new Date(t.datum).toLocaleDateString('de-DE')}
                                </td>
                                <td className="py-2 px-2 text-gray-500 text-xs">
                                  {new Date(t.sollFrist).toLocaleString('de-DE', {
                                    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
                                  })}
                                </td>
                                <td className="py-2 px-2 text-gray-500 text-xs">
                                  {t.uploadZeitpunkt ? new Date(t.uploadZeitpunkt).toLocaleString('de-DE', {
                                    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
                                  }) : '-'}
                                </td>
                                <td className="py-2 px-2 text-right">
                                  <Badge className={`text-xs ${
                                    t.verspaetungMinuten > 1440 ? 'bg-red-100 text-red-700' :
                                    t.verspaetungMinuten > 60 ? 'bg-amber-100 text-amber-700' :
                                    'bg-yellow-100 text-yellow-700'
                                  }`}>
                                    {t.verspaetungFormatiert}
                                  </Badge>
                                </td>
                                <td className="py-2 px-2 text-center">
                                  <Link
                                    href={`/admin/arbeitsnachweise?tour=${t.tourId}`}
                                    className="text-blue-600 hover:text-blue-800"
                                  >
                                    <ExternalLink className="h-4 w-4" />
                                  </Link>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Detailansicht: Tagesdetails eines Fahrers */}
                {selectedVerfuegbarkeitFahrer && selectedVerfuegbarkeitFahrer.tageDetails.length > 0 && (
                  <Card className="mt-4 border-purple-200 bg-purple-50/30">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-semibold text-gray-900">
                          Tagesdetails: {selectedVerfuegbarkeitFahrer.fahrer_name}
                        </CardTitle>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedVerfuegbarkeitFahrer(null)}
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </div>
                      <CardDescription>
                        Einsatzquote: {selectedVerfuegbarkeitFahrer.einsatzquote}% |
                        {selectedVerfuegbarkeitFahrer.tage_mit_tour} von {selectedVerfuegbarkeitFahrer.verfuegbare_tage} verfügbaren Tagen mit Tour
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="grid grid-cols-5 sm:grid-cols-7 lg:grid-cols-10 gap-1.5">
                        {selectedVerfuegbarkeitFahrer.tageDetails.map((tag) => {
                          const statusConfig = {
                            'eingesetzt': { bg: 'bg-emerald-100', border: 'border-emerald-300', text: 'text-emerald-700', label: 'E' },
                            'verfuegbar_ohne_tour': { bg: 'bg-amber-100', border: 'border-amber-300', text: 'text-amber-700', label: 'V' },
                            'nicht_verfuegbar': { bg: 'bg-gray-100', border: 'border-gray-300', text: 'text-gray-500', label: '-' },
                            'nicht_gemeldet': { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-400', label: '?' }
                          }
                          const cfg = statusConfig[tag.status]

                          return (
                            <div
                              key={tag.datum}
                              className={`p-1.5 rounded border text-center ${cfg.bg} ${cfg.border}`}
                              title={`${tag.wochentag} ${new Date(tag.datum).toLocaleDateString('de-DE')}: ${
                                tag.status === 'eingesetzt' ? `${tag.anzahlTouren} Tour(en)` :
                                tag.status === 'verfuegbar_ohne_tour' ? 'Verfügbar, keine Tour' :
                                tag.status === 'nicht_verfuegbar' ? 'Nicht verfügbar' :
                                'Nicht gemeldet'
                              }${tag.note ? ` - ${tag.note}` : ''}`}
                            >
                              <div className={`text-[10px] font-medium ${cfg.text}`}>{tag.wochentag}</div>
                              <div className={`text-xs font-bold ${cfg.text}`}>{cfg.label}</div>
                              <div className="text-[9px] text-gray-400">
                                {new Date(tag.datum).getDate()}.{new Date(tag.datum).getMonth() + 1}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                      <div className="flex gap-4 mt-3 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <div className="w-3 h-3 bg-emerald-100 border border-emerald-300 rounded"></div>
                          E = Eingesetzt
                        </span>
                        <span className="flex items-center gap-1">
                          <div className="w-3 h-3 bg-amber-100 border border-amber-300 rounded"></div>
                          V = Verfügbar
                        </span>
                        <span className="flex items-center gap-1">
                          <div className="w-3 h-3 bg-gray-100 border border-gray-300 rounded"></div>
                          - = Nicht verfügbar
                        </span>
                        <span className="flex items-center gap-1">
                          <div className="w-3 h-3 bg-red-50 border border-red-200 rounded"></div>
                          ? = Nicht gemeldet
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* Hinweis */}
            <Card className="border-gray-100 bg-gray-50/50">
              <CardContent className="p-4">
                <p className="text-sm text-gray-500">
                  Ertrag = Umsatz - Fahrerlohn - AG-Kosten.
                  AG-Kosten: {analytics.finanzen.arbeitgeberkostenQuelle === "tour" ? "aus Tour-Daten" :
                    analytics.finanzen.arbeitgeberkostenQuelle === "mixed" ? "gemischt (Tour + berechnet)" :
                    `${analytics.finanzen.employerContributionRateUsed.toFixed(2)}% (${analytics.finanzen.arbeitgeberkostenQuelle === "setting" ? "aus Einstellungen" : "Fallback"})`}.
                  Fahrer-Bewertung: Stark (Marge ≥15%, Ziel erreicht), Ausbauen (gute Marge, Ziel nicht erreicht), Prüfen (schwache Marge, aktiv).
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AdminLayout>
  )
}
