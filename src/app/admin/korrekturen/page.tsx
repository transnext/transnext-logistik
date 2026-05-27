"use client"

import { useEffect, useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { AdminLayout } from "@/components/admin/AdminLayout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { EmptyState } from "@/components/ui/empty-state"
import { getCurrentUser, getUserProfile, signOut } from "@/lib/api"
import {
  getCorrectionRequests,
  getSalaryCorrections,
  formatRequestStatus,
  formatCorrectionStatus,
  getRequestStatusColors,
  getCorrectionStatusColors,
  formatProblemCategory,
  reviewCorrectionRequest,
  rejectCorrectionRequest,
  createSalaryCorrectionFromRequest,
  approveSalaryCorrection,
  rejectSalaryCorrection,
  applySalaryCorrection,
  getArbeitsnachweisForCorrection,
  type CorrectionRequest,
  type SalaryCorrection,
  type CorrectionValidationError
} from "@/lib/corrections-api"
import {
  Wrench,
  FileText,
  Euro,
  RefreshCw,
  AlertCircle,
  Clock,
  CheckCircle,
  CheckCircle2,
  XCircle,
  Eye,
  PlayCircle,
  PlusCircle,
  AlertTriangle
} from "lucide-react"

export default function KorrekturenPage() {
  const router = useRouter()
  const [userName, setUserName] = useState("")
  const [userRole, setUserRole] = useState<'admin' | 'disponent'>('admin')
  const [isLoading, setIsLoading] = useState(true)
  const [requests, setRequests] = useState<CorrectionRequest[]>([])
  const [corrections, setCorrections] = useState<SalaryCorrection[]>([])
  const [filterRequestStatus, setFilterRequestStatus] = useState<string>("all")
  const [filterCorrectionStatus, setFilterCorrectionStatus] = useState<string>("all")
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Dialog States
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false)
  const [rejectRequestDialogOpen, setRejectRequestDialogOpen] = useState(false)
  const [createCorrectionDialogOpen, setCreateCorrectionDialogOpen] = useState(false)
  const [approveCorrectionDialogOpen, setApproveCorrectionDialogOpen] = useState(false)
  const [rejectCorrectionDialogOpen, setRejectCorrectionDialogOpen] = useState(false)
  const [applyCorrectionDialogOpen, setApplyCorrectionDialogOpen] = useState(false)

  // Selected Items
  const [selectedRequest, setSelectedRequest] = useState<CorrectionRequest | null>(null)
  const [selectedCorrection, setSelectedCorrection] = useState<SalaryCorrection | null>(null)

  // Form States
  const [reviewNote, setReviewNote] = useState("")
  const [rejectReason, setRejectReason] = useState("")
  const [originalAmount, setOriginalAmount] = useState("")
  const [correctedAmount, setCorrectedAmount] = useState("")
  const [correctionReason, setCorrectionReason] = useState("")
  const [rejectCorrectionReason, setRejectCorrectionReason] = useState("")

  // UI States
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formErrors, setFormErrors] = useState<CorrectionValidationError[]>([])
  const [successMessage, setSuccessMessage] = useState("")

  useEffect(() => {
    checkAuthAndLoad()
  }, [])

  const checkAuthAndLoad = async () => {
    try {
      const user = await getCurrentUser()
      if (!user) {
        router.push("/admin")
        return
      }
      const profile = await getUserProfile(user.id)
      const role = profile.role as string
      if (role !== 'admin' && role !== 'gf') {
        router.push("/admin/dashboard")
        return
      }
      setUserRole('admin')
      setUserName(profile.full_name)

      await loadData()
      setIsLoading(false)
    } catch {
      router.push("/admin")
    }
  }

  const loadData = async () => {
    try {
      setIsRefreshing(true)
      const [requestsData, correctionsData] = await Promise.all([
        getCorrectionRequests(true),
        getSalaryCorrections()
      ])
      setRequests(requestsData)
      setCorrections(correctionsData)
    } catch (err) {
      console.error("Fehler beim Laden:", err)
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleRefresh = async () => {
    setSuccessMessage("")
    await loadData()
  }

  const handleLogout = async () => {
    await signOut()
    router.push("/admin")
  }

  const filteredRequests = useMemo(() => {
    return requests.filter(r => filterRequestStatus === "all" || r.status === filterRequestStatus)
  }, [requests, filterRequestStatus])

  const filteredCorrections = useMemo(() => {
    return corrections.filter(c => filterCorrectionStatus === "all" || c.status === filterCorrectionStatus)
  }, [corrections, filterCorrectionStatus])

  const counts = useMemo(() => ({
    requestsOpen: requests.filter(r => r.status === 'open').length,
    requestsTotal: requests.length,
    correctionsApplied: corrections.filter(c => c.status === 'applied').length,
    correctionsPending: corrections.filter(c => c.status === 'pending').length,
    correctionsApproved: corrections.filter(c => c.status === 'approved').length,
    correctionsTotal: corrections.length
  }), [requests, corrections])

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(amount)
  }

  const getFieldError = (field: string): string | undefined => {
    return formErrors.find(e => e.field === field)?.message
  }

  const resetFormState = () => {
    setFormErrors([])
    setReviewNote("")
    setRejectReason("")
    setOriginalAmount("")
    setCorrectedAmount("")
    setCorrectionReason("")
    setRejectCorrectionReason("")
  }

  // === KORREKTURANFRAGEN AKTIONEN ===

  const openReviewDialog = (req: CorrectionRequest) => {
    setSelectedRequest(req)
    resetFormState()
    setReviewDialogOpen(true)
  }

  const handleReview = async () => {
    if (!selectedRequest) return
    setIsSubmitting(true)
    setFormErrors([])
    const result = await reviewCorrectionRequest(selectedRequest.id, reviewNote)
    if (result.success) {
      setReviewDialogOpen(false)
      setSuccessMessage("Anfrage als geprüft markiert")
      await loadData()
    } else {
      setFormErrors(result.errors || [{ field: 'general', message: 'Unbekannter Fehler' }])
    }
    setIsSubmitting(false)
  }

  const openRejectRequestDialog = (req: CorrectionRequest) => {
    setSelectedRequest(req)
    resetFormState()
    setRejectRequestDialogOpen(true)
  }

  const handleRejectRequest = async () => {
    if (!selectedRequest) return
    setIsSubmitting(true)
    setFormErrors([])
    const result = await rejectCorrectionRequest(selectedRequest.id, rejectReason)
    if (result.success) {
      setRejectRequestDialogOpen(false)
      setSuccessMessage("Anfrage abgelehnt")
      await loadData()
    } else {
      setFormErrors(result.errors || [{ field: 'general', message: 'Unbekannter Fehler' }])
    }
    setIsSubmitting(false)
  }

  const openCreateCorrectionDialog = async (req: CorrectionRequest) => {
    setSelectedRequest(req)
    resetFormState()
    const anData = await getArbeitsnachweisForCorrection(req.arbeitsnachweis_id)
    if (anData) {
      setOriginalAmount(anData.originalAmount.toFixed(2))
      setCorrectedAmount(anData.originalAmount.toFixed(2))
    } else {
      setOriginalAmount("0.00")
      setCorrectedAmount("0.00")
    }
    setCorrectionReason(req.reason || "")
    setCreateCorrectionDialogOpen(true)
  }

  const handleCreateCorrection = async () => {
    if (!selectedRequest) return
    setIsSubmitting(true)
    setFormErrors([])
    const result = await createSalaryCorrectionFromRequest({
      requestId: selectedRequest.id,
      arbeitsnachweisId: selectedRequest.arbeitsnachweis_id,
      originalAmount: parseFloat(originalAmount) || 0,
      correctedAmount: parseFloat(correctedAmount) || 0,
      correctionReason: correctionReason
    })
    if (result.success) {
      setCreateCorrectionDialogOpen(false)
      setSuccessMessage("Fahrerlohn-Korrektur erstellt (Status: Ausstehend)")
      await loadData()
    } else {
      setFormErrors(result.errors || [{ field: 'general', message: 'Unbekannter Fehler' }])
    }
    setIsSubmitting(false)
  }

  // === FAHRERLOHN-KORREKTUREN AKTIONEN ===

  const openApproveCorrectionDialog = (corr: SalaryCorrection) => {
    setSelectedCorrection(corr)
    resetFormState()
    setApproveCorrectionDialogOpen(true)
  }

  const handleApproveCorrection = async () => {
    if (!selectedCorrection) return
    setIsSubmitting(true)
    setFormErrors([])
    const result = await approveSalaryCorrection(selectedCorrection.id)
    if (result.success) {
      setApproveCorrectionDialogOpen(false)
      setSuccessMessage("Korrektur genehmigt")
      await loadData()
    } else {
      setFormErrors(result.errors || [{ field: 'general', message: 'Unbekannter Fehler' }])
    }
    setIsSubmitting(false)
  }

  const openRejectCorrectionDialog = (corr: SalaryCorrection) => {
    setSelectedCorrection(corr)
    resetFormState()
    setRejectCorrectionDialogOpen(true)
  }

  const handleRejectCorrection = async () => {
    if (!selectedCorrection) return
    setIsSubmitting(true)
    setFormErrors([])
    const result = await rejectSalaryCorrection(selectedCorrection.id, rejectCorrectionReason)
    if (result.success) {
      setRejectCorrectionDialogOpen(false)
      setSuccessMessage("Korrektur abgelehnt")
      await loadData()
    } else {
      setFormErrors(result.errors || [{ field: 'general', message: 'Unbekannter Fehler' }])
    }
    setIsSubmitting(false)
  }

  const openApplyCorrectionDialog = (corr: SalaryCorrection) => {
    setSelectedCorrection(corr)
    resetFormState()
    setApplyCorrectionDialogOpen(true)
  }

  const handleApplyCorrection = async () => {
    if (!selectedCorrection) return
    setIsSubmitting(true)
    setFormErrors([])
    const result = await applySalaryCorrection(selectedCorrection.id)
    if (result.success) {
      setApplyCorrectionDialogOpen(false)
      setSuccessMessage("Korrektur angewendet - Fahrerlohn wurde aktualisiert")
      await loadData()
    } else {
      setFormErrors(result.errors || [{ field: 'general', message: 'Unbekannter Fehler' }])
    }
    setIsSubmitting(false)
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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Korrekturen</h1>
            <p className="text-gray-500 mt-1">Korrekturanfragen und Fahrerlohn-Korrekturen</p>
          </div>
          <Button variant="outline" onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Aktualisieren
          </Button>
        </div>

        {/* Erfolgs-/Admin-Hinweis */}
        {successMessage ? (
          <Card className="border-emerald-200 bg-emerald-50/50">
            <CardContent className="p-4 flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              <p className="text-sm font-medium text-emerald-900">{successMessage}</p>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-amber-200 bg-amber-50/50">
            <CardContent className="p-4 flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600" />
              <div>
                <p className="text-sm font-medium text-amber-900">Admin-Bereich</p>
                <p className="text-sm text-amber-700">Korrekturen mit Beträgen sind nur für Administratoren sichtbar.</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className={counts.requestsOpen > 0 ? "border-amber-200 bg-amber-50/50" : "border-gray-100"}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Clock className={`h-5 w-5 ${counts.requestsOpen > 0 ? 'text-amber-600' : 'text-gray-400'}`} />
                <div>
                  <p className="text-2xl font-bold">{counts.requestsOpen}</p>
                  <p className="text-xs text-gray-500">Offene Anfragen</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-gray-100">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-2xl font-bold">{counts.requestsTotal}</p>
                  <p className="text-xs text-gray-500">Anfragen gesamt</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className={counts.correctionsPending > 0 ? "border-amber-200 bg-amber-50/50" : "border-gray-100"}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Wrench className={`h-5 w-5 ${counts.correctionsPending > 0 ? 'text-amber-600' : 'text-gray-400'}`} />
                <div>
                  <p className="text-2xl font-bold">{counts.correctionsPending}</p>
                  <p className="text-xs text-gray-500">Ausstehend</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className={counts.correctionsApproved > 0 ? "border-blue-200 bg-blue-50/50" : "border-gray-100"}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <CheckCircle className={`h-5 w-5 ${counts.correctionsApproved > 0 ? 'text-blue-600' : 'text-gray-400'}`} />
                <div>
                  <p className="text-2xl font-bold">{counts.correctionsApproved}</p>
                  <p className="text-xs text-gray-500">Genehmigt</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-emerald-200 bg-emerald-50/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-emerald-600" />
                <div>
                  <p className="text-2xl font-bold">{counts.correctionsApplied}</p>
                  <p className="text-xs text-gray-500">Angewendet</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Korrekturanfragen */}
        <Card className="border-gray-100">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle className="text-lg">Korrekturanfragen</CardTitle>
                <CardDescription>{filteredRequests.length} von {requests.length} Anfragen</CardDescription>
              </div>
              <Select value={filterRequestStatus} onValueChange={setFilterRequestStatus}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Status</SelectItem>
                  <SelectItem value="open">Offen</SelectItem>
                  <SelectItem value="reviewed">Geprüft</SelectItem>
                  <SelectItem value="approved_for_correction">Zur Korrektur</SelectItem>
                  <SelectItem value="rejected">Abgelehnt</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {filteredRequests.length === 0 ? (
              <EmptyState
                title="Keine Korrekturanfragen"
                description="Es liegen keine Korrekturanfragen vor."
                icon={<FileText className="h-12 w-12 text-gray-400" />}
                iconSize="sm"
              />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>AN-ID</TableHead>
                      <TableHead>Kategorie</TableHead>
                      <TableHead>Grund</TableHead>
                      <TableHead>Angefragt</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Aktionen</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRequests.slice(0, 20).map((req) => {
                      const statusColors = getRequestStatusColors(req.status)
                      const canReview = req.status === 'open'
                      const canReject = req.status === 'open' || req.status === 'reviewed'
                      const canCreateCorrection = (req.status === 'open' || req.status === 'reviewed') && !req.salary_correction_id
                      return (
                        <TableRow key={req.id}>
                          <TableCell className="font-mono text-sm">#{req.arbeitsnachweis_id}</TableCell>
                          <TableCell className="text-sm">{formatProblemCategory(req.problem_category)}</TableCell>
                          <TableCell className="text-sm max-w-[200px] truncate" title={req.reason}>{req.reason}</TableCell>
                          <TableCell className="text-sm">{formatDate(req.requested_at)}</TableCell>
                          <TableCell>
                            <Badge className={`${statusColors.bg} ${statusColors.text} ${statusColors.border} border text-xs`}>
                              {formatRequestStatus(req.status)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              {canReview && (
                                <Button variant="ghost" size="sm" onClick={() => openReviewDialog(req)} title="Als geprüft markieren">
                                  <Eye className="h-4 w-4" />
                                </Button>
                              )}
                              {canCreateCorrection && (
                                <Button variant="ghost" size="sm" onClick={() => openCreateCorrectionDialog(req)} title="Fahrerlohn-Korrektur erstellen" className="text-blue-600 hover:text-blue-800">
                                  <PlusCircle className="h-4 w-4" />
                                </Button>
                              )}
                              {canReject && (
                                <Button variant="ghost" size="sm" onClick={() => openRejectRequestDialog(req)} title="Anfrage ablehnen" className="text-red-600 hover:text-red-800">
                                  <XCircle className="h-4 w-4" />
                                </Button>
                              )}
                              {!canReview && !canReject && !canCreateCorrection && (
                                <span className="text-gray-400 text-xs">-</span>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
                {filteredRequests.length > 20 && (
                  <p className="text-sm text-gray-500 mt-2 text-center">
                    ... und {filteredRequests.length - 20} weitere Anfragen
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Fahrerlohn-Korrekturen */}
        <Card className="border-gray-100">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle className="text-lg">Fahrerlohn-Korrekturen</CardTitle>
                <CardDescription>{filteredCorrections.length} von {corrections.length} Korrekturen</CardDescription>
              </div>
              <Select value={filterCorrectionStatus} onValueChange={setFilterCorrectionStatus}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Status</SelectItem>
                  <SelectItem value="pending">Ausstehend</SelectItem>
                  <SelectItem value="approved">Genehmigt</SelectItem>
                  <SelectItem value="rejected">Abgelehnt</SelectItem>
                  <SelectItem value="applied">Angewendet</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {filteredCorrections.length === 0 ? (
              <EmptyState
                title="Keine Lohnkorrekturen"
                description="Es liegen keine Lohnkorrekturen vor."
                icon={<Euro className="h-12 w-12 text-gray-400" />}
                iconSize="sm"
              />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>AN-ID</TableHead>
                      <TableHead>Original</TableHead>
                      <TableHead>Korrigiert</TableHead>
                      <TableHead>Differenz</TableHead>
                      <TableHead>Erstellt</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Aktionen</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCorrections.slice(0, 20).map((corr) => {
                      const statusColors = getCorrectionStatusColors(corr.status)
                      const diff = corr.corrected_amount - corr.original_amount
                      const canApprove = corr.status === 'pending'
                      const canReject = corr.status === 'pending' || corr.status === 'approved'
                      const canApply = corr.status === 'approved'
                      return (
                        <TableRow key={corr.id}>
                          <TableCell className="font-mono text-sm">#{corr.arbeitsnachweis_id}</TableCell>
                          <TableCell className="text-sm">{formatCurrency(corr.original_amount)}</TableCell>
                          <TableCell className="text-sm font-medium">{formatCurrency(corr.corrected_amount)}</TableCell>
                          <TableCell className={`text-sm font-medium ${diff >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            {diff >= 0 ? '+' : ''}{formatCurrency(diff)}
                          </TableCell>
                          <TableCell className="text-sm">{formatDate(corr.created_at)}</TableCell>
                          <TableCell>
                            <Badge className={`${statusColors.bg} ${statusColors.text} ${statusColors.border} border text-xs`}>
                              {formatCorrectionStatus(corr.status)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              {canApprove && (
                                <Button variant="ghost" size="sm" onClick={() => openApproveCorrectionDialog(corr)} title="Genehmigen" className="text-emerald-600 hover:text-emerald-800">
                                  <CheckCircle2 className="h-4 w-4" />
                                </Button>
                              )}
                              {canApply && (
                                <Button variant="ghost" size="sm" onClick={() => openApplyCorrectionDialog(corr)} title="Anwenden" className="text-blue-600 hover:text-blue-800">
                                  <PlayCircle className="h-4 w-4" />
                                </Button>
                              )}
                              {canReject && (
                                <Button variant="ghost" size="sm" onClick={() => openRejectCorrectionDialog(corr)} title="Ablehnen" className="text-red-600 hover:text-red-800">
                                  <XCircle className="h-4 w-4" />
                                </Button>
                              )}
                              {!canApprove && !canReject && !canApply && (
                                <span className="text-gray-400 text-xs">-</span>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
                {filteredCorrections.length > 20 && (
                  <p className="text-sm text-gray-500 mt-2 text-center">
                    ... und {filteredCorrections.length - 20} weitere Korrekturen
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Workflow-Hinweis */}
        <Card className="border-gray-100 bg-gray-50/50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-gray-500 mt-0.5 shrink-0" />
              <div className="space-y-1 text-sm text-gray-600">
                <p className="font-medium text-gray-700">Workflow</p>
                <ol className="list-decimal list-inside space-y-0.5">
                  <li>Anfrage prüfen (optional) oder direkt Korrektur erstellen</li>
                  <li>Fahrerlohn-Korrektur mit Beträgen erstellen</li>
                  <li>Korrektur genehmigen</li>
                  <li>Genehmigte Korrektur anwenden - driver_amount_final wird aktualisiert</li>
                </ol>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* === DIALOGE === */}

      {/* Dialog: Als geprüft markieren */}
      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Anfrage als geprüft markieren</DialogTitle>
            <DialogDescription>AN #{selectedRequest?.arbeitsnachweis_id}: {selectedRequest?.reason}</DialogDescription>
          </DialogHeader>
          {getFieldError('general') && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-sm text-red-700">{getFieldError('general')}</p>
            </div>
          )}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="review-note">Notiz (optional)</Label>
              <Textarea id="review-note" value={reviewNote} onChange={e => setReviewNote(e.target.value)} placeholder="Interne Notiz zur Prüfung..." rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewDialogOpen(false)} disabled={isSubmitting}>Abbrechen</Button>
            <Button onClick={handleReview} disabled={isSubmitting}>
              {isSubmitting ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Eye className="h-4 w-4 mr-2" />}
              Als geprüft markieren
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Anfrage ablehnen */}
      <Dialog open={rejectRequestDialogOpen} onOpenChange={setRejectRequestDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Anfrage ablehnen</DialogTitle>
            <DialogDescription>AN #{selectedRequest?.arbeitsnachweis_id}: {selectedRequest?.reason}</DialogDescription>
          </DialogHeader>
          {getFieldError('general') && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-sm text-red-700">{getFieldError('general')}</p>
            </div>
          )}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reject-reason">Ablehnungsgrund *</Label>
              <Textarea id="reject-reason" value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Grund für die Ablehnung..." rows={3} />
              {getFieldError('reviewNote') && <p className="text-sm text-red-600">{getFieldError('reviewNote')}</p>}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectRequestDialogOpen(false)} disabled={isSubmitting}>Abbrechen</Button>
            <Button variant="destructive" onClick={handleRejectRequest} disabled={isSubmitting}>
              {isSubmitting ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <XCircle className="h-4 w-4 mr-2" />}
              Ablehnen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Fahrerlohn-Korrektur erstellen */}
      <Dialog open={createCorrectionDialogOpen} onOpenChange={setCreateCorrectionDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Fahrerlohn-Korrektur erstellen</DialogTitle>
            <DialogDescription>Für AN #{selectedRequest?.arbeitsnachweis_id}</DialogDescription>
          </DialogHeader>
          <div className="bg-amber-50 border border-amber-200 rounded-md p-3 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
            <p className="text-sm text-amber-800">Der Fahrerlohn wird erst geändert, wenn die genehmigte Korrektur angewendet wird.</p>
          </div>
          {getFieldError('general') && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-sm text-red-700">{getFieldError('general')}</p>
            </div>
          )}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="original-amount">Originalbetrag (EUR)</Label>
                <Input id="original-amount" type="number" step="0.01" min="0" value={originalAmount} onChange={e => setOriginalAmount(e.target.value)} />
                {getFieldError('originalAmount') && <p className="text-sm text-red-600">{getFieldError('originalAmount')}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="corrected-amount">Korrigierter Betrag (EUR)</Label>
                <Input id="corrected-amount" type="number" step="0.01" min="0" value={correctedAmount} onChange={e => setCorrectedAmount(e.target.value)} />
                {getFieldError('correctedAmount') && <p className="text-sm text-red-600">{getFieldError('correctedAmount')}</p>}
              </div>
            </div>
            {originalAmount && correctedAmount && (
              <div className="bg-gray-50 rounded-md p-3">
                <p className="text-sm text-gray-600">
                  Differenz: <span className={`font-medium ${(parseFloat(correctedAmount) - parseFloat(originalAmount)) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {(parseFloat(correctedAmount) - parseFloat(originalAmount)) >= 0 ? '+' : ''}{formatCurrency(parseFloat(correctedAmount) - parseFloat(originalAmount))}
                  </span>
                </p>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="correction-reason">Korrekturgrund *</Label>
              <Textarea id="correction-reason" value={correctionReason} onChange={e => setCorrectionReason(e.target.value)} placeholder="Begründung für die Korrektur..." rows={3} />
              {getFieldError('correctionReason') && <p className="text-sm text-red-600">{getFieldError('correctionReason')}</p>}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateCorrectionDialogOpen(false)} disabled={isSubmitting}>Abbrechen</Button>
            <Button onClick={handleCreateCorrection} disabled={isSubmitting}>
              {isSubmitting ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <PlusCircle className="h-4 w-4 mr-2" />}
              Korrektur erstellen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Korrektur genehmigen */}
      <Dialog open={approveCorrectionDialogOpen} onOpenChange={setApproveCorrectionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Korrektur genehmigen</DialogTitle>
            <DialogDescription>AN #{selectedCorrection?.arbeitsnachweis_id}</DialogDescription>
          </DialogHeader>
          {getFieldError('general') && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-sm text-red-700">{getFieldError('general')}</p>
            </div>
          )}
          <div className="bg-gray-50 rounded-md p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Original:</span>
              <span className="font-medium">{formatCurrency(selectedCorrection?.original_amount || 0)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Korrigiert:</span>
              <span className="font-medium">{formatCurrency(selectedCorrection?.corrected_amount || 0)}</span>
            </div>
            <div className="flex justify-between text-sm border-t border-gray-200 pt-2">
              <span className="text-gray-600">Differenz:</span>
              <span className={`font-medium ${((selectedCorrection?.corrected_amount || 0) - (selectedCorrection?.original_amount || 0)) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {((selectedCorrection?.corrected_amount || 0) - (selectedCorrection?.original_amount || 0)) >= 0 ? '+' : ''}
                {formatCurrency((selectedCorrection?.corrected_amount || 0) - (selectedCorrection?.original_amount || 0))}
              </span>
            </div>
          </div>
          <p className="text-sm text-gray-600">Nach der Genehmigung kann die Korrektur angewendet werden.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveCorrectionDialogOpen(false)} disabled={isSubmitting}>Abbrechen</Button>
            <Button onClick={handleApproveCorrection} disabled={isSubmitting} className="bg-emerald-600 hover:bg-emerald-700">
              {isSubmitting ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
              Genehmigen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Korrektur ablehnen */}
      <Dialog open={rejectCorrectionDialogOpen} onOpenChange={setRejectCorrectionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Korrektur ablehnen</DialogTitle>
            <DialogDescription>AN #{selectedCorrection?.arbeitsnachweis_id}</DialogDescription>
          </DialogHeader>
          {getFieldError('general') && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-sm text-red-700">{getFieldError('general')}</p>
            </div>
          )}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reject-correction-reason">Ablehnungsgrund *</Label>
              <Textarea id="reject-correction-reason" value={rejectCorrectionReason} onChange={e => setRejectCorrectionReason(e.target.value)} placeholder="Grund für die Ablehnung..." rows={3} />
              {getFieldError('reason') && <p className="text-sm text-red-600">{getFieldError('reason')}</p>}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectCorrectionDialogOpen(false)} disabled={isSubmitting}>Abbrechen</Button>
            <Button variant="destructive" onClick={handleRejectCorrection} disabled={isSubmitting}>
              {isSubmitting ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <XCircle className="h-4 w-4 mr-2" />}
              Ablehnen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Korrektur anwenden */}
      <Dialog open={applyCorrectionDialogOpen} onOpenChange={setApplyCorrectionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Korrektur anwenden</DialogTitle>
            <DialogDescription>AN #{selectedCorrection?.arbeitsnachweis_id}</DialogDescription>
          </DialogHeader>
          <div className="bg-amber-50 border border-amber-200 rounded-md p-3 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
            <p className="text-sm text-amber-800">Diese Aktion aktualisiert <strong>driver_amount_final</strong> im Arbeitsnachweis. Die Änderung wird sofort wirksam.</p>
          </div>
          {getFieldError('general') && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-sm text-red-700">{getFieldError('general')}</p>
            </div>
          )}
          <div className="bg-gray-50 rounded-md p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Aktueller Betrag:</span>
              <span className="font-medium">{formatCurrency(selectedCorrection?.original_amount || 0)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Neuer Betrag:</span>
              <span className="font-medium text-blue-600">{formatCurrency(selectedCorrection?.corrected_amount || 0)}</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApplyCorrectionDialogOpen(false)} disabled={isSubmitting}>Abbrechen</Button>
            <Button onClick={handleApplyCorrection} disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700">
              {isSubmitting ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <PlayCircle className="h-4 w-4 mr-2" />}
              Jetzt anwenden
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  )
}
