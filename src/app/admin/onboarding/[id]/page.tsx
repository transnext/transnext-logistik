"use client"
import { useEffect, useState, useCallback, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { AdminLayout } from "@/components/admin/AdminLayout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  Save,
  Archive,
  AlertTriangle,
  Upload,
  Download,
  MessageSquare,
  Plus,
  Briefcase,
  ArrowRight,
  ExternalLink,
  Users,
  Copy,
  Send,
  Video,
  ClipboardList,
  History
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  getOnboardingCandidate,
  getCandidateDocuments,
  getCandidateNotes,
  getCandidateCommunications,
  createCommunication,
  updateCommunicationStatus,
  updateOnboardingCandidate,
  updateDocumentStatus,
  uploadDocumentFile,
  getDocumentDownloadUrl,
  createCandidateNote,
  archiveCandidate,
  calculateDocumentProgress,
  getStatusesForType,
  STATUS_LABELS,
  SOURCE_LABELS,
  TYPE_LABELS,
  NEXT_ACTION,
  DOCUMENT_TYPE_LABELS,
  DOCUMENT_STATUS_LABELS,
  COMM_TYPE_LABELS,
  COMM_STATUS_LABELS,
  type OnboardingCandidate,
  type OnboardingDocument,
  type OnboardingNote,
  type OnboardingCommunication,
  type OnboardingStatus,
  type OnboardingDocumentStatus,
  type OnboardingCommType,
  type CandidateType,
  type OnboardingSource,
  type YesNoUnknown
} from "@/lib/onboarding-api"
import {
  EMAIL_TEMPLATES,
  generateEmail,
  formatTerminSlot,
  type EmailTemplateType,
  type TemplateVariables
} from "@/lib/onboarding-email-templates"
import { supabase } from "@/lib/supabase"
import { signOut } from "@/lib/api"
// Status Badge Config
const STATUS_CONFIG: Record<string, { className: string }> = {
  'neu': { className: 'bg-blue-50 text-blue-700 border-blue-200' },
  'kontakt_aufgenommen': { className: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  'termin_angeboten': { className: 'bg-purple-50 text-purple-700 border-purple-200' },
  'termin_geplant': { className: 'bg-violet-50 text-violet-700 border-violet-200' },
  'gespraech_gefuehrt': { className: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
  'geeignet': { className: 'bg-teal-50 text-teal-700 border-teal-200' },
  'abgelehnt': { className: 'bg-red-50 text-red-700 border-red-200' },
  'dokumente_angefordert': { className: 'bg-amber-50 text-amber-700 border-amber-200' },
  'dokumente_unvollstaendig': { className: 'bg-orange-50 text-orange-700 border-orange-200' },
  'dokumente_vollstaendig': { className: 'bg-lime-50 text-lime-700 border-lime-200' },
  'freigabe_offen': { className: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
  'freigegeben': { className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  'fahrer_erstellt': { className: 'bg-green-50 text-green-700 border-green-200' },
  'aktiv': { className: 'bg-green-50 text-green-700 border-green-200' },
  'archiviert': { className: 'bg-gray-100 text-gray-500 border-gray-300' },
}
const DOC_STATUS_CONFIG: Record<OnboardingDocumentStatus, { className: string; icon: React.ReactNode }> = {
  'offen': { className: 'bg-gray-100 text-gray-600', icon: <Clock className="h-3 w-3" /> },
  'angefordert': { className: 'bg-blue-50 text-blue-700', icon: <Mail className="h-3 w-3" /> },
  'erhalten': { className: 'bg-amber-50 text-amber-700', icon: <FileText className="h-3 w-3" /> },
  'geprueft': { className: 'bg-emerald-50 text-emerald-700', icon: <CheckCircle className="h-3 w-3" /> },
  'abgelehnt': { className: 'bg-red-50 text-red-700', icon: <XCircle className="h-3 w-3" /> },
  'nicht_erforderlich': { className: 'bg-gray-50 text-gray-500', icon: <XCircle className="h-3 w-3" /> },
}
export default function CandidateDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  // Auth state
  const [userName, setUserName] = useState("")
  const [userRole, setUserRole] = useState<'admin' | 'gf'>('admin')
  const [candidate, setCandidate] = useState<OnboardingCandidate | null>(null)
  const [documents, setDocuments] = useState<OnboardingDocument[]>([])
  const [notes, setNotes] = useState<OnboardingNote[]>([])
  const [communications, setCommunications] = useState<OnboardingCommunication[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState("")
  // Kommunikation Modal State
  const [showCommModal, setShowCommModal] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplateType | null>(null)
  const [generatedSubject, setGeneratedSubject] = useState("")
  const [generatedBody, setGeneratedBody] = useState("")
  const [suggestedStatus, setSuggestedStatus] = useState<OnboardingStatus | null>(null)
  const [isCopied, setIsCopied] = useState(false)
  // Edit state
  const [editedCandidate, setEditedCandidate] = useState<Partial<OnboardingCandidate>>({})
  const [hasChanges, setHasChanges] = useState(false)
  // Notes
  const [newNoteContent, setNewNoteContent] = useState("")
  const [isAddingNote, setIsAddingNote] = useState(false)
  // Document upload
  const [uploadingDocId, setUploadingDocId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  // Status change modal
  const [showStatusModal, setShowStatusModal] = useState(false)
  const [newStatus, setNewStatus] = useState<OnboardingStatus | null>(null)
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
        .select('role, full_name')
        .eq('id', session.user.id)
        .single()
      if (!profile || !['admin', 'gf'].includes(profile.role)) {
        router.push('/admin/dashboard')
        return
      }
      setUserRole(profile.role as 'admin' | 'gf')
      setUserName(profile.full_name || '')
    }
    checkAuth()
  }, [router])
  const handleLogout = async () => {
    await signOut()
    router.push('/admin')
  }
  const loadData = useCallback(async () => {
    setIsLoading(true)
    try {
      const [candidateData, docsData, notesData, commsData] = await Promise.all([
        getOnboardingCandidate(id),
        getCandidateDocuments(id),
        getCandidateNotes(id),
        getCandidateCommunications(id)
      ])
      if (!candidateData) {
        router.push('/admin/onboarding')
        return
      }
      setCandidate(candidateData)
      setEditedCandidate(candidateData)
      setDocuments(docsData)
      setNotes(notesData)
      setCommunications(commsData)
    } catch (err) {
      console.error('Fehler beim Laden:', err)
      setError('Fehler beim Laden der Daten')
    } finally {
      setIsLoading(false)
    }
  }, [id, router])
  useEffect(() => {
    loadData()
  }, [loadData])
  // Track changes
  useEffect(() => {
    if (!candidate) return
    const changed = JSON.stringify(editedCandidate) !== JSON.stringify(candidate)
    setHasChanges(changed)
  }, [editedCandidate, candidate])
  const handleSave = async () => {
    if (!candidate || !hasChanges) return
    setIsSaving(true)
    setError("")
    try {
      const result = await updateOnboardingCandidate(candidate.id, editedCandidate)
      if (!result.success) throw new Error(result.error)
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Speichern')
    } finally {
      setIsSaving(false)
    }
  }
  const handleStatusChange = async () => {
    if (!candidate || !newStatus) return
    setIsSaving(true)
    try {
      const result = await updateOnboardingCandidate(candidate.id, { status: newStatus })
      if (!result.success) throw new Error(result.error)
      setShowStatusModal(false)
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Status-Update')
    } finally {
      setIsSaving(false)
    }
  }
  const handleArchive = async () => {
    if (!candidate) return
    if (!confirm('Kandidat wirklich archivieren? Dies kann nicht rückgängig gemacht werden.')) return
    const result = await archiveCandidate(candidate.id)
    if (result.success) {
      router.push('/admin/onboarding')
    } else {
      setError(result.error || 'Fehler beim Archivieren')
    }
  }
  const handleDocStatusChange = async (docId: string, status: OnboardingDocumentStatus) => {
    const result = await updateDocumentStatus(docId, status)
    if (result.success) {
      await loadData()
    } else {
      alert(result.error || 'Fehler beim Aktualisieren')
    }
  }
  const handleDocUpload = async (docId: string, file: File) => {
    if (!candidate) return
    setUploadingDocId(docId)
    const result = await uploadDocumentFile(docId, candidate.id, file)
    setUploadingDocId(null)
    if (result.success) {
      await loadData()
    } else {
      alert(result.error || 'Fehler beim Upload')
    }
  }
  const handleDocDownload = async (docId: string) => {
    const result = await getDocumentDownloadUrl(docId)
    if (result.success && result.url) {
      window.open(result.url, '_blank')
    } else {
      alert(result.error || 'Fehler beim Download')
    }
  }
  const handleAddNote = async () => {
    if (!newNoteContent.trim()) return
    setIsAddingNote(true)
    const result = await createCandidateNote(id, newNoteContent.trim())
    setIsAddingNote(false)
    if (result.success) {
      setNewNoteContent("")
      await loadData()
    } else {
      alert(result.error || 'Fehler beim Erstellen der Notiz')
    }
  }
  // Kommunikation: Template auswählen und generieren
  const handleOpenCommModal = (templateType: EmailTemplateType) => {
    if (!candidate) return
    setSelectedTemplate(templateType)
    const variables: TemplateVariables = {
      vorname: candidate.first_name,
      nachname: candidate.last_name,
      termin_1: formatTerminSlot(candidate.termin_slot_1),
      termin_2: formatTerminSlot(candidate.termin_slot_2),
      termin_3: formatTerminSlot(candidate.termin_slot_3),
      teams_link: candidate.teams_link || '[Teams-Link hier einfügen]',
      ansprechpartner: userName || 'TransNext Team'
    }
    const { subject, body, suggestedStatus: newStatus } = generateEmail(templateType, variables)
    setGeneratedSubject(subject)
    setGeneratedBody(body)
    setSuggestedStatus(newStatus as OnboardingStatus || null)
    setIsCopied(false)
    setShowCommModal(true)
  }
  const handleCopyText = async () => {
    const fullText = `Betreff: ${generatedSubject}\n\n${generatedBody}`
    try {
      await navigator.clipboard.writeText(fullText)
      setIsCopied(true)
      // Kommunikation in Historie speichern
      if (selectedTemplate) {
        await createCommunication(
          id,
          selectedTemplate as OnboardingCommType,
          generatedSubject,
          generatedBody,
          'copied'
        )
        await loadData()
      }
      setTimeout(() => setIsCopied(false), 2000)
    } catch (err) {
      alert('Text konnte nicht kopiert werden')
    }
  }
  const handleMarkAsSent = async () => {
    if (!selectedTemplate) return
    // Kommunikation als manuell gesendet speichern
    await createCommunication(
      id,
      selectedTemplate as OnboardingCommType,
      generatedSubject,
      generatedBody,
      'sent_manual'
    )
    // Optional: Status aktualisieren
    if (suggestedStatus && candidate?.status !== suggestedStatus) {
      const result = await updateOnboardingCandidate(id, { status: suggestedStatus })
      if (!result.success) {
        alert(result.error || 'Fehler beim Status-Update')
      }
    }
    setShowCommModal(false)
    await loadData()
  }
  const formatDate = (dateStr: string | null): string => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }
  const formatDateTime = (dateStr: string | null): string => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  }
  if (isLoading) {
    return (
      <AdminLayout userName={userName} userRole={userRole} onLogout={handleLogout}>
        <div className="flex items-center justify-center min-h-[400px]">
          <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      </AdminLayout>
    )
  }
  if (!candidate) {
    return (
      <AdminLayout userName={userName} userRole={userRole} onLogout={handleLogout}>
        <div className="text-center py-12">
          <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
          <p className="text-gray-500">Kandidat nicht gefunden</p>
          <Button onClick={() => router.push('/admin/onboarding')} className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Zurück zur Übersicht
          </Button>
        </div>
      </AdminLayout>
    )
  }
  const docProgress = calculateDocumentProgress(documents)
  const availableStatuses = getStatusesForType(candidate.type)
  const statusConfig = STATUS_CONFIG[candidate.status] || { className: 'bg-gray-100 text-gray-700' }
  return (
    <AdminLayout userName={userName} userRole={userRole} onLogout={handleLogout}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" onClick={() => router.push('/admin/onboarding')}>
              <ArrowLeft className="h-4 w-4 mr-1" />
              Zurück
            </Button>
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">
                {candidate.first_name} {candidate.last_name}
              </h1>
              <p className="text-sm text-gray-500">
                {TYPE_LABELS[candidate.type]} - {SOURCE_LABELS[candidate.source]}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {hasChanges && (
              <Button onClick={handleSave} disabled={isSaving} className="bg-primary-blue hover:bg-blue-700">
                {isSaving ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                Speichern
              </Button>
            )}
            {candidate.status !== 'archiviert' && (
              <Button variant="outline" onClick={handleArchive} className="text-amber-600 border-amber-200 hover:bg-amber-50">
                <Archive className="h-4 w-4 mr-2" />
                Archivieren
              </Button>
            )}
          </div>
        </div>
        {/* Error */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            {error}
          </div>
        )}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Main Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Status & Prozess */}
            <Card className="border-gray-100">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Prozess-Status</CardTitle>
                  <Badge className={cn("text-sm border", statusConfig.className)}>
                    {STATUS_LABELS[candidate.status]}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <p className="text-xs text-blue-600 font-medium mb-1">Nächste Aktion</p>
                    <p className="text-sm font-medium text-blue-800 flex items-center gap-2">
                      <ArrowRight className="h-4 w-4" />
                      {NEXT_ACTION[candidate.status]}
                    </p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-600 font-medium mb-1">Dokumente</p>
                    <p className="text-sm font-medium text-gray-800">
                      {docProgress.complete} / {docProgress.total} vollständig ({docProgress.percent}%)
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setNewStatus(candidate.status)
                      setShowStatusModal(true)
                    }}
                  >
                    Status ändern
                  </Button>
                  {candidate.status === 'freigegeben' && (
                    <Button size="sm" disabled className="bg-emerald-600">
                      <Users className="h-4 w-4 mr-2" />
                      Fahrer erstellen (Phase 2)
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
            {/* Stammdaten */}
            <Card className="border-gray-100">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="h-5 w-5 text-gray-400" />
                  Stammdaten
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Vorname</Label>
                    <Input
                      value={editedCandidate.first_name || ''}
                      onChange={(e) => setEditedCandidate(p => ({ ...p, first_name: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Nachname</Label>
                    <Input
                      value={editedCandidate.last_name || ''}
                      onChange={(e) => setEditedCandidate(p => ({ ...p, last_name: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>E-Mail</Label>
                    <Input
                      type="email"
                      value={editedCandidate.email || ''}
                      onChange={(e) => setEditedCandidate(p => ({ ...p, email: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Telefon</Label>
                    <Input
                      value={editedCandidate.phone || ''}
                      onChange={(e) => setEditedCandidate(p => ({ ...p, phone: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Ort</Label>
                    <Input
                      value={editedCandidate.city || ''}
                      onChange={(e) => setEditedCandidate(p => ({ ...p, city: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Typ</Label>
                    <Select
                      value={editedCandidate.type}
                      onValueChange={(v) => setEditedCandidate(p => ({ ...p, type: v as CandidateType }))}
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
                  <div className="space-y-2">
                    <Label>Quelle</Label>
                    <Select
                      value={editedCandidate.source}
                      onValueChange={(v) => setEditedCandidate(p => ({ ...p, source: v as OnboardingSource }))}
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
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                  <div className="space-y-2">
                    <Label>Führerschein</Label>
                    <Select
                      value={editedCandidate.has_license || 'unknown'}
                      onValueChange={(v) => setEditedCandidate(p => ({ ...p, has_license: v as YesNoUnknown }))}
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
                      value={editedCandidate.experience_level || 'unknown'}
                      onValueChange={(v) => setEditedCandidate(p => ({ ...p, experience_level: v as YesNoUnknown }))}
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
                    <Label>Verfügbarkeit bekannt</Label>
                    <Select
                      value={editedCandidate.availability_known || 'unknown'}
                      onValueChange={(v) => setEditedCandidate(p => ({ ...p, availability_known: v as YesNoUnknown }))}
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
                </div>
                {/* Termin-Slots */}
                <div className="md:col-span-2 pt-4 border-t">
                  <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Terminangebot (3 Slots)
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Termin 1</Label>
                      <Input
                        type="datetime-local"
                        value={editedCandidate.termin_slot_1 ? editedCandidate.termin_slot_1.slice(0, 16) : ''}
                        onChange={(e) => setEditedCandidate(p => ({ ...p, termin_slot_1: e.target.value ? new Date(e.target.value).toISOString() : null }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Termin 2</Label>
                      <Input
                        type="datetime-local"
                        value={editedCandidate.termin_slot_2 ? editedCandidate.termin_slot_2.slice(0, 16) : ''}
                        onChange={(e) => setEditedCandidate(p => ({ ...p, termin_slot_2: e.target.value ? new Date(e.target.value).toISOString() : null }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Termin 3</Label>
                      <Input
                        type="datetime-local"
                        value={editedCandidate.termin_slot_3 ? editedCandidate.termin_slot_3.slice(0, 16) : ''}
                        onChange={(e) => setEditedCandidate(p => ({ ...p, termin_slot_3: e.target.value ? new Date(e.target.value).toISOString() : null }))}
                      />
                    </div>
                  </div>
                  <div className="mt-3 space-y-2">
                    <Label>Termin-Bemerkung</Label>
                    <Input
                      value={editedCandidate.termin_bemerkung || ''}
                      onChange={(e) => setEditedCandidate(p => ({ ...p, termin_bemerkung: e.target.value }))}
                      placeholder="z.B. bevorzugt vormittags..."
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Bestätigter Termin</Label>
                  <Input
                    type="datetime-local"
                    value={editedCandidate.interview_date ? editedCandidate.interview_date.slice(0, 16) : ''}
                    onChange={(e) => setEditedCandidate(p => ({ ...p, interview_date: e.target.value ? new Date(e.target.value).toISOString() : null }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Teams-Link</Label>
                  <div className="flex gap-2">
                    <Input
                      value={editedCandidate.teams_link || ''}
                      onChange={(e) => setEditedCandidate(p => ({ ...p, teams_link: e.target.value }))}
                      placeholder="https://teams.microsoft.com/..."
                      className="flex-1"
                    />
                    {editedCandidate.teams_link && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(editedCandidate.teams_link || '', '_blank')}
                      >
                        <Video className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Interne Notizen</Label>
                  <Textarea
                    value={editedCandidate.notes_internal || ''}
                    onChange={(e) => setEditedCandidate(p => ({ ...p, notes_internal: e.target.value }))}
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>
            {/* Dokumente */}
            <Card className="border-gray-100">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5 text-gray-400" />
                  Dokumente / Checkliste
                </CardTitle>
                <CardDescription>
                  {docProgress.complete} von {docProgress.total} Dokumenten vollständig
                </CardDescription>
              </CardHeader>
              <CardContent>
                {documents.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">Keine Dokumente definiert</p>
                ) : (
                  <div className="space-y-3">
                    {documents.map(doc => {
                      const docStatusConf = DOC_STATUS_CONFIG[doc.status]
                      return (
                        <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg bg-gray-50/50">
                          <div className="flex items-center gap-3">
                            <FileText className="h-5 w-5 text-gray-400" />
                            <div>
                              <p className="text-sm font-medium">{DOCUMENT_TYPE_LABELS[doc.document_type]}</p>
                              {doc.file_name && (
                                <p className="text-xs text-gray-500">{doc.file_name}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Select
                              value={doc.status}
                              onValueChange={(v) => handleDocStatusChange(doc.id, v as OnboardingDocumentStatus)}
                            >
                              <SelectTrigger className={cn("w-[140px] h-8 text-xs", docStatusConf.className)}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="offen">Offen</SelectItem>
                                <SelectItem value="angefordert">Angefordert</SelectItem>
                                <SelectItem value="erhalten">Erhalten</SelectItem>
                                <SelectItem value="geprueft">Geprüft</SelectItem>
                                <SelectItem value="abgelehnt">Abgelehnt</SelectItem>
                                <SelectItem value="nicht_erforderlich">Nicht erforderlich</SelectItem>
                              </SelectContent>
                            </Select>
                            {doc.file_path ? (
                              <Button size="sm" variant="outline" onClick={() => handleDocDownload(doc.id)}>
                                <Download className="h-4 w-4" />
                              </Button>
                            ) : (
                              <>
                                <input
                                  type="file"
                                  ref={fileInputRef}
                                  className="hidden"
                                  accept=".pdf,.jpg,.jpeg,.png"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0]
                                    if (file) handleDocUpload(doc.id, file)
                                  }}
                                />
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={uploadingDocId === doc.id}
                                  onClick={() => {
                                    fileInputRef.current?.click()
                                  }}
                                >
                                  {uploadingDocId === doc.id ? (
                                    <RefreshCw className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Upload className="h-4 w-4" />
                                  )}
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
            {/* Kommunikation */}
            <Card className="border-gray-100">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Send className="h-5 w-5 text-gray-400" />
                  Kommunikation
                </CardTitle>
                <CardDescription>
                  Nachrichten vorbereiten und Text kopieren
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-6">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-auto py-3 flex flex-col gap-1"
                    onClick={() => handleOpenCommModal('erstkontakt')}
                  >
                    <Mail className="h-4 w-4" />
                    <span className="text-xs">Erstkontakt</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-auto py-3 flex flex-col gap-1"
                    onClick={() => handleOpenCommModal('terminangebot')}
                  >
                    <Calendar className="h-4 w-4" />
                    <span className="text-xs">Terminangebot</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-auto py-3 flex flex-col gap-1"
                    onClick={() => handleOpenCommModal('teams_link')}
                  >
                    <Video className="h-4 w-4" />
                    <span className="text-xs">Teams-Link</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-auto py-3 flex flex-col gap-1"
                    onClick={() => handleOpenCommModal('personalfragebogen')}
                  >
                    <ClipboardList className="h-4 w-4" />
                    <span className="text-xs">Fragebogen</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-auto py-3 flex flex-col gap-1"
                    onClick={() => handleOpenCommModal('infomaterial')}
                  >
                    <FileText className="h-4 w-4" />
                    <span className="text-xs">Infomaterial</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-auto py-3 flex flex-col gap-1"
                    onClick={() => handleOpenCommModal('fehlende_dokumente')}
                  >
                    <AlertTriangle className="h-4 w-4" />
                    <span className="text-xs">Fehlende Dok.</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-auto py-3 flex flex-col gap-1"
                    onClick={() => handleOpenCommModal('vertrag')}
                  >
                    <Briefcase className="h-4 w-4" />
                    <span className="text-xs">Vertrag</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-auto py-3 flex flex-col gap-1 text-red-600 hover:text-red-700"
                    onClick={() => handleOpenCommModal('absage')}
                  >
                    <XCircle className="h-4 w-4" />
                    <span className="text-xs">Absage</span>
                  </Button>
                </div>
                {/* Kommunikationshistorie */}
                <div className="border-t pt-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                    <History className="h-4 w-4" />
                    Historie
                  </h4>
                  {communications.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-2">Noch keine Kommunikation</p>
                  ) : (
                    <div className="space-y-2 max-h-[200px] overflow-y-auto">
                      {communications.slice(0, 5).map(comm => (
                        <div key={comm.id} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {COMM_TYPE_LABELS[comm.comm_type]}
                            </Badge>
                            <span className="text-gray-500 text-xs">
                              {formatDateTime(comm.created_at)}
                            </span>
                          </div>
                          <Badge className={cn("text-xs", {
                            'bg-gray-100 text-gray-600': comm.status === 'prepared',
                            'bg-blue-50 text-blue-700': comm.status === 'copied',
                            'bg-green-50 text-green-700': comm.status === 'sent_manual' || comm.status === 'sent_auto'
                          })}>
                            {COMM_STATUS_LABELS[comm.status]}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
          {/* Right Column - Meta & Notes */}
          <div className="space-y-6">
            {/* Meta Info */}
            <Card className="border-gray-100">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-gray-600">Informationen</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Erstellt am</span>
                  <span className="text-gray-900">{formatDateTime(candidate.created_at)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Aktualisiert am</span>
                  <span className="text-gray-900">{formatDateTime(candidate.updated_at)}</span>
                </div>
                {candidate.interview_date && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Interview</span>
                    <span className="text-gray-900">{formatDateTime(candidate.interview_date)}</span>
                  </div>
                )}
                {candidate.teams_link && (
                  <div className="pt-2">
                    <a
                      href={candidate.teams_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-primary-blue hover:underline"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Teams-Link öffnen
                    </a>
                  </div>
                )}
              </CardContent>
            </Card>
            {/* Notes */}
            <Card className="border-gray-100">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-gray-400" />
                  Notizen
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 mb-4">
                  {notes.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-2">Noch keine Notizen</p>
                  ) : (
                    notes.map(note => (
                      <div key={note.id} className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-800 whitespace-pre-wrap">{note.content}</p>
                        <p className="text-xs text-gray-400 mt-2">
                          {note.created_by_name || 'Unbekannt'} - {formatDateTime(note.created_at)}
                        </p>
                      </div>
                    ))
                  )}
                </div>
                <div className="space-y-2">
                  <Textarea
                    value={newNoteContent}
                    onChange={(e) => setNewNoteContent(e.target.value)}
                    placeholder="Neue Notiz hinzufügen..."
                    rows={2}
                  />
                  <Button
                    size="sm"
                    onClick={handleAddNote}
                    disabled={!newNoteContent.trim() || isAddingNote}
                    className="w-full"
                  >
                    {isAddingNote ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                    Notiz hinzufügen
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
        {/* Status Change Modal */}
        <Dialog open={showStatusModal} onOpenChange={setShowStatusModal}>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle>Status ändern</DialogTitle>
              <DialogDescription>
                Wählen Sie den neuen Status für diesen Kandidaten.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <Select
                value={newStatus || undefined}
                onValueChange={(v) => setNewStatus(v as OnboardingStatus)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Status wählen" />
                </SelectTrigger>
                <SelectContent>
                  {availableStatuses.map(status => (
                    <SelectItem key={status} value={status}>
                      {STATUS_LABELS[status]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowStatusModal(false)}>
                Abbrechen
              </Button>
              <Button onClick={handleStatusChange} disabled={!newStatus || isSaving}>
                {isSaving ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : null}
                Status speichern
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        {/* Kommunikation Modal */}
        <Dialog open={showCommModal} onOpenChange={setShowCommModal}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Send className="h-5 w-5" />
                {selectedTemplate && COMM_TYPE_LABELS[selectedTemplate as OnboardingCommType]}
              </DialogTitle>
              <DialogDescription>
                Text kopieren und per E-Mail / WhatsApp versenden
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Betreff</Label>
                <Input
                  value={generatedSubject}
                  onChange={(e) => setGeneratedSubject(e.target.value)}
                  className="font-mono text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Nachricht</Label>
                <Textarea
                  value={generatedBody}
                  onChange={(e) => setGeneratedBody(e.target.value)}
                  rows={12}
                  className="font-mono text-sm"
                />
              </div>
              {suggestedStatus && candidate?.status !== suggestedStatus && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
                  <p className="font-medium">Vorgeschlagene Status-Änderung:</p>
                  <p>{STATUS_LABELS[candidate?.status || 'neu']} → {STATUS_LABELS[suggestedStatus]}</p>
                </div>
              )}
            </div>
            <DialogFooter className="flex gap-2">
              <Button variant="outline" onClick={() => setShowCommModal(false)}>
                Abbrechen
              </Button>
              <Button
                variant="outline"
                onClick={handleCopyText}
                className={cn(isCopied && "bg-green-50 border-green-500 text-green-700")}
              >
                {isCopied ? <CheckCircle className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                {isCopied ? 'Kopiert!' : 'Text kopieren'}
              </Button>
              <Button onClick={handleMarkAsSent}>
                <Send className="h-4 w-4 mr-2" />
                Als gesendet markieren
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  )
}
