import { supabase } from './supabase'
import type { Tour, TourStatus, Fahrzeugart } from './supabase'

// =====================================================
// TOUREN API - Vereinheitlicht auf 'tours' Tabelle
// =====================================================

export interface LocationData {
  name: string
  street: string
  zip: string
  city: string
  contact_name: string
  contact_phone: string
  place_id?: string
  lat?: number
  lng?: number
}

export interface CreateTourData {
  fahrzeugart: Fahrzeugart
  kennzeichen: string
  fin: string
  // Abholort
  abholort_name: string
  abholort_strasse: string
  abholort_plz: string
  abholort_ort: string
  abholort_ansprechpartner_name: string
  abholort_ansprechpartner_telefon: string
  abholort_place_id?: string
  abholort_lat?: number
  abholort_lng?: number
  // Abgabeort
  abgabeort_name: string
  abgabeort_strasse: string
  abgabeort_plz: string
  abgabeort_ort: string
  abgabeort_ansprechpartner_name: string
  abgabeort_ansprechpartner_telefon: string
  abgabeort_place_id?: string
  abgabeort_lat?: number
  abgabeort_lng?: number
  // Zeiten
  abholzeit_ab?: string
  abgabezeit_bis?: string
  hinweise?: string
  distance_km?: number
  fahrer_id?: string
}

// =====================================================
// HELPER: CreateTourData -> tours Tabelle Format
// =====================================================

function mapToToursFormat(data: CreateTourData) {
  return {
    vehicle_type: data.fahrzeugart,
    license_plate: data.kennzeichen.toUpperCase(),
    fin: data.fin.toUpperCase(),
    pickup_data: {
      name: data.abholort_name,
      street: data.abholort_strasse,
      zip: data.abholort_plz,
      city: data.abholort_ort,
      contact_name: data.abholort_ansprechpartner_name,
      contact_phone: data.abholort_ansprechpartner_telefon,
      place_id: data.abholort_place_id,
      lat: data.abholort_lat,
      lng: data.abholort_lng,
    },
    dropoff_data: {
      name: data.abgabeort_name,
      street: data.abgabeort_strasse,
      zip: data.abgabeort_plz,
      city: data.abgabeort_ort,
      contact_name: data.abgabeort_ansprechpartner_name,
      contact_phone: data.abgabeort_ansprechpartner_telefon,
      place_id: data.abgabeort_place_id,
      lat: data.abgabeort_lat,
      lng: data.abgabeort_lng,
    },
    pickup_from: data.abholzeit_ab,
    dropoff_until: data.abgabezeit_bis,
    notes: data.hinweise,
    distance_km: data.distance_km,
    assigned_driver_id: data.fahrer_id,
  }
}

// =====================================================
// HELPER: tours Tabelle -> Legacy Tour Format
// =====================================================

function mapToLegacyFormat(row: Record<string, unknown>): Tour {
  const pickup = row.pickup_data as LocationData || {}
  const dropoff = row.dropoff_data as LocationData || {}

  return {
    id: row.id as string,
    tour_nummer: row.tour_no as number,
    fahrzeugart: row.vehicle_type as Fahrzeugart,
    kennzeichen: row.license_plate as string,
    fin: row.fin as string,
    // Abholort
    abholort_name: pickup.name || '',
    abholort_strasse: pickup.street || '',
    abholort_plz: pickup.zip || '',
    abholort_ort: pickup.city || '',
    abholort_ansprechpartner_name: pickup.contact_name || '',
    abholort_ansprechpartner_telefon: pickup.contact_phone || '',
    // Abgabeort
    abgabeort_name: dropoff.name || '',
    abgabeort_strasse: dropoff.street || '',
    abgabeort_plz: dropoff.zip || '',
    abgabeort_ort: dropoff.city || '',
    abgabeort_ansprechpartner_name: dropoff.contact_name || '',
    abgabeort_ansprechpartner_telefon: dropoff.contact_phone || '',
    // Zeiten
    abholzeit_ab: row.pickup_from as string | undefined,
    abgabezeit_bis: row.dropoff_until as string | undefined,
    hinweise: row.notes as string | undefined,
    distance_km: row.distance_km as number | undefined,
    fahrer_id: row.assigned_driver_id as string | undefined,
    status: row.status as TourStatus,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    fahrer: row.driver as { vorname: string; nachname: string } | undefined,
  }
}

// =====================================================
// DISTANZBERECHNUNG
// =====================================================

export interface DistanceResult {
  distance_km: number | null
  duration_minutes: number | null
  error?: string
  error_code?: string
}

