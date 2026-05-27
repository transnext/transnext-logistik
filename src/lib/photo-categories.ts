/**
 * SINGLE SOURCE OF TRUTH FÜR FOTO-KATEGORIEN
 *
 * Diese Datei definiert alle gültigen Foto-Kategorien und stellt sicher,
 * dass Legacy-Werte korrekt auf kanonische IDs gemappt werden.
 *
 * WICHTIG: Bei jeder Änderung muss auch die DB-Enum angepasst werden!
 */

// =====================================================
// KANONISCHE KATEGORIE-IDS (20 Stück)
// =====================================================

/**
 * Die 20 kanonischen Foto-Kategorien.
 * Diese IDs müssen EXAKT mit der DB-Enum `photo_category` übereinstimmen.
 */
export const CANONICAL_CATEGORIES = [
  'tacho',
  'accessories',
  'front',              // Kanonisch für "front_exterior"
  'windshield',
  'left_front',         // Kanonisch für "left_side_front"
  'wheel_fl',           // Kanonisch für "wheel_front_left"
  'mirror_left',
  'interior_front',
  'interior_rear',
  'wheel_rl',           // Kanonisch für "wheel_rear_left"
  'left_rear',          // Kanonisch für "left_side_rear"
  'trunk',              // Kanonisch für "trunk_interior"
  'rear',               // Kanonisch für "rear_exterior"
  'emergency_kit',
  'spare_wheel',
  'right_rear',         // Kanonisch für "right_side_rear"
  'wheel_rr',           // Kanonisch für "wheel_rear_right"
  'wheel_fr',           // Kanonisch für "wheel_front_right"
  'mirror_right',
  'right_front',        // Kanonisch für "right_side_front"
] as const

export type PhotoCategory = typeof CANONICAL_CATEGORIES[number]

// Spezial-Kategorien für Schäden und Sonstiges (nicht in den 20 Pflicht-Kategorien)
export type SpecialCategory = 'damage' | 'other'
export type AllPhotoCategories = PhotoCategory | SpecialCategory

// =====================================================
// LEGACY-MAPPING
// =====================================================

/**
 * Mapping von Legacy-Kategorienamen auf kanonische IDs.
 * Enthält alle bekannten Varianten aus der alten DB und Code.
 */
export const LEGACY_TO_CANONICAL: Record<string, PhotoCategory> = {
  // front_exterior -> front
  'front_exterior': 'front',
  'vorne': 'front',
  'vorderseite': 'front',
  'front_ext': 'front',
  'frontexterior': 'front',

  // rear_exterior -> rear
  'rear_exterior': 'rear',
  'hinten': 'rear',
  'rueckseite': 'rear',
  'rückseite': 'rear',
  'rear_ext': 'rear',
  'rearexterior': 'rear',

  // left_side_front -> left_front
  'left_side_front': 'left_front',
  'leftfront': 'left_front',
  'left_front_side': 'left_front',
  'linksfront': 'left_front',

  // left_side_rear -> left_rear
  'left_side_rear': 'left_rear',
  'leftrear': 'left_rear',
  'left_rear_side': 'left_rear',
  'linkshinten': 'left_rear',

  // right_side_front -> right_front
  'right_side_front': 'right_front',
  'rightfront': 'right_front',
  'right_front_side': 'right_front',
  'rechtsfront': 'right_front',

  // right_side_rear -> right_rear
  'right_side_rear': 'right_rear',
  'rightrear': 'right_rear',
  'right_rear_side': 'right_rear',
  'rechtshinten': 'right_rear',

  // wheel_front_left -> wheel_fl
  'wheel_front_left': 'wheel_fl',
  'wheelfrontleft': 'wheel_fl',
  'rad_vorne_links': 'wheel_fl',
  'radvl': 'wheel_fl',

  // wheel_front_right -> wheel_fr
  'wheel_front_right': 'wheel_fr',
  'wheelfrontright': 'wheel_fr',
  'rad_vorne_rechts': 'wheel_fr',
  'radvr': 'wheel_fr',

  // wheel_rear_left -> wheel_rl
  'wheel_rear_left': 'wheel_rl',
  'wheelrearleft': 'wheel_rl',
  'rad_hinten_links': 'wheel_rl',
  'radhl': 'wheel_rl',

  // wheel_rear_right -> wheel_rr
  'wheel_rear_right': 'wheel_rr',
  'wheelrearright': 'wheel_rr',
  'rad_hinten_rechts': 'wheel_rr',
  'radhr': 'wheel_rr',

  // trunk_interior -> trunk
  'trunk_interior': 'trunk',
  'kofferraum': 'trunk',
  'kofferraum_innen': 'trunk',
  'trunkinterior': 'trunk',

  // Andere Mappings
  'innenraum_vorne': 'interior_front',
  'interiorfront': 'interior_front',
  'innenraum_hinten': 'interior_rear',
  'interiorrear': 'interior_rear',
  'notfallkit': 'emergency_kit',
  'emergencykit': 'emergency_kit',
  'reserverad': 'spare_wheel',
  'sparewheel': 'spare_wheel',
  'windschutzscheibe': 'windshield',
  'frontscheibe': 'windshield',
  'zubehoer': 'accessories',
  'zubehör': 'accessories',
  'spiegel_links': 'mirror_left',
  'mirrorleft': 'mirror_left',
  'spiegel_rechts': 'mirror_right',
  'mirrorright': 'mirror_right',
  'kilometerstand': 'tacho',
  'speedometer': 'tacho',
}

