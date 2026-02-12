// =====================================================
// PROTOKOLL-TYPEN - Vollständige Übernahme/Abgabe-Logik
// =====================================================

// Enums
export type FuelLevel = 'quarter' | 'half' | 'three_quarter' | 'full'
export type CableStatus = 'present' | 'not_present' | 'not_applicable'
export type RimType = 'steel' | 'aluminum' | 'not_applicable'
export type ProtocolPhase = 'pickup' | 'dropoff'
export type HandoverType = 'recipient_present' | 'recipient_absent' | 'recipient_refused'
export type SignatureRole = 'driver' | 'recipient'

export type DamageType =
  | 'scratch' | 'dent' | 'crack' | 'tear' | 'stain'
  | 'missing_part' | 'malfunction' | 'wear' | 'corrosion' | 'other'

export type DamageComponent =
  // Außen
  | 'front_bumper' | 'rear_bumper' | 'hood' | 'trunk' | 'roof'
  | 'front_left_fender' | 'front_right_fender' | 'rear_left_fender' | 'rear_right_fender'
  | 'front_left_door' | 'front_right_door' | 'rear_left_door' | 'rear_right_door'
  | 'left_mirror' | 'right_mirror' | 'windshield' | 'rear_window'
  | 'front_left_window' | 'front_right_window' | 'rear_left_window' | 'rear_right_window'
  | 'front_left_wheel' | 'front_right_wheel' | 'rear_left_wheel' | 'rear_right_wheel'
  | 'front_left_rim' | 'front_right_rim' | 'rear_left_rim' | 'rear_right_rim'
  | 'headlight_left' | 'headlight_right' | 'taillight_left' | 'taillight_right'
  | 'antenna' | 'grille' | 'license_plate'
  // Innen
  | 'dashboard' | 'steering_wheel' | 'gear_shift' | 'center_console'
  | 'driver_seat' | 'passenger_seat' | 'rear_seats'
  | 'door_panel_left' | 'door_panel_right' | 'headliner'
  | 'floor_mat' | 'carpet' | 'trunk_interior'
  // Sonstiges
  | 'engine' | 'other'

export type PhotoCategory =
  | 'tacho' | 'accessories' | 'engine_bay'
  | 'bumper_front_left' | 'left_side_front' | 'wheel_front_left' | 'mirror_left'
  | 'door_front_left' | 'door_rear_left' | 'interior_rear' | 'wheel_rear_left'
  | 'left_side_rear' | 'bumper_rear_left' | 'trunk_edge' | 'trunk_cover'
  | 'emergency_kit' | 'spare_wheel'
  | 'bumper_rear_right' | 'right_side_rear' | 'wheel_rear_right'
  | 'door_rear_right' | 'door_front_right' | 'wheel_front_right' | 'mirror_right'
  | 'right_side_front' | 'bumper_front_right'
  | 'damage' | 'other'


// =====================================================
// FOTO-KATEGORIEN MIT LABELS
// =====================================================

export interface PhotoCategoryConfig {
  id: PhotoCategory
  label: string
  required: boolean
  order: number
}

export const PHOTO_CATEGORIES: PhotoCategoryConfig[] = [
  { id: 'tacho', label: 'Tacho', required: true, order: 1 },
  { id: 'accessories', label: 'Zubehör', required: true, order: 2 },
  { id: 'engine_bay', label: 'Motorraum inkl. Motorhaube', required: true, order: 3 },
  { id: 'bumper_front_left', label: 'Stoßstange vorne links', required: true, order: 4 },
  { id: 'left_side_front', label: 'Linke Seite vorne (Kennzeichen)', required: true, order: 5 },
  { id: 'wheel_front_left', label: 'Rad vorne links', required: true, order: 6 },
  { id: 'mirror_left', label: 'Spiegel links', required: true, order: 7 },
  { id: 'door_front_left', label: 'Tür vorne links', required: true, order: 8 },
  { id: 'door_rear_left', label: 'Tür hinten links', required: true, order: 9 },
  { id: 'interior_rear', label: 'Innenraum hinten', required: true, order: 10 },
  { id: 'wheel_rear_left', label: 'Rad hinten links', required: true, order: 11 },
  { id: 'left_side_rear', label: 'Linke Seite hinten (Kennzeichen)', required: true, order: 12 },
  { id: 'bumper_rear_left', label: 'Stoßstange hinten links', required: true, order: 13 },
  { id: 'trunk_edge', label: 'Ladekante Kofferraum', required: true, order: 14 },
  { id: 'trunk_cover', label: 'Kofferraumabdeckung', required: true, order: 15 },
  { id: 'emergency_kit', label: 'Notfall-Kit', required: true, order: 16 },
  { id: 'spare_wheel', label: 'Reserverad/Reparaturset', required: true, order: 17 },
  { id: 'bumper_rear_right', label: 'Stoßstange hinten rechts', required: true, order: 18 },
  { id: 'right_side_rear', label: 'Rechte Seite hinten (Kennzeichen)', required: true, order: 19 },
  { id: 'wheel_rear_right', label: 'Rad hinten rechts', required: true, order: 20 },
  { id: 'door_rear_right', label: 'Tür hinten rechts', required: true, order: 21 },
  { id: 'door_front_right', label: 'Tür vorne rechts', required: true, order: 22 },
  { id: 'wheel_front_right', label: 'Rad vorne rechts', required: true, order: 23 },
  { id: 'mirror_right', label: 'Spiegel rechts', required: true, order: 24 },
  { id: 'right_side_front', label: 'Rechte Seite vorne (Kennzeichen)', required: true, order: 25 },
  { id: 'bumper_front_right', label: 'Stoßstange vorne rechts', required: true, order: 26 },
]

