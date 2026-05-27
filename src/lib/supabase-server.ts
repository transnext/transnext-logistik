import { createClient } from '@supabase/supabase-js'

/**
 * Supabase Admin Client mit Service Role Key
 * NUR SERVERSEITIG VERWENDEN!
 */
export function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase Umgebungsvariablen fehlen')
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

/**
 * Holt User-ID aus Authorization Header (Bearer Token)
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

  const client = createClient(supabaseUrl, supabaseAnonKey)
  const { data: { user }, error } = await client.auth.getUser(token)
  
  if (error || !user) {
    return null
  }
  return user.id
}

/**
 * Prüft ob User Admin oder GF ist (serverseitig mit Service Role)
 */
export async function isAdminOrGF(userId: string): Promise<boolean> {
  const admin = getSupabaseAdmin()
  
  const { data, error } = await admin
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle()

  if (error || !data) {
    return false
  }

  return ['admin', 'gf', 'geschaeftsfuehrer'].includes(data.role)
}
