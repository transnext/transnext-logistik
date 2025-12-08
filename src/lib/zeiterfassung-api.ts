import { supabase } from './supabase'

export interface Zeiterfassung {
  id: number
  user_id: string
  datum: string
  start_zeit: string | null
  ende_zeit: string | null
  pause_minuten: number
  status: 'laufend' | 'pause' | 'beendet'
  created_at: string
  updated_at: string
}

/**
 * Startet einen neuen Arbeitstag
 */
export async function startArbeitstag(): Promise<Zeiterfassung> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Nicht angemeldet')

  const heute = new Date().toISOString().split('T')[0]

  // Prüfe, ob bereits ein Arbeitstag für heute existiert
  const { data: existing } = await supabase
    .from('zeiterfassung')
    .select('*')
    .eq('user_id', user.id)
    .eq('datum', heute)
    .maybeSingle()

  if (existing) {
    throw new Error('Es existiert bereits ein Arbeitstag für heute')
  }

  const { data, error } = await supabase
    .from('zeiterfassung')
    .insert({
      user_id: user.id,
      datum: heute,
      start_zeit: new Date().toISOString(),
      status: 'laufend'
    })
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Startet eine Pause
 */
export async function startPause(id: number): Promise<Zeiterfassung> {
  const { data, error } = await supabase
    .from('zeiterfassung')
    .update({ status: 'pause' })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Beendet eine Pause
 */
export async function endePause(id: number, pauseMinuten: number): Promise<Zeiterfassung> {
  const { data, error } = await supabase
    .from('zeiterfassung')
    .update({
      status: 'laufend',
      pause_minuten: pauseMinuten
    })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Beendet den Arbeitstag
 */
export async function beendeArbeitstag(id: number): Promise<Zeiterfassung> {
  const { data, error } = await supabase
    .from('zeiterfassung')
    .update({
      ende_zeit: new Date().toISOString(),
      status: 'beendet'
    })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Holt die aktuelle Zeiterfassung für heute
 */
export async function getHeutigeZeiterfassung(): Promise<Zeiterfassung | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Nicht angemeldet')

  const heute = new Date().toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('zeiterfassung')
    .select('*')
    .eq('user_id', user.id)
    .eq('datum', heute)
    .maybeSingle()

  if (error) throw error
  return data
}

/**
 * Holt alle Zeiterfassungen eines Fahrers für einen bestimmten Monat
 */
export async function getZeiterfassungByMonth(userId: string, monat: string): Promise<Zeiterfassung[]> {
  const { data, error } = await supabase
    .from('zeiterfassung')
    .select('*')
    .eq('user_id', userId)
    .gte('datum', `${monat}-01`)
    .lte('datum', `${monat}-31`)
    .order('datum', { ascending: false })

  if (error) throw error
  return data || []
}

/**
 * Berechnet die Gesamtarbeitszeit in Stunden für eine Zeiterfassung
 */
export function berechneArbeitszeit(zeiterfassung: Zeiterfassung): number {
  if (!zeiterfassung.start_zeit || !zeiterfassung.ende_zeit) return 0

  const start = new Date(zeiterfassung.start_zeit)
  const ende = new Date(zeiterfassung.ende_zeit)

  const differenzMs = ende.getTime() - start.getTime()
  const stunden = differenzMs / (1000 * 60 * 60)

  // Pausenminuten abziehen
  const pausenStunden = zeiterfassung.pause_minuten / 60

  return Math.max(0, stunden - pausenStunden)
}

/**
 * Berechnet die Vergütung basierend auf Stundenlohn
 */
export function berechneVerguetung(arbeitszeit: number, stundenlohn = 12.82): number {
  return arbeitszeit * stundenlohn
}
