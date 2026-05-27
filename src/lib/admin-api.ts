import { supabase } from './supabase'
import type { Arbeitsnachweis, Auslagennachweis, Fahrer } from './supabase'
import { calculateTourVerdienst, hasNoSalary } from './salary-calculator'
import { calculateCustomerTotal } from './customer-pricing'
import { logAuditEvent } from './audit-api'

// =====================================================
// ROLLEN-HELPER
// =====================================================

/**
 * Ermittelt die Rolle des aktuell angemeldeten Benutzers.
 * Wird verwendet um zwischen Admin/GF und Disponent zu unterscheiden.
 */
async function getCurrentUserRole(): Promise<'admin' | 'gf' | 'disponent' | 'fahrer' | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  return profile?.role as 'admin' | 'gf' | 'disponent' | 'fahrer' | null
}

/**
 * Prüft ob der aktuelle Benutzer Admin oder Geschäftsführer ist.
 */
async function isAdminOrGF(): Promise<boolean> {
  const role = await getCurrentUserRole()
  return role === 'admin' || role === 'gf'
}

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
  zeitmodell?: 'minijob' | 'werkstudent' | 'teilzeit' | 'vollzeit'
}) {
  console.log('[createFahrer] Starte Fahrer-Erstellung für:', data.email)

  // Rufe Supabase Edge Function auf (läuft mit SERVICE_ROLE_KEY)
  const { data: result, error } = await supabase.functions.invoke('create-fahrer', {
    body: data
  })

  // Verbesserte Fehlerbehandlung: Extrahiere echte Fehlermeldung
  if (error) {
    console.error('[createFahrer] Edge Function Fehler:', error)

    // Versuche, die echte Fehlermeldung aus dem Fehler zu extrahieren
    // Bei FunctionsFetchError enthält error.context.body manchmal die Antwort
    let errorMessage = 'Fehler beim Erstellen des Fahrers'
    let errorCode = 'UNKNOWN'

    // Prüfe ob error.message JSON enthält
    try {
      if (error.message) {
        // Manchmal ist die Nachricht das JSON-Objekt
        const parsed = JSON.parse(error.message)
        if (parsed.error) {
          errorMessage = parsed.error
          errorCode = parsed.code || 'UNKNOWN'
        }
      }
    } catch {
      // error.message ist kein JSON
    }

    // Prüfe ob error.context vorhanden ist (Supabase FunctionsFetchError)
    if ((error as any).context) {
      try {
        const ctx = (error as any).context
        if (ctx.body) {
          const parsed = typeof ctx.body === 'string' ? JSON.parse(ctx.body) : ctx.body
          if (parsed.error) {
            errorMessage = parsed.error
            errorCode = parsed.code || 'UNKNOWN'
          }
        }
      } catch {
        // context.body ist kein JSON
      }
    }

    // Benutzerfreundliche Fehlermeldungen basierend auf Code
    switch (errorCode) {
      case 'EMAIL_EXISTS':
        throw new Error('Diese E-Mail-Adresse ist bereits registriert.')
      case 'INVALID_EMAIL':
        throw new Error('Ungültiges E-Mail-Format.')
      case 'WEAK_PASSWORD':
        throw new Error('Das Passwort muss mindestens 6 Zeichen lang sein.')
      case 'FORBIDDEN':
        throw new Error('Sie haben keine Berechtigung, Fahrer anzulegen.')
      case 'MISSING_FIELDS':
        throw new Error(errorMessage)
      case 'ENV_MISSING':
        throw new Error('Server-Konfigurationsfehler. Bitte Admin kontaktieren.')
      default:
        throw new Error(errorMessage)
    }
  }

  // Prüfe auf Fehler in der Antwort
  if (!result) {
    console.error('[createFahrer] Keine Antwort von Edge Function')
    throw new Error('Keine Antwort vom Server erhalten')
  }

  if (!result.success) {
    console.error('[createFahrer] Edge Function meldet Fehler:', result.error, result.code)

    // Benutzerfreundliche Fehlermeldungen basierend auf Code
    switch (result.code) {
      case 'EMAIL_EXISTS':
        throw new Error('Diese E-Mail-Adresse ist bereits registriert.')
      case 'INVALID_EMAIL':
        throw new Error('Ungültiges E-Mail-Format.')
      case 'WEAK_PASSWORD':
        throw new Error('Das Passwort muss mindestens 6 Zeichen lang sein.')
      case 'FORBIDDEN':
        throw new Error('Sie haben keine Berechtigung, Fahrer anzulegen.')
      case 'MISSING_FIELDS':
        throw new Error(result.error || 'Pflichtfelder fehlen.')
      case 'ENV_MISSING':
        throw new Error('Server-Konfigurationsfehler. Bitte Admin kontaktieren.')
      default:
        throw new Error(result.error || 'Fehler beim Erstellen des Fahrers')
    }
  }

  console.log('[createFahrer] Fahrer erfolgreich erstellt:', result.fahrer?.id)

  // Audit-Log: Fahrer erstellt
  await logAuditEvent({
    action: 'fahrer_created',
    entityType: 'fahrer',
    entityId: result.fahrer?.id,
    entityLabel: `${data.vorname} ${data.nachname}`,
    severity: 'info',
    isFinancial: false,
    afterData: {
      id: result.fahrer?.id,
      vorname: data.vorname,
      nachname: data.nachname,
      status: 'aktiv',
      zeitmodell: data.zeitmodell || 'minijob'
      // Keine sensiblen Daten wie Ausweisnummer, Führerscheinnummer im Log
    }
  })

  return {
    user: result.user,
    fahrer: result.fahrer as Fahrer
  }
}

