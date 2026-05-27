import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  console.log('[create-fahrer] step: start')

  try {
    // Prüfe Umgebungsvariablen
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('[create-fahrer] step: check_env - FAILED - Missing env vars')
      return new Response(
        JSON.stringify({ error: 'Server-Konfigurationsfehler: Umgebungsvariablen fehlen', code: 'ENV_MISSING' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Erstelle Supabase Admin Client mit Service Role
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    console.log('[create-fahrer] step: check_auth')

    // Verifiziere dass der Aufrufer ein Admin ist
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      console.error('[create-fahrer] step: check_auth - FAILED - No auth header')
      return new Response(
        JSON.stringify({ error: 'Nicht authentifiziert: Authorization Header fehlt', code: 'NO_AUTH_HEADER' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)

    if (userError || !user) {
      console.error('[create-fahrer] step: check_auth - FAILED', userError?.message)
      return new Response(
        JSON.stringify({ error: 'Nicht authentifiziert: Token ungültig', code: 'INVALID_TOKEN' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('[create-fahrer] step: check_role for user:', user.id)

    // Prüfe ob User Admin, GF oder Disponent ist
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.error('[create-fahrer] step: check_role - FAILED - Profile query error:', profileError.message)
      return new Response(
        JSON.stringify({ error: 'Profil konnte nicht geladen werden', code: 'PROFILE_ERROR' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // WICHTIG: gf (Geschäftsführer) wurde hier hinzugefügt!
    const allowedRoles = ['admin', 'gf', 'disponent']
    if (!profile || !allowedRoles.includes(profile.role)) {
      console.error('[create-fahrer] step: check_role - FAILED - Role not allowed:', profile?.role)
      return new Response(
        JSON.stringify({ error: 'Keine Berechtigung: Nur Admin, GF oder Disponent dürfen Fahrer anlegen', code: 'FORBIDDEN' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('[create-fahrer] step: validate_payload')

    // Hole Fahrer-Daten aus Request
    const fahrerData = await req.json()

    // Validiere Pflichtfelder
    if (!fahrerData.email || !fahrerData.password) {
      console.error('[create-fahrer] step: validate_payload - FAILED - Missing email or password')
      return new Response(
        JSON.stringify({ error: 'E-Mail und Passwort sind Pflichtfelder', code: 'MISSING_FIELDS' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!fahrerData.vorname || !fahrerData.nachname) {
      console.error('[create-fahrer] step: validate_payload - FAILED - Missing name')
      return new Response(
        JSON.stringify({ error: 'Vorname und Nachname sind Pflichtfelder', code: 'MISSING_FIELDS' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('[create-fahrer] step: create_auth_user for email:', fahrerData.email)

    // 1. Erstelle Auth-User mit Admin-Rechten
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: fahrerData.email,
      password: fahrerData.password,
      email_confirm: true, // Auto-bestätigen
      user_metadata: {
        role: 'fahrer',
        full_name: `${fahrerData.vorname} ${fahrerData.nachname}`,
      }
    })

    if (authError) {
      console.error('[create-fahrer] step: create_auth_user - FAILED:', authError.message)

      // Spezifische Fehlerbehandlung für bekannte Fehler
      if (authError.message.includes('already been registered') || authError.message.includes('already exists')) {
        return new Response(
          JSON.stringify({ error: 'Diese E-Mail-Adresse ist bereits registriert', code: 'EMAIL_EXISTS' }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if (authError.message.includes('password')) {
        return new Response(
          JSON.stringify({ error: 'Passwort erfüllt nicht die Mindestanforderungen (min. 6 Zeichen)', code: 'WEAK_PASSWORD' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ error: `Auth-Fehler: ${authError.message}`, code: 'AUTH_ERROR' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!authData.user) {
      console.error('[create-fahrer] step: create_auth_user - FAILED - No user returned')
      return new Response(
        JSON.stringify({ error: 'Benutzer konnte nicht erstellt werden', code: 'USER_CREATION_FAILED' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('[create-fahrer] step: create_auth_user - SUCCESS, user_id:', authData.user.id)

    try {
      console.log('[create-fahrer] step: insert_profile')

      // 2. Erstelle Profil
      const { error: profileInsertError } = await supabaseAdmin
        .from('profiles')
        .insert({
          id: authData.user.id,
          role: 'fahrer',
          full_name: `${fahrerData.vorname} ${fahrerData.nachname}`,
        })

      if (profileInsertError) {
        console.error('[create-fahrer] step: insert_profile - FAILED:', profileInsertError.message)
        throw new Error(`Profil-Fehler: ${profileInsertError.message}`)
      }

      console.log('[create-fahrer] step: insert_profile - SUCCESS')
      console.log('[create-fahrer] step: insert_fahrer')

      // 3. Erstelle Fahrer-Eintrag
      const { data: fahrer, error: fahrerError } = await supabaseAdmin
        .from('fahrer')
        .insert({
          user_id: authData.user.id,
          vorname: fahrerData.vorname,
          nachname: fahrerData.nachname,
          geburtsdatum: fahrerData.geburtsdatum,
          adresse: fahrerData.adresse,
          plz: fahrerData.plz,
          ort: fahrerData.ort,
          fuehrerschein_nr: fahrerData.fuehrerschein_nr,
          fuehrerschein_datum: fahrerData.fuehrerschein_datum,
          ausstellende_behoerde: fahrerData.ausstellende_behoerde,
          fuehrerscheinklassen: fahrerData.fuehrerscheinklassen,
          ausweisnummer: fahrerData.ausweisnummer,
          ausweis_ablauf: fahrerData.ausweis_ablauf,
          status: 'aktiv',
        })
        .select()
        .single()

      if (fahrerError) {
        console.error('[create-fahrer] step: insert_fahrer - FAILED:', fahrerError.message)
        throw new Error(`Fahrer-Fehler: ${fahrerError.message}`)
      }

      console.log('[create-fahrer] step: insert_fahrer - SUCCESS, fahrer_id:', fahrer.id)
      console.log('[create-fahrer] step: complete - SUCCESS')

      return new Response(
        JSON.stringify({
          success: true,
          user: authData.user,
          fahrer: fahrer
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )

    } catch (error) {
      // Cleanup: Lösche Auth-User wenn Fahrer-Erstellung fehlschlägt
      console.log('[create-fahrer] step: cleanup - Deleting auth user due to error')
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      throw error
    }

  } catch (error) {
    console.error('[create-fahrer] step: error -', error.message || error)
    return new Response(
      JSON.stringify({ error: error.message || 'Interner Serverfehler', code: 'INTERNAL_ERROR' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
