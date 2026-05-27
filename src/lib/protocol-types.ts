// Re-export Photo-Kategorien aus Single Source of Truth
export { type PhotoCategory, type AllPhotoCategories, type PhotoCategoryConfig, PHOTO_CATEGORIES, REQUIRED_PHOTO_COUNT, normalizePhotoCategory } from './photo-categories'
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

// Art der Bereifung
export type TireType = 'winter' | 'summer' | 'allseason'
export const TIRE_TYPE_LABELS: Record<TireType, string> = {
  winter: 'Winterreifen',
  summer: 'Sommerreifen',
  allseason: 'M+S',
}
// Schlüsselanzahl Optionen
export const KEY_COUNT_OPTIONS = [1, 2, 3, 4, '4+'] as const
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

// Import PhotoCategory type for usage
import type { PhotoCategory } from './photo-categories'

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
// Alle möglichen Schritte (für Referenz)
export const WIZARD_STEPS: WizardStep[] = [
  'auftragsdaten',
  'uebernahme',
  'fotos',
  'vorschaeden',
  'schaeden',
  'unterschriften',
  'bestaetigung',
]
// Übernahme-Schritte (ohne Vorschäden)
export const WIZARD_STEPS_PICKUP: WizardStep[] = [
  'auftragsdaten',
  'uebernahme',
  'fotos',
  'schaeden',
  'unterschriften',
  'bestaetigung',
]
// Abgabe-Schritte (mit Vorschäden read-only)
export const WIZARD_STEPS_DROPOFF: WizardStep[] = [
  'auftragsdaten',
  'uebernahme',
  'fotos',
  'vorschaeden',
  'schaeden',
  'unterschriften',
  'bestaetigung',
]
// Funktion um Steps basierend auf Phase zu bekommen
export function getWizardStepsForPhase(phase: ProtocolPhase): WizardStep[] {
  return phase === 'pickup' ? WIZARD_STEPS_PICKUP : WIZARD_STEPS_DROPOFF
}
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
  key_count: number | string  // 1, 2, 3, 4, '4+'
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
  tire_type: TireType | ''  // Pflichtfeld: Art der Bereifung
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
  tire_type: '',  // Art der Bereifung - Pflichtfeld
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
  isEAuto: boolean,
  phase?: ProtocolPhase
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
        errors.push('Tank-/Ladezustand ist Pflicht')
      }
      if (isEAuto && formData.cable_status === 'not_applicable') {
        // E-Auto braucht Cable Status
      }
      if (!formData.tire_type) {
        errors.push('Art der Bereifung ist Pflicht')
      }
      break
    case 'fotos':
      // Validierung erfolgt in der Photo-Komponente
      break
    case 'vorschaeden':
      // Read-only bei Abgabe
      break
    case 'schaeden':
      if (formData.has_interior_damage === null) {
        errors.push('Bitte angeben ob Innenschäden vorhanden sind')
      }
      if (formData.has_exterior_damage === null) {
        errors.push('Bitte angeben ob Außenschäden vorhanden sind')
      }
      // Wenn Schäden vorhanden, müssen sie dokumentiert sein
      if (formData.has_interior_damage || formData.has_exterior_damage) {
        const hasDamages = formData.damages.length > 0
        if (!hasDamages) {
          errors.push('Bitte dokumentieren Sie die angegebenen Schäden')
        }
      }
      break
    case 'unterschriften':
      if (!formData.driver_signature) {
        errors.push('Fahrer-Unterschrift ist Pflicht')
      }
      if (!formData.handover_type) {
        errors.push('Übergabeart ist Pflicht')
      }
      if (formData.handover_type === 'recipient_present' && !formData.recipient_signature) {
        errors.push('Empfänger-Unterschrift ist Pflicht wenn vor Ort')
      }
      break
    case 'bestaetigung':
      if (!formData.confirmed) {
        errors.push('Bitte bestätigen Sie das Protokoll')
      }
      break
  }
  return {
    isValid: errors.length === 0,
    errors,
  }
}
