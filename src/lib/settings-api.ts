/**
 * Settings API - nur Admin/GF
 * Verwendet bestehende system_settings Tabelle
 * Nach GRANT-Migration kann Admin/GF jetzt direkt auf Basistabelle zugreifen
 */

import { supabase } from "./supabase"
import { logAuditEvent } from "./audit-api"

// Erlaubte Settings-Keys mit Validierungsregeln
const ALLOWED_SETTINGS = {
  minijob_limit: {
    label: "Minijob-Grenze",
    validate: (v: unknown): string | null => {
      const num = Number(v)
      if (isNaN(num) || num <= 0) return "Muss eine Zahl größer als 0 sein"
      return null
    }
  },
  employer_contribution_rate: {
    label: "Pauschalbeitrag Knappschaft",
    validate: (v: unknown): string | null => {
      const num = Number(v)
      if (isNaN(num) || num < 0 || num > 100) return "Muss zwischen 0 und 100 liegen"
      return null
    }
  },
  settlement_day: {
    label: "Auszahlungstag",
    validate: (v: unknown): string | null => {
      const num = Number(v)
      if (!Number.isInteger(num) || num < 1 || num > 28) return "Muss eine Ganzzahl zwischen 1 und 28 sein"
      return null
    }
  },
  availability_deadline_day: {
    label: "Deadline Wochentag",
    validate: (v: unknown): string | null => {
      const num = Number(v)
      if (!Number.isInteger(num) || num < 1 || num > 7) return "Muss eine Ganzzahl zwischen 1 und 7 sein"
      return null
    }
  },
  availability_deadline_hour: {
    label: "Deadline Uhrzeit",
    validate: (v: unknown): string | null => {
      const num = Number(v)
      if (!Number.isInteger(num) || num < 0 || num > 23) return "Muss eine Ganzzahl zwischen 0 und 23 sein"
      return null
    }
  },
  availability_reminder_day: {
    label: "Erinnerung Wochentag",
    validate: (v: unknown): string | null => {
      const num = Number(v)
      if (!Number.isInteger(num) || num < 1 || num > 7) return "Muss eine Ganzzahl zwischen 1 und 7 sein"
      return null
    }
  },
  availability_reminder_hour: {
    label: "Erinnerung Uhrzeit",
    validate: (v: unknown): string | null => {
      const num = Number(v)
      if (!Number.isInteger(num) || num < 0 || num > 23) return "Muss eine Ganzzahl zwischen 0 und 23 sein"
      return null
    }
  },
  availability_escalation_hour: {
    label: "Eskalation Uhrzeit",
    validate: (v: unknown): string | null => {
      const num = Number(v)
      if (!Number.isInteger(num) || num < 0 || num > 23) return "Muss eine Ganzzahl zwischen 0 und 23 sein"
      return null
    }
  }
} as const

export type AllowedSettingKey = keyof typeof ALLOWED_SETTINGS

export interface SystemSetting {
  id: string
  key: string
  value: unknown
  description: string | null
  valid_from: string
  valid_until: string | null
  updated_at: string
  updated_by: string | null
}

export interface SettingsGroup {
  title: string
  description: string
  settings: {
    key: string
    label: string
    value: unknown
    unit?: string
    description?: string
  }[]
}

export interface CreateSettingVersionParams {
  key: AllowedSettingKey
  value: unknown
  description?: string
  valid_from: string // ISO-Datum YYYY-MM-DD
}

export interface CreateSettingVersionResult {
  success: boolean
  error?: string
  newSetting?: SystemSetting
}

/**
 * Lädt alle aktiven System-Einstellungen (nur Admin/GF)
 * Admin/GF: Basistabelle mit allen Feldern
 * Disponent/Fahrer: Kein Zugriff (RLS blockiert)
 */
export async function getActiveSystemSettings(): Promise<SystemSetting[]> {
  const today = new Date().toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('system_settings')
    .select('*')
    .lte('valid_from', today)
    .or(`valid_until.is.null,valid_until.gte.${today}`)
    .order('key', { ascending: true })

  if (error) {
    // Echter Fehler - werfen statt statische Defaults
    console.error('Fehler beim Laden der System-Einstellungen:', error.message)
    throw new Error(`System-Einstellungen konnten nicht geladen werden: ${error.message}`)
  }

  return data || []
}

/**
 * Lädt alle historischen Versionen für einen bestimmten key
 */
export async function getSettingHistory(key: string): Promise<SystemSetting[]> {
  const { data, error } = await supabase
    .from('system_settings')
    .select('*')
    .eq('key', key)
    .order('valid_from', { ascending: false })

  if (error) {
    console.error('Fehler beim Laden der Setting-Historie:', error.message)
    throw new Error(`Setting-Historie konnte nicht geladen werden: ${error.message}`)
  }

  return data || []
}

