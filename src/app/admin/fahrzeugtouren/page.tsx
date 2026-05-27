"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AdminLayout } from "@/components/admin/AdminLayout"
import { TourenTab } from "@/components/admin/TourenTab"
import { getCurrentUser, getUserProfile, signOut } from "@/lib/api"
import { getAllFahrerAdmin } from "@/lib/admin-api"

interface Fahrer {
  id: string
  vorname: string
  nachname: string
  status: string
}

export default function TourenPage() {
  const router = useRouter()
  const [userName, setUserName] = useState("")
  const [userRole, setUserRole] = useState<'admin' | 'disponent'>('admin')
  const [isLoading, setIsLoading] = useState(true)
  const [fahrer, setFahrer] = useState<Fahrer[]>([])

  useEffect(() => {
    checkAuthAndLoadData()
  }, [])

  const checkAuthAndLoadData = async () => {
    try {
      const user = await getCurrentUser()
      if (!user) {
        router.push("/admin")
        return
      }
      const profile = await getUserProfile(user.id)
      if (!['admin', 'disponent', 'gf'].includes(profile.role)) {
        router.push("/admin")
        return
      }
      const role = profile.role as string
      setUserRole(role === 'gf' ? 'admin' : role as 'admin' | 'disponent')
      setUserName(profile.full_name)

      // Lade Fahrerliste für Zuweisung
      await loadFahrer()
      setIsLoading(false)
    } catch (error) {
      console.error("Auth/Load Fehler:", error)
      router.push("/admin")
    }
  }

  const loadFahrer = async () => {
    try {
      const data = await getAllFahrerAdmin()
      setFahrer(data.map((f: any) => ({
        id: f.id,
        vorname: f.profiles?.full_name?.split(' ')[0] || f.id.slice(0, 8),
        nachname: f.profiles?.full_name?.split(' ').slice(1).join(' ') || '',
        status: f.status
      })))
    } catch (error) {
      console.error("Fehler beim Laden der Fahrer:", error)
    }
  }

  const handleLogout = async () => {
    await signOut()
    router.push("/admin")
  }

  if (isLoading) {
    return (
      <AdminLayout userName={userName} userRole={userRole} onLogout={handleLogout}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-blue" />
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout userName={userName} userRole={userRole} onLogout={handleLogout}>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tourenverwaltung</h1>
          <p className="text-gray-500 mt-1">Fahrzeugüberführungen verwalten und Fahrer zuweisen</p>
        </div>

        {/* Touren Tab mit voller Funktionalität */}
        <TourenTab fahrer={fahrer} onRefresh={loadFahrer} />
      </div>
    </AdminLayout>
  )
}
