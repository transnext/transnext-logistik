"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { EmptyState } from "@/components/ui/empty-state"
import {
  UserPlus,
  Users,
  Calendar,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  Search,
  MoreHorizontal,
  RefreshCw,
  Plus,
  Eye,
  Archive,
  Phone,
  Mail,
  MapPin,
  Building2,
  Briefcase,
  ArrowRight
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  getOnboardingCandidates,
  getOnboardingStats,
  createOnboardingCandidate,
  archiveCandidate,
  updateOnboardingCandidate,
  STATUS_LABELS,
  SOURCE_LABELS,
  TYPE_LABELS,
  NEXT_ACTION,
  STATUS_CATEGORIES,
  type OnboardingCandidate,
  type OnboardingStatus,
  type CandidateType,
  type OnboardingSource,
  type YesNoUnknown,
  type CreateCandidateParams
} from "@/lib/onboarding-api"
import { supabase } from "@/lib/supabase"

// Status-Badge Konfiguration
const STATUS_CONFIG: Record<string, { className: string; icon: React.ReactNode }> = {
  'neu': { className: 'bg-blue-50 text-blue-700 border-blue-200', icon: <Plus className="h-3 w-3" /> },
  'kontakt_aufgenommen': { className: 'bg-indigo-50 text-indigo-700 border-indigo-200', icon: <Phone className="h-3 w-3" /> },
  'termin_angeboten': { className: 'bg-purple-50 text-purple-700 border-purple-200', icon: <Calendar className="h-3 w-3" /> },
  'termin_geplant': { className: 'bg-violet-50 text-violet-700 border-violet-200', icon: <Calendar className="h-3 w-3" /> },
  'gespraech_gefuehrt': { className: 'bg-cyan-50 text-cyan-700 border-cyan-200', icon: <Users className="h-3 w-3" /> },
  'geeignet': { className: 'bg-teal-50 text-teal-700 border-teal-200', icon: <CheckCircle className="h-3 w-3" /> },
  'abgelehnt': { className: 'bg-red-50 text-red-700 border-red-200', icon: <XCircle className="h-3 w-3" /> },
  'dokumente_angefordert': { className: 'bg-amber-50 text-amber-700 border-amber-200', icon: <FileText className="h-3 w-3" /> },
  'dokumente_unvollstaendig': { className: 'bg-orange-50 text-orange-700 border-orange-200', icon: <FileText className="h-3 w-3" /> },
  'dokumente_vollstaendig': { className: 'bg-lime-50 text-lime-700 border-lime-200', icon: <FileText className="h-3 w-3" /> },
  'freigabe_offen': { className: 'bg-yellow-50 text-yellow-700 border-yellow-200', icon: <Clock className="h-3 w-3" /> },
  'freigegeben': { className: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: <CheckCircle className="h-3 w-3" /> },
  'fahrer_erstellt': { className: 'bg-green-50 text-green-700 border-green-200', icon: <Users className="h-3 w-3" /> },
  'aktiv': { className: 'bg-green-50 text-green-700 border-green-200', icon: <CheckCircle className="h-3 w-3" /> },
  'archiviert': { className: 'bg-gray-100 text-gray-500 border-gray-300', icon: <Archive className="h-3 w-3" /> },
}

function getStatusConfig(status: OnboardingStatus) {
  return STATUS_CONFIG[status] || { className: 'bg-gray-50 text-gray-700 border-gray-200', icon: <Clock className="h-3 w-3" /> }
}

// Filter-Typen
type FilterCategory = 'all' | 'minijobber' | 'subcontractor' | 'open' | 'termin_open' | 'documents_open' | 'freigabe_open' | 'approved' | 'rejected' | 'archived'

