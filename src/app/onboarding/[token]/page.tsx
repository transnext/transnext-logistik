"use client"
import { useEffect, useState, useCallback } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Calendar,
  CheckCircle,
  Clock,
  AlertTriangle,
  RefreshCw,
  User,
  Mail,
  Phone,
  MapPin,
  Send,
  FileText,
  CreditCard,
  Car,
  Shield,
  Building,
  Info,
  Upload,
  XCircle,
  File,
  ChevronDown,
  ChevronUp,
  Lock
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  getPublicCandidateByToken,
  submitAppointmentSelection,
  getQuestionnaireByToken,
  submitQuestionnaire,
  getApplicantDocumentsByToken,
  getUploadDocumentTypesForCandidateType,
  getApplicantDocumentDisplayStatus,
  validateQuestionnaireForm,
  APPLICANT_DOCUMENT_STATUS_LABELS,
  DOCUMENT_TYPE_LABELS,
  EMPLOYMENT_TYPE_LABELS,
  LICENSE_CLASS_OPTIONS,
  MARITAL_STATUS_OPTIONS,
  TAX_CLASS_OPTIONS,
  DENOMINATION_OPTIONS,
  type QuestionnaireFormData,
  type QuestionnaireEmploymentType,
  type CandidateType,
  type ApplicantDocument,
  type OnboardingDocumentType
} from "@/lib/onboarding-api"
import { formatTerminSlot } from "@/lib/onboarding-email-templates"
interface CandidateData {
  id: string
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  city: string | null
  termin_slot_1: string | null
  termin_slot_2: string | null
  termin_slot_3: string | null
  termin_gewaehlt: number | null
  appointment_selected_at?: string | null
}
// Hilfsfunktion für Fehlermeldungen
function getErrorMessage(errorCode: string): string {
  const errorMessages: Record<string, string> = {
    'invalid_token': 'Ungültiger Link. Bitte prüfen Sie den Link oder kontaktieren Sie uns.',
    'token_expired': 'Dieser Link ist abgelaufen. Bitte kontaktieren Sie uns für einen neuen Link.',
    'already_submitted': 'Die Terminwahl wurde bereits abgeschlossen.',
    'slot_required': 'Bitte wählen Sie einen Termin aus.',
    'network_error': 'Netzwerkfehler. Bitte versuchen Sie es später erneut.',
    'unknown': 'Ein unbekannter Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.'
  }
  return errorMessages[errorCode] || errorMessages['unknown']
}
// Onboarding Fortschritts-Schritte
type OnboardingStep = 'termin' | 'fragebogen' | 'dokumente'
interface OnboardingProgress {
  termin: 'pending' | 'completed'
  fragebogen: 'pending' | 'completed' | 'locked'
  dokumente: 'pending' | 'partial' | 'completed'
}
export default function PublicOnboardingPage() {
  const params = useParams()
  const token = params.token as string
  // ============================================================
  // STATE: Page Level
  // ============================================================
  const [isPageLoading, setIsPageLoading] = useState(true)
  const [pageError, setPageError] = useState<string | null>(null)
  const [pageErrorMessage, setPageErrorMessage] = useState<string | null>(null)
  const [candidate, setCandidate] = useState<CandidateData | null>(null)
  // Fortschrittsstatus
  const [progress, setProgress] = useState<OnboardingProgress>({
    termin: 'pending',
    fragebogen: 'pending',
    dokumente: 'pending'
  })
  // Welcher Bereich ist erweitert
  const [expandedSection, setExpandedSection] = useState<OnboardingStep | null>(null)
  // ============================================================
  // STATE: Terminwahl
  // ============================================================
  const [isSubmittingTermin, setIsSubmittingTermin] = useState(false)
  const [terminError, setTerminError] = useState<string | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null)
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [city, setCity] = useState("")
  const [comment, setComment] = useState("")
  // ============================================================
  // STATE: Fragebogen
  // ============================================================
  const [questionnaireStatus, setQuestionnaireStatus] = useState<'pending' | 'submitted' | 'reviewed'>('pending')
  const [questionnaireSubmittedAt, setQuestionnaireSubmittedAt] = useState<string | null>(null)
  const [isSubmittingQuestionnaire, setIsSubmittingQuestionnaire] = useState(false)
  const [questionnaireError, setQuestionnaireError] = useState<string | null>(null)
  const [qForm, setQForm] = useState<QuestionnaireFormData>({
    birth_date: null,
    birth_name: null,
    nationality: 'deutsch',
    birth_place: null,
    birth_country: 'Deutschland',
    marital_status: null,
    children_count: null,
    street: null,
    house_number: null,
    postal_code: null,
    city: null,
    country: 'Deutschland',
    phone_confirmed: null,
    email_confirmed: null,
    employment_type: 'unknown',
    has_other_employment: null,
    other_employment_note: null,
    tax_id: null,
    tax_class: null,
    denomination: 'keine',
    social_security_number: null,
    health_insurance: null,
    iban: null,
    account_holder: null,
    has_license: null,
    license_classes: null,
    license_classes_array: [],
    license_number: null,
    license_issued_at: null,
    license_authority: null,
    privacy_accepted: false,
    data_accuracy_confirmed: false,
    onboarding_terms_accepted: false
  })
  // ============================================================
  // STATE: Dokumenten-Upload
  // ============================================================
  const [documents, setDocuments] = useState<ApplicantDocument[]>([])
  const [candidateType, setCandidateType] = useState<CandidateType>('unknown')
  const [uploadingDocType, setUploadingDocType] = useState<OnboardingDocumentType | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null)
  // ============================================================
  // DATA LOADING
  // ============================================================
  const loadAllData = useCallback(async () => {
    if (!token) return
    setIsPageLoading(true)
    setPageError(null)
    try {
      // 1. Lade Terminwahl-Daten
      const terminResult = await getPublicCandidateByToken(token)
      if (!terminResult.success) {
        setPageError(terminResult.error || 'unknown')
        setPageErrorMessage(terminResult.message || 'Ein Fehler ist aufgetreten.')
        setIsPageLoading(false)
        return
      }
      if (terminResult.candidate) {
        setCandidate(terminResult.candidate)
        setEmail(terminResult.candidate.email || '')
        setPhone(terminResult.candidate.phone || '')
        setCity(terminResult.candidate.city || '')
        // Termin-Status prüfen
        if (terminResult.candidate.termin_gewaehlt) {
          setProgress(prev => ({ ...prev, termin: 'completed' }))
          setSelectedSlot(terminResult.candidate.termin_gewaehlt)
        }
      }
      // 2. Lade Fragebogen-Daten
      const qResult = await getQuestionnaireByToken(token)
      if (qResult.success) {
        if (qResult.already_submitted) {
          const qStatus = (qResult as { questionnaire_status?: string }).questionnaire_status
          setQuestionnaireStatus(qStatus === 'reviewed' ? 'reviewed' : 'submitted')
          setQuestionnaireSubmittedAt(qResult.submitted_at || null)
          setProgress(prev => ({ ...prev, fragebogen: 'locked' }))
        } else if (qResult.questionnaire) {
          // Pre-fill mit vorhandenen Daten
          setQForm(prev => ({
            ...prev,
            ...qResult.questionnaire,
            // Einwilligungen immer false wenn noch nicht eingereicht
            privacy_accepted: false,
            data_accuracy_confirmed: false,
            onboarding_terms_accepted: false
          }))
        }
        // Pre-fill mit Kandidatendaten wenn nicht im Fragebogen
        if (qResult.candidate && !qResult.questionnaire) {
          setQForm(prev => ({
            ...prev,
            email_confirmed: qResult.candidate?.email || prev.email_confirmed,
            phone_confirmed: qResult.candidate?.phone || prev.phone_confirmed,
            city: qResult.candidate?.city || prev.city
          }))
        }
      }
      // 3. Lade Dokumente
      const docsResult = await getApplicantDocumentsByToken(token)
      if (docsResult.success) {
        setDocuments(docsResult.documents || [])
        setCandidateType(docsResult.candidate_type || 'unknown')
        // Dokumenten-Status berechnen
        const docs = docsResult.documents || []
        if (docs.length > 0) {
          const allUploaded = docs.every(d => d.status === 'erhalten' || d.status === 'geprueft')
          const someUploaded = docs.some(d => d.status === 'erhalten' || d.status === 'geprueft')
          setProgress(prev => ({
            ...prev,
            dokumente: allUploaded ? 'completed' : someUploaded ? 'partial' : 'pending'
          }))
        }
      }
      // Initialen Bereich öffnen basierend auf Fortschritt
      if (!terminResult.candidate?.termin_gewaehlt) {
        setExpandedSection('termin')
      } else if (!qResult.already_submitted) {
        setExpandedSection('fragebogen')
      } else {
        setExpandedSection('dokumente')
      }
    } catch (err) {
      setPageError('server_error')
      setPageErrorMessage('Serverfehler. Bitte versuchen Sie es später erneut.')
    } finally {
      setIsPageLoading(false)
    }
  }, [token])
  useEffect(() => {
    loadAllData()
  }, [loadAllData])
  // ============================================================
  // HANDLERS: Terminwahl
  // ============================================================
  const handleSubmitTermin = async () => {
    if (!selectedSlot || !candidate) return
    setIsSubmittingTermin(true)
    setTerminError(null)
    const result = await submitAppointmentSelection(
      token,
      selectedSlot,
      email || null,
      phone || null,
      city || null,
      comment || null
    )
    if (!result.success) {
      setTerminError(getErrorMessage(result.error || 'unknown'))
      setIsSubmittingTermin(false)
      return
    }
    // Update lokalen State
    setProgress(prev => ({ ...prev, termin: 'completed' }))
    setCandidate(prev => prev ? { ...prev, termin_gewaehlt: selectedSlot } : null)
    setExpandedSection('fragebogen')
    setIsSubmittingTermin(false)
  }
  // Placeholder for rest of content
  return <div>Loading...</div>
}
