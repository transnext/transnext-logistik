"use client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Gauge, Fuel, Key, Car } from "lucide-react"
import type { ProtocolFormData, FuelLevel, CableStatus, RimType, ProtocolPhase, TireType } from "@/lib/protocol-types"
import { FUEL_LEVEL_LABELS, TIRE_TYPE_LABELS, KEY_COUNT_OPTIONS } from "@/lib/protocol-types"

interface StepUebernahmeProps {
  formData: ProtocolFormData
  updateFormData: <K extends keyof ProtocolFormData>(key: K, value: ProtocolFormData[K]) => void
  isEAuto: boolean
  phase: ProtocolPhase
  pickupData?: {
    km_stand?: number
    started_at?: string
  }
}

export function StepUebernahme({ formData, updateFormData, isEAuto, phase, pickupData }: StepUebernahmeProps) {
  const kmLabel = phase === 'pickup' ? 'Kilometerstand Abholung' : 'Kilometerstand Abgabe'

  return (
    <div className="space-y-4">
      {/* Übernahme-Daten anzeigen bei Abgabe */}
      {phase === 'dropoff' && pickupData && (
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-blue-800">Übernahme-Daten</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-blue-600">Start-KM:</span>
              <span className="ml-2 font-medium">{pickupData.km_stand?.toLocaleString('de-DE') || '-'} km</span>
            </div>
            <div>
              <span className="text-blue-600">Start-Zeit:</span>
              <span className="ml-2 font-medium">
                {pickupData.started_at
                  ? new Date(pickupData.started_at).toLocaleString('de-DE', {
                      day: '2-digit', month: '2-digit', year: 'numeric',
                      hour: '2-digit', minute: '2-digit'
                    })
                  : '-'}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* KM-Stand */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Gauge className="h-5 w-5 text-primary-blue" />
            {kmLabel} *
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            type="number"
            value={formData.km_stand}
            onChange={(e) => updateFormData("km_stand", e.target.value)}
            placeholder="z.B. 45230"
            className="text-xl h-12 text-center font-mono"
            inputMode="numeric"
          />
        </CardContent>
      </Card>

      {/* Tank/Ladezustand */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Fuel className="h-5 w-5 text-primary-blue" />
            {isEAuto ? "Ladezustand" : "Tankfüllung"} *
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-2">
            {(["quarter", "half", "three_quarter", "full"] as FuelLevel[]).map((level) => (
              <Button
                key={level}
                type="button"
                variant={formData.fuel_level === level ? "default" : "outline"}
                className={`h-12 ${formData.fuel_level === level ? "bg-primary-blue" : ""}`}
                onClick={() => updateFormData("fuel_level", level)}
              >
                {FUEL_LEVEL_LABELS[level]}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Art der Bereifung - PFLICHTFELD */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Car className="h-5 w-5 text-primary-blue" />
            Art der Bereifung *
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-2">
            {(["winter", "summer", "allseason"] as TireType[]).map((type) => (
              <Button
                key={type}
                type="button"
                variant={formData.tire_type === type ? "default" : "outline"}
                className={`h-12 text-sm ${formData.tire_type === type ? "bg-primary-blue" : ""}`}
                onClick={() => updateFormData("tire_type", type)}
              >
                {TIRE_TYPE_LABELS[type]}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Ladekabel (nur E-Auto) */}
      {isEAuto && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Key className="h-5 w-5 text-primary-blue" />
              Ladekabel vorhanden *
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={formData.cable_status === "present" ? "default" : "outline"}
                className={formData.cable_status === "present" ? "bg-green-600 hover:bg-green-700" : ""}
                onClick={() => updateFormData("cable_status", "present" as CableStatus)}
              >
                Ja
              </Button>
              <Button
                type="button"
                variant={formData.cable_status === "not_present" ? "default" : "outline"}
                className={formData.cable_status === "not_present" ? "bg-red-600 hover:bg-red-700" : ""}
                onClick={() => updateFormData("cable_status", "not_present" as CableStatus)}
              >
                Nein
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Zubehör */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Key className="h-5 w-5 text-primary-blue" />
            Zubehör
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Anzahl Schlüssel - Buttons statt Stepper */}
          <div>
            <Label className="mb-2 block">Anzahl Schlüssel</Label>
            <div className="grid grid-cols-5 gap-2">
              {KEY_COUNT_OPTIONS.map((count) => (
                <Button
                  key={String(count)}
                  type="button"
                  variant={formData.key_count === count ? "default" : "outline"}
                  size="sm"
                  className={formData.key_count === count ? "bg-primary-blue" : ""}
                  onClick={() => updateFormData("key_count", count)}
                >
                  {count}
                </Button>
              ))}
            </div>
          </div>

          {/* Checkboxen */}
          <div className="space-y-3">
            <CheckboxItem
              checked={formData.registration_original}
              onCheckedChange={(v) => updateFormData("registration_original", v as boolean)}
              label="Kfz-Schein Original"
            />
            <CheckboxItem
              checked={formData.service_booklet}
              onCheckedChange={(v) => updateFormData("service_booklet", v as boolean)}
              label="Bordmappe/Serviceheft"
            />
            <CheckboxItem
              checked={formData.sd_card_navigation}
              onCheckedChange={(v) => updateFormData("sd_card_navigation", v as boolean)}
              label="SD-Karte Navigation"
            />
            <CheckboxItem
              checked={formData.floor_mats}
              onCheckedChange={(v) => updateFormData("floor_mats", v as boolean)}
              label="Fußmatten"
            />
            <CheckboxItem
              checked={formData.license_plates_present}
              onCheckedChange={(v) => updateFormData("license_plates_present", v as boolean)}
              label="Kennzeichen vorhanden"
            />
            <CheckboxItem
              checked={formData.radio_with_code}
              onCheckedChange={(v) => updateFormData("radio_with_code", v as boolean)}
              label="Radio + Code/Karte"
            />
            <CheckboxItem
              checked={formData.antenna_present}
              onCheckedChange={(v) => updateFormData("antenna_present", v as boolean)}
              label="Antenne vorhanden"
            />
            <CheckboxItem
              checked={formData.safety_kit}
              onCheckedChange={(v) => updateFormData("safety_kit", v as boolean)}
              label="Warndreieck/Verbandkasten/Warnweste"
            />
          </div>

          {/* Radkappen */}
          <div className="pt-3 border-t">
            <Label className="mb-2 block">Radkappen vorhanden</Label>
            <div className="grid grid-cols-3 gap-2">
              <Button
                type="button"
                variant={formData.hubcaps_present === true ? "default" : "outline"}
                size="sm"
                onClick={() => updateFormData("hubcaps_present", true)}
              >
                Ja
              </Button>
              <Button
                type="button"
                variant={formData.hubcaps_present === false ? "default" : "outline"}
                size="sm"
                onClick={() => updateFormData("hubcaps_present", false)}
              >
                Nein
              </Button>
              <Button
                type="button"
                variant={formData.hubcaps_present === null ? "default" : "outline"}
                size="sm"
                onClick={() => updateFormData("hubcaps_present", null)}
              >
                N/A
              </Button>
            </div>
          </div>

          {/* Felgenart */}
          <div className="pt-3 border-t">
            <Label className="mb-2 block">Felgenart</Label>
            <div className="grid grid-cols-3 gap-2">
              <Button
                type="button"
                variant={formData.rim_type === "steel" ? "default" : "outline"}
                size="sm"
                onClick={() => updateFormData("rim_type", "steel" as RimType)}
              >
                Stahl
              </Button>
              <Button
                type="button"
                variant={formData.rim_type === "aluminum" ? "default" : "outline"}
                size="sm"
                onClick={() => updateFormData("rim_type", "aluminum" as RimType)}
              >
                Alu
              </Button>
              <Button
                type="button"
                variant={formData.rim_type === "not_applicable" ? "default" : "outline"}
                size="sm"
                onClick={() => updateFormData("rim_type", "not_applicable" as RimType)}
              >
                N/A
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function CheckboxItem({
  checked,
  onCheckedChange,
  label,
}: {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  label: string
}) {
  return (
    <label className="flex items-center gap-3 cursor-pointer">
      <Checkbox checked={checked} onCheckedChange={onCheckedChange} />
      <span className="text-sm">{label}</span>
    </label>
  )
}
