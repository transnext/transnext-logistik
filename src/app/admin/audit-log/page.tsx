"use client"

import { useEffect, useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { AdminLayout } from "@/components/admin/AdminLayout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { EmptyState } from "@/components/ui/empty-state"
import { getCurrentUser, getUserProfile, signOut } from "@/lib/api"
import {
  getAuditLogs,
  formatAuditAction,
  formatAuditEntityType,
  formatAuditSeverity,
  formatAuditSource,
  type AuditLogEntry,
  type AuditLogFilters,
  type AuditSeverity
} from "@/lib/audit-api"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  ClipboardList,
  Search,
  RefreshCw,
  Calendar,
  User,
  Eye,
  Filter,
  ChevronDown,
  ChevronUp,
  Info,
  AlertTriangle,
  AlertCircle
} from "lucide-react"
import { cn } from "@/lib/utils"

// Verfügbare Aktionen für Filter
const AVAILABLE_ACTIONS = [
  { value: 'all', label: 'Alle Aktionen' },
  { value: 'pricing_version_created', label: 'Preisliste erstellt' },
  { value: 'setting_version_created', label: 'Einstellung erstellt' },
  { value: 'customer_created', label: 'Kunde erstellt' },
  { value: 'customer_updated', label: 'Kunde bearbeitet' },
  { value: 'customer_deactivated', label: 'Kunde deaktiviert' },
  { value: 'customer_reactivated', label: 'Kunde reaktiviert' },
  { value: 'fahrer_created', label: 'Fahrer erstellt' },
  { value: 'fahrer_updated', label: 'Fahrer bearbeitet' },
  { value: 'fahrer_activated', label: 'Fahrer aktiviert' },
  { value: 'fahrer_deactivated', label: 'Fahrer deaktiviert' },
  { value: 'auslage_reimbursed', label: 'Auslage überwiesen' },
  { value: 'auslage_deleted', label: 'Auslage gelöscht' },
  { value: 'arbeitsnachweis_deleted', label: 'Arbeitsnachweis gelöscht' },
  { value: 'correction_request_reviewed', label: 'Korrektur geprüft' },
  { value: 'correction_request_rejected', label: 'Korrektur abgelehnt' },
  { value: 'salary_correction_created', label: 'Lohnkorrektur erstellt' },
  { value: 'salary_correction_approved', label: 'Lohnkorrektur genehmigt' },
  { value: 'salary_correction_rejected', label: 'Lohnkorrektur abgelehnt' },
  { value: 'salary_correction_applied', label: 'Lohnkorrektur angewendet' },
  { value: 'alert_resolved', label: 'Alert gelöst' },
  { value: 'computed_alert_dismissed', label: 'Alert ausgeblendet' },
  { value: 'availability_marked_no_tour', label: 'Ohne Tour markiert' },
  { value: 'invoice_created', label: 'Rechnung erstellt' },
  { value: 'invoice_pdf_exported', label: 'PDF exportiert' },
  { value: 'invoice_locked', label: 'Rechnung gesperrt' }
]

// Verfügbare Entitätstypen für Filter
const AVAILABLE_ENTITY_TYPES = [
  { value: 'all', label: 'Alle Entitäten' },
  { value: 'pricing_table', label: 'Preisliste' },
  { value: 'system_setting', label: 'System-Einstellung' },
  { value: 'customer', label: 'Kunde' },
  { value: 'fahrer', label: 'Fahrer' },
  { value: 'arbeitsnachweis', label: 'Arbeitsnachweis' },
  { value: 'auslagennachweis', label: 'Auslagennachweis' },
  { value: 'correction_request', label: 'Korrekturanfrage' },
  { value: 'salary_correction', label: 'Lohnkorrektur' },
  { value: 'alert', label: 'Alert' },
  { value: 'computed_alert', label: 'Berechneter Alert' },
  { value: 'availability', label: 'Verfügbarkeit' },
  { value: 'weekly_invoice', label: 'Wochenabrechnung' }
]

// Verfügbare Severities für Filter
const AVAILABLE_SEVERITIES = [
  { value: 'all', label: 'Alle Schweregrade' },
  { value: 'info', label: 'Info' },
  { value: 'warning', label: 'Warnung' },
  { value: 'critical', label: 'Kritisch' }
]

