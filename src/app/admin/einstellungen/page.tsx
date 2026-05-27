"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AdminLayout } from "@/components/admin/AdminLayout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { EmptyState } from "@/components/ui/empty-state"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { getCurrentUser, getUserProfile, signOut } from "@/lib/api"
import {
  getActiveSystemSettings,
  getSettingHistory,
  groupSettings,
  hasSettingsAccess,
  createSystemSettingVersion,
  isAllowedSettingKey,
  validateSettingValue,
  type SystemSetting,
  type SettingsGroup,
  type AllowedSettingKey
} from "@/lib/settings-api"
import {
  Settings,
  RefreshCw,
  AlertCircle,
  Euro,
  Percent,
  Calendar,
  Clock,
  Bell,
  CheckCircle,
  Info,
  Plus,
  History,
  ChevronDown,
  ChevronUp,
  Save,
  X
} from "lucide-react"

// Hilfsfunktion für Datumsformatierung
function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—"
  const date = new Date(dateStr)
  return date.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  })
}

// Morgen als Standarddatum
function getTomorrowDate(): string {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  return tomorrow.toISOString().split('T')[0]
}

export default function EinstellungenPage() {
  const router = useRouter()
  const [userName, setUserName] = useState("")
  const [userRole, setUserRole] = useState<'admin' | 'disponent'>('admin')
  const [isLoading, setIsLoading] = useState(true)
  const [settings, setSettings] = useState<SystemSetting[]>([])
  const [settingsGroups, setSettingsGroups] = useState<SettingsGroup[]>([])
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  // Neuer Version Dialog State
  const [newVersionDialogOpen, setNewVersionDialogOpen] = useState(false)
  const [selectedSetting, setSelectedSetting] = useState<{
    key: string
    label: string
    currentValue: unknown
    unit?: string
    description?: string
  } | null>(null)
  const [newValue, setNewValue] = useState("")
  const [validFrom, setValidFrom] = useState(getTomorrowDate())
  const [newDescription, setNewDescription] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Historie State
  const [showHistoryFor, setShowHistoryFor] = useState<string | null>(null)
  const [historyData, setHistoryData] = useState<SystemSetting[]>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)

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
      // Nur Admin/GF erlaubt
      if (role !== 'admin' && role !== 'gf') {
        router.push("/admin/dashboard")
        return
      }
      setUserRole('admin')
      setUserName(profile.full_name)

      await loadSettings()
      setIsLoading(false)
    } catch {
      router.push("/admin")
    }
  }

  const loadSettings = async () => {
    try {
      setIsRefreshing(true)
      setLoadError(null)
      const data = await getActiveSystemSettings()
      setSettings(data)
      setSettingsGroups(groupSettings(data))
    } catch (err) {
      console.error("Fehler beim Laden der Einstellungen:", err)
      setLoadError(err instanceof Error ? err.message : "Fehler beim Laden")
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleRefresh = async () => {
    await loadSettings()
  }

  const handleLogout = async () => {
    await signOut()
    router.push("/admin")
  }

  // Neue Version erstellen
  const handleOpenNewVersionDialog = (setting: {
    key: string
    label: string
    value: unknown
    unit?: string
    description?: string
  }) => {
    setSelectedSetting({
      key: setting.key,
      label: setting.label,
      currentValue: setting.value,
      unit: setting.unit,
      description: setting.description
    })
    setNewValue(String(setting.value === "—" ? "" : setting.value))
    setValidFrom(getTomorrowDate())
    setNewDescription("")
    setSaveError(null)
    setNewVersionDialogOpen(true)
  }

  const handleCloseNewVersionDialog = () => {
    setNewVersionDialogOpen(false)
    setSelectedSetting(null)
    setNewValue("")
    setNewDescription("")
    setSaveError(null)
  }

  const handleSaveNewVersion = async () => {
    if (!selectedSetting || !isAllowedSettingKey(selectedSetting.key)) {
      setSaveError("Ungültige Einstellung")
      return
    }

    // Wert in richtigem Typ
    let typedValue: unknown = newValue
    // Für numerische Settings
    if (["minijob_limit", "employer_contribution_rate", "settlement_day",
         "availability_deadline_day", "availability_deadline_hour",
         "availability_reminder_day", "availability_reminder_hour",
         "availability_escalation_hour"].includes(selectedSetting.key)) {
      typedValue = Number(newValue)
    }

    // Client-seitige Validierung
    const validationError = validateSettingValue(selectedSetting.key as AllowedSettingKey, typedValue)
    if (validationError) {
      setSaveError(validationError)
      return
    }

    setIsSaving(true)
    setSaveError(null)

    try {
      const result = await createSystemSettingVersion({
        key: selectedSetting.key as AllowedSettingKey,
        value: typedValue,
        description: newDescription || undefined,
        valid_from: validFrom
      })

      if (!result.success) {
        setSaveError(result.error || "Fehler beim Speichern")
        return
      }

      // Erfolgreich - Dialog schließen und Liste neu laden
      handleCloseNewVersionDialog()
      await loadSettings()
    } catch (err) {
      console.error("Fehler beim Speichern:", err)
      setSaveError(err instanceof Error ? err.message : "Unbekannter Fehler")
    } finally {
      setIsSaving(false)
    }
  }

  // Historie laden
  const handleToggleHistory = async (key: string) => {
    if (showHistoryFor === key) {
      setShowHistoryFor(null)
      setHistoryData([])
      return
    }

    setShowHistoryFor(key)
    setIsLoadingHistory(true)
    try {
      const history = await getSettingHistory(key)
      setHistoryData(history)
    } catch (err) {
      console.error("Fehler beim Laden der Historie:", err)
      setHistoryData([])
    } finally {
      setIsLoadingHistory(false)
    }
  }

  const getGroupIcon = (title: string) => {
    if (title.includes("Minijob")) return Euro
    if (title.includes("Arbeitgeber")) return Percent
    if (title.includes("Auszahlung")) return Calendar
    if (title.includes("Verfügbarkeit")) return Clock
    return Settings
  }

  const getGroupIconClass = (title: string) => {
    if (title.includes("Minijob")) return "text-emerald-600 bg-emerald-50"
    if (title.includes("Arbeitgeber")) return "text-amber-600 bg-amber-50"
    if (title.includes("Auszahlung")) return "text-sky-600 bg-sky-50"
    if (title.includes("Verfügbarkeit")) return "text-violet-600 bg-violet-50"
    return "text-gray-600 bg-gray-50"
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
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Einstellungen</h1>
            <p className="text-gray-500 mt-1">
              Systemweite Konfiguration für Phase 1 Smart & Care
            </p>
          </div>
          <Button variant="outline" onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Aktualisieren
          </Button>
        </div>

        {/* Admin-Only Hinweis */}
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600" />
            <div>
              <p className="text-sm font-medium text-amber-900">Admin-Bereich</p>
              <p className="text-sm text-amber-700">
                Systemeinstellungen sind nur für Administratoren und Geschäftsführer sichtbar.
                Änderungen werden versioniert und sind historisch nachvollziehbar.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Status Card */}
        <Card className="border-gray-100">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              {hasSettingsAccess(settings) ? (
                <>
                  <CheckCircle className="h-5 w-5 text-emerald-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {settings.length} aktive Einstellungen geladen
                    </p>
                    <p className="text-xs text-gray-500">
                      Systemkonfiguration erfolgreich abgerufen
                    </p>
                  </div>
                </>
              ) : loadError ? (
                <>
                  <AlertCircle className="h-5 w-5 text-red-600" />
                  <div>
                    <p className="text-sm font-medium text-red-900">
                      Fehler beim Laden der Einstellungen
                    </p>
                    <p className="text-xs text-red-700">{loadError}</p>
                  </div>
                </>
              ) : (
                <>
                  <Info className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      Keine Einstellungen gefunden
                    </p>
                    <p className="text-xs text-gray-500">
                      Die Systemkonfiguration wurde noch nicht initialisiert
                    </p>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Settings Groups */}
        {settingsGroups.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {settingsGroups.map((group) => {
              const Icon = getGroupIcon(group.title)
              const iconClass = getGroupIconClass(group.title)

              return (
                <Card key={group.title} className="border-gray-100">
                  <CardHeader className="pb-3">
                    <div className="flex items-start gap-3">
                      <div className={`p-2.5 rounded-lg ${iconClass}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-base font-semibold text-gray-900">
                          {group.title}
                        </CardTitle>
                        <CardDescription className="text-sm mt-0.5">
                          {group.description}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-3">
                      {group.settings.map((setting) => (
                        <div key={setting.key} className="space-y-2">
                          <div className="flex items-center justify-between py-2 border-b border-gray-50">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-700">
                                {setting.label}
                              </p>
                              {setting.description && (
                                <p className="text-xs text-gray-400 truncate">
                                  {setting.description}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-2 ml-4">
                              <Badge
                                variant="outline"
                                className="bg-gray-50 text-gray-900 border-gray-200 font-mono text-sm px-2.5"
                              >
                                {String(setting.value)}
                                {setting.unit && (
                                  <span className="text-gray-500 ml-0.5">
                                    {setting.unit}
                                  </span>
                                )}
                              </Badge>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-xs text-gray-500 hover:text-gray-900"
                                onClick={() => handleToggleHistory(setting.key)}
                              >
                                <History className="h-3.5 w-3.5 mr-1" />
                                {showHistoryFor === setting.key ? (
                                  <ChevronUp className="h-3 w-3" />
                                ) : (
                                  <ChevronDown className="h-3 w-3" />
                                )}
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 px-2 text-xs"
                                onClick={() => handleOpenNewVersionDialog(setting)}
                              >
                                <Plus className="h-3.5 w-3.5 mr-1" />
                                Neue Version
                              </Button>
                            </div>
                          </div>

                          {/* Historie für diese Einstellung */}
                          {showHistoryFor === setting.key && (
                            <div className="ml-4 pl-4 border-l-2 border-gray-100">
                              {isLoadingHistory ? (
                                <p className="text-xs text-gray-400 py-2">Lade Historie...</p>
                              ) : historyData.length === 0 ? (
                                <p className="text-xs text-gray-400 py-2">Keine historischen Versionen</p>
                              ) : (
                                <div className="space-y-1.5 py-2">
                                  <p className="text-xs font-medium text-gray-500 mb-2">
                                    Versionsverlauf ({historyData.length} Einträge)
                                  </p>
                                  {historyData.map((version, idx) => (
                                    <div
                                      key={version.id}
                                      className={`flex items-center justify-between text-xs py-1.5 px-2 rounded ${
                                        idx === 0 && !version.valid_until
                                          ? "bg-emerald-50 border border-emerald-100"
                                          : "bg-gray-50"
                                      }`}
                                    >
                                      <span className="font-mono">
                                        {String(version.value)}
                                        {setting.unit && (
                                          <span className="text-gray-400 ml-0.5">
                                            {setting.unit}
                                          </span>
                                        )}
                                      </span>
                                      <span className="text-gray-400">
                                        {formatDate(version.valid_from)}
                                        {version.valid_until && (
                                          <> – {formatDate(version.valid_until)}</>
                                        )}
                                        {!version.valid_until && (
                                          <Badge className="ml-2 text-[10px] px-1.5 py-0 bg-emerald-100 text-emerald-700 border-0">
                                            aktiv
                                          </Badge>
                                        )}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        ) : !loadError && (
          <Card className="border-gray-100">
            <CardContent className="p-8">
              <EmptyState
                title="Keine Einstellungen"
                description="Es wurden keine aktiven Systemeinstellungen gefunden."
                icon={<Settings className="h-16 w-16 text-gray-400" />}
              />
            </CardContent>
          </Card>
        )}

        {/* Systemstatus */}
        <Card className="border-gray-100">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary-blue" />
              <CardTitle className="text-base font-semibold text-gray-900">
                Systemstatus
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-gray-50">
                <span className="text-sm text-gray-600">Phase</span>
                <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 border">
                  Phase 1 - Smart & Care
                </Badge>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-50">
                <span className="text-sm text-gray-600">Kunde</span>
                <span className="text-sm font-medium text-gray-900">Smart & Care</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-50">
                <span className="text-sm text-gray-600">Preismodell</span>
                <span className="text-sm font-medium text-gray-900">km-Staffelung + Wartezeit</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-gray-600">Beschäftigungsart</span>
                <span className="text-sm font-medium text-gray-900">Minijob (520€-Basis)</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Hinweis */}
        <Card className="border-gray-100 bg-gray-50/50">
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">
              Änderungen an Einstellungen werden als neue Version gespeichert.
              Alte Werte bleiben historisch erhalten und sind über den Versionsverlauf einsehbar.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Neue Version Dialog */}
      <Dialog open={newVersionDialogOpen} onOpenChange={setNewVersionDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary-blue" />
              Neue Version erstellen
            </DialogTitle>
            <DialogDescription>
              Diese Änderung erstellt eine neue Version. Alte Werte bleiben historisch erhalten.
            </DialogDescription>
          </DialogHeader>

          {selectedSetting && (
            <div className="space-y-4 py-4">
              {/* Einstellungs-Info */}
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">Einstellung</p>
                <p className="text-sm font-medium text-gray-900">{selectedSetting.label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{selectedSetting.key}</p>
              </div>

              {/* Aktueller Wert */}
              <div>
                <Label className="text-xs text-gray-500">Aktueller Wert</Label>
                <div className="mt-1 flex items-center gap-2">
                  <Badge variant="outline" className="font-mono">
                    {String(selectedSetting.currentValue)}
                    {selectedSetting.unit && (
                      <span className="text-gray-400 ml-0.5">{selectedSetting.unit}</span>
                    )}
                  </Badge>
                </div>
              </div>

              {/* Neuer Wert */}
              <div>
                <Label htmlFor="newValue" className="text-sm">
                  Neuer Wert {selectedSetting.unit && <span className="text-gray-400">({selectedSetting.unit})</span>}
                </Label>
                <Input
                  id="newValue"
                  type="text"
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  className="mt-1 font-mono"
                  placeholder={`z.B. ${selectedSetting.currentValue}`}
                />
              </div>

              {/* Gültig ab */}
              <div>
                <Label htmlFor="validFrom" className="text-sm">Gültig ab</Label>
                <Input
                  id="validFrom"
                  type="date"
                  value={validFrom}
                  onChange={(e) => setValidFrom(e.target.value)}
                  className="mt-1"
                  min={getTomorrowDate()}
                />
                <p className="text-xs text-gray-400 mt-1">
                  Die neue Version wird ab diesem Datum aktiv.
                </p>
              </div>

              {/* Beschreibung (optional) */}
              <div>
                <Label htmlFor="description" className="text-sm">
                  Beschreibung <span className="text-gray-400">(optional)</span>
                </Label>
                <Textarea
                  id="description"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="mt-1"
                  rows={2}
                  placeholder="Grund für die Änderung..."
                />
              </div>

              {/* Fehleranzeige */}
              {saveError && (
                <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>{saveError}</span>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={handleCloseNewVersionDialog}
              disabled={isSaving}
            >
              <X className="h-4 w-4 mr-2" />
              Abbrechen
            </Button>
            <Button
              onClick={handleSaveNewVersion}
              disabled={isSaving || !newValue}
            >
              {isSaving ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Version erstellen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  )
}
