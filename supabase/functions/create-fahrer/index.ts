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

  try {
    // Erstelle Supabase Admin Client mit Service Role
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Verifiziere dass der Aufrufer ein Admin ist
    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')

    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Nicht authentifiziert' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Prüfe ob User Admin ist
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Keine Admin-Berechtigung' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Hole Fahrer-Daten aus Request
    const fahrerData = await req.json()

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
      return new Response(
        JSON.stringify({ error: authError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!authData.user) {
      return new Response(
        JSON.stringify({ error: 'Benutzer konnte nicht erstellt werden' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    try {
      // 2. Erstelle Profil
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .insert({
          id: authData.user.id,
          role: 'fahrer',
          full_name: `${fahrerData.vorname} ${fahrerData.nachname}`,
        })

      if (profileError) throw profileError

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

      if (fahrerError) throw fahrerError

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
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      throw error
    }

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message || 'Interner Serverfehler' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