export const REQUIRED_PHOTO_COUNT = PHOTO_CATEGORIES.filter(c => c.required).length


// =====================================================
// SCHADEN-TYPEN MIT LABELS
// =====================================================

export const DAMAGE_TYPE_LABELS: Record<DamageType, string> = {
  scratch: 'Kratzer',
  dent: 'Delle',
  crack: 'Riss',
  tear: 'Riss (Stoff)',
  stain: 'Fleck',
  missing_part: 'Fehlendes Teil',
  malfunction: 'Defekt',
  wear: 'Abnutzung',
  corrosion: 'Korrosion',
  other: 'Sonstiges',
}

export const DAMAGE_COMPONENT_LABELS: Record<DamageComponent, string> = {
  // Außen
  front_bumper: 'Stoßstange vorne',
  rear_bumper: 'Stoßstange hinten',
  hood: 'Motorhaube',
  trunk: 'Kofferraum',
  roof: 'Dach',
  front_left_fender: 'Kotflügel vorne links',
  front_right_fender: 'Kotflügel vorne rechts',
  rear_left_fender: 'Kotflügel hinten links',
  rear_right_fender: 'Kotflügel hinten rechts',
  front_left_door: 'Tür vorne links',
  front_right_door: 'Tür vorne rechts',
  rear_left_door: 'Tür hinten links',
  rear_right_door: 'Tür hinten rechts',
  left_mirror: 'Spiegel links',
  right_mirror: 'Spiegel rechts',
  windshield: 'Windschutzscheibe',
  rear_window: 'Heckscheibe',
  front_left_window: 'Fenster vorne links',
  front_right_window: 'Fenster vorne rechts',
  rear_left_window: 'Fenster hinten links',
  rear_right_window: 'Fenster hinten rechts',
  front_left_wheel: 'Rad vorne links',
  front_right_wheel: 'Rad vorne rechts',
  rear_left_wheel: 'Rad hinten links',
  rear_right_wheel: 'Rad hinten rechts',
  front_left_rim: 'Felge vorne links',
  front_right_rim: 'Felge vorne rechts',
  rear_left_rim: 'Felge hinten links',
  rear_right_rim: 'Felge hinten rechts',
  headlight_left: 'Scheinwerfer links',
  headlight_right: 'Scheinwerfer rechts',
  taillight_left: 'Rücklicht links',
  taillight_right: 'Rücklicht rechts',
  antenna: 'Antenne',
  grille: 'Kühlergrill',
  license_plate: 'Kennzeichen',
  // Innen
  dashboard: 'Armaturenbrett',
  steering_wheel: 'Lenkrad',
  gear_shift: 'Schaltknauf',
  center_console: 'Mittelkonsole',
  driver_seat: 'Fahrersitz',
  passenger_seat: 'Beifahrersitz',
  rear_seats: 'Rücksitze',
  door_panel_left: 'Türverkleidung links',
  door_panel_right: 'Türverkleidung rechts',
  headliner: 'Dachhimmel',
  floor_mat: 'Fußmatte',
  carpet: 'Teppich',
  trunk_interior: 'Kofferraum-Innenraum',
  // Sonstiges
  engine: 'Motor',
  other: 'Sonstiges',
}

