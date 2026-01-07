"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { TransNextLogo, TransNextIcon } from "@/components/ui/logo"
import {
  Upload,
  FileText,
  Receipt,
  BarChart3,
  LogOut,
  User
} from "lucide-react"
import { getCurrentUser, getUserProfile, signOut } from "@/lib/api"

export default function FahrerportalDashboard() {
  const router = useRouter()
  const [fahrerName, setFahrerName] = useState("")
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    checkAuth()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const checkAuth = async () => {
    try {
      const user = await getCurrentUser()

      if (!user) {
        router.push("/fahrerportal")
        return
      }

      const profile = await getUserProfile(user.id)

      if (profile.role !== 'fahrer') {
        router.push("/fahrerportal")
        return
      }

      setFahrerName(profile.full_name)
      setIsLoading(false)
    } catch (error) {
      console.error("Auth Fehler:", error)
      router.push("/fahrerportal")
    }
  }

  const handleLogout = async () => {
    try {
      await signOut()
      router.push("/fahrerportal")
    } catch (error) {
      console.error("Logout Fehler:", error)
    }
  }

  const menuItems = [
    {
      title: "Arbeitsnachweis hochladen",
      description: "Lade deine abgeschlossene Tour hoch",
      icon: Upload,
      href: "/fahrerportal/arbeitsnachweis",
      color: "text-blue-600"
    },
    {
      title: "Auslagennachweis hochladen",
      description: "Lade deine entstandenen Auslagen hoch",
      icon: Receipt,
      href: "/fahrerportal/auslagennachweis",
      color: "text-green-600"
    },
    {
      title: "Monatsabrechnung",
      description: "Übersicht aller Touren und Verdienst pro Monat",
      icon: BarChart3,
      href: "/fahrerportal/monatsabrechnung",
      color: "text-purple-600"
    },
    {
      title: "Auslagenabrechnung",
      description: "Übersicht aller Auslagen pro Monat",
      icon: FileText,
      href: "/fahrerportal/auslagenabrechnung",
      color: "text-orange-600"
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Header - Mobile Optimized */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
            <div className="flex items-center justify-between sm:justify-start gap-2 sm:gap-4">
              <div className="flex items-center gap-2 sm:gap-4">
                <div className="sm:hidden">
                  <TransNextIcon size={32} />
                </div>
                <div className="hidden sm:block">
                  <TransNextLogo width={130} height={40} showText={true} />
                </div>
                <div className="h-6 sm:h-8 w-px bg-gray-300" />
                <h1 className="text-base sm:text-xl font-semibold text-primary-blue">Fahrerportal</h1>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="sm:hidden border-primary-blue text-primary-blue hover:bg-blue-50 px-2"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
            <div className="hidden sm:flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-gray-600" />
                <span className="font-medium">{fahrerName}</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="border-primary-blue text-primary-blue hover:bg-blue-50"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Abmelden
              </Button>
            </div>
            <div className="flex sm:hidden items-center gap-2 text-sm text-gray-600">
              <User className="h-4 w-4" />
              <span className="font-medium truncate">{fahrerName}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 max-w-6xl">
        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-gray-600">Lade Dashboard...</p>
          </div>
        ) : (
          <>
            {/* Begrüßung */}
            <div className="mb-6 sm:mb-8">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                Willkommen, {fahrerName}!
              </h2>
              <p className="text-sm sm:text-base text-gray-600">
                Verwalten Sie hier Ihre Arbeitsnachweise, Auslagen und Abrechnungen.
              </p>
            </div>

        {/* Menü Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          {menuItems.map((item) => (
            <Link key={item.href} href={item.href}>
              <Card className="h-full hover:shadow-lg transition-shadow duration-200 cursor-pointer border-2 hover:border-primary-blue">
                <CardHeader className="p-4 sm:p-6">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 sm:p-3 rounded-lg bg-gray-100 ${item.color}`}>
                      <item.icon className="h-5 w-5 sm:h-6 sm:w-6" />
                    </div>
                    <CardTitle className="text-base sm:text-xl">{item.title}</CardTitle>
                  </div>
                  <CardDescription className="mt-2 text-sm">{item.description}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>

            {/* Info Box */}
            <Card className="mt-6 sm:mt-8 bg-blue-50 border-primary-blue">
              <CardHeader className="p-4 sm:p-6 pb-2">
                <CardTitle className="text-base sm:text-lg text-primary-blue">Wichtige Hinweise</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 sm:px-6 sm:pb-6 pt-2 space-y-2 text-xs sm:text-sm">
                <p>• Arbeitsnachweise bis Tagesende hochladen.</p>
                <p>• Auslagen im Original an: <span className="font-medium">Herner Str. 299A, 44809 Bochum</span></p>
                <p>• Fragen an: <span className="font-medium">dispo@transnext.de</span></p>
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  )
}