/**
 * Aktualisiert Fahrer-Daten (ohne Email/Passwort)
 * WICHTIG: Aktualisiert auch profiles.full_name wenn Vor-/Nachname geändert wird
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
  zeitmodell?: 'minijob' | 'werkstudent' | 'teilzeit' | 'vollzeit'
}) {
  // 0. Fahrer vor Update laden für Audit
  const { data: beforeFahrer } = await supabase
    .from('fahrer')
    .select('id, vorname, nachname, status, zeitmodell')
    .eq('id', fahrerId)
    .single()

  // 1. Fahrer-Daten aktualisieren
  const { data: result, error } = await supabase
    .from('fahrer')
    .update(data)
    .eq('id', fahrerId)
    .select('*, user_id')
    .single()

  if (error) throw error

  // 2. Wenn Vor- oder Nachname geändert wurde, auch profiles.full_name aktualisieren
  if ((data.vorname || data.nachname) && result.user_id) {
    const newFullName = `${data.vorname || result.vorname} ${data.nachname || result.nachname}`

    const { error: profileError } = await supabase
      .from('profiles')
      .update({ full_name: newFullName })
      .eq('id', result.user_id)

    if (profileError) {
      console.error('Fehler beim Aktualisieren des Profils:', profileError)
    }
  }

  // 3. Audit-Log: Fahrer aktualisiert
  // Bestimme die richtige Aktion basierend auf Statusänderung
  let auditAction: string = 'fahrer_updated'
  let severity: 'info' | 'warning' | 'critical' = 'info'

  if (data.status !== undefined && beforeFahrer?.status !== data.status) {
    if (data.status === 'aktiv') {
      auditAction = 'fahrer_activated'
    } else {
      auditAction = 'fahrer_deactivated'
      severity = 'warning'
    }
  }

  await logAuditEvent({
    action: auditAction,
    entityType: 'fahrer',
    entityId: fahrerId,
    entityLabel: `${result.vorname} ${result.nachname}`,
    severity,
    isFinancial: false,
    beforeData: beforeFahrer ? {
      id: beforeFahrer.id,
      vorname: beforeFahrer.vorname,
      nachname: beforeFahrer.nachname,
      status: beforeFahrer.status,
      zeitmodell: beforeFahrer.zeitmodell
    } : null,
    afterData: {
      id: fahrerId,
      vorname: result.vorname,
      nachname: result.nachname,
      status: result.status,
      zeitmodell: result.zeitmodell
    },
    metadata: {
      changed_fields: Object.keys(data)
    }
  })

  return result as Fahrer
}

/**
 * Ändert Fahrer-Status (aktiv/inaktiv)
 */
export async function updateFahrerStatus(fahrerId: string, status: 'aktiv' | 'inaktiv') {
  return updateFahrer(Number.parseInt(fahrerId), { status })
}

/**
 * Deaktiviert einen Fahrer (vorübergehend nicht aktiv)
 * - Kein Fahrerportal-Zugriff
 * - Nicht in Verfügbarkeitsplanung
 * - Kann später reaktiviert werden
 */
export async function deactivateFahrer(fahrerId: number): Promise<Fahrer> {
  return updateFahrer(fahrerId, { status: 'inaktiv' })
}

/**
 * Reaktiviert einen deaktivierten Fahrer
 */
export async function reactivateFahrer(fahrerId: number): Promise<Fahrer> {
  return updateFahrer(fahrerId, { status: 'aktiv' })
}

/**
 * Archiviert einen Fahrer (dauerhaft ausgeschieden)
 * - Kein Fahrerportal-Zugriff
 * - Nicht in Verfügbarkeitsplanung
 * - Nicht in aktiven Fahrerlisten
 * - Historische Daten bleiben erhalten
 * - Nur Admin/GF
 */
