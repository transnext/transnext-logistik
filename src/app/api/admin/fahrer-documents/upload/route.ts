import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin, getUserFromRequest, isAdminOrGF } from '@/lib/supabase-server'

const ALLOWED_DOC_TYPES = ['ausweis', 'fuehrerschein', 'uvv', 'vertrag', 'abmahnung', 'schulung', 'sonstiges']
const ALLOWED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/heic', 'image/heif']
const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB

export async function POST(request: NextRequest) {
  console.log('[API fahrer-documents/upload] Request empfangen')

  try {
    // 1. User authentifizieren
    const userId = await getUserFromRequest(request)
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Nicht authentifiziert' }, { status: 401 })
    }

    // 2. Admin/GF Rolle prüfen
    const hasAccess = await isAdminOrGF(userId)
    if (!hasAccess) {
      return NextResponse.json({ success: false, error: 'Keine Berechtigung (nur Admin/GF)' }, { status: 403 })
    }

    // 3. FormData parsen
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const fahrerId = formData.get('fahrerId') as string | null
    const documentType = formData.get('documentType') as string | null
    const expiresAt = formData.get('expiresAt') as string | null
    const comment = formData.get('comment') as string | null

    // 4. Validierung
    if (!file) {
      return NextResponse.json({ success: false, error: 'Keine Datei' }, { status: 400 })
    }
    if (!fahrerId) {
      return NextResponse.json({ success: false, error: 'Keine Fahrer-ID' }, { status: 400 })
    }
    if (!documentType || !ALLOWED_DOC_TYPES.includes(documentType)) {
      return NextResponse.json({ success: false, error: 'Ungültiger Dokumenttyp' }, { status: 400 })
    }

    // Dateityp prüfen
    const fileExt = file.name.split('.').pop()?.toLowerCase() || ''
    const isHeic = fileExt === 'heic' || fileExt === 'heif'
    if (!ALLOWED_MIME_TYPES.includes(file.type) && !isHeic && file.type !== '') {
      return NextResponse.json({ success: false, error: 'Dateityp nicht erlaubt (PDF, JPG, PNG, HEIC)' }, { status: 400 })
    }

    // Dateigröße prüfen
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ success: false, error: 'Datei zu groß (max. 50MB)' }, { status: 400 })
    }
    if (file.size === 0) {
      return NextResponse.json({ success: false, error: 'Datei ist leer' }, { status: 400 })
    }

    // 5. Supabase Admin Client
    const supabase = getSupabaseAdmin()

    // 6. Fahrer existiert prüfen
    const { data: fahrer, error: fahrerErr } = await supabase
      .from('fahrer')
      .select('id')
      .eq('id', fahrerId)
      .maybeSingle()

    if (fahrerErr || !fahrer) {
      return NextResponse.json({ success: false, error: 'Fahrer nicht gefunden' }, { status: 404 })
    }

    // 7. Storage-Pfad generieren
    const timestamp = Date.now()
    const safeFileName = file.name
      .toLowerCase()
      .replace(/[äöüß]/g, c => ({ 'ä': 'ae', 'ö': 'oe', 'ü': 'ue', 'ß': 'ss' }[c] || c))
      .replace(/[^a-z0-9.-]/g, '-')
      .replace(/-+/g, '-')
    const filePath = `${fahrerId}/${documentType}/${timestamp}_${safeFileName}`

    console.log('[API fahrer-documents/upload] Uploading:', { filePath, size: file.size, type: file.type })

    // 8. Datei in ArrayBuffer konvertieren und hochladen
    const arrayBuffer = await file.arrayBuffer()
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('fahrer-dokumente')
      .upload(filePath, arrayBuffer, {
        contentType: file.type || 'application/octet-stream',
        cacheControl: '3600',
        upsert: false
      })

    if (uploadError) {
      console.error('[API fahrer-documents/upload] Storage-Fehler:', uploadError)
      return NextResponse.json({ success: false, error: `Storage-Fehler: ${uploadError.message}` }, { status: 500 })
    }

    console.log('[API fahrer-documents/upload] Upload OK:', uploadData?.path)

    // 9. DB-Eintrag erstellen
    const { data: doc, error: dbError } = await supabase
      .from('fahrer_documents')
      .insert({
        fahrer_id: fahrerId,
        document_type: documentType,
        file_name: file.name,
        file_path: filePath,
        file_size: file.size,
        mime_type: file.type || 'application/octet-stream',
        uploaded_by: userId,
        status: 'hochgeladen',
        expires_at: expiresAt || null,
        comment: comment || null
      })
      .select('id, file_name, file_path, document_type')
      .single()

    if (dbError) {
      console.error('[API fahrer-documents/upload] DB-Fehler:', dbError)
      // Storage-Datei nicht löschen, aber Fehler melden
      return NextResponse.json({ success: false, error: `DB-Fehler: ${dbError.message}` }, { status: 500 })
    }

    // 10. Audit-Log (nicht blockierend)
    try {
      await supabase.from('audit_log').insert({
        user_id: userId,
        action: 'fahrer_document_uploaded',
        entity_type: 'fahrer_document',
        entity_id: doc.id,
        severity: 'info',
        metadata: { fahrer_id: fahrerId, document_type: documentType, file_name: file.name }
      })
    } catch (auditErr) {
      console.warn('[API fahrer-documents/upload] Audit-Log fehlgeschlagen (ignoriert)')
    }

    console.log('[API fahrer-documents/upload] Erfolg:', doc.id)

    return NextResponse.json({
      success: true,
      document: {
        id: doc.id,
        file_name: doc.file_name,
        file_path: doc.file_path,
        document_type: doc.document_type
      }
    })

  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unbekannter Fehler'
    console.error('[API fahrer-documents/upload] Fehler:', err)
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 })
  }
}
