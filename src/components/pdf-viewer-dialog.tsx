"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { FileText, Download, AlertCircle, Loader2 } from "lucide-react"
import { getSignedBelegUrl, downloadBeleg } from "@/lib/storage"

interface PDFViewerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tourNr: string
  datum: string
  typ: "arbeitsnachweis" | "auslagennachweis"
  belegUrl?: string
}

export function PDFViewerDialog({
  open,
  onOpenChange,
  tourNr,
  datum,
  typ,
  belegUrl
}: PDFViewerDialogProps) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open && belegUrl) {
      loadSignedUrl()
    }
  }, [open, belegUrl])

  const loadSignedUrl = async () => {
    if (!belegUrl) return

    setLoading(true)
    setError(null)

    try {
      // Extrahiere Pfad aus URL (nach /storage/v1/object/public/belege/)
      const pathMatch = belegUrl.match(/\/belege\/(.+)$/)
      const filePath = pathMatch ? pathMatch[1] : belegUrl

      const url = await getSignedBelegUrl(filePath)
      setSignedUrl(url)
    } catch (err) {
      console.error('Fehler beim Laden der PDF:', err)
      setError('PDF konnte nicht geladen werden')
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = async () => {
    if (!belegUrl) return

    try {
      const pathMatch = belegUrl.match(/\/belege\/(.+)$/)
      const filePath = pathMatch ? pathMatch[1] : belegUrl
      const fileName = `${typ}_${tourNr}_${datum}.pdf`

      await downloadBeleg(filePath, fileName)
    } catch (err) {
      console.error('Fehler beim Download:', err)
      alert('PDF konnte nicht heruntergeladen werden')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[90vw] sm:max-h-[90vh] h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary-blue" />
            Beleg-Ansicht
          </DialogTitle>
          <DialogDescription>
            {typ === "arbeitsnachweis" ? "Arbeitsnachweis" : "Auslagennachweis"} für Tour {tourNr}
          </DialogDescription>
        </DialogHeader>

        {!belegUrl ? (
          <div className="flex items-start gap-3 p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
            <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-yellow-900 mb-1">
                Kein Beleg hochgeladen
              </p>
              <p className="text-sm text-yellow-700">
                Für diesen Nachweis wurde noch kein Beleg hochgeladen.
              </p>
            </div>
          </div>
        ) : loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 text-primary-blue animate-spin mb-4" />
            <p className="text-sm text-gray-600">Lade PDF...</p>
          </div>
        ) : error ? (
          <div className="flex items-start gap-3 p-6 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-900 mb-1">
                Fehler beim Laden
              </p>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col gap-4">
            {/* PDF Viewer */}
            <div className="flex-1 border rounded-lg overflow-hidden bg-gray-50">
              {signedUrl && (
                <iframe
                  src={signedUrl}
                  className="w-full h-full"
                  title="PDF Viewer"
                />
              )}
            </div>

            {/* Download Button */}
            <div className="flex gap-2">
              <Button
                onClick={handleDownload}
                className="bg-primary-blue hover:bg-blue-700"
              >
                <Download className="mr-2 h-4 w-4" />
                PDF herunterladen
              </Button>
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Schließen
              </Button>
            </div>

            {/* Info */}
            <div className="text-xs text-gray-500 p-3 bg-blue-50 rounded-lg">
              <p className="font-medium text-gray-700 mb-1">Hinweis:</p>
              <p>Die PDF wird sicher in Supabase Storage gespeichert und ist nur für autorisierte Benutzer zugänglich.</p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
