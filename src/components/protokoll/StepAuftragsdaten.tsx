"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Car, MapPin, Phone, User, FileText, Info } from "lucide-react"
import type { Tour } from "@/lib/supabase"
import { formatFahrzeugart } from "@/lib/touren-api"

interface StepAuftragsdatenProps {
  tour: Tour
}

export function StepAuftragsdaten({ tour }: StepAuftragsdatenProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <FileText className="h-5 w-5 text-primary-blue" />
          Auftragsdaten
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-gray-600 mb-4">
          Bitte überprüfen Sie die Auftragsdaten. Diese können nicht geändert werden.
        </p>

        {/* Fahrzeugdaten */}
        <div className="bg-gray-50 rounded-lg p-4 space-y-3">
          <h4 className="font-semibold text-gray-700 flex items-center gap-2">
            <Car className="h-4 w-4" />
            Fahrzeug
          </h4>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-gray-500">Tournummer:</span>
              <p className="font-medium">{tour.tour_nummer}</p>
            </div>
            <div>
              <span className="text-gray-500">Fahrzeugart:</span>
              <p className="font-medium">{formatFahrzeugart(tour.fahrzeugart)}</p>
            </div>
            <div>
              <span className="text-gray-500">Kennzeichen:</span>
              <p className="font-medium">{tour.kennzeichen}</p>
            </div>
            <div>
              <span className="text-gray-500">Distanz:</span>
              <p className="font-medium">{tour.distance_km ? `${tour.distance_km} km` : "-"}</p>
            </div>
            <div className="col-span-2">
              <span className="text-gray-500">FIN:</span>
              <p className="font-mono text-xs">{tour.fin}</p>
            </div>
          </div>
        </div>

        {/* Abholort */}
        <div className="bg-green-50 rounded-lg p-4 space-y-2">
          <h4 className="font-semibold text-green-800 flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Abholort
          </h4>
          <p className="font-medium">{tour.abholort_name}</p>
          <p className="text-sm text-gray-600">
            {tour.abholort_strasse}, {tour.abholort_plz} {tour.abholort_ort}
          </p>
          <div className="pt-2 border-t border-green-200 mt-2">
            <p className="text-sm flex items-center gap-2">
              <User className="h-3 w-3" />
              {tour.abholort_ansprechpartner_name}
            </p>
            <p className="text-sm flex items-center gap-2">
              <Phone className="h-3 w-3" />
              <a href={`tel:${tour.abholort_ansprechpartner_telefon}`} className="text-blue-600">
                {tour.abholort_ansprechpartner_telefon}
              </a>
            </p>
          </div>
        </div>

        {/* Abgabeort */}
        <div className="bg-red-50 rounded-lg p-4 space-y-2">
          <h4 className="font-semibold text-red-800 flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Abgabeort
          </h4>
          <p className="font-medium">{tour.abgabeort_name}</p>
          <p className="text-sm text-gray-600">
            {tour.abgabeort_strasse}, {tour.abgabeort_plz} {tour.abgabeort_ort}
          </p>
          <div className="pt-2 border-t border-red-200 mt-2">
            <p className="text-sm flex items-center gap-2">
              <User className="h-3 w-3" />
              {tour.abgabeort_ansprechpartner_name}
            </p>
            <p className="text-sm flex items-center gap-2">
              <Phone className="h-3 w-3" />
              <a href={`tel:${tour.abgabeort_ansprechpartner_telefon}`} className="text-blue-600">
                {tour.abgabeort_ansprechpartner_telefon}
              </a>
            </p>
          </div>
        </div>

        {/* Hinweise */}
        {tour.hinweise && (
          <div className="bg-yellow-50 rounded-lg p-4">
            <h4 className="font-semibold text-yellow-800 flex items-center gap-2 mb-2">
              <Info className="h-4 w-4" />
              Hinweise
            </h4>
            <p className="text-sm">{tour.hinweise}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
