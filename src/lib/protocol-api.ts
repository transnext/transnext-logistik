import { supabase } from './supabase'
import type {
  TourProtocol,
  ProtocolPhoto,
  ProtocolDamage,
  DamagePhoto,
  ProtocolSignature,
  ProtocolPhase,
  PhotoCategory,
  ProtocolFormData,
  DamageFormData,
} from './protocol-types'

// =====================================================
// PROTOKOLL CRUD
// =====================================================

/**
 * Erstellt oder aktualisiert ein Protokoll
 */
export async function upsertProtocol(
  tourId: string,
  phase: ProtocolPhase,
  data: Partial<TourProtocol>
): Promise<TourProtocol> {
  const { data: result, error } = await supabase
    .from('tour_protocols')
    .upsert({
      tour_id: tourId,
      phase,
      ...data,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'tour_id,phase',
    })
    .select()
    .single()

  if (error) throw error
  return result as TourProtocol
}

/**
 * Lädt ein Protokoll mit allen Relationen
 */
export async function getProtocol(
  tourId: string,
  phase: ProtocolPhase
): Promise<TourProtocol | null> {
  const { data, error } = await supabase
    .from('tour_protocols')
    .select(`
      *,
      photos:protocol_photos(*),
      damages:protocol_damages(
        *,
        photos:damage_photos(*)
      ),
      signatures:protocol_signatures(*)
    `)
    .eq('tour_id', tourId)
    .eq('phase', phase)
    .single()

  if (error && error.code !== 'PGRST116') throw error
  return data as TourProtocol | null
}

/**
 * Lädt Vorschäden aus der Übernahme für die Abgabe
 */
export async function getPreExistingDamages(tourId: string): Promise<ProtocolDamage[]> {
  const { data, error } = await supabase
    .from('tour_protocols')
    .select(`
      damages:protocol_damages(
        *,
        photos:damage_photos(*)
      )
    `)
    .eq('tour_id', tourId)
    .eq('phase', 'pickup')
    .single()

  if (error && error.code !== 'PGRST116') throw error
  return (data?.damages as ProtocolDamage[]) || []
}


// =====================================================
// FOTO UPLOAD
// =====================================================

/**
 * Lädt ein Protokoll-Foto hoch
 */
