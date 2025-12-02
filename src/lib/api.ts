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

  if (error) throw error
  return result as Arbeitsnachweis
}

export async function getArbeitsnachweiseByUser(userId: string) {
  const { data, error } = await supabase
    .from('arbeitsnachweise')
    .select('*')
    .eq('user_id', userId)
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
}) {
  const user = await getCurrentUser()
  if (!user) throw new Error('Nicht angemeldet')

  const { data: result, error } = await supabase
    .from('auslagennachweise')
    .insert([{
      user_id: user.id,
      ...data,
    }])
    .select()
    .single()

  if (error) throw error
  return result as Auslagennachweis
}

export async function getAuslagennachweiseByUser(userId: string) {
  const { data, error } = await supabase
    .from('auslagennachweise')
    .select('*')
    .eq('user_id', userId)
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