export async function archiveFahrer(
  fahrerId: number,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  if (!(await isAdminOrGF())) {
    return { success: false, error: 'Nur Admin/GF darf Fahrer archivieren' }
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Nicht angemeldet' }
  }

  // Fahrer vor Archivierung laden
  const { data: beforeFahrer, error: fetchError } = await supabase
    .from('fahrer')
    .select('id, vorname, nachname, status, archived_at')
    .eq('id', fahrerId)
    .single()

  if (fetchError || !beforeFahrer) {
    return { success: false, error: 'Fahrer nicht gefunden' }
  }

  if (beforeFahrer.archived_at) {
    return { success: false, error: 'Fahrer ist bereits archiviert' }
  }

  const now = new Date().toISOString()

  // Archivieren: Status auf inaktiv + archived_at setzen
  const { error: updateError } = await supabase
    .from('fahrer')
    .update({
      status: 'inaktiv',
      archived_at: now,
      archived_by: user.id,
      archive_reason: reason || null
    })
    .eq('id', fahrerId)

  if (updateError) {
    return { success: false, error: updateError.message }
  }

  // Audit-Log
  await logAuditEvent({
    action: 'fahrer_archived',
    entityType: 'fahrer',
    entityId: fahrerId,
    entityLabel: `${beforeFahrer.vorname} ${beforeFahrer.nachname}`,
    severity: 'warning',
    isFinancial: false,
    beforeData: {
      id: beforeFahrer.id,
      status: beforeFahrer.status,
      archived_at: null
    },
    afterData: {
      id: fahrerId,
      status: 'inaktiv',
      archived_at: now
    },
    metadata: {
      archive_reason: reason || null
    }
  })

  return { success: true }
}

/**
 * Hebt die Archivierung eines Fahrers auf (nur Admin/GF)
 * Fahrer bleibt inaktiv und muss separat aktiviert werden
 */
export async function unarchiveFahrer(
  fahrerId: number
): Promise<{ success: boolean; error?: string }> {
  if (!(await isAdminOrGF())) {
    return { success: false, error: 'Nur Admin/GF darf Archivierung aufheben' }
  }

  // Fahrer laden
  const { data: beforeFahrer, error: fetchError } = await supabase
    .from('fahrer')
    .select('id, vorname, nachname, status, archived_at')
    .eq('id', fahrerId)
    .single()

  if (fetchError || !beforeFahrer) {
    return { success: false, error: 'Fahrer nicht gefunden' }
  }

  if (!beforeFahrer.archived_at) {
    return { success: false, error: 'Fahrer ist nicht archiviert' }
  }

  // Archivierung aufheben (Fahrer bleibt inaktiv)
  const { error: updateError } = await supabase
    .from('fahrer')
    .update({
      archived_at: null,
      archived_by: null,
      archive_reason: null
    })
    .eq('id', fahrerId)

  if (updateError) {
    return { success: false, error: updateError.message }
  }

  // Audit-Log
  await logAuditEvent({
    action: 'fahrer_unarchived',
    entityType: 'fahrer',
    entityId: fahrerId,
    entityLabel: `${beforeFahrer.vorname} ${beforeFahrer.nachname}`,
    severity: 'info',
    isFinancial: false,
    beforeData: {
      id: beforeFahrer.id,
      archived_at: beforeFahrer.archived_at
    },
    afterData: {
      id: fahrerId,
      archived_at: null
    }
  })

  return { success: true }
}

/**
 * Prüft ob ein Fahrer aktiv und nicht archiviert ist
 */
export function isFahrerActive(fahrer: { status: string; archived_at: string | null }): boolean {
  return fahrer.status === 'aktiv' && !fahrer.archived_at
}

// =====================================================
// ADMIN - ALLE DATEN ABRUFEN
// =====================================================

/**
 * Lädt alle Arbeitsnachweise mit Fahrer-Informationen.
 * Admin/GF: Basistabelle mit allen Feldern (inkl. Finanzdaten)
 * Disponent: View ohne Finanzdaten
 */
