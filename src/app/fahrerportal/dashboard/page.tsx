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
  CalendarCheck,
  Play,
  MapPin,
  Zap,
  Truck,
  CalendarClock,
  CalendarX,
  FileX,
  CircleAlert,
  CheckCircle2,
  Megaphone
} from "lucide-react"
import { getCurrentUser, canAccessFahrerportal, getArbeitsnachweiseByUser, getAuslagennachweiseByUser } from "@/lib/api"
import { getFahrerTouren, formatTourStatus, getTourStatusColor, formatFahrzeugart } from "@/lib/touren-api"
import { calculateFahrerAlerts, getAlertColors, type FahrerAlert, type FahrerAlertsResult } from "@/lib/fahrerportal-alerts"
import { getFahrerAnnouncements, type Announcement } from "@/lib/announcements-api"
import type { Tour, TourStatus } from "@/lib/supabase"

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

// Alert Icon Komponente
function AlertIcon({ type, className }: { type: string; className?: string }) {
  switch (type) {
    case 'verfuegbarkeit_fehlt':
      return <CalendarClock className={className} />
    case 'verfuegbarkeit_deadline_ueberschritten':
      return <CalendarX className={className} />
    case 'tour_offen':
      return <Car className={className} />
    case 'protokoll_offen':
      return <FileText className={className} />
    case 'arbeitsnachweis_fehlt':
      return <Upload className={className} />
    case 'arbeitsnachweis_abgelehnt':
      return <FileX className={className} />
    case 'auslage_abgelehnt':
      return <Receipt className={className} />
    default:
      return <CircleAlert className={className} />
  }
}

