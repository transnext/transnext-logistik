import { supabase } from './supabase'
import type { Tour, TourStatus, Fahrzeugart } from './supabase'

// =====================================================
// TOUREN API - Admin-Funktionen
// =====================================================

export interface CreateTourData {
  fahrzeugart: Fahrzeugart
  kennzeichen: string
  fin: string
  abholort_name: string
  abholort_strasse: string
  abholort_plz: string
  abholort_ort: string
  abholort_ansprechpartner_name: string
  abholort_ansprechpartner_telefon: string
  abgabeort_name: string
  abgabeort_strasse: string
  abgabeort_plz: string
  abgabeort_ort: string
  abgabeort_ansprechpartner_name: string
  abgabeort_ansprechpartner_telefon: string
  abholzeit_ab?: string
  abgabezeit_bis?: string
  hinweise?: string
  distance_km?: number
  fahrer_id?: string
}

/**
 * Berechnet die Distanz zwischen zwei Orten via Google Maps API (Server-Variante)
 * Hinweis: Erfordert GOOGLE_MAPS_API_KEY Umgebungsvariable
 */
export async function calculateDistanceServer(
  origin: { plz: string; ort: string; strasse?: string },
  destination: { plz: string; ort: string; strasse?: string }
): Promise<number | null> {
  const originStr = `${origin.strasse || ''} ${origin.plz} ${origin.ort}, Germany`.trim()
  const destStr = `${destination.strasse || ''} ${destination.plz} ${destination.ort}, Germany`.trim()

  try {
    // Google Distance Matrix API aufrufen
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
    if (!apiKey) {
      console.warn('Google Maps API Key nicht konfiguriert')
      return null
    }

    const response = await fetch(
      `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(originStr)}&destinations=${encodeURIComponent(destStr)}&key=${apiKey}`
    )

    const data = await response.json()

    if (data.rows?.[0]?.elements?.[0]?.distance?.value) {
      // Meter in Kilometer umrechnen
      return Math.round(data.rows[0].elements[0].distance.value / 1000)
    }

    return null
  } catch (error) {
    console.error('Fehler bei Distanzberechnung:', error)
    return null
  }
}

/**
 * Erstellt eine neue Tour (nur Admin/Disponent)
 * tour_nummer wird automatisch generiert
 */
export async function createTour(data: CreateTourData): Promise<Tour> {
  // FIN Validierung
  const finRegex = /^[A-HJ-NPR-Z0-9]{17}$/
  if (!finRegex.test(data.fin.toUpperCase())) {
    throw new Error('Ungültige Fahrzeugidentifikationsnummer (FIN). Muss 17 Zeichen sein.')
  }

  // Automatische Distanzberechnung wenn nicht manuell angegeben
  let calculatedDistance = data.distance_km
  if (!calculatedDistance) {
    try {
      const distance = await calculateDistanceServer(
        { strasse: data.abholort_strasse, plz: data.abholort_plz, ort: data.abholort_ort },
        { strasse: data.abgabeort_strasse, plz: data.abgabeort_plz, ort: data.abgabeort_ort }
      )
      calculatedDistance = distance ?? undefined
    } catch (err) {
      console.warn('Distanzberechnung fehlgeschlagen:', err)
      // Fortfahren ohne Distanz
    }
  }

  const { data: result, error } = await supabase
    .from('touren')
    .insert([{
      ...data,
      fin: data.fin.toUpperCase(),
      distance_km: calculatedDistance,
      status: 'neu'
    }])
    .select()
    .single()

  if (error) throw error
  return result as Tour
}

/**
 * Lädt alle Touren mit Fahrer-Informationen (Admin/Disponent)
 */
export async function getAllTouren(): Promise<Tour[]> {
  const { data, error } = await supabase
    .from('touren')
    .select(`
      *,
      fahrer:fahrer_id (
        vorname,
        nachname
      )
    `)
    .order('tour_nummer', { ascending: false })

  if (error) throw error
  return data as Tour[]
}