export async function uploadProtocolPhoto(
  protocolId: string,
  category: PhotoCategory,
  dataUrl: string,
  tourId: string
): Promise<ProtocolPhoto> {
  // Convert base64 to blob
  const response = await fetch(dataUrl)
  const blob = await response.blob()

  const timestamp = Date.now()
  const fileName = `protocol_${protocolId}_${category}_${timestamp}.jpg`
  const filePath = `touren/${tourId}/photos/${fileName}`

  // Upload to storage
  const { error: uploadError } = await supabase.storage
    .from('belege')
    .upload(filePath, blob, {
      contentType: 'image/jpeg',
      upsert: true,
    })

  if (uploadError) throw uploadError

  // Get public URL
  const { data: urlData } = supabase.storage
    .from('belege')
    .getPublicUrl(filePath)

  // Delete existing photo for this category
  await supabase
    .from('protocol_photos')
    .delete()
    .eq('protocol_id', protocolId)
    .eq('category', category)

  // Save to database
  const { data, error } = await supabase
    .from('protocol_photos')
    .insert({
      protocol_id: protocolId,
      category,
      file_url: urlData.publicUrl,
      file_path: filePath,
      uploaded_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) throw error
  return data as ProtocolPhoto
}

/**
 * Lädt alle Fotos eines Protokolls
 */
export async function getProtocolPhotos(protocolId: string): Promise<ProtocolPhoto[]> {
  const { data, error } = await supabase
    .from('protocol_photos')
    .select('*')
    .eq('protocol_id', protocolId)
    .order('category')

  if (error) throw error
  return data as ProtocolPhoto[]
}


// =====================================================
// SCHÄDEN
// =====================================================

/**
 * Erstellt einen neuen Schaden
 */
export async function createDamage(
  protocolId: string,
  damage: Omit<ProtocolDamage, 'id' | 'protocol_id' | 'created_at' | 'updated_at'>
): Promise<ProtocolDamage> {
  const { data, error } = await supabase
    .from('protocol_damages')
    .insert({
      protocol_id: protocolId,
      ...damage,
    })
    .select()
    .single()

  if (error) throw error
  return data as ProtocolDamage
}

/**
 * Aktualisiert einen Schaden
 */
export async function updateDamage(
  damageId: string,
  damage: Partial<ProtocolDamage>
): Promise<ProtocolDamage> {
  const { data, error } = await supabase
    .from('protocol_damages')
    .update(damage)
    .eq('id', damageId)
    .select()
    .single()

  if (error) throw error
  return data as ProtocolDamage
}

/**
 * Löscht einen Schaden
 */
export async function deleteDamage(damageId: string): Promise<void> {
  const { error } = await supabase
    .from('protocol_damages')
    .delete()
    .eq('id', damageId)

  if (error) throw error
}

/**
 * Lädt ein Schadensfoto hoch
 */
export async function uploadDamagePhoto(
  damageId: string,
  dataUrl: string,
  tourId: string
): Promise<DamagePhoto> {
  const response = await fetch(dataUrl)
  const blob = await response.blob()

  const timestamp = Date.now()
  const fileName = `damage_${damageId}_${timestamp}.jpg`
  const filePath = `touren/${tourId}/damages/${fileName}`

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
    .from('damage_photos')
    .insert({
      damage_id: damageId,
      file_url: urlData.publicUrl,
      file_path: filePath,
      uploaded_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) throw error
  return data as DamagePhoto
}


// =====================================================
// SIGNATUREN
// =====================================================

/**
 * Speichert eine Unterschrift
 */
export async function saveSignature(
  protocolId: string,
  role: 'driver' | 'recipient',
  dataUrl: string,
  tourId: string,
  name?: string
): Promise<ProtocolSignature> {
  const response = await fetch(dataUrl)
  const blob = await response.blob()

  const timestamp = Date.now()
  const fileName = `signature_${protocolId}_${role}_${timestamp}.png`
  const filePath = `touren/${tourId}/signatures/${fileName}`

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

  // Upsert (replace existing)
  const { data, error } = await supabase
    .from('protocol_signatures')
    .upsert({
      protocol_id: protocolId,
      role,
      name,
      file_url: urlData.publicUrl,
      file_path: filePath,
      signed_at: new Date().toISOString(),
    }, {
      onConflict: 'protocol_id,role',
    })
    .select()
    .single()

  if (error) throw error
  return data as ProtocolSignature
}


// =====================================================
// PROTOKOLL ABSCHLIESSEN
// =====================================================

/**
 * Schließt das Protokoll ab und aktualisiert den Tour-Status
 */
export async function completeProtocol(
  tourId: string,
  phase: ProtocolPhase,
  formData: ProtocolFormData
): Promise<void> {
  // 1. Protokoll erstellen/aktualisieren
  const protocol = await upsertProtocol(tourId, phase, {
    km_stand: parseInt(formData.km_stand),
    fuel_level: formData.fuel_level || 'quarter',
    cable_status: formData.cable_status,
    key_count: formData.key_count,
    registration_original: formData.registration_original,
    service_booklet: formData.service_booklet,
    sd_card_navigation: formData.sd_card_navigation,
    floor_mats: formData.floor_mats,
    license_plates_present: formData.license_plates_present,
    radio_with_code: formData.radio_with_code,
    hubcaps_present: formData.hubcaps_present ?? undefined,
    rim_type: formData.rim_type,
    antenna_present: formData.antenna_present,
    safety_kit: formData.safety_kit,
    has_interior_damage: formData.has_interior_damage ?? false,
    has_exterior_damage: formData.has_exterior_damage ?? false,
    handover_type: formData.handover_type || undefined,
    handover_note: formData.handover_note || undefined,
    recipient_name: formData.recipient_name || undefined,
    confirmed: formData.confirmed,
    confirmed_at: formData.confirmed ? new Date().toISOString() : undefined,
    completed_at: new Date().toISOString(),
  })

  // 2. Fotos hochladen
  for (const [category, dataUrl] of Object.entries(formData.photos)) {
    if (dataUrl) {
      await uploadProtocolPhoto(protocol.id, category as PhotoCategory, dataUrl, tourId)
    }
  }

  // 3. Schäden speichern
  for (const damage of formData.damages) {
    const savedDamage = await createDamage(protocol.id, {
      is_interior: damage.is_interior,
      damage_type: damage.damage_type as ProtocolDamage['damage_type'],
      component: damage.component as ProtocolDamage['component'],
      description: damage.description,
      is_pre_existing: false,
    })

    // Schadensfotos hochladen
    for (const photoUrl of damage.photos) {
      await uploadDamagePhoto(savedDamage.id, photoUrl, tourId)
    }
  }

  // 4. Signaturen speichern
  if (formData.driver_signature) {
    await saveSignature(protocol.id, 'driver', formData.driver_signature, tourId)
  }

  if (formData.recipient_signature && formData.recipient_name) {
    await saveSignature(protocol.id, 'recipient', formData.recipient_signature, tourId, formData.recipient_name)
  }

  // 5. Tour-Status aktualisieren
  const newStatus = phase === 'pickup' ? 'abgabe_offen' : 'abgeschlossen'

  const updateData: Record<string, unknown> = {
    status: newStatus,
    updated_at: new Date().toISOString(),
  }

  if (phase === 'pickup') {
    updateData.uebernahme_zeitpunkt = new Date().toISOString()
    updateData.uebernahme_km_stand = parseInt(formData.km_stand)
  } else {
    updateData.abgabe_zeitpunkt = new Date().toISOString()
    updateData.abgabe_km_stand = parseInt(formData.km_stand)
  }

  const { error } = await supabase
    .from('touren')
    .update(updateData)
    .eq('id', tourId)

  if (error) throw error
}


// =====================================================
// HILFSFUNKTIONEN
// =====================================================

/**
 * Prüft ob alle Pflichtfotos vorhanden sind
 */
export function checkRequiredPhotos(
  photos: Record<PhotoCategory, string>,
  requiredCategories: PhotoCategory[]
): { complete: boolean; missing: PhotoCategory[] } {
  const missing: PhotoCategory[] = []

  for (const category of requiredCategories) {
    if (!photos[category]) {
      missing.push(category)
    }
  }

  return {
    complete: missing.length === 0,
    missing,
  }
}