export default function FahrerportalDashboard() {
  const router = useRouter()
  const [fahrerName, setFahrerName] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [offeneTouren, setOffeneTouren] = useState<Tour[]>([])
  const [statusCounts, setStatusCounts] = useState<StatusCounts>({
    arbeitsnachweise: { total: 0, pending: 0, approved: 0, rejected: 0 },
    auslagen: { total: 0, pending: 0, approved: 0, rejected: 0, paid: 0 }
  })
  const [alerts, setAlerts] = useState<FahrerAlertsResult>({
    alerts: [],
    summary: { high: 0, medium: 0, total: 0 }
  })
  const [announcements, setAnnouncements] = useState<Announcement[]>([])

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

      const accessResult = await canAccessFahrerportal(user.id)

      if (!accessResult.canAccess) {
        console.log("Fahrerportal-Zugang verweigert:", accessResult.reason)
        router.push("/fahrerportal")
        return
      }

      const name = accessResult.fahrer
        ? `${accessResult.fahrer.vorname} ${accessResult.fahrer.nachname}`
        : 'Fahrer'
      setFahrerName(name)

      // Lade offene Touren, Status-Counts, Alerts und Hinweise parallel
      await Promise.all([
        loadOffeneTouren(user.id),
        loadStatusCounts(user.id),
        loadAlerts(user.id),
        loadAnnouncements()
      ])
      setIsLoading(false)
    } catch (error) {
      console.error("Auth Fehler:", error)
      router.push("/fahrerportal")
    }
  }

  const loadOffeneTouren = async (userId: string) => {
    try {
      const touren = await getFahrerTouren(userId)
      // Sortiere: Abgabe offen zuerst, dann Übernahme offen
      const sorted = touren.sort((a, b) => {
        if (a.status === 'abgabe_offen' && b.status !== 'abgabe_offen') return -1
        if (b.status === 'abgabe_offen' && a.status !== 'abgabe_offen') return 1
        return 0
      })
      setOffeneTouren(sorted.slice(0, 3)) // Max 3 auf Dashboard
    } catch (error) {
      console.error("Fehler beim Laden der Touren:", error)
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

  const loadAlerts = async (userId: string) => {
    try {
      const result = await calculateFahrerAlerts(userId)
      setAlerts(result)
    } catch (error) {
      console.error("Fehler beim Laden der Alerts:", error)
    }
  }

  const loadAnnouncements = async () => {
    try {
      const result = await getFahrerAnnouncements()
      // Sortiere nach Priorität und Datum, max 3 anzeigen
      const sorted = result.sort((a, b) => {
        const priorityOrder: Record<string, number> = { critical: 0, important: 1, normal: 2 }
        if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
          return priorityOrder[a.priority] - priorityOrder[b.priority]
        }
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      })
      setAnnouncements(sorted.slice(0, 3))
    } catch (error) {
      console.error("Fehler beim Laden der Hinweise:", error)
    }
  }

  const getAnnouncementStyles = (priority: string) => {
    switch (priority) {
      case 'critical':
        return {
          card: 'border-red-200 bg-red-50/50',
          icon: 'text-red-600',
          title: 'text-red-900',
          badge: 'bg-red-100 text-red-700 border-red-200'
        }
      case 'important':
        return {
          card: 'border-amber-200 bg-amber-50/50',
          icon: 'text-amber-600',
          title: 'text-amber-900',
          badge: 'bg-amber-100 text-amber-700 border-amber-200'
        }
      default:
        return {
          card: 'border-blue-200 bg-blue-50/30',
          icon: 'text-blue-600',
          title: 'text-gray-900',
          badge: 'bg-blue-100 text-blue-700 border-blue-200'
        }
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

  const getFahrzeugIcon = (art: string) => {
    switch (art) {
      case 'e-auto':
        return <Zap className="h-4 w-4 text-green-600" />
      case 'transporter':
        return <Truck className="h-4 w-4 text-gray-600" />
      default:
        return <Car className="h-4 w-4 text-blue-600" />
    }
  }

  const getProtocolAction = (tour: Tour) => {
    if (tour.status === 'abgabe_offen') {
      return {
        label: "Abgabe",
        href: `/fahrerportal/touren/protokoll?tourId=${tour.id}&typ=abgabe`,
        color: "bg-blue-600 hover:bg-blue-700"
      }
    }
    return {
      label: "Übernahme",
      href: `/fahrerportal/touren/protokoll?tourId=${tour.id}&typ=uebernahme`,
      color: "bg-green-600 hover:bg-green-700"
    }
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
      iconColor: "text-sky-600",
      badge: offeneTouren.length > 0 ? offeneTouren.length : undefined
    },
    {
      title: "Statistiken",
      description: "Arbeitsnachweise & Leistung",
      icon: BarChart3,
      href: "/fahrerportal/statistiken",
      iconBg: "bg-violet-50",
      iconColor: "text-violet-600"
    },
    {
      title: "Monatsabrechnung",
      description: "Touren & Verdienst",
      icon: FileText,
      href: "/fahrerportal/monatsabrechnung",
      iconBg: "bg-indigo-50",
      iconColor: "text-indigo-600"
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

        {/* Offene Aufgaben / Alerts */}
        {alerts.summary.total > 0 ? (
          <Card className="mb-5 border-gray-200">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <CircleAlert className="h-5 w-5 text-gray-600" />
                <CardTitle className="text-base font-semibold text-gray-900">
                  Offene Aufgaben
                </CardTitle>
                {alerts.summary.high > 0 && (
                  <Badge className="bg-red-100 text-red-700 border-red-200 text-xs">
                    {alerts.summary.high} dringend
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {alerts.alerts.map((alert) => {
                const colors = getAlertColors(alert.priority)
                return (
                  <div
                    key={alert.id}
                    className={`${colors.bg} ${colors.border} border rounded-lg p-3 flex items-start gap-3`}
                  >
                    <div className={`flex-shrink-0 mt-0.5 ${colors.icon}`}>
                      <AlertIcon type={alert.type} className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`font-medium text-sm ${colors.text}`}>
                        {alert.title}
                      </p>
                      <p className="text-xs text-gray-600 mt-0.5">
                        {alert.message}
                      </p>
                    </div>
                    <Link href={alert.actionHref} className="flex-shrink-0">
                      <Button
                        size="sm"
                        variant={alert.priority === 'high' ? 'default' : 'outline'}
                        className={alert.priority === 'high' ? 'bg-red-600 hover:bg-red-700 text-white' : ''}
                      >
                        {alert.actionLabel}
                      </Button>
                    </Link>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        ) : (
          <Card className="mb-5 border-emerald-200 bg-emerald-50/50">
            <CardContent className="p-4 flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-emerald-900">Alles erledigt!</p>
                <p className="text-sm text-emerald-700">
                  Aktuell sind keine offenen Aufgaben vorhanden.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Hinweise / Announcements */}
        {announcements.length > 0 && (
          <div className="mb-5">
            {announcements.map((announcement) => {
              const styles = getAnnouncementStyles(announcement.priority)
              return (
                <Card key={announcement.id} className={`mb-2 ${styles.card}`}>
                  <CardContent className="p-3 flex items-start gap-3">
                    <Megaphone className={`h-5 w-5 mt-0.5 flex-shrink-0 ${styles.icon}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className={`font-semibold text-sm ${styles.title}`}>{announcement.title}</span>
                        <Badge className={`text-xs ${styles.badge}`}>
                          {announcement.priority === "critical"
                            ? "Kritisch"
                            : announcement.priority === "important"
                            ? "Wichtig"
                            : "Hinweis"}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-700">{announcement.content}</p>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}

        {/* Offene Touren - Wichtigste Aktion */}
        {offeneTouren.length > 0 && (
          <Card className="mb-5 border-primary-blue/20 bg-blue-50/30">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
                  <Car className="h-5 w-5 text-primary-blue" />
                  Offene Touren
                </CardTitle>
                <Link href="/fahrerportal/touren">
                  <Button variant="ghost" size="sm" className="text-primary-blue">
                    Alle anzeigen
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {offeneTouren.map((tour) => {
                const action = getProtocolAction(tour)
                const colors = getTourStatusColor(tour.status)
                return (
                  <div
                    key={tour.id}
                    className="bg-white rounded-lg border border-gray-200 p-3 hover:shadow-sm transition-shadow"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <div className="flex-shrink-0 mt-0.5">
                          {getFahrzeugIcon(tour.fahrzeugart)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-gray-900">Tour {tour.tour_nummer}</span>
                            <Badge variant="outline" className={`${colors.bg} ${colors.text} ${colors.border} text-xs`}>
                              {formatTourStatus(tour.status)}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <MapPin className="h-3 w-3 text-green-600" />
                            <span className="truncate">{tour.abholort_ort}</span>
                            <span>→</span>
                            <MapPin className="h-3 w-3 text-red-600" />
                            <span className="truncate">{tour.abgabeort_ort}</span>
                          </div>
                        </div>
                      </div>
                      <Link href={action.href} className="flex-shrink-0">
                        <Button size="sm" className={`${action.color} text-white`}>
                          <Play className="h-3 w-3 mr-1" />
                          {action.label}
                        </Button>
                      </Link>
                    </div>
                  </div>
                )
              })}
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
                  <span className="text-xs text-gray-500">Nachweise</span>
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
                <p className="text-xs text-gray-500">Nachweise</p>
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
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900">{item.title}</p>
                      {item.badge && (
                        <Badge className="bg-primary-blue text-white text-xs px-1.5 py-0">
                          {item.badge}
                        </Badge>
                      )}
                    </div>
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