export default function OnboardingPage() {
  const router = useRouter()
  const [candidates, setCandidates] = useState<OnboardingCandidate[]>([])
  const [stats, setStats] = useState({ total: 0, new: 0, terminOpen: 0, documentsOpen: 0, freigabeOpen: 0, approved: 0, rejected: 0 })
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterCategory, setFilterCategory] = useState<FilterCategory>('all')

  // Create Modal State
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [createError, setCreateError] = useState("")
  const [newCandidate, setNewCandidate] = useState<Partial<CreateCandidateParams>>({
    type: 'unknown',
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    source: 'sonstiges',
    city: '',
    notes_internal: '',
    has_license: 'unknown',
    experience_level: 'unknown',
    availability_known: 'unknown'
  })

  // Detail/Edit Modal State
  const [selectedCandidate, setSelectedCandidate] = useState<OnboardingCandidate | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)

  // Auth check
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/admin')
        return
      }
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single()
      if (!profile || !['admin', 'gf'].includes(profile.role)) {
        router.push('/admin/dashboard')
      }
    }
    checkAuth()
  }, [router])

  const loadData = useCallback(async () => {
    setIsLoading(true)
    try {
      const [candidatesData, statsData] = await Promise.all([
        getOnboardingCandidates({
          type: filterCategory === 'minijobber' ? 'minijobber' : filterCategory === 'subcontractor' ? 'subcontractor' : undefined,
          statusCategory: ['open', 'termin_open', 'documents_open', 'freigabe_open', 'approved', 'rejected', 'archived'].includes(filterCategory)
            ? filterCategory as keyof typeof STATUS_CATEGORIES
            : undefined,
          search: searchQuery || undefined,
          includeArchived: filterCategory === 'archived'
        }),
        getOnboardingStats()
      ])
      setCandidates(candidatesData)
      setStats(statsData)
    } catch (err) {
      console.error('Fehler beim Laden:', err)
    } finally {
      setIsLoading(false)
    }
  }, [filterCategory, searchQuery])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleCreate = async () => {
    if (!newCandidate.first_name || !newCandidate.last_name) {
      setCreateError('Vor- und Nachname sind erforderlich')
      return
    }
    if (!newCandidate.email && !newCandidate.phone) {
      setCreateError('E-Mail oder Telefon muss angegeben werden')
      return
    }

    setIsCreating(true)
    setCreateError("")

    try {
      const result = await createOnboardingCandidate(newCandidate as CreateCandidateParams)
      if (!result.success) {
        throw new Error(result.error)
      }

      setShowCreateModal(false)
      setNewCandidate({
        type: 'unknown', first_name: '', last_name: '', email: '', phone: '',
        source: 'sonstiges', city: '', notes_internal: '', has_license: 'unknown',
        experience_level: 'unknown', availability_known: 'unknown'
      })
      await loadData()

      // Optional: Direkt zur Detailansicht
      if (result.id) {
        router.push(`/admin/onboarding/${result.id}`)
      }
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Fehler beim Erstellen')
    } finally {
      setIsCreating(false)
    }
  }

  const handleArchive = async (id: string) => {
    if (!confirm('Kandidat wirklich archivieren?')) return
    const result = await archiveCandidate(id)
    if (result.success) {
      await loadData()
    } else {
      alert(result.error || 'Fehler beim Archivieren')
    }
  }

  const formatDate = (dateStr: string | null): string => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }

  const formatDateTime = (dateStr: string | null): string => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">HR / Onboarding</h1>
          <p className="text-sm text-gray-500 mt-1">Bewerber und Kandidaten verwalten</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)} className="bg-primary-blue hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-2" />
          Kandidat anlegen
        </Button>
      </div>

      {/* Stats Kacheln */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card
          className={cn("cursor-pointer transition-all hover:shadow-md", filterCategory === 'all' && "ring-2 ring-primary-blue")}
          onClick={() => setFilterCategory('all')}
        >
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                <p className="text-xs text-gray-500">Gesamt aktiv</p>
              </div>
              <Users className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>

        <Card
          className={cn("cursor-pointer transition-all hover:shadow-md", filterCategory === 'open' && "ring-2 ring-blue-500")}
          onClick={() => setFilterCategory('open')}
        >
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-blue-600">{stats.new}</p>
                <p className="text-xs text-gray-500">Neue Bewerber</p>
              </div>
              <UserPlus className="h-8 w-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card
          className={cn("cursor-pointer transition-all hover:shadow-md", filterCategory === 'termin_open' && "ring-2 ring-purple-500")}
          onClick={() => setFilterCategory('termin_open')}
        >
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-purple-600">{stats.terminOpen}</p>
                <p className="text-xs text-gray-500">Termin offen</p>
              </div>
              <Calendar className="h-8 w-8 text-purple-400" />
            </div>
          </CardContent>
        </Card>

        <Card
          className={cn("cursor-pointer transition-all hover:shadow-md", filterCategory === 'documents_open' && "ring-2 ring-amber-500")}
          onClick={() => setFilterCategory('documents_open')}
        >
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-amber-600">{stats.documentsOpen}</p>
                <p className="text-xs text-gray-500">Dokumente offen</p>
              </div>
              <FileText className="h-8 w-8 text-amber-400" />
            </div>
          </CardContent>
        </Card>

        <Card
          className={cn("cursor-pointer transition-all hover:shadow-md", filterCategory === 'freigabe_open' && "ring-2 ring-yellow-500")}
          onClick={() => setFilterCategory('freigabe_open')}
        >
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-yellow-600">{stats.freigabeOpen}</p>
                <p className="text-xs text-gray-500">Freigabe offen</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-400" />
            </div>
          </CardContent>
        </Card>

        <Card
          className={cn("cursor-pointer transition-all hover:shadow-md", filterCategory === 'approved' && "ring-2 ring-emerald-500")}
          onClick={() => setFilterCategory('approved')}
        >
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-emerald-600">{stats.approved}</p>
                <p className="text-xs text-gray-500">Freigegeben</p>
              </div>
              <CheckCircle className="h-8 w-8 text-emerald-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter & Suche */}
      <Card className="border-gray-100">
        <CardContent className="pt-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Name, E-Mail oder Telefon suchen..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterCategory} onValueChange={(v) => setFilterCategory(v as FilterCategory)}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle aktiven</SelectItem>
                <SelectItem value="minijobber">Nur Minijobber</SelectItem>
                <SelectItem value="subcontractor">Nur Subunternehmer</SelectItem>
                <SelectItem value="open">Offen (Anfang)</SelectItem>
                <SelectItem value="termin_open">Termin offen</SelectItem>
                <SelectItem value="documents_open">Dokumente offen</SelectItem>
                <SelectItem value="freigabe_open">Freigabe offen</SelectItem>
                <SelectItem value="approved">Freigegeben</SelectItem>
                <SelectItem value="rejected">Abgelehnt</SelectItem>
                <SelectItem value="archived">Archiviert</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={loadData} disabled={isLoading}>
              <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Kandidaten-Liste */}
      <Card className="border-gray-100">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Kandidaten</CardTitle>
          <CardDescription>
            {candidates.length} Kandidat{candidates.length !== 1 ? 'en' : ''} gefunden
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
              <span className="ml-2 text-gray-500">Lade Kandidaten...</span>
            </div>
          ) : candidates.length === 0 ? (
            <EmptyState
              title="Keine Kandidaten"
              description={searchQuery || filterCategory !== 'all' ? "Keine Kandidaten mit diesen Filterkriterien gefunden." : "Legen Sie den ersten Kandidaten an."}
              icon={<Users className="h-12 w-12 text-gray-400" />}
              iconSize="sm"
              action={
                !searchQuery && filterCategory === 'all' && (
                  <Button onClick={() => setShowCreateModal(true)} className="mt-2">
                    <Plus className="h-4 w-4 mr-2" />
                    Ersten Kandidaten anlegen
                  </Button>
                )
              }
            />
          ) : (
            <>
              {/* Desktop Tabelle */}
              <div className="hidden lg:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50/50 hover:bg-gray-50/50">
                      <TableHead className="font-medium text-gray-600">Name</TableHead>
                      <TableHead className="font-medium text-gray-600">Typ</TableHead>
                      <TableHead className="font-medium text-gray-600">Quelle</TableHead>
                      <TableHead className="font-medium text-gray-600">Status</TableHead>
                      <TableHead className="font-medium text-gray-600">Kontakt</TableHead>
                      <TableHead className="font-medium text-gray-600">Nächste Aktion</TableHead>
                      <TableHead className="font-medium text-gray-600">Aktualisiert</TableHead>
                      <TableHead className="font-medium text-gray-600 text-right">Aktionen</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {candidates.map(candidate => {
                      const statusConfig = getStatusConfig(candidate.status)
                      return (
                        <TableRow key={candidate.id} className="hover:bg-gray-50/50 cursor-pointer" onClick={() => router.push(`/admin/onboarding/${candidate.id}`)}>
                          <TableCell>
                            <div className="font-medium text-gray-900">
                              {candidate.first_name} {candidate.last_name}
                            </div>
                            {candidate.city && (
                              <div className="text-xs text-gray-500 flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {candidate.city}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={cn(
                              "text-xs",
                              candidate.type === 'minijobber' && "bg-blue-50 text-blue-700 border-blue-200",
                              candidate.type === 'subcontractor' && "bg-purple-50 text-purple-700 border-purple-200",
                              candidate.type === 'unknown' && "bg-gray-50 text-gray-600 border-gray-200"
                            )}>
                              {TYPE_LABELS[candidate.type]}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-gray-600">
                            {SOURCE_LABELS[candidate.source]}
                          </TableCell>
                          <TableCell>
                            <Badge className={cn("border text-xs", statusConfig.className)}>
                              {statusConfig.icon}
                              <span className="ml-1">{STATUS_LABELS[candidate.status]}</span>
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1 text-xs text-gray-600">
                              {candidate.email && (
                                <div className="flex items-center gap-1">
                                  <Mail className="h-3 w-3" />
                                  <span className="truncate max-w-[150px]">{candidate.email}</span>
                                </div>
                              )}
                              {candidate.phone && (
                                <div className="flex items-center gap-1">
                                  <Phone className="h-3 w-3" />
                                  {candidate.phone}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-xs text-primary-blue">
                              <ArrowRight className="h-3 w-3" />
                              {NEXT_ACTION[candidate.status]}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-gray-500">
                            {formatDate(candidate.updated_at)}
                          </TableCell>
                          <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => router.push(`/admin/onboarding/${candidate.id}`)}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  Details anzeigen
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                {candidate.status !== 'archiviert' && (
                                  <DropdownMenuItem onClick={() => handleArchive(candidate.id)} className="text-amber-600">
                                    <Archive className="h-4 w-4 mr-2" />
                                    Archivieren
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Karten */}
              <div className="lg:hidden space-y-3">
                {candidates.map(candidate => {
                  const statusConfig = getStatusConfig(candidate.status)
                  return (
                    <div
                      key={candidate.id}
                      className="p-4 border rounded-lg bg-white cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => router.push(`/admin/onboarding/${candidate.id}`)}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="font-medium text-gray-900">
                            {candidate.first_name} {candidate.last_name}
                          </p>
                          {candidate.city && (
                            <p className="text-xs text-gray-500 flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {candidate.city}
                            </p>
                          )}
                        </div>
                        <Badge className={cn("border text-xs", statusConfig.className)}>
                          {statusConfig.icon}
                          <span className="ml-1">{STATUS_LABELS[candidate.status]}</span>
                        </Badge>
                      </div>

                      <div className="flex flex-wrap gap-2 mb-3">
                        <Badge variant="outline" className="text-xs">
                          {TYPE_LABELS[candidate.type]}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {SOURCE_LABELS[candidate.source]}
                        </Badge>
                      </div>

                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1 text-primary-blue">
                          <ArrowRight className="h-3 w-3" />
                          {NEXT_ACTION[candidate.status]}
                        </div>
                        <span className="text-gray-400">{formatDate(candidate.updated_at)}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Create Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary-blue" />
              Neuen Kandidaten anlegen
            </DialogTitle>
            <DialogDescription>
              Erfassen Sie einen neuen Bewerber für das Onboarding.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Typ */}
            <div className="space-y-2">
              <Label>Typ *</Label>
              <Select
                value={newCandidate.type}
                onValueChange={(v) => setNewCandidate(p => ({ ...p, type: v as CandidateType }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="minijobber">Minijobber</SelectItem>
                  <SelectItem value="subcontractor">Subunternehmer</SelectItem>
                  <SelectItem value="unknown">Noch offen</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Name */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name">Vorname *</Label>
                <Input
                  id="first_name"
                  value={newCandidate.first_name}
                  onChange={(e) => setNewCandidate(p => ({ ...p, first_name: e.target.value }))}
                  placeholder="Max"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">Nachname *</Label>
                <Input
                  id="last_name"
                  value={newCandidate.last_name}
                  onChange={(e) => setNewCandidate(p => ({ ...p, last_name: e.target.value }))}
                  placeholder="Mustermann"
                />
              </div>
            </div>

            {/* Kontakt */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-Mail</Label>
                <Input
                  id="email"
                  type="email"
                  value={newCandidate.email || ''}
                  onChange={(e) => setNewCandidate(p => ({ ...p, email: e.target.value }))}
                  placeholder="max@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Telefon</Label>
                <Input
                  id="phone"
                  value={newCandidate.phone || ''}
                  onChange={(e) => setNewCandidate(p => ({ ...p, phone: e.target.value }))}
                  placeholder="+49 123 456789"
                />
              </div>
            </div>
            <p className="text-xs text-gray-500">* Mindestens E-Mail oder Telefon erforderlich</p>

            {/* Quelle */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Quelle *</Label>
                <Select
                  value={newCandidate.source}
                  onValueChange={(v) => setNewCandidate(p => ({ ...p, source: v as OnboardingSource }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="indeed">Indeed</SelectItem>
                    <SelectItem value="ebay">eBay Kleinanzeigen</SelectItem>
                    <SelectItem value="empfehlung">Empfehlung</SelectItem>
                    <SelectItem value="sonstiges">Sonstiges</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">Ort</Label>
                <Input
                  id="city"
                  value={newCandidate.city || ''}
                  onChange={(e) => setNewCandidate(p => ({ ...p, city: e.target.value }))}
                  placeholder="Berlin"
                />
              </div>
            </div>

            {/* Optionale Infos */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Führerschein</Label>
                <Select
                  value={newCandidate.has_license}
                  onValueChange={(v) => setNewCandidate(p => ({ ...p, has_license: v as YesNoUnknown }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unknown">Unbekannt</SelectItem>
                    <SelectItem value="yes">Ja</SelectItem>
                    <SelectItem value="no">Nein</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Erfahrung</Label>
                <Select
                  value={newCandidate.experience_level}
                  onValueChange={(v) => setNewCandidate(p => ({ ...p, experience_level: v as YesNoUnknown }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unknown">Unbekannt</SelectItem>
                    <SelectItem value="yes">Ja</SelectItem>
                    <SelectItem value="no">Nein</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Verfügbarkeit</Label>
                <Select
                  value={newCandidate.availability_known}
                  onValueChange={(v) => setNewCandidate(p => ({ ...p, availability_known: v as YesNoUnknown }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unknown">Unbekannt</SelectItem>
                    <SelectItem value="yes">Bekannt</SelectItem>
                    <SelectItem value="no">Nicht bekannt</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Notizen */}
            <div className="space-y-2">
              <Label htmlFor="notes">Interne Notizen</Label>
              <Textarea
                id="notes"
                value={newCandidate.notes_internal || ''}
                onChange={(e) => setNewCandidate(p => ({ ...p, notes_internal: e.target.value }))}
                placeholder="Zusätzliche Informationen zum Kandidaten..."
                rows={3}
              />
            </div>

            {/* Fehler */}
            {createError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {createError}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateModal(false)} disabled={isCreating}>
              Abbrechen
            </Button>
            <Button onClick={handleCreate} disabled={isCreating} className="bg-primary-blue hover:bg-blue-700">
              {isCreating ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Erstellen...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Kandidat anlegen
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