export const FUEL_LEVEL_LABELS: Record<FuelLevel, string> = {
  quarter: '1/4',
  half: '1/2',
  three_quarter: '3/4',
  full: 'Voll',
}

export const HANDOVER_TYPE_LABELS: Record<HandoverType, string> = {
  recipient_present: 'Empfänger ist vor Ort',
  recipient_absent: 'Empfänger ist nicht vor Ort',
  recipient_refused: 'Empfänger verweigert Unterschrift',
}


// =====================================================
// DATENBANK-INTERFACES
// =====================================================

export interface TourProtocol {
  id: string
  tour_id: string
  phase: ProtocolPhase

  // Zeitstempel
  started_at: string
  completed_at?: string

  // KM-Stand
  km_stand: number

  // Tank/Ladezustand
  fuel_level: FuelLevel

  // Ladekabel
  cable_status: CableStatus

  // Zubehör
  key_count: number
  registration_original: boolean
  service_booklet: boolean
  sd_card_navigation: boolean
  floor_mats: boolean
  license_plates_present: boolean
  radio_with_code: boolean
  hubcaps_present?: boolean
  rim_type: RimType
  antenna_present: boolean
  safety_kit: boolean

  // Schäden Einstiegsfragen
  has_interior_damage: boolean
  has_exterior_damage: boolean

  // Übergabe
  handover_type?: HandoverType
  handover_note?: string
  recipient_name?: string

  // Bestätigung
  confirmed: boolean
  confirmed_at?: string

  // Timestamps
  created_at: string
  updated_at: string

  // Relations (optional)
  photos?: ProtocolPhoto[]
  damages?: ProtocolDamage[]
  signatures?: ProtocolSignature[]
}

export interface ProtocolPhoto {
  id: string
  protocol_id: string
  category: PhotoCategory
  file_url: string
  file_path?: string
  uploaded_at: string
  created_at: string
}

export interface ProtocolDamage {
  id: string
  protocol_id: string
  is_interior: boolean
  damage_type: DamageType
  component: DamageComponent
  description: string
  pre_existing_damage_id?: string
  is_pre_existing: boolean
  created_at: string
  updated_at: string

  // Relations
  photos?: DamagePhoto[]
}

export interface DamagePhoto {
  id: string
  damage_id: string
  file_url: string
  file_path?: string
  uploaded_at: string
  created_at: string
}

export interface ProtocolSignature {
  id: string
  protocol_id: string
  role: SignatureRole
  name?: string
  file_url: string
  file_path?: string
  signed_at: string
  created_at: string
}


// =====================================================
// WIZARD STATE
// =====================================================

export type WizardStep =
  | 'auftragsdaten'
  | 'uebernahme'
  | 'fotos'
  | 'vorschaeden'
  | 'schaeden'
  | 'unterschriften'
  | 'bestaetigung'

export const WIZARD_STEPS: WizardStep[] = [
  'auftragsdaten',
  'uebernahme',
  'fotos',
  'vorschaeden',
  'schaeden',
  'unterschriften',
  'bestaetigung',
]

export const WIZARD_STEP_LABELS: Record<WizardStep, string> = {
  auftragsdaten: 'Auftragsdaten',
  uebernahme: 'Daten',
  fotos: 'Fotos',
  vorschaeden: 'Vorschäden',
  schaeden: 'Schäden',
  unterschriften: 'Unterschriften',
  bestaetigung: 'Bestätigung',
}


// =====================================================
// FORMULAR STATE
// =====================================================

export interface ProtocolFormData {
  // KM & Tank
  km_stand: string
  fuel_level: FuelLevel | ''
  cable_status: CableStatus

  // Zubehör
  key_count: number
  registration_original: boolean
  service_booklet: boolean
  sd_card_navigation: boolean
  floor_mats: boolean
  license_plates_present: boolean
  radio_with_code: boolean
  hubcaps_present: boolean | null
  rim_type: RimType
  antenna_present: boolean
  safety_kit: boolean

  // Fotos (category -> dataUrl)
  photos: Record<PhotoCategory, string>

  // Schäden
  has_interior_damage: boolean | null
  has_exterior_damage: boolean | null
  damages: DamageFormData[]

  // Unterschriften
  driver_signature: string
  handover_type: HandoverType | ''
  recipient_name: string
  recipient_signature: string
  handover_note: string

  // Bestätigung
  confirmed: boolean
}

