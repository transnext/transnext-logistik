// =====================================================
// TOURS API - Vereinheitlichte Tour-Verwaltung
// =====================================================
// Verwendet ausschließlich die 'tours' Tabelle mit JSONB Struktur

import { supabase } from './supabase'

// =====================================================
// TYPES
// =====================================================

export type TourStatus = 'neu' | 'uebernahme_offen' | 'abgabe_offen' | 'abgeschlossen'
export type VehicleType = 'pkw' | 'e-auto' | 'transporter'

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

export interface Tour {
  id: string
  tour_no: number
  vehicle_type: VehicleType
  license_plate: string
  fin: string
  pickup_data: LocationData
  dropoff_data: LocationData
  pickup_from?: string
  dropoff_until?: string
  distance_km?: number
  notes?: string
  assigned_driver_id?: string
  status: TourStatus
  created_at: string
  updated_at: string
  created_by?: string
  // Joined
  driver?: {
    vorname: string
    nachname: string
  }
}

export interface CreateTourData {
  vehicle_type: VehicleType
  license_plate: string
  fin: string
  pickup_data: LocationData
  dropoff_data: LocationData
  pickup_from?: string
  dropoff_until?: string
  distance_km?: number
  notes?: string
  assigned_driver_id?: string
}

// =====================================================
// LABELS
// =====================================================

export const TOUR_STATUS_LABELS: Record<TourStatus, string> = {
  neu: 'Zugewiesen',
  uebernahme_offen: 'Übernahme offen',
  abgabe_offen: 'Abgabe offen',
  abgeschlossen: 'Abgeschlossen',
}

