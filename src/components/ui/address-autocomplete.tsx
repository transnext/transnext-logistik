"use client"

import { useEffect, useRef, useState } from "react"
import { Input } from "./input"
import { Loader2, AlertTriangle } from "lucide-react"

export interface AddressData {
  street: string
  zip: string
  city: string
  place_id?: string
  lat?: number
  lng?: number
  formatted_address?: string
}

interface AddressAutocompleteProps {
  value: string
  onChange: (value: string) => void
  onAddressSelect: (address: AddressData) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  id?: string
}

// Google Maps Script Loader
let isScriptLoading = false
let isScriptLoaded = false
let scriptLoadError = false
const callbacks: ((success: boolean) => void)[] = []

function loadGoogleMapsScript(apiKey: string): Promise<boolean> {
  return new Promise((resolve) => {
    if (isScriptLoaded) {
      resolve(true)
      return
    }

    if (scriptLoadError) {
      resolve(false)
      return
    }

    callbacks.push(resolve)

    if (isScriptLoading) {
      return
    }

    isScriptLoading = true

    const script = document.createElement("script")
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&language=de&region=DE`
    script.async = true
    script.defer = true

    script.onload = () => {
      isScriptLoaded = true
      isScriptLoading = false
      callbacks.forEach((cb) => cb(true))
      callbacks.length = 0
    }

    script.onerror = () => {
      isScriptLoading = false
      scriptLoadError = true
      console.error("[AddressAutocomplete] Google Maps Script konnte nicht geladen werden. Prüfe den API Key.")
      callbacks.forEach((cb) => cb(false))
      callbacks.length = 0
    }

    document.head.appendChild(script)
  })
}

export function AddressAutocomplete({
  value,
  onChange,
  onAddressSelect,
  placeholder = "Adresse eingeben...",
  disabled = false,
  className = "",
  id,
}: AddressAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isReady, setIsReady] = useState(false)
  const [apiKeyMissing, setApiKeyMissing] = useState(false)
  const [loadError, setLoadError] = useState(false)

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

    if (!apiKey || apiKey.trim() === "") {
      console.error(
        "[AddressAutocomplete] FEHLER: NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ist nicht konfiguriert.\n" +
        "Setze diese Environment Variable in den Projekt-Settings:\n" +
        "  Name: NEXT_PUBLIC_GOOGLE_MAPS_API_KEY\n" +
        "  Wert: Dein Google Maps API Key mit Places API aktiviert"
      )
      setApiKeyMissing(true)
      return
    }

    setIsLoading(true)

    loadGoogleMapsScript(apiKey).then((success) => {
      if (success) {
        setIsReady(true)
      } else {
        setLoadError(true)
      }
      setIsLoading(false)
    })
  }, [])

  useEffect(() => {
    if (!isReady || !inputRef.current || autocompleteRef.current) return

    try {
      const autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
        componentRestrictions: { country: "de" },
        fields: ["address_components", "geometry", "place_id", "formatted_address"],
        types: ["address"],
      })

      autocomplete.addListener("place_changed", () => {
        const place = autocomplete.getPlace()

        if (!place.address_components) {
          return
        }

        const addressData: AddressData = {
          street: "",
          zip: "",
          city: "",
          place_id: place.place_id,
          lat: place.geometry?.location?.lat(),
          lng: place.geometry?.location?.lng(),
          formatted_address: place.formatted_address,
        }

        let streetNumber = ""
        let route = ""

        for (const component of place.address_components) {
          const type = component.types[0]

          switch (type) {
            case "street_number":
              streetNumber = component.long_name
              break
            case "route":
              route = component.long_name
              break
            case "postal_code":
              addressData.zip = component.long_name
              break
            case "locality":
            case "sublocality_level_1":
              addressData.city = component.long_name
              break
          }
        }

        // Straße + Hausnummer kombinieren
        addressData.street = route + (streetNumber ? ` ${streetNumber}` : "")

        // WICHTIG: NUR onAddressSelect aufrufen, NICHT onChange!
        // onChange würde setFormData({...formData, strasse: v}) aufrufen,
        // wobei formData aus einer Closure stammt und veraltet sein kann.
        // onAddressSelect verwendet funktionale Updates und setzt die Straße selbst.
        onAddressSelect(addressData)
      })

      autocompleteRef.current = autocomplete
    } catch (err) {
      console.error("[AddressAutocomplete] Google Places Autocomplete Fehler:", err)
      setLoadError(true)
    }
  }, [isReady, onChange, onAddressSelect])

  // Wenn API Key fehlt oder Ladefehler: normales Input mit Warnung
  const showWarning = apiKeyMissing || loadError

  return (
    <div className="relative">
      <Input
        ref={inputRef}
        id={id}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={showWarning ? "Adresse manuell eingeben..." : placeholder}
        disabled={disabled || isLoading}
        className={className}
        autoComplete="off"
      />
      {isLoading && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
        </div>
      )}
      {showWarning && (
        <div className="mt-1 flex items-center gap-1.5 text-xs text-amber-600">
          <AlertTriangle className="h-3 w-3 flex-shrink-0" />
          <span>
            {apiKeyMissing
              ? "Autocomplete nicht verfügbar – API Key fehlt (NEXT_PUBLIC_GOOGLE_MAPS_API_KEY)"
              : "Autocomplete nicht verfügbar – Ladefehler"}
          </span>
        </div>
      )}
    </div>
  )
}
