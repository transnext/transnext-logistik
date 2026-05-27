"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { FileText, Inbox, Search, Users, Car, Euro, Package } from "lucide-react"

interface EmptyStateProps {
  /** Titel des Empty States */
  title: string
  /** Beschreibung (optional) */
  description?: string
  /** Icon (React-Node oder vordefinierter Typ) */
  icon?: React.ReactNode | "document" | "inbox" | "search" | "users" | "car" | "euro" | "package"
  /** Aktion (z.B. Button zum Hinzufügen) */
  action?: React.ReactNode
  /** Zusätzliche CSS-Klassen */
  className?: string
  /** Größe des Icons */
  iconSize?: "sm" | "md" | "lg"
}

// Vordefinierte Icons
const PRESET_ICONS: Record<string, React.ReactNode> = {
  document: <FileText className="h-16 w-16 text-gray-400" />,
  inbox: <Inbox className="h-16 w-16 text-gray-400" />,
  search: <Search className="h-16 w-16 text-gray-400" />,
  users: <Users className="h-16 w-16 text-gray-400" />,
  car: <Car className="h-16 w-16 text-gray-400" />,
  euro: <Euro className="h-16 w-16 text-gray-400" />,
  package: <Package className="h-16 w-16 text-gray-400" />
}

// Icon-Größen
const ICON_SIZES = {
  sm: "h-12 w-12",
  md: "h-16 w-16",
  lg: "h-20 w-20"
}

/**
 * EmptyState - Einheitlicher Empty State für leere Listen/Tabellen
 *
 * Zeigt einen freundlichen Hinweis wenn keine Daten vorhanden sind.
 *
 * @example
 * <EmptyState
 *   title="Keine Touren gefunden"
 *   description="Erstellen Sie Ihre erste Tour"
 *   icon="car"
 *   action={<Button>Tour erstellen</Button>}
 * />
 *
 * @example
 * <EmptyState
 *   title="Keine Ergebnisse"
 *   description="Versuchen Sie andere Suchbegriffe"
 *   icon={<CustomIcon />}
 * />
 */
export function EmptyState({
  title,
  description,
  icon,
  action,
  className,
  iconSize = "md"
}: EmptyStateProps) {
  // Bestimme das anzuzeigende Icon
  const renderIcon = () => {
    if (!icon) {
      // Standard-Icon
      return <Inbox className={cn(ICON_SIZES[iconSize], "text-gray-400")} />
    }

    if (typeof icon === "string" && icon in PRESET_ICONS) {
      // Vordefiniertes Icon mit angepasster Größe
      const IconComponent = PRESET_ICONS[icon]
      return React.cloneElement(IconComponent as React.ReactElement, {
        className: cn(ICON_SIZES[iconSize], "text-gray-400")
      })
    }

    // Custom Icon
    return icon
  }

  return (
    <div className={cn("text-center py-12", className)}>
      <div className="mx-auto mb-4 flex justify-center">
        {renderIcon()}
      </div>

      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        {title}
      </h3>

      {description && (
        <p className="text-gray-600 mb-6 max-w-md mx-auto">
          {description}
        </p>
      )}

      {action && (
        <div className="flex justify-center">
          {action}
        </div>
      )}
    </div>
  )
}

/**
 * EmptyState für Suchergebnisse
 */
export function SearchEmptyState({
  searchTerm,
  className
}: {
  searchTerm?: string
  className?: string
}) {
  return (
    <EmptyState
      title="Keine Ergebnisse gefunden"
      description={
        searchTerm
          ? `Keine Treffer für "${searchTerm}". Versuchen Sie andere Suchbegriffe.`
          : "Versuchen Sie andere Filter- oder Sucheinstellungen."
      }
      icon="search"
      className={className}
    />
  )
}

/**
 * EmptyState für gefilterte Listen
 */
export function FilterEmptyState({
  entityName = "Einträge",
  className
}: {
  entityName?: string
  className?: string
}) {
  return (
    <EmptyState
      title={`Keine ${entityName} gefunden`}
      description="Versuchen Sie andere Filtereinstellungen oder setzen Sie die Filter zurück."
      icon="search"
      className={className}
    />
  )
}