export async function getAllArbeitsnachweiseAdmin() {
  const isAdmin = await isAdminOrGF()

  if (isAdmin) {
    // Admin/GF: Basistabelle mit allen Feldern inkl. Finanzfelder
    const { data, error } = await supabase
      .from('arbeitsnachweise')
      .select('*')
      .order('datum', { ascending: false })

    if (error) {
      console.error('Fehler beim Laden der Arbeitsnachweise (Admin):', error)
      throw error
    }

    if (!data || data.length === 0) {
      return []
    }

    // Fahrer-Name und Zeitmodell via profiles hinzufügen
    const userIds = [...new Set(data.map(item => item.user_id).filter(Boolean))]

    const { data: profiles } = userIds.length > 0 ? await supabase
      .from('profiles')
      .select('id, full_name, zeitmodell, festes_gehalt')
      .in('id', userIds) : { data: [] }

    const profilesMap = new Map(profiles?.map(p => [p.id, p]) || [])

    return data.map(item => ({
      ...item,
      fahrer_name: profilesMap.get(item.user_id)?.full_name || 'Unbekannt',
      zeitmodell: profilesMap.get(item.user_id)?.zeitmodell,
      festes_gehalt: profilesMap.get(item.user_id)?.festes_gehalt,
      // Kompatibilität mit View-Feldnamen
      ist_ruecklaufer: item.ist_ruecklaufer ?? item.is_return,
      wartezeit: item.wartezeit || (item.waiting_units ? `${item.waiting_units * 30}-${item.waiting_units * 30 + 30}` : '')
    }))
  } else {
    // Disponent: View ohne Finanzdaten
    const { data, error } = await supabase
      .from('arbeitsnachweise_disponent')
      .select('*')
      .order('datum', { ascending: false })

    if (error) {
      console.error('Fehler beim Laden der Arbeitsnachweise (Disponent):', error)
      throw error
    }

    if (!data || data.length === 0) {
      return []
    }

    // Fahrer-Name und Zeitmodell via profiles hinzufügen
    const userIds = [...new Set(data.map(item => item.user_id).filter(Boolean))]

    const { data: profiles } = userIds.length > 0 ? await supabase
      .from('profiles')
      .select('id, full_name, zeitmodell, festes_gehalt')
      .in('id', userIds) : { data: [] }

    const profilesMap = new Map(profiles?.map(p => [p.id, p]) || [])

    return data.map(item => ({
      ...item,
      fahrer_name: profilesMap.get(item.user_id)?.full_name || 'Unbekannt',
      zeitmodell: profilesMap.get(item.user_id)?.zeitmodell,
      festes_gehalt: profilesMap.get(item.user_id)?.festes_gehalt,
      // View verwendet neue Namen
      ist_ruecklaufer: item.is_return,
      wartezeit: item.waiting_units ? `${item.waiting_units * 30}-${item.waiting_units * 30 + 30}` : ''
    }))
  }
}

/**
 * Lädt alle Auslagennachweise mit Fahrer-Informationen.
 * Admin/GF: Basistabelle mit allen Feldern
 * Disponent: View ohne Finanzdaten
 */
