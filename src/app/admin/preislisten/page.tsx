"use client"

import { useEffect, useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { AdminLayout } from "@/components/admin/AdminLayout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { EmptyState } from "@/components/ui/empty-state"
import { getCurrentUser, getUserProfile, signOut } from "@/lib/api"
import {
  getAllPricingTables,
  formatPricingType,
  getPricingTypeColors,
  formatEmploymentType,
  isPricingActive,
  createPricingTableVersion,
  type PricingTable,
  type KmRange,
  type CreatePricingVersionParams,
  type ValidationError
} from "@/lib/pricing-admin-api"
import {
  Euro,
  Users,
  Car,
  RefreshCw,
  Info,
  Clock,
  CheckCircle2,
  History,
  Plus,
  Trash2,
  AlertTriangle,
  FilePlus2
} from "lucide-react"

export default function PreislistenPage() {
  const router = useRouter()
  const [userName, setUserName] = useState("")
  const [userRole, setUserRole] = useState<'admin' | 'disponent'>('admin')
  const [isLoading, setIsLoading] = useState(true)
  const [pricingTables, setPricingTables] = useState<PricingTable[]>([])
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Editor State
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingTable, setEditingTable] = useState<PricingTable | null>(null)
  const [editorName, setEditorName] = useState("")
  const [editorValidFrom, setEditorValidFrom] = useState("")
  const [editorWaitingRate, setEditorWaitingRate] = useState("")
  const [editorKmRanges, setEditorKmRanges] = useState<KmRange[]>([])
  const [editorErrors, setEditorErrors] = useState<ValidationError[]>([])
  const [isSaving, setIsSaving] = useState(false)

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

      await loadPricingTables()
      setIsLoading(false)
    } catch {
      router.push("/admin")
    }
  }

  const loadPricingTables = async () => {
    try {
      setIsRefreshing(true)
      setError(null)
      const data = await getAllPricingTables()
      setPricingTables(data)
    } catch (err) {
      console.error("Fehler beim Laden:", err)
      setError("Preislisten konnten nicht geladen werden. Bitte versuchen Sie es erneut.")
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleRefresh = async () => {
    await loadPricingTables()
  }

  const handleLogout = async () => {
    await signOut()
    router.push("/admin")
  }

  // Aktive und historische Preislisten trennen
  const { activeTables, historicTables } = useMemo(() => {
    const active: PricingTable[] = []
    const historic: PricingTable[] = []

    pricingTables.forEach(p => {
      if (isPricingActive(p.valid_from, p.valid_until)) {
        active.push(p)
      } else {
        historic.push(p)
      }
    })

    return { activeTables: active, historicTables: historic }
  }, [pricingTables])

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('de-DE')
  }

  // Editor oeffnen mit Vorbelegung
  const openEditor = (table: PricingTable) => {
    setEditingTable(table)
    setEditorName(table.name + " (Neue Version)")
    // Default: morgen als valid_from
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    setEditorValidFrom(tomorrow.toISOString().split('T')[0])
    setEditorWaitingRate((table.waiting_unit_rate ?? 0).toString())
    // KM-Ranges kopieren
    setEditorKmRanges(
      table.km_ranges && Array.isArray(table.km_ranges)
        ? table.km_ranges.map(r => ({ max_km: r.max_km ?? 0, amount: r.amount ?? 0 }))
        : [{ max_km: 0, amount: 0 }]
    )
    setEditorErrors([])
    setEditorOpen(true)
  }

  const closeEditor = () => {
    setEditorOpen(false)
    setEditingTable(null)
    setEditorErrors([])
  }

  // KM-Range bearbeiten
  const updateKmRange = (index: number, field: 'max_km' | 'amount', value: string) => {
    const numValue = parseFloat(value) || 0
    setEditorKmRanges(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: numValue }
      return updated
    })
  }

  const addKmRange = () => {
    const lastMaxKm = editorKmRanges.length > 0
      ? editorKmRanges[editorKmRanges.length - 1].max_km
      : 0
    setEditorKmRanges(prev => [...prev, { max_km: lastMaxKm + 50, amount: 0 }])
  }

  const removeKmRange = (index: number) => {
    if (editorKmRanges.length <= 1) return
    setEditorKmRanges(prev => prev.filter((_, i) => i !== index))
  }

  // Speichern
  const handleSave = async () => {
    if (!editingTable) return

    setIsSaving(true)
    setEditorErrors([])

    const params: CreatePricingVersionParams = {
      sourcePricingTableId: editingTable.id,
      name: editorName.trim(),
      validFrom: editorValidFrom,
      waitingUnitRate: parseFloat(editorWaitingRate) || 0,
      kmRanges: editorKmRanges.sort((a, b) => a.max_km - b.max_km)
    }

    try {
      const result = await createPricingTableVersion(params)

      if (!result.success && result.errors) {
        setEditorErrors(result.errors)
        setIsSaving(false)
        return
      }

      // Erfolg
      closeEditor()
      await loadPricingTables()
    } catch (err) {
      console.error("Fehler beim Speichern:", err)
      setEditorErrors([{ field: 'general', message: 'Unerwarteter Fehler beim Speichern' }])
    } finally {
      setIsSaving(false)
    }
  }

  const getFieldError = (field: string): string | undefined => {
    return editorErrors.find(e => e.field === field)?.message
  }

  // KM-Staffel als Tabelle rendern
  const renderKmRangesTable = (ranges: KmRange[]) => {
    if (!ranges || !Array.isArray(ranges) || ranges.length === 0) {
      return <p className="text-sm text-gray-500">Keine km-Staffel definiert</p>
    }

    const sorted = [...ranges].sort((a, b) => (a.max_km ?? 0) - (b.max_km ?? 0))

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-xs">bis km</TableHead>
            <TableHead className="text-xs text-right">Betrag</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((r, idx) => (
            <TableRow key={idx}>
              <TableCell className="text-sm py-1">{r.max_km ?? 0} km</TableCell>
              <TableCell className="text-sm py-1 text-right font-medium">
                {(r.amount ?? 0).toFixed(2)} EUR
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    )
  }

  // Preislisten-Karte rendern
  const renderPricingCard = (table: PricingTable, showEditButton: boolean) => {
    const typeColors = getPricingTypeColors(table.type)
    const isActive = isPricingActive(table.valid_from, table.valid_until)

    return (
      <Card key={table.id} className="border-gray-200">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              {table.type === 'customer' ? (
                <Users className="h-5 w-5 text-blue-600" />
              ) : (
                <Car className="h-5 w-5 text-emerald-600" />
              )}
              <div>
                <CardTitle className="text-base">{table.name}</CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  {table.customer_name || table.client}
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={`${typeColors.bg} ${typeColors.text} ${typeColors.border} border text-xs`}>
                {formatPricingType(table.type)}
              </Badge>
              {isActive ? (
                <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 border text-xs">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Aktiv
                </Badge>
              ) : (
                <Badge className="bg-gray-50 text-gray-500 border-gray-200 border text-xs">
                  Inaktiv
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Basisinformationen */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-gray-500 text-xs">Beschaeftigungsmodell</p>
              <p className="font-medium">{formatEmploymentType(table.employment_type)}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs">Wartezeit-Satz</p>
              <p className="font-medium">{(table.waiting_unit_rate ?? 0).toFixed(2)} EUR/Einheit</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs">Gueltig ab</p>
              <p className="font-medium">{formatDate(table.valid_from)}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs">Gueltig bis</p>
              <p className="font-medium">{table.valid_until ? formatDate(table.valid_until) : 'Unbegrenzt'}</p>
            </div>
          </div>

          {/* KM-Staffel */}
          <div>
            <p className="text-gray-500 text-xs mb-2">km-Staffel ({table.km_ranges?.length || 0} Stufen)</p>
            <div className="bg-gray-50 rounded-md p-3 max-h-48 overflow-y-auto">
              {renderKmRangesTable(table.km_ranges)}
            </div>
          </div>

          {/* Neue Version erstellen Button - nur fuer aktive Preislisten */}
          {showEditButton && isActive && (
            <div className="pt-2 border-t border-gray-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => openEditor(table)}
                className="w-full"
              >
                <FilePlus2 className="h-4 w-4 mr-2" />
                Neue Version erstellen
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    )
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
            <h1 className="text-2xl font-bold text-gray-900">Preislisten</h1>
            <p className="text-gray-500 mt-1">Aktive und historische Preislisten fuer Kunden- und Fahrerabrechnung</p>
          </div>
          <Button variant="outline" onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Aktualisieren
          </Button>
        </div>

        {/* Hinweis-Karte zur Versionierung */}
        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-blue-900">Hinweis zur Preisversionierung</p>
                <ul className="text-sm text-blue-800 space-y-0.5">
                  <li>Preisaenderungen wirken nicht rueckwirkend.</li>
                  <li>Klicken Sie auf "Neue Version erstellen" um Preise zu aktualisieren.</li>
                  <li>Bestehende Touren behalten ihren calculation_snapshot.</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Fehleranzeige */}
        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-4">
              <p className="text-sm text-red-700">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Aktive Preislisten */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            <h2 className="text-lg font-semibold text-gray-900">Aktive Preislisten</h2>
            <Badge variant="secondary" className="ml-2">{activeTables.length}</Badge>
          </div>

          {activeTables.length === 0 ? (
            <Card className="border-gray-100">
              <CardContent className="p-8">
                <EmptyState
                  title="Keine aktiven Preislisten"
                  description="Es sind derzeit keine aktiven Preislisten vorhanden."
                  icon={<Euro className="h-12 w-12 text-gray-400" />}
                  iconSize="sm"
                />
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {activeTables.map(table => renderPricingCard(table, true))}
            </div>
          )}
        </div>

        {/* Historische Preislisten */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <History className="h-5 w-5 text-gray-500" />
            <h2 className="text-lg font-semibold text-gray-900">Historische Preislisten</h2>
            <Badge variant="secondary" className="ml-2">{historicTables.length}</Badge>
          </div>

          {historicTables.length === 0 ? (
            <Card className="border-gray-100 bg-gray-50/50">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 text-gray-500">
                  <Clock className="h-5 w-5" />
                  <p className="text-sm">Keine historischen Preislisten vorhanden</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {historicTables.map(table => renderPricingCard(table, false))}
            </div>
          )}
        </div>
      </div>

      {/* Editor Dialog */}
      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Neue Preislisten-Version erstellen</DialogTitle>
            <DialogDescription>
              Basierend auf: {editingTable?.name}
            </DialogDescription>
          </DialogHeader>

          {/* Warnhinweis */}
          <div className="bg-amber-50 border border-amber-200 rounded-md p-3 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
            <p className="text-sm text-amber-800">
              Aenderungen erstellen eine neue Version. Bestehende Touren und Abrechnungen bleiben unveraendert.
            </p>
          </div>

          {/* Allgemeine Fehler */}
          {getFieldError('general') && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-sm text-red-700">{getFieldError('general')}</p>
            </div>
          )}

          <div className="space-y-4">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="editor-name">Name</Label>
              <Input
                id="editor-name"
                value={editorName}
                onChange={e => setEditorName(e.target.value)}
                placeholder="Name der neuen Version"
              />
              {getFieldError('name') && (
                <p className="text-sm text-red-600">{getFieldError('name')}</p>
              )}
            </div>

            {/* Gueltig ab */}
            <div className="space-y-2">
              <Label htmlFor="editor-valid-from">Gueltig ab</Label>
              <Input
                id="editor-valid-from"
                type="date"
                value={editorValidFrom}
                onChange={e => setEditorValidFrom(e.target.value)}
              />
              {getFieldError('validFrom') && (
                <p className="text-sm text-red-600">{getFieldError('validFrom')}</p>
              )}
            </div>

            {/* Wartezeit-Satz */}
            <div className="space-y-2">
              <Label htmlFor="editor-waiting-rate">Wartezeit-Satz (EUR/Einheit)</Label>
              <Input
                id="editor-waiting-rate"
                type="number"
                step="0.01"
                min="0"
                value={editorWaitingRate}
                onChange={e => setEditorWaitingRate(e.target.value)}
                placeholder="0.00"
              />
              {getFieldError('waitingUnitRate') && (
                <p className="text-sm text-red-600">{getFieldError('waitingUnitRate')}</p>
              )}
            </div>

            {/* KM-Staffel */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>km-Staffel</Label>
                <Button type="button" variant="outline" size="sm" onClick={addKmRange}>
                  <Plus className="h-3 w-3 mr-1" />
                  Stufe hinzufuegen
                </Button>
              </div>
              {getFieldError('kmRanges') && (
                <p className="text-sm text-red-600">{getFieldError('kmRanges')}</p>
              )}
              <div className="bg-gray-50 rounded-md p-3 space-y-2">
                <div className="grid grid-cols-[1fr_1fr_auto] gap-2 text-xs font-medium text-gray-500 px-1">
                  <span>bis km</span>
                  <span>Betrag (EUR)</span>
                  <span></span>
                </div>
                {editorKmRanges.map((range, idx) => (
                  <div key={idx} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
                    <Input
                      type="number"
                      min="0"
                      value={range.max_km}
                      onChange={e => updateKmRange(idx, 'max_km', e.target.value)}
                      className="h-8"
                    />
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={range.amount}
                      onChange={e => updateKmRange(idx, 'amount', e.target.value)}
                      className="h-8"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeKmRange(idx)}
                      disabled={editorKmRanges.length <= 1}
                      className="h-8 w-8 p-0"
                    >
                      <Trash2 className="h-4 w-4 text-gray-400" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={closeEditor} disabled={isSaving}>
              Abbrechen
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Speichern...
                </>
              ) : (
                'Neue Version erstellen'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  )
}
