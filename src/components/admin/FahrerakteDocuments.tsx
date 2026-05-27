"use client"

import { useEffect, useState, useRef } from "react"
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { EmptyState } from "@/components/ui/empty-state"
import {
  FileText,
  Upload,
  Download,
  Trash2,
  Archive,
  MoreHorizontal,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Calendar,
  RefreshCw,
  Eye,
  Plus,
  FileCheck
} from "lucide-react"
import {
  getFahrerDocuments,
  uploadFahrerDocument,
  updateDocumentStatus,
  archiveDocument,
  getDocumentDownloadUrl,
  getDocumentTypeLabel,
  getDocumentStatusLabel,
  type FahrerDocument,
  type DocumentType,
  type DocumentStatus
} from "@/lib/fahrer-management-api"
import { cn } from "@/lib/utils"

interface FahrerakteDocumentsProps {
  fahrerId: string
  isAdmin: boolean
}

const DOCUMENT_TYPES: { value: DocumentType; label: string }[] = [
  { value: 'fuehrerschein', label: 'Führerschein' },
  { value: 'ausweis', label: 'Ausweis' },
  { value: 'uvv', label: 'UVV/Schulung' },
  { value: 'vertrag', label: 'Vertrag' },
  { value: 'abmahnung', label: 'Abmahnung' },
  { value: 'schulung', label: 'Schulungsnachweis' },
  { value: 'sonstiges', label: 'Sonstiges' }
]

const STATUS_CONFIG: Record<DocumentStatus, { label: string; className: string; icon: React.ReactNode }> = {
  offen: {
    label: 'Offen',
    className: 'bg-gray-100 text-gray-700 border-gray-200',
    icon: <Clock className="h-3 w-3" />
  },
  hochgeladen: {
    label: 'Hochgeladen',
    className: 'bg-blue-50 text-blue-700 border-blue-200',
    icon: <Upload className="h-3 w-3" />
  },
  geprueft: {
    label: 'Geprüft',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: <CheckCircle className="h-3 w-3" />
  },
  abgelehnt: {
    label: 'Abgelehnt',
    className: 'bg-red-50 text-red-700 border-red-200',
    icon: <XCircle className="h-3 w-3" />
  },
  abgelaufen: {
    label: 'Abgelaufen',
    className: 'bg-orange-50 text-orange-700 border-orange-200',
    icon: <AlertTriangle className="h-3 w-3" />
  },
  archiviert: {
    label: 'Archiviert',
    className: 'bg-gray-100 text-gray-500 border-gray-300',
    icon: <Trash2 className="h-3 w-3" />
  }
}

function getStatusConfig(status: DocumentStatus) {
  return STATUS_CONFIG[status] || STATUS_CONFIG.offen
}