export async function getAllAuslagennachweiseAdmin() {
  const isAdmin = await isAdminOrGF()

  if (isAdmin) {
    // Admin/GF: Basistabelle mit allen Feldern
    const { data, error } = await supabase
      .from('auslagennachweise')
      .select('*')
      .order('datum', { ascending: false })

    if (error) {
      console.error('Fehler beim Laden der Auslagennachweise (Admin):', error)
      throw error
    }

    if (!data || data.length === 0) {
      return []
    }

    // Füge Fahrer-Name via profiles hinzu
    const userIds = [...new Set(data.map(item => item.user_id).filter(Boolean))]

    const { data: profiles } = userIds.length > 0 ? await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', userIds) : { data: [] }

    const profilesMap = new Map(profiles?.map(p => [p.id, p.full_name]) || [])

    return data.map(item => ({
      ...item,
      fahrer_name: profilesMap.get(item.user_id) || 'Unbekannt'
    }))
  } else {
    // Disponent: View ohne Finanzdaten
    const { data, error } = await supabase
      .from('auslagennachweise_disponent')
      .select('*')
      .order('datum', { ascending: false })

    if (error) {
      console.error('Fehler beim Laden der Auslagennachweise (Disponent):', error)
      throw error
    }

    if (!data || data.length === 0) {
      return []
    }

    // Füge Fahrer-Name via profiles hinzu
    const userIds = [...new Set(data.map(item => item.user_id).filter(Boolean))]

    const { data: profiles } = userIds.length > 0 ? await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', userIds) : { data: [] }

    const profilesMap = new Map(profiles?.map(p => [p.id, p.full_name]) || [])

    return data.map(item => ({
      ...item,
      fahrer_name: profilesMap.get(item.user_id) || 'Unbekannt'
    }))
  }
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
        full_name,
        zeitmodell,
        festes_gehalt
      )
    `)
    .order('nachname', { ascending: true })

  if (error) throw error

  return data.map(item => ({
    ...item,
    zeitmodell: item.profiles?.zeitmodell || 'minijob',
    festes_gehalt: item.profiles?.festes_gehalt
  }))
}

// =====================================================
// ADMIN - STATISTIKEN
// =====================================================

/**
 * Lädt Statistiken für das Dashboard.
 * Admin/GF: Inkl. Lohn- und Umsatzdaten
 * Disponent: Nur operative Statistiken (ohne Finanzdaten)
 */
export async function getAdminStatistics() {
  const isAdmin = await isAdminOrGF()

  if (isAdmin) {
    // Admin/GF: Voller Zugriff inkl. Finanzdaten für Lohn/Umsatz-Berechnung
    const [arbeitsnachweiseData, auslagennachweiseData, fahrerData] = await Promise.all([
      supabase.from('arbeitsnachweise').select(`
        status,
        gefahrene_km,
        wartezeit,
        datum,
        user_id,
        auftraggeber,
        profiles!arbeitsnachweise_user_id_fkey (
          zeitmodell,
          festes_gehalt
        )
      `),
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

    // Gesamtlohn genehmigte Touren (approved + billed) - OHNE Geschäftsführer
    const approvedTouren = arbeitsnachweise.filter(t => t.status === 'approved')
    const approvedAndBilledTouren = arbeitsnachweise.filter(t => t.status === 'approved' || t.status === 'billed')

    // Lade Fahrernamen für die Berechnung
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id, full_name')
    const profilesMap = new Map(profilesData?.map(p => [p.id, p.full_name]) || [])

    // Filtere Fahrer ohne Lohnberechnung (z.B. Nicholas Mandzel, Burak Aydin)
    const gesamtlohnGenehmigt = approvedAndBilledTouren.reduce((sum, t: any) => {
      const fahrerName = profilesMap.get(t.user_id) || undefined
      // Überspringe Fahrer ohne Lohnberechnung
      if (hasNoSalary(fahrerName)) {
        return sum
      }
      return sum + calculateTourVerdienst(t.gefahrene_km || 0, t.wartezeit, fahrerName)
    }, 0)

    // Monatsumsatz (alle Touren des Monats mit Kunden-Preisen) - berücksichtigt Auftraggeber
    const monatsumsatz = currentMonthTouren.reduce((sum, t: any) => {
      return sum + calculateCustomerTotal(t.gefahrene_km || 0, t.wartezeit, t.auftraggeber)
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

      // NEU: Lohn & Umsatz (nur für Admin/GF)
      gesamtlohnGenehmigt: gesamtlohnGenehmigt,
      monatsumsatz: monatsumsatz,
    }
  } else {
    // Disponent: Nur operative Statistiken ohne Finanzdaten
    const [arbeitsnachweiseData, auslagennachweiseData, fahrerData] = await Promise.all([
      supabase.from('arbeitsnachweise_disponent').select('status, gefahrene_km, datum'),
      supabase.from('auslagennachweise_disponent').select('status, kosten'),
      supabase.from('fahrer').select('status'),
    ])

    if (arbeitsnachweiseData.error) throw arbeitsnachweiseData.error
    if (auslagennachweiseData.error) throw auslagennachweiseData.error
    if (fahrerData.error) throw fahrerData.error

    const arbeitsnachweise = arbeitsnachweiseData.data
    const auslagennachweise = auslagennachweiseData.data
    const fahrer = fahrerData.data

    return {
      // Touren (ohne Finanzberechnung)
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

      // Keine Lohn/Umsatz-Daten für Disponenten
      gesamtlohnGenehmigt: 0,
      monatsumsatz: 0,
    }
  }
}

// =====================================================
// ADMIN - KW EXPORT
// =====================================================

/**
 * Lädt Touren für eine bestimmte Kalenderwoche.
 * Admin/GF: Basistabelle mit allen Feldern
 * Disponent: View ohne Finanzfelder
 */
export async function getTourenByKW(year: number, week: number) {
  const isAdmin = await isAdminOrGF()

  // Berechne Start- und Enddatum der KW
  const startDate = getDateOfISOWeek(week, year)
  const endDate = new Date(startDate)
  endDate.setDate(endDate.getDate() + 6)

  if (isAdmin) {
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
  } else {
    const { data, error } = await supabase
      .from('arbeitsnachweise_disponent')
      .select('*')
      .gte('datum', startDate.toISOString().split('T')[0])
      .lte('datum', endDate.toISOString().split('T')[0])
      .order('datum', { ascending: true })

    if (error) throw error

    // Füge Fahrer-Namen hinzu
    const userIds = [...new Set(data.map(item => item.user_id))]
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', userIds)

    const profilesMap = new Map(profiles?.map(p => [p.id, p.full_name]) || [])

    return data.map(item => ({
      ...item,
      fahrer_name: profilesMap.get(item.user_id) || 'Unbekannt'
    }))
  }
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
// BULK OPERATIONS (Rollen-abhängig)
// Admin/GF: Direkter Tabellenzugriff
// Disponent: Nur pending/approved/rejected über RPCs
// =====================================================

/**
 * Ändert Status mehrerer Touren gleichzeitig.
 * Admin/GF: Alle Status erlaubt via Basistabelle
 * Disponent: Nur pending/approved/rejected via RPC
 */
export async function bulkUpdateTourenStatus(
  tourIds: number[],
  status: 'pending' | 'approved' | 'rejected' | 'billed'
) {
  const isAdmin = await isAdminOrGF()

  if (isAdmin) {
    // Admin/GF: Direkter Zugriff auf Basistabelle
    const { data, error } = await supabase
      .from('arbeitsnachweise')
      .update({ status })
      .in('id', tourIds)
      .select()

    if (error) throw error
    return data
  } else {
    // Disponent: Nur pending/approved/rejected erlaubt
    if (status === 'billed') {
      throw new Error('Disponenten dürfen keine Touren abrechnen. Nur Admin/Geschäftsführer.')
    }

    // Status über RPC ändern (einzeln, da RPC keine Bulk-Operation hat)
    const results = []
    for (const tourId of tourIds) {
      const { error } = await supabase.rpc('update_arbeitsnachweis_status', {
        p_id: tourId,
        p_status: status
      })
      if (error) throw error
      results.push({ id: tourId, status })
    }
    return results
  }
}

/**
 * Ändert Status mehrerer Auslagen gleichzeitig.
 * Admin/GF: Alle Status erlaubt via Basistabelle
 * Disponent: Nur pending/approved/rejected via RPC
 */
export async function bulkUpdateAuslagenStatus(
  auslagenIds: number[],
  status: 'pending' | 'approved' | 'rejected' | 'paid'
) {
  const isAdmin = await isAdminOrGF()

  if (isAdmin) {
    // Admin/GF: Direkter Zugriff auf Basistabelle
    const { data, error } = await supabase
      .from('auslagennachweise')
      .update({ status })
      .in('id', auslagenIds)
      .select()

    if (error) throw error
    return data
  } else {
    // Disponent: Nur pending/approved/rejected erlaubt
    if (status === 'paid') {
      throw new Error('Disponenten dürfen keine Auslagen als bezahlt markieren. Nur Admin/Geschäftsführer.')
    }

    // Status über RPC ändern (einzeln)
    const results = []
    for (const auslagenId of auslagenIds) {
      const { error } = await supabase.rpc('update_auslagennachweis_status', {
        p_id: auslagenId,
        p_status: status
      })
      if (error) throw error
      results.push({ id: auslagenId, status })
    }
    return results
  }
}

// =====================================================
// TOUR MANAGEMENT (Rollen-abhängig)
// Admin/GF: Voller Zugriff
// Disponent: Nur Statusänderung via RPC
// =====================================================

/**
 * Löscht eine Tour.
 * ⚠️ NUR FÜR ADMIN/GF - Disponenten dürfen nicht löschen.
 */
export async function deleteTour(tourId: number) {
  const isAdmin = await isAdminOrGF()

  if (!isAdmin) {
    throw new Error('Nur Admin/Geschäftsführer dürfen Touren löschen.')
  }

  // Tour vor Löschung laden für Audit
  const { data: beforeTour } = await supabase
    .from('arbeitsnachweise')
    .select('id, tour_nr, datum, user_id, status')
    .eq('id', tourId)
    .single()

  const { error } = await supabase
    .from('arbeitsnachweise')
    .delete()
    .eq('id', tourId)
  if (error) throw error

  // Audit-Log: Arbeitsnachweis gelöscht
  await logAuditEvent({
    action: 'arbeitsnachweis_deleted',
    entityType: 'arbeitsnachweis',
    entityId: tourId,
    entityLabel: beforeTour?.tour_nr || `Tour #${tourId}`,
    severity: 'critical', // Kritisch, da Daten unwiederbringlich gelöscht
    isFinancial: true,
    beforeData: beforeTour ? {
      id: beforeTour.id,
      tour_nr: beforeTour.tour_nr,
      datum: beforeTour.datum,
      status: beforeTour.status
      // Keine Finanzdaten im Log
    } : null
  })

  return { success: true }
}

