import { supabase } from './supabase'

/**
 * Upload einer Beleg-Datei (PDF oder Foto) zu Supabase Storage
 */
export async function uploadBeleg(
  file: File,
  userId: string,
  type: 'arbeitsnachweis' | 'auslagennachweis',
  tourNr: string
): Promise<{ url: string; path: string }> {
  // Validierung - Akzeptiere PDFs und Bilder
  const allowedTypes = ['pdf', 'jpeg', 'jpg', 'png', 'heic', 'heif']
  const fileExtension = file.name.split('.').pop()?.toLowerCase() || ''
  const isAllowedType = allowedTypes.some(type => 
    file.type.includes(type) || fileExtension === type
  )
  
  if (!isAllowedType) {
    throw new Error('Nur PDF oder Foto-Dateien sind erlaubt (PDF, JPG, PNG, HEIC)')
  }

  if (file.size > 10 * 1024 * 1024) { // 10MB
    throw new Error('Datei zu groß (max. 10MB)')
  }

  // Generiere eindeutigen Dateinamen mit korrekter Dateiendung
  const timestamp = Date.now()
  const sanitizedTourNr = tourNr.replace(/[^a-zA-Z0-9]/g, '_')
  const fileName = `${sanitizedTourNr}_${timestamp}.${fileExtension}`

  // Pfad: userId/type/fileName
  const filePath = `${userId}/${type}/${fileName}`

  // Upload zu Supabase Storage
  const { data, error } = await supabase.storage
    .from('belege')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false
    })

  if (error) throw error

  // Generiere öffentliche URL (mit signed URL für private Buckets)
  const { data: urlData } = supabase.storage
    .from('belege')
    .getPublicUrl(filePath)

  return {
    url: urlData.publicUrl,
    path: filePath
  }
}

/**
 * Generiert eine signierte URL für temporären Zugriff (1 Stunde)
 */
export async function getSignedBelegUrl(filePath: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from('belege')
    .createSignedUrl(filePath, 3600) // 1 Stunde

  if (error) throw error
  return data.signedUrl
}

/**
 * Lädt eine Beleg-Datei herunter
 */
export async function downloadBeleg(filePath: string, fileName: string) {
  const { data, error } = await supabase.storage
    .from('belege')
    .download(filePath)

  if (error) throw error

  // Erstelle Download-Link
  const url = URL.createObjectURL(data)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * Löscht eine Beleg-Datei
 */
export async function deleteBeleg(filePath: string): Promise<void> {
  const { error } = await supabase.storage
    .from('belege')
    .remove([filePath])

  if (error) throw error
}

/**
 * Prüft ob ein Beleg existiert
 */
export async function checkBelegExists(filePath: string): Promise<boolean> {
  const { data, error } = await supabase.storage
    .from('belege')
    .list(filePath.split('/').slice(0, -1).join('/'))

  if (error) return false

  const fileName = filePath.split('/').pop()
  return data?.some(file => file.name === fileName) || false
}