export function FahrerakteDocuments({ fahrerId, isAdmin }: FahrerakteDocumentsProps) {
  const [documents, setDocuments] = useState<FahrerDocument[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState("")

  // Upload Modal State
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadType, setUploadType] = useState<DocumentType>('sonstiges')
  const [uploadExpiresAt, setUploadExpiresAt] = useState("")
  const [uploadComment, setUploadComment] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Status Modal State
  const [showStatusModal, setShowStatusModal] = useState(false)
  const [statusDoc, setStatusDoc] = useState<FahrerDocument | null>(null)
  const [newStatus, setNewStatus] = useState<DocumentStatus>('hochgeladen')
  const [statusComment, setStatusComment] = useState("")
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)

  // Archive Modal State (kein hartes Löschen mehr)
  const [showArchiveModal, setShowArchiveModal] = useState(false)
  const [archiveDoc, setArchiveDoc] = useState<FahrerDocument | null>(null)
  const [isArchiving, setIsArchiving] = useState(false)

  useEffect(() => {
    loadDocuments()
  }, [fahrerId])

  const loadDocuments = async () => {
    setIsLoading(true)
    try {
      const data = await getFahrerDocuments(fahrerId)
      setDocuments(data)
    } catch (err) {
      console.error("Fehler beim Laden der Dokumente:", err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) {
      setError("Bitte eine Datei auswählen")
      return
    }

    setIsUploading(true)
    setError("")

    try {
      const result = await uploadFahrerDocument(
        fahrerId,
        selectedFile,
        uploadType,
        uploadExpiresAt || undefined,
        uploadComment || undefined
      )

      if (!result.success) {
        throw new Error(result.error || 'Upload fehlgeschlagen')
      }

      // Reset und schließen
      setSelectedFile(null)
      setUploadType('sonstiges')
      setUploadExpiresAt("")
      setUploadComment("")
      setShowUploadModal(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }

      // Liste neu laden
      await loadDocuments()
    } catch (err) {
      console.error("Upload-Fehler:", err)
      setError(err instanceof Error ? err.message : 'Upload fehlgeschlagen')
    } finally {
      setIsUploading(false)
    }
  }

  const handleDownload = async (doc: FahrerDocument) => {
    try {
      const result = await getDocumentDownloadUrl(doc.id)
      if (result.success && result.url) {
        window.open(result.url, '_blank')
      } else {
        alert("Fehler beim Erstellen der Download-URL")
      }
    } catch (err) {
      console.error("Download-Fehler:", err)
      alert("Fehler beim Download")
    }
  }

  const handleOpenStatusModal = (doc: FahrerDocument) => {
    setStatusDoc(doc)
    setNewStatus(doc.status)
    setStatusComment(doc.comment || "")
    setShowStatusModal(true)
  }

  const handleUpdateStatus = async () => {
    if (!statusDoc) return

    setIsUpdatingStatus(true)
    try {
      const result = await updateDocumentStatus(statusDoc.id, newStatus, statusComment || undefined)
      if (!result.success) {
        throw new Error(result.error || 'Fehler beim Aktualisieren')
      }

      setShowStatusModal(false)
      setStatusDoc(null)
      await loadDocuments()
    } catch (err) {
      console.error("Status-Update Fehler:", err)
      alert("Fehler beim Aktualisieren des Status")
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  const handleOpenArchiveModal = (doc: FahrerDocument) => {
    setArchiveDoc(doc)
    setShowArchiveModal(true)
  }

  const handleArchive = async () => {
    if (!archiveDoc) return

    setIsArchiving(true)
    try {
      const result = await archiveDocument(archiveDoc.id)
      if (!result.success) {
        throw new Error(result.error || 'Fehler beim Archivieren')
      }

      setShowArchiveModal(false)
      setArchiveDoc(null)
      await loadDocuments()
    } catch (err) {
      console.error("Archivierungs-Fehler:", err)
      alert("Fehler beim Archivieren des Dokuments")
    } finally {
      setIsArchiving(false)
    }
  }

  const formatDate = (dateStr: string | null | undefined): string => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('de-DE')
  }

  const formatFileSize = (bytes: number | undefined): string => {
    if (!bytes) return '-'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const isExpiringSoon = (expiresAt: string | null | undefined): boolean => {
    if (!expiresAt) return false
    const expires = new Date(expiresAt)
    const thirtyDaysFromNow = new Date()
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)
    return expires <= thirtyDaysFromNow && expires > new Date()
  }

  const isExpired = (expiresAt: string | null | undefined): boolean => {
    if (!expiresAt) return false
    return new Date(expiresAt) < new Date()
  }

  if (!isAdmin) {
    return null
  }

  if (isLoading) {
    return (
      <Card className="border-gray-100">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5 text-gray-400" />
            Dokumente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-6">
            <RefreshCw className="h-5 w-5 animate-spin text-gray-400" />
            <span className="ml-2 text-sm text-gray-500">Lade Dokumente...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Gruppiere nach Typ für bessere Übersicht
  const documentsByType = documents.reduce((acc, doc) => {
    if (!acc[doc.document_type]) {
      acc[doc.document_type] = []
    }
    acc[doc.document_type].push(doc)
    return acc
  }, {} as Record<DocumentType, FahrerDocument[]>)

  const pendingCount = documents.filter(d => d.status === 'offen' || d.status === 'hochgeladen').length
  const expiredCount = documents.filter(d => d.status === 'abgelaufen' || isExpired(d.expires_at)).length

  return (
    <>
      <Card className="border-gray-100">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5 text-gray-400" />
                Dokumente
                {documents.length > 0 && (
                  <Badge variant="outline" className="ml-2 text-xs">
                    {documents.length}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>Upload-Center für Fahrer-Dokumente</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {pendingCount > 0 && (
                <Badge className="bg-amber-50 text-amber-700 border-amber-200 border">
                  <Clock className="h-3 w-3 mr-1" />
                  {pendingCount} offen
                </Badge>
              )}
              {expiredCount > 0 && (
                <Badge className="bg-red-50 text-red-700 border-red-200 border">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  {expiredCount} abgelaufen
                </Badge>
              )}
              <Button
                size="sm"
                onClick={() => setShowUploadModal(true)}
                className="bg-primary-blue hover:bg-blue-700"
              >
                <Upload className="h-4 w-4 mr-1" />
                Hochladen
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {documents.length === 0 ? (
            <EmptyState
              title="Keine Dokumente"
              description="Laden Sie Dokumente wie Führerschein, Ausweis oder Verträge hoch."
              icon={<FileText className="h-12 w-12 text-gray-400" />}
              iconSize="sm"
              action={
                <Button
                  variant="outline"
                  onClick={() => setShowUploadModal(true)}
                  className="mt-2"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Erstes Dokument hochladen
                </Button>
              }
            />
          ) : (
            <>
              {/* Desktop: Tabelle */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50/50 hover:bg-gray-50/50">
                      <TableHead className="font-medium text-gray-600">Typ</TableHead>
                      <TableHead className="font-medium text-gray-600">Dateiname</TableHead>
                      <TableHead className="font-medium text-gray-600">Status</TableHead>
                      <TableHead className="font-medium text-gray-600">Ablauf</TableHead>
                      <TableHead className="font-medium text-gray-600">Hochgeladen</TableHead>
                      <TableHead className="font-medium text-gray-600 text-right">Aktionen</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {documents.map(doc => {
                      const statusConfig = getStatusConfig(doc.status)
                      const expiring = isExpiringSoon(doc.expires_at)
                      const expired = isExpired(doc.expires_at)

                      return (
                        <TableRow key={doc.id} className="hover:bg-gray-50/50">
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {getDocumentTypeLabel(doc.document_type)}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-[200px]">
                            <div className="truncate text-sm font-medium" title={doc.file_name}>
                              {doc.file_name}
                            </div>
                            <div className="text-xs text-gray-500">
                              {formatFileSize(doc.file_size)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={cn("border text-xs", statusConfig.className)}>
                              {statusConfig.icon}
                              <span className="ml-1">{statusConfig.label}</span>
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {doc.expires_at ? (
                              <div className={cn(
                                "flex items-center gap-1 text-sm",
                                expired ? "text-red-600" : expiring ? "text-amber-600" : "text-gray-600"
                              )}>
                                {(expired || expiring) && <AlertTriangle className="h-3 w-3" />}
                                {formatDate(doc.expires_at)}
                              </div>
                            ) : (
                              <span className="text-xs text-gray-400">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-gray-600">
                            {formatDate(doc.uploaded_at)}
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleDownload(doc)}>
                                  <Download className="h-4 w-4 mr-2" />
                                  Herunterladen
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleOpenStatusModal(doc)}>
                                  <FileCheck className="h-4 w-4 mr-2" />
                                  Status ändern
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleOpenArchiveModal(doc)}
                                  className="text-amber-600"
                                >
                                  <Archive className="h-4 w-4 mr-2" />
                                  Archivieren
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile: Karten */}
              <div className="md:hidden space-y-3">
                {documents.map(doc => {
                  const statusConfig = getStatusConfig(doc.status)
                  const expiring = isExpiringSoon(doc.expires_at)
                  const expired = isExpired(doc.expires_at)

                  return (
                    <div
                      key={doc.id}
                      className="p-4 border rounded-lg bg-white"
                    >
                      {/* Header */}
                      <div className="flex items-center justify-between mb-3">
                        <Badge variant="outline" className="text-xs">
                          {getDocumentTypeLabel(doc.document_type)}
                        </Badge>
                        <Badge className={cn("border text-xs", statusConfig.className)}>
                          {statusConfig.icon}
                          <span className="ml-1">{statusConfig.label}</span>
                        </Badge>
                      </div>

                      {/* Dateiname */}
                      <p className="text-sm font-medium text-gray-900 truncate mb-2">
                        {doc.file_name}
                      </p>

                      {/* Details */}
                      <div className="grid grid-cols-2 gap-2 text-xs text-gray-500 mb-3">
                        <div>Größe: {formatFileSize(doc.file_size)}</div>
                        <div>Hochgeladen: {formatDate(doc.uploaded_at)}</div>
                        {doc.expires_at && (
                          <div className={cn(
                            "col-span-2",
                            expired ? "text-red-600" : expiring ? "text-amber-600" : ""
                          )}>
                            Ablauf: {formatDate(doc.expires_at)}
                            {(expired || expiring) && " (!!)"}
                          </div>
                        )}
                      </div>

                      {/* Aktionen */}
                      <div className="flex gap-2 pt-3 border-t border-gray-100">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownload(doc)}
                          className="flex-1"
                        >
                          <Download className="h-3 w-3 mr-1" />
                          Download
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenStatusModal(doc)}
                          className="flex-1"
                        >
                          <FileCheck className="h-3 w-3 mr-1" />
                          Status
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenArchiveModal(doc)}
                          className="text-amber-600 border-amber-200 hover:bg-amber-50"
                          title="Archivieren"
                        >
                          <Archive className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Upload Modal */}
      <Dialog open={showUploadModal} onOpenChange={setShowUploadModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-primary-blue" />
              Dokument hochladen
            </DialogTitle>
            <DialogDescription>
              Laden Sie ein Dokument für diesen Fahrer hoch (PDF, JPG, PNG, max. 50MB).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Datei auswählen */}
            <div className="space-y-2">
              <Label htmlFor="file">Datei</Label>
              <Input
                ref={fileInputRef}
                id="file"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.heic"
                onChange={handleFileSelect}
              />
              {selectedFile && (
                <p className="text-xs text-gray-500">
                  Ausgewählt: {selectedFile.name} ({formatFileSize(selectedFile.size)})
                </p>
              )}
            </div>

            {/* Dokumenttyp */}
            <div className="space-y-2">
              <Label htmlFor="type">Dokumenttyp</Label>
              <Select value={uploadType} onValueChange={(v) => setUploadType(v as DocumentType)}>
                <SelectTrigger>
                  <SelectValue placeholder="Typ wählen" />
                </SelectTrigger>
                <SelectContent>
                  {DOCUMENT_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Ablaufdatum (optional) */}
            <div className="space-y-2">
              <Label htmlFor="expires">Ablaufdatum (optional)</Label>
              <Input
                id="expires"
                type="date"
                value={uploadExpiresAt}
                onChange={(e) => setUploadExpiresAt(e.target.value)}
              />
            </div>

            {/* Kommentar (optional) */}
            <div className="space-y-2">
              <Label htmlFor="comment">Kommentar (optional)</Label>
              <Textarea
                id="comment"
                value={uploadComment}
                onChange={(e) => setUploadComment(e.target.value)}
                placeholder="z.B. Kopie des neuen Führerscheins..."
                rows={2}
              />
            </div>

            {/* Fehler */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                {error}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowUploadModal(false)
                setSelectedFile(null)
                setError("")
              }}
              disabled={isUploading}
            >
              Abbrechen
            </Button>
            <Button
              onClick={handleUpload}
              disabled={isUploading || !selectedFile}
              className="bg-primary-blue hover:bg-blue-700"
            >
              {isUploading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Hochladen...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Hochladen
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Status Modal */}
      <Dialog open={showStatusModal} onOpenChange={setShowStatusModal}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileCheck className="h-5 w-5 text-primary-blue" />
              Status ändern
            </DialogTitle>
            <DialogDescription>
              Ändern Sie den Status des Dokuments.
            </DialogDescription>
          </DialogHeader>

          {statusDoc && (
            <div className="space-y-4">
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="font-medium text-sm">{statusDoc.file_name}</p>
                <p className="text-xs text-gray-500">
                  {getDocumentTypeLabel(statusDoc.document_type)}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="newStatus">Neuer Status</Label>
                <Select value={newStatus} onValueChange={(v) => setNewStatus(v as DocumentStatus)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hochgeladen">Hochgeladen</SelectItem>
                    <SelectItem value="geprueft">Geprüft</SelectItem>
                    <SelectItem value="abgelehnt">Abgelehnt</SelectItem>
                    <SelectItem value="abgelaufen">Abgelaufen</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="statusComment">Kommentar (optional)</Label>
                <Textarea
                  id="statusComment"
                  value={statusComment}
                  onChange={(e) => setStatusComment(e.target.value)}
                  placeholder="z.B. Unterschrift fehlt..."
                  rows={2}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowStatusModal(false)}
              disabled={isUpdatingStatus}
            >
              Abbrechen
            </Button>
            <Button
              onClick={handleUpdateStatus}
              disabled={isUpdatingStatus}
              className="bg-primary-blue hover:bg-blue-700"
            >
              {isUpdatingStatus ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                "Speichern"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Archive Modal (kein hartes Löschen) */}
      <Dialog open={showArchiveModal} onOpenChange={setShowArchiveModal}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <Archive className="h-5 w-5" />
              Dokument archivieren
            </DialogTitle>
            <DialogDescription>
              Das Dokument wird archiviert und nicht mehr in der Standardansicht angezeigt.
              Die Datei bleibt erhalten und kann bei Bedarf wiederhergestellt werden.
            </DialogDescription>
          </DialogHeader>

          {archiveDoc && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="font-medium text-sm text-amber-700">{archiveDoc.file_name}</p>
              <p className="text-xs text-amber-600">
                {getDocumentTypeLabel(archiveDoc.document_type)}
              </p>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowArchiveModal(false)}
              disabled={isArchiving}
            >
              Abbrechen
            </Button>
            <Button
              onClick={handleArchive}
              disabled={isArchiving}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {isArchiving ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Archive className="h-4 w-4 mr-2" />
                  Archivieren
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
