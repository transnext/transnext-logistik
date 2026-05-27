"use client"

import { useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AlertTriangle, Plus, Trash2, CheckCircle } from "lucide-react"
import type { ProtocolFormData, DamageFormData, DamageType, DamageComponent } from "@/lib/protocol-types"
import { DAMAGE_TYPE_LABELS, DAMAGE_COMPONENT_LABELS } from "@/lib/protocol-types"

interface StepSchaedenProps {
  formData: ProtocolFormData
  updateFormData: <K extends keyof ProtocolFormData>(key: K, value: ProtocolFormData[K]) => void
}

export function StepSchaeden({ formData, updateFormData }: StepSchaedenProps) {
  const addDamage = () => {
    const newDamage: DamageFormData = {
      id: `temp_${Date.now()}`,
      is_interior: formData.has_interior_damage === true,
      damage_type: "",
      component: "",
      description: "",
      photos: [],
    }
    updateFormData("damages", [...formData.damages, newDamage])
  }

  const updateDamage = (id: string, updates: Partial<DamageFormData>) => {
    const newDamages = formData.damages.map(d =>
      d.id === id ? { ...d, ...updates } : d
    )
    updateFormData("damages", newDamages)
  }

  const removeDamage = (id: string) => {
    updateFormData("damages", formData.damages.filter(d => d.id !== id))
  }

  const needsDamageEntry =
    formData.has_interior_damage === true || formData.has_exterior_damage === true

  return (
    <div className="space-y-4">
      {/* Einstiegsfragen */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <AlertTriangle className="h-5 w-5 text-primary-blue" />
            Schäden prüfen
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="mb-2 block">Sind Schäden im Innenraum vorhanden? *</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={formData.has_interior_damage === true ? "default" : "outline"}
                className={formData.has_interior_damage === true ? "bg-red-600 hover:bg-red-700" : ""}
                onClick={() => updateFormData("has_interior_damage", true)}
              >
                Ja
              </Button>
              <Button
                type="button"
                variant={formData.has_interior_damage === false ? "default" : "outline"}
                className={formData.has_interior_damage === false ? "bg-green-600 hover:bg-green-700" : ""}
                onClick={() => updateFormData("has_interior_damage", false)}
              >
                Nein
              </Button>
            </div>
          </div>

          <div>
            <Label className="mb-2 block">Sind Schäden außerhalb vorhanden? *</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={formData.has_exterior_damage === true ? "default" : "outline"}
                className={formData.has_exterior_damage === true ? "bg-red-600 hover:bg-red-700" : ""}
                onClick={() => updateFormData("has_exterior_damage", true)}
              >
                Ja
              </Button>
              <Button
                type="button"
                variant={formData.has_exterior_damage === false ? "default" : "outline"}
                className={formData.has_exterior_damage === false ? "bg-green-600 hover:bg-green-700" : ""}
                onClick={() => updateFormData("has_exterior_damage", false)}
              >
                Nein
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Schadenliste */}
      {needsDamageEntry && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Schäden erfassen</CardTitle>
            <Button type="button" size="sm" onClick={addDamage}>
              <Plus className="h-4 w-4 mr-1" />
              Schaden
            </Button>
          </CardHeader>
          <CardContent>
            {formData.damages.length === 0 ? (
              <p className="text-sm text-orange-600 text-center py-4">
                Mindestens ein Schaden muss erfasst werden.
              </p>
            ) : (
              <div className="space-y-4">
                {formData.damages.map((damage, index) => (
                  <DamageEntry
                    key={damage.id}
                    damage={damage}
                    index={index}
                    onUpdate={(updates) => updateDamage(damage.id, updates)}
                    onRemove={() => removeDamage(damage.id)}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Info wenn keine Schäden */}
      {formData.has_interior_damage === false && formData.has_exterior_damage === false && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
          <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
          <p className="text-sm text-green-700">Keine Schäden vorhanden. Sie können fortfahren.</p>
        </div>
      )}
    </div>
  )
}

function DamageEntry({
  damage,
  index,
  onUpdate,
  onRemove,
}: {
  damage: DamageFormData
  index: number
  onUpdate: (updates: Partial<DamageFormData>) => void
  onRemove: () => void
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handlePhotoAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      onUpdate({ photos: [...damage.photos, reader.result as string] })
    }
    reader.readAsDataURL(file)
    e.target.value = ""
  }

  const removePhoto = (photoIndex: number) => {
    const newPhotos = damage.photos.filter((_, i) => i !== photoIndex)
    onUpdate({ photos: newPhotos })
  }

  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="font-medium">Schaden #{index + 1}</span>
        <Button type="button" variant="ghost" size="sm" onClick={onRemove}>
          <Trash2 className="h-4 w-4 text-red-500" />
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Art *</Label>
          <select
            value={damage.damage_type}
            onChange={(e) => onUpdate({ damage_type: e.target.value as DamageType })}
            className="w-full h-9 px-3 text-sm border rounded-md"
          >
            <option value="">Auswählen...</option>
            {Object.entries(DAMAGE_TYPE_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>
        <div>
          <Label className="text-xs">Bauteil *</Label>
          <select
            value={damage.component}
            onChange={(e) => onUpdate({ component: e.target.value as DamageComponent })}
            className="w-full h-9 px-3 text-sm border rounded-md"
          >
            <option value="">Auswählen...</option>
            {Object.entries(DAMAGE_COMPONENT_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <Label className="text-xs">Beschreibung *</Label>
        <Input
          value={damage.description}
          onChange={(e) => onUpdate({ description: e.target.value })}
          placeholder="Beschreiben Sie den Schaden..."
        />
      </div>

      <div>
        <Label className="text-xs">Fotos * (min. 1)</Label>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handlePhotoAdd}
        />
        <div className="flex gap-2 mt-1 flex-wrap">
          {damage.photos.map((photo, i) => (
            <div key={i} className="relative">
              <img src={photo} alt="" className="w-16 h-16 object-cover rounded" />
              <button
                type="button"
                onClick={() => removePhoto(i)}
                className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
              >
                ×
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-16 h-16 border-2 border-dashed border-gray-300 rounded flex items-center justify-center"
          >
            <Plus className="h-5 w-5 text-gray-400" />
          </button>
        </div>
      </div>
    </div>
  )
}
