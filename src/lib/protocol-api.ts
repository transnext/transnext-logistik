import { supabase } from './supabase'
import { validateAndNormalize, isSpecialCategory } from './photo-categories'
import type {
  TourProtocol,
  ProtocolPhoto,
  ProtocolDamage,
  DamagePhoto,
  ProtocolSignature,
  ProtocolPhase,
  PhotoCategory,
  ProtocolFormData,
  TireType,
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
      photos:tour_photos(*),
      damages:tour_damages(
        *,
        photos:tour_damage_photos(*)
      ),
      signatures:tour_signatures(*)
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
    .from('tour_damages')
    .select(`
      *,
      photos:tour_damage_photos(*)
    `)
    .eq('tour_id', tourId)
    .eq('phase', 'pickup')

  if (error) throw error
  return (data as ProtocolDamage[]) || []
}

/**
 * Lädt Übernahme-Protokolldaten für die Abgabe-Ansicht (Start-KM, Start-Zeit)
 */
export async function getPickupProtocolData(tourId: string): Promise<{
  km_stand: number
  started_at: string
} | null> {
  const { data, error } = await supabase
    .from('tour_protocols')
    .select('km, started_at, completed_at')
    .eq('tour_id', tourId)
    .eq('phase', 'pickup')
    .single()

  if (error && error.code !== 'PGRST116') throw error
  if (!data) return null

  return {
    km_stand: data.km,
    started_at: data.completed_at || data.started_at
  }
}


// =====================================================
// FOTO UPLOAD
// =====================================================

/**
 * Lädt ein Protokoll-Foto hoch
 */
export async function uploadProtocolPhoto(
  tourId: string,
  phase: ProtocolPhase,
  category: PhotoCategory,
  dataUrl: string
): Promise<ProtocolPhoto> {
  // WICHTIG: Kategorie normalisieren (Single Source of Truth)
  const normalizedCategory = validateAndNormalize(category, `Upload Tour ${tourId}`)

  // Convert base64 to blob
  const response = await fetch(dataUrl)
  const blob = await response.blob()

  const timestamp = Date.now()
  const fileName = `tour_${tourId}_${phase}_${normalizedCategory}_${timestamp}.jpg`
  const filePath = `tours/${tourId}/${phase}/photos/${fileName}`

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

  // Delete existing photo for this category (außer damage/other)
  if (!isSpecialCategory(normalizedCategory)) {
    await supabase
      .from('tour_photos')
      .delete()
      .eq('tour_id', tourId)
      .eq('phase', phase)
      .eq('category', normalizedCategory)
  }

  // Save to database
  const { data, error } = await supabase
    .from('tour_photos')
    .insert({
      tour_id: tourId,
      phase,
      category: normalizedCategory,
      file_url: urlData.publicUrl,
      file_path: filePath,
    })
    .select()
    .single()

  if (error) throw error
  return data as ProtocolPhoto
}

/**
 * Lädt alle Fotos einer Tour/Phase
 */
export async function getPhotos(tourId: string, phase: ProtocolPhase): Promise<ProtocolPhoto[]> {
  const { data, error } = await supabase
    .from('tour_photos')
    .select('*')
    .eq('tour_id', tourId)
    .eq('phase', phase)
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
  tourId: string,
  phase: ProtocolPhase,
  damage: {
    is_interior: boolean
    damage_type: string
    component: string
    description: string
    is_pre_existing?: boolean
  }
): Promise<ProtocolDamage> {
  const { data, error } = await supabase
    .from('tour_damages')
    .insert({
      tour_id: tourId,
      phase,
      is_interior: damage.is_interior,
      damage_type: damage.damage_type,
      component: damage.component,
      description: damage.description,
      is_pre_existing: damage.is_pre_existing || false,
    })
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
): Promise<DamagePhoto> {
  const response = await fetch(dataUrl)
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
  return data as DamagePhoto
}