/**
 * Markiert mehrere Touren als abgerechnet.
 * ⚠️ NUR FÜR ADMIN/GF - Disponenten dürfen nicht abrechnen.
 */
export async function billMultipleTours(tourIds: number[]) {
  const isAdmin = await isAdminOrGF()

  if (!isAdmin) {
    throw new Error('Nur Admin/Geschäftsführer dürfen Touren abrechnen.')
  }

  const { data, error } = await supabase
    .from('arbeitsnachweise')
    .update({ status: 'billed' })
    .in('id', tourIds)
    .select()
  if (error) throw error
  return { success: true, count: tourIds.length, data }
}

/**
 * Aktualisiert eine Tour (Arbeitsnachweis).
 * Admin/GF: Alle Felder änderbar
 * Disponent: Nur Status via RPC (keine anderen Felder)
 */
export async function updateTour(tourId: number, data: {
  tour_nr?: string
  datum?: string
  gefahrene_km?: number
  wartezeit?: '30-60' | '60-90' | '90-120' | 'keine'
  auftraggeber?: 'onlogist' | 'smartandcare'
  ist_ruecklaufer?: boolean
  status?: 'pending' | 'approved' | 'rejected' | 'billed'
}) {
  const isAdmin = await isAdminOrGF()

  if (isAdmin) {
    // Admin/GF: Alle Felder änderbar via Basistabelle
    const { data: result, error } = await supabase
      .from('arbeitsnachweise')
      .update(data)
      .eq('id', tourId)
      .select()
      .single()

    if (error) throw error
    return { success: true, data: result }
  } else {
    // Disponent: Nur Status ändern erlaubt
    const allowedFields = Object.keys(data)
    const hasNonStatusFields = allowedFields.some(field => field !== 'status')

    if (hasNonStatusFields) {
      throw new Error('Disponenten dürfen nur den Status einer Tour ändern. Andere Felder sind gesperrt.')
    }

    if (!data.status) {
      throw new Error('Kein Status angegeben.')
    }

    if (data.status === 'billed') {
      throw new Error('Disponenten dürfen keine Touren abrechnen.')
    }

    // Status via RPC ändern
    const { error } = await supabase.rpc('update_arbeitsnachweis_status', {
      p_id: tourId,
      p_status: data.status
    })
    if (error) throw error
    return { success: true, data: { id: tourId, status: data.status } }
  }
}

