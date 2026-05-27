"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  CreditCard,
  Plus,
  Edit,
  Check,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Trash2,
  Fuel,
  Calendar,
  Lock
} from "lucide-react"
import {
  getFahrerFuelCard,
  saveFahrerFuelCard,
  deleteFahrerFuelCard,
  getFuelCardStatusLabel,
  type FahrerFuelCard,
  type FuelCardStatus
} from "@/lib/fahrer-management-api"
import { cn } from "@/lib/utils"

interface FahrerakteTankCardProps {
  fahrerId: string
  isAdmin: boolean
}

const FUEL_CARD_PROVIDERS = [
  { value: 'aral', label: 'Aral' },
  { value: 'shell', label: 'Shell' },
  { value: 'total', label: 'Total' },
  { value: 'dkv', label: 'DKV' },
  { value: 'uta', label: 'UTA' },
  { value: 'esso', label: 'Esso' },
  { value: 'sonstige', label: 'Sonstige' }
]

const STATUS_CONFIG: Record<FuelCardStatus, { label: string; className: string; icon: React.ReactNode }> = {
  aktiv: {
    label: 'Aktiv',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: <Check className="h-3 w-3" />
  },
  gesperrt: {
    label: 'Gesperrt',
    className: 'bg-red-50 text-red-700 border-red-200',
    icon: <Lock className="h-3 w-3" />
  },
  zurueckgegeben: {
    label: 'Zurückgegeben',
    className: 'bg-gray-100 text-gray-700 border-gray-200',
    icon: <Check className="h-3 w-3" />
  },
  verloren: {
    label: 'Verloren',
    className: 'bg-orange-50 text-orange-700 border-orange-200',
    icon: <AlertTriangle className="h-3 w-3" />
  }
}

function getStatusConfig(status: FuelCardStatus) {
  return STATUS_CONFIG[status] || STATUS_CONFIG.aktiv
}