export async function calculateDistanceViaAPI(
  origin: { lat?: number; lng?: number; address?: string },
  destination: { lat?: number; lng?: number; address?: string }
): Promise<DistanceResult> {
  try {
    const response = await fetch("/api/distance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ origin, destination }),
    })

    // WICHTIG: Erst Response-Status prüfen, BEVOR json() aufgerufen wird!
    // Bei 404 oder anderen Fehlern könnte die Response HTML sein, nicht JSON.
    if (!response.ok) {
      // Versuche den Response-Body als Text zu lesen für Debugging
      let errorText = ""
      try {
        errorText = await response.text()
      } catch {
        errorText = "Response nicht lesbar"
      }

      console.error(`[calculateDistanceViaAPI] HTTP ${response.status}: ${errorText.substring(0, 200)}`)

      // Spezifische Fehlermeldungen je nach Status
      if (response.status === 404) {
        return {
          distance_km: null,
          duration_minutes: null,
          error: "Distanz-API nicht erreichbar (404). Bitte Admin kontaktieren.",
          error_code: "API_NOT_FOUND"
        }
      }

      return {
        distance_km: null,
        duration_minutes: null,
        error: `Server-Fehler (${response.status})`,
        error_code: `HTTP_${response.status}`
      }
    }

    // Response ist OK - jetzt JSON parsen
    let data
    try {
      data = await response.json()
    } catch (jsonError) {
      console.error("[calculateDistanceViaAPI] JSON Parse Error:", jsonError)
      return {
        distance_km: null,
        duration_minutes: null,
        error: "Ungültige Server-Antwort",
        error_code: "JSON_PARSE_ERROR"
      }
    }

    // Fehler in der API-Antwort prüfen
    if (data.error) {
      console.warn("[calculateDistanceViaAPI] API-Fehler:", data.error)
      return {
        distance_km: null,
        duration_minutes: null,
        error: data.error,
        error_code: data.error_code
      }
    }

    return {
      distance_km: data.distance_km,
      duration_minutes: data.duration_minutes,
    }
  } catch (error) {
    console.error("[calculateDistanceViaAPI] Netzwerkfehler:", error)
    return {
      distance_km: null,
      duration_minutes: null,
      error: "Netzwerkfehler bei Distanzberechnung",
      error_code: "NETWORK_ERROR"
    }
  }
}

// =====================================================
// TOUR CRUD (Admin)
// =====================================================

export async function createTour(data: CreateTourData): Promise<Tour> {
  const finRegex = /^[A-HJ-NPR-Z0-9]{17}$/
  if (!finRegex.test(data.fin.toUpperCase())) {
    throw new Error('Ungültige FIN. Muss 17 Zeichen sein.')
  }

  // Distanzberechnung
  let calculatedDistance = data.distance_km
  if (!calculatedDistance && data.abholort_lat && data.abgabeort_lat) {
    const result = await calculateDistanceViaAPI(
      { lat: data.abholort_lat, lng: data.abholort_lng },
      { lat: data.abgabeort_lat, lng: data.abgabeort_lng }
    )
    calculatedDistance = result.distance_km ?? undefined
  }

  const insertData = {
    ...mapToToursFormat(data),
    distance_km: calculatedDistance,
    status: data.fahrer_id ? 'uebernahme_offen' : 'neu',
  }

  const { data: result, error } = await supabase
    .from('tours')
    .insert([insertData])
    .select()
    .single()

  if (error) throw error
  return mapToLegacyFormat(result)
}

export async function getAllTouren(): Promise<Tour[]> {
  const { data, error } = await supabase
    .from('tours')
    .select(`
      *,
      driver:assigned_driver_id (
        vorname,
        nachname
      )
    `)
    .order('tour_no', { ascending: false })

  if (error) throw error
  return (data || []).map(mapToLegacyFormat)
}

export async function getTourById(id: string): Promise<Tour> {
  const { data, error } = await supabase
    .from('tours')
    .select(`
      *,
      driver:assigned_driver_id (
        vorname,
        nachname
      )
    `)
    .eq('id', id)
    .single()

  if (error) throw error
  return mapToLegacyFormat(data)
}