/**
 * Aktualisiert eine Auslage.
 * Admin/GF: Alle Felder änderbar
 * Disponent: Nur Status via RPC (keine anderen Felder)
 */
export async function updateAuslage(auslagenId: number, data: {
  tour_nr?: string
  kennzeichen?: string
  datum?: string
  startort?: string
  zielort?: string
  belegart?: 'tankbeleg' | 'waschbeleg' | 'bahnticket' | 'bc50' | 'taxi' | 'uber'
  kosten?: number
  status?: 'pending' | 'approved' | 'rejected' | 'paid' | 'billed'
}) {
  const isAdmin = await isAdminOrGF()

  if (isAdmin) {
    // Admin/GF: Alle Felder änderbar via Basistabelle
    const { data: result, error } = await supabase
      .from('auslagennachweise')
      .update(data)
      .eq('id', auslagenId)
      .select()
      .single()

    if (error) throw error
    return { success: true, data: result }
  } else {
    // Disponent: Nur Status ändern erlaubt
    const allowedFields = Object.keys(data)
    const hasNonStatusFields = allowedFields.some(field => field !== 'status')

    if (hasNonStatusFields) {
      throw new Error('Disponenten dürfen nur den Status einer Auslage ändern. Andere Felder sind gesperrt.')
    }

    if (!data.status) {
      throw new Error('Kein Status angegeben.')
    }

    if (data.status === 'paid' || data.status === 'billed') {
      throw new Error('Disponenten dürfen keine Auslagen als bezahlt/abgerechnet markieren.')
    }

    // Status via RPC ändern
    const { error } = await supabase.rpc('update_auslagennachweis_status', {
      p_id: auslagenId,
      p_status: data.status
    })
    if (error) throw error
    return { success: true, data: { id: auslagenId, status: data.status } }
  }
}

// =====================================================
// AUSLAGEN MANAGEMENT (Admin-only)
// =====================================================

/**
 * Markiert eine Auslage als erstattet/überwiesen (Phase-1-konform).
 *
 * ⚠️ NUR FÜR ADMIN/GF - Disponenten dürfen diese Aktion nicht ausführen.
 *
 * Setzt folgende Felder:
 * - driver_reimbursement_status = 'erstattet' (Phase-1)
 * - reimbursed_at = aktuelle Zeit (Phase-1)
 * - reimbursed_by = aktueller User (Phase-1)
 * - status = 'paid' (Legacy-Kompatibilität)
 *
 * @param auslagenId - ID der Auslage
 * @returns Erfolgsbestätigung mit aktualisierten Daten
 * @throws Error wenn nicht Admin/GF oder technischer Fehler
 */
