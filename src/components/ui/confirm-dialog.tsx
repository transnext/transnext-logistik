"use client"

import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { AlertTriangle, Info, Trash2, CheckCircle } from "lucide-react"

interface ConfirmDialogProps {
  /** Dialog offen */
  open: boolean
  /** Dialog-Titel */
  title: string
  /** Beschreibung / Details */
  description?: string
  /** Label für Bestätigen-Button */
  confirmLabel?: string
  /** Label für Abbrechen-Button */
  cancelLabel?: string
  /** Destruktive Aktion (roter Button) */
  destructive?: boolean
  /** Callback bei Bestätigung */
  onConfirm: () => void
  /** Callback bei Abbruch */
  onCancel: () => void
  /** Typ des Dialogs (bestimmt Icon) */
  type?: "warning" | "danger" | "info" | "success"
  /** Loading-Zustand für Bestätigen-Button */
  loading?: boolean
  /** Zusätzliche CSS-Klassen für den Content */
  className?: string
}

// Icon-Konfigurationen
const DIALOG_ICONS = {
  warning: {
    icon: <AlertTriangle className="h-6 w-6" />,
    bgClass: "bg-yellow-100",
    textClass: "text-yellow-600"
  },
  danger: {
    icon: <Trash2 className="h-6 w-6" />,
    bgClass: "bg-red-100",
    textClass: "text-red-600"
  },
  info: {
    icon: <Info className="h-6 w-6" />,
    bgClass: "bg-blue-100",
    textClass: "text-blue-600"
  },
  success: {
    icon: <CheckCircle className="h-6 w-6" />,
    bgClass: "bg-green-100",
    textClass: "text-green-600"
  }
}

/**
 * ConfirmDialog - Wiederverwendbarer Bestätigungsdialog
 *
 * Für Aktionen die eine Benutzerbestätigung erfordern.
 *
 * @example
 * <ConfirmDialog
 *   open={showDelete}
 *   title="Tour löschen?"
 *   description="Diese Aktion kann nicht rückgängig gemacht werden."
 *   confirmLabel="Löschen"
 *   destructive
 *   onConfirm={handleDelete}
 *   onCancel={() => setShowDelete(false)}
 * />
 *
 * @example
 * <ConfirmDialog
 *   open={showSubmit}
 *   title="Änderungen speichern?"
 *   type="info"
 *   onConfirm={handleSave}
 *   onCancel={() => setShowSubmit(false)}
 * />
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Bestätigen",
  cancelLabel = "Abbrechen",
  destructive = false,
  onConfirm,
  onCancel,
  type = "warning",
  loading = false,
  className
}: ConfirmDialogProps) {
  // Bei destruktiven Aktionen automatisch "danger" Typ verwenden
  const effectiveType = destructive ? "danger" : type
  const iconConfig = DIALOG_ICONS[effectiveType]

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <DialogContent className={cn("sm:max-w-md", className)}>
        <DialogHeader>
          <div className="flex items-start gap-4">
            {/* Icon */}
            <div className={cn(
              "flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center",
              iconConfig.bgClass
            )}>
              <div className={iconConfig.textClass}>
                {iconConfig.icon}
              </div>
            </div>

            {/* Text */}
            <div className="flex-1">
              <DialogTitle className="text-lg font-semibold text-gray-900">
                {title}
              </DialogTitle>
              {description && (
                <DialogDescription className="mt-2 text-sm text-gray-600">
                  {description}
                </DialogDescription>
              )}
            </div>
          </div>
        </DialogHeader>

        <DialogFooter className="mt-6 flex gap-3 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={loading}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={destructive ? "destructive" : "default"}
            onClick={onConfirm}
            disabled={loading}
            className={!destructive ? "bg-primary-blue hover:bg-blue-700" : ""}
          >
            {loading ? "Wird ausgeführt..." : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/**
 * DeleteConfirmDialog - Vorkonfigurierter Dialog für Löschaktionen
 */
export function DeleteConfirmDialog({
  open,
  entityName = "Eintrag",
  entityDetails,
  onConfirm,
  onCancel,
  loading = false
}: {
  open: boolean
  entityName?: string
  entityDetails?: string
  onConfirm: () => void
  onCancel: () => void
  loading?: boolean
}) {
  return (
    <ConfirmDialog
      open={open}
      title={`${entityName} löschen?`}
      description={
        entityDetails
          ? `Möchten Sie "${entityDetails}" wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.`
          : `Möchten Sie diesen ${entityName} wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.`
      }
      confirmLabel="Löschen"
      cancelLabel="Abbrechen"
      destructive
      type="danger"
      onConfirm={onConfirm}
      onCancel={onCancel}
      loading={loading}
    />
  )
}

/**
 * SaveConfirmDialog - Vorkonfigurierter Dialog für Speicheraktionen
 */
export function SaveConfirmDialog({
  open,
  onConfirm,
  onCancel,
  loading = false
}: {
  open: boolean
  onConfirm: () => void
  onCancel: () => void
  loading?: boolean
}) {
  return (
    <ConfirmDialog
      open={open}
      title="Änderungen speichern?"
      description="Möchten Sie die vorgenommenen Änderungen speichern?"
      confirmLabel="Speichern"
      cancelLabel="Abbrechen"
      type="info"
      onConfirm={onConfirm}
      onCancel={onCancel}
      loading={loading}
    />
  )
}