/**
 * Lädt einen bestimmten Einstellungswert
 */
export async function getSettingValue(key: string): Promise<unknown | null> {
  const settings = await getActiveSystemSettings()
  const setting = settings.find(s => s.key === key)
  return setting?.value ?? null
}

/**
 * Prüft ob ein key erlaubt ist
 */
export function isAllowedSettingKey(key: string): key is AllowedSettingKey {
  return key in ALLOWED_SETTINGS
}

/**
 * Gibt das Label für einen key zurück
 */
export function getSettingLabel(key: string): string {
  if (isAllowedSettingKey(key)) {
    return ALLOWED_SETTINGS[key].label
  }
  return key
}

/**
 * Validiert einen Wert für einen key
 */
export function validateSettingValue(key: AllowedSettingKey, value: unknown): string | null {
  const config = ALLOWED_SETTINGS[key]
  if (!config) return "Unbekannte Einstellung"
  return config.validate(value)
}

/**
 * Erstellt eine neue Version einer Systemeinstellung (nur Admin/GF)
 *
 * Versionierungslogik:
 * 1. Aktive Einstellung für key finden
 * 2. Alte aktive Einstellung bekommt valid_until = valid_from - 1 Tag
 * 3. Neue Einstellung wird eingefügt mit valid_from und valid_until = null
 *
 * WICHTIG: Diese Funktion ändert NIEMALS bestehende Werte ohne bewusste Nutzeraktion.
 */
export async function createSystemSettingVersion(
  params: CreateSettingVersionParams
): Promise<CreateSettingVersionResult> {
  const { key, value, description, valid_from } = params

  // 1. Prüfen ob key erlaubt ist
  if (!isAllowedSettingKey(key)) {
    return { success: false, error: "Unbekannte Einstellung" }
  }

  // 2. Wert validieren
  const validationError = validateSettingValue(key, value)
  if (validationError) {
    return { success: false, error: validationError }
  }

  // 3. valid_from prüfen
  if (!valid_from || !/^\d{4}-\d{2}-\d{2}$/.test(valid_from)) {
    return { success: false, error: "Ungültiges Datum für valid_from" }
  }

  const validFromDate = new Date(valid_from)
  if (isNaN(validFromDate.getTime())) {
    return { success: false, error: "Ungültiges Datum für valid_from" }
  }

  try {
    // 4. Aktuelle aktive Einstellung für diesen key finden
    const today = new Date().toISOString().split('T')[0]
    const { data: currentSettings, error: fetchError } = await supabase
      .from('system_settings')
      .select('*')
      .eq('key', key)
      .lte('valid_from', today)
      .or(`valid_until.is.null,valid_until.gte.${today}`)
      .limit(1)

    if (fetchError) {
      console.error('Fehler beim Laden der aktuellen Einstellung:', fetchError.message)
      return { success: false, error: `Fehler beim Laden: ${fetchError.message}` }
    }

    const currentSetting = currentSettings?.[0]

    // 5. Wenn aktive Einstellung existiert, diese beenden (valid_until setzen)
    if (currentSetting) {
      // valid_until = valid_from - 1 Tag
      const validUntilDate = new Date(validFromDate)
      validUntilDate.setDate(validUntilDate.getDate() - 1)
      const validUntil = validUntilDate.toISOString().split('T')[0]

      const { error: updateError } = await supabase
        .from('system_settings')
        .update({
          valid_until: validUntil,
          updated_at: new Date().toISOString()
        })
        .eq('id', currentSetting.id)

      if (updateError) {
        console.error('Fehler beim Beenden der alten Einstellung:', updateError.message)
        return { success: false, error: `Fehler beim Beenden der alten Einstellung: ${updateError.message}` }
      }
    }

    // 6. Neue Einstellung einfügen
    const { data: newSetting, error: insertError } = await supabase
      .from('system_settings')
      .insert({
        key,
        value,
        description: description || currentSetting?.description || null,
        valid_from,
        valid_until: null
      })
      .select()
      .single()

    if (insertError) {
      console.error('Fehler beim Erstellen der neuen Einstellung:', insertError.message)
      // Rollback: alte Einstellung wieder aktivieren
      if (currentSetting) {
        await supabase
          .from('system_settings')
          .update({
            valid_until: null,
            updated_at: new Date().toISOString()
          })
          .eq('id', currentSetting.id)
      }
      return { success: false, error: `Fehler beim Erstellen: ${insertError.message}` }
    }

    // Audit-Log: Neue Setting-Version erstellt
    await logAuditEvent({
      action: 'setting_version_created',
      entityType: 'system_setting',
      entityId: newSetting?.id,
      entityLabel: getSettingLabel(key),
      severity: 'info',
      isFinancial: true, // Settings sind finanziell relevant
      beforeData: currentSetting ? {
        id: currentSetting.id,
        key: currentSetting.key,
        value: currentSetting.value,
        valid_from: currentSetting.valid_from,
        valid_until: currentSetting.valid_until
      } : null,
      afterData: {
        id: newSetting?.id,
        key,
        value,
        valid_from,
        valid_until: null
      },
      metadata: {
        setting_key: key,
        setting_label: getSettingLabel(key),
        previous_setting_id: currentSetting?.id || null
      }
    })

    return { success: true, newSetting }
  } catch (err) {
    console.error('Unerwarteter Fehler bei createSystemSettingVersion:', err)
    return { success: false, error: 'Unerwarteter Fehler beim Speichern' }
  }
}