// =====================================================
// SIGNATUREN
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
): Promise<ProtocolSignature> {
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

  // Upsert (replace existing)
  const { data, error } = await supabase
    .from('tour_signatures')
    .upsert({
      tour_id: tourId,
      phase,
      role,
      name,
      file_url: urlData.publicUrl,
      file_path: filePath,
      signed_at: new Date().toISOString(),
    }, {
      onConflict: 'tour_id,phase,role',
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
  const kmValue = parseInt(formData.km_stand) || 0

  // 1. Protokoll erstellen/aktualisieren
  // WICHTIG: Nur Spalten verwenden, die GARANTIERT in der DB existieren!
  // Zubehör-Daten werden als 'accessories' JSONB gespeichert (Spalte muss existieren)
  // Falls die Spalte fehlt, wird sie per Migration 20260213_add_accessories.sql hinzugefügt

  // Zubehör-Objekt für JSONB-Spalte
  const accessoriesData = {
    key_count: formData.key_count,
    registration_original: formData.registration_original,
    service_booklet: formData.service_booklet,
    sd_card_navigation: formData.sd_card_navigation,
    floor_mats: formData.floor_mats,
    license_plates_present: formData.license_plates_present,
    radio_with_code: formData.radio_with_code,
    hubcaps_present: formData.hubcaps_present,
    rim_type: formData.rim_type,
    antenna_present: formData.antenna_present,
    safety_kit: formData.safety_kit,
  }

  // Basis-Payload ohne accessories (funktioniert immer)
  const basePayload: Record<string, unknown> = {
    tour_id: tourId,
    phase,
    km: kmValue,
    fuel_level: formData.fuel_level || 'quarter',
    cable_status: formData.cable_status,
    has_interior_damage: formData.has_interior_damage ?? false,
    has_exterior_damage: formData.has_exterior_damage ?? false,
    handover_type: formData.handover_type || null,
    handover_note: formData.handover_note || null,
    recipient_name: formData.recipient_name || null,
    confirmed: formData.confirmed,
    confirmed_at: formData.confirmed ? new Date().toISOString() : null,
    completed_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  // tire_type hinzufügen (falls Spalte existiert - wurde per Migration hinzugefügt)
  if (formData.tire_type) {
    basePayload.tire_type = formData.tire_type
  }

  // Versuche mit accessories, falls Fehler dann ohne
  let protocolError: Error | null = null
  let protocol: unknown = null

  // Erst mit accessories versuchen
  const payloadWithAccessories = { ...basePayload, accessories: accessoriesData }
  const result1 = await supabase
    .from('tour_protocols')
    .upsert(payloadWithAccessories, { onConflict: 'tour_id,phase' })
    .select()
    .single()

  if (result1.error) {
    // Falls "accessories" Spalte fehlt, ohne versuchen
    if (result1.error.message?.includes('accessories')) {
      console.warn('[Protocol] accessories Spalte fehlt - speichere ohne Zubehör')
      const result2 = await supabase
        .from('tour_protocols')
        .upsert(basePayload, { onConflict: 'tour_id,phase' })
        .select()
        .single()

      if (result2.error) {
        protocolError = result2.error
      } else {
        protocol = result2.data
      }
    } else {
      protocolError = result1.error
    }
  } else {
    protocol = result1.data
  }

  if (protocolError) throw protocolError

  // 2. Fotos hochladen
  for (const [category, dataUrl] of Object.entries(formData.photos)) {
    if (dataUrl && dataUrl.startsWith('data:')) {
      await uploadProtocolPhoto(tourId, phase, category as PhotoCategory, dataUrl)
    }
  }

  // 3. Schäden speichern
  for (const damage of formData.damages) {
    if (damage.damage_type && damage.component) {
      const savedDamage = await createDamage(tourId, phase, {
        is_interior: damage.is_interior,
        damage_type: damage.damage_type,
        component: damage.component,
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

  // 5. Tour-Status aktualisieren (in 'tours' Tabelle)
  const newStatus = phase === 'pickup' ? 'abgabe_offen' : 'abgeschlossen'

  const { error: tourError } = await supabase
    .from('tours')
    .update({
      status: newStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('id', tourId)

  if (tourError) throw tourError
}


// =====================================================
// PDF EXPORTS
// =====================================================

/**
 * Lädt alle PDF-Exporte für eine Tour
 */
export async function getPdfExports(tourId: string): Promise<Array<{
  id: string
  tour_id: string
  version: number
  file_url: string
  created_at: string
}>> {
  const { data, error } = await supabase
    .from('pdf_exports')
    .select('*')
    .eq('tour_id', tourId)
    .order('version', { ascending: false })

  if (error) throw error
  return data || []
}

/**
 * Lädt das neueste PDF für eine Tour
 */
export async function getLatestPdf(tourId: string): Promise<{
  id: string
  file_url: string
  version: number
  created_at: string
} | null> {
  const { data, error } = await supabase
    .from('pdf_exports')
    .select('*')
    .eq('tour_id', tourId)
    .order('version', { ascending: false })
    .limit(1)
    .single()

  if (error && error.code !== 'PGRST116') throw error
  return data || null
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
