"use client"

import { Menu, LogOut, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { TransNextLogo } from "@/components/ui/logo"
import { Badge } from "@/components/ui/badge"

export type UserRole = 'admin' | 'gf' | 'disponent' | 'fahrer'

interface AdminHeaderProps {
  userName?: string
  userRole?: UserRole
  onMenuClick?: () => void
  onLogout?: () => void
  showMenuButton?: boolean
}

function getRoleLabel(role: UserRole): string {
  switch (role) {
    case 'admin':
      return 'Administrator'
    case 'gf':
      return 'Geschäftsführer'
    case 'disponent':
      return 'Disponent'
    case 'fahrer':
      return 'Fahrer'
    default:
      return 'Benutzer'
  }
}

function getRoleBadgeVariant(role: UserRole): "default" | "secondary" | "destructive" | "outline" {
  switch (role) {
    case 'admin':
      return 'destructive'
    case 'gf':
      return 'default'
    case 'disponent':
      return 'secondary'
    default:
      return 'outline'
  }
}

export function AdminHeader({
  userName = "Admin",
  userRole = 'admin',
  onMenuClick,
  onLogout,
  showMenuButton = true
}: AdminHeaderProps) {
  return (
    <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 lg:px-6">
      {/* Mobile Menu Button */}
      {showMenuButton && (
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={onMenuClick}
          aria-label="Menü öffnen"
        >
          <Menu className="h-5 w-5" />
        </Button>
      )}

      {/* Logo - visible on mobile when menu is hidden on desktop */}
      <div className="flex items-center gap-3 lg:hidden">
        <TransNextLogo className="h-8 w-auto" />
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* User Info & Actions */}
      <div className="flex items-center gap-3">
        {/* Role Badge */}
        <Badge variant={getRoleBadgeVariant(userRole)} className="hidden sm:flex">
          {getRoleLabel(userRole)}
        </Badge>

        {/* User Name */}
        <div className="flex items-center gap-2 text-sm">
          <User className="h-4 w-4 text-muted-foreground" />
          <span className="hidden md:inline font-medium">{userName}</span>
        </div>

        {/* Logout Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onLogout}
          className="gap-2 text-muted-foreground hover:text-foreground"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Abmelden</span>
        </Button>
      </div>
    </header>
  )
}
