"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AdminLayout } from "@/components/admin/AdminLayout"
import {
  getCurrentUser,
  getUserProfile,
  signOut
} from "@/lib/api"
import {
  getAllArbeitsnachweiseAdmin,
  getAllAuslagennachweiseAdmin,
  getAllFahrerAdmin
} from "@/lib/admin-api"
import { getOpenAlerts } from "@/lib/alerts-api"
import { getCorrectionRequests } from "@/lib/corrections-api"
import { getUpcomingAvailability } from "@/lib/availability-api"
import { calculateCockpitKennzahlen, filterCockpitForDisponent, type CockpitKennzahlen } from "@/lib/dashboard-calculator"
import { getDismissedSyntheticIds } from "@/lib/computed-alert-dismissals-api"
import {
  Car,
  FileText,
  Receipt,
  Users,
  Bell,
  CheckCircle,
  AlertTriangle,
  Newspaper,
  ArrowRight,
  Clock,
  TrendingUp,
  Calendar,
  AlertCircle,
  Settings,
  ClipboardCheck,
  UserCheck,
  ExternalLink
} from "lucide-react"

export default function AdminDashboardPage() {
  const router = useRouter()
  const [adminName, setAdminName] = useState("")
  const [userRole, setUserRole] = useState<'admin' | 'disponent' | 'gf'>('admin')
  const [isLoading, setIsLoading] = useState(true)
  const [kennzahlen, setKennzahlen] = useState<CockpitKennzahlen | null>(null)

  const isAdminOrGF = userRole === 'admin' || userRole === 'gf'

  useEffect(() => {
    checkAuthAndLoadData()
  }, [])

  const checkAuthAndLoadData = async () => {
    try {
      const user = await getCurrentUser()
      if (!user) {
        router.push("/admin")
        return
      }

      const profile = await getUserProfile(user.id)
      if (profile.role !== 'admin' && profile.role !== 'disponent' && profile.role !== 'gf') {
        router.push("/admin")
        return
      }

      setUserRole(profile.role as 'admin' | 'disponent' | 'gf')
      setAdminName(profile.full_name)

      await loadAllData(profile.role === 'admin' || profile.role === 'gf')
      setIsLoading(false)
    } catch (error) {
      console.error("Auth/Load Fehler:", error)
      router.push("/admin")
    }
  }

  const loadAllData = async (isAdmin: boolean) => {
    try {
      // Basis-Daten immer laden
      const [tourenData, auslagenData, fahrerData] = await Promise.all([
        getAllArbeitsnachweiseAdmin(),
        getAllAuslagennachweiseAdmin(),
        getAllFahrerAdmin()
      ])

      // Optionale Daten parallel laden (Fehler werden abgefangen)
      let alerts = undefined
      let korrekturen = undefined
      let verfuegbarkeiten = undefined
      let dismissedSyntheticIds: Set<string> | undefined = undefined

      try {
        const [alertsResult, korrekturenResult, verfuegbarkeitenResult, dismissedIds] = await Promise.all([
          getOpenAlerts(isAdmin).catch(() => undefined),
          getCorrectionRequests(isAdmin).catch(() => undefined),
          getUpcomingAvailability().catch(() => undefined),
          getDismissedSyntheticIds().catch(() => new Set<string>())
        ])
        alerts = alertsResult
        korrekturen = korrekturenResult
        verfuegbarkeiten = verfuegbarkeitenResult
        dismissedSyntheticIds = dismissedIds
      } catch (e) {
        console.warn("Optionale Daten konnten nicht geladen werden:", e)
      }

      // Daten in das Calculator-Format transformieren
      const arbeitsnachweise = tourenData.map((t: any) => ({
        id: t.id,
        datum: t.datum,
        status: t.status,
        created_at: t.created_at,
        user_id: t.user_id
      }))

      const auslagen = auslagenData.map((a: any) => ({
        id: a.id,
        datum: a.datum,
        status: a.status,
        kosten: parseFloat(a.kosten) || 0,
        created_at: a.created_at
      }))

      const fahrer = fahrerData.map((f: any) => ({
        id: f.id,
        vorname: f.vorname,
        nachname: f.nachname,
        status: f.status,
        user_id: f.user_id
      }))

      // Kennzahlen berechnen (mit Dismissals)
      let kz = calculateCockpitKennzahlen({
        arbeitsnachweise,
        auslagen,
        fahrer,
        alerts,
        korrekturen,
        verfuegbarkeiten,
        userRole: isAdmin ? 'admin' : 'disponent',
        dismissedSyntheticIds
      })

      // Für Disponent filtern
      if (!isAdmin) {
        kz = filterCockpitForDisponent(kz)
      }

      setKennzahlen(kz)
    } catch (error) {
      console.error("Fehler beim Laden der Daten:", error)
    }
  }

  const handleLogout = async () => {
    try {
      await signOut()
      router.push("/admin")
    } catch (error) {
      console.error("Logout Fehler:", error)
    }
  }

  // Quick Actions
  const quickActions = [
    { label: "Arbeitsnachweise", href: "/admin/arbeitsnachweise", icon: FileText, count: kennzahlen?.arbeitsnachweisePending, badgeColor: "bg-amber-100 text-amber-700" },
    { label: "Auslagen", href: "/admin/auslagen", icon: Receipt, count: kennzahlen?.auslagenPending, badgeColor: "bg-orange-100 text-orange-700" },
    { label: "Tourenverwaltung", href: "/admin/fahrzeugtouren", icon: Car },
    { label: "Fahrer", href: "/admin/fahrer", icon: Users },
    { label: "Verfügbarkeit", href: "/admin/verfuegbarkeit", icon: Calendar },
    { label: "Warnungen", href: "/admin/alerts", icon: Bell, count: kennzahlen?.alertsOffen, badgeColor: "bg-red-100 text-red-700" },
  ]

  // Admin/GF-only Actions
  const adminActions = [
    { label: "Analytics", href: "/admin/analytics", icon: TrendingUp, description: "Umsatz, Ertrag, Marge" },
    { label: "Preislisten", href: "/admin/preislisten", icon: Settings },
    { label: "Kunden", href: "/admin/kunden", icon: UserCheck },
    { label: "Korrekturen", href: "/admin/korrekturen", icon: ClipboardCheck, count: kennzahlen?.korrekturanfragenOffen },
  ]

  if (isLoading) {
    return (
      <AdminLayout userName={adminName} userRole={userRole} onLogout={handleLogout}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-blue" />
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout userName={adminName} userRole={userRole} onLogout={handleLogout}>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">Tagessteuerung und offene Aufgaben</p>
        </div>

        {/* Prioritäten heute */}
        <Card className="border-gray-100 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold text-gray-900">Prioritäten heute</CardTitle>
            <CardDescription>Offene Aufgaben, die auf Bearbeitung warten</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {/* Arbeitsnachweise */}
              <Link href="/admin/arbeitsnachweise">
                <div className={`p-4 rounded-lg border transition-all hover:shadow-sm cursor-pointer ${
                  (kennzahlen?.arbeitsnachweisePending || 0) > 0 ? 'border-amber-200 bg-amber-50/50' : 'border-gray-100 bg-gray-50'
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className={`h-4 w-4 ${(kennzahlen?.arbeitsnachweisePending || 0) > 0 ? 'text-amber-600' : 'text-gray-400'}`} />
                    <span className="text-xs font-medium text-gray-500">Arbeitsnachweise</span>
                  </div>
                  <div className="text-2xl font-bold text-gray-900">{kennzahlen?.arbeitsnachweisePending || 0}</div>
                  <div className="text-xs text-gray-500">zu prüfen</div>
                </div>
              </Link>

              {/* Auslagen */}
              <Link href="/admin/auslagen">
                <div className={`p-4 rounded-lg border transition-all hover:shadow-sm cursor-pointer ${
                  (kennzahlen?.auslagenPending || 0) > 0 ? 'border-orange-200 bg-orange-50/50' : 'border-gray-100 bg-gray-50'
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Receipt className={`h-4 w-4 ${(kennzahlen?.auslagenPending || 0) > 0 ? 'text-orange-600' : 'text-gray-400'}`} />
                    <span className="text-xs font-medium text-gray-500">Auslagen</span>
                  </div>
                  <div className="text-2xl font-bold text-gray-900">{kennzahlen?.auslagenPending || 0}</div>
                  <div className="text-xs text-gray-500">zu prüfen</div>
                </div>
              </Link>

              {/* Korrekturanfragen */}
              {kennzahlen?.datenVerfuegbar.korrekturen && (
                <Link href="/admin/korrekturen">
                  <div className={`p-4 rounded-lg border transition-all hover:shadow-sm cursor-pointer ${
                    (kennzahlen?.korrekturanfragenOffen || 0) > 0 ? 'border-blue-200 bg-blue-50/50' : 'border-gray-100 bg-gray-50'
                  }`}>
                    <div className="flex items-center gap-2 mb-2">
                      <ClipboardCheck className={`h-4 w-4 ${(kennzahlen?.korrekturanfragenOffen || 0) > 0 ? 'text-blue-600' : 'text-gray-400'}`} />
                      <span className="text-xs font-medium text-gray-500">Korrekturen</span>
                    </div>
                    <div className="text-2xl font-bold text-gray-900">{kennzahlen?.korrekturanfragenOffen || 0}</div>
                    <div className="text-xs text-gray-500">offen</div>
                  </div>
                </Link>
              )}

              {/* Alerts */}
              {kennzahlen?.datenVerfuegbar.alerts && (
                <Link href="/admin/alerts">
                  <div className={`p-4 rounded-lg border transition-all hover:shadow-sm cursor-pointer ${
                    (kennzahlen?.alertsOffen || 0) > 0 ? 'border-red-200 bg-red-50/50' : 'border-gray-100 bg-gray-50'
                  }`}>
                    <div className="flex items-center gap-2 mb-2">
                      <Bell className={`h-4 w-4 ${(kennzahlen?.alertsOffen || 0) > 0 ? 'text-red-600' : 'text-gray-400'}`} />
                      <span className="text-xs font-medium text-gray-500">Warnungen</span>
                    </div>
                    <div className="text-2xl font-bold text-gray-900">{kennzahlen?.alertsOffen || 0}</div>
                    <div className="text-xs text-gray-500">offen</div>
                  </div>
                </Link>
              )}

              {/* Verfügbarkeit */}
              {kennzahlen?.datenVerfuegbar.verfuegbarkeit && (
                <Link href="/admin/verfuegbarkeit">
                  <div className={`p-4 rounded-lg border transition-all hover:shadow-sm cursor-pointer ${
                    (kennzahlen?.fahrerOhneVerfuegbarkeit || 0) > 0 ? 'border-purple-200 bg-purple-50/50' : 'border-gray-100 bg-gray-50'
                  }`}>
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className={`h-4 w-4 ${(kennzahlen?.fahrerOhneVerfuegbarkeit || 0) > 0 ? 'text-purple-600' : 'text-gray-400'}`} />
                      <span className="text-xs font-medium text-gray-500">Verfügbarkeit</span>
                    </div>
                    <div className="text-2xl font-bold text-gray-900">{kennzahlen?.fahrerOhneVerfuegbarkeit || 0}</div>
                    <div className="text-xs text-gray-500">fehlt (nächste KW)</div>
                  </div>
                </Link>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Zweispaltige Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Linke Spalte */}
          <div className="lg:col-span-2 space-y-6">

            {/* Kritische Hinweise / Handlungsbedarf */}
            <Card className="border-gray-100 shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg font-semibold text-gray-900">Handlungsbedarf</CardTitle>
                    <CardDescription>Kritische Punkte, die Aufmerksamkeit erfordern</CardDescription>
                  </div>
                  {(kennzahlen?.kritischeHinweise?.length || 0) > 0 && (
                    <Link href="/admin/alerts">
                      <Button variant="ghost" size="sm" className="text-gray-500 hover:text-primary-blue">
                        Alle anzeigen
                        <ArrowRight className="ml-1 h-3 w-3" />
                      </Button>
                    </Link>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {(kennzahlen?.kritischeHinweise?.length || 0) > 0 ? (
                  <div className="space-y-3">
                    {kennzahlen?.kritischeHinweise.map((hinweis, index) => {
                      const severityStyles = {
                        critical: { bg: 'bg-red-50', border: 'border-red-100', icon: 'text-red-600', title: 'text-red-900', desc: 'text-red-700' },
                        warning: { bg: 'bg-amber-50', border: 'border-amber-100', icon: 'text-amber-600', title: 'text-amber-900', desc: 'text-amber-700' },
                        info: { bg: 'bg-blue-50', border: 'border-blue-100', icon: 'text-blue-600', title: 'text-blue-900', desc: 'text-blue-700' }
                      }
                      const style = severityStyles[hinweis.severity]
                      const Icon = hinweis.severity === 'critical' ? AlertCircle : hinweis.severity === 'warning' ? AlertTriangle : Clock

                      return (
                        <Link key={index} href={hinweis.link || '#'}>
                          <div className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover:shadow-sm transition-all ${style.bg} ${style.border}`}>
                            <Icon className={`h-5 w-5 mt-0.5 ${style.icon}`} />
                            <div className="flex-1">
                              <p className={`text-sm font-medium ${style.title}`}>
                                {hinweis.titel}
                              </p>
                              <p className={`text-sm ${style.desc}`}>
                                {hinweis.beschreibung}
                              </p>
                            </div>
                            <ArrowRight className={`h-4 w-4 ${style.icon}`} />
                          </div>
                        </Link>
                      )
                    })}
                  </div>
                ) : (
                  <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                    <CheckCircle className="h-5 w-5 text-emerald-600" />
                    <div>
                      <p className="text-sm font-medium text-emerald-900">Keine kritischen Punkte</p>
                      <p className="text-sm text-emerald-700">Alle Aufgaben sind aktuell.</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Schnellzugriffe */}
            <Card className="border-gray-100 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold text-gray-900">Schnellzugriffe</CardTitle>
                <CardDescription>Direkter Zugang zu den wichtigsten Bereichen</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {quickActions.map((action) => {
                    const Icon = action.icon
                    return (
                      <Link key={action.href} href={action.href}>
                        <div className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all group cursor-pointer">
                          <div className="p-2 rounded-lg bg-gray-50 group-hover:bg-gray-100 transition-colors">
                            <Icon className="h-4 w-4 text-gray-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 group-hover:text-primary-blue truncate">
                              {action.label}
                            </p>
                            {action.count !== undefined && action.count > 0 && (
                              <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${action.badgeColor || 'bg-gray-100 text-gray-700'}`}>
                                {action.count} offen
                              </span>
                            )}
                          </div>
                          <ArrowRight className="h-4 w-4 text-gray-300 group-hover:text-primary-blue transition-colors" />
                        </div>
                      </Link>
                    )
                  })}
                </div>

                {/* Admin-only Actions */}
                {isAdminOrGF && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">Management</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {adminActions.map((action) => {
                        const Icon = action.icon
                        return (
                          <Link key={action.href} href={action.href}>
                            <div className="flex items-center gap-2 p-2.5 rounded-lg border border-gray-100 hover:border-primary-blue/30 hover:bg-blue-50/30 transition-all group cursor-pointer">
                              <Icon className="h-4 w-4 text-gray-500 group-hover:text-primary-blue" />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium text-gray-700 group-hover:text-primary-blue truncate">
                                  {action.label}
                                </p>
                                {action.description && (
                                  <p className="text-[10px] text-gray-400 truncate">{action.description}</p>
                                )}
                              </div>
                              {action.count !== undefined && action.count > 0 && (
                                <span className="flex-shrink-0 inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-medium bg-amber-100 text-amber-700">
                                  {action.count}
                                </span>
                              )}
                            </div>
                          </Link>
                        )
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Rechte Spalte */}
          <div className="space-y-6">
            {/* Schnellstatus */}
            <Card className="border-gray-100 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold text-gray-900">Schnellstatus</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between py-2 border-b border-gray-50">
                    <span className="text-sm text-gray-600">Aktive Fahrer</span>
                    <span className="text-sm font-semibold text-gray-900">
                      {kennzahlen?.aktiveFahrer || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-gray-50">
                    <span className="text-sm text-gray-600">Touren (aktueller Monat)</span>
                    <span className="text-sm font-semibold text-gray-900">
                      {kennzahlen?.tourenAktuellerMonat || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-gray-50">
                    <span className="text-sm text-gray-600">Offene Auslagen</span>
                    <span className="text-sm font-semibold text-gray-900">
                      {kennzahlen?.offeneAuslagenAnzahl || 0}
                    </span>
                  </div>
                  {kennzahlen?.datenVerfuegbar.alerts && (
                    <div className="flex items-center justify-between py-2">
                      <span className="text-sm text-gray-600">Offene Warnungen</span>
                      <span className={`text-sm font-semibold ${(kennzahlen?.offeneWarnungen || 0) > 0 ? 'text-red-600' : 'text-gray-900'}`}>
                        {kennzahlen?.offeneWarnungen || 0}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* News & Hinweise */}
            <Card className="border-gray-100 shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Newspaper className="h-5 w-5 text-primary-blue" />
                  <CardTitle className="text-lg font-semibold text-gray-900">News & Hinweise</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="pb-3 border-b border-gray-100">
                    <p className="text-sm font-medium text-gray-900">Phase 1 Smart & Care</p>
                    <p className="text-xs text-gray-500 mt-0.5">Korrekturworkflow und Alerts aktiv</p>
                  </div>
                  <div className="pb-3 border-b border-gray-100">
                    <p className="text-sm font-medium text-gray-900">Preislisten versioniert</p>
                    <p className="text-xs text-gray-500 mt-0.5">Historische Preise nachvollziehbar</p>
                  </div>
                  <div className="pb-3 border-b border-gray-100">
                    <p className="text-sm font-medium text-gray-900">Einstellungen-Editor</p>
                    <p className="text-xs text-gray-500 mt-0.5">Systemeinstellungen mit Versionen</p>
                  </div>
                  {isAdminOrGF && (
                    <div>
                      <Link href="/admin/analytics" className="group">
                        <div className="flex items-center gap-2 text-sm font-medium text-primary-blue group-hover:text-primary-blue/80">
                          <TrendingUp className="h-4 w-4" />
                          Analytics für Marge & Fahrerprofitabilität
                          <ExternalLink className="h-3 w-3" />
                        </div>
                      </Link>
                      <p className="text-xs text-gray-400 mt-0.5">Umsatz, Ertrag und Margenanalyse</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
