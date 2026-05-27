"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
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
  Users
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  getOnboardingCandidate,
  getCandidateDocuments,
  getCandidateNotes,
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
  type OnboardingCandidate,
  type OnboardingDocument,
  type OnboardingNote,
  type OnboardingStatus,
  type OnboardingDocumentStatus,
  type CandidateType,
  type OnboardingSource,
  type YesNoUnknown
} from "@/lib/onboarding-api"
import { supabase } from "@/lib/supabase"

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

  const [candidate, setCandidate] = useState<OnboardingCandidate | null>(null)
  const [documents, setDocuments] = useState<OnboardingDocument[]>([])
  const [notes, setNotes] = useState<OnboardingNote[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState("")

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
      const [candidateData, docsData, notesData] = await Promise.all([
        getOnboardingCandidate(id),
        getCandidateDocuments(id),
        getCandidateNotes(id)
      ])
      if (!candidateData) {
        router.push('/admin/onboarding')
        return
      }
      setCandidate(candidateData)
      setEditedCandidate(candidateData)
      setDocuments(docsData)
      setNotes(notesData)
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
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (!candidate) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Kandidat nicht gefunden</p>
        <Button onClick={() => router.push('/admin/onboarding')} className="mt-4">
          Zurück zur Übersicht
        </Button>
      </div>
    )
  }

  const docProgress = calculateDocumentProgress(documents)
  const availableStatuses = getStatusesForType(candidate.type)
  const statusConfig = STATUS_CONFIG[candidate.status] || { className: 'bg-gray-100 text-gray-700' }

  return (
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

              <div className="space-y-2">
                <Label>Interview-Datum</Label>
                <Input
                  type="datetime-local"
                  value={editedCandidate.interview_date ? editedCandidate.interview_date.slice(0, 16) : ''}
                  onChange={(e) => setEditedCandidate(p => ({ ...p, interview_date: e.target.value ? new Date(e.target.value).toISOString() : null }))}
                />
              </div>

              <div className="space-y-2">
                <Label>Teams-Link</Label>
                <Input
                  value={editedCandidate.teams_link || ''}
                  onChange={(e) => setEditedCandidate(p => ({ ...p, teams_link: e.target.value }))}
                  placeholder="https://teams.microsoft.com/..."
                />
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
    </div>
  )
}