/**
 * Lädt eine einzelne Tour
 */
export async function getTourById(id: string): Promise<Tour> {
  const { data, error } = await supabase
    .from('touren')
    .select(`
      *,
      fahrer:fahrer_id (
        vorname,
        nachname
      )
    `)
    .eq('id', id)
    .single()

  if (error) throw error
  return data as Tour
}

/**
 * Aktualisiert eine Tour (Admin/Disponent)
 */
export async function updateTourAdmin(id: string, data: Partial<CreateTourData>): Promise<Tour> {
  // FIN Validierung wenn geändert
  if (data.fin) {
    const finRegex = /^[A-HJ-NPR-Z0-9]{17}$/
    if (!finRegex.test(data.fin.toUpperCase())) {
      throw new Error('Ungültige Fahrzeugidentifikationsnummer (FIN). Muss 17 Zeichen sein.')
    }
    data.fin = data.fin.toUpperCase()
  }

  const { data: result, error } = await supabase
    .from('touren')
    .update({
      ...data,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return result as Tour
}

/**
 * Löscht eine Tour (nur Admin/Disponent)
 */
export async function deleteTourById(id: string): Promise<void> {
  const { error } = await supabase
    .from('touren')
    .delete()
    .eq('id', id)

  if (error) throw error
}

/**
 * Weist einen Fahrer einer Tour zu
 */
export async function assignFahrerToTour(tourId: string, fahrerId: string | null): Promise<Tour> {
  const updateData: { fahrer_id: string | null; status?: TourStatus } = {
    fahrer_id: fahrerId
  }

  // Wenn Fahrer zugewiesen wird und Status "neu" ist, auf "uebernahme_offen" setzen
  if (fahrerId) {
    const tour = await getTourById(tourId)
    if (tour.status === 'neu') {
      updateData.status = 'uebernahme_offen'
    }
  }

  const { data, error } = await supabase
    .from('touren')
    .update(updateData)
    .eq('id', tourId)
    .select()
    .single()

  if (error) throw error
  return data as Tour
}

// =====================================================
// TOUREN API - Fahrer-Funktionen
// =====================================================

/**
 * Lädt alle Touren für den aktuellen Fahrer
 */
export async function getFahrerTouren(userId: string): Promise<Tour[]> {
  // Erst fahrer_id für user_id holen
  const { data: fahrerData, error: fahrerError } = await supabase
    .from('fahrer')
    .select('id')
    .eq('user_id', userId)
    .single()

  if (fahrerError || !fahrerData) {
    return []
  }

  const { data, error } = await supabase
    .from('touren')
    .select('*')
    .eq('fahrer_id', fahrerData.id)
    .neq('status', 'abgeschlossen') // Abgeschlossene ausblenden
    .order('created_at', { ascending: false })

  if (error) throw error
  return data as Tour[]
}

/**
 * Lädt alle abgeschlossenen Touren für den Fahrer (Historie)
 */
export async function getFahrerTourenHistorie(userId: string): Promise<Tour[]> {
  const { data: fahrerData, error: fahrerError } = await supabase
    .from('fahrer')
    .select('id')
    .eq('user_id', userId)
    .single()

  if (fahrerError || !fahrerData) {
    return []
  }

  const { data, error } = await supabase
    .from('touren')
    .select('*')
    .eq('fahrer_id', fahrerData.id)
    .eq('status', 'abgeschlossen')
    .order('abgabe_zeitpunkt', { ascending: false })
    .limit(50)

  if (error) throw error
  return data as Tour[]
}

/**
 * Startet die Übernahme einer Tour (Fahrer)
 */
export async function startUebernahme(
  tourId: string,
  data: {
    km_stand: number
    fotos?: string[]
    unterschrift_url?: string
  }
): Promise<Tour> {
  const { data: result, error } = await supabase
    .from('touren')
    .update({
      status: 'abgabe_offen',
      uebernahme_zeitpunkt: new Date().toISOString(),
      uebernahme_km_stand: data.km_stand,
      uebernahme_fotos: data.fotos || [],
      uebernahme_unterschrift_url: data.unterschrift_url,
      updated_at: new Date().toISOString()
    })
    .eq('id', tourId)
    .select()
    .single()

  if (error) throw error
  return result as Tour
}

/**
 * Startet die Abgabe einer Tour (Fahrer)
 */
export async function startAbgabe(
  tourId: string,
  data: {
    km_stand: number
    fotos?: string[]
    unterschrift_url?: string
  }
): Promise<Tour> {
  const { data: result, error } = await supabase
    .from('touren')
    .update({
      status: 'abgeschlossen',
      abgabe_zeitpunkt: new Date().toISOString(),
      abgabe_km_stand: data.km_stand,
      abgabe_fotos: data.fotos || [],
      abgabe_unterschrift_url: data.unterschrift_url,
      updated_at: new Date().toISOString()
    })
    .eq('id', tourId)
    .select()
    .single()

  if (error) throw error
  return result as Tour
}

// =====================================================
// HELPER FUNKTIONEN
// =====================================================

/**
 * Formatiert den Tour-Status für die Anzeige
 */
export function formatTourStatus(status: TourStatus): string {
  const statusMap: Record<TourStatus, string> = {
    'neu': 'Neu',
    'uebernahme_offen': 'Übernahme offen',
    'unterwegs': 'Unterwegs', // Legacy
    'abgabe_offen': 'Abgabe offen',
    'abgeschlossen': 'Abgeschlossen'
  }
  return statusMap[status] || status
}

/**
 * Gibt die Badge-Farbe für einen Status zurück
 */
export function getTourStatusColor(status: TourStatus): {
  bg: string
  text: string
  border: string
} {
  const colorMap: Record<TourStatus, { bg: string; text: string; border: string }> = {
    'neu': { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-200' },
    'uebernahme_offen': { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-200' },
    'unterwegs': { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-200' }, // Legacy
    'abgabe_offen': { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-200' },
    'abgeschlossen': { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-200' }
  }
  return colorMap[status] || colorMap['neu']
}

/**
 * Formatiert die Fahrzeugart für die Anzeige
 */
export function formatFahrzeugart(art: Fahrzeugart): string {
  const artMap: Record<Fahrzeugart, string> = {
    'pkw': 'PKW',
    'e-auto': 'E-Auto',
    'transporter': 'Transporter'
  }
  return artMap[art] || art
}

/**
 * Berechnet die Distanz zwischen zwei Orten via Google Maps API
 * Hinweis: Erfordert GOOGLE_MAPS_API_KEY Umgebungsvariable
 */
export async function calculateDistance(
  origin: { plz: string; ort: string; strasse?: string },
  destination: { plz: string; ort: string; strasse?: string }
): Promise<number | null> {
  const originStr = `${origin.strasse || ''} ${origin.plz} ${origin.ort}, Germany`.trim()
  const destStr = `${destination.strasse || ''} ${destination.plz} ${destination.ort}, Germany`.trim()

  try {
    // Google Distance Matrix API aufrufen
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
    if (!apiKey) {
      console.warn('Google Maps API Key nicht konfiguriert')
      return null
    }

    const response = await fetch(
      `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(originStr)}&destinations=${encodeURIComponent(destStr)}&key=${apiKey}`
    )

    const data = await response.json()

    if (data.rows?.[0]?.elements?.[0]?.distance?.value) {
      // Meter in Kilometer umrechnen
      return Math.round(data.rows[0].elements[0].distance.value / 1000)
    }

    return null
  } catch (error) {
    console.error('Fehler bei Distanzberechnung:', error)
    return null
  }
}
