/**
 * HEIC/HEIF zu JPEG Konvertierung
 *
 * Diese Datei ermöglicht die clientseitige Konvertierung von iPhone-HEIC-Fotos
 * zu JPEG, damit sie im PDF-Export und allen Browsern angezeigt werden können.
 *
 * Verwendet heic2any Library für Browser-basierte Konvertierung.
 */

// heic2any hat keine TypeScript-Typen, daher manuell typisieren
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let heic2any: any = null

/**
 * Lädt heic2any dynamisch (nur wenn benötigt)
 */
async function loadHeic2Any() {
  if (heic2any) return heic2any

  try {
    const module = await import('heic2any')
    heic2any = module.default || module
    return heic2any
  } catch (error) {
    console.error('[heic-converter] Fehler beim Laden von heic2any:', error)
    throw new Error('HEIC-Konvertierung nicht verfügbar')
  }
}

/**
 * Ergebnis der HEIC-Konvertierung
 */
export interface HeicConversionResult {
  /** Konvertierte Datei (JPEG) */
  file: File
  /** Ob Konvertierung stattgefunden hat */
  wasConverted: boolean
  /** Nachricht für UI */
  message: string
  /** Original-Dateiname */
  originalName: string
  /** Neuer Dateiname */
  newName: string
}

/**
 * Prüft ob eine Datei HEIC/HEIF ist
 */
export function isHeicFile(file: File): boolean {
  // Prüfe MIME-Type
  const mimeType = file.type.toLowerCase()
  if (mimeType === 'image/heic' || mimeType === 'image/heif') {
    return true
  }

  // Prüfe Dateiendung (manche Browser setzen MIME-Type nicht korrekt)
  const extension = file.name.toLowerCase().split('.').pop()
  if (extension === 'heic' || extension === 'heif') {
    return true
  }

  return false
}

/**
 * Konvertiert eine HEIC/HEIF-Datei zu JPEG
 *
 * @param file - Die HEIC/HEIF-Datei
 * @param quality - JPEG-Qualität (0-1), Standard: 0.92
 * @returns Promise mit konvertierter Datei und Metadaten
 */
export async function convertHeicToJpeg(
  file: File,
  quality: number = 0.92
): Promise<HeicConversionResult> {
  // Wenn keine HEIC-Datei, direkt zurückgeben
  if (!isHeicFile(file)) {
    return {
      file,
      wasConverted: false,
      message: '',
      originalName: file.name,
      newName: file.name
    }
  }

  console.log(`[heic-converter] Konvertiere ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)...`)

  try {
    // Lade heic2any dynamisch
    const converter = await loadHeic2Any()

    // Konvertiere HEIC zu JPEG Blob
    const jpegBlob = await converter({
      blob: file,
      toType: 'image/jpeg',
      quality
    })

    // heic2any kann ein Array oder einen einzelnen Blob zurückgeben
    const resultBlob = Array.isArray(jpegBlob) ? jpegBlob[0] : jpegBlob

    if (!resultBlob) {
      throw new Error('Keine Daten von Konverter erhalten')
    }

    // Neuer Dateiname mit .jpg Endung
    const originalName = file.name
    const baseName = originalName.replace(/\.(heic|heif)$/i, '')
    const newName = `${baseName}.jpg`

    // Erstelle neue File-Instanz
    const convertedFile = new File([resultBlob], newName, {
      type: 'image/jpeg',
      lastModified: file.lastModified
    })

    console.log(`[heic-converter] ✓ Konvertiert: ${originalName} → ${newName} (${(convertedFile.size / 1024 / 1024).toFixed(2)} MB)`)

    return {
      file: convertedFile,
      wasConverted: true,
      message: 'iPhone-Foto wurde automatisch in JPEG konvertiert.',
      originalName,
      newName
    }
  } catch (error) {
    console.error('[heic-converter] Konvertierung fehlgeschlagen:', error)

    // Spezifische Fehlermeldungen
    const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler'

    throw new Error(
      `HEIC konnte nicht konvertiert werden: ${errorMessage}. ` +
      'Bitte Foto als JPEG oder PNG hochladen.'
    )
  }
}

/**
 * Verarbeitet eine Upload-Datei: Konvertiert HEIC zu JPEG falls nötig
 *
 * Diese Funktion sollte vor dem eigentlichen Upload aufgerufen werden.
 *
 * @param file - Die hochzuladende Datei
 * @returns Promise mit verarbeiteter Datei und Konvertierungsinfo
 */
export async function processFileForUpload(file: File): Promise<HeicConversionResult> {
  // HEIC/HEIF konvertieren
  if (isHeicFile(file)) {
    return convertHeicToJpeg(file)
  }

  // Andere Dateitypen unverändert durchlassen
  return {
    file,
    wasConverted: false,
    message: '',
    originalName: file.name,
    newName: file.name
  }
}

/**
 * Konvertiert einen ArrayBuffer (z.B. von fetch) von HEIC zu JPEG
 * Für Verwendung im PDF-Export bei bestehenden HEIC-Belegen
 *
 * @param buffer - HEIC-Datei als ArrayBuffer
 * @param fileName - Optionaler Dateiname für Logging
 * @returns Promise mit JPEG ArrayBuffer
 */
export async function convertHeicBufferToJpeg(
  buffer: ArrayBuffer,
  fileName?: string
): Promise<ArrayBuffer> {
  console.log(`[heic-converter] Konvertiere Buffer ${fileName || 'unbekannt'} (${(buffer.byteLength / 1024 / 1024).toFixed(2)} MB)...`)

  try {
    // Lade heic2any dynamisch
    const converter = await loadHeic2Any()

    // Erstelle Blob aus ArrayBuffer
    const heicBlob = new Blob([buffer], { type: 'image/heic' })

    // Konvertiere zu JPEG
    const jpegBlob = await converter({
      blob: heicBlob,
      toType: 'image/jpeg',
      quality: 0.92
    })

    // heic2any kann ein Array oder einen einzelnen Blob zurückgeben
    const resultBlob = Array.isArray(jpegBlob) ? jpegBlob[0] : jpegBlob

    if (!resultBlob) {
      throw new Error('Keine Daten von Konverter erhalten')
    }

    // Konvertiere Blob zu ArrayBuffer
    const jpegBuffer = await resultBlob.arrayBuffer()

    console.log(`[heic-converter] ✓ Buffer konvertiert: ${(jpegBuffer.byteLength / 1024 / 1024).toFixed(2)} MB`)

    return jpegBuffer
  } catch (error) {
    console.error('[heic-converter] Buffer-Konvertierung fehlgeschlagen:', error)
    throw error
  }
}
