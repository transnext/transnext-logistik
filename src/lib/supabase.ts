import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// TypeScript types for database schema
export interface Profile {
  id: string
  role: 'fahrer' | 'admin'
  full_name: string
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
  status: 'pending' | 'approved' | 'rejected' | 'paid'
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