export interface DamageFormData {
  id: string // temp ID für UI
  is_interior: boolean
  damage_type: DamageType | ''
  component: DamageComponent | ''
  description: string
  photos: string[] // dataUrls
}

export const INITIAL_FORM_DATA: ProtocolFormData = {
  km_stand: '',
  fuel_level: '',
  cable_status: 'not_applicable',

  key_count: 1,
  registration_original: false,
  service_booklet: false,
  sd_card_navigation: false,
  floor_mats: false,
  license_plates_present: false,
  radio_with_code: false,
  hubcaps_present: null,
  rim_type: 'not_applicable',
  antenna_present: false,
  safety_kit: false,

  photos: {} as Record<PhotoCategory, string>,

  has_interior_damage: null,
  has_exterior_damage: null,
  damages: [],

  driver_signature: '',
  handover_type: '',
  recipient_name: '',
  recipient_signature: '',
  handover_note: '',

  confirmed: false,
}


// =====================================================
// VALIDIERUNG
// =====================================================

export interface ValidationResult {
  isValid: boolean
  errors: string[]
}

export function validateProtocolStep(
  step: WizardStep,
  formData: ProtocolFormData,
  isEAuto: boolean
): ValidationResult {
  const errors: string[] = []

  switch (step) {
    case 'auftragsdaten':
      // Read-only, immer valid
      break

    case 'uebernahme':
      if (!formData.km_stand || parseInt(formData.km_stand) < 0) {
        errors.push('KM-Stand ist Pflicht')
      }
      if (!formData.fuel_level) {
        errors.push('Tank/Ladezustand ist Pflicht')
      }
      if (isEAuto && formData.cable_status === 'not_applicable') {
        errors.push('Ladekabel-Status ist bei E-Autos Pflicht')
      }
      break

    case 'fotos':
      const requiredCategories = PHOTO_CATEGORIES.filter(c => c.required)
      for (const cat of requiredCategories) {
        if (!formData.photos[cat.id]) {
          errors.push(`Foto "${cat.label}" fehlt`)
        }
      }
      break

    case 'vorschaeden':
      // Read-only bei Abgabe, keine Validierung nötig
      break

    case 'schaeden':
      // Einstiegsfragen müssen beantwortet sein
      if (formData.has_interior_damage === null) {
        errors.push('Bitte beantworten Sie die Frage zu Innenschäden')
      }
      if (formData.has_exterior_damage === null) {
        errors.push('Bitte beantworten Sie die Frage zu Außenschäden')
      }

      // Wenn Schäden vorhanden, müssen Einträge vollständig sein
      if (formData.has_interior_damage || formData.has_exterior_damage) {
        if (formData.damages.length === 0) {
          errors.push('Mindestens ein Schaden muss erfasst werden')
        }
        for (const damage of formData.damages) {
          if (!damage.damage_type) errors.push('Schadensart ist Pflicht')
          if (!damage.component) errors.push('Bauteil ist Pflicht')
          if (!damage.description.trim()) errors.push('Beschreibung ist Pflicht')
          if (damage.photos.length === 0) errors.push('Mindestens 1 Foto pro Schaden')
        }
      }
      break

    case 'unterschriften':
      if (!formData.driver_signature) {
        errors.push('Fahrer-Unterschrift ist Pflicht')
      }
      if (!formData.handover_type) {
        errors.push('Übergabe-Typ ist Pflicht')
      }
      if (formData.handover_type === 'recipient_present') {
        if (!formData.recipient_name.trim()) {
          errors.push('Empfängername ist Pflicht')
        }
        if (!formData.recipient_signature) {
          errors.push('Empfänger-Unterschrift ist Pflicht')
        }
      }
      if (formData.handover_type === 'recipient_absent' || formData.handover_type === 'recipient_refused') {
        if (!formData.handover_note.trim()) {
          errors.push('Notiz ist Pflicht')
        }
      }
      break

    case 'bestaetigung':
      if (!formData.confirmed) {
        errors.push('Bestätigung ist Pflicht')
      }
      break
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

export function validateAllSteps(
  formData: ProtocolFormData,
  isEAuto: boolean
): ValidationResult {
  const allErrors: string[] = []

  for (const step of WIZARD_STEPS) {
    if (step === 'vorschaeden') continue // Skip für Übernahme
    const result = validateProtocolStep(step, formData, isEAuto)
    allErrors.push(...result.errors)
  }

  return {
    isValid: allErrors.length === 0,
    errors: allErrors,
  }
}
