import { supabase } from './supabase'
import type { Arbeitsnachweis, Auslagennachweis, Fahrer } from './supabase'

// =====================================================
// ADMIN - USER MANAGEMENT
// =====================================================

/**
 * Erstellt einen neuen Fahrer mit Supabase Auth
 */
export async function createFahrer(data: {
  email: string
  password: string
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
}) {
  // 1. Erstelle Auth-User über Supabase Auth API
  // NOTE: Admin functions werden nur zur Laufzeit aufgerufen
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
    options: {
      data: {
        role: 'fahrer',
        full_name: `${data.vorname} ${data.nachname}`,
      },
    },
  })

  if (authError) throw authError
  if (!authData.user) throw new Error('Benutzer konnte nicht erstellt werden')

  try {
    // 2. Erstelle Profil
    const { error: profileError } = await supabase
      .from('profiles')
      .insert([{
        id: authData.user.id,
        role: 'fahrer',
        full_name: `${data.vorname} ${data.nachname}`,
      }])

    if (profileError) throw profileError

    // 3. Erstelle Fahrer-Eintrag
    const { data: fahrerData, error: fahrerError } = await supabase
      .from('fahrer')
      .insert([{
        user_id: authData.user.id,
        vorname: data.vorname,
        nachname: data.nachname,
        geburtsdatum: data.geburtsdatum,
        adresse: data.adresse,
        plz: data.plz,
        ort: data.ort,
        fuehrerschein_nr: data.fuehrerschein_nr,
        fuehrerschein_datum: data.fuehrerschein_datum,
        ausstellende_behoerde: data.ausstellende_behoerde,
        fuehrerscheinklassen: data.fuehrerscheinklassen,
        ausweisnummer: data.ausweisnummer,
        ausweis_ablauf: data.ausweis_ablauf,
        status: 'aktiv',
      }])
      .select()
      .single()

    if (fahrerError) throw fahrerError

    return {
      user: authData.user,
      fahrer: fahrerData as Fahrer
    }
  } catch (error) {
    // Cleanup: Lösche Auth-User wenn Fahrer-Erstellung fehlschlägt
    await supabase.auth.admin.deleteUser(authData.user.id)
    throw error
  }
}

/**
 * Ändert Fahrer-Status (aktiv/inaktiv)
 */
export async function updateFahrerStatus(fahrerId: string, status: 'aktiv' | 'inaktiv') {
  const { data, error } = await supabase
    .from('fahrer')
    .update({ status })
    .eq('id', fahrerId)
    .select()
    .single()

  if (error) throw error
  return data as Fahrer
}

// =====================================================
// ADMIN - ALLE DATEN ABRUFEN
// =====================================================

/**
 * Lädt alle Arbeitsnachweise mit Fahrer-Informationen
 */
export async function getAllArbeitsnachweiseAdmin() {
  const { data, error } = await supabase
    .from('arbeitsnachweise')
    .select(`
      *,
      profiles!arbeitsnachweise_user_id_fkey (
        full_name
      )
    `)
    .order('datum', { ascending: false })

  if (error) throw error

  return data.map(item => ({
    ...item,
    fahrer_name: item.profiles?.full_name || 'Unbekannt'
  }))
}

/**
 * Lädt alle Auslagennachweise mit Fahrer-Informationen
 */
export async function getAllAuslagennachweiseAdmin() {
  const { data, error } = await supabase
    .from('auslagennachweise')
    .select(`
      *,
      profiles!auslagennachweise_user_id_fkey (
        full_name
      )
    `)
    .order('datum', { ascending: false })

  if (error) throw error

  return data.map(item => ({
    ...item,
    fahrer_name: item.profiles?.full_name || 'Unbekannt'
  }))
}

/**
 * Lädt alle Fahrer mit Profil-Informationen
 */
export async function getAllFahrerAdmin() {
  const { data, error } = await supabase
    .from('fahrer')
    .select(`
      *,
      profiles!fahrer_user_id_fkey (
        full_name
      )
    `)
    .order('nachname', { ascending: true })

  if (error) throw error
  return data
}

// =====================================================
// ADMIN - STATISTIKEN
// =====================================================

