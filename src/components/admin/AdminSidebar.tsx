"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import { useState, useEffect } from "react"
import {
  LayoutDashboard,
  Car,
  FileText,
  Receipt,
  Users,
  Calendar,
  BarChart3,
  Euro,
  Building2,
  Wrench,
  Bell,
  Settings,
  X,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  ClipboardList
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { TransNextLogo } from "@/components/ui/logo"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle
} from "@/components/ui/sheet"
import type { UserRole } from "./AdminHeader"

interface NavItem {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  roles: UserRole[]
  dividerAfter?: boolean
}

// Navigation Items mit echten Routen
const navItems: NavItem[] = [
  {
    label: "Dashboard",
    href: "/admin/dashboard",
    icon: LayoutDashboard,
    roles: ['admin', 'gf', 'disponent']
  },
  {
    label: "Analytics",
    href: "/admin/analytics",
    icon: TrendingUp,
    roles: ['admin', 'gf'],
    dividerAfter: true
  },
  {
    label: "Tourenverwaltung",
    href: "/admin/fahrzeugtouren",
    icon: Car,
    roles: ['admin', 'gf', 'disponent']
  },
  {
    label: "Arbeitsnachweise",
    href: "/admin/arbeitsnachweise",
    icon: FileText,
    roles: ['admin', 'gf', 'disponent']
  },
  {
    label: "Auslagen",
    href: "/admin/auslagen",
    icon: Receipt,
    roles: ['admin', 'gf', 'disponent']
  },
  {
    label: "Fahrer",
    href: "/admin/fahrer",
    icon: Users,
    roles: ['admin', 'gf', 'disponent']
  },
  {
    label: "Verfügbarkeit",
    href: "/admin/verfuegbarkeit",
    icon: Calendar,
    roles: ['admin', 'gf', 'disponent'],
    dividerAfter: true
  },
  {
    label: "Abrechnung",
    href: "/admin/abrechnung",
    icon: BarChart3,
    roles: ['admin', 'gf']
  },
  {
    label: "Preislisten",
    href: "/admin/preislisten",
    icon: Euro,
    roles: ['admin', 'gf']
  },
  {
    label: "Kunden",
    href: "/admin/kunden",
    icon: Building2,
    roles: ['admin', 'gf']
  },
  {
    label: "Korrekturen",
    href: "/admin/korrekturen",
    icon: Wrench,
    roles: ['admin', 'gf'],
    dividerAfter: true
  },
  {
    label: "Alerts",
    href: "/admin/alerts",
    icon: Bell,
    roles: ['admin', 'gf', 'disponent']
  },
  {
    label: "Einstellungen",
    href: "/admin/einstellungen",
    icon: Settings,
    roles: ['admin', 'gf']
  },
  {
    label: "Audit-Log",
    href: "/admin/audit-log",
    icon: ClipboardList,
    roles: ['admin', 'gf']
  }
]

interface AdminSidebarProps {
  userRole?: UserRole
  isOpen?: boolean
  onClose?: () => void
}

// localStorage Key
const SIDEBAR_COLLAPSED_KEY = "admin_sidebar_collapsed"

// Filter items basierend auf Benutzerrolle
function filterNavItems(items: NavItem[], role: UserRole): NavItem[] {
  return items.filter(item => item.roles.includes(role))
}

// Sidebar Navigation Content
function SidebarNav({
  items,
  currentPath,
  collapsed,
  onItemClick
}: {
  items: NavItem[]
  currentPath: string
  collapsed: boolean
  onItemClick?: () => void
}) {
  return (
    <nav className="flex flex-col gap-0.5 px-2">
      {items.map((item, index) => {
        const Icon = item.icon
        const isActive = currentPath === item.href

        return (
          <div key={item.href}>
            <Link
              href={item.href}
              onClick={onItemClick}
              title={collapsed ? item.label : undefined}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] font-medium transition-all duration-150",
                collapsed && "justify-center px-2",
                isActive
                  ? "bg-blue-50 text-primary-blue border-l-2 border-primary-blue -ml-[2px] pl-[calc(0.625rem+2px)]"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              )}
            >
              <Icon className={cn(
                "shrink-0 transition-colors",
                collapsed ? "h-5 w-5" : "h-4 w-4",
                isActive ? "text-primary-blue" : "text-gray-500"
              )} />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
            {item.dividerAfter && (
              <div className="my-2 mx-2 border-t border-gray-100" />
            )}
          </div>
        )
      })}
    </nav>
  )
}