/**
 * Gruppiert Einstellungen nach Kategorie
 */
export function groupSettings(settings: SystemSetting[]): SettingsGroup[] {
  const settingMap = new Map<string, unknown>()
  settings.forEach(s => settingMap.set(s.key, s.value))

  return [
    {
      title: "Minijob & Grenzwerte",
      description: "Einstellungen für Minijob-Abrechnungen",
      settings: [
        {
          key: "minijob_limit",
          label: "Minijob-Grenze",
          value: settingMap.get("minijob_limit") ?? "—",
          unit: "€/Monat",
          description: "Maximaler monatlicher Verdienst für Minijobber"
        }
      ]
    },
    {
      title: "Arbeitgeberabgaben",
      description: "Beitragssätze für Arbeitgeberkosten",
      settings: [
        {
          key: "employer_contribution_rate",
          label: "Pauschalbeitrag Knappschaft",
          value: settingMap.get("employer_contribution_rate") ?? "—",
          unit: "%",
          description: "Arbeitgeberanteil für Minijob-Pauschale"
        }
      ]
    },
    {
      title: "Auszahlung",
      description: "Einstellungen für Fahrerauszahlungen",
      settings: [
        {
          key: "settlement_day",
          label: "Auszahlungstag",
          value: settingMap.get("settlement_day") ?? "—",
          unit: ". des Monats",
          description: "Tag der monatlichen Fahrer-Auszahlung"
        }
      ]
    },
    {
      title: "Verfügbarkeits-Deadline",
      description: "Fristen für Fahrer-Verfügbarkeiten",
      settings: [
        {
          key: "availability_deadline_day",
          label: "Deadline Wochentag",
          value: formatWeekday(settingMap.get("availability_deadline_day")),
          description: "Wochentag bis wann Verfügbarkeiten eingereicht sein müssen"
        },
        {
          key: "availability_deadline_hour",
          label: "Deadline Uhrzeit",
          value: settingMap.get("availability_deadline_hour") ?? "—",
          unit: ":00 Uhr",
          description: "Uhrzeit der Deadline"
        },
        {
          key: "availability_reminder_day",
          label: "Erinnerung Wochentag",
          value: formatWeekday(settingMap.get("availability_reminder_day")),
          description: "Wochentag für Verfügbarkeits-Erinnerung"
        },
        {
          key: "availability_reminder_hour",
          label: "Erinnerung Uhrzeit",
          value: settingMap.get("availability_reminder_hour") ?? "—",
          unit: ":00 Uhr",
          description: "Uhrzeit der Erinnerung"
        },
        {
          key: "availability_escalation_hour",
          label: "Eskalation Uhrzeit",
          value: settingMap.get("availability_escalation_hour") ?? "—",
          unit: ":00 Uhr",
          description: "Uhrzeit für Eskalation bei fehlender Verfügbarkeit"
        }
      ]
    }
  ]
}

/**
 * Hilfsfunktion: Wochentag formatieren
 */
function formatWeekday(day: unknown): string {
  if (day === null || day === undefined) return "—"
  const dayNum = typeof day === 'number' ? day : parseInt(String(day), 10)

  const weekdays: Record<number, string> = {
    0: "Sonntag",
    1: "Montag",
    2: "Dienstag",
    3: "Mittwoch",
    4: "Donnerstag",
    5: "Freitag",
    6: "Samstag"
  }

  return weekdays[dayNum] ?? String(day)
}

/**
 * Prüft ob Einstellungen geladen werden konnten
 */
export function hasSettingsAccess(settings: SystemSetting[]): boolean {
  return settings.length > 0
}