// =====================================================
// KATEGORIE-KONFIGURATION MIT LABELS
// =====================================================

export interface PhotoCategoryConfig {
  id: PhotoCategory
  label: string
  legacyIds: string[]  // Alte IDs die auf diese Kategorie mappen
  required: boolean
  order: number
}

export const PHOTO_CATEGORY_CONFIG: PhotoCategoryConfig[] = [
  { id: 'tacho', label: 'Tacho', legacyIds: ['kilometerstand', 'speedometer'], required: true, order: 1 },
  { id: 'accessories', label: 'Zubehör', legacyIds: ['zubehoer', 'zubehör'], required: true, order: 2 },
  { id: 'front', label: 'Vorderseite', legacyIds: ['front_exterior', 'vorne', 'vorderseite'], required: true, order: 3 },
  { id: 'windshield', label: 'Windschutzscheibe', legacyIds: ['windschutzscheibe', 'frontscheibe'], required: true, order: 4 },
  { id: 'left_front', label: 'Linke Seite vorne', legacyIds: ['left_side_front', 'linksfront'], required: true, order: 5 },
  { id: 'wheel_fl', label: 'Rad vorne links', legacyIds: ['wheel_front_left', 'rad_vorne_links'], required: true, order: 6 },
  { id: 'mirror_left', label: 'Spiegel links', legacyIds: ['spiegel_links'], required: true, order: 7 },
  { id: 'interior_front', label: 'Innenraum vorne', legacyIds: ['innenraum_vorne'], required: true, order: 8 },
  { id: 'interior_rear', label: 'Innenraum hinten', legacyIds: ['innenraum_hinten'], required: true, order: 9 },
  { id: 'wheel_rl', label: 'Rad hinten links', legacyIds: ['wheel_rear_left', 'rad_hinten_links'], required: true, order: 10 },
  { id: 'left_rear', label: 'Linke Seite hinten', legacyIds: ['left_side_rear', 'linkshinten'], required: true, order: 11 },
  { id: 'trunk', label: 'Kofferraum innen', legacyIds: ['trunk_interior', 'kofferraum'], required: true, order: 12 },
  { id: 'rear', label: 'Hinten außen', legacyIds: ['rear_exterior', 'hinten', 'rückseite'], required: true, order: 13 },
  { id: 'emergency_kit', label: 'Notfallkit', legacyIds: ['notfallkit'], required: true, order: 14 },
  { id: 'spare_wheel', label: 'Reserverad', legacyIds: ['reserverad'], required: true, order: 15 },
  { id: 'right_rear', label: 'Rechte Seite hinten', legacyIds: ['right_side_rear', 'rechtshinten'], required: true, order: 16 },
  { id: 'wheel_rr', label: 'Rad hinten rechts', legacyIds: ['wheel_rear_right', 'rad_hinten_rechts'], required: true, order: 17 },
  { id: 'wheel_fr', label: 'Rad vorne rechts', legacyIds: ['wheel_front_right', 'rad_vorne_rechts'], required: true, order: 18 },
  { id: 'mirror_right', label: 'Spiegel rechts', legacyIds: ['spiegel_rechts'], required: true, order: 19 },
  { id: 'right_front', label: 'Rechte Seite vorne', legacyIds: ['right_side_front', 'rechtsfront'], required: true, order: 20 },
]

