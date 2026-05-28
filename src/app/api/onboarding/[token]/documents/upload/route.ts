/**
 * API Route: Sicherer Dokumenten-Upload für Bewerber
 *
 * POST /api/onboarding/[token]/documents/upload
 *
 * Sicherheit:
 * - Token wird serverseitig validiert
 * - candidate_id wird aus Token abgeleitet (nicht vom Client)
 * - Upload erfolgt mit Service Role Key
 * - Dateityp und -größe werden validiert
 * - Dateiname wird sanitized
 *
 * Unterstützte Dateitypen: PDF, JPG, JPEG, PNG, HEIC, HEIF
 * Max. Dateigröße: 50 MB
 */

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// Erlaubte MIME-Types
const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/heic",
  "image/heif",
]

// Erlaubte Dateiendungen
const ALLOWED_EXTENSIONS = [".pdf", ".jpg", ".jpeg", ".png", ".heic", ".heif"]

// Max. Dateigröße: 50 MB
const MAX_FILE_SIZE = 50 * 1024 * 1024

// Erlaubte Dokumenttypen für Bewerber
const ALLOWED_DOCUMENT_TYPES = [
  // Minijobber
  "fuehrerschein",
  "ausweis",
  "vertrag",
  "schulungsnachweis",
  // Subunternehmer
  "gewerbeanmeldung",
  "versicherungsnachweis",
  "ausweis_gf",
  "subunternehmervertrag",
  "fahrerliste",
  // Beide
  "sonstiges",
]

/**
 * Sanitize Dateiname: Entfernt Sonderzeichen, Umlaute, etc.
 */
function sanitizeFileName(name: string): string {
  // Ersetzungen für deutsche Umlaute
  const umlautMap: Record<string, string> = {
    ä: "ae",
    ö: "oe",
    ü: "ue",
    Ä: "Ae",
    Ö: "Oe",
    Ü: "Ue",
    ß: "ss",
  }

  let sanitized = name

  // Umlaute ersetzen
  for (const [key, value] of Object.entries(umlautMap)) {
    sanitized = sanitized.replace(new RegExp(key, "g"), value)
  }

  // Nur alphanumerische Zeichen, Bindestriche, Unterstriche und Punkte behalten
  sanitized = sanitized.replace(/[^a-zA-Z0-9._-]/g, "_")

  // Mehrere aufeinanderfolgende Unterstriche durch einen ersetzen
  sanitized = sanitized.replace(/_+/g, "_")

  // Führende/trailing Unterstriche entfernen
  sanitized = sanitized.replace(/^_+|_+$/g, "")

  return sanitized || "document"
}

/**
 * Extrahiert die Dateiendung
 */
