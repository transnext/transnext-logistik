"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { FahrerportalLayout } from "@/components/fahrerportal/FahrerportalLayout"
import {
  Upload,
  FileText,
  Receipt,
  BarChart3,
  Car,
  CheckCircle,
  Clock,
  XCircle,
  AlertTriangle,
  ArrowRight,
  Wallet,
  CalendarCheck
} from "lucide-react"
import { getCurrentUser, canAccessFahrerportal, getArbeitsnachweiseByUser, getAuslagennachweiseByUser } from "@/lib/api"

interface StatusCounts {
  arbeitsnachweise: {
    total: number
    pending: number
    approved: number
    rejected: number
  }
  auslagen: {
    total: number
    pending: number
    approved: number
    rejected: number
    paid: number
  }
}

export default function FahrerportalDashboard() {
  const router = useRouter()
  const [fahrerName, setFahrerName] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [statusCounts, setStatusCounts] = useState<StatusCounts>({
    arbeitsnachweise: { total: 0, pending: 0, approved: 0, rejected: 0 },
    auslagen: { total: 0, pending: 0, approved: 0, rejected: 0, paid: 0 }
  })

  useEffect(() => {
    checkAuthAndLoad()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const checkAuthAndLoad = async () => {
    try {
      const user = await getCurrentUser()
      if (!user) {
        router.push("/fahrerportal")
        return
      }

      // Nutze die neue Zugriffsprüfung (erlaubt Admin/GF mit Fahrer-Datensatz)
      const accessResult = await canAccessFahrerportal(user.id)

      if (!accessResult.canAccess) {
        console.log("Fahrerportal-Zugang verweigert:", accessResult.reason)
        router.push("/fahrerportal")
        return
      }

      // Fahrername aus Fahrer-Datensatz
      const name = accessResult.fahrer
        ? `${accessResult.fahrer.vorname} ${accessResult.fahrer.nachname}`
        : 'Fahrer'
      setFahrerName(name)

      // Lade Status-Counts
      await loadStatusCounts(user.id)
      setIsLoading(false)
    } catch (error) {
      console.error("Auth Fehler:", error)
      router.push("/fahrerportal")
    }
  }

  const loadStatusCounts = async (userId: string) => {
    try {
      const [arbeitsnachweise, auslagen] = await Promise.all([
        getArbeitsnachweiseByUser(userId),
        getAuslagennachweiseByUser(userId)
      ])

      // Aktueller Monat
      const now = new Date()
      const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

      // Filter auf aktuellen Monat
      const anThisMonth = arbeitsnachweise.filter(a => a.datum.startsWith(currentMonth))
      const auslagenThisMonth = auslagen.filter(a => a.datum.startsWith(currentMonth))

      setStatusCounts({
        arbeitsnachweise: {
          total: anThisMonth.length,
          pending: anThisMonth.filter(a => a.status === 'pending').length,
          approved: anThisMonth.filter(a => a.status === 'approved').length,
          rejected: anThisMonth.filter(a => a.status === 'rejected').length
        },
        auslagen: {
          total: auslagenThisMonth.length,
          pending: auslagenThisMonth.filter(a => a.status === 'pending').length,
          approved: auslagenThisMonth.filter(a => a.status === 'approved').length,
          rejected: auslagenThisMonth.filter(a => a.status === 'rejected').length,
          paid: auslagenThisMonth.filter(a => a.status === 'paid' || a.status === 'billed').length
        }
      })
    } catch (error) {
      console.error("Fehler beim Laden der Status-Counts:", error)
    }
  }

  const formatDate = () => {
    return new Date().toLocaleDateString('de-DE', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  }

  const quickActions = [
    {
      title: "Arbeitsnachweis",
      description: "Tour hochladen",
      icon: Upload,
      href: "/fahrerportal/arbeitsnachweis",
      color: "bg-blue-500",
      hoverColor: "hover:bg-blue-600"
    },
    {
      title: "Auslage",
      description: "Beleg einreichen",
      icon: Receipt,
      href: "/fahrerportal/auslagennachweis",
      color: "bg-emerald-500",
      hoverColor: "hover:bg-emerald-600"
    }
  ]

  const menuItems = [
    {
      title: "Meine Touren",
      description: "Zugewiesene Überführungen",
      icon: Car,
      href: "/fahrerportal/touren",
      iconBg: "bg-sky-50",
      iconColor: "text-sky-600"
    },
    {
      title: "Monatsabrechnung",
      description: "Touren & Verdienst",
      icon: BarChart3,
      href: "/fahrerportal/monatsabrechnung",
      iconBg: "bg-violet-50",
      iconColor: "text-violet-600"
    },
    {
      title: "Auslagenübersicht",
      description: "Erstattungsstatus",
      icon: Wallet,
      href: "/fahrerportal/auslagenabrechnung",
      iconBg: "bg-amber-50",
      iconColor: "text-amber-600"
    },
    {
      title: "Verfügbarkeit",
      description: "Arbeitszeiten melden",
      icon: CalendarCheck,
      href: "/fahrerportal/verfuegbarkeit",
      iconBg: "bg-teal-50",
      iconColor: "text-teal-600"
    }
  ]

  if (isLoading) {
    return (
      <FahrerportalLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-blue" />
        </div>
      </FahrerportalLayout>
    )
  }

  const hasRejected = statusCounts.arbeitsnachweise.rejected > 0 || statusCounts.auslagen.rejected > 0
  const hasPending = statusCounts.arbeitsnachweise.pending > 0 || statusCounts.auslagen.pending > 0

  return (
    <FahrerportalLayout title="Dashboard">
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 max-w-4xl">
        {/* Begrüßung */}
        <div className="mb-5 sm:mb-6">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
            Hallo, {fahrerName.split(' ')[0]}!
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">{formatDate()}</p>
        </div>

        {/* Hinweis bei abgelehnten Nachweisen */}
        {hasRejected && (
          <Card className="mb-4 border-red-200 bg-red-50/50">
            <CardContent className="p-4 flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-900">Abgelehnte Nachweise</p>
                <p className="text-sm text-red-700">
                  {statusCounts.arbeitsnachweise.rejected > 0 && (
                    <span>{statusCounts.arbeitsnachweise.rejected} Arbeitsnachweis(e) </span>
                  )}
                  {statusCounts.arbeitsnachweise.rejected > 0 && statusCounts.auslagen.rejected > 0 && "und "}
                  {statusCounts.auslagen.rejected > 0 && (
                    <span>{statusCounts.auslagen.rejected} Auslage(n) </span>
                  )}
                  wurden abgelehnt. Bitte prüfen.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Schnellaktionen */}
        <div className="grid grid-cols-2 gap-3 mb-5 sm:mb-6">
          {quickActions.map((action) => (
            <Link key={action.href} href={action.href}>
              <Button
                className={`w-full h-auto py-4 sm:py-5 flex flex-col items-center gap-1.5 ${action.color} ${action.hoverColor} text-white shadow-md transition-all hover:shadow-lg active:scale-[0.98]`}
              >
                <action.icon className="h-6 w-6 sm:h-7 sm:w-7" />
                <span className="text-sm sm:text-base font-semibold">{action.title}</span>
                <span className="text-xs opacity-90">{action.description}</span>
              </Button>
            </Link>
          ))}
        </div>

        {/* Status-Karten */}
        <div className="mb-5 sm:mb-6">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Aktueller Monat
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Arbeitsnachweise eingereicht */}
            <Card className="border-gray-100">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center gap-2 mb-1">
                  <FileText className="h-4 w-4 text-gray-400" />
                  <span className="text-xs text-gray-500">Touren</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">{statusCounts.arbeitsnachweise.total}</p>
                <p className="text-xs text-gray-500">eingereicht</p>
              </CardContent>
            </Card>

            {/* Genehmigt */}
            <Card className="border-emerald-100 bg-emerald-50/30">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle className="h-4 w-4 text-emerald-600" />
                  <span className="text-xs text-emerald-600">Genehmigt</span>
                </div>
                <p className="text-2xl font-bold text-emerald-700">{statusCounts.arbeitsnachweise.approved}</p>
                <p className="text-xs text-gray-500">Touren</p>
              </CardContent>
            </Card>

            {/* Ausstehend */}
            <Card className={`${hasPending ? 'border-amber-200 bg-amber-50/30' : 'border-gray-100'}`}>
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className={`h-4 w-4 ${hasPending ? 'text-amber-600' : 'text-gray-400'}`} />
                  <span className={`text-xs ${hasPending ? 'text-amber-600' : 'text-gray-500'}`}>Offen</span>
                </div>
                <p className={`text-2xl font-bold ${hasPending ? 'text-amber-700' : 'text-gray-900'}`}>
                  {statusCounts.arbeitsnachweise.pending}
                </p>
                <p className="text-xs text-gray-500">in Prüfung</p>
              </CardContent>
            </Card>

            {/* Auslagen */}
            <Card className="border-gray-100">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Receipt className="h-4 w-4 text-gray-400" />
                  <span className="text-xs text-gray-500">Auslagen</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">{statusCounts.auslagen.total}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  {statusCounts.auslagen.paid > 0 && (
                    <Badge className="bg-purple-100 text-purple-700 border-0 text-[10px] px-1.5 py-0">
                      {statusCounts.auslagen.paid} erstattet
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Weitere Aktionen */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
            Weitere Funktionen
          </h3>
          {menuItems.map((item) => (
            <Link key={item.href} href={item.href}>
              <Card className="hover:shadow-md transition-all hover:border-primary-blue/30 cursor-pointer group">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className={`p-2.5 rounded-lg ${item.iconBg} ${item.iconColor} group-hover:scale-105 transition-transform`}>
                    <item.icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900">{item.title}</p>
                    <p className="text-sm text-gray-500">{item.description}</p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-gray-300 group-hover:text-primary-blue group-hover:translate-x-1 transition-all" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {/* Info Box */}
        <Card className="mt-5 sm:mt-6 bg-blue-50/50 border-blue-100">
          <CardContent className="p-4 space-y-1.5 text-sm text-gray-600">
            <p className="font-medium text-primary-blue">Wichtige Hinweise</p>
            <p>• Arbeitsnachweise bitte zeitnah hochladen</p>
            <p>• Originalbelege an: <span className="font-medium">Herner Str. 299A, 44809 Bochum</span></p>
            <p>• Fragen? <span className="font-medium text-primary-blue">dispo@transnext.de</span></p>
          </CardContent>
        </Card>
      </div>
    </FahrerportalLayout>
  )
}
