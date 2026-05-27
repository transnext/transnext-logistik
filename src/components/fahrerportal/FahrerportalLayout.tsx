"use client"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { TransNextLogo, TransNextIcon } from "@/components/ui/logo"
import {
  Home,
  Upload,
  Receipt,
  Car,
  FileText,
  LogOut,
  User,
  Menu,
  X,
  CalendarCheck
} from "lucide-react"
import { getCurrentUser, signOut, canAccessFahrerportal } from "@/lib/api"

interface FahrerportalLayoutProps {
  children: React.ReactNode
  /** Optionaler Titel für die Seite (Header) */
  title?: string
  /** Versteckt den Header (z.B. für Protokoll-Wizard mit eigenem Header) */
  hideHeader?: boolean
  /** Versteckt die Bottom-Navigation (z.B. für Protokoll-Wizard) */
  hideBottomNav?: boolean
}

interface NavItem {
  label: string
  href: string
  icon: React.ElementType
}

const navItems: NavItem[] = [
  { label: "Start", href: "/fahrerportal/dashboard", icon: Home },
  { label: "Tour", href: "/fahrerportal/arbeitsnachweis", icon: Upload },
  { label: "Zeiten", href: "/fahrerportal/verfuegbarkeit", icon: CalendarCheck },
  { label: "Touren", href: "/fahrerportal/touren", icon: Car },
  { label: "Abrechnung", href: "/fahrerportal/monatsabrechnung", icon: FileText },
]

export function FahrerportalLayout({
  children,
  title,
  hideHeader = false,
  hideBottomNav = false
}: FahrerportalLayoutProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [fahrerName, setFahrerName] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [showMobileMenu, setShowMobileMenu] = useState(false)

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

      // Nutze die neue Zugriffsprüfung
      const accessResult = await canAccessFahrerportal(user.id)

      if (!accessResult.canAccess) {
        console.log("Fahrerportal-Zugang verweigert:", accessResult.reason)
        router.push("/fahrerportal")
        return
      }

      // Fahrername aus Profile oder Fahrer-Datensatz
      const name = accessResult.fahrer
        ? `${accessResult.fahrer.vorname} ${accessResult.fahrer.nachname}`
        : accessResult.role
      setFahrerName(name)
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

  const isActive = (href: string) => {
    if (href === "/fahrerportal/dashboard") {
      return pathname === href
    }
    return pathname.startsWith(href)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-blue" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex flex-col">
      {/* Header */}
      {!hideHeader && (
        <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-40">
          <div className="container mx-auto px-3 sm:px-4 py-3">
            <div className="flex items-center justify-between">
              {/* Logo & Titel */}
              <div className="flex items-center gap-2 sm:gap-4 min-w-0">
                <Link href="/fahrerportal/dashboard" className="flex-shrink-0">
                  <div className="sm:hidden">
                    <TransNextIcon size={32} />
                  </div>
                  <div className="hidden sm:block">
                    <TransNextLogo width={130} height={40} showText={true} />
                  </div>
                </Link>
                <div className="h-6 sm:h-8 w-px bg-gray-200 flex-shrink-0" />
                <h1 className="text-base sm:text-lg font-semibold text-primary-blue truncate">
                  {title || "Fahrerportal"}
                </h1>
              </div>

              {/* Desktop: User & Logout */}
              <div className="hidden md:flex items-center gap-4">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <User className="h-4 w-4" />
                  <span className="font-medium">{fahrerName}</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLogout}
                  className="border-gray-200 text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Abmelden
                </Button>
              </div>

              {/* Mobile: Menu Button */}
              <Button
                variant="ghost"
                size="sm"
                className="md:hidden"
                onClick={() => setShowMobileMenu(!showMobileMenu)}
              >
                {showMobileMenu ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            </div>

            {/* Mobile Menu Dropdown */}
            {showMobileMenu && (
              <div className="md:hidden pt-3 pb-2 border-t mt-3 space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-600 px-2 py-2">
                  <User className="h-4 w-4" />
                  <span className="font-medium">{fahrerName}</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLogout}
                  className="w-full justify-start border-gray-200 text-gray-600"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Abmelden
                </Button>
              </div>
            )}
          </div>
        </header>
      )}

      {/* Main Content */}
      <main className={`flex-1 ${!hideBottomNav ? "pb-20 md:pb-6" : ""}`}>
        {children}
      </main>

      {/* Bottom Navigation (Mobile) */}
      {!hideBottomNav && (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-40">
          <div className="flex items-center justify-around">
            {navItems.map((item) => {
              const Icon = item.icon
              const active = isActive(item.href)

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex flex-col items-center py-2 px-3 min-w-0 flex-1 transition-colors ${
                    active
                      ? "text-primary-blue"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <Icon className={`h-5 w-5 ${active ? "stroke-2" : ""}`} />
                  <span className="text-[10px] mt-0.5 truncate">{item.label}</span>
                </Link>
              )
            })}
          </div>
        </nav>
      )}

      {/* Desktop: Keine fixierte Navigation, stattdessen Schnellzugriff im Dashboard */}
    </div>
  )
}

export default FahrerportalLayout
