"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { CheckCircle, AlertCircle } from "lucide-react"
import type { Tour } from "@/lib/supabase"
import type { ProtocolFormData, ProtocolPhase } from "@/lib/protocol-types"
import { PHOTO_CATEGORIES, FUEL_LEVEL_LABELS, HANDOVER_TYPE_LABELS } from "@/lib/protocol-types"

interface StepBestaetigungProps {
  formData: ProtocolFormData
  updateFormData: <K extends keyof ProtocolFormData>(key: K, value: ProtocolFormData[K]) => void
  tour: Tour
  phase: ProtocolPhase
  isEAuto: boolean
  error: string | null
}

export function StepBestaetigung({
  formData,
  updateFormData,
  tour,
  isEAuto,
  error,
}: StepBestaetigungProps) {
  const completedPhotos = PHOTO_CATEGORIES.filter(c => formData.photos[c.id]).length

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <CheckCircle className="h-5 w-5 text-green-600" />
          Zusammenfassung
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-gray-600">
          Bitte überprüfen Sie Ihre Angaben vor dem Absenden.
        </p>

        {/* Zusammenfassung */}
        <div className="space-y-3">
          <SummaryRow label="Tour" value={`#${tour.tour_nummer}`} />
          <SummaryRow label="KM-Stand" value={`${parseInt(formData.km_stand || "0").toLocaleString("de-DE")} km`} />
          <SummaryRow
            label={isEAuto ? "Ladezustand" : "Tankfüllung"}
            value={formData.fuel_level ? FUEL_LEVEL_LABELS[formData.fuel_level] : "-"}
          />
          {isEAuto && (
            <SummaryRow
              label="Ladekabel"
              value={formData.cable_status === "present" ? "Vorhanden" : "Nicht vorhanden"}
            />
          )}
          <SummaryRow label="Schlüssel" value={`${formData.key_count} Stück`} />
          <SummaryRow label="Fotos" value={`${completedPhotos}/${PHOTO_CATEGORIES.length}`} />
          <SummaryRow
            label="Schäden"
            value={
              formData.has_interior_damage || formData.has_exterior_damage
                ? `${formData.damages.length} erfasst`
                : "Keine"
            }
          />
          <SummaryRow
            label="Übergabe"
            value={formData.handover_type ? HANDOVER_TYPE_LABELS[formData.handover_type] : "-"}
          />
        </div>

        {/* Bestätigung */}
        <div className="pt-4 border-t">
          <label className="flex items-start gap-3 cursor-pointer">
            <Checkbox
              checked={formData.confirmed}
              onCheckedChange={(v) => updateFormData("confirmed", v as boolean)}
              className="mt-0.5"
            />
            <span className="text-sm">
              Ich bestätige, dass alle Angaben korrekt sind und das Protokoll vollständig ist. *
            </span>
          </label>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-gray-100">
      <span className="text-sm text-gray-600">{label}</span>
      <span className="font-medium text-sm">{value}</span>
    </div>
  )
}
