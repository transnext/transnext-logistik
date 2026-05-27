"use client"

import { useEffect, useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { AdminLayout } from "@/components/admin/AdminLayout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { EmptyState } from "@/components/ui/empty-state"
import { getCurrentUser, getUserProfile, signOut } from "@/lib/api"
import {
  getAllArbeitsnachweiseAdmin,
  getAllAuslagennachweiseAdmin,
  getAllFahrerAdmin
} from "@/lib/admin-api"
import { getUpcomingAvailability } from "@/lib/availability-api"
import { getCorrectionRequests } from "@/lib/corrections-api"
import {
  getAlerts,
  acknowledgeAlert,
  resolveAlert,
  formatSeverity,
  formatAlertStatus,
  getSeverityColors,
  getAlertStatusColors,
  type Alert,
  type AlertSeverity,
  type AlertStatus
} from "@/lib/alerts-api"
import {
  calculateSystemAlerts,
  type ComputedAlert
} from "@/lib/alerts-calculator"
import {
  getComputedAlertDismissals,
  dismissComputedAlert,
  undoDismissComputedAlert,
  isFinanceAlertType,
  type ComputedAlertDismissal
} from "@/lib/computed-alert-dismissals-api"
import {
  markAvailableWithoutTour
} from "@/lib/availability-alert-reviews-api"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Bell,
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  Info,
  Check,
  RefreshCw,
  Zap,
  Database,
  ArrowRight,
  ExternalLink,
  Eye,
  CheckCheck
} from "lucide-react"

// Alert-Kategorien für Filter (außerhalb der Komponente für useMemo)
const getAlertCategory = (type: string): string => {
  const categoryMap: Record<string, string> = {
    'arbeitsnachweis_offen': 'arbeitsnachweise',
    'auslage_offen': 'auslagen',
    'auslage_nicht_ueberwiesen': 'auslagen',
    'verfuegbarkeit_fehlt': 'verfuegbarkeit',
    'verfuegbar_ohne_tour': 'verfuegbarkeit',
    'fahrer_viele_verfuegbar_ohne_tour': 'verfuegbarkeit',
    'upload_verspaetet': 'upload',
    'fahrer_verspaetungen_wiederholt': 'upload',
    'fahrer_wenig_fahrtage': 'fahrer',
    'tour_nicht_berechenbar': 'abrechnung',
    'tour_fallback_konstanten': 'abrechnung',
    'rechnung_nicht_gesperrt': 'abrechnung',
    'negative_marge': 'abrechnung',
    'korrekturanfrage_offen': 'korrekturen'
  }
  return categoryMap[type] || 'sonstige'
}

