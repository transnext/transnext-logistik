import { supabase } from './supabase'
import type {
  Tour,
  TourProtocol,
  TourPhoto,
  TourDamage,
  TourDamagePhoto,
  TourSignature,
  PdfExport,
  AuditLog,
  TourComplete,
  CreateTourData,
  ProtocolFormData,
  ProtocolPhase,
  PhotoCategory,
  LocationData,
  TourStatus,
} from './tour-types'

// =====================================================
// TOURS CRUD (Admin)
// =====================================================

/**
 * Erstellt eine neue Tour (nur Admin/Disponent)
 */
export async function createTour(data: CreateTourData): Promise<Tour> {
  // FIN Validierung
  const finRegex = /^[A-HJ-NPR-Z0-9]{17}$/
  if (!finRegex.test(data.fin.toUpperCase())) {
    throw new Error('Ungültige FIN. Muss 17 Zeichen sein.')
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
      distance_km: data.distance_km,
      assigned_driver_id: data.assigned_driver_id,
      status: data.assigned_driver_id ? 'uebernahme_offen' : 'neu',
    }])
    .select()
    .single()

  if (error) throw error
  return result as Tour
}

/**
 * Lädt alle Touren (Admin/Disponent)
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
 * Lädt eine Tour mit allen Relationen
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
 * Lädt komplette Tour mit allen Daten
 */
export async function getTourComplete(id: string): Promise<TourComplete> {
  const { data, error } = await supabase.rpc('get_tour_complete', { p_tour_id: id })

  if (error) throw error
  return data as TourComplete
}

/**
 * Aktualisiert eine Tour (Admin)
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
    .update(data)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return result as Tour
}

/**
 * Löscht eine Tour (Admin)
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

  // Wenn Fahrer zugewiesen und Status "neu", auf "uebernahme_offen" setzen
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
// PROTOCOLS
// =====================================================

/**
 * Lädt oder erstellt ein Protokoll
 */
export async function getOrCreateProtocol(tourId: string, phase: ProtocolPhase): Promise<TourProtocol> {
  // Erst versuchen zu laden
  const { data: existing } = await supabase
    .from('tour_protocols')
    .select('*')
    .eq('tour_id', tourId)
    .eq('phase', phase)
    .single()

  if (existing) {
    return existing as TourProtocol
  }

  // Sonst erstellen
  const { data, error } = await supabase
    .from('tour_protocols')
    .insert({
      tour_id: tourId,
      phase,
      km_stand: 0,
      fuel_level: 'quarter',
    })
    .select()
    .single()

  if (error) throw error
  return data as TourProtocol
}

/**
 * Aktualisiert ein Protokoll
 */
export async function updateProtocol(
  tourId: string,
  phase: ProtocolPhase,
  data: Partial<TourProtocol>
): Promise<TourProtocol> {
  const { data: result, error } = await supabase
    .from('tour_protocols')
    .update(data)
    .eq('tour_id', tourId)
    .eq('phase', phase)
    .select()
    .single()

  if (error) throw error
  return result as TourProtocol
}


// =====================================================
// PHOTOS
// =====================================================

import { validateAndNormalizeImage } from './image-utils'

/**
 * Lädt ein Foto hoch
 */
export async function uploadPhoto(
  tourId: string,
  phase: ProtocolPhase,
  category: PhotoCategory,
  dataUrl: string
): Promise<TourPhoto> {
  // Validate and normalize the image
  const normalizedDataUrl = await validateAndNormalizeImage(dataUrl)
  
  // DataURL zu Blob konvertieren
  const response = await fetch(normalizedDataUrl)
  const blob = await response.blob()

  const timestamp = Date.now()
  const fileName = `tour_${tourId}_${phase}_${category}_${timestamp}.jpg`
  const filePath = `tours/${tourId}/${phase}/photos/${fileName}`

  // Upload zu Storage
  const { error: uploadError } = await supabase.storage
    .from('belege')
    .upload(filePath, blob, {
      contentType: 'image/jpeg',
      upsert: true,
    })

  if (uploadError) throw uploadError

  // Public URL holen
  const { data: urlData } = supabase.storage
    .from('belege')
    .getPublicUrl(filePath)

  // Altes Foto für diese Kategorie löschen (außer damage/other)
  if (category !== 'damage' && category !== 'other') {
    await supabase
      .from('tour_photos')
      .delete()
      .eq('tour_id', tourId)
      .eq('phase', phase)
      .eq('category', category)
  }

  // In DB speichern
  const { data, error } = await supabase
    .from('tour_photos')
    .insert({
      tour_id: tourId,
      phase,
      category,
      file_url: urlData.publicUrl,
      file_path: filePath,
    })
    .select()
    .single()

  if (error) throw error
  return data as TourPhoto
}

