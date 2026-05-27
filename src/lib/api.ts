import { supabase } from './supabase'
import type { Arbeitsnachweis, Auslagennachweis, Fahrer, Profile } from './supabase'

// =====================================================
// AUTHENTICATION (Supabase Auth)
// =====================================================

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) throw error
  return data
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function getUserProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (error) throw error
  return data as Profile
}

// =====================================================
// ARBEITSNACHWEISE (Tours)
// =====================================================

export async function createArbeitsnachweis(data: {
  tour_nr: string
  datum: string
  gefahrene_km: number
  wartezeit: '30-60' | '60-90' | '90-120' | 'keine'
  beleg_url?: string
  auftraggeber: 'onlogist' | 'smartandcare'
  ist_ruecklaufer?: boolean
}) {
  const user = await getCurrentUser()
  if (!user) throw new Error('Nicht angemeldet')


  const { data: result, error } = await supabase
    .from('arbeitsnachweise')
    .insert([{
      user_id: user.id,
      ...data,
    }])
    .select()
    .single()

  if (error) {
    console.error('[API] createArbeitsnachweis Fehler:', error)
    console.error('[API] Fehler-Code:', error.code)
    console.error('[API] Fehler-Message:', error.message)
    console.error('[API] Fehler-Details:', error.details)
    console.error('[API] Fehler-Hint:', error.hint)

    // Benutzerfreundliche Fehlermeldungen
    if (error.code === '42501' || error.message?.includes('row-level security') || error.message?.includes('policy')) {
      // Detaillierte Diagnose-Info im Fehler
      throw new Error(`Keine Berechtigung zum Erstellen (Code: ${error.code}). User-ID: ${user.id}, Role: siehe Console. Bitte erneut anmelden oder Support kontaktieren.`)
    } else if (error.code === '23505' || error.message?.includes('duplicate')) {
      throw new Error('Ein Arbeitsnachweis für diese Tour existiert bereits.')
    } else if (error.code === '23503' || error.message?.includes('foreign key')) {
      throw new Error('Ungültige Referenzdaten. Bitte Eingaben prüfen.')
    } else if (error.code === '23514' || error.message?.includes('check constraint')) {
      throw new Error('Ungültige Werte. Bitte alle Felder korrekt ausfüllen.')
    }
    throw new Error(`Speichern fehlgeschlagen: ${error.message || 'Unbekannter Fehler'}`)
  }

  return result as Arbeitsnachweis
}

/**
 * Lädt Arbeitsnachweise für einen Fahrer.
 *
 * Für reguläre Fahrer (role='fahrer'):
 * - Nutzt View arbeitsnachweise_fahrer (versteckt Finanzfelder, filtert via is_driver())
 *
 * Für Admin/GF mit Fahrer-Datensatz (z.B. Burak Aydin):
 * - is_driver() gibt false zurück (da role != 'fahrer')
 * - Nutzt daher Basistabelle mit explizitem user_id-Filter
 * - Finanzfelder werden im Select ausgelassen
 *
 * @param userId - Auth-User-ID des Fahrers
 * @param userRole - Optional: Rolle des Users (wenn bekannt, spart DB-Abfrage)
 */
export async function getArbeitsnachweiseByUser(userId: string, userRole?: string) {
  // Wenn Rolle nicht übergeben, aus Profil laden
  let role = userRole
  if (!role) {
    try {
      const profile = await getUserProfile(userId)
      role = profile?.role || 'fahrer'
    } catch {
      role = 'fahrer' // Fallback
    }
  }

  // Admin/GF: Basistabelle direkt nutzen (is_driver() gibt false, aber is_admin() true)
  // Expliziter user_id-Filter, Finanzfelder ausgelassen für Konsistenz
  if (role === 'admin' || role === 'gf') {
    const { data, error } = await supabase
      .from('arbeitsnachweise')
      .select(`
        id,
        user_id,
        tour_nr,
        datum,
        gefahrene_km,
        wartezeit,
        waiting_units,
        is_return,
        ist_ruecklaufer,
        auftraggeber,
        status,
        beleg_url,
        created_at,
        updated_at
      `)
      .eq('user_id', userId)
      .order('datum', { ascending: false })
    if (error) throw error
    return data as unknown as Arbeitsnachweis[]
  }

  // Reguläre Fahrer: View nutzen (filtert via RLS + is_driver())
  const { data, error } = await supabase
    .from('arbeitsnachweise_fahrer')
    .select('*')
    .order('datum', { ascending: false })
  if (error) throw error
  return data as Arbeitsnachweis[]
}

