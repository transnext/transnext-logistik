"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Loader2 } from "lucide-react"

interface LoadingStateProps {
  /** Text neben dem Spinner */
  text?: string
  /** Zusätzliche CSS-Klassen */
  className?: string
  /** Größe des Spinners */
  size?: "sm" | "md" | "lg"
  /** Fullscreen-Overlay */
  fullscreen?: boolean
  /** Nur Spinner ohne Container */
  inline?: boolean
}

// Spinner-Größen
const SPINNER_SIZES = {
  sm: "h-4 w-4",
  md: "h-6 w-6",
  lg: "h-8 w-8"
}

// Text-Größen
const TEXT_SIZES = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-lg"
}

/**
 * LoadingState - Einheitlicher Loading-Zustand
 *
 * Zeigt einen Spinner mit optionalem Text an.
 *
 * @example
 * <LoadingState text="Lade Daten..." />
 *
 * @example
 * <LoadingState size="lg" fullscreen />
 *
 * @example
 * <LoadingState inline size="sm" />
 */
export function LoadingState({
  text,
  className,
  size = "md",
  fullscreen = false,
  inline = false
}: LoadingStateProps) {
  const content = (
    <>
      <Loader2 className={cn(SPINNER_SIZES[size], "animate-spin text-primary-blue")} />
      {text && (
        <span className={cn(TEXT_SIZES[size], "text-gray-600 ml-2")}>
          {text}
        </span>
      )}
    </>
  )

  // Inline-Version (nur Spinner + Text)
  if (inline) {
    return (
      <span className={cn("inline-flex items-center", className)}>
        {content}
      </span>
    )
  }

  // Fullscreen-Overlay
  if (fullscreen) {
    return (
      <div className={cn(
        "fixed inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-50",
        className
      )}>
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-primary-blue" />
          {text && (
            <p className="text-gray-600 text-lg font-medium">{text}</p>
          )}
        </div>
      </div>
    )
  }

  // Standard: Zentrierter Container
  return (
    <div className={cn("flex items-center justify-center py-12", className)}>
      <div className="flex items-center">
        {content}
      </div>
    </div>
  )
}

/**
 * Skeleton-Loader für einzelne Zeilen
 */
export function LoadingSkeleton({
  lines = 3,
  className
}: {
  lines?: number
  className?: string
}) {
  return (
    <div className={cn("space-y-3", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-4 bg-gray-200 rounded animate-pulse"
          style={{ width: `${Math.random() * 40 + 60}%` }}
        />
      ))}
    </div>
  )
}

/**
 * Table-Row-Skeleton
 */
export function TableRowSkeleton({
  columns = 5,
  rows = 3,
  className
}: {
  columns?: number
  rows?: number
  className?: string
}) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex gap-4">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <div
              key={colIndex}
              className="h-8 bg-gray-200 rounded animate-pulse flex-1"
            />
          ))}
        </div>
      ))}
    </div>
  )
}

/**
 * Card-Skeleton für Karten-Layouts
 */
export function CardSkeleton({
  className
}: {
  className?: string
}) {
  return (
    <div className={cn("border rounded-lg p-6 space-y-4", className)}>
      <div className="h-6 bg-gray-200 rounded animate-pulse w-1/2" />
      <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
      <div className="h-4 bg-gray-200 rounded animate-pulse w-2/3" />
      <div className="flex gap-2 mt-4">
        <div className="h-8 bg-gray-200 rounded animate-pulse w-20" />
        <div className="h-8 bg-gray-200 rounded animate-pulse w-20" />
      </div>
    </div>
  )
}
