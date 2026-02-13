import { NextRequest, NextResponse } from "next/server"

interface DistanceRequest {
  origin: {
    lat?: number
    lng?: number
    address?: string
  }
  destination: {
    lat?: number
    lng?: number
    address?: string
  }
}

interface DistanceResponse {
  distance_km: number | null
  duration_minutes: number | null
  error?: string
  error_code?: string
}

export async function POST(request: NextRequest): Promise<NextResponse<DistanceResponse>> {
  // API Key Priorität: GOOGLE_DISTANCE_MATRIX_API_KEY > GOOGLE_MAPS_API_KEY > NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
  const apiKey = process.env.GOOGLE_DISTANCE_MATRIX_API_KEY
    || process.env.GOOGLE_MAPS_API_KEY
    || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

  try {
    const body: DistanceRequest = await request.json()
    const { origin, destination } = body

    if (!apiKey || apiKey.trim() === "") {
      console.error("[/api/distance] FEHLER: Server-Key für Distanzberechnung fehlt.")
      return NextResponse.json(
        {
          distance_km: null,
          duration_minutes: null,
          error: "Server-Key fehlt – Distanzberechnung nicht möglich",
          error_code: "API_KEY_MISSING"
        },
        { status: 500 }
      )
    }

    // Build origin string (prefer lat/lng over address)
    let originStr: string
    if (origin.lat && origin.lng) {
      originStr = `${origin.lat},${origin.lng}`
    } else if (origin.address) {
      originStr = origin.address
    } else {
      return NextResponse.json(
        { distance_km: null, duration_minutes: null, error: "Ungültiger Startort", error_code: "INVALID_ORIGIN" },
        { status: 400 }
      )
    }

    // Build destination string
    let destStr: string
    if (destination.lat && destination.lng) {
      destStr = `${destination.lat},${destination.lng}`
    } else if (destination.address) {
      destStr = destination.address
    } else {
      return NextResponse.json(
        { distance_km: null, duration_minutes: null, error: "Ungültiger Zielort", error_code: "INVALID_DESTINATION" },
        { status: 400 }
      )
    }

    // Call Google Distance Matrix API
    const url = new URL("https://maps.googleapis.com/maps/api/distancematrix/json")
    url.searchParams.set("origins", originStr)
    url.searchParams.set("destinations", destStr)
    url.searchParams.set("key", apiKey)
    url.searchParams.set("mode", "driving")
    url.searchParams.set("language", "de")
    url.searchParams.set("region", "de")

    const response = await fetch(url.toString())
    const data = await response.json()

    if (data.status !== "OK") {
      console.error("[/api/distance] Google Distance Matrix API Fehler:", data)

      let errorMessage = `Google API Fehler: ${data.status}`
      if (data.status === "REQUEST_DENIED") {
        errorMessage = "API Key ungültig oder Distance Matrix API nicht aktiviert"
      } else if (data.status === "OVER_QUERY_LIMIT") {
        errorMessage = "API-Kontingent überschritten"
      }

      return NextResponse.json(
        { distance_km: null, duration_minutes: null, error: errorMessage, error_code: data.status },
        { status: 500 }
      )
    }

    const element = data.rows?.[0]?.elements?.[0]

    if (!element || element.status !== "OK") {
      const elementStatus = element?.status || "UNKNOWN"
      let errorMessage = "Route nicht gefunden"

      if (elementStatus === "NOT_FOUND") {
        errorMessage = "Eine der Adressen wurde nicht gefunden"
      } else if (elementStatus === "ZERO_RESULTS") {
        errorMessage = "Keine Route zwischen den Adressen möglich"
      }

      return NextResponse.json(
        { distance_km: null, duration_minutes: null, error: errorMessage, error_code: elementStatus },
        { status: 404 }
      )
    }

    // Distance in meters -> km (rounded)
    const distanceKm = Math.round(element.distance.value / 1000)
    // Duration in seconds -> minutes (rounded)
    const durationMinutes = Math.round(element.duration.value / 60)

    return NextResponse.json({
      distance_km: distanceKm,
      duration_minutes: durationMinutes,
    })
  } catch (error) {
    console.error("[/api/distance] Interner Fehler:", error)
    return NextResponse.json(
      { distance_km: null, duration_minutes: null, error: "Interner Serverfehler", error_code: "INTERNAL_ERROR" },
      { status: 500 }
    )
  }
}