export const TOUR_STATUS_COLORS: Record<TourStatus, { bg: string; text: string; border: string }> = {
  neu: { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-200' },
  uebernahme_offen: { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-200' },
  abgabe_offen: { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-200' },
  abgeschlossen: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-200' },
}

export const VEHICLE_TYPE_LABELS: Record<VehicleType, string> = {
  pkw: 'PKW',
  'e-auto': 'E-Auto',
  transporter: 'Transporter',
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

export function formatTourStatus(status: TourStatus): string {
  return TOUR_STATUS_LABELS[status] || status
}

export function getTourStatusColor(status: TourStatus) {
  return TOUR_STATUS_COLORS[status] || TOUR_STATUS_COLORS.neu
}

export function formatVehicleType(type: VehicleType): string {
  return VEHICLE_TYPE_LABELS[type] || type
}

export function formatLocation(loc: LocationData): string {
  const parts = [loc.name]
  if (loc.street) parts.push(loc.street)
  if (loc.zip && loc.city) {
    parts.push(`${loc.zip} ${loc.city}`)
  } else if (loc.city) {
    parts.push(loc.city)
  }
  return parts.join(', ')
}

// =====================================================
// DISTANZ BERECHNUNG
// =====================================================

export async function calculateDistanceViaAPI(
  origin: { lat?: number; lng?: number; address?: string },
  destination: { lat?: number; lng?: number; address?: string }
): Promise<{ distance_km: number | null; duration_minutes: number | null }> {
  try {
    const response = await fetch("/api/distance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ origin, destination }),
    })
    const data = await response.json()
    if (!response.ok) {
      console.warn("Distanzberechnung fehlgeschlagen:", data.error)
      return { distance_km: null, duration_minutes: null }
    }
    return {
      distance_km: data.distance_km,
      duration_minutes: data.duration_minutes,
    }
  } catch (error) {
    console.error("Fehler bei Distanzberechnung:", error)
    return { distance_km: null, duration_minutes: null }
  }
}

// =====================================================
// TOURS CRUD (Admin)
// =====================================================

/**
 * Erstellt eine neue Tour
 */
export async function createTour(data: CreateTourData): Promise<Tour> {
  // FIN Validierung
  const finRegex = /^[A-HJ-NPR-Z0-9]{17}$/
  if (!finRegex.test(data.fin.toUpperCase())) {
    throw new Error('Ungültige FIN. Muss 17 Zeichen sein.')
  }

  // Automatische Distanzberechnung wenn nicht manuell angegeben
  let calculatedDistance = data.distance_km
  if (!calculatedDistance && data.pickup_data.lat && data.dropoff_data.lat) {
    try {
      const result = await calculateDistanceViaAPI(
        { lat: data.pickup_data.lat, lng: data.pickup_data.lng },
        { lat: data.dropoff_data.lat, lng: data.dropoff_data.lng }
      )
      calculatedDistance = result.distance_km ?? undefined
    } catch (err) {
      console.warn('Distanzberechnung fehlgeschlagen:', err)
    }
  }

  const { data: result, error } = await supabase
    .from('tours')
    .insert([{
      vehicle_type: data.vehicle_type,
      license_plate: data.license_plate.toUpperCase(),
      fin: data.fin.toUpperCase(),
      pickup_data: data.pickup_data,
      dropoff_data: data.dropoff_data,
      pickup_from: data.pickup_from,
      dropoff_until: data.dropoff_until,
      notes: data.notes,
      distance_km: calculatedDistance,
      assigned_driver_id: data.assigned_driver_id,
      status: data.assigned_driver_id ? 'uebernahme_offen' : 'neu',
    }])
    .select()
    .single()

  if (error) throw error
  return result as Tour
}

/**
 * Lädt alle Touren mit Fahrer-Informationen
 */
export async function getAllTours(): Promise<Tour[]> {
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
  return data as Tour[]
}

/**
 * Lädt eine einzelne Tour
 */
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
  return data as Tour
}

/**
 * Aktualisiert eine Tour
 */
export async function updateTour(id: string, data: Partial<CreateTourData>): Promise<Tour> {
  if (data.fin) {
    const finRegex = /^[A-HJ-NPR-Z0-9]{17}$/
    if (!finRegex.test(data.fin.toUpperCase())) {
      throw new Error('Ungültige FIN. Muss 17 Zeichen sein.')
    }
    data.fin = data.fin.toUpperCase()
  }

  if (data.license_plate) {
    data.license_plate = data.license_plate.toUpperCase()
  }

  const { data: result, error } = await supabase
    .from('tours')
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
 * Löscht eine Tour
 */
export async function deleteTour(id: string): Promise<void> {
  const { error } = await supabase
    .from('tours')
    .delete()
    .eq('id', id)

  if (error) throw error
}

/**
 * Weist einen Fahrer einer Tour zu
 */
export async function assignDriverToTour(tourId: string, driverId: string | null): Promise<Tour> {
  const updateData: { assigned_driver_id: string | null; status?: TourStatus } = {
    assigned_driver_id: driverId
  }

  if (driverId) {
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
  return data as Tour
}

// =====================================================
// TOURS (Fahrer)
// =====================================================

/**
 * Lädt alle Touren für den aktuellen Fahrer
 */
export async function getDriverTours(userId: string): Promise<Tour[]> {
  // Erst fahrer.id für user_id holen
  const { data: fahrerData, error: fahrerError } = await supabase
    .from('fahrer')
    .select('id')
    .eq('user_id', userId)
    .single()

  if (fahrerError || !fahrerData) {
    return []
  }

  const { data, error } = await supabase
    .from('tours')
    .select('*')
    .eq('assigned_driver_id', fahrerData.id)
    .neq('status', 'abgeschlossen')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data as Tour[]
}

/**
 * Lädt abgeschlossene Touren für den Fahrer (Historie)
 */
export async function getDriverTourHistory(userId: string): Promise<Tour[]> {
  const { data: fahrerData, error: fahrerError } = await supabase
    .from('fahrer')
    .select('id')
    .eq('user_id', userId)
    .single()

  if (fahrerError || !fahrerData) {
    return []
  }

  const { data, error } = await supabase
    .from('tours')
    .select('*')
    .eq('assigned_driver_id', fahrerData.id)
    .eq('status', 'abgeschlossen')
    .order('updated_at', { ascending: false })
    .limit(50)

  if (error) throw error
  return data as Tour[]
}

// =====================================================
// STATUS UPDATES
// =====================================================

/**
 * Aktualisiert den Tour-Status nach Protokoll-Abschluss
 */
export async function updateTourStatus(
  tourId: string,
  phase: 'pickup' | 'dropoff',
  kmStand: number
): Promise<void> {
  const newStatus: TourStatus = phase === 'pickup' ? 'abgabe_offen' : 'abgeschlossen'

  const updateData: Record<string, unknown> = {
    status: newStatus,
    updated_at: new Date().toISOString(),
  }

  // Zusätzliche Felder je nach Phase (für Legacy-Kompatibilität)
  if (phase === 'pickup') {
    updateData.pickup_completed_at = new Date().toISOString()
    updateData.pickup_km = kmStand
  } else {
    updateData.dropoff_completed_at = new Date().toISOString()
    updateData.dropoff_km = kmStand
  }

  const { error } = await supabase
    .from('tours')
    .update(updateData)
    .eq('id', tourId)

  if (error) throw error
}

// =====================================================
// LEGACY COMPATIBILITY (für bestehende Imports)
// =====================================================

// Alias für alte Funktionsnamen
export const getAllTouren = getAllTours
export const getTourByIdLegacy = getTourById
export const createTourLegacy = createTour
export const updateTourAdmin = updateTour
export const deleteTourById = deleteTour
export const assignFahrerToTour = assignDriverToTour
export const getFahrerTouren = getDriverTours
export const formatFahrzeugart = formatVehicleType