export async function getAdminStatistics() {
  const [arbeitsnachweiseData, auslagennachweiseData, fahrerData] = await Promise.all([
    supabase.from('arbeitsnachweise').select('status, gefahrene_km'),
    supabase.from('auslagennachweise').select('status, kosten'),
    supabase.from('fahrer').select('status'),
  ])

  if (arbeitsnachweiseData.error) throw arbeitsnachweiseData.error
  if (auslagennachweiseData.error) throw auslagennachweiseData.error
  if (fahrerData.error) throw fahrerData.error

  const arbeitsnachweise = arbeitsnachweiseData.data
  const auslagennachweise = auslagennachweiseData.data
  const fahrer = fahrerData.data

  return {
    // Touren
    totalTouren: arbeitsnachweise.length,
    pendingTouren: arbeitsnachweise.filter(t => t.status === 'pending').length,
    approvedTouren: arbeitsnachweise.filter(t => t.status === 'approved').length,
    billedTouren: arbeitsnachweise.filter(t => t.status === 'billed').length,
    rejectedTouren: arbeitsnachweise.filter(t => t.status === 'rejected').length,
    totalKilometers: arbeitsnachweise.reduce((sum, t) => sum + (t.gefahrene_km || 0), 0),

    // Auslagen
    totalAuslagen: auslagennachweise.length,
    pendingAuslagen: auslagennachweise.filter(e => e.status === 'pending').length,
    approvedAuslagen: auslagennachweise.filter(e => e.status === 'approved').length,
    paidAuslagen: auslagennachweise.filter(e => e.status === 'paid').length,
    rejectedAuslagen: auslagennachweise.filter(e => e.status === 'rejected').length,
    openAuslagenAmount: auslagennachweise
      .filter(e => e.status !== 'paid')
      .reduce((sum, e) => sum + (e.kosten || 0), 0),
    paidAuslagenAmount: auslagennachweise
      .filter(e => e.status === 'paid')
      .reduce((sum, e) => sum + (e.kosten || 0), 0),

    // Fahrer
    totalFahrer: fahrer.length,
    activeFahrer: fahrer.filter(f => f.status === 'aktiv').length,
    inactiveFahrer: fahrer.filter(f => f.status === 'inaktiv').length,
  }
}

// =====================================================
// ADMIN - KW EXPORT
// =====================================================

/**
 * Lädt Touren für eine bestimmte Kalenderwoche
 */
export async function getTourenByKW(year: number, week: number) {
  // Berechne Start- und Enddatum der KW
  const startDate = getDateOfISOWeek(week, year)
  const endDate = new Date(startDate)
  endDate.setDate(endDate.getDate() + 6)

  const { data, error } = await supabase
    .from('arbeitsnachweise')
    .select(`
      *,
      profiles!arbeitsnachweise_user_id_fkey (
        full_name
      )
    `)
    .gte('datum', startDate.toISOString().split('T')[0])
    .lte('datum', endDate.toISOString().split('T')[0])
    .order('datum', { ascending: true })

  if (error) throw error

  return data.map(item => ({
    ...item,
    fahrer_name: item.profiles?.full_name || 'Unbekannt'
  }))
}

// Helper: Berechne Start der KW
function getDateOfISOWeek(week: number, year: number): Date {
  const simple = new Date(year, 0, 1 + (week - 1) * 7)
  const dow = simple.getDay()
  const ISOweekStart = simple
  if (dow <= 4)
    ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1)
  else
    ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay())
  return ISOweekStart
}

// =====================================================
// ADMIN - BULK OPERATIONS
// =====================================================

/**
 * Ändert Status mehrerer Touren gleichzeitig
 */
export async function bulkUpdateTourenStatus(
  tourIds: number[],
  status: 'pending' | 'approved' | 'rejected' | 'billed'
) {
  const { data, error } = await supabase
    .from('arbeitsnachweise')
    .update({ status })
    .in('id', tourIds)
    .select()

  if (error) throw error
  return data
}

/**
 * Ändert Status mehrerer Auslagen gleichzeitig
 */
export async function bulkUpdateAuslagenStatus(
  auslagenIds: number[],
  status: 'pending' | 'approved' | 'rejected' | 'paid'
) {
  const { data, error } = await supabase
    .from('auslagennachweise')
    .update({ status })
    .in('id', auslagenIds)
    .select()

  if (error) throw error
  return data
}
