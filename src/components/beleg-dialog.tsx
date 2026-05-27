"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { FileText, AlertCircle } from "lucide-react"

interface BelegDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tourNr: string
  datum: string
  typ: "arbeitsnachweis" | "auslagennachweis"
}

export function BelegDialog({ open, onOpenChange, tourNr, datum, typ }: BelegDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary-blue" />
            Beleg-Ansicht
          </DialogTitle>
          <DialogDescription>
            {typ === "arbeitsnachweis" ? "Arbeitsnachweis" : "Auslagennachweis"} für Tour {tourNr}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-900 mb-1">
                PDF-Ansicht in Entwicklung
              </p>
              <p className="text-sm text-blue-700">
                Die Beleg-Ansicht wird mit dem vollständigen Backend-System implementiert.
                Derzeit werden die Daten in der Datenbank gespeichert und können über das
                Admin-Portal verwaltet werden.
              </p>
            </div>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-600">Tour-Nr.:</span>
              <span className="font-medium">{tourNr}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-600">Datum:</span>
              <span className="font-medium">{new Date(datum).toLocaleDateString('de-DE')}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-gray-600">Status:</span>
              <span className="font-medium text-green-600">In Datenbank gespeichert</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
