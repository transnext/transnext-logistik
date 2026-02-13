"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SignaturePad, SignaturePadRef } from "@/components/ui/signature-pad"
import { PenTool, User } from "lucide-react"
import type { ProtocolFormData, HandoverType } from "@/lib/protocol-types"
import { HANDOVER_TYPE_LABELS } from "@/lib/protocol-types"

interface StepUnterschriftenProps {
  formData: ProtocolFormData
  updateFormData: <K extends keyof ProtocolFormData>(key: K, value: ProtocolFormData[K]) => void
  driverSignatureRef: React.RefObject<SignaturePadRef>
  recipientSignatureRef: React.RefObject<SignaturePadRef>
}

export function StepUnterschriften({
  formData,
  updateFormData,
  driverSignatureRef,
  recipientSignatureRef,
}: StepUnterschriftenProps) {
  return (
    <div className="space-y-4">
      {/* Fahrer-Unterschrift */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <PenTool className="h-5 w-5 text-primary-blue" />
            Fahrer-Unterschrift *
          </CardTitle>
        </CardHeader>
        <CardContent>
          <SignaturePad
            ref={driverSignatureRef}
            onSignatureChange={(has) => updateFormData("driver_signature", has ? "pending" : "")}
            height={150}
          />
        </CardContent>
      </Card>

      {/* Übergabe vor Ort */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="h-5 w-5 text-primary-blue" />
            Übergabe vor Ort *
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            {(["recipient_present", "recipient_absent", "recipient_refused"] as HandoverType[]).map(
              (type) => (
                <Button
                  key={type}
                  type="button"
                  variant={formData.handover_type === type ? "default" : "outline"}
                  className={`w-full justify-start ${
                    formData.handover_type === type ? "bg-primary-blue" : ""
                  }`}
                  onClick={() => updateFormData("handover_type", type)}
                >
                  {HANDOVER_TYPE_LABELS[type]}
                </Button>
              )
            )}
          </div>

          {/* Empfänger vor Ort */}
          {formData.handover_type === "recipient_present" && (
            <div className="space-y-4 pt-4 border-t">
              <div>
                <Label>Empfängername *</Label>
                <Input
                  value={formData.recipient_name}
                  onChange={(e) => updateFormData("recipient_name", e.target.value)}
                  placeholder="Name des Empfängers"
                />
              </div>
              <div>
                <Label>Empfänger-Unterschrift *</Label>
                <SignaturePad
                  ref={recipientSignatureRef}
                  onSignatureChange={(has) =>
                    updateFormData("recipient_signature", has ? "pending" : "")
                  }
                  height={150}
                />
              </div>
            </div>
          )}

          {/* Nicht vor Ort oder Verweigert */}
          {(formData.handover_type === "recipient_absent" ||
            formData.handover_type === "recipient_refused") && (
            <div className="pt-4 border-t">
              <Label>Notiz *</Label>
              <textarea
                value={formData.handover_note}
                onChange={(e) => updateFormData("handover_note", e.target.value)}
                placeholder="Bitte geben Sie eine Erklärung an..."
                className="w-full h-24 px-3 py-2 border rounded-md text-sm"
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