export const REQUIRED_PHOTO_COUNT = PHOTO_CATEGORY_CONFIG.filter(c => c.required).length

// =====================================================
// NORMALISIERUNGSFUNKTION
// =====================================================

/**
 * Normalisiert einen Kategorie-Input auf die kanonische ID.
 *
 * @param input - Der Input-String (kann Legacy-ID, kanonische ID oder Variante sein)
 * @returns Die kanonische PhotoCategory
 * @throws Error wenn der Input nicht erkannt wird
 *
 * @example
 * normalizePhotoCategory('front_exterior') // => 'front'
 * normalizePhotoCategory('Front') // => 'front'
 * normalizePhotoCategory('WHEEL_FRONT_LEFT') // => 'wheel_fl'
 * normalizePhotoCategory('unknown') // throws Error
 */
export function normalizePhotoCategory(input: string): PhotoCategory {
  if (!input || typeof input !== 'string') {
    throw new Error(`Ungültige Foto-Kategorie: "${input}" (kein String)`)
  }

  // Normalisiere Input: lowercase, trim, keine Leerzeichen
  const normalized = input.toLowerCase().trim().replace(/\s+/g, '_')

  // 1. Prüfe ob bereits kanonische ID
  if ((CANONICAL_CATEGORIES as readonly string[]).includes(normalized)) {
    return normalized as PhotoCategory
  }

  // 2. Prüfe Legacy-Mapping
  if (normalized in LEGACY_TO_CANONICAL) {
    return LEGACY_TO_CANONICAL[normalized]
  }

  // 3. Prüfe ohne Underscores (z.B. "frontexterior" -> "front_exterior" -> "front")
  const withoutUnderscores = normalized.replace(/_/g, '')
  if (withoutUnderscores in LEGACY_TO_CANONICAL) {
    return LEGACY_TO_CANONICAL[withoutUnderscores]
  }

  // 4. Fehler wenn nicht erkannt
  throw new Error(
    `Unbekannte Foto-Kategorie: "${input}". ` +
    `Gültige Kategorien: ${CANONICAL_CATEGORIES.join(', ')}`
  )
}

/**
 * Prüft ob ein Input eine gültige (oder normalisierbare) Kategorie ist.
 * Gibt true zurück wenn normalizePhotoCategory() erfolgreich wäre.
 */
export function isValidPhotoCategory(input: string): boolean {
  try {
    normalizePhotoCategory(input)
    return true
  } catch {
    return false
  }
}

/**
 * Prüft ob eine Kategorie eine Spezial-Kategorie ist (damage/other).
 * Diese werden nicht in den Pflicht-Fotos gezählt.
 */
export function isSpecialCategory(category: string): boolean {
  return category === 'damage' || category === 'other'
}

/**
 * Gibt das Label für eine Kategorie zurück.
 */
export function getCategoryLabel(category: PhotoCategory): string {
  const config = PHOTO_CATEGORY_CONFIG.find(c => c.id === category)
  return config?.label ?? category
}

// =====================================================
// VALIDIERUNG FÜR DB-INSERT
// =====================================================

/**
 * Validiert und normalisiert eine Kategorie VOR dem DB-Insert.
 * Blockt unbekannte Werte mit einem klaren Fehler.
 *
 * @param category - Der zu validierende Kategorie-String
 * @param context - Kontext für bessere Fehlermeldungen (z.B. "Upload für Tour abc123")
 * @returns Die normalisierte kanonische Kategorie
 * @throws Error mit detaillierter Meldung wenn ungültig
 */
export function validateAndNormalize(
  category: string,
  context: string = 'Foto-Upload'
): PhotoCategory {
  try {
    return normalizePhotoCategory(category)
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    throw new Error(`[${context}] Kategorie-Validierung fehlgeschlagen: ${msg}`)
  }
}

// =====================================================
// EXPORT FÜR LEGACY-KOMPATIBILITÄT
// =====================================================

/**
 * @deprecated Verwende PHOTO_CATEGORY_CONFIG stattdessen
 */
export const PHOTO_CATEGORIES = PHOTO_CATEGORY_CONFIG.map(c => ({
  id: c.id,
  label: c.label,
  required: c.required,
  order: c.order,
}))
