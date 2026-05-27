"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Shield, Info, CheckCircle } from "lucide-react"
import type { ProtocolDamage, ProtocolPhase } from "@/lib/protocol-types"
import { DAMAGE_TYPE_LABELS, DAMAGE_COMPONENT_LABELS } from "@/lib/protocol-types"

interface StepVorschaedenProps {
  preExistingDamages: ProtocolDamage[]
  phase: ProtocolPhase
}

export function StepVorschaeden({ preExistingDamages, phase }: StepVorschaedenProps) {
  if (phase === "pickup") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Shield className="h-5 w-5 text-primary-blue" />
            Vorschäden
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <Info className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>Bei der Übernahme gibt es keine Vorschäden zu dokumentieren.</p>
            <p className="text-sm mt-2">Vorschäden werden erst bei der Abgabe angezeigt.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Shield className="h-5 w-5 text-primary-blue" />
          Vorschäden aus Übernahme
        </CardTitle>
      </CardHeader>
      <CardContent>
        {preExistingDamages.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-300" />
            <p>Keine Vorschäden aus der Übernahme dokumentiert.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-gray-600 mb-4">
              Diese Schäden wurden bei der Übernahme dokumentiert (Read-Only).
            </p>
            {preExistingDamages.map((damage, index) => (
              <div
                key={damage.id}
                className="p-3 bg-gray-50 rounded-lg border"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="bg-gray-200 text-gray-700 text-xs px-2 py-0.5 rounded">
                    #{index + 1}
                  </span>
                  <span className="font-medium text-sm">
                    {DAMAGE_TYPE_LABELS[damage.damage_type]}
                  </span>
                  <span className="text-gray-400">•</span>
                  <span className="text-sm text-gray-600">
                    {DAMAGE_COMPONENT_LABELS[damage.component]}
                  </span>
                </div>
                <p className="text-sm text-gray-600">{damage.description}</p>
                {damage.photos && damage.photos.length > 0 && (
                  <div className="flex gap-2 mt-2">
                    {damage.photos.map((photo) => (
                      <img
                        key={photo.id}
                        src={photo.file_url}
                        alt="Schadensfoto"
                        className="w-16 h-16 object-cover rounded"
                      />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
