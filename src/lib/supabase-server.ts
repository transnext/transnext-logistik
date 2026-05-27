import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

/**
 * Supabase Admin Client mit Service Role Key
 * NUR SERVERSEITIG VERWENDEN - NIEMALS IM BROWSER!
 */
export function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY oder NEXT_PUBLIC_SUPABASE_URL nicht konfiguriert')
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

/**
 * Supabase Client für Server-seitige Requests mit User-Session
 * Liest das Session-Token aus den Cookies
 */
export async function getSupabaseServer() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase Umgebungsvariablen nicht konfiguriert')
  }

  const cookieStore = await cookies()
  const accessToken = cookieStore.get('sb-access-token')?.value
  const refreshToken = cookieStore.get('sb-refresh-token')?.value

  const client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  // Wenn Tokens vorhanden, Session setzen
  if (accessToken && refreshToken) {
    await client.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken
    })
  }

  return client
}

/**
 * Holt die aktuelle User-ID aus dem Authorization Header
 */
export async function getUserFromRequest(request: Request): Promise<string | null> {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return null
  }

  const token = authHeader.slice(7)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    return null
  }

  const client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  const { data: { user }, error } = await client.auth.getUser(token)
  if (error || !user) {
    return null
  }

  return user.id
}

/**
 * Prüft ob der User Admin oder GF ist
 */
export async function isAdminOrGF(userId: string): Promise<boolean> {
  const admin = getSupabaseAdmin()

  const { data, error } = await admin
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle()

  if (error || !data) {
    console.error('[isAdminOrGF] Fehler:', error)
    return false
  }

  return ['admin', 'gf', 'geschaeftsfuehrer'].includes(data.role)
}