/**
 * Lädt alle Fotos für eine Tour/Phase
 */
export async function getPhotos(tourId: string, phase: ProtocolPhase): Promise<TourPhoto[]> {
  const { data, error } = await supabase
    .from('tour_photos')
    .select('*')
    .eq('tour_id', tourId)
    .eq('phase', phase)
    .order('category')

  if (error) throw error
  return data as TourPhoto[]
}


// =====================================================
// DAMAGES
// =====================================================

/**
 * Erstellt einen Schaden
 */
export async function createDamage(
  tourId: string,
  phase: ProtocolPhase,
  damage: Omit<TourDamage, 'id' | 'tour_id' | 'phase' | 'created_at' | 'updated_at'>
): Promise<TourDamage> {
  const { data, error } = await supabase
    .from('tour_damages')
    .insert({
      tour_id: tourId,
      phase,
      ...damage,
    })
    .select()
    .single()

  if (error) throw error
  return data as TourDamage
}

/**
 * Aktualisiert einen Schaden
 */
export async function updateDamage(damageId: string, damage: Partial<TourDamage>): Promise<TourDamage> {
  const { data, error } = await supabase
    .from('tour_damages')
    .update(damage)
    .eq('id', damageId)
    .select()
    .single()

  if (error) throw error
  return data as TourDamage
}

/**
 * Löscht einen Schaden
 */
export async function deleteDamage(damageId: string): Promise<void> {
  const { error } = await supabase
    .from('tour_damages')
    .delete()
    .eq('id', damageId)

  if (error) throw error
}

/**
 * Lädt ein Schadensfoto hoch
 */
export async function uploadDamagePhoto(
  damageId: string,
  tourId: string,
  dataUrl: string
): Promise<TourDamagePhoto> {
  // Validate and normalize the image
  const normalizedDataUrl = await validateAndNormalizeImage(dataUrl)
  
  const response = await fetch(normalizedDataUrl)
  const blob = await response.blob()

  const timestamp = Date.now()
  const fileName = `damage_${damageId}_${timestamp}.jpg`
  const filePath = `tours/${tourId}/damages/${fileName}`

  const { error: uploadError } = await supabase.storage
    .from('belege')
    .upload(filePath, blob, {
      contentType: 'image/jpeg',
      upsert: true,
    })

  if (uploadError) throw uploadError

  const { data: urlData } = supabase.storage
    .from('belege')
    .getPublicUrl(filePath)

  const { data, error } = await supabase
    .from('tour_damage_photos')
    .insert({
      damage_id: damageId,
      file_url: urlData.publicUrl,
      file_path: filePath,
    })
    .select()
    .single()

  if (error) throw error
  return data as TourDamagePhoto
}

/**
 * Lädt Vorschäden aus Übernahme
 */
export async function getPreExistingDamages(tourId: string): Promise<TourDamage[]> {
  const { data, error } = await supabase
    .from('tour_damages')
    .select(`
      *,
      photos:tour_damage_photos(*)
    `)
    .eq('tour_id', tourId)
    .eq('phase', 'pickup')

  if (error) throw error
  return data as TourDamage[]
}


// =====================================================
// SIGNATURES
// =====================================================

/**
 * Speichert eine Unterschrift
 */
export async function saveSignature(
  tourId: string,
  phase: ProtocolPhase,
  role: 'driver' | 'recipient',
  dataUrl: string,
  name?: string
): Promise<TourSignature> {
  const response = await fetch(dataUrl)
  const blob = await response.blob()

  const timestamp = Date.now()
  const fileName = `signature_${tourId}_${phase}_${role}_${timestamp}.png`
  const filePath = `tours/${tourId}/${phase}/signatures/${fileName}`

  const { error: uploadError } = await supabase.storage
    .from('belege')
    .upload(filePath, blob, {
      contentType: 'image/png',
      upsert: true,
    })

  if (uploadError) throw uploadError

  const { data: urlData } = supabase.storage
    .from('belege')
    .getPublicUrl(filePath)

  // Upsert
  const { data, error } = await supabase
    .from('tour_signatures')
    .upsert({
      tour_id: tourId,
      phase,
      role,
      name,
      file_url: urlData.publicUrl,
      file_path: filePath,
    }, {
      onConflict: 'tour_id,phase,role',
    })
    .select()
    .single()

  if (error) throw error
  return data as TourSignature
}


// =====================================================
// PROTOCOL COMPLETION
// =====================================================

/**
 * Schließt ein Protokoll ab und aktualisiert den Tour-Status
 */
