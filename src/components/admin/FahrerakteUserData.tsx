"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  User,
  Mail,
  Phone,
  Clock,
  Key,
  Save,
  RefreshCw,
  Check,
  AlertTriangle,
  Edit
} from "lucide-react"
import {
  updateFahrerName,
  updateFahrerZeitmodell,
  requestPasswordReset
} from "@/lib/fahrer-management-api"
import { updateFahrerStatus } from "@/lib/admin-api"

interface FahrerDetails {
  id: number
  user_id: string | null
  vorname: string
  nachname: string
  zeitmodell: string | null
  status: 'aktiv' | 'inaktiv'
}

interface FahrerakteUserDataProps {
  fahrer: FahrerDetails
  isAdmin: boolean
  onUpdate: () => Promise<void>
}

export function FahrerakteUserData({
  fahrer,
  isAdmin,
  onUpdate
}: FahrerakteUserDataProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [error, setError] = useState("")

  // Edit-Form State
  const [vorname, setVorname] = useState(fahrer.vorname)
  const [nachname, setNachname] = useState(fahrer.nachname)
  const [zeitmodell, setZeitmodell] = useState(fahrer.zeitmodell || 'minijob')
  const [statusAktiv, setStatusAktiv] = useState(fahrer.status === 'aktiv')

  // Passwort-Reset State
  const [showPasswordResetModal, setShowPasswordResetModal] = useState(false)
  const [isResetting, setIsResetting] = useState(false)
  const [resetSuccess, setResetSuccess] = useState(false)
  const [resetError, setResetError] = useState("")

  const handleStartEdit = () => {
    setVorname(fahrer.vorname)
    setNachname(fahrer.nachname)
    setZeitmodell(fahrer.zeitmodell || 'minijob')
    setStatusAktiv(fahrer.status === 'aktiv')
    setIsEditing(true)
    setError("")
    setSaveSuccess(false)
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    setError("")
  }

  const handleSave = async () => {
    if (!vorname.trim() || !nachname.trim()) {
      setError("Vor- und Nachname sind erforderlich")
      return
    }

    setIsSaving(true)
    setError("")
    setSaveSuccess(false)

    try {
      // Name aktualisieren wenn geändert
      if (vorname !== fahrer.vorname || nachname !== fahrer.nachname) {
        const nameResult = await updateFahrerName(fahrer.id, vorname.trim(), nachname.trim())
        if (!nameResult.success) {
          throw new Error(nameResult.error || 'Fehler beim Aktualisieren des Namens')
        }
      }

      // Zeitmodell aktualisieren wenn geändert
      if (zeitmodell !== fahrer.zeitmodell) {
        const zeitmodellResult = await updateFahrerZeitmodell(
          fahrer.id,
          zeitmodell as 'minijob' | 'werkstudent' | 'teilzeit' | 'vollzeit'
        )
        if (!zeitmodellResult.success) {
          throw new Error(zeitmodellResult.error || 'Fehler beim Aktualisieren des Zeitmodells')
        }
      }

      // Status aktualisieren wenn geändert
      const newStatus = statusAktiv ? 'aktiv' : 'inaktiv'
      if (newStatus !== fahrer.status) {
        await updateFahrerStatus(fahrer.id.toString(), newStatus)
      }

      setSaveSuccess(true)
      setIsEditing(false)

      // Daten neu laden
      await onUpdate()

      // Erfolg nach 2 Sekunden ausblenden
      setTimeout(() => setSaveSuccess(false), 2000)
    } catch (err) {
      console.error('Fehler beim Speichern:', err)
      setError(err instanceof Error ? err.message : 'Fehler beim Speichern')
    } finally {
      setIsSaving(false)
    }
  }

  const handlePasswordReset = async () => {
    setIsResetting(true)
    setResetError("")
    setResetSuccess(false)

    try {
      const result = await requestPasswordReset(fahrer.id)

      if (!result.success) {
        throw new Error(result.error || 'Fehler beim Senden des Reset-Links')
      }

      setResetSuccess(true)
      setTimeout(() => {
        setShowPasswordResetModal(false)
        setResetSuccess(false)
      }, 3000)
    } catch (err) {
      console.error('Fehler beim Passwort-Reset:', err)
      setResetError(err instanceof Error ? err.message : 'Fehler beim Senden des Reset-Links')
    } finally {
      setIsResetting(false)
    }
  }

  const formatZeitmodell = (zmod: string | null): string => {
    switch (zmod) {
      case 'minijob': return 'Minijob'
      case 'werkstudent': return 'Werkstudent'
      case 'teilzeit': return 'Teilzeit'
      case 'vollzeit': return 'Vollzeit'
      default: return zmod || 'Nicht angegeben'
    }
  }

  if (!isAdmin) {
    // Disponent: Nur Lesezugriff
    return (
      <Card className="border-gray-100">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <User className="h-5 w-5 text-gray-400" />
            Benutzerdaten
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Name</p>
              <p className="text-sm font-medium">{fahrer.vorname} {fahrer.nachname}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Zeitmodell</p>
              <p className="text-sm font-medium">{formatZeitmodell(fahrer.zeitmodell)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Status</p>
              <Badge className={
                fahrer.status === 'aktiv'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 border'
                  : 'bg-gray-50 text-gray-700 border-gray-200 border'
              }>
                {fahrer.status === 'aktiv' ? 'Aktiv' : 'Inaktiv'}
              </Badge>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">User-ID</p>
              <p className="text-xs text-gray-400 font-mono">{fahrer.user_id || 'Nicht verknüpft'}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Admin: Bearbeitungsmodus
  return (
    <>
      <Card className="border-gray-100">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="h-5 w-5 text-gray-400" />
                Benutzerdaten
              </CardTitle>
              <CardDescription>Name, Zeitmodell und Zugangsdaten</CardDescription>
            </div>
            <div className="flex gap-2">
              {saveSuccess && (
                <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 border">
                  <Check className="h-3 w-3 mr-1" />
                  Gespeichert
                </Badge>
              )}
              {!isEditing && (
                <Button variant="outline" size="sm" onClick={handleStartEdit}>
                  <Edit className="h-4 w-4 mr-1" />
                  Bearbeiten
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <div className="space-y-4">
              {/* Name */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="vorname">Vorname</Label>
                  <Input
                    id="vorname"
                    value={vorname}
                    onChange={(e) => setVorname(e.target.value)}
                    placeholder="Vorname"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nachname">Nachname</Label>
                  <Input
                    id="nachname"
                    value={nachname}
                    onChange={(e) => setNachname(e.target.value)}
                    placeholder="Nachname"
                  />
                </div>
              </div>

              {/* Zeitmodell und Status */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="zeitmodell">Zeitmodell</Label>
                  <Select value={zeitmodell} onValueChange={setZeitmodell}>
                    <SelectTrigger>
                      <SelectValue placeholder="Zeitmodell wählen" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="minijob">Minijob</SelectItem>
                      <SelectItem value="werkstudent">Werkstudent</SelectItem>
                      <SelectItem value="teilzeit">Teilzeit</SelectItem>
                      <SelectItem value="vollzeit">Vollzeit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Status aktiv/inaktiv */}
                <div className="space-y-2">
                  <Label>Fahrer-Status</Label>
                  <div className="flex items-center gap-3 h-10">
                    <Switch
                      id="statusAktiv"
                      checked={statusAktiv}
                      onCheckedChange={setStatusAktiv}
                    />
                    <Label
                      htmlFor="statusAktiv"
                      className={`cursor-pointer font-medium ${
                        statusAktiv ? 'text-emerald-600' : 'text-gray-500'
                      }`}
                    >
                      {statusAktiv ? 'Aktiv' : 'Inaktiv'}
                    </Label>
                  </div>
                </div>
              </div>

              {/* Fehleranzeige */}
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              {/* Aktionen */}
              <div className="flex items-center justify-between pt-2">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCancelEdit}
                    disabled={isSaving}
                  >
                    Abbrechen
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSave}
                    disabled={isSaving}
                    className="bg-primary-blue hover:bg-blue-700"
                  >
                    {isSaving ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                        Speichern...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-1" />
                        Speichern
                      </>
                    )}
                  </Button>
                </div>

                {/* Passwort-Reset */}
                {fahrer.user_id && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowPasswordResetModal(true)}
                    className="text-amber-700 border-amber-200 hover:bg-amber-50"
                  >
                    <Key className="h-4 w-4 mr-1" />
                    Passwort-Reset
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Name</p>
                  <p className="text-sm font-medium">{fahrer.vorname} {fahrer.nachname}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Zeitmodell</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <Clock className="h-3.5 w-3.5 text-gray-400" />
                    <span className="text-sm font-medium">{formatZeitmodell(fahrer.zeitmodell)}</span>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Status</p>
                  <Badge className={
                    fahrer.status === 'aktiv'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 border'
                      : 'bg-gray-50 text-gray-700 border-gray-200 border'
                  }>
                    {fahrer.status === 'aktiv' ? 'Aktiv' : 'Inaktiv'}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Benutzerkonto</p>
                  {fahrer.user_id ? (
                    <div className="flex items-center gap-1.5">
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                      <span className="text-xs text-gray-500">Verknüpft</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                      <span className="text-xs text-amber-600">Nicht verknüpft</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Passwort-Reset Button (Lesemodus) */}
              {fahrer.user_id && (
                <div className="pt-2 border-t border-gray-100">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowPasswordResetModal(true)}
                    className="text-amber-700 border-amber-200 hover:bg-amber-50"
                  >
                    <Key className="h-4 w-4 mr-1" />
                    Passwort-Reset senden
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Passwort-Reset Modal */}
      <Dialog open={showPasswordResetModal} onOpenChange={setShowPasswordResetModal}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="h-5 w-5 text-amber-500" />
              Passwort-Reset senden
            </DialogTitle>
            <DialogDescription>
              Ein Reset-Link wird an die registrierte E-Mail-Adresse des Fahrers gesendet.
              Der Fahrer kann dann ein neues Passwort setzen.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
              <p className="font-medium text-gray-900">{fahrer.vorname} {fahrer.nachname}</p>
              <p className="text-sm text-amber-700 mt-1">
                <Mail className="h-3.5 w-3.5 inline mr-1" />
                Passwort-Reset-Link wird per E-Mail versendet
              </p>
            </div>

            {resetSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-700 flex items-center gap-2">
                <Check className="h-4 w-4 flex-shrink-0" />
                Reset-Link wurde erfolgreich gesendet!
              </div>
            )}

            {resetError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                {resetError}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowPasswordResetModal(false)}
              disabled={isResetting}
            >
              Abbrechen
            </Button>
            <Button
              onClick={handlePasswordReset}
              disabled={isResetting || resetSuccess}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {isResetting ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Senden...
                </>
              ) : resetSuccess ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Gesendet
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4 mr-2" />
                  Reset-Link senden
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
