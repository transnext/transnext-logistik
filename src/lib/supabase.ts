import { createClient } from '@supabase/supabase-js'

// Fallback für Build-Zeit (wenn Umgebungsvariablen nicht verfügbar sind)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// TypeScript types for database schema
export interface Profile {
  id: string
  role: 'fahrer' | 'admin' | 'disponent'
  full_name: string
  zeitmodell?: 'minijob' | 'werkstudent' | 'teilzeit' | 'vollzeit'
  festes_gehalt?: number
  created_at: string
  updated_at: string
}

export interface Fahrer {
  id: string
  user_id: string
  vorname: string
  nachname: string
  geburtsdatum: string
  adresse: string
  plz: string
  ort: string
  fuehrerschein_nr: string
  fuehrerschein_datum: string
  ausstellende_behoerde: string
  fuehrerscheinklassen: string[]
  ausweisnummer: string
  ausweis_ablauf: string
  status: 'aktiv' | 'inaktiv'
  created_at: string
  updated_at: string
}

export interface Arbeitsnachweis {
  id: number
  user_id: string
  tour_nr: string
  datum: string
  gefahrene_km: number
  wartezeit: '30-60' | '60-90' | '90-120' | 'keine'
  beleg_url?: string
  status: 'pending' | 'approved' | 'rejected' | 'billed'
  ist_ruecklaufer?: boolean
  auftraggeber?: 'onlogist' | 'smartandcare'
  created_at: string
  updated_at: string
}

export interface Auslagennachweis {
  id: number
  user_id: string
  tour_nr: string
  kennzeichen: string
  datum: string
  startort: string
  zielort: string
  belegart: 'tankbeleg' | 'waschbeleg' | 'bahnticket' | 'bc50' | 'taxi' | 'uber'
  kosten: number
  beleg_url?: string
  status: 'pending' | 'approved' | 'rejected' | 'paid' | 'billed'
  created_at: string
  updated_at: string
}

export interface Monatsueberschuss {
  id: number
  user_id: string
  monat: string // Format: "2024-11"
  ueberschuss: number
  notiz?: string
  created_at: string
  updated_at: string
}

// =====================================================
// TOUREN (Neues Touren-Modul)
// =====================================================

export type TourStatus = 'neu' | 'uebernahme_offen' | 'unterwegs' | 'abgabe_offen' | 'abgeschlossen'
export type Fahrzeugart = 'pkw' | 'e-auto' | 'transporter'

export interface Tour {
  id: string
  tour_nummer: number

  // Fahrzeugdaten
  fahrzeugart: Fahrzeugart
  kennzeichen: string
  fin: string // 17 Zeichen

  // Abholort
  abholort_name: string
  abholort_strasse: string
  abholort_plz: string
  abholort_ort: string
  abholort_ansprechpartner_name: string
  abholort_ansprechpartner_telefon: string

  // Abgabeort
  abgabeort_name: string
  abgabeort_strasse: string
  abgabeort_plz: string
  abgabeort_ort: string
  abgabeort_ansprechpartner_name: string
  abgabeort_ansprechpartner_telefon: string

  // Zeiten
  abholzeit_ab?: string
  abgabezeit_bis?: string

  // Sonstige Felder
  hinweise?: string
  distance_km?: number

  // Fahrerzuweisung
  fahrer_id?: string

  // Status
  status: TourStatus

  // Übernahme-Protokoll
  uebernahme_zeitpunkt?: string
  uebernahme_km_stand?: number
  uebernahme_fotos?: string[]
  uebernahme_unterschrift_url?: string

  // Abgabe-Protokoll
  abgabe_zeitpunkt?: string
  abgabe_km_stand?: number
  abgabe_fotos?: string[]
  abgabe_unterschrift_url?: string

  // Timestamps
  created_at: string
  updated_at: string

  // Joined data (optional)
  fahrer?: {
    vorname: string
    nachname: string
  }
}
