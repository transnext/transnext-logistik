"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface KpiTrafficLightProps {
  /** Aktueller Wert */
  value: number
  /** Minimalwert (default: 0) */
  min?: number
  /** Maximalwert (default: 100) */
  max?: number
  /** Schwellwert für Gelb (default: 33% von max) */
  yellowThreshold?: number
  /** Schwellwert für Rot (default: 66% von max) */
  redThreshold?: number
  /** Label über der Ampel */
  label?: string
  /** Beschreibung unter der Ampel */
  description?: string
  /** Invertiert: niedriger Wert = grün (default: false) */
  inverted?: boolean
  /** Wert anzeigen */
  showValue?: boolean
  /** Suffix für Wert (z.B. "%" oder "€") */
  suffix?: string
  /** Zusätzliche CSS-Klassen */
  className?: string
}

/**
 * KpiTrafficLight - Minimalistische KPI-Ampel
 *
 * Zeigt einen horizontalen Balken mit rot-gelb-grün Verlauf und einem Marker.
 * Der Marker zeigt die Position des aktuellen Werts an.
 *
 * @example
 * // Standard: hoher Wert = grün
 * <KpiTrafficLight value={75} max={100} />
 *
 * @example
 * // Invertiert mit Schwellwerten: niedriger Wert = grün
 * <KpiTrafficLight
 *   value={3}
 *   max={30}
 *   yellowThreshold={5}
 *   redThreshold={15}
 *   inverted
 * />
 */
export function KpiTrafficLight({
  value,
  min = 0,
  max = 100,
  yellowThreshold,
  redThreshold,
  label,
  description,
  inverted = false,
  showValue = false,
  suffix = "",
  className
}: KpiTrafficLightProps) {
  // Normalisiere den Wert auf 0-100%
  const range = max - min
  const normalizedValue = range > 0 ? Math.max(0, Math.min(100, ((value - min) / range) * 100)) : 0

  // Position des Markers (bei inverted wird die Position gespiegelt für die visuelle Darstellung)
  const markerPosition = inverted ? 100 - normalizedValue : normalizedValue

  // Berechne Schwellwerte in Prozent
  const yellowPct = yellowThreshold !== undefined
    ? ((yellowThreshold - min) / range) * 100
    : 33
  const redPct = redThreshold !== undefined
    ? ((redThreshold - min) / range) * 100
    : 66

  // Farbe des Markers basierend auf tatsächlichem Wert und Schwellwerten
  const getMarkerColor = () => {
    if (inverted) {
      // Invertiert: niedriger Wert = grün
      if (yellowThreshold !== undefined && redThreshold !== undefined) {
        if (value <= yellowThreshold) return "bg-emerald-500 border-emerald-600"
        if (value <= redThreshold) return "bg-amber-500 border-amber-600"
        return "bg-red-500 border-red-600"
      }
      // Fallback auf Prozent
      if (normalizedValue <= 33) return "bg-emerald-500 border-emerald-600"
      if (normalizedValue <= 66) return "bg-amber-500 border-amber-600"
      return "bg-red-500 border-red-600"
    } else {
      // Normal: hoher Wert = grün
      if (markerPosition < 33) return "bg-red-500 border-red-600"
      if (markerPosition < 66) return "bg-amber-500 border-amber-600"
      return "bg-emerald-500 border-emerald-600"
    }
  }

  return (
    <div className={cn("w-full", className)}>
      {/* Label */}
      {label && (
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium text-gray-500">{label}</span>
          {showValue && (
            <span className="text-xs font-semibold text-gray-700">
              {value}{suffix}
            </span>
          )}
        </div>
      )}

      {/* Ampel-Container */}
      <div className="relative">
        {/* Gradient-Balken */}
        <div
          className="h-1.5 rounded-full overflow-hidden"
          style={{
            background: "linear-gradient(to right, #ef4444 0%, #f59e0b 50%, #10b981 100%)"
          }}
        />

        {/* Marker */}
        <div
          className="absolute top-1/2 -translate-y-1/2 transition-all duration-300 ease-out"
          style={{ left: `${markerPosition}%` }}
        >
          {/* Marker-Punkt */}
          <div
            className={cn(
              "w-3 h-3 rounded-full border-2 shadow-sm -ml-1.5",
              "ring-2 ring-white",
              getMarkerColor()
            )}
          />
        </div>
      </div>

      {/* Beschreibung */}
      {description && (
        <p className="text-[10px] text-gray-400 mt-1 truncate">{description}</p>
      )}
    </div>
  )
}

/**
 * Kompakte Inline-Version der Ampel
 */
export function KpiTrafficLightInline({
  value,
  min = 0,
  max = 100,
  inverted = false,
  className
}: Pick<KpiTrafficLightProps, "value" | "min" | "max" | "inverted" | "className">) {
  const range = max - min
  const normalizedValue = range > 0 ? Math.max(0, Math.min(100, ((value - min) / range) * 100)) : 0
  const markerPosition = inverted ? 100 - normalizedValue : normalizedValue

  return (
    <div className={cn("relative w-16 h-1 rounded-full overflow-visible", className)}>
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: "linear-gradient(to right, #ef4444 0%, #f59e0b 50%, #10b981 100%)"
        }}
      />
      <div
        className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white border border-gray-300 shadow-sm transition-all duration-300"
        style={{ left: `calc(${markerPosition}% - 4px)` }}
      />
    </div>
  )
}