function getFileExtension(filename: string): string {
  const parts = filename.toLowerCase().split(".")
  return parts.length > 1 ? `.${parts[parts.length - 1]}` : ""
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params

    // Service Role Client für privilegierte Operationen
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )

    // 1. Token validieren und candidate_id ableiten
    const { data: tokenResult, error: tokenError } = await supabaseAdmin.rpc(
      "get_candidate_by_public_token",
      { p_token: token }
    )

    if (tokenError) {
      console.error("[Document Upload] Token validation error:", tokenError)
      return NextResponse.json(
        { success: false, error: "server_error", message: "Serverfehler bei der Token-Validierung" },
        { status: 500 }
      )
    }

    if (!tokenResult?.success) {
      const errorMessages: Record<string, string> = {
        invalid_token: "Der Link ist ungültig.",
        expired: "Der Link ist abgelaufen.",
        revoked: "Der Link wurde deaktiviert.",
        inactive: "Dieser Bewerbungsprozess ist nicht mehr aktiv.",
        not_found: "Bewerbung nicht gefunden.",
      }
      return NextResponse.json(
        {
          success: false,
          error: tokenResult?.error || "unknown",
          message: errorMessages[tokenResult?.error] || "Ein Fehler ist aufgetreten.",
        },
        { status: 400 }
      )
    }

    const candidateId = tokenResult.candidate?.id
    if (!candidateId) {
      return NextResponse.json(
        { success: false, error: "no_candidate", message: "Kandidat konnte nicht ermittelt werden." },
        { status: 400 }
      )
    }

    // 2. FormData parsen
    const formData = await request.formData()
    const file = formData.get("file") as File | null
    const documentType = formData.get("document_type") as string | null

    if (!file) {
      return NextResponse.json(
        { success: false, error: "no_file", message: "Keine Datei hochgeladen." },
        { status: 400 }
      )
    }

    if (!documentType) {
      return NextResponse.json(
        { success: false, error: "no_document_type", message: "Dokumenttyp fehlt." },
        { status: 400 }
      )
    }

    // 3. Dokumenttyp validieren
    if (!ALLOWED_DOCUMENT_TYPES.includes(documentType)) {
      return NextResponse.json(
        { success: false, error: "invalid_document_type", message: "Ungültiger Dokumenttyp." },
        { status: 400 }
      )
    }

    // 4. Dateigröße validieren
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: "file_too_large", message: "Die Datei ist zu groß. Maximale Größe: 50 MB." },
        { status: 400 }
      )
    }

    // 5. MIME-Type validieren
    if (!ALLOWED_MIME_TYPES.includes(file.type.toLowerCase())) {
      return NextResponse.json(
        { success: false, error: "invalid_file_type", message: "Ungültiger Dateityp. Erlaubt: PDF, JPG, PNG, HEIC." },
        { status: 400 }
      )
    }

    // 6. Dateiendung validieren
    const extension = getFileExtension(file.name)
    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      return NextResponse.json(
        { success: false, error: "invalid_extension", message: "Ungültige Dateiendung." },
        { status: 400 }
      )
    }

    // 7. Sicheren Storage-Pfad generieren
    const timestamp = Date.now()
    const sanitizedFileName = sanitizeFileName(file.name.replace(extension, ""))
    const storagePath = `${candidateId}/${documentType}/${timestamp}_${sanitizedFileName}${extension}`

    // 8. Datei in Buffer umwandeln
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // 9. Upload zu Supabase Storage (mit Service Role)
    const { error: uploadError } = await supabaseAdmin.storage
      .from("onboarding-documents")
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      console.error("[Document Upload] Storage upload error:", uploadError)
      return NextResponse.json(
        { success: false, error: "upload_failed", message: "Datei konnte nicht hochgeladen werden." },
        { status: 500 }
      )
    }

    // 10. Dokument in der Datenbank registrieren
    const { data: registerResult, error: registerError } = await supabaseAdmin.rpc(
      "register_applicant_document_upload",
      {
        p_token: token,
        p_document_type: documentType,
        p_file_path: storagePath,
        p_file_name: file.name,
        p_file_size: file.size,
      }
    )

    if (registerError) {
      console.error("[Document Upload] Registration error:", registerError)
      // Versuche die hochgeladene Datei zu löschen
      await supabaseAdmin.storage.from("onboarding-documents").remove([storagePath])
      return NextResponse.json(
        { success: false, error: "registration_failed", message: "Dokument konnte nicht registriert werden." },
        { status: 500 }
      )
    }

    if (!registerResult?.success) {
      // Versuche die hochgeladene Datei zu löschen
      await supabaseAdmin.storage.from("onboarding-documents").remove([storagePath])
      return NextResponse.json(
        { success: false, error: registerResult?.error || "unknown", message: "Dokument konnte nicht registriert werden." },
        { status: 400 }
      )
    }

    // Erfolg
    return NextResponse.json({
      success: true,
      document_id: registerResult.document_id,
      message: "Dokument erfolgreich hochgeladen.",
    })
  } catch (error) {
    console.error("[Document Upload] Unexpected error:", error)
    return NextResponse.json(
      { success: false, error: "server_error", message: "Ein unerwarteter Fehler ist aufgetreten." },
      { status: 500 }
    )
  }
}
