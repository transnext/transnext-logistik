import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin, getUserFromRequest, isAdminOrGF } from '@/lib/supabase-server'

// Erlaubte Dokumenttypen
const ALLOWED_DOCUMENT_TYPES = [
  'ausweis', 'fuehrerschein', 'vertrag', 'arbeitsvertrag',
  'kfz_schein', 'fahrzeugschein', 'sonstiges'
]

// Erlaubte MIME-Types
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/heic',
  'image/heif'
]

// Max Dateigröße: 50MB
const MAX_FILE_SIZE = 50 * 1024 * 1024

interface UploadResponse {
  success: boolean
  document?: {
    id: string
    file_name: string
    file_path: string
    document_type: string
  }
  error?: string
}

export async function POST(request: NextRequest): Promise<NextResponse<UploadResponse>> {
  console.log('[API /admin/fahrer-documents/upload] Request empfangen')

  try {
    // 1. User authentifizieren
    const userId = await getUserFromRequest(request)
    if (!userId) {
      console.error('[API Upload] Nicht authentifiziert')
      return NextResponse.json(
        { success: false, error: 'Nicht authentifiziert. Bitte erneut anmelden.' },
        { status: 401 }
      )
    }

    // 2. Rolle prüfen - nur Admin/GF
    const hasAccess = await isAdminOrGF(userId)
    if (!hasAccess) {
      console.error('[API Upload] Keine Berechtigung für User:', userId)
      return NextResponse.json(
        { success: false, error: 'Keine Berechtigung. Nur Admin/GF können Dokumente hochladen.' },
        { status: 403 }
      )
    }

    // 3. FormData parsen
    let formData: FormData
    try {
      formData = await request.formData()
    } catch (parseError) {
      console.error('[API Upload] FormData-Parsing fehlgeschlagen:', parseError)
      return NextResponse.json(
        { success: false, error: 'Ungültige Anfrage. FormData erwartet.' },
        { status: 400 }
      )
    }

    const file = formData.get('file') as File | null
    const fahrerId = formData.get('fahrerId') as string | null
    const documentType = formData.get('documentType') as string | null
    const expiresAt = formData.get('expiresAt') as string | null
    const comment = formData.get('comment') as string | null

    // 4. Validierung
    if (!file) {
      return NextResponse.json(
        { success: false, error: 'Keine Datei hochgeladen.' },
        { status: 400 }
      )
    }

    if (!fahrerId || typeof fahrerId !== 'string' || fahrerId.length < 10) {
      return NextResponse.json(
        { success: false, error: 'Ungültige Fahrer-ID.' },
        { status: 400 }
      )
    }

    if (!documentType || !ALLOWED_DOCUMENT_TYPES.includes(documentType)) {
      return NextResponse.json(
        { success: false, error: `Ungültiger Dokumenttyp. Erlaubt: ${ALLOWED_DOCUMENT_TYPES.join(', ')}` },
        { status: 400 }
      )
    }

    // Datei-Validierung
    const fileExt = file.name.split('.').pop()?.toLowerCase() || ''
    const isHeic = fileExt === 'heic' || fileExt === 'heif'

    if (!ALLOWED_MIME_TYPES.includes(file.type) && !isHeic && file.type !== '') {
      return NextResponse.json(
        { success: false, error: `Dateityp "${file.type}" nicht erlaubt. Nur PDF, JPG, PNG, HEIC.` },
        { status: 400 }
      )
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: 'Datei zu groß (max. 50MB).' },
        { status: 400 }
      )
    }

    if (file.size === 0) {
      return NextResponse.json(
        { success: false, error: 'Datei ist leer (0 Bytes).' },
        { status: 400 }
      )
    }

    // 5. Supabase Admin Client (Service Role)
    const supabaseAdmin = getSupabaseAdmin()

    // 6. Fahrer existiert prüfen
    const { data: fahrerData, error: fahrerError } = await supabaseAdmin
      .from('fahrer')
      .select('id')
      .eq('id', fahrerId)
      .maybeSingle()

    if (fahrerError || !fahrerData) {
      console.error('[API Upload] Fahrer nicht gefunden:', fahrerId, fahrerError)
      return NextResponse.json(
        { success: false, error: 'Fahrer nicht gefunden.' },
        { status: 404 }
      )
    }

    // 7. Dateiname und Pfad generieren
    const timestamp = Date.now()
    const sanitizedExt = fileExt.replace(/[^a-z0-9]/g, '') || 'pdf'
    const sanitizedDocType = documentType.toLowerCase().replace(/[^a-z0-9_-]/g, '')
    const fileName = `${sanitizedDocType}_${timestamp}.${sanitizedExt}`
    const filePath = `${fahrerId}/${sanitizedDocType}/${fileName}`

    console.log('[API Upload] Upload-Parameter:', {
      bucket: 'fahrer-dokumente',
      filePath,
      fileSize: file.size,
      fileType: file.type,
      originalName: file.name,
      uploadedBy: userId
    })

    // 8. Datei in ArrayBuffer konvertieren
    const fileBuffer = await file.arrayBuffer()

    // 9. Upload mit Service Role (umgeht RLS!)
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('fahrer-dokumente')
      .upload(filePath, fileBuffer, {
        contentType: file.type || 'application/octet-stream',
        cacheControl: '3600',
        upsert: false
      })

    if (uploadError) {
      console.error('[API Upload] Storage-Fehler:', {
        message: uploadError.message,
        name: (uploadError as any).name,
        statusCode: (uploadError as any).statusCode
      })

      // Spezifische Fehlermeldungen
      const errMsg = (uploadError.message || '').toLowerCase()
      let errorMessage = 'Upload fehlgeschlagen'

      if (errMsg.includes('bucket not found')) {
        errorMessage = 'Storage-Bucket "fahrer-dokumente" nicht gefunden. Bitte Administrator kontaktieren.'
      } else if (errMsg.includes('duplicate') || errMsg.includes('already exists')) {
        errorMessage = 'Datei existiert bereits.'
      } else if (errMsg.includes('size') || errMsg.includes('too large')) {
        errorMessage = 'Datei zu groß.'
      } else if (uploadError.message) {
        errorMessage = `Storage-Fehler: ${uploadError.message}`
      }

      return NextResponse.json(
        { success: false, error: errorMessage },
        { status: 500 }
      )
    }

    console.log('[API Upload] Storage-Upload erfolgreich:', uploadData?.path)

    // 10. DB-Eintrag erstellen
    const { data: document, error: dbError } = await supabaseAdmin
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
      console.error('[API Upload] DB-Fehler:', dbError)

      // Rollback: Upload löschen
      try {
        await supabaseAdmin.storage.from('fahrer-dokumente').remove([filePath])
        console.log('[API Upload] Upload nach DB-Fehler gelöscht')
      } catch (removeErr) {
        console.error('[API Upload] Konnte Upload nicht löschen:', removeErr)
      }

      // Spezifische DB-Fehlermeldungen
      let errorMessage = 'Datenbank-Fehler beim Speichern'
      if (dbError.code === '42P01') {
        errorMessage = 'Tabelle "fahrer_documents" existiert nicht.'
      } else if (dbError.code === '23503') {
        errorMessage = 'Fahrer-ID ungültig.'
      } else if (dbError.code === '23505') {
        errorMessage = 'Dokument existiert bereits.'
      } else if (dbError.message) {
        errorMessage = `DB-Fehler: ${dbError.message}`
      }

      return NextResponse.json(
        { success: false, error: errorMessage },
        { status: 500 }
      )
    }

    // 11. Audit-Log (optional, darf nicht blockieren)
    try {
      await supabaseAdmin.from('audit_log').insert({
        user_id: userId,
        action: 'fahrer_document_uploaded',
        entity_type: 'fahrer_document',
        entity_id: document.id,
        entity_label: `${documentType} - ${file.name}`,
        severity: 'info',
        metadata: {
          fahrer_id: fahrerId,
          document_type: documentType,
          file_name: file.name,
          file_path: filePath,
          file_size: file.size
        }
      })
    } catch (auditErr) {
      // Audit-Log-Fehler ignorieren
      console.warn('[API Upload] Audit-Log fehlgeschlagen (ignoriert):', auditErr)
    }

    console.log('[API Upload] Erfolgreich abgeschlossen:', document.id)

    return NextResponse.json({
      success: true,
      document: {
        id: document.id,
        file_name: document.file_name,
        file_path: document.file_path,
        document_type: document.document_type
      }
    })

  } catch (error: any) {
    console.error('[API Upload] Unerwarteter Fehler:', error)
    return NextResponse.json(
      { success: false, error: `Serverfehler: ${error?.message || 'Unbekannt'}` },
      { status: 500 }
    )
  }
}