export function FahrerakteTankCard({ fahrerId, isAdmin }: FahrerakteTankCardProps) {
  const [fuelCard, setFuelCard] = useState<FahrerFuelCard | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Edit Modal State
  const [showEditModal, setShowEditModal] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState("")

  // Form State
  const [provider, setProvider] = useState("")
  const [cardNumberLast4, setCardNumberLast4] = useState("")
  const [issuedAt, setIssuedAt] = useState("")
  const [status, setStatus] = useState<FuelCardStatus>('aktiv')
  const [comment, setComment] = useState("")

  // Delete Modal State
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    loadFuelCard()
  }, [fahrerId])

  const loadFuelCard = async () => {
    setIsLoading(true)
    try {
      const data = await getFahrerFuelCard(fahrerId)
      setFuelCard(data)
    } catch (err) {
      console.error("Fehler beim Laden der Tankkarte:", err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleOpenEditModal = () => {
    if (fuelCard) {
      // Bearbeiten
      setProvider(fuelCard.provider)
      setCardNumberLast4(fuelCard.card_number_last4)
      setIssuedAt(fuelCard.issued_at || "")
      setStatus(fuelCard.status)
      setComment(fuelCard.comment || "")
    } else {
      // Neu anlegen
      setProvider("")
      setCardNumberLast4("")
      setIssuedAt("")
      setStatus('aktiv')
      setComment("")
    }
    setError("")
    setShowEditModal(true)
  }

  const handleSave = async () => {
    if (!provider) {
      setError("Bitte einen Anbieter auswählen")
      return
    }
    if (!cardNumberLast4 || cardNumberLast4.length !== 4) {
      setError("Bitte die letzten 4 Ziffern der Kartennummer eingeben")
      return
    }

    setIsSaving(true)
    setError("")

    try {
      const result = await saveFahrerFuelCard(fahrerId, {
        provider,
        card_number_last4: cardNumberLast4,
        issued_at: issuedAt || undefined,
        status,
        comment: comment || undefined
      })

      if (!result.success) {
        throw new Error(result.error || 'Fehler beim Speichern')
      }

      setShowEditModal(false)
      await loadFuelCard()
    } catch (err) {
      console.error("Speichern-Fehler:", err)
      setError(err instanceof Error ? err.message : 'Fehler beim Speichern')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!fuelCard) return

    setIsDeleting(true)
    try {
      const result = await deleteFahrerFuelCard(fuelCard.id)
      if (!result.success) {
        throw new Error(result.error || 'Fehler beim Löschen')
      }

      setShowDeleteModal(false)
      setFuelCard(null)
    } catch (err) {
      console.error("Lösch-Fehler:", err)
      alert("Fehler beim Löschen der Tankkarte")
    } finally {
      setIsDeleting(false)
    }
  }

  const formatDate = (dateStr: string | null | undefined): string => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('de-DE')
  }

  const getProviderLabel = (providerValue: string): string => {
    const found = FUEL_CARD_PROVIDERS.find(p => p.value === providerValue)
    return found?.label || providerValue
  }

  if (!isAdmin) {
    return null
  }

  if (isLoading) {
    return (
      <Card className="border-gray-100">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-gray-400" />
            Tankkarte
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-6">
            <RefreshCw className="h-5 w-5 animate-spin text-gray-400" />
            <span className="ml-2 text-sm text-gray-500">Lade Tankkarte...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card className="border-gray-100">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-gray-400" />
                Tankkarte
              </CardTitle>
              <CardDescription>Tankkarten-Verwaltung</CardDescription>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={handleOpenEditModal}
            >
              {fuelCard ? (
                <>
                  <Edit className="h-4 w-4 mr-1" />
                  Bearbeiten
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-1" />
                  Hinzufügen
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {!fuelCard ? (
            <div className="text-center py-8 text-gray-500">
              <CreditCard className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="text-sm font-medium">Keine Tankkarte hinterlegt</p>
              <p className="text-xs mt-1">
                Klicken Sie auf &quot;Hinzufügen&quot;, um eine Tankkarte zu erfassen.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Karten-Darstellung */}
              <div className={cn(
                "relative p-5 rounded-xl border-2",
                fuelCard.status === 'aktiv'
                  ? "bg-gradient-to-br from-emerald-50 to-emerald-100/50 border-emerald-200"
                  : fuelCard.status === 'gesperrt'
                  ? "bg-gradient-to-br from-red-50 to-red-100/50 border-red-200"
                  : "bg-gradient-to-br from-gray-50 to-gray-100/50 border-gray-200"
              )}>
                {/* Status Badge */}
                <div className="absolute top-3 right-3">
                  <Badge className={cn("border text-xs", getStatusConfig(fuelCard.status).className)}>
                    {getStatusConfig(fuelCard.status).icon}
                    <span className="ml-1">{getStatusConfig(fuelCard.status).label}</span>
                  </Badge>
                </div>

                {/* Anbieter */}
                <div className="flex items-center gap-2 mb-4">
                  <Fuel className="h-5 w-5 text-gray-600" />
                  <span className="font-semibold text-lg text-gray-900">
                    {getProviderLabel(fuelCard.provider)}
                  </span>
                </div>

                {/* Kartennummer */}
                <div className="font-mono text-xl tracking-widest text-gray-700 mb-4">
                  •••• •••• •••• {fuelCard.card_number_last4}
                </div>

                {/* Details */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Ausgegeben</p>
                    <p className="font-medium text-gray-700 flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {formatDate(fuelCard.issued_at)}
                    </p>
                  </div>
                  {fuelCard.returned_at && (
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Zurückgegeben</p>
                      <p className="font-medium text-gray-700">
                        {formatDate(fuelCard.returned_at)}
                      </p>
                    </div>
                  )}
                </div>

                {/* Kommentar */}
                {fuelCard.comment && (
                  <div className="mt-4 pt-3 border-t border-gray-200/50">
                    <p className="text-xs text-gray-500">Notiz: {fuelCard.comment}</p>
                  </div>
                )}
              </div>

              {/* Aktionen */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleOpenEditModal}
                  className="flex-1"
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Bearbeiten
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDeleteModal(true)}
                  className="text-red-600 border-red-200 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit/Add Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary-blue" />
              {fuelCard ? 'Tankkarte bearbeiten' : 'Tankkarte hinzufügen'}
            </DialogTitle>
            <DialogDescription>
              {fuelCard
                ? 'Bearbeiten Sie die Tankkartendaten.'
                : 'Erfassen Sie eine neue Tankkarte für diesen Fahrer.'
              }
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Anbieter */}
            <div className="space-y-2">
              <Label htmlFor="provider">Anbieter</Label>
              <Select value={provider} onValueChange={setProvider}>
                <SelectTrigger>
                  <SelectValue placeholder="Anbieter wählen" />
                </SelectTrigger>
                <SelectContent>
                  {FUEL_CARD_PROVIDERS.map(p => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Kartennummer (letzte 4) */}
            <div className="space-y-2">
              <Label htmlFor="cardNumber">Letzte 4 Ziffern der Kartennummer</Label>
              <Input
                id="cardNumber"
                value={cardNumberLast4}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 4)
                  setCardNumberLast4(val)
                }}
                placeholder="1234"
                maxLength={4}
                className="font-mono tracking-widest"
              />
            </div>

            {/* Ausgabedatum */}
            <div className="space-y-2">
              <Label htmlFor="issuedAt">Ausgabedatum (optional)</Label>
              <Input
                id="issuedAt"
                type="date"
                value={issuedAt}
                onChange={(e) => setIssuedAt(e.target.value)}
              />
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as FuelCardStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="aktiv">Aktiv</SelectItem>
                  <SelectItem value="gesperrt">Gesperrt</SelectItem>
                  <SelectItem value="zurueckgegeben">Zurückgegeben</SelectItem>
                  <SelectItem value="verloren">Verloren</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Kommentar */}
            <div className="space-y-2">
              <Label htmlFor="comment">Kommentar (optional)</Label>
              <Textarea
                id="comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="z.B. Neue Karte nach Verlust..."
                rows={2}
              />
            </div>

            {/* Fehler */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                {error}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowEditModal(false)}
              disabled={isSaving}
            >
              Abbrechen
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="bg-primary-blue hover:bg-blue-700"
            >
              {isSaving ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                "Speichern"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Modal */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="h-5 w-5" />
              Tankkarte löschen
            </DialogTitle>
            <DialogDescription>
              Sind Sie sicher, dass Sie diese Tankkarte löschen möchten?
            </DialogDescription>
          </DialogHeader>

          {fuelCard && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="font-medium text-sm text-red-700">
                {getProviderLabel(fuelCard.provider)} •••• {fuelCard.card_number_last4}
              </p>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteModal(false)}
              disabled={isDeleting}
            >
              Abbrechen
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Löschen
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
