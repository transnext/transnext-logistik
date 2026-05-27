"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Lock, LockOpen, Clock, User } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface LockIndicatorProps {
  /** Zeitpunkt der Sperrung (null = nicht gesperrt) */
  lockedAt?: string | null
  /** Name des sperrenden Benutzers */
  lockedBy?: string | null
  /** Zusätzliche CSS-Klassen */
  className?: string
  /** Kompakte Darstellung (nur Icon) */
  compact?: boolean
  /** Zeige "Entsperrt"-Status an */
  showUnlocked?: boolean
}

/**
 * LockIndicator - Visueller Hinweis für gesperrte Datensätze
 *
 * Zeigt an, ob und von wem ein Datensatz gesperrt wurde.
 *
 * @example
 * <LockIndicator lockedAt="2024-01-15T10:30:00" lockedBy="Admin" />
 *
 * @example
 * <LockIndicator lockedAt={null} showUnlocked />
 *
 * @example
 * <LockIndicator lockedAt="2024-01-15T10:30:00" compact />
 */
export function LockIndicator({
  lockedAt,
  lockedBy,
  className,
  compact = false,
  showUnlocked = false
}: LockIndicatorProps) {
  const isLocked = !!lockedAt

  // Wenn nicht gesperrt und showUnlocked=false, nichts anzeigen
  if (!isLocked && !showUnlocked) {
    return null
  }

  // Formatiere das Datum
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Erstelle Tooltip-Text für native title-Attribut
  const getTooltipText = () => {
    if (!isLocked) return "Nicht gesperrt"
    let text = "Gesperrt"
    if (lockedBy) text += ` von ${lockedBy}`
    if (lockedAt) text += ` am ${formatDate(lockedAt)}`
    return text
  }

  // Kompakte Version (nur Icon mit nativem Tooltip)
  if (compact) {
    return (
      <span
        title={getTooltipText()}
        className={cn("cursor-help inline-flex", className)}
      >
        {isLocked ? (
          <Lock className="h-4 w-4 text-orange-600" />
        ) : (
          <LockOpen className="h-4 w-4 text-gray-400" />
        )}
      </span>
    )
  }

  // Vollständige Version
  if (isLocked) {
    return (
      <div className={cn(
        "flex items-center gap-2 px-3 py-2 bg-orange-50 border border-orange-200 rounded-lg",
        className
      )}>
        <Lock className="h-4 w-4 text-orange-600 flex-shrink-0" />
        <div className="flex flex-col text-sm">
          <span className="font-medium text-orange-800">Gesperrt</span>
          <div className="flex items-center gap-3 text-orange-600 text-xs">
            {lockedBy && (
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" />
                {lockedBy}
              </span>
            )}
            {lockedAt && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatDate(lockedAt)}
              </span>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Entsperrt-Status
  return (
    <Badge
      className={cn(
        "bg-green-100 text-green-800 border-green-200 flex items-center gap-1",
        className
      )}
    >
      <LockOpen className="h-3 w-3" />
      Entsperrt
    </Badge>
  )
}

/**
 * LockBadge - Kompakte Badge-Version des Lock-Indikators
 */
export function LockBadge({
  isLocked,
  className
}: {
  isLocked: boolean
  className?: string
}) {
  if (!isLocked) return null

  return (
    <Badge
      className={cn(
        "bg-orange-100 text-orange-800 border-orange-200 flex items-center gap-1",
        className
      )}
    >
      <Lock className="h-3 w-3" />
      Gesperrt
    </Badge>
  )
}
