import { supabase } from './supabase'
import type { Arbeitsnachweis, Auslagennachweis, Fahrer } from './supabase'
import { calculateTourVerdienst } from './salary-calculator'
import { calculateCustomerTotal } from './customer-pricing'

// =====================================================
// ADMIN - USER MANAGEMENT
// =====================================================

/**
 * Erstellt einen neuen Fahrer mit Supabase Edge Function
 * (verwendet SERVICE_ROLE_KEY serverseitig)
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
  // Rufe Supabase Edge Function auf (läuft mit SERVICE_ROLE_KEY)
  const { data: result, error } = await supabase.functions.invoke('create-fahrer', {
    body: data
  })

  if (error) throw error
  if (!result || !result.success) {
    throw new Error(result?.error || 'Fehler beim Erstellen des Fahrers')
  }

  return {
    user: result.user,
    fahrer: result.fahrer as Fahrer
  }
}

/**
 * Aktualisiert Fahrer-Daten (ohne Email/Passwort)
 */
export async function updateFahrer(fahrerId: number, data: {
  vorname?: string
  nachname?: string
  geburtsdatum?: string
  adresse?: string
  plz?: string
  ort?: string
  fuehrerschein_nr?: string
  fuehrerschein_datum?: string
  ausstellende_behoerde?: string
  fuehrerscheinklassen?: string[]
  ausweisnummer?: string
  ausweis_ablauf?: string
  status?: 'aktiv' | 'inaktiv'
}) {
  const { data: result, error } = await supabase
    .from('fahrer')
    .update(data)
    .eq('id', fahrerId)
    .select()
    .single()

  if (error) throw error
  return result as Fahrer
}

/**
 * Ändert Fahrer-Status (aktiv/inaktiv)
 */
export async function updateFahrerStatus(fahrerId: string, status: 'aktiv' | 'inaktiv') {
  return updateFahrer(Number.parseInt(fahrerId), { status })
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
    supabase.from('arbeitsnachweise').select('status, gefahrene_km, wartezeit, datum'),
    supabase.from('auslagennachweise').select('status, kosten'),
    supabase.from('fahrer').select('status'),
  ])

  if (arbeitsnachweiseData.error) throw arbeitsnachweiseData.error
  if (auslagennachweiseData.error) throw auslagennachweiseData.error
  if (fahrerData.error) throw fahrerData.error

  const arbeitsnachweise = arbeitsnachweiseData.data
  const auslagennachweise = auslagennachweiseData.data
  const fahrer = fahrerData.data

  // Aktueller Monat
  const now = new Date()
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  // Touren des aktuellen Monats
  const currentMonthTouren = arbeitsnachweise.filter(t => t.datum.startsWith(currentMonth))

  // Gesamtlohn genehmigte Touren (approved + billed)
  const approvedTouren = arbeitsnachweise.filter(t => t.status === 'approved')
  const approvedAndBilledTouren = arbeitsnachweise.filter(t => t.status === 'approved' || t.status === 'billed')
  const gesamtlohnGenehmigt = approvedAndBilledTouren.reduce((sum, t) => {
    return sum + calculateTourVerdienst(t.gefahrene_km || 0, t.wartezeit)
  }, 0)

  // Monatsumsatz (alle Touren des Monats mit Kunden-Preisen)
  const monatsumsatz = currentMonthTouren.reduce((sum, t) => {
    return sum + calculateCustomerTotal(t.gefahrene_km || 0, t.wartezeit)
  }, 0)

  return {
    // Touren
    totalTouren: arbeitsnachweise.length,
    pendingTouren: arbeitsnachweise.filter(t => t.status === 'pending').length,
    approvedTouren: approvedTouren.length,
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

    // NEU: Lohn & Umsatz
    gesamtlohnGenehmigt: gesamtlohnGenehmigt,
    monatsumsatz: monatsumsatz,
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

// TOUR MANAGEMENT
export async function deleteTour(tourId: number) {
  const { error } = await supabase
    .from('arbeitsnachweise')
    .delete()
    .eq('id', tourId)
  if (error) throw error
  return { success: true }
}

export async function billMultipleTours(tourIds: number[]) {
  const { data, error } = await supabase
    .from('arbeitsnachweise')
    .update({ status: 'billed' })
    .in('id', tourIds)
    .select()
  if (error) throw error
  return { success: true, count: tourIds.length, data }
}

// AUSLAGEN MANAGEMENT
export async function deleteAuslage(auslagenId: number) {
  const { error } = await supabase
    .from('auslagennachweise')
    .delete()
    .eq('id', auslagenId)
  if (error) throw error
  return { success: true }
}

export async function billMultipleAuslagen(auslagenIds: number[]) {
  const { data, error } = await supabase
    .from('auslagennachweise')
    .update({ status: 'billed' })
    .in('id', auslagenIds)
    .select()
  if (error) throw error
  return { success: true, count: auslagenIds.length, data }
}

// RÜCKLÄUFER MANAGEMENT
export async function markTourAsRuecklaufer(tourId: number, isRuecklaufer: boolean) {
  const { data, error } = await supabase
    .from('arbeitsnachweise')
    .update({ ist_ruecklaufer: isRuecklaufer })
    .eq('id', tourId)
    .select()
  if (error) throw error
  return { success: true, data }
}

// MONATLICHER ÜBERSCHUSS MANAGEMENT
export async function setMonatsueberschuss(userId: string, monat: string, ueberschuss: number, notiz?: string) {
  const { data, error } = await supabase
    .from('monatsueberschuss')
    .upsert({
      user_id: userId,
      monat: monat,
      ueberschuss: ueberschuss,
      notiz: notiz
    }, {
      onConflict: 'user_id,monat'
    })
    .select()
  if (error) throw error
  return { success: true, data }
}

export async function getMonatsueberschuss(userId: string, monat: string) {
  const { data, error } = await supabase
    .from('monatsueberschuss')
    .select('*')
    .eq('user_id', userId)
    .eq('monat', monat)
    .single()

  if (error && error.code !== 'PGRST116') throw error // PGRST116 = nicht gefunden
  return data || null
}