export async function completeProtocol(
  tourId: string,
  phase: ProtocolPhase,
  formData: ProtocolFormData
): Promise<void> {
  // 1. Protokoll aktualisieren
  const { error: protocolError } = await supabase
    .from('tour_protocols')
    .upsert({
      tour_id: tourId,
      phase,
      km_stand: Number.parseInt(formData.km) || 0,
      fuel_level: formData.fuel_level || 'quarter',
      cable_status: formData.cable_status,
      accessories: formData.accessories,
      has_interior_damage: formData.has_interior_damage ?? false,
      has_exterior_damage: formData.has_exterior_damage ?? false,
      handover_type: formData.handover_type || null,
      handover_note: formData.handover_note || null,
      recipient_name: formData.recipient_name || null,
      confirmed: true,
      confirmed_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
    }, {
      onConflict: 'tour_id,phase',
    })

  if (protocolError) throw protocolError

  // 2. Fotos hochladen
  for (const [category, dataUrl] of Object.entries(formData.photos)) {
    if (dataUrl && dataUrl.startsWith('data:')) {
      await uploadPhoto(tourId, phase, category as PhotoCategory, dataUrl)
    }
  }

  // 3. Schäden speichern
  for (const damage of formData.damages) {
    if (damage.damage_type && damage.component) {
      const savedDamage = await createDamage(tourId, phase, {
        is_interior: damage.is_interior,
        damage_type: damage.damage_type as TourDamage['damage_type'],
        component: damage.component as TourDamage['component'],
        description: damage.description,
        is_pre_existing: false,
      })

      // Schadensfotos hochladen
      for (const photoUrl of damage.photos) {
        if (photoUrl.startsWith('data:')) {
          await uploadDamagePhoto(savedDamage.id, tourId, photoUrl)
        }
      }
    }
  }

  // 4. Signaturen speichern
  if (formData.driver_signature) {
    await saveSignature(tourId, phase, 'driver', formData.driver_signature)
  }

  if (formData.recipient_signature && formData.recipient_name) {
    await saveSignature(tourId, phase, 'recipient', formData.recipient_signature, formData.recipient_name)
  }

  // 5. Tour-Status aktualisieren
  const newStatus: TourStatus = phase === 'pickup' ? 'abgabe_offen' : 'abgeschlossen'

  const { error: tourError } = await supabase
    .from('tours')
    .update({ status: newStatus })
    .eq('id', tourId)

  if (tourError) throw tourError
}


// =====================================================
// PDF EXPORTS
// =====================================================

/**
 * Lädt alle PDF-Exporte für eine Tour
 */
export async function getPdfExports(tourId: string): Promise<PdfExport[]> {
  const { data, error } = await supabase
    .from('pdf_exports')
    .select('*')
    .eq('tour_id', tourId)
    .order('version', { ascending: false })

  if (error) throw error
  return data as PdfExport[]
}

/**
 * Erstellt einen neuen PDF-Export Eintrag
 */
export async function createPdfExport(
  tourId: string,
  fileUrl: string,
  filePath: string,
  fileSizeBytes?: number,
  changeReason?: string
): Promise<PdfExport> {
  // Nächste Version ermitteln
  const { data: versionData } = await supabase.rpc('get_next_pdf_version', { p_tour_id: tourId })
  const version = versionData || 1

  const { data, error } = await supabase
    .from('pdf_exports')
    .insert({
      tour_id: tourId,
      version,
      file_url: fileUrl,
      file_path: filePath,
      file_size_bytes: fileSizeBytes,
      change_reason: changeReason,
    })
    .select()
    .single()

  if (error) throw error
  return data as PdfExport
}


// =====================================================
// AUDIT LOG
// =====================================================

/**
 * Lädt Audit-Log für eine Entität (nur Admin)
 */
export async function getAuditLog(entity: string, entityId: string): Promise<AuditLog[]> {
  const { data, error } = await supabase
    .from('audit_log')
    .select('*')
    .eq('entity', entity)
    .eq('entity_id', entityId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data as AuditLog[]
}


// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Formatiert eine LocationData für Anzeige
 */
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

/**
 * Berechnet Distanz zwischen zwei Orten via Google Maps API
 */
export async function calculateDistance(
  pickup: LocationData,
  dropoff: LocationData
): Promise<number | null> {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
  if (!apiKey) {
    console.warn('Google Maps API Key nicht konfiguriert')
    return null
  }

  const originStr = `${pickup.street || ''} ${pickup.zip} ${pickup.city}, Germany`.trim()
  const destStr = `${dropoff.street || ''} ${dropoff.zip} ${dropoff.city}, Germany`.trim()

  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(originStr)}&destinations=${encodeURIComponent(destStr)}&key=${apiKey}`
    )

    const data = await response.json()

    if (data.rows?.[0]?.elements?.[0]?.distance?.value) {
      return Math.round(data.rows[0].elements[0].distance.value / 1000)
    }

    return null
  } catch (error) {
    console.error('Fehler bei Distanzberechnung:', error)
    return null
  }
}
