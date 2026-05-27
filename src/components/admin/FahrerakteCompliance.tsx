"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Shield,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  CreditCard,
  FileText,
  Car,
  User,
  RefreshCw
} from "lucide-react"
import { calculateComplianceStatus, type ComplianceStatus } from "@/lib/fahrer-management-api"
import { cn } from "@/lib/utils"

interface FahrerakteComplianceProps {
  fahrerId: string
  isAdmin: boolean
  onRefresh?: () => void
}

export function FahrerakteCompliance({ fahrerId, isAdmin, onRefresh }: FahrerakteComplianceProps) {
  const [status, setStatus] = useState<ComplianceStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadComplianceStatus()
  }, [fahrerId])

  const loadComplianceStatus = async () => {
    setIsLoading(true)
    try {
      const complianceStatus = await calculateComplianceStatus(fahrerId)
      setStatus(complianceStatus)
    } catch (err) {
      console.error("Fehler beim Laden des Compliance-Status:", err)
    } finally {
      setIsLoading(false)
    }
  }

  if (!isAdmin) {
    return null
  }

  if (isLoading) {
    return (
      <Card className="border-gray-100">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="h-5 w-5 text-gray-400" />
            Compliance-Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-6">
            <RefreshCw className="h-5 w-5 animate-spin text-gray-400" />
            <span className="ml-2 text-sm text-gray-500">Lade Status...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!status) {
    return null
  }

  const getStatusColor = (gesamtStatus: ComplianceStatus['gesamtStatus']) => {
    switch (gesamtStatus) {
      case 'vollstaendig':
        return 'bg-emerald-50 border-emerald-200 text-emerald-700'
      case 'pruefen':
        return 'bg-amber-50 border-amber-200 text-amber-700'
      case 'abgelaufen':
        return 'bg-red-50 border-red-200 text-red-700'
      default:
        return 'bg-gray-50 border-gray-200 text-gray-700'
    }
  }

  const getStatusIcon = (gesamtStatus: ComplianceStatus['gesamtStatus']) => {
    switch (gesamtStatus) {
      case 'vollstaendig':
        return <CheckCircle className="h-4 w-4 text-emerald-600" />
      case 'pruefen':
        return <Clock className="h-4 w-4 text-amber-600" />
      case 'abgelaufen':
        return <AlertTriangle className="h-4 w-4 text-red-600" />
      default:
        return <XCircle className="h-4 w-4 text-gray-600" />
    }
  }

  const getStatusLabel = (gesamtStatus: ComplianceStatus['gesamtStatus']) => {
    switch (gesamtStatus) {
      case 'vollstaendig':
        return 'Vollständig'
      case 'pruefen':
        return 'Prüfen'
      case 'abgelaufen':
        return 'Abgelaufen'
      default:
        return 'Unvollständig'
    }
  }

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return null
    return new Date(dateStr).toLocaleDateString('de-DE')
  }

  return (
    <Card className="border-gray-100">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="h-5 w-5 text-gray-400" />
              Compliance-Status
            </CardTitle>
            <CardDescription>Dokumenten- und Statusübersicht</CardDescription>
          </div>
          <Badge className={cn("border", getStatusColor(status.gesamtStatus))}>
            {getStatusIcon(status.gesamtStatus)}
            <span className="ml-1">{getStatusLabel(status.gesamtStatus)}</span>
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {/* Warnungen */}
        {(status.offeneDokumente > 0 || status.ablaufendeDokumente > 0) && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm">
            <div className="flex items-center gap-2 text-amber-700 font-medium">
              <AlertTriangle className="h-4 w-4" />
              Handlungsbedarf
            </div>
            <ul className="mt-1 ml-6 text-amber-600 text-xs list-disc">
              {status.offeneDokumente > 0 && (
                <li>{status.offeneDokumente} Dokument{status.offeneDokumente > 1 ? 'e' : ''} offen/zu prüfen</li>
              )}
              {status.ablaufendeDokumente > 0 && (
                <li>{status.ablaufendeDokumente} Dokument{status.ablaufendeDokumente > 1 ? 'e' : ''} laufen bald ab</li>
              )}
            </ul>
          </div>
        )}

        {/* Status-Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Fahrer-Status */}
          <div className={cn(
            "p-3 rounded-lg border",
            status.fahrerStatus.aktiv && !status.fahrerStatus.archiviert
              ? "bg-emerald-50 border-emerald-200"
              : status.fahrerStatus.archiviert
              ? "bg-orange-50 border-orange-200"
              : "bg-gray-50 border-gray-200"
          )}>
            <div className="flex items-center gap-2 mb-1">
              <User className={cn(
                "h-4 w-4",
                status.fahrerStatus.aktiv && !status.fahrerStatus.archiviert
                  ? "text-emerald-600"
                  : status.fahrerStatus.archiviert
                  ? "text-orange-600"
                  : "text-gray-500"
              )} />
              <span className="text-xs text-gray-600">Fahrer</span>
            </div>
            <p className={cn(
              "text-sm font-semibold",
              status.fahrerStatus.aktiv && !status.fahrerStatus.archiviert
                ? "text-emerald-700"
                : status.fahrerStatus.archiviert
                ? "text-orange-700"
                : "text-gray-600"
            )}>
              {status.fahrerStatus.archiviert
                ? "Archiviert"
                : status.fahrerStatus.aktiv
                ? "Aktiv"
                : "Inaktiv"}
            </p>
          </div>

          {/* Führerschein */}
          <div className={cn(
            "p-3 rounded-lg border",
            status.fuehrerschein.abgelaufen
              ? "bg-red-50 border-red-200"
              : status.fuehrerschein.geprueft
              ? "bg-emerald-50 border-emerald-200"
              : status.fuehrerschein.vorhanden
              ? "bg-amber-50 border-amber-200"
              : "bg-gray-50 border-gray-200"
          )}>
            <div className="flex items-center gap-2 mb-1">
              <Car className={cn(
                "h-4 w-4",
                status.fuehrerschein.abgelaufen
                  ? "text-red-600"
                  : status.fuehrerschein.geprueft
                  ? "text-emerald-600"
                  : status.fuehrerschein.vorhanden
                  ? "text-amber-600"
                  : "text-gray-500"
              )} />
              <span className="text-xs text-gray-600">Führerschein</span>
            </div>
            <p className={cn(
              "text-sm font-semibold",
              status.fuehrerschein.abgelaufen
                ? "text-red-700"
                : status.fuehrerschein.geprueft
                ? "text-emerald-700"
                : status.fuehrerschein.vorhanden
                ? "text-amber-700"
                : "text-gray-600"
            )}>
              {status.fuehrerschein.abgelaufen
                ? "Abgelaufen"
                : status.fuehrerschein.geprueft
                ? "Geprüft"
                : status.fuehrerschein.vorhanden
                ? "Prüfen"
                : "Fehlt"}
            </p>
            {status.fuehrerschein.ablaufdatum && (
              <p className="text-[10px] text-gray-500 mt-0.5">
                Ablauf: {formatDate(status.fuehrerschein.ablaufdatum)}
              </p>
            )}
          </div>

          {/* Ausweis */}
          <div className={cn(
            "p-3 rounded-lg border",
            status.ausweis.abgelaufen
              ? "bg-red-50 border-red-200"
              : status.ausweis.geprueft
              ? "bg-emerald-50 border-emerald-200"
              : status.ausweis.vorhanden
              ? "bg-amber-50 border-amber-200"
              : "bg-gray-50 border-gray-200"
          )}>
            <div className="flex items-center gap-2 mb-1">
              <CreditCard className={cn(
                "h-4 w-4",
                status.ausweis.abgelaufen
                  ? "text-red-600"
                  : status.ausweis.geprueft
                  ? "text-emerald-600"
                  : status.ausweis.vorhanden
                  ? "text-amber-600"
                  : "text-gray-500"
              )} />
              <span className="text-xs text-gray-600">Ausweis</span>
            </div>
            <p className={cn(
              "text-sm font-semibold",
              status.ausweis.abgelaufen
                ? "text-red-700"
                : status.ausweis.geprueft
                ? "text-emerald-700"
                : status.ausweis.vorhanden
                ? "text-amber-700"
                : "text-gray-600"
            )}>
              {status.ausweis.abgelaufen
                ? "Abgelaufen"
                : status.ausweis.geprueft
                ? "Geprüft"
                : status.ausweis.vorhanden
                ? "Prüfen"
                : "Fehlt"}
            </p>
            {status.ausweis.ablaufdatum && (
              <p className="text-[10px] text-gray-500 mt-0.5">
                Ablauf: {formatDate(status.ausweis.ablaufdatum)}
              </p>
            )}
          </div>

          {/* UVV/Schulung */}
          <div className={cn(
            "p-3 rounded-lg border",
            status.uvv.abgelaufen
              ? "bg-red-50 border-red-200"
              : status.uvv.geprueft
              ? "bg-emerald-50 border-emerald-200"
              : status.uvv.vorhanden
              ? "bg-amber-50 border-amber-200"
              : "bg-gray-50 border-gray-200"
          )}>
            <div className="flex items-center gap-2 mb-1">
              <Shield className={cn(
                "h-4 w-4",
                status.uvv.abgelaufen
                  ? "text-red-600"
                  : status.uvv.geprueft
                  ? "text-emerald-600"
                  : status.uvv.vorhanden
                  ? "text-amber-600"
                  : "text-gray-500"
              )} />
              <span className="text-xs text-gray-600">UVV</span>
            </div>
            <p className={cn(
              "text-sm font-semibold",
              status.uvv.abgelaufen
                ? "text-red-700"
                : status.uvv.geprueft
                ? "text-emerald-700"
                : status.uvv.vorhanden
                ? "text-amber-700"
                : "text-gray-600"
            )}>
              {status.uvv.abgelaufen
                ? "Abgelaufen"
                : status.uvv.geprueft
                ? "Geprüft"
                : status.uvv.vorhanden
                ? "Prüfen"
                : "Fehlt"}
            </p>
            {status.uvv.ablaufdatum && (
              <p className="text-[10px] text-gray-500 mt-0.5">
                Ablauf: {formatDate(status.uvv.ablaufdatum)}
              </p>
            )}
          </div>

          {/* Vertrag */}
          <div className={cn(
            "p-3 rounded-lg border",
            status.vertrag.vorhanden
              ? "bg-emerald-50 border-emerald-200"
              : "bg-gray-50 border-gray-200"
          )}>
            <div className="flex items-center gap-2 mb-1">
              <FileText className={cn(
                "h-4 w-4",
                status.vertrag.vorhanden
                  ? "text-emerald-600"
                  : "text-gray-500"
              )} />
              <span className="text-xs text-gray-600">Vertrag</span>
            </div>
            <p className={cn(
              "text-sm font-semibold",
              status.vertrag.vorhanden
                ? "text-emerald-700"
                : "text-gray-600"
            )}>
              {status.vertrag.vorhanden ? "Vorhanden" : "Fehlt"}
            </p>
          </div>

          {/* Tankkarte */}
          <div className={cn(
            "p-3 rounded-lg border",
            status.tankkarte.aktiv
              ? "bg-emerald-50 border-emerald-200"
              : status.tankkarte.vorhanden
              ? "bg-amber-50 border-amber-200"
              : "bg-gray-50 border-gray-200"
          )}>
            <div className="flex items-center gap-2 mb-1">
              <CreditCard className={cn(
                "h-4 w-4",
                status.tankkarte.aktiv
                  ? "text-emerald-600"
                  : status.tankkarte.vorhanden
                  ? "text-amber-600"
                  : "text-gray-500"
              )} />
              <span className="text-xs text-gray-600">Tankkarte</span>
            </div>
            <p className={cn(
              "text-sm font-semibold",
              status.tankkarte.aktiv
                ? "text-emerald-700"
                : status.tankkarte.vorhanden
                ? "text-amber-700"
                : "text-gray-600"
            )}>
              {status.tankkarte.aktiv
                ? "Aktiv"
                : status.tankkarte.vorhanden
                ? "Inaktiv"
                : "Keine"}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