export async function getAllArbeitsnachweise() {
  const { data, error } = await supabase
    .from('arbeitsnachweise')
    .select(`
      *,
      profiles!arbeitsnachweise_user_id_fkey (full_name)
    `)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

export async function updateArbeitsnachweisStatus(
  id: number,
  status: 'pending' | 'approved' | 'rejected' | 'billed'
) {
  const { data, error } = await supabase
    .from('arbeitsnachweise')
    .update({ status })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as Arbeitsnachweis
}

// =====================================================
// AUSLAGENNACHWEISE (Expenses)
// =====================================================

export async function createAuslagennachweis(data: {
  tour_nr: string
  kennzeichen: string
  datum: string
  startort: string
  zielort: string
  belegart: 'tankbeleg' | 'waschbeleg' | 'bahnticket' | 'bc50' | 'taxi' | 'uber'
  kosten: number
  beleg_url?: string
  ist_tankkarte?: boolean
}) {
  const user = await getCurrentUser()
  if (!user) throw new Error('Nicht angemeldet')

  // Wenn Tankkarte genutzt wurde, Status auf 'tankcard' setzen (keine Erstattung)
  const status = data.ist_tankkarte ? 'tankcard' : 'pending'

  const { data: result, error } = await supabase
    .from('auslagennachweise')
    .insert([{
      user_id: user.id,
      tour_nr: data.tour_nr,
      kennzeichen: data.kennzeichen,
      datum: data.datum,
      startort: data.startort,
      zielort: data.zielort,
      belegart: data.belegart,
      kosten: data.kosten,
      beleg_url: data.beleg_url,
      status: status,
    }])
    .select()
    .single()

  if (error) throw error
  return result as Auslagennachweis
}

/**
 * Lädt Auslagennachweise für einen Fahrer über die sichere Fahrer-View.
 * Die View filtert automatisch auf eigene Daten und versteckt Kundenabrechnungsfelder.
 */
export async function getAuslagennachweiseByUser(userId: string) {
  // Fahrer nutzt View auslagennachweise_fahrer (versteckt Kundenabrechnungsfelder, filtert auf eigene Daten)
  const { data, error } = await supabase
    .from('auslagennachweise_fahrer')
    .select('*')
    .order('datum', { ascending: false })

  if (error) throw error
  return data as Auslagennachweis[]
}

export async function getAllAuslagennachweise() {
  const { data, error } = await supabase
    .from('auslagennachweise')
    .select(`
      *,
      profiles!auslagennachweise_user_id_fkey (full_name)
    `)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

export async function updateAuslagennachweisStatus(
  id: number,
  status: 'pending' | 'approved' | 'rejected' | 'paid'
) {
  const { data, error } = await supabase
    .from('auslagennachweise')
    .update({ status })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as Auslagennachweis
}

// =====================================================
// FAHRER (Driver Management)
// =====================================================

export async function getFahrerByUserId(userId: string) {
  const { data, error } = await supabase
    .from('fahrer')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error) throw error
  return data as Fahrer
}

export async function getAllFahrer() {
  const { data, error } = await supabase
    .from('fahrer')
    .select(`
      *,
      profiles!fahrer_user_id_fkey (full_name)
    `)
    .eq('status', 'aktiv')
    .order('nachname')

  if (error) throw error
  return data
}

// =====================================================
// STATISTICS (Admin Dashboard)
// =====================================================

export async function getStatistics() {
  const [arbeitsnachweiseData, auslagennachweiseData] = await Promise.all([
    supabase.from('arbeitsnachweise').select('status, gefahrene_km'),
    supabase.from('auslagennachweise').select('status, kosten'),
  ])

  if (arbeitsnachweiseData.error) throw arbeitsnachweiseData.error
  if (auslagennachweiseData.error) throw auslagennachweiseData.error

  const arbeitsnachweise = arbeitsnachweiseData.data
  const auslagennachweise = auslagennachweiseData.data

  return {
    totalTours: arbeitsnachweise.length,
    pendingTours: arbeitsnachweise.filter(t => t.status === 'pending').length,
    approvedTours: arbeitsnachweise.filter(t => t.status === 'approved').length,
    billedTours: arbeitsnachweise.filter(t => t.status === 'billed').length,
    totalKilometers: arbeitsnachweise.reduce((sum, t) => sum + (t.gefahrene_km || 0), 0),

    totalExpenses: auslagennachweise.length,
    pendingExpenses: auslagennachweise.filter(e => e.status === 'pending').length,
    openExpensesAmount: auslagennachweise
      .filter(e => e.status !== 'paid')
      .reduce((sum, e) => sum + (e.kosten || 0), 0),
    paidExpensesAmount: auslagennachweise
      .filter(e => e.status === 'paid')
      .reduce((sum, e) => sum + (e.kosten || 0), 0),
  }
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

export function formatWartezeit(wartezeit: string): string {
  const mapping: Record<string, string> = {
    '30-60': '30-60 Min.',
    '60-90': '60-90 Min.',
    '90-120': '90-120 Min.',
    'keine': 'Keine',
  }
  return mapping[wartezeit] || wartezeit
}

export function formatBelegart(belegart: string): string {
  const mapping: Record<string, string> = {
    'tankbeleg': 'Tankbeleg',
    'waschbeleg': 'Waschbeleg',
    'bahnticket': 'Bahnticket',
    'bc50': 'BC50',
    'taxi': 'Taxi',
    'uber': 'Uber',
  }
  return mapping[belegart] || belegart
}

export function formatStatus(status: string): string {
  const mapping: Record<string, string> = {
    'pending': 'Ausstehend',
    'approved': 'Genehmigt',
    'rejected': 'Abgelehnt',
    'billed': 'Abgerechnet',
    'paid': 'Überwiesen',
  }
  return mapping[status] || status
}

// =====================================================
// FAHRERPORTAL ACCESS CHECK
// =====================================================

/**
 * Lädt Fahrer-Datensatz für einen User (ohne Fehler zu werfen wenn nicht vorhanden)
 */
export async function getFahrerByUserIdSafe(userId: string): Promise<Fahrer | null> {
  const { data, error } = await supabase
    .from('fahrer')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error) {
    // PGRST116 = not found - das ist kein echter Fehler
    if (error.code === 'PGRST116') return null
    console.error('Fehler beim Laden des Fahrer-Datensatzes:', error)
    return null
  }
  return data as Fahrer
}

/**
 * Prüft, ob ein User Zugriff auf das Fahrerportal hat.
 *
 * Erlaubt wenn:
 * - role === 'fahrer' UND Fahrer ist aktiv UND nicht archiviert
 * - ODER role === 'admin' oder 'gf' UND es existiert ein verknüpfter aktiver, nicht archivierter fahrer-Datensatz
 *
 * Nicht erlaubt:
 * - Deaktivierter Fahrer (status = 'inaktiv')
 * - Archivierter Fahrer (archived_at != null)
 * - Disponent ohne Fahrer-Datensatz
 * - Admin/GF ohne Fahrer-Datensatz
 * - HR/andere Rollen
 */
export async function canAccessFahrerportal(userId: string): Promise<{
  canAccess: boolean
  reason: string
  fahrer: Fahrer | null
  profile: Profile | null
  role: string
}> {
  // Profile laden
  const profile = await getUserProfile(userId)
  if (!profile) {
    return { canAccess: false, reason: 'Kein Profil gefunden', fahrer: null, profile: null, role: '' }
  }

  const role = profile.role as string

  // Fahrer-Rolle: Prüfe ob Fahrer aktiv und nicht archiviert
  if (role === 'fahrer') {
    const fahrer = await getFahrerByUserIdSafe(userId)

    // Prüfe Fahrer-Status
    if (fahrer) {
      // Archivierter Fahrer
      if (fahrer.archived_at) {
        return {
          canAccess: false,
          reason: 'Ihr Fahrerzugang wurde archiviert. Bitte wenden Sie sich an die Disposition.',
          fahrer,
          profile,
          role
        }
      }

      // Deaktivierter Fahrer
      if (fahrer.status !== 'aktiv') {
        return {
          canAccess: false,
          reason: 'Ihr Fahrerzugang ist aktuell deaktiviert. Bitte wenden Sie sich an die Disposition.',
          fahrer,
          profile,
          role
        }
      }
    }

    return {
      canAccess: true,
      reason: 'Fahrer-Rolle',
      fahrer,
      profile,
      role
    }
  }

  // Admin/GF mit Fahrer-Datensatz
  if (role === 'admin' || role === 'gf') {
    const fahrer = await getFahrerByUserIdSafe(userId)
    if (fahrer) {
      // Auch Admin/GF mit archiviertem/deaktiviertem Fahrerprofil hat keinen Fahrerportal-Zugang
      if (fahrer.archived_at) {
        return {
          canAccess: false,
          reason: 'Ihr Fahrerprofil ist archiviert - kein Fahrerportal-Zugang',
          fahrer,
          profile,
          role
        }
      }

      if (fahrer.status !== 'aktiv') {
        return {
          canAccess: false,
          reason: 'Ihr Fahrerprofil ist deaktiviert - kein Fahrerportal-Zugang',
          fahrer,
          profile,
          role
        }
      }

      return {
        canAccess: true,
        reason: 'Admin/GF mit Fahrer-Datensatz',
        profile,
        fahrer,
        role
      }
    }
    return {
      canAccess: false,
      reason: 'Admin/GF ohne Fahrer-Datensatz - kein Fahrerportal-Zugang',
      fahrer: null,
      profile,
      role
    }
  }

  // Alle anderen Rollen (disponent, hr, etc.) haben keinen Zugang
  return {
    canAccess: false,
    reason: `Rolle '${role}' hat keinen Fahrerportal-Zugang`,
    profile,

    fahrer: null,
    role
  }
}