// Severity Icon
function SeverityIcon({ severity }: { severity: string }) {
  switch (severity) {
    case 'critical':
      return <AlertCircle className="h-4 w-4 text-red-500" />
    case 'warning':
      return <AlertTriangle className="h-4 w-4 text-amber-500" />
    default:
      return <Info className="h-4 w-4 text-blue-500" />
  }
}

// Formatiert Datum/Uhrzeit
function formatDateTime(dateString: string): { date: string; time: string } {
  const d = new Date(dateString)
  return {
    date: d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }),
    time: d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
  }
}

// JSON-Viewer für Detail-Dialog
function JsonViewer({ data, label }: { data: Record<string, unknown> | null; label: string }) {
  const [isExpanded, setIsExpanded] = useState(false)

  if (!data || Object.keys(data).length === 0) {
    return (
      <div className="text-sm text-gray-400 italic">Keine {label}-Daten</div>
    )
  }

  return (
    <div className="space-y-1">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-1 text-sm font-medium text-gray-700 hover:text-gray-900"
      >
        {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        {label} ({Object.keys(data).length} Felder)
      </button>
      {isExpanded && (
        <div className="bg-gray-50 rounded-md p-3 text-xs font-mono overflow-x-auto">
          <pre className="whitespace-pre-wrap break-words">
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}

// Detail-Dialog
function AuditLogDetailDialog({
  log,
  isOpen,
  onClose
}: {
  log: AuditLogEntry | null
  isOpen: boolean
  onClose: () => void
}) {
  if (!log) return null

  const { date, time } = formatDateTime(log.created_at)
  const severityInfo = formatAuditSeverity(log.severity)

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <SeverityIcon severity={log.severity} />
            {formatAuditAction(log.action)}
          </DialogTitle>
          <DialogDescription>
            Detaillierte Informationen zum Audit-Eintrag
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Übersicht */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Zeitpunkt:</span>
              <div className="font-medium">{date} um {time} Uhr</div>
            </div>
            <div>
              <span className="text-gray-500">Akteur:</span>
              <div className="font-medium">{log.actor_name || 'System'}</div>
              {log.actor_role && (
                <Badge variant="outline" className="mt-1 text-xs">
                  {log.actor_role.toUpperCase()}
                </Badge>
              )}
            </div>
            <div>
              <span className="text-gray-500">Entität:</span>
              <div className="font-medium">{formatAuditEntityType(log.entity_type)}</div>
              {log.entity_label && (
                <div className="text-gray-600">{log.entity_label}</div>
              )}
              {log.entity_id && (
                <div className="text-xs text-gray-400 font-mono">{log.entity_id}</div>
              )}
            </div>
            <div>
              <span className="text-gray-500">Schweregrad:</span>
              <div className="mt-1">
                <Badge className={cn("text-xs border", severityInfo.className)}>
                  {severityInfo.label}
                </Badge>
              </div>
            </div>
            <div>
              <span className="text-gray-500">Quelle:</span>
              <div className="font-medium">{formatAuditSource(log.source)}</div>
            </div>
            <div>
              <span className="text-gray-500">ID:</span>
              <div className="text-xs text-gray-400 font-mono">{log.id}</div>
            </div>
          </div>

          {/* Daten-Sektion */}
          <div className="border-t pt-4 space-y-3">
            <h4 className="text-sm font-semibold text-gray-900">Änderungsdaten</h4>
            <JsonViewer data={log.before_data} label="Vorher" />
            <JsonViewer data={log.after_data} label="Nachher" />
            <JsonViewer data={log.metadata} label="Metadaten" />
          </div>

          {/* Technische Details */}
          {(log.ip_address || log.user_agent) && (
            <div className="border-t pt-4">
              <h4 className="text-sm font-semibold text-gray-900 mb-2">Technische Details</h4>
              <div className="text-xs text-gray-500 space-y-1">
                {log.ip_address && <div>IP: {log.ip_address}</div>}
                {log.user_agent && <div className="truncate">UA: {log.user_agent}</div>}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Audit-Log Zeile (Desktop)
function AuditLogRow({
  log,
  onViewDetails
}: {
  log: AuditLogEntry
  onViewDetails: () => void
}) {
  const { date, time } = formatDateTime(log.created_at)
  const severityInfo = formatAuditSeverity(log.severity)

  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
      <td className="py-3 px-4">
        <div className="text-sm font-medium text-gray-900">{date}</div>
        <div className="text-xs text-gray-500">{time}</div>
      </td>
      <td className="py-3 px-4">
        <div className="text-sm text-gray-900">{log.actor_name || 'System'}</div>
        {log.actor_role && (
          <Badge variant="outline" className="mt-0.5 text-xs">
            {log.actor_role.toUpperCase()}
          </Badge>
        )}
      </td>
      <td className="py-3 px-4">
        <div className="flex items-center gap-2">
          <SeverityIcon severity={log.severity} />
          <span className="text-sm font-medium text-gray-900">{formatAuditAction(log.action)}</span>
        </div>
      </td>
      <td className="py-3 px-4">
        <div className="text-sm text-gray-900">{formatAuditEntityType(log.entity_type)}</div>
        {log.entity_label && (
          <div className="text-xs text-gray-500 truncate max-w-[150px]">{log.entity_label}</div>
        )}
      </td>
      <td className="py-3 px-4">
        <Badge className={cn("text-xs border", severityInfo.className)}>
          {severityInfo.label}
        </Badge>
      </td>
      <td className="py-3 px-4">
        <div className="text-xs text-gray-500">{formatAuditSource(log.source)}</div>
      </td>
      <td className="py-3 px-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={onViewDetails}
          className="h-8 w-8 p-0"
        >
          <Eye className="h-4 w-4 text-gray-500" />
        </Button>
      </td>
    </tr>
  )
}

// Audit-Log Karte (Mobile)
function AuditLogCard({
  log,
  onViewDetails
}: {
  log: AuditLogEntry
  onViewDetails: () => void
}) {
  const { date, time } = formatDateTime(log.created_at)
  const severityInfo = formatAuditSeverity(log.severity)

  return (
    <Card className="mb-3">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <SeverityIcon severity={log.severity} />
            <span className="font-medium text-sm">{formatAuditAction(log.action)}</span>
          </div>
          <Badge className={cn("text-xs border", severityInfo.className)}>
            {severityInfo.label}
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-2 text-sm mb-3">
          <div>
            <span className="text-gray-500 text-xs">Zeitpunkt</span>
            <div className="text-gray-900">{date} {time}</div>
          </div>
          <div>
            <span className="text-gray-500 text-xs">Akteur</span>
            <div className="text-gray-900">{log.actor_name || 'System'}</div>
          </div>
          <div>
            <span className="text-gray-500 text-xs">Entität</span>
            <div className="text-gray-900">{formatAuditEntityType(log.entity_type)}</div>
          </div>
          <div>
            <span className="text-gray-500 text-xs">Quelle</span>
            <div className="text-gray-900">{formatAuditSource(log.source)}</div>
          </div>
        </div>

        {log.entity_label && (
          <div className="text-xs text-gray-500 mb-3 truncate">
            {log.entity_label}
          </div>
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={onViewDetails}
          className="w-full"
        >
          <Eye className="h-4 w-4 mr-2" />
          Details anzeigen
        </Button>
      </CardContent>
    </Card>
  )
}

export default function AuditLogPage() {
  const router = useRouter()
  const [userName, setUserName] = useState("")
  const [userRole, setUserRole] = useState<'admin' | 'gf' | 'disponent'>('admin')
  const [isLoading, setIsLoading] = useState(true)
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([])
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [showFilters, setShowFilters] = useState(false)

  // Filter-State
  const [filters, setFilters] = useState<{
    startDate: string
    endDate: string
    action: string
    entityType: string
    severity: string
    search: string
  }>({
    startDate: '',
    endDate: '',
    action: 'all',
    entityType: 'all',
    severity: 'all',
    search: ''
  })

  // Initialer Auth-Check und Daten laden
  useEffect(() => {
    async function checkAuthAndLoad() {
      try {
        const user = await getCurrentUser()
        if (!user) {
          router.push('/auth/login')
          return
        }

        const profile = await getUserProfile(user.id)
        if (!profile) {
          router.push('/auth/login')
          return
        }

        // Fahrer und Disponent haben keinen Zugriff
        if (profile.role === 'fahrer' || profile.role === 'disponent') {
          router.push('/admin/dashboard')
          return
        }

        setUserName(profile.full_name || user.email || 'Admin')
        setUserRole(profile.role as 'admin' | 'gf')

        // Audit-Logs laden
        await loadAuditLogs()
      } catch (error) {
        console.error('Auth-Fehler:', error)
        router.push('/auth/login')
      } finally {
        setIsLoading(false)
      }
    }

    checkAuthAndLoad()
  }, [router])

  // Audit-Logs laden
  async function loadAuditLogs() {
    try {
      const apiFilters: AuditLogFilters = {
        limit: 200
      }

      if (filters.startDate) {
        apiFilters.startDate = filters.startDate
      }
      if (filters.endDate) {
        apiFilters.endDate = filters.endDate
      }
      if (filters.action !== 'all') {
        apiFilters.action = filters.action
      }
      if (filters.entityType !== 'all') {
        apiFilters.entityType = filters.entityType
      }
      if (filters.severity !== 'all') {
        apiFilters.severity = filters.severity as AuditSeverity
      }

      const logs = await getAuditLogs(apiFilters)
      setAuditLogs(logs)
    } catch (error) {
      console.error('Fehler beim Laden der Audit-Logs:', error)
    }
  }

  // Filter anwenden
  useEffect(() => {
    if (!isLoading) {
      loadAuditLogs()
    }
  }, [filters.startDate, filters.endDate, filters.action, filters.entityType, filters.severity])

  // Textsuche (lokal)
  const filteredLogs = useMemo(() => {
    if (!filters.search.trim()) {
      return auditLogs
    }

    const searchLower = filters.search.toLowerCase()
    return auditLogs.filter(log =>
      (log.actor_name?.toLowerCase().includes(searchLower)) ||
      (log.entity_label?.toLowerCase().includes(searchLower)) ||
      (log.entity_id?.toLowerCase().includes(searchLower)) ||
      formatAuditAction(log.action).toLowerCase().includes(searchLower) ||
      formatAuditEntityType(log.entity_type).toLowerCase().includes(searchLower)
    )
  }, [auditLogs, filters.search])

  // Detail öffnen
  function handleViewDetails(log: AuditLogEntry) {
    setSelectedLog(log)
    setIsDetailOpen(true)
  }

  // Logout
  async function handleSignOut() {
    await signOut()
    router.push('/auth/login')
  }

  // Filter zurücksetzen
  function resetFilters() {
    setFilters({
      startDate: '',
      endDate: '',
      action: 'all',
      entityType: 'all',
      severity: 'all',
      search: ''
    })
  }

  if (isLoading) {
    return (
      <AdminLayout
        userName={userName}
        userRole={userRole}
        onLogout={handleSignOut}
      >
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout
      userName={userName}
      userRole={userRole}
      onLogout={handleSignOut}
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <ClipboardList className="h-6 w-6 text-primary-blue" />
              Audit-Log
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Nachvollziehbarkeit sensibler Aktionen
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="gap-2"
            >
              <Filter className="h-4 w-4" />
              Filter
              {(filters.startDate || filters.endDate || filters.action !== 'all' || filters.entityType !== 'all' || filters.severity !== 'all') && (
                <Badge className="ml-1 h-5 w-5 p-0 flex items-center justify-center bg-primary-blue text-white">
                  !
                </Badge>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadAuditLogs()}
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Aktualisieren
            </Button>
          </div>
        </div>

        {/* Filter-Bereich */}
        {showFilters && (
          <Card>
            <CardContent className="pt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                {/* Datum von */}
                <div className="space-y-1.5">
                  <Label htmlFor="startDate" className="text-xs">Von</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={filters.startDate}
                    onChange={(e) => setFilters(f => ({ ...f, startDate: e.target.value }))}
                    className="h-9"
                  />
                </div>

                {/* Datum bis */}
                <div className="space-y-1.5">
                  <Label htmlFor="endDate" className="text-xs">Bis</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={filters.endDate}
                    onChange={(e) => setFilters(f => ({ ...f, endDate: e.target.value }))}
                    className="h-9"
                  />
                </div>

                {/* Aktion */}
                <div className="space-y-1.5">
                  <Label className="text-xs">Aktion</Label>
                  <Select
                    value={filters.action}
                    onValueChange={(value) => setFilters(f => ({ ...f, action: value }))}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {AVAILABLE_ACTIONS.map(a => (
                        <SelectItem key={a.value} value={a.value}>
                          {a.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Entitätstyp */}
                <div className="space-y-1.5">
                  <Label className="text-xs">Entität</Label>
                  <Select
                    value={filters.entityType}
                    onValueChange={(value) => setFilters(f => ({ ...f, entityType: value }))}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {AVAILABLE_ENTITY_TYPES.map(e => (
                        <SelectItem key={e.value} value={e.value}>
                          {e.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Schweregrad */}
                <div className="space-y-1.5">
                  <Label className="text-xs">Schweregrad</Label>
                  <Select
                    value={filters.severity}
                    onValueChange={(value) => setFilters(f => ({ ...f, severity: value }))}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {AVAILABLE_SEVERITIES.map(s => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Suche + Reset */}
                <div className="space-y-1.5">
                  <Label htmlFor="search" className="text-xs">Suche</Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                      <Input
                        id="search"
                        placeholder="Suchen..."
                        value={filters.search}
                        onChange={(e) => setFilters(f => ({ ...f, search: e.target.value }))}
                        className="h-9 pl-8"
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={resetFilters}
                      className="h-9 px-2 text-xs"
                    >
                      Reset
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Ergebnis-Info */}
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>{filteredLogs.length} Einträge gefunden</span>
          {filteredLogs.length !== auditLogs.length && (
            <span className="text-xs">(gefiltert aus {auditLogs.length})</span>
          )}
        </div>

        {/* Audit-Log Tabelle (Desktop) */}
        <div className="hidden md:block">
          <Card>
            <CardContent className="p-0">
              {filteredLogs.length === 0 ? (
                <EmptyState
                  icon={<ClipboardList className="h-16 w-16 text-gray-400" />}
                  title="Keine Audit-Logs gefunden"
                  description="Es wurden keine Audit-Einträge gefunden, die den Filterkriterien entsprechen."
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50/50 border-b border-gray-100">
                        <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-3 px-4">
                          Zeitpunkt
                        </th>
                        <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-3 px-4">
                          Akteur
                        </th>
                        <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-3 px-4">
                          Aktion
                        </th>
                        <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-3 px-4">
                          Entität
                        </th>
                        <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-3 px-4">
                          Schweregrad
                        </th>
                        <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-3 px-4">
                          Quelle
                        </th>
                        <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-3 px-4 w-10">
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredLogs.map(log => (
                        <AuditLogRow
                          key={log.id}
                          log={log}
                          onViewDetails={() => handleViewDetails(log)}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Audit-Log Karten (Mobile) */}
        <div className="md:hidden">
          {filteredLogs.length === 0 ? (
            <EmptyState
              icon={<ClipboardList className="h-16 w-16 text-gray-400" />}
              title="Keine Audit-Logs gefunden"
              description="Es wurden keine Audit-Einträge gefunden, die den Filterkriterien entsprechen."
            />
          ) : (
            filteredLogs.map(log => (
              <AuditLogCard
                key={log.id}
                log={log}
                onViewDetails={() => handleViewDetails(log)}
              />
            ))
          )}
        </div>

        {/* Hinweis zur Unveränderlichkeit */}
        <div className="text-xs text-gray-400 text-center">
          Audit-Logs sind unveränderlich und können nicht bearbeitet oder gelöscht werden.
        </div>
      </div>

      {/* Detail-Dialog */}
      <AuditLogDetailDialog
        log={selectedLog}
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false)
          setSelectedLog(null)
        }}
      />
    </AdminLayout>
  )
}
