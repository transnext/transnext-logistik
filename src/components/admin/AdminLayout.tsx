"use client"

import { useState, useCallback } from "react"
import { AdminHeader, type UserRole } from "./AdminHeader"
import { AdminSidebarDesktop, AdminSidebarMobile, useSidebarCollapse } from "./AdminSidebar"
import { cn } from "@/lib/utils"

interface AdminLayoutProps {
  children: React.ReactNode
  userName?: string
  userRole?: UserRole
  onLogout?: () => void
}

/**
 * AdminLayout - Modernes Admin-Layout mit einklappbarer Sidebar und Header
 *
 * Verwendung:
 * ```tsx
 * <AdminLayout
 *   userName="Max Mustermann"
 *   userRole="admin"
 *   onLogout={() => signOut()}
 * >
 *   {children}
 * </AdminLayout>
 * ```
 *
 * Features:
 * - Desktop (lg+): Fixierte, einklappbare Sidebar links
 * - Mobile (<lg): Einklappbare Sidebar als Sheet
 * - Sidebar-Zustand wird in localStorage gespeichert
 */
export function AdminLayout({
  children,
  userName,
  userRole = 'admin',
  onLogout
}: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { collapsed, toggleCollapse, isHydrated } = useSidebarCollapse()

  const handleMenuClick = useCallback(() => {
    setSidebarOpen(true)
  }, [])

  const handleSidebarClose = useCallback(() => {
    setSidebarOpen(false)
  }, [])

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Desktop Sidebar (fixiert, einklappbar) */}
      <AdminSidebarDesktop
        userRole={userRole}
        collapsed={collapsed}
        onToggleCollapse={toggleCollapse}
      />

      {/* Mobile Sidebar (Sheet) */}
      <AdminSidebarMobile
        userRole={userRole}
        isOpen={sidebarOpen}
        onClose={handleSidebarClose}
      />

      {/* Main Content Area */}
      <div className={cn(
        "transition-all duration-200",
        isHydrated
          ? collapsed ? "lg:pl-[72px]" : "lg:pl-[220px]"
          : "lg:pl-[220px]" // Default während SSR
      )}>
        {/* Header */}
        <AdminHeader
          userName={userName}
          userRole={userRole}
          onMenuClick={handleMenuClick}
          onLogout={onLogout}
          showMenuButton={true}
        />

        {/* Page Content */}
        <main className="flex-1 p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}

// Re-export types für einfacheren Import
export type { UserRole } from "./AdminHeader"