// Desktop Sidebar (fixiert links, einklappbar)
export function AdminSidebarDesktop({
  userRole = 'admin',
  collapsed,
  onToggleCollapse
}: {
  userRole?: UserRole
  collapsed: boolean
  onToggleCollapse: () => void
}) {
  const pathname = usePathname()
  const visibleItems = filterNavItems(navItems, userRole)

  return (
    <aside
      className={cn(
        "hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:z-50 lg:border-r lg:border-gray-100 lg:bg-white transition-all duration-200",
        collapsed ? "lg:w-[72px]" : "lg:w-[220px]"
      )}
    >
      {/* Logo Header */}
      <div className={cn(
        "flex h-14 shrink-0 items-center border-b border-gray-100",
        collapsed ? "justify-center px-2" : "px-4"
      )}>
        <Link href="/admin/dashboard" className="flex items-center">
          <TransNextLogo className={cn(
            "transition-all",
            collapsed ? "h-7 w-7" : "h-8"
          )} showText={!collapsed} />
        </Link>
      </div>

      {/* Navigation */}
      <div className="flex flex-1 flex-col overflow-y-auto py-3">
        <SidebarNav
          items={visibleItems}
          currentPath={pathname}
          collapsed={collapsed}
        />
      </div>

      {/* Collapse Toggle */}
      <div className="border-t border-gray-100 p-2">
        <button
          onClick={onToggleCollapse}
          className={cn(
            "flex items-center justify-center w-full py-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors",
            collapsed && "px-0"
          )}
          title={collapsed ? "Sidebar ausklappen" : "Sidebar einklappen"}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4 mr-2" />
              <span className="text-xs">Einklappen</span>
            </>
          )}
        </button>
      </div>
    </aside>
  )
}

// Mobile Sidebar (Sheet/Drawer)
export function AdminSidebarMobile({
  userRole = 'admin',
  isOpen = false,
  onClose
}: AdminSidebarProps) {
  const pathname = usePathname()
  const visibleItems = filterNavItems(navItems, userRole)

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose?.()}>
      <SheetContent side="left" className="w-64 p-0">
        <SheetHeader className="flex h-14 items-center border-b border-gray-100 px-4">
          <SheetTitle className="flex items-center">
            <TransNextLogo className="h-8" showText />
          </SheetTitle>
        </SheetHeader>

        {/* Navigation */}
        <div className="flex flex-1 flex-col overflow-y-auto py-3">
          <SidebarNav
            items={visibleItems}
            currentPath={pathname}
            collapsed={false}
            onItemClick={onClose}
          />
        </div>
      </SheetContent>
    </Sheet>
  )
}

// Hook für Sidebar-Collapse-State mit localStorage
export function useSidebarCollapse() {
  const [collapsed, setCollapsed] = useState(false)
  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    // Lade gespeicherten Zustand nach Hydration
    const saved = localStorage.getItem(SIDEBAR_COLLAPSED_KEY)
    if (saved !== null) {
      setCollapsed(saved === "true")
    }
    setIsHydrated(true)
  }, [])

  const toggleCollapse = () => {
    const newValue = !collapsed
    setCollapsed(newValue)
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(newValue))
  }

  return { collapsed, toggleCollapse, isHydrated }
}

// Kombination für Export
export function AdminSidebar(props: AdminSidebarProps) {
  const { collapsed, toggleCollapse } = useSidebarCollapse()

  return (
    <>
      <AdminSidebarDesktop
        userRole={props.userRole}
        collapsed={collapsed}
        onToggleCollapse={toggleCollapse}
      />
      <AdminSidebarMobile {...props} />
    </>
  )
}

// Export der NavItem-Type für andere Komponenten
export type { NavItem }
export { navItems, filterNavItems, SIDEBAR_COLLAPSED_KEY }