export default function AlertsPage() {
  const router = useRouter()
  const [userName, setUserName] = useState("")
  const [userRole, setUserRole] = useState<'admin' | 'gf' | 'disponent'>('admin')
  const [isLoading, setIsLoading] = useState(true)
  const [dbAlerts, setDbAlerts] = useState<Alert[]>([])
  const [computedAlerts, setComputedAlerts] = useState<ComputedAlert[]>([])
  const [dismissedAlerts, setDismissedAlerts] = useState<ComputedAlert[]>([])
  const [dismissals, setDismissals] = useState<ComputedAlertDismissal[]>([])
  const [activeTab, setActiveTab] = useState<string>("all")
  const [filterSeverity, setFilterSeverity] = useState<string>("all")
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [filterCategory, setFilterCategory] = useState<string>("all")

  // State für "Verfügbar, aber keine Tour" Modal
  const [showMarkNoTourModal, setShowMarkNoTourModal] = useState(false)
  const [markNoTourAlert, setMarkNoTourAlert] = useState<ComputedAlert | null>(null)
  const [markNoTourNote, setMarkNoTourNote] = useState("")
  const [isMarkingNoTour, setIsMarkingNoTour] = useState(false)

  const isAdmin = userRole === 'admin' || userRole === 'gf'

  useEffect(() => {
    checkAuthAndLoad()
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
      if (!['admin', 'disponent', 'gf'].includes(role)) {
        router.push("/admin")
        return
      }
      const effectiveRole = role as 'admin' | 'gf' | 'disponent'
      setUserRole(effectiveRole)
      setUserName(profile.full_name)

      await loadAllAlerts(effectiveRole)
      setIsLoading(false)
    } catch {
      router.push("/admin")
    }
  }

  const loadAllAlerts = async (role: 'admin' | 'gf' | 'disponent') => {
    const isAdminAccess = role === 'admin' || role === 'gf'

    // 1. DB-Alerts laden
    try {
      const data = await getAlerts(isAdminAccess)
      setDbAlerts(data)
    } catch (err) {
      console.error("Fehler beim Laden der DB-Alerts:", err)
    }

    // 2. Dismissals laden
    let dismissedSyntheticIds = new Set<string>()
    try {
      const dismissalData = await getComputedAlertDismissals()
      setDismissals(dismissalData)
      dismissedSyntheticIds = new Set(dismissalData.map(d => d.synthetic_id))
    } catch (err) {
      console.error("Fehler beim Laden der Dismissals:", err)
    }

    // 3. Berechnete Alerts laden
    try {
      // Lade operative Daten für Berechnung
      const [tourenData, auslagenData, fahrerData, verfuegbarkeiten, korrekturen] = await Promise.all([
        getAllArbeitsnachweiseAdmin().catch(() => []),
        getAllAuslagennachweiseAdmin().catch(() => []),
        getAllFahrerAdmin().catch(() => []),
        getUpcomingAvailability().catch(() => []),
        getCorrectionRequests(isAdminAccess).catch(() => [])
      ])

      // Transformiere Daten
      const arbeitsnachweise = tourenData.map((t: any) => ({
        id: t.id,
        tour_nr: t.tour_nr,
        datum: t.datum,
        status: t.status,
        created_at: t.created_at,
        gefahrene_km: t.gefahrene_km,
        customer_id: t.customer_id,
        auftraggeber: t.auftraggeber,
        customer_amount: t.customer_amount,
        driver_amount_final: t.driver_amount_final,
        estimated_employer_costs: t.estimated_employer_costs,
        calculation_source: t.calculation_source,
        user_id: t.user_id
      }))

      const auslagen = auslagenData.map((a: any) => ({
        id: a.id,
        datum: a.datum,
        status: a.status,
        kosten: parseFloat(a.kosten) || 0,
        created_at: a.created_at,
        driver_reimbursement_status: a.driver_reimbursement_status,
        reimbursed_at: a.reimbursed_at
      }))

      const fahrer = fahrerData.map((f: any) => ({
        id: f.id,
        vorname: f.vorname,
        nachname: f.nachname,
        status: f.status,
        user_id: f.user_id
      }))

      // Berechne Alerts MIT Dismissal-Filterung
      const result = calculateSystemAlerts({
        arbeitsnachweise,
        auslagen,
        fahrer,
        driverAvailability: verfuegbarkeiten,
        correctionRequests: korrekturen,
        userRole: role === 'gf' ? 'admin' : role,
        dismissedSyntheticIds
      })

      setComputedAlerts(result.alerts)
      setDismissedAlerts(result.dismissedAlerts || [])
    } catch (err) {
      console.error("Fehler beim Berechnen der Alerts:", err)
    }
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await loadAllAlerts(userRole)
    setIsRefreshing(false)
  }

  const handleAcknowledge = async (alertId: string) => {
    setActionLoading(alertId)
    try {
      await acknowledgeAlert(alertId)
      await loadAllAlerts(userRole)
    } catch (err) {
      alert("Fehler beim Bestätigen: " + (err instanceof Error ? err.message : ""))
    } finally {
      setActionLoading(null)
    }
  }

  const handleResolve = async (alertId: string) => {
    if (!isAdmin) return
    setActionLoading(alertId)
    try {
      await resolveAlert(alertId)
      await loadAllAlerts(userRole)
    } catch (err) {
      alert("Fehler beim Lösen: " + (err instanceof Error ? err.message : ""))
    } finally {
      setActionLoading(null)
    }
  }

  // NEU: Berechneten Alert als erledigt markieren
  const handleDismissComputedAlert = async (computedAlert: ComputedAlert) => {
    setActionLoading(computedAlert.synthetic_id)
    try {
      const result = await dismissComputedAlert(
        computedAlert.synthetic_id,
        computedAlert.type,
        computedAlert.entity_type,
        computedAlert.entity_id
      )
      if (!result.success) {
        throw new Error(result.error || "Fehler beim Ausblenden")
      }
      await loadAllAlerts(userRole)
    } catch (err) {
      window.alert("Fehler: " + (err instanceof Error ? err.message : "Unbekannter Fehler"))
    } finally {
      setActionLoading(null)
    }
  }

  // NEU: Dismissal rückgängig machen
  const handleUndoDismiss = async (syntheticId: string) => {
    setActionLoading(syntheticId)
    try {
      const result = await undoDismissComputedAlert(syntheticId)
      if (!result.success) {
        throw new Error(result.error || "Fehler beim Wiederherstellen")
      }
      await loadAllAlerts(userRole)
    } catch (err) {
      window.alert("Fehler: " + (err instanceof Error ? err.message : "Unbekannter Fehler"))
    } finally {
      setActionLoading(null)
    }
  }

  // Prüft ob Benutzer diesen Alert erledigen darf
  const canDismissAlert = (alertType: string): boolean => {
    if (isAdmin) return true
    return !isFinanceAlertType(alertType)
  }

  // Handler: "Verfügbar, aber keine Tour" Modal öffnen
  const handleOpenMarkNoTourModal = (alert: ComputedAlert) => {
    setMarkNoTourAlert(alert)
    setMarkNoTourNote("")
    setShowMarkNoTourModal(true)
  }

  // Handler: "Verfügbar, aber keine Tour" markieren
  const handleMarkAvailableNoTour = async () => {
    if (!markNoTourAlert || !markNoTourAlert.details) return

    setIsMarkingNoTour(true)
    try {
      // Details aus dem Alert extrahieren
      const details = markNoTourAlert.details as any
      const fahrerList = details?.fahrer || []

      // Markiere jeden Fahrer + Datum
      for (const fahrer of fahrerList) {
        const dates = fahrer.dates || []
        for (const date of dates) {
          await markAvailableWithoutTour({
            fahrer_id: fahrer.fahrer_id,
            date: date,
            note: markNoTourNote || undefined
          })
        }
      }

      // Alert als erledigt markieren
      await dismissComputedAlert(
        markNoTourAlert.synthetic_id,
        markNoTourAlert.type,
        markNoTourAlert.entity_type,
        markNoTourAlert.entity_id,
        `Markiert als "Verfügbar, aber keine Tour"${markNoTourNote ? `: ${markNoTourNote}` : ''}`
      )

      setShowMarkNoTourModal(false)
      setMarkNoTourAlert(null)
      await loadAllAlerts(userRole)
    } catch (err) {
      window.alert("Fehler: " + (err instanceof Error ? err.message : "Unbekannter Fehler"))
    } finally {
      setIsMarkingNoTour(false)
    }
  }

  const handleLogout = async () => {
    await signOut()
    router.push("/admin")
  }

  // Gefilterte Alerts
  const filteredDbAlerts = useMemo(() => {
    return dbAlerts.filter(alert => {
      const matchesSeverity = filterSeverity === "all" || alert.severity === filterSeverity
      const matchesTab = activeTab === "all" ||
        (activeTab === "open" && alert.status === "open") ||
        (activeTab === "resolved" && alert.status !== "open") ||
        activeTab === "db"
      return matchesSeverity && (activeTab === "db" || matchesTab)
    })
  }, [dbAlerts, filterSeverity, activeTab])

  const filteredComputedAlerts = useMemo(() => {
    return computedAlerts.filter(alert => {
      const matchesSeverity = filterSeverity === "all" || alert.severity === filterSeverity
      const matchesTab = activeTab === "all" || activeTab === "computed" || activeTab === "open"
      const matchesCategory = filterCategory === "all" || getAlertCategory(alert.type) === filterCategory
      return matchesSeverity && matchesTab && matchesCategory
    })
  }, [computedAlerts, filterSeverity, activeTab, filterCategory])

  // NEU: Gefilterte erledigte Alerts
  const filteredDismissedAlerts = useMemo(() => {
    if (activeTab !== "dismissed") return []
    return dismissedAlerts.filter(alert => {
      const matchesSeverity = filterSeverity === "all" || alert.severity === filterSeverity
      const matchesCategory = filterCategory === "all" || getAlertCategory(alert.type) === filterCategory
      return matchesSeverity && matchesCategory
    })
  }, [dismissedAlerts, filterSeverity, filterCategory, activeTab])

  // Zähler für Summary
  const counts = useMemo(() => {
    const dbOpen = dbAlerts.filter(a => a.status === 'open')
    const computedOpen = computedAlerts

    return {
      total: dbAlerts.length + computedAlerts.length,
      open: dbOpen.length + computedOpen.length,
      critical: dbOpen.filter(a => a.severity === 'critical').length + computedOpen.filter(a => a.severity === 'critical').length,
      warning: dbOpen.filter(a => a.severity === 'warning').length + computedOpen.filter(a => a.severity === 'warning').length,
      computed: computedAlerts.length,
      db: dbAlerts.length,
      dismissed: dismissedAlerts.length
    }
  }, [dbAlerts, computedAlerts, dismissedAlerts])

  const getSeverityIcon = (severity: AlertSeverity) => {
    switch (severity) {
      case 'critical': return <AlertCircle className="h-4 w-4" />
      case 'warning': return <AlertTriangle className="h-4 w-4" />
      default: return <Info className="h-4 w-4" />
    }
  }

  const formatComputedAlertType = (type: string): string => {
    const typeMap: Record<string, string> = {
      'arbeitsnachweis_offen': 'Arbeitsnachweis',
      'auslage_offen': 'Auslage',
      'auslage_nicht_ueberwiesen': 'Erstattung',
      'verfuegbarkeit_fehlt': 'Verfügbarkeit',
      'fahrer_wenig_fahrtage': 'Fahrtage',
      'tour_nicht_berechenbar': 'Berechnung',
      'tour_fallback_konstanten': 'Preisliste',
      'rechnung_nicht_gesperrt': 'Rechnung',
      'negative_marge': 'Marge',
      'korrekturanfrage_offen': 'Korrektur',
      // Neue Alert-Typen für Verfügbarkeit und Upload-Compliance
      'verfuegbar_ohne_tour': 'Keine Tour',
      'upload_verspaetet': 'Verspätung',
      'fahrer_verspaetungen_wiederholt': 'Wiederholte Verspätung',
      'fahrer_viele_verfuegbar_ohne_tour': 'Viele Tage ohne Tour'
    }
    return typeMap[type] || type
  }

  if (isLoading) {
    return (
      <AdminLayout userName={userName} userRole={userRole === 'gf' ? 'admin' : userRole} onLogout={handleLogout}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-blue" />
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout userName={userName} userRole={userRole === 'gf' ? 'admin' : userRole} onLogout={handleLogout}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Alerts & Warnmeldungen</h1>
            <p className="text-gray-500 mt-1">Systemwarnungen und automatisch erkannte Handlungsbedarfe</p>
          </div>
          <Button variant="outline" onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Aktualisieren
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          <Card className={counts.critical > 0 ? "border-red-200 bg-red-50/50" : "border-gray-100"}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <AlertCircle className={`h-5 w-5 ${counts.critical > 0 ? 'text-red-600' : 'text-gray-400'}`} />
                <div>
                  <p className="text-2xl font-bold">{counts.critical}</p>
                  <p className="text-xs text-gray-500">Kritisch</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className={counts.warning > 0 ? "border-amber-200 bg-amber-50/50" : "border-gray-100"}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className={`h-5 w-5 ${counts.warning > 0 ? 'text-amber-600' : 'text-gray-400'}`} />
                <div>
                  <p className="text-2xl font-bold">{counts.warning}</p>
                  <p className="text-xs text-gray-500">Warnungen</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-gray-100">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Bell className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-2xl font-bold">{counts.open}</p>
                  <p className="text-xs text-gray-500">Offen</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-gray-100">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-2xl font-bold">{counts.total}</p>
                  <p className="text-xs text-gray-500">Gesamt</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-blue-200 bg-blue-50/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Zap className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-2xl font-bold">{counts.computed}</p>
                  <p className="text-xs text-gray-500">Automatisch</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-gray-100">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Database className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-2xl font-bold">{counts.db}</p>
                  <p className="text-xs text-gray-500">System</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className={counts.dismissed > 0 ? "border-emerald-200 bg-emerald-50/50" : "border-gray-100"}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <CheckCheck className={`h-5 w-5 ${counts.dismissed > 0 ? 'text-emerald-600' : 'text-gray-400'}`} />
                <div>
                  <p className="text-2xl font-bold">{counts.dismissed}</p>
                  <p className="text-xs text-gray-500">Erledigt</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs und Filter */}
        <Card className="border-gray-100">
          <CardContent className="p-4">
            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full lg:w-auto">
                <TabsList>
                  <TabsTrigger value="all">Alle</TabsTrigger>
                  <TabsTrigger value="open">Offen ({counts.open})</TabsTrigger>
                  <TabsTrigger value="computed">
                    <Zap className="h-3 w-3 mr-1" />
                    Automatisch ({counts.computed})
                  </TabsTrigger>
                  <TabsTrigger value="db">
                    <Database className="h-3 w-3 mr-1" />
                    System ({counts.db})
                  </TabsTrigger>
                  <TabsTrigger value="dismissed">
                    <CheckCheck className="h-3 w-3 mr-1" />
                    Erledigt ({counts.dismissed})
                  </TabsTrigger>
                  <TabsTrigger value="resolved">Archiv</TabsTrigger>
                </TabsList>
              </Tabs>

              <div className="flex gap-2">
                <Select value={filterCategory} onValueChange={setFilterCategory}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Kategorie" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle Kategorien</SelectItem>
                    <SelectItem value="arbeitsnachweise">Arbeitsnachweise</SelectItem>
                    <SelectItem value="auslagen">Auslagen</SelectItem>
                    <SelectItem value="verfuegbarkeit">Verfügbarkeit</SelectItem>
                    <SelectItem value="upload">Upload-Pünktlichkeit</SelectItem>
                    <SelectItem value="abrechnung">Abrechnung</SelectItem>
                    <SelectItem value="korrekturen">Korrekturen</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={filterSeverity} onValueChange={setFilterSeverity}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Schweregrad" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle Schweregrade</SelectItem>
                    <SelectItem value="critical">Kritisch</SelectItem>
                    <SelectItem value="warning">Warnung</SelectItem>
                    <SelectItem value="info">Info</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Automatisch erkannte Alerts */}
        {(activeTab === "all" || activeTab === "open" || activeTab === "computed") && filteredComputedAlerts.length > 0 && (
          <Card className="border-blue-200 bg-blue-50/30">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-blue-600" />
                <CardTitle className="text-lg">Automatisch erkannt</CardTitle>
              </div>
              <CardDescription>
                Diese Warnungen werden aus Echtzeitdaten berechnet und verschwinden automatisch, wenn die Ursache behoben ist.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {filteredComputedAlerts.map((alert) => {
                  const severityColors = getSeverityColors(alert.severity)
                  const canDismiss = canDismissAlert(alert.type)

                  return (
                    <div
                      key={alert.synthetic_id}
                      className={`p-4 rounded-lg border bg-white ${
                        alert.severity === 'critical'
                          ? 'border-red-200'
                          : alert.severity === 'warning'
                          ? 'border-amber-200'
                          : 'border-gray-100'
                      }`}
                    >
                      <div className="flex flex-col md:flex-row md:items-start gap-4">
                        {/* Icon + Content */}
                        <div className="flex items-start gap-3 flex-1">
                          <div className={`p-2 rounded-lg ${severityColors.bg}`}>
                            <span className={severityColors.text}>
                              {getSeverityIcon(alert.severity)}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <Badge className={`${severityColors.bg} ${severityColors.text} ${severityColors.border} border text-xs`}>
                                {formatSeverity(alert.severity)}
                              </Badge>
                              <Badge className="bg-blue-50 text-blue-700 border-blue-200 border text-xs">
                                {formatComputedAlertType(alert.type)}
                              </Badge>
                              {alert.count && alert.count > 1 && (
                                <Badge variant="outline" className="text-xs">
                                  {alert.count} Elemente
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm font-medium text-gray-900">{alert.title}</p>
                            <p className="text-sm text-gray-600 mt-0.5">{alert.message}</p>
                            <p className="text-xs text-gray-400 mt-1">
                              Erkannt: {new Date(alert.detected_at).toLocaleString('de-DE')}
                            </p>
                          </div>
                        </div>

                        {/* Actions with dismiss button */}
                        <div className="flex gap-2 flex-shrink-0 flex-wrap">
                          {/* Spezielle Aktion für "Verfügbar ohne Tour" Alerts */}
                          {(alert.type === 'verfuegbar_ohne_tour' || alert.type === 'fahrer_viele_verfuegbar_ohne_tour') && canDismiss && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleOpenMarkNoTourModal(alert)}
                              disabled={actionLoading === alert.synthetic_id}
                              className="text-blue-700 border-blue-200 hover:bg-blue-50"
                              title="Als verfügbar, aber keine Tour markieren"
                            >
                              <Check className="h-3 w-3" />
                              <span className="ml-1 hidden sm:inline">Markieren</span>
                            </Button>
                          )}
                          {canDismiss && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDismissComputedAlert(alert)}
                              disabled={actionLoading === alert.synthetic_id}
                              className="text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                              title="Als erledigt markieren"
                            >
                              {actionLoading === alert.synthetic_id ? (
                                <RefreshCw className="h-3 w-3 animate-spin" />
                              ) : (
                                <CheckCheck className="h-3 w-3" />
                              )}
                              <span className="ml-1 hidden sm:inline">Erledigt</span>
                            </Button>
                          )}
                          <Link href={alert.action_href}>
                            <Button size="sm" variant="outline" className="text-primary-blue border-primary-blue/30 hover:bg-blue-50">
                              Bearbeiten
                              <ArrowRight className="h-3 w-3 ml-1" />
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* NEU: Dismissed Alerts Section */}
        {activeTab === "dismissed" && (
          <Card className="border-emerald-200 bg-emerald-50/30">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <CheckCheck className="h-5 w-5 text-emerald-600" />
                <CardTitle className="text-lg">Erledigte Alerts</CardTitle>
              </div>
              <CardDescription>
                Diese Alerts wurden als erledigt markiert. Klicken Sie auf "Wieder anzeigen", um sie erneut zu aktivieren.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredDismissedAlerts.length === 0 ? (
                <EmptyState
                  title="Keine erledigten Alerts"
                  description="Es wurden noch keine automatisch erkannten Alerts als erledigt markiert."
                  icon={<CheckCheck className="h-12 w-12 text-gray-400" />}
                  iconSize="sm"
                />
              ) : (
                <div className="space-y-3">
                  {filteredDismissedAlerts.map((alert) => {
                    const dismissal = dismissals.find(d => d.synthetic_id === alert.synthetic_id)
                    const canUndismiss = canDismissAlert(alert.type)

                    return (
                      <div key={alert.synthetic_id} className="p-4 rounded-lg border bg-white border-gray-100 opacity-75 hover:opacity-100 transition-opacity">
                        <div className="flex flex-col md:flex-row md:items-start gap-4">
                          <div className="flex items-start gap-3 flex-1">
                            <div className="p-2 rounded-lg bg-gray-100">
                              <span className="text-gray-400">{getSeverityIcon(alert.severity)}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 border text-xs">Erledigt</Badge>
                                <Badge className="bg-gray-50 text-gray-500 border-gray-200 border text-xs">{formatComputedAlertType(alert.type)}</Badge>
                              </div>
                              <p className="text-sm font-medium text-gray-700">{alert.title}</p>
                              <p className="text-sm text-gray-500 mt-0.5">{alert.message}</p>
                              {dismissal && (
                                <p className="text-xs text-gray-400 mt-1">
                                  Erledigt am: {new Date(dismissal.dismissed_at).toLocaleString('de-DE')}
                                </p>
                              )}
                            </div>
                          </div>
                          {canUndismiss && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUndoDismiss(alert.synthetic_id)}
                              disabled={actionLoading === alert.synthetic_id}
                              className="text-amber-700 border-amber-200 hover:bg-amber-50"
                            >
                              {actionLoading === alert.synthetic_id ? (
                                <RefreshCw className="h-3 w-3 animate-spin" />
                              ) : (
                                <Eye className="h-3 w-3" />
                              )}
                              <span className="ml-1 hidden sm:inline">Wieder anzeigen</span>
                            </Button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* DB-Alerts */}
        {(activeTab === "all" || activeTab === "open" || activeTab === "db" || activeTab === "resolved") && (
          <Card className="border-gray-100">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Database className="h-5 w-5 text-gray-500" />
                <CardTitle className="text-lg">Systemwarnungen</CardTitle>
              </div>
              <CardDescription>
                {filteredDbAlerts.length} {activeTab === "resolved" ? "erledigte" : ""} Alerts aus der Datenbank
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredDbAlerts.length === 0 ? (
                <EmptyState
                  title="Keine Warnmeldungen"
                  description={dbAlerts.length === 0
                    ? "Es liegen aktuell keine Systemwarnungen vor."
                    : "Keine Alerts entsprechen den Filterkriterien."
                  }
                  icon={<Bell className="h-12 w-12 text-gray-400" />}
                  iconSize="sm"
                />
              ) : (
                <div className="space-y-3">
                  {filteredDbAlerts.map((alert) => {
                    const severityColors = getSeverityColors(alert.severity)
                    const statusColors = getAlertStatusColors(alert.status)

                    return (
                      <div
                        key={alert.id}
                        className={`p-4 rounded-lg border ${
                          alert.severity === 'critical' && alert.status === 'open'
                            ? 'border-red-200 bg-red-50/30'
                            : alert.severity === 'warning' && alert.status === 'open'
                            ? 'border-amber-200 bg-amber-50/30'
                            : 'border-gray-100 bg-gray-50/30'
                        }`}
                      >
                        <div className="flex flex-col md:flex-row md:items-start gap-4">
                          {/* Icon + Content */}
                          <div className="flex items-start gap-3 flex-1">
                            <div className={`p-2 rounded-lg ${severityColors.bg}`}>
                              <span className={severityColors.text}>
                                {getSeverityIcon(alert.severity)}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <Badge className={`${severityColors.bg} ${severityColors.text} ${severityColors.border} border text-xs`}>
                                  {formatSeverity(alert.severity)}
                                </Badge>
                                <Badge className={`${statusColors.bg} ${statusColors.text} ${statusColors.border} border text-xs`}>
                                  {formatAlertStatus(alert.status)}
                                </Badge>
                                <span className="text-xs text-gray-400">
                                  {alert.type} • {alert.entity_type}
                                </span>
                              </div>
                              <p className="text-sm font-medium text-gray-900">{alert.message}</p>
                              <p className="text-xs text-gray-500 mt-1">
                                {new Date(alert.created_at).toLocaleString('de-DE')}
                                {alert.resolution_note && (
                                  <span className="ml-2 text-gray-400">
                                    • {alert.resolution_note}
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>

                          {/* Actions */}
                          {alert.status === 'open' && (
                            <div className="flex gap-2 flex-shrink-0">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleAcknowledge(alert.id)}
                                disabled={actionLoading === alert.id}
                                className="text-amber-700 border-amber-200 hover:bg-amber-50"
                              >
                                {actionLoading === alert.id ? (
                                  <RefreshCw className="h-3 w-3 animate-spin" />
                                ) : (
                                  <Check className="h-3 w-3" />
                                )}
                                <span className="ml-1 hidden sm:inline">Bestätigen</span>
                              </Button>
                              {isAdmin && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleResolve(alert.id)}
                                  disabled={actionLoading === alert.id}
                                  className="text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                                >
                                  <CheckCircle className="h-3 w-3" />
                                  <span className="ml-1 hidden sm:inline">Lösen</span>
                                </Button>
                              )}
                            </div>
                          )}
                          {alert.status === 'acknowledged' && isAdmin && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleResolve(alert.id)}
                              disabled={actionLoading === alert.id}
                              className="text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                            >
                              <CheckCircle className="h-3 w-3" />
                              <span className="ml-1 hidden sm:inline">Lösen</span>
                            </Button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Empty State wenn keine Alerts */}
        {filteredComputedAlerts.length === 0 && filteredDbAlerts.length === 0 && (
          <Card className="border-emerald-100 bg-emerald-50/30">
            <CardContent className="py-12">
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle className="h-8 w-8 text-emerald-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Keine offenen Warnungen</h3>
                <p className="text-gray-600 max-w-md">
                  {activeTab === "all"
                    ? "Es liegen aktuell keine Warnmeldungen vor. Das System läuft normal."
                    : "Keine Alerts entsprechen den aktuellen Filterkriterien."
                  }
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Modal: "Verfügbar, aber keine Tour" markieren */}
      <Dialog open={showMarkNoTourModal} onOpenChange={setShowMarkNoTourModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Verfügbar, aber keine Tour markieren</DialogTitle>
            <DialogDescription>
              Markieren Sie diese Verfügbarkeiten als &quot;Verfügbar, aber keine Tour&quot;.
              Die Markierung bleibt in der Fahrerhistorie sichtbar.
            </DialogDescription>
          </DialogHeader>

          {markNoTourAlert && (
            <div className="space-y-4">
              {/* Alert-Info */}
              <div className="p-3 bg-gray-50 rounded-lg text-sm">
                <p className="font-medium text-gray-900">{markNoTourAlert.title}</p>
                <p className="text-gray-600 mt-1">{markNoTourAlert.message}</p>
                {markNoTourAlert.details && (
                  <div className="mt-2 text-xs text-gray-500">
                    {((markNoTourAlert.details as any)?.fahrer || []).map((f: any) => (
                      <div key={f.fahrer_id} className="flex justify-between py-0.5">
                        <span>{f.fahrer_name}</span>
                        <span>{f.tage || f.dates?.length || 0} Tage</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Notizfeld */}
              <div className="space-y-2">
                <Label htmlFor="markNoTourNote">Notiz (optional)</Label>
                <Textarea
                  id="markNoTourNote"
                  placeholder="z.B. Keine Tour verfügbar, Urlaub, Krankheit..."
                  value={markNoTourNote}
                  onChange={(e) => setMarkNoTourNote(e.target.value)}
                  rows={3}
                />
                <p className="text-xs text-gray-500">
                  Diese Notiz wird in der Fahrerakte gespeichert und ist für Admin/GF und Dispo sichtbar.
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowMarkNoTourModal(false)}
              disabled={isMarkingNoTour}
            >
              Abbrechen
            </Button>
            <Button
              onClick={handleMarkAvailableNoTour}
              disabled={isMarkingNoTour}
              className="bg-primary-blue hover:bg-blue-700"
            >
              {isMarkingNoTour ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Markiere...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Als markiert speichern
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  )
}
