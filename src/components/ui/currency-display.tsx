"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Euro, TrendingUp, TrendingDown, Minus } from "lucide-react"

interface CurrencyDisplayProps {
  /** Betrag in Euro */
  amount: number | null | undefined
  /** Betrag ausblenden (z.B. für Nicht-Admins) */
  hidden?: boolean
  /** Zusätzliche CSS-Klassen */
  className?: string
  /** Farbe basierend auf Wert (positiv=grün, negativ=rot) */
  colorize?: boolean
  /** Zeige Trend-Icon basierend auf Wert */
  showTrend?: boolean
  /** Kompakte Darstellung ohne Euro-Symbol */
  compact?: boolean
  /** Textgröße */
  size?: "sm" | "md" | "lg" | "xl"
  /** Fettschrift */
  bold?: boolean
}

// Text-Größen
const TEXT_SIZES = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-lg",
  xl: "text-2xl"
}

/**
 * CurrencyDisplay - Einheitliche Euro-Anzeige
 *
 * Formatiert Beträge einheitlich im deutschen Format mit optionaler
 * Farbkodierung und Trend-Icons.
 *
 * @example
 * <CurrencyDisplay amount={1234.56} />
 * // Ausgabe: 1.234,56 €
 *
 * @example
 * <CurrencyDisplay amount={-50} colorize />
 * // Ausgabe: -50,00 € (rot)
 *
 * @example
 * <CurrencyDisplay amount={100} hidden />
 * // Ausgabe: •••••
 */
export function CurrencyDisplay({
  amount,
  hidden = false,
  className,
  colorize = false,
  showTrend = false,
  compact = false,
  size = "md",
  bold = false
}: CurrencyDisplayProps) {
  // Versteckter Betrag
  if (hidden) {
    return (
      <span className={cn(TEXT_SIZES[size], "text-gray-400", className)}>
        •••••
      </span>
    )
  }

  // Null/Undefined behandeln
  if (amount === null || amount === undefined) {
    return (
      <span className={cn(TEXT_SIZES[size], "text-gray-400", className)}>
        —
      </span>
    )
  }

  // Formatiere den Betrag
  const formattedAmount = new Intl.NumberFormat('de-DE', {
    style: compact ? 'decimal' : 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount)

  // Bestimme Farbe
  let colorClass = ""
  if (colorize) {
    if (amount > 0) {
      colorClass = "text-green-700"
    } else if (amount < 0) {
      colorClass = "text-red-700"
    } else {
      colorClass = "text-gray-600"
    }
  }

  // Bestimme Trend-Icon
  const getTrendIcon = () => {
    if (!showTrend) return null
    if (amount > 0) {
      return <TrendingUp className="h-4 w-4 text-green-600" />
    } else if (amount < 0) {
      return <TrendingDown className="h-4 w-4 text-red-600" />
    }
    return <Minus className="h-4 w-4 text-gray-400" />
  }

  return (
    <span className={cn(
      "inline-flex items-center gap-1",
      TEXT_SIZES[size],
      colorClass,
      bold && "font-semibold",
      className
    )}>
      {showTrend && getTrendIcon()}
      {formattedAmount}
    </span>
  )
}

/**
 * CurrencyChange - Zeigt eine Betragsänderung an
 */
export function CurrencyChange({
  oldAmount,
  newAmount,
  className
}: {
  oldAmount: number
  newAmount: number
  className?: string
}) {
  const diff = newAmount - oldAmount
  const isPositive = diff > 0
  const isNegative = diff < 0

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <CurrencyDisplay amount={oldAmount} size="sm" className="text-gray-500 line-through" />
      <span className="text-gray-400">→</span>
      <CurrencyDisplay amount={newAmount} size="sm" bold />
      <span className={cn(
        "text-sm font-medium",
        isPositive && "text-green-600",
        isNegative && "text-red-600"
      )}>
        ({isPositive ? "+" : ""}{diff.toFixed(2)} €)
      </span>
    </div>
  )
}

/**
 * CurrencySummary - Kompakte Zusammenfassung mit Label
 */
export function CurrencySummary({
  label,
  amount,
  colorize = false,
  className
}: {
  label: string
  amount: number | null | undefined
  colorize?: boolean
  className?: string
}) {
  return (
    <div className={cn("flex items-center justify-between", className)}>
      <span className="text-sm text-gray-600">{label}</span>
      <CurrencyDisplay amount={amount} colorize={colorize} bold />
    </div>
  )
}

/**
 * CurrencyCard - Karte mit Betrag und Label
 */
export function CurrencyCard({
  label,
  amount,
  icon,
  colorClass = "text-gray-900",
  className
}: {
  label: string
  amount: number | null | undefined
  icon?: React.ReactNode
  colorClass?: string
  className?: string
}) {
  return (
    <div className={cn("bg-white p-4 rounded-lg border", className)}>
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <p className="text-sm text-gray-600">{label}</p>
      </div>
      <CurrencyDisplay
        amount={amount}
        size="xl"
        bold
        className={colorClass}
      />
    </div>
  )
}