export async function markAuslageAsReimbursed(auslagenId: number) {
  const isAdmin = await isAdminOrGF()

  if (!isAdmin) {
    throw new Error('Nur Admin/Geschäftsführer dürfen Auslagen als erstattet markieren.')
  }

  // Aktuellen User für reimbursed_by holen
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Kein angemeldeter Benutzer gefunden.')
  }

  // Auslage vor Update laden für Audit
  const { data: beforeAuslage } = await supabase
    .from('auslagennachweise')
    .select('id, tour_nr, datum, belegart, status, driver_reimbursement_status')
    .eq('id', auslagenId)
    .single()

  // Phase-1-konforme Felder + Legacy-Status setzen
  const { data: result, error } = await supabase
    .from('auslagennachweise')
    .update({
      driver_reimbursement_status: 'erstattet',
      reimbursed_at: new Date().toISOString(),
      reimbursed_by: user.id,
      status: 'paid' // Legacy-Kompatibilität
    })
    .eq('id', auslagenId)
    .select()
    .single()

  if (error) throw error

  // Audit-Log: Auslage als überwiesen markiert
  await logAuditEvent({
    action: 'auslage_reimbursed',
    entityType: 'auslagennachweis',
    entityId: auslagenId,
    entityLabel: beforeAuslage?.tour_nr || `Auslage #${auslagenId}`,
    severity: 'info',
    isFinancial: true,
    beforeData: beforeAuslage ? {
      id: beforeAuslage.id,
      status: beforeAuslage.status,
      driver_reimbursement_status: beforeAuslage.driver_reimbursement_status
    } : null,
    afterData: {
      id: auslagenId,
      status: 'paid',
      driver_reimbursement_status: 'erstattet'
    },
    metadata: {
      tour_nr: beforeAuslage?.tour_nr,
      datum: beforeAuslage?.datum,
      belegart: beforeAuslage?.belegart
    }
  })

  return { success: true, data: result }
}

/**
 * Löscht eine Auslage.
 * ⚠️ NUR FÜR ADMIN/GF - Disponenten dürfen nicht löschen.
 */
export async function deleteAuslage(auslagenId: number) {
  const isAdmin = await isAdminOrGF()

  if (!isAdmin) {
    throw new Error('Nur Admin/Geschäftsführer dürfen Auslagen löschen.')
  }

  // Auslage vor Löschung laden für Audit
  const { data: beforeAuslage } = await supabase
    .from('auslagennachweise')
    .select('id, tour_nr, datum, belegart, user_id, status')
    .eq('id', auslagenId)
    .single()

  const { error } = await supabase
    .from('auslagennachweise')
    .delete()
    .eq('id', auslagenId)
  if (error) throw error

  // Audit-Log: Auslage gelöscht
  await logAuditEvent({
    action: 'auslage_deleted',
    entityType: 'auslagennachweis',
    entityId: auslagenId,
    entityLabel: beforeAuslage?.tour_nr || `Auslage #${auslagenId}`,
    severity: 'critical', // Kritisch, da Daten unwiederbringlich gelöscht
    isFinancial: true,
    beforeData: beforeAuslage ? {
      id: beforeAuslage.id,
      tour_nr: beforeAuslage.tour_nr,
      datum: beforeAuslage.datum,
      belegart: beforeAuslage.belegart,
      status: beforeAuslage.status
      // Keine Kosten im Log (sensibel)
    } : null
  })

  return { success: true }
}

/**
 * Markiert mehrere Auslagen als abgerechnet.
 * ⚠️ NUR FÜR ADMIN/GF - Disponenten dürfen nicht abrechnen.
 */
export async function billMultipleAuslagen(auslagenIds: number[]) {
  const isAdmin = await isAdminOrGF()

  if (!isAdmin) {
    throw new Error('Nur Admin/Geschäftsführer dürfen Auslagen abrechnen.')
  }

  const { data, error } = await supabase
    .from('auslagennachweise')
    .update({ status: 'billed' })
    .in('id', auslagenIds)
    .select()
  if (error) throw error
  return { success: true, count: auslagenIds.length, data }
}

/**
 * Markiert eine Tour als Rückläufer.
 * ⚠️ NUR FÜR ADMIN/GF - Disponenten dürfen Rückläufer-Status nicht ändern.
 */
export async function markTourAsRuecklaufer(tourId: number, isRuecklaufer: boolean) {
  const isAdmin = await isAdminOrGF()

  if (!isAdmin) {
    throw new Error('Nur Admin/Geschäftsführer dürfen den Rückläufer-Status ändern.')
  }

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
