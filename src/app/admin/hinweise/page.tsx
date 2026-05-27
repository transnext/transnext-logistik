"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { AdminLayout } from "@/components/admin/AdminLayout"
import { getCurrentUser, getUserProfile, signOut } from "@/lib/api"
import {
  getAllAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  archiveAnnouncement,
  reactivateAnnouncement,
  getAnnouncementPriorityStyle,
  formatAnnouncementTarget,
  formatAnnouncementPriority,
  formatAnnouncementDate,
  formatAnnouncementDateTime,
  ANNOUNCEMENT_TARGET_OPTIONS,
  ANNOUNCEMENT_PRIORITY_OPTIONS,
  type Announcement,
  type AnnouncementTarget,
  type AnnouncementPriority,
  type CreateAnnouncementData,
  type UpdateAnnouncementData
} from "@/lib/announcements-api"
import {
  Plus,
  Megaphone,
  Edit,
  Archive,
  RotateCcw,
  AlertCircle,
  AlertTriangle,
  Info,
  Calendar,
  User,
  Filter,
  Search,
  ArrowLeft,
  CheckCircle,
  Clock,
  Eye,
  EyeOff
} from "lucide-react"

export default function HinweisePage() {
  const router = useRouter()
  const [adminName, setAdminName] = useState("")
  const [userRole, setUserRole] = useState<'admin' | 'disponent' | 'gf'>('admin')
  const [isLoading, setIsLoading] = useState(true)
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [showArchived, setShowArchived] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  
  // Dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  
  // Form state
  const [formData, setFormData] = useState<CreateAnnouncementData>({
    title: "",
    content: "",
    target: "all_admin",
    priority: "normal",
    visible_from: new Date().toISOString().slice(0, 16),
    visible_until: null
  })

  const isAdminOrGF = userRole === 'admin' || userRole === 'gf'

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
      if (profile.role !== 'admin' && profile.role !== 'gf') {
        router.push("/admin/dashboard")
        return
      }

      setUserRole(profile.role as 'admin' | 'gf')
      setAdminName(profile.full_name)

      await loadAnnouncements()
      setIsLoading(false)
    } catch (error) {
      console.error("Auth/Load Fehler:", error)
      router.push("/admin")
    }
  }

  const loadAnnouncements = async () => {
    try {
      const data = await getAllAnnouncements(showArchived)
      setAnnouncements(data)
    } catch (error) {
      console.error("Fehler beim Laden der Hinweise:", error)
    }
  }

  useEffect(() => {
    if (!isLoading) {
      loadAnnouncements()
    }
  }, [showArchived])

  const handleLogout = async () => {
    try {
      await signOut()
      router.push("/admin")
    } catch (error) {
      console.error("Logout Fehler:", error)
    }
  }

  const openCreateDialog = () => {
    setEditingAnnouncement(null)
    setFormData({
      title: "",
      content: "",
      target: "all_admin",
      priority: "normal",
      visible_from: new Date().toISOString().slice(0, 16),
      visible_until: null
    })
    setIsDialogOpen(true)
  }

  const openEditDialog = (announcement: Announcement) => {
    setEditingAnnouncement(announcement)
    setFormData({
      title: announcement.title,
      content: announcement.content,
      target: announcement.target,
      priority: announcement.priority,
      visible_from: announcement.visible_from.slice(0, 16),
      visible_until: announcement.visible_until?.slice(0, 16) || null
    })
    setIsDialogOpen(true)
  }

  const handleSubmit = async () => {
    if (!formData.title.trim() || !formData.content.trim()) {
      alert("Bitte Titel und Inhalt ausfüllen")
      return
    }

    setIsSaving(true)
    try {
      if (editingAnnouncement) {
        await updateAnnouncement(editingAnnouncement.id, formData as UpdateAnnouncementData)
      } else {
        await createAnnouncement(formData)
      }
      await loadAnnouncements()
      setIsDialogOpen(false)
    } catch (error) {
      console.error("Fehler beim Speichern:", error)
      alert("Fehler beim Speichern: " + (error as Error).message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleArchive = async (id: string) => {
    if (!confirm("Hinweis wirklich archivieren?")) return
    
    try {
      await archiveAnnouncement(id)
      await loadAnnouncements()
    } catch (error) {
      console.error("Fehler beim Archivieren:", error)
      alert("Fehler beim Archivieren: " + (error as Error).message)
    }
  }

  const handleReactivate = async (id: string) => {
    try {
      await reactivateAnnouncement(id)
      await loadAnnouncements()
    } catch (error) {
      console.error("Fehler beim Reaktivieren:", error)
      alert("Fehler beim Reaktivieren: " + (error as Error).message)
    }
  }

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'critical':
        return <AlertCircle className="h-4 w-4" />
      case 'important':
        return <AlertTriangle className="h-4 w-4" />
      default:
        return <Info className="h-4 w-4" />
    }
  }

  const filteredAnnouncements = announcements.filter(a => {
    if (searchTerm) {
      const search = searchTerm.toLowerCase()
      return a.title.toLowerCase().includes(search) || 
             a.content.toLowerCase().includes(search)
    }
    return true
  })

  if (isLoading) {
    return (
      <AdminLayout userName={adminName} userRole={userRole} onLogout={handleLogout}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-blue" />
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout userName={adminName} userRole={userRole} onLogout={handleLogout}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin/dashboard">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-1" />
                Zurück
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Megaphone className="h-6 w-6 text-primary-blue" />
                Hinweise verwalten
              </h1>
              <p className="text-gray-500 mt-1">Mitteilungen für Admin-Dashboard und Fahrerportal</p>
            </div>
          </div>
          <Button onClick={openCreateDialog} className="bg-primary-blue hover:bg-primary-blue/90">
            <Plus className="h-4 w-4 mr-2" />
            Neuer Hinweis
          </Button>
        </div>

        {/* Filters */}
        <Card className="border-gray-100">
          <CardContent className="pt-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Hinweise durchsuchen..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Button
                variant={showArchived ? "default" : "outline"}
                size="sm"
                onClick={() => setShowArchived(!showArchived)}
              >
                {showArchived ? <Eye className="h-4 w-4 mr-1" /> : <EyeOff className="h-4 w-4 mr-1" />}
                {showArchived ? "Inkl. archivierte" : "Nur aktive"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Announcements List */}
        <div className="space-y-4">
          {filteredAnnouncements.length > 0 ? (
            filteredAnnouncements.map((announcement) => {
              const style = getAnnouncementPriorityStyle(announcement.priority)
              const isActive = announcement.status === 'active'
              
              return (
                <Card 
                  key={announcement.id} 
                  className={`border-gray-100 ${!isActive ? 'opacity-60' : ''}`}
                >
                  <CardContent className="pt-4">
                    <div className="flex items-start gap-4">
                      {/* Priority Icon */}
                      <div className={`p-2 rounded-lg ${style.bg} ${style.icon}`}>
                        {getPriorityIcon(announcement.priority)}
                      </div>
                      
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h3 className="font-semibold text-gray-900">{announcement.title}</h3>
                            <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">
                              {announcement.content}
                            </p>
                          </div>
                          
                          {/* Actions */}
                          <div className="flex items-center gap-2">
                            {isActive ? (
                              <>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => openEditDialog(announcement)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                                  onClick={() => handleArchive(announcement.id)}
                                >
                                  <Archive className="h-4 w-4" />
                                </Button>
                              </>
                            ) : (
                              <Button 
                                variant="ghost" 
                                size="sm"
                                className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                                onClick={() => handleReactivate(announcement.id)}
                              >
                                <RotateCcw className="h-4 w-4 mr-1" />
                                Reaktivieren
                              </Button>
                            )}
                          </div>
                        </div>
                        
                        {/* Metadata */}
                        <div className="flex flex-wrap items-center gap-3 mt-3 text-xs">
                          <Badge 
                            variant="outline" 
                            className={`${style.bg} ${style.text} ${style.border}`}
                          >
                            {formatAnnouncementPriority(announcement.priority)}
                          </Badge>
                          <Badge variant="outline" className="bg-gray-50">
                            {formatAnnouncementTarget(announcement.target)}
                          </Badge>
                          {!isActive && (
                            <Badge variant="outline" className="bg-gray-100 text-gray-600">
                              Archiviert
                            </Badge>
                          )}
                          <span className="text-gray-400 flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatAnnouncementDate(announcement.created_at)}
                          </span>
                          {announcement.created_by_name && (
                            <span className="text-gray-400 flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {announcement.created_by_name}
                            </span>
                          )}
                          {announcement.visible_until && (
                            <span className="text-gray-400 flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Bis: {formatAnnouncementDate(announcement.visible_until)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })
          ) : (
            <Card className="border-gray-100">
              <CardContent className="py-12 text-center">
                <Megaphone className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-1">
                  {searchTerm ? "Keine Hinweise gefunden" : "Keine Hinweise vorhanden"}
                </h3>
                <p className="text-gray-500 mb-4">
                  {searchTerm 
                    ? "Versuchen Sie einen anderen Suchbegriff" 
                    : "Erstellen Sie Ihren ersten Hinweis"}
                </p>
                {!searchTerm && (
                  <Button onClick={openCreateDialog}>
                    <Plus className="h-4 w-4 mr-2" />
                    Hinweis erstellen
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Create/Edit Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>
                {editingAnnouncement ? "Hinweis bearbeiten" : "Neuen Hinweis erstellen"}
              </DialogTitle>
              <DialogDescription>
                Erstellen Sie eine Mitteilung für das Admin-Dashboard oder Fahrerportal.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title">Titel *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Kurzer, aussagekräftiger Titel"
                />
              </div>
              
              {/* Content */}
              <div className="space-y-2">
                <Label htmlFor="content">Inhalt *</Label>
                <Textarea
                  id="content"
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="Ausführliche Beschreibung des Hinweises..."
                  rows={4}
                />
              </div>
              
              {/* Target & Priority */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Zielgruppe</Label>
                  <Select
                    value={formData.target}
                    onValueChange={(value: AnnouncementTarget) => 
                      setFormData({ ...formData, target: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ANNOUNCEMENT_TARGET_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Priorität</Label>
                  <Select
                    value={formData.priority}
                    onValueChange={(value: AnnouncementPriority) => 
                      setFormData({ ...formData, priority: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ANNOUNCEMENT_PRIORITY_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {/* Visibility Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="visible_from">Sichtbar ab</Label>
                  <Input
                    id="visible_from"
                    type="datetime-local"
                    value={formData.visible_from}
                    onChange={(e) => setFormData({ ...formData, visible_from: e.target.value })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="visible_until">Sichtbar bis (optional)</Label>
                  <Input
                    id="visible_until"
                    type="datetime-local"
                    value={formData.visible_until || ""}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      visible_until: e.target.value || null 
                    })}
                  />
                </div>
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Abbrechen
              </Button>
              <Button onClick={handleSubmit} disabled={isSaving}>
                {isSaving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Speichern...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    {editingAnnouncement ? "Speichern" : "Erstellen"}
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  )
}
