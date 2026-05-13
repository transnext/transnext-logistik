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
  type AnalyticsData,
  type AnalyticsTimeRange,
  type FahrerLeistungKPI,
  type FahrerBewertung
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
  ExternalLink
} from "lucide-react"

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

  const [timeRange, setTimeRange] = useState<AnalyticsTimeRange>("since_dec_2025")
  const [customStart, setCustomStart] = useState("")
  const [customEnd, setCustomEnd] = useState("")
  const [customError, setCustomError] = useState<string | null>(null)
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)

  // UI State
  const [selectedFahrer, setSelectedFahrer] = useState<FahrerLeistungKPI | null>(null)
  const [sortColumn, setSortColumn] = useState<"ertrag" | "umsatz" | "aktiveFahrtage" | "margenquote">("ertrag")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")
  const [showOperativeKPIs, setShowOperativeKPIs] = useState(false)

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

                    {/* Aktive Tage */}
                    {analytics.zeitraum.istMonat && (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-700">Fahrer-Ziel (6 Tage)</span>
                          <Badge className={`border font-semibold ${
                            analytics.fahrer.fahrerUnterZiel === 0 ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                            analytics.fahrer.fahrerUnterZiel <= 2 ? "bg-amber-50 text-amber-700 border-amber-200" :
                            "bg-red-50 text-red-700 border-red-200"
                          }`}>
                            {analytics.fahrer.fahrerMitTouren - analytics.fahrer.fahrerUnterZiel}/{analytics.fahrer.fahrerMitTouren} erreicht
                          </Badge>
                        </div>
                        <KpiTrafficLight value={analytics.fahrer.fahrerMitTouren - analytics.fahrer.fahrerUnterZiel} min={0} max={analytics.fahrer.fahrerMitTouren || 1} yellowThreshold={Math.floor((analytics.fahrer.fahrerMitTouren || 1) * 0.7)} redThreshold={analytics.fahrer.fahrerMitTouren || 1} description="Ziel: Alle >= 6 Tage" />
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
              {/* Top Fahrer nach Ertrag */}
              <Card className="border-gray-100">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold text-gray-900">Top 5 Fahrer nach Ertrag</CardTitle>
                  <CardDescription>Profitabelste Fahrer im Zeitraum</CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  {(analytics.fahrer.topFahrerErtrag?.length ?? 0) > 0 ? (
                    <SimpleBarChart
                      data={(analytics.fahrer.topFahrerErtrag ?? []).slice(0, 5).map(f => ({ name: f.name.split(" ")[0], value: f.ertrag }))}
                      maxValue={Math.max(...(analytics.fahrer.topFahrerErtrag ?? []).map(f => f.ertrag), 1)}
                      label="€"
                      color="bg-emerald-500"
                    />
                  ) : (
                    <p className="text-sm text-gray-400">Keine Daten</p>
                  )}
                </CardContent>
              </Card>

              {/* Aktive Fahrtage */}
              <Card className="border-gray-100">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold text-gray-900">Aktive Fahrtage je Fahrer</CardTitle>
                  <CardDescription>{analytics.zeitraum.istMonat ? "Ziel: mind. 6 Tage" : "Sortiert nach Tagen"}</CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  {(analytics.fahrer.alleFahrer?.length ?? 0) > 0 ? (
                    <>
                      <SimpleBarChart
                        data={[...(analytics.fahrer.alleFahrer ?? [])].sort((a, b) => b.aktiveFahrtage - a.aktiveFahrtage).slice(0, 5).map(f => ({ name: f.name.split(" ")[0], value: f.aktiveFahrtage }))}
                        maxValue={Math.max(...(analytics.fahrer.alleFahrer ?? []).map(f => f.aktiveFahrtage), analytics.zeitraum.istMonat ? 6 : 1)}
                        label="Tage"
                        color="bg-sky-500"
                      />
                      {analytics.zeitraum.istMonat && (
                        <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                          <div className="w-3 h-0.5 bg-amber-400"></div>
                          <span>Zielmarke: 6 aktive Tage</span>
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-gray-400">Keine Daten</p>
                  )}
                </CardContent>
              </Card>
            </div>

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
                          Tage {sortColumn === "aktiveFahrtage" && (sortDirection === "desc" ? <ChevronDown className="inline h-3 w-3" /> : <ChevronUp className="inline h-3 w-3" />)}
                        </th>
                        {analytics.zeitraum.istMonat && <th className="text-center py-2 px-2 font-medium text-gray-500">Ziel</th>}
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
                      {sortedFahrer.map((f) => (
                        <tr
                          key={f.canonicalKey}
                          className={`border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors ${selectedFahrer?.canonicalKey === f.canonicalKey ? "bg-sky-50" : ""}`}
                          onClick={() => setSelectedFahrer(selectedFahrer?.canonicalKey === f.canonicalKey ? null : f)}
                        >
                          <td className="py-2 px-2 font-medium text-gray-900">{f.name}</td>
                          <td className="py-2 px-2 text-right text-gray-700">{f.aktiveFahrtage}</td>
                          {analytics.zeitraum.istMonat && (
                            <td className="py-2 px-2 text-center">
                              {f.zielErreicht ? <Check className="inline h-4 w-4 text-emerald-600" /> : <Minus className="inline h-4 w-4 text-gray-400" />}
                            </td>
                          )}
                          <td className="py-2 px-2 text-right text-gray-700">{f.touren}</td>
                          <td className="py-2 px-2 text-right text-gray-700"><CurrencyDisplay amount={f.umsatz} /></td>
                          <td className={`py-2 px-2 text-right font-medium ${f.ertrag >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                            <CurrencyDisplay amount={f.ertrag} />
                          </td>
                          <td className="py-2 px-2 text-right text-gray-700">{f.margenquote?.toFixed(1) ?? "N/A"}%</td>
                          <td className="py-2 px-2 text-center"><BewertungBadge bewertung={f.bewertung} /></td>
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
                      ))}
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
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
                    <DetailKPICard label="Touren" value={selectedFahrer.touren} />
                    <DetailKPICard label="Aktive Tage" value={selectedFahrer.aktiveFahrtage} sublabel={analytics.zeitraum.istMonat && selectedFahrer.zielErreicht ? "Ziel erreicht" : undefined} variant={selectedFahrer.zielErreicht ? "success" : "default"} />
                    <DetailKPICard label="Umsatz" value={<CurrencyDisplay amount={selectedFahrer.umsatz} />} />
                    <DetailKPICard label="Fahrerlohn" value={<CurrencyDisplay amount={selectedFahrer.lohn} />} />
                    <DetailKPICard label="AG-Kosten" value={<CurrencyDisplay amount={selectedFahrer.arbeitgeberkosten} />} />
                    <DetailKPICard label="Ertrag" value={<CurrencyDisplay amount={selectedFahrer.ertrag} />} variant={selectedFahrer.ertrag >= 0 ? "success" : "danger"} />
                    <DetailKPICard label="Margenquote" value={`${selectedFahrer.margenquote?.toFixed(1) ?? "N/A"}%`} variant={(selectedFahrer.margenquote ?? 0) >= 15 ? "success" : (selectedFahrer.margenquote ?? 0) >= 5 ? "warning" : "danger"} />
                    <DetailKPICard label="Umsatz/Tag" value={selectedFahrer.umsatzProTag !== null ? <CurrencyDisplay amount={selectedFahrer.umsatzProTag} /> : "N/A"} />
                    <DetailKPICard label="Ertrag/Tag" value={selectedFahrer.ertragProTag !== null ? <CurrencyDisplay amount={selectedFahrer.ertragProTag} /> : "N/A"} variant={(selectedFahrer.ertragProTag ?? 0) > 0 ? "success" : "default"} />
                    <DetailKPICard label="Kostenquote" value={`${selectedFahrer.kostenquote?.toFixed(1) ?? "N/A"}%`} />
                    <DetailKPICard label="Anteil Umsatz" value={`${selectedFahrer.anteilUmsatz?.toFixed(1) ?? "N/A"}%`} />
                    <DetailKPICard label="Anteil Ertrag" value={`${selectedFahrer.anteilErtrag?.toFixed(1) ?? "N/A"}%`} />
                  </div>
                  {selectedFahrer.minijobAuslastung !== null && selectedFahrer.minijobAuslastung > 80 && (
                    <p className="mt-4 text-sm text-gray-500">
                      Hinweis: Fahrerlohn bei {selectedFahrer.minijobAuslastung.toFixed(0)}% der Minijob-Grenze. Ggf. Carryover oder Abrechnung beachten.
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
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                  <DetailKPICard label="Umsatz" value={<CurrencyDisplay amount={analytics.finanzen.umsatz} />} variant="success" />
                  <DetailKPICard label="Fahrerlohn" value={<CurrencyDisplay amount={analytics.finanzen.fahrerlohn} />} />
                  <DetailKPICard label="AG-Kosten" value={<CurrencyDisplay amount={analytics.finanzen.arbeitgeberkosten} />} />
                  <DetailKPICard label="Rohertrag" value={<CurrencyDisplay amount={analytics.finanzen.margeVorArbeitgeberkosten} />} sublabel="Vor AG-Kosten" />
                  <DetailKPICard label="Ertrag (netto)" value={<CurrencyDisplay amount={analytics.finanzen.margeNachArbeitgeberkosten} />} variant={analytics.finanzen.margeNachArbeitgeberkosten >= 0 ? "success" : "danger"} />
                  <DetailKPICard label="Margenquote" value={`${analytics.finanzen.margenquote?.toFixed(1) ?? "N/A"}%`} variant={(analytics.finanzen.margenquote ?? 0) >= 15 ? "success" : (analytics.finanzen.margenquote ?? 0) >= 5 ? "warning" : "danger"} />
                </div>
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
                <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Fahrer-Compliance</h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Upload-Pünktlichkeit */}
                  <Card className="border-gray-100">
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-2">
                        <Clock className="h-5 w-5 text-blue-600" />
                        <CardTitle className="text-base font-semibold text-gray-900">Upload-Pünktlichkeit</CardTitle>
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
                          label="Fahrer erfasst"
                          value={analytics.compliance.uploadCompliance.length}
                        />
                      </div>
                      {analytics.compliance.uploadCompliance.length > 0 && (
                        <div className="border-t border-gray-100 pt-3">
                          <p className="text-xs text-gray-500 mb-2">Top 5 Fahrer nach Pünktlichkeit:</p>
                          <div className="space-y-1.5">
                            {[...analytics.compliance.uploadCompliance]
                              .sort((a, b) => b.puenktlichkeits_quote - a.puenktlichkeits_quote)
                              .slice(0, 5)
                              .map((f, i) => (
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
                    </CardContent>
                  </Card>

                  {/* Verfügbarkeit vs. Einsatz */}
                  <Card className="border-gray-100">
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-2">
                        <CalendarCheck className="h-5 w-5 text-purple-600" />
                        <CardTitle className="text-base font-semibold text-gray-900">Verfügbarkeit vs. Einsatz</CardTitle>
                      </div>
                      <CardDescription>Gemeldete Verfügbarkeit und Touren-Einsätze</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
                        <DetailKPICard
                          label="Ø Einsatzquote"
                          value={analytics.compliance.summary.avgEinsatzQuote !== null
                            ? `${analytics.compliance.summary.avgEinsatzQuote.toFixed(0)}%`
                            : "N/A"
                          }
                          variant={(analytics.compliance.summary.avgEinsatzQuote ?? 0) >= 80 ? "success" : (analytics.compliance.summary.avgEinsatzQuote ?? 0) >= 50 ? "warning" : "default"}
                        />
                        <DetailKPICard
                          label="Verfügbar (ges.)"
                          value={analytics.compliance.summary.gesamtVerfuegbareTage}
                          sublabel="Tage"
                        />
                        <DetailKPICard
                          label="Ohne Tour"
                          value={analytics.compliance.summary.gesamtTageOhneTour}
                          sublabel="Tage"
                          variant={analytics.compliance.summary.gesamtTageOhneTour > 10 ? "warning" : "default"}
                        />
                      </div>
                      {analytics.compliance.verfuegbarkeitsAuslastung.length > 0 && (
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
                      {analytics.compliance.verfuegbarkeitsAuslastung.length === 0 && (
                        <p className="text-sm text-gray-400">Keine Verfügbarkeitsdaten im Zeitraum</p>
                      )}
                    </CardContent>
                  </Card>
                </div>
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
