"use client"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Car, MapPin, X, FileText, ExternalLink, Loader2 } from "lucide-react"
import type { Tour, TourStatus } from "@/lib/supabase"
import { formatFahrzeugart } from "@/lib/touren-api"
import { supabase } from "@/lib/supabase"

interface TourDetailModalProps {
  tour: Tour
  onClose: () => void
  formatDate: (date?: string) => string
  getStatusBadge: (status: TourStatus) => React.ReactNode
}

interface PdfExport {
  id: string
  tour_id: string
  file_url: string
  version: number
  created_at: string
}

export function TourDetailModal({ tour, onClose, formatDate, getStatusBadge }: TourDetailModalProps) {
  const [latestPdf, setLatestPdf] = useState<PdfExport | null>(null)
  const [isLoadingPdf, setIsLoadingPdf] = useState(false)

  useEffect(() => {
    loadLatestPdf()
  }, [tour.id])

  const loadLatestPdf = async () => {
    setIsLoadingPdf(true)
    try {
      // Versuche zuerst die neue tours Tabelle
      const { data: tourData } = await supabase
        .from('tours')
        .select('id')
        .eq('tour_no', tour.tour_nummer)
        .single()

      if (tourData) {
        // Lade das neueste PDF für diese Tour
        const { data: pdfData } = await supabase
          .from('pdf_exports')
          .select('*')
          .eq('tour_id', tourData.id)
          .order('version', { ascending: false })
          .limit(1)
          .single()

        if (pdfData) {
          setLatestPdf(pdfData as PdfExport)
        }
      }
    } catch (err) {
      // Keine PDF gefunden oder Tabelle existiert nicht
      console.log('Kein PDF gefunden:', err)
    } finally {
      setIsLoadingPdf(false)
    }
  }

  const openPdf = () => {
    if (latestPdf?.file_url) {
      window.open(latestPdf.file_url, '_blank')
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl text-primary-blue">Tour {tour.tour_nummer}</CardTitle>
              <CardDescription>{getStatusBadge(tour.status)}</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}><X className="h-4 w-4" /></Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* PDF Button */}
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText className="h-6 w-6 text-blue-600" />
                <div>
                  <h4 className="font-semibold text-blue-800">Protokoll-PDF</h4>
                  <p className="text-sm text-blue-600">
                    {isLoadingPdf ? 'Lädt...' : latestPdf ? `Version ${latestPdf.version} vom ${new Date(latestPdf.created_at).toLocaleDateString('de-DE')}` : 'Kein PDF vorhanden'}
                  </p>
                </div>
              </div>
              <Button
                onClick={openPdf}
                disabled={!latestPdf || isLoadingPdf}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isLoadingPdf ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <ExternalLink className="h-4 w-4 mr-2" />
                )}
                PDF öffnen
              </Button>
            </div>
          </div>

          {/* Fahrzeugdaten */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-semibold mb-3 flex items-center gap-2"><Car className="h-4 w-4" />Fahrzeugdaten</h4>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div><p className="text-gray-500">Fahrzeugart</p><p className="font-medium">{formatFahrzeugart(tour.fahrzeugart)}</p></div>
              <div><p className="text-gray-500">Kennzeichen</p><p className="font-medium">{tour.kennzeichen}</p></div>
              <div><p className="text-gray-500">FIN</p><p className="font-medium font-mono text-xs">{tour.fin}</p></div>
            </div>
          </div>

          {/* Orte */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-green-50 p-4 rounded-lg">
              <h4 className="font-semibold mb-3 text-green-800"><MapPin className="h-4 w-4 inline mr-1" />Abholort</h4>
              <p className="font-medium">{tour.abholort_name}</p>
              <p className="text-sm">{tour.abholort_strasse}, {tour.abholort_plz} {tour.abholort_ort}</p>
              <p className="text-sm mt-2"><strong>Kontakt:</strong> {tour.abholort_ansprechpartner_name}, {tour.abholort_ansprechpartner_telefon}</p>
            </div>
            <div className="bg-red-50 p-4 rounded-lg">
              <h4 className="font-semibold mb-3 text-red-800"><MapPin className="h-4 w-4 inline mr-1" />Abgabeort</h4>
              <p className="font-medium">{tour.abgabeort_name}</p>
              <p className="text-sm">{tour.abgabeort_strasse}, {tour.abgabeort_plz} {tour.abgabeort_ort}</p>
              <p className="text-sm mt-2"><strong>Kontakt:</strong> {tour.abgabeort_ansprechpartner_name}, {tour.abgabeort_ansprechpartner_telefon}</p>
            </div>
          </div>

          {/* Details */}
          <div className="bg-blue-50 p-4 rounded-lg grid grid-cols-3 gap-4 text-sm">
            <div><p className="text-gray-500">Distanz</p><p className="font-medium text-lg">{tour.distance_km ? `${tour.distance_km} km` : "-"}</p></div>
            <div><p className="text-gray-500">Abholung ab</p><p className="font-medium">{formatDate(tour.abholzeit_ab)}</p></div>
            <div><p className="text-gray-500">Abgabe bis</p><p className="font-medium">{formatDate(tour.abgabezeit_bis)}</p></div>
          </div>

          {/* Hinweise */}
          {tour.hinweise && (
            <div className="bg-yellow-50 p-4 rounded-lg">
              <h4 className="font-semibold mb-2">Hinweise</h4>
              <p className="text-sm">{tour.hinweise}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