export async function updateTourAdmin(id: string, data: Partial<CreateTourData>): Promise<Tour> {
  if (data.fin) {
    const finRegex = /^[A-HJ-NPR-Z0-9]{17}$/
    if (!finRegex.test(data.fin.toUpperCase())) {
      throw new Error('Ungültige FIN. Muss 17 Zeichen sein.')
    }
  }

  // Partial mapping
  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString()
  }

  if (data.fahrzeugart) updateData.vehicle_type = data.fahrzeugart
  if (data.kennzeichen) updateData.license_plate = data.kennzeichen.toUpperCase()
  if (data.fin) updateData.fin = data.fin.toUpperCase()
  if (data.hinweise !== undefined) updateData.notes = data.hinweise
  if (data.distance_km !== undefined) updateData.distance_km = data.distance_km
  if (data.fahrer_id !== undefined) updateData.assigned_driver_id = data.fahrer_id
  if (data.abholzeit_ab !== undefined) updateData.pickup_from = data.abholzeit_ab
  if (data.abgabezeit_bis !== undefined) updateData.dropoff_until = data.abgabezeit_bis

  // Pickup/Dropoff data als JSONB
  if (data.abholort_name !== undefined) {
    updateData.pickup_data = {
      name: data.abholort_name,
      street: data.abholort_strasse || '',
      zip: data.abholort_plz || '',
      city: data.abholort_ort || '',
      contact_name: data.abholort_ansprechpartner_name || '',
      contact_phone: data.abholort_ansprechpartner_telefon || '',
      place_id: data.abholort_place_id,
      lat: data.abholort_lat,
      lng: data.abholort_lng,
    }
  }

  if (data.abgabeort_name !== undefined) {
    updateData.dropoff_data = {
      name: data.abgabeort_name,
      street: data.abgabeort_strasse || '',
      zip: data.abgabeort_plz || '',
      city: data.abgabeort_ort || '',
      contact_name: data.abgabeort_ansprechpartner_name || '',
      contact_phone: data.abgabeort_ansprechpartner_telefon || '',
      place_id: data.abgabeort_place_id,
      lat: data.abgabeort_lat,
      lng: data.abgabeort_lng,
    }
  }

  const { data: result, error } = await supabase
    .from('tours')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return mapToLegacyFormat(result)
}

export async function deleteTourById(id: string): Promise<void> {
  const { error } = await supabase
    .from('tours')
    .delete()
    .eq('id', id)

  if (error) throw error
}

export async function assignFahrerToTour(tourId: string, fahrerId: string | null): Promise<Tour> {
  const updateData: { assigned_driver_id: string | null; status?: TourStatus } = {
    assigned_driver_id: fahrerId
  }

  if (fahrerId) {
    const tour = await getTourById(tourId)
    if (tour.status === 'neu') {
      updateData.status = 'uebernahme_offen'
    }
  }

  const { data, error } = await supabase
    .from('tours')
    .update(updateData)
    .eq('id', tourId)
    .select()
    .single()

  if (error) throw error
  return mapToLegacyFormat(data)
}

// =====================================================
// TOUREN (Fahrer)
// =====================================================

export async function getFahrerTouren(userId: string): Promise<Tour[]> {
  const { data: fahrerData, error: fahrerError } = await supabase
    .from('fahrer')
    .select('id')
    .eq('user_id', userId)
    .single()

  if (fahrerError || !fahrerData) return []

  const { data, error } = await supabase
    .from('tours')
    .select('*')
    .eq('assigned_driver_id', fahrerData.id)
    .neq('status', 'abgeschlossen')
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data || []).map(mapToLegacyFormat)
}

export async function getFahrerTourenHistorie(userId: string): Promise<Tour[]> {
  const { data: fahrerData, error: fahrerError } = await supabase
    .from('fahrer')
    .select('id')
    .eq('user_id', userId)
    .single()

  if (fahrerError || !fahrerData) return []

  const { data, error } = await supabase
    .from('tours')
    .select('*')
    .eq('assigned_driver_id', fahrerData.id)
    .eq('status', 'abgeschlossen')
    .order('updated_at', { ascending: false })
    .limit(50)

  if (error) throw error
  return (data || []).map(mapToLegacyFormat)
}

// =====================================================
// HELPER FUNKTIONEN
// =====================================================

export function formatTourStatus(status: TourStatus): string {
  const statusMap: Record<TourStatus, string> = {
    'neu': 'Zugewiesen',
    'uebernahme_offen': 'Übernahme offen',
    'unterwegs': 'Unterwegs',
    'abgabe_offen': 'Abgabe offen',
    'abgeschlossen': 'Abgeschlossen'
  }
  return statusMap[status] || status
}

export function getTourStatusColor(status: TourStatus): {
  bg: string
  text: string
  border: string
} {
  const colorMap: Record<TourStatus, { bg: string; text: string; border: string }> = {
    'neu': { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-200' },
    'uebernahme_offen': { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-200' },
    'unterwegs': { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-200' },
    'abgabe_offen': { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-200' },
    'abgeschlossen': { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-200' }
  }
  return colorMap[status] || colorMap['neu']
}

export function formatFahrzeugart(art: Fahrzeugart): string {
  const artMap: Record<Fahrzeugart, string> = {
    'pkw': 'PKW',
    'e-auto': 'E-Auto',
    'transporter': 'Transporter'
  }
  return artMap[art] || art
}
