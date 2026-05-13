"use client"

import * as React from "react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import {
  Clock,
  CheckCircle,
  XCircle,
  FileText,
  CreditCard,
  RefreshCw,
  AlertTriangle,
  AlertCircle,
  Info,
  Minus
} from "lucide-react"

export type StatusVariant =
  | "default"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "neutral"
  | "pending"
  | "approved"
  | "rejected"
  | "billed"
  | "paid"
  | "tankcard"
  | "retoure"
  | "draft"
  | "open"
  | "critical"

interface StatusBadgeProps {
  /** Status-Schlüssel oder Variante */
  status: StatusVariant | string
  /** Optionales Label (überschreibt Standard-Label) */
  label?: string
  /** Icon anzeigen */
  showIcon?: boolean
  /** Zusätzliche CSS-Klassen */
  className?: string
}

// Status-Konfigurationen
const STATUS_CONFIG: Record<string, {
  label: string
  bgClass: string
  textClass: string
  borderClass: string
  icon: React.ReactNode
}> = {
  // Workflow-Status
  pending: {
    label: "Ausstehend",
    bgClass: "bg-yellow-100",
    textClass: "text-yellow-800",
    borderClass: "border-yellow-200",
    icon: <Clock className="h-3 w-3" />
  },
  approved: {
    label: "Genehmigt",
    bgClass: "bg-green-100",
    textClass: "text-green-800",
    borderClass: "border-green-200",
    icon: <CheckCircle className="h-3 w-3" />
  },
  rejected: {
    label: "Abgelehnt",
    bgClass: "bg-red-100",
    textClass: "text-red-800",
    borderClass: "border-red-200",
    icon: <XCircle className="h-3 w-3" />
  },
  billed: {
    label: "Abgerechnet",
    bgClass: "bg-blue-100",
    textClass: "text-blue-800",
    borderClass: "border-blue-200",
    icon: <FileText className="h-3 w-3" />
  },
  paid: {
    label: "Überwiesen",
    bgClass: "bg-purple-100",
    textClass: "text-purple-800",
    borderClass: "border-purple-200",
    icon: <CreditCard className="h-3 w-3" />
  },
  tankcard: {
    label: "Tankkarte",
    bgClass: "bg-amber-100",
    textClass: "text-amber-800",
    borderClass: "border-amber-200",
    icon: <CreditCard className="h-3 w-3" />
  },
  retoure: {
    label: "Retoure",
    bgClass: "bg-orange-100",
    textClass: "text-orange-800",
    borderClass: "border-orange-200",
    icon: <RefreshCw className="h-3 w-3" />
  },
  draft: {
    label: "Entwurf",
    bgClass: "bg-gray-100",
    textClass: "text-gray-700",
    borderClass: "border-gray-200",
    icon: <FileText className="h-3 w-3" />
  },
  open: {
    label: "Offen",
    bgClass: "bg-sky-100",
    textClass: "text-sky-800",
    borderClass: "border-sky-200",
    icon: <Info className="h-3 w-3" />
  },

  // Generische Varianten
  default: {
    label: "Standard",
    bgClass: "bg-gray-100",
    textClass: "text-gray-700",
    borderClass: "border-gray-200",
    icon: <Minus className="h-3 w-3" />
  },
  success: {
    label: "Erfolg",
    bgClass: "bg-green-100",
    textClass: "text-green-800",
    borderClass: "border-green-200",
    icon: <CheckCircle className="h-3 w-3" />
  },
  warning: {
    label: "Warnung",
    bgClass: "bg-yellow-100",
    textClass: "text-yellow-800",
    borderClass: "border-yellow-200",
    icon: <AlertTriangle className="h-3 w-3" />
  },
  danger: {
    label: "Fehler",
    bgClass: "bg-red-100",
    textClass: "text-red-800",
    borderClass: "border-red-200",
    icon: <XCircle className="h-3 w-3" />
  },
  critical: {
    label: "Kritisch",
    bgClass: "bg-red-200",
    textClass: "text-red-900",
    borderClass: "border-red-300",
    icon: <AlertCircle className="h-3 w-3" />
  },
  info: {
    label: "Info",
    bgClass: "bg-blue-100",
    textClass: "text-blue-800",
    borderClass: "border-blue-200",
    icon: <Info className="h-3 w-3" />
  },
  neutral: {
    label: "Neutral",
    bgClass: "bg-gray-100",
    textClass: "text-gray-600",
    borderClass: "border-gray-200",
    icon: <Minus className="h-3 w-3" />
  }
}

/**
 * StatusBadge - Einheitliche Status-Badge-Komponente
 *
 * Zeigt einen Status mit Icon und farblicher Kennzeichnung an.
 * Unterstützt vordefinierte Status und generische Varianten.
 *
 * @example
 * <StatusBadge status="approved" />
 * <StatusBadge status="warning" label="Achtung" />
 * <StatusBadge status="pending" showIcon={false} />
 */
export function StatusBadge({
  status,
  label,
  showIcon = true,
  className
}: StatusBadgeProps) {
  // Hole Konfiguration oder Fallback auf "default"
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.default

  return (
    <Badge
      className={cn(
        config.bgClass,
        config.textClass,
        config.borderClass,
        "flex items-center gap-1 w-fit font-medium",
        className
      )}
    >
      {showIcon && config.icon}
      {label || config.label}
    </Badge>
  )
}

/**
 * Hilfsfunktion: Prüft ob ein Status gültig ist
 */
export function isValidStatus(status: string): status is StatusVariant {
  return status in STATUS_CONFIG
}

/**
 * Hilfsfunktion: Gibt alle verfügbaren Status zurück
 */
export function getAvailableStatuses(): StatusVariant[] {
  return Object.keys(STATUS_CONFIG) as StatusVariant[]
}
