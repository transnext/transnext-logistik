"use client"

import { useEffect, useState } from "react"
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
  Info
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  getPublicCandidateByToken,
  submitAppointmentSelection,
  getQuestionnaireByToken,
  submitQuestionnaire,
  type QuestionnaireFormData,
  type QuestionnaireEmploymentType,
  EMPLOYMENT_TYPE_LABELS
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

type TabType = 'termin' | 'fragebogen'

export default function PublicOnboardingPage() {
  const params = useParams()
  const token = params.token as string

  // State
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [alreadyUsed, setAlreadyUsed] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [candidate, setCandidate] = useState<CandidateData | null>(null)

  // Tab State
  const [activeTab, setActiveTab] = useState<TabType>('termin')

  // Terminwahl Form State
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null)
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [city, setCity] = useState("")
  const [comment, setComment] = useState("")

  // Fragebogen State
  const [questionnaireSubmitted, setQuestionnaireSubmitted] = useState(false)
  const [questionnaireSubmittedAt, setQuestionnaireSubmittedAt] = useState<string | null>(null)
  const [isSubmittingQuestionnaire, setIsSubmittingQuestionnaire] = useState(false)
  const [questionnaireError, setQuestionnaireError] = useState<string | null>(null)

  // Fragebogen Form State
  const [qForm, setQForm] = useState<QuestionnaireFormData>({
    birth_date: null,
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
    social_security_number: null,
    health_insurance: null,
    iban: null,
    account_holder: null,
    has_license: null,
    license_classes: null,
    license_number: null,
    license_issued_at: null,
    license_authority: null,
    privacy_accepted: false,
    data_accuracy_confirmed: false,
    onboarding_terms_accepted: false
  })

  // Load candidate data
  useEffect(() => {
    const loadData = async () => {
      if (!token) return

      setIsLoading(true)

      // Lade Terminwahl-Daten
      const result = await getPublicCandidateByToken(token)

      if (!result.success) {
        setError(result.error || 'unknown')
        setErrorMessage(result.message || 'Ein Fehler ist aufgetreten.')
        setIsLoading(false)
        return
      }

      if (result.already_used && result.candidate) {
        setAlreadyUsed(true)
        setCandidate(result.candidate)
        setSelectedSlot(result.candidate.termin_gewaehlt)
      } else if (result.candidate) {
        setCandidate(result.candidate)
        setEmail(result.candidate.email || '')
        setPhone(result.candidate.phone || '')
        setCity(result.candidate.city || '')
      }

      // Lade Fragebogen-Daten
      const qResult = await getQuestionnaireByToken(token)
      if (qResult.success) {
        if (qResult.already_submitted) {
          setQuestionnaireSubmitted(true)
          setQuestionnaireSubmittedAt(qResult.submitted_at || null)
        } else if (qResult.questionnaire) {
          // Pre-fill mit vorhandenen Daten
          setQForm(prev => ({
            ...prev,
            ...qResult.questionnaire,
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

      setIsLoading(false)
    }

    loadData()
  }, [token])

  const handleSubmitTermin = async () => {
    if (!selectedSlot || !candidate) return

    setIsSubmitting(true)
    setError(null)

    const result = await submitAppointmentSelection(
      token,
      selectedSlot,
      email || null,
      phone || null,
      city || null,
      comment || null
    )

    if (!result.success) {
      setError(result.error || 'unknown')
      setErrorMessage(getErrorMessage(result.error || 'unknown'))
      setIsSubmitting(false)
      return
    }

    setSubmitted(true)
    setIsSubmitting(false)
  }

  const handleSubmitQuestionnaire = async () => {
    setIsSubmittingQuestionnaire(true)
    setQuestionnaireError(null)

    // Validierungen
    if (!qForm.privacy_accepted || !qForm.data_accuracy_confirmed || !qForm.onboarding_terms_accepted) {
      setQuestionnaireError('Bitte bestätigen Sie alle Einwilligungen.')
      setIsSubmittingQuestionnaire(false)
      return
    }

    const result = await submitQuestionnaire(token, qForm)

    if (!result.success) {
      setQuestionnaireError(getQuestionnaireErrorMessage(result.error || 'unknown'))
      setIsSubmittingQuestionnaire(false)
      return
    }

    setQuestionnaireSubmitted(true)
    setQuestionnaireSubmittedAt(new Date().toISOString())
    setIsSubmittingQuestionnaire(false)
  }

  const getErrorMessage = (code: string): string => {
    switch (code) {
      case 'invalid_token': return 'Der Link ist ungültig.'
      case 'expired': return 'Der Link ist abgelaufen. Bitte kontaktieren Sie uns.'
      case 'revoked': return 'Der Link wurde deaktiviert.'
      case 'already_used': return 'Sie haben bereits einen Termin gewählt.'
      case 'not_found': return 'Bewerbung nicht gefunden.'
      case 'inactive': return 'Dieser Bewerbungsprozess ist nicht mehr aktiv.'
      case 'no_appointments': return 'Es wurden noch keine Terminvorschläge hinterlegt.'
      case 'invalid_slot': return 'Ungültige Terminauswahl.'
      case 'slot_not_available': return 'Dieser Termin ist nicht verfügbar.'
      case 'server_error': return 'Serverfehler. Bitte versuchen Sie es später erneut.'
      default: return 'Ein unerwarteter Fehler ist aufgetreten.'
    }
  }

  const getQuestionnaireErrorMessage = (code: string): string => {
    switch (code) {
      case 'invalid_token': return 'Der Link ist ungültig.'
      case 'expired': return 'Der Link ist abgelaufen.'
      case 'revoked': return 'Der Link wurde deaktiviert.'
      case 'already_submitted': return 'Der Fragebogen wurde bereits eingereicht.'
      case 'consent_required': return 'Bitte bestätigen Sie alle Einwilligungen.'
      case 'invalid_birth_date': return 'Bitte geben Sie ein gültiges Geburtsdatum ein.'
      case 'invalid_iban': return 'Die eingegebene IBAN ist ungültig.'
      case 'invalid_email': return 'Die eingegebene E-Mail-Adresse ist ungültig.'
      case 'server_error': return 'Serverfehler. Bitte versuchen Sie es später erneut.'
      default: return 'Ein unerwarteter Fehler ist aufgetreten.'
    }
  }

  const formatDate = (dateStr: string | null): string => {
    if (!dateStr) return ''
    return formatTerminSlot(dateStr)
  }

  const formatDateTime = (dateStr: string | null): string => {
    if (!dateStr) return ''
    return new Date(dateStr).toLocaleString('de-DE', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
    })
  }

  // Loading State
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-lg border-0 shadow-xl">
          <CardContent className="flex items-center justify-center py-16">
            <RefreshCw className="h-8 w-8 animate-spin text-slate-400" />
          </CardContent>
        </Card>
      </div>
    )
  }

  // Error State (nicht alreadyUsed)
  if (error && !alreadyUsed && !submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-lg border-0 shadow-xl">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mb-4">
              <AlertTriangle className="h-8 w-8 text-amber-600" />
            </div>
            <CardTitle className="text-xl text-slate-800">Link nicht gültig</CardTitle>
            <CardDescription className="text-slate-600">
              {errorMessage || 'Der Link ist ungültig oder abgelaufen.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-slate-500 mb-4">
              Bitte kontaktieren Sie uns, falls Sie Hilfe benötigen.
            </p>
            <div className="p-4 bg-slate-50 rounded-lg">
              <p className="text-sm font-medium text-slate-700">TransNext Logistik GmbH</p>
              <p className="text-sm text-slate-500">info@transnext.de</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Termin bereits gewählt - zeige Tab-Auswahl für Fragebogen
  if (alreadyUsed || submitted) {
    const selectedDate = candidate && selectedSlot
      ? selectedSlot === 1 ? candidate.termin_slot_1
        : selectedSlot === 2 ? candidate.termin_slot_2
          : candidate.termin_slot_3
      : null

    // Wenn Fragebogen auch eingereicht - Komplett-Erfolgsanzeige
    if (questionnaireSubmitted) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-lg border-0 shadow-xl">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="h-8 w-8 text-emerald-600" />
              </div>
              <CardTitle className="text-xl text-slate-800">Alles erledigt!</CardTitle>
              <CardDescription className="text-slate-600">
                Vielen Dank für Ihre Angaben.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {candidate && (
                <p className="text-center text-lg font-medium text-slate-800">
                  Hallo {candidate.first_name} {candidate.last_name}!
                </p>
              )}

              {selectedDate && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-center">
                  <p className="text-sm text-emerald-600 font-medium mb-1">Ihr Gesprächstermin:</p>
                  <p className="text-lg font-semibold text-emerald-800">{formatDate(selectedDate)}</p>
                </div>
              )}

              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-center">
                <p className="text-sm text-blue-600 font-medium mb-1">Personalfragebogen:</p>
                <p className="text-sm text-blue-800">
                  Eingereicht am {formatDateTime(questionnaireSubmittedAt)}
                </p>
              </div>

              <div className="p-4 bg-slate-50 rounded-lg text-center">
                <p className="text-sm text-slate-600">
                  Wir melden uns in Kürze bei Ihnen.
                </p>
                <p className="text-sm text-slate-500 mt-1">
                  Bei Fragen: <span className="font-medium">info@transnext.de</span>
                </p>
              </div>

              <p className="text-xs text-center text-slate-400 pt-4 border-t">TransNext Logistik GmbH</p>
            </CardContent>
          </Card>
        </div>
      )
    }

    // Termin gewählt, aber Fragebogen noch offen - zeige Fragebogen-Formular
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8 px-4">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Header */}
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-slate-800 mb-2">TransNext Logistik</h1>
            <p className="text-slate-600">Bewerbungsunterlagen</p>
          </div>

          {/* Termin-Bestätigung */}
          <Card className="border-0 shadow-lg border-l-4 border-l-emerald-500">
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-6 w-6 text-emerald-500 flex-shrink-0" />
                <div>
                  <p className="font-medium text-slate-800">Termin bestätigt</p>
                  {selectedDate && (
                    <p className="text-sm text-slate-600">{formatDate(selectedDate)}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Fragebogen */}
          {renderQuestionnaireForm()}
        </div>
      </div>
    )
  }

  // Fragebogen-Formular als Komponente
  function renderQuestionnaireForm() {
    return (
      <>
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5 text-slate-400" />
              Personalfragebogen
            </CardTitle>
            <CardDescription>
              Bitte füllen Sie den Fragebogen aus. Felder mit * sind Pflichtfelder.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Hinweis Datenschutz */}
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700 flex items-start gap-2">
              <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>
                Ihre Daten werden ausschließlich für den Bewerbungs- und Onboarding-Prozess verwendet.
                Nur berechtigte TransNext-Mitarbeiter haben Zugriff.
              </span>
            </div>

            {/* Persönliche Daten */}
            <div className="space-y-4">
              <h3 className="font-medium text-slate-700 flex items-center gap-2 border-b pb-2">
                <User className="h-4 w-4" />
                Persönliche Daten
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="birth_date">Geburtsdatum</Label>
                  <Input
                    id="birth_date"
                    type="date"
                    value={qForm.birth_date || ''}
                    onChange={(e) => setQForm(p => ({ ...p, birth_date: e.target.value || null }))}
                    className="bg-white"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email_confirmed">E-Mail</Label>
                  <Input
                    id="email_confirmed"
                    type="email"
                    value={qForm.email_confirmed || ''}
                    onChange={(e) => setQForm(p => ({ ...p, email_confirmed: e.target.value || null }))}
                    placeholder="ihre@email.de"
                    className="bg-white"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone_confirmed">Telefon</Label>
                  <Input
                    id="phone_confirmed"
                    type="tel"
                    value={qForm.phone_confirmed || ''}
                    onChange={(e) => setQForm(p => ({ ...p, phone_confirmed: e.target.value || null }))}
                    placeholder="+49 123 456789"
                    className="bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="street">Straße</Label>
                  <Input
                    id="street"
                    value={qForm.street || ''}
                    onChange={(e) => setQForm(p => ({ ...p, street: e.target.value || null }))}
                    placeholder="Musterstraße"
                    className="bg-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="house_number">Nr.</Label>
                  <Input
                    id="house_number"
                    value={qForm.house_number || ''}
                    onChange={(e) => setQForm(p => ({ ...p, house_number: e.target.value || null }))}
                    placeholder="123"
                    className="bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="postal_code">PLZ</Label>
                  <Input
                    id="postal_code"
                    value={qForm.postal_code || ''}
                    onChange={(e) => setQForm(p => ({ ...p, postal_code: e.target.value || null }))}
                    placeholder="12345"
                    className="bg-white"
                  />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="q_city">Stadt</Label>
                  <Input
                    id="q_city"
                    value={qForm.city || ''}
                    onChange={(e) => setQForm(p => ({ ...p, city: e.target.value || null }))}
                    placeholder="Musterstadt"
                    className="bg-white"
                  />
                </div>
              </div>
            </div>

            {/* Beschäftigungsdaten */}
            <div className="space-y-4">
              <h3 className="font-medium text-slate-700 flex items-center gap-2 border-b pb-2">
                <Building className="h-4 w-4" />
                Beschäftigung
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="employment_type">Gewünschte Beschäftigungsart</Label>
                  <Select
                    value={qForm.employment_type || 'unknown'}
                    onValueChange={(v) => setQForm(p => ({ ...p, employment_type: v as QuestionnaireEmploymentType }))}
                  >
                    <SelectTrigger className="bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(EMPLOYMENT_TYPE_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Weitere Beschäftigung?</Label>
                  <Select
                    value={qForm.has_other_employment === null ? 'unknown' : qForm.has_other_employment ? 'yes' : 'no'}
                    onValueChange={(v) => setQForm(p => ({
                      ...p,
                      has_other_employment: v === 'unknown' ? null : v === 'yes'
                    }))}
                  >
                    <SelectTrigger className="bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unknown">Bitte wählen</SelectItem>
                      <SelectItem value="no">Nein</SelectItem>
                      <SelectItem value="yes">Ja</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {qForm.has_other_employment && (
                <div className="space-y-2">
                  <Label htmlFor="other_employment_note">Details zur anderen Beschäftigung</Label>
                  <Input
                    id="other_employment_note"
                    value={qForm.other_employment_note || ''}
                    onChange={(e) => setQForm(p => ({ ...p, other_employment_note: e.target.value || null }))}
                    placeholder="Arbeitgeber, Stunden pro Woche..."
                    className="bg-white"
                  />
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tax_id">Steuer-ID (optional)</Label>
                  <Input
                    id="tax_id"
                    value={qForm.tax_id || ''}
                    onChange={(e) => setQForm(p => ({ ...p, tax_id: e.target.value || null }))}
                    placeholder="12 345 678 901"
                    className="bg-white"
                  />
                  <p className="text-xs text-slate-500">Falls noch nicht vorhanden, später einreichen</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="social_security_number">Sozialversicherungsnr. (optional)</Label>
                  <Input
                    id="social_security_number"
                    value={qForm.social_security_number || ''}
                    onChange={(e) => setQForm(p => ({ ...p, social_security_number: e.target.value || null }))}
                    placeholder="12 345678 A 123"
                    className="bg-white"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="health_insurance">Krankenkasse (optional)</Label>
                <Input
                  id="health_insurance"
                  value={qForm.health_insurance || ''}
                  onChange={(e) => setQForm(p => ({ ...p, health_insurance: e.target.value || null }))}
                  placeholder="z.B. AOK, TK, Barmer..."
                  className="bg-white"
                />
              </div>
            </div>

            {/* Bankdaten */}
            <div className="space-y-4">
              <h3 className="font-medium text-slate-700 flex items-center gap-2 border-b pb-2">
                <CreditCard className="h-4 w-4" />
                Bankverbindung (optional)
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="iban">IBAN</Label>
                  <Input
                    id="iban"
                    value={qForm.iban || ''}
                    onChange={(e) => setQForm(p => ({ ...p, iban: e.target.value || null }))}
                    placeholder="DE89 3704 0044 0532 0130 00"
                    className="bg-white"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="account_holder">Kontoinhaber</Label>
                  <Input
                    id="account_holder"
                    value={qForm.account_holder || ''}
                    onChange={(e) => setQForm(p => ({ ...p, account_holder: e.target.value || null }))}
                    placeholder="Max Mustermann"
                    className="bg-white"
                  />
                </div>
              </div>
            </div>

            {/* Führerscheindaten */}
            <div className="space-y-4">
              <h3 className="font-medium text-slate-700 flex items-center gap-2 border-b pb-2">
                <Car className="h-4 w-4" />
                Führerschein
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Führerschein vorhanden?</Label>
                  <Select
                    value={qForm.has_license === null ? 'unknown' : qForm.has_license ? 'yes' : 'no'}
                    onValueChange={(v) => setQForm(p => ({
                      ...p,
                      has_license: v === 'unknown' ? null : v === 'yes'
                    }))}
                  >
                    <SelectTrigger className="bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unknown">Bitte wählen</SelectItem>
                      <SelectItem value="yes">Ja</SelectItem>
                      <SelectItem value="no">Nein</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="license_classes">Führerscheinklassen</Label>
                  <Input
                    id="license_classes"
                    value={qForm.license_classes || ''}
                    onChange={(e) => setQForm(p => ({ ...p, license_classes: e.target.value || null }))}
                    placeholder="B, BE, C1..."
                    className="bg-white"
                  />
                </div>
              </div>

              {qForm.has_license && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="license_number">Führerscheinnummer (optional)</Label>
                    <Input
                      id="license_number"
                      value={qForm.license_number || ''}
                      onChange={(e) => setQForm(p => ({ ...p, license_number: e.target.value || null }))}
                      className="bg-white"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="license_issued_at">Ausstellungsdatum</Label>
                    <Input
                      id="license_issued_at"
                      type="date"
                      value={qForm.license_issued_at || ''}
                      onChange={(e) => setQForm(p => ({ ...p, license_issued_at: e.target.value || null }))}
                      className="bg-white"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="license_authority">Ausstellungsbehörde</Label>
                    <Input
                      id="license_authority"
                      value={qForm.license_authority || ''}
                      onChange={(e) => setQForm(p => ({ ...p, license_authority: e.target.value || null }))}
                      placeholder="z.B. Stadt München"
                      className="bg-white"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Einwilligungen */}
            <div className="space-y-4">
              <h3 className="font-medium text-slate-700 flex items-center gap-2 border-b pb-2">
                <Shield className="h-4 w-4" />
                Einwilligungen *
              </h3>

              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                  <Checkbox
                    id="privacy"
                    checked={qForm.privacy_accepted}
                    onCheckedChange={(checked) => setQForm(p => ({ ...p, privacy_accepted: !!checked }))}
                  />
                  <Label htmlFor="privacy" className="text-sm text-slate-700 cursor-pointer">
                    Ich habe die Datenschutzhinweise gelesen und bin mit der Verarbeitung meiner Daten
                    für Bewerbungs- und Onboarding-Zwecke einverstanden. *
                  </Label>
                </div>

                <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                  <Checkbox
                    id="accuracy"
                    checked={qForm.data_accuracy_confirmed}
                    onCheckedChange={(checked) => setQForm(p => ({ ...p, data_accuracy_confirmed: !!checked }))}
                  />
                  <Label htmlFor="accuracy" className="text-sm text-slate-700 cursor-pointer">
                    Ich bestätige, dass alle Angaben wahrheitsgemäß und vollständig sind. *
                  </Label>
                </div>

                <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                  <Checkbox
                    id="terms"
                    checked={qForm.onboarding_terms_accepted}
                    onCheckedChange={(checked) => setQForm(p => ({ ...p, onboarding_terms_accepted: !!checked }))}
                  />
                  <Label htmlFor="terms" className="text-sm text-slate-700 cursor-pointer">
                    Ich bin damit einverstanden, dass meine Daten für den Onboarding-Prozess
                    bei TransNext Logistik verwendet werden. *
                  </Label>
                </div>
              </div>
            </div>

            {/* Fehleranzeige */}
            {questionnaireError && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 flex-shrink-0" />
                <span>{questionnaireError}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Absenden */}
        <div className="flex flex-col gap-4">
          <Button
            onClick={handleSubmitQuestionnaire}
            disabled={isSubmittingQuestionnaire || !qForm.privacy_accepted || !qForm.data_accuracy_confirmed || !qForm.onboarding_terms_accepted}
            className="w-full py-6 text-lg bg-emerald-600 hover:bg-emerald-700"
          >
            {isSubmittingQuestionnaire ? (
              <>
                <RefreshCw className="h-5 w-5 animate-spin mr-2" />
                Wird gesendet...
              </>
            ) : (
              <>
                <Send className="h-5 w-5 mr-2" />
                Fragebogen absenden
              </>
            )}
          </Button>

          <p className="text-xs text-center text-slate-500">
            Nach dem Absenden können Änderungen nur noch über TransNext vorgenommen werden.
          </p>
        </div>

        {/* Footer */}
        <div className="text-center pt-8 border-t">
          <p className="text-sm text-slate-500 mb-1">TransNext Logistik GmbH</p>
          <p className="text-xs text-slate-400">Ihr Partner für Fahrzeugüberführungen</p>
        </div>
      </>
    )
  }

  // Main Form - Terminwahl noch offen
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-slate-800 mb-2">
            TransNext Logistik
          </h1>
          <p className="text-slate-600">Terminwahl für Ihr Bewerbungsgespräch</p>
        </div>

        {/* Welcome */}
        {candidate && (
          <Card className="border-0 shadow-lg">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center">
                  <User className="h-6 w-6 text-slate-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">
                    Hallo {candidate.first_name} {candidate.last_name}!
                  </CardTitle>
                  <CardDescription>
                    Bitte wählen Sie Ihren bevorzugten Gesprächstermin.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>
        )}

        {/* Appointment Selection */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5 text-slate-400" />
              Terminauswahl
            </CardTitle>
            <CardDescription>
              Klicken Sie auf Ihren Wunschtermin
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {candidate?.termin_slot_1 && (
              <button
                type="button"
                onClick={() => setSelectedSlot(1)}
                className={cn(
                  "w-full p-4 rounded-lg border-2 text-left transition-all",
                  selectedSlot === 1
                    ? "border-emerald-500 bg-emerald-50"
                    : "border-slate-200 hover:border-slate-300 bg-white"
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
                      selectedSlot === 1 ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-600"
                    )}>
                      1
                    </div>
                    <span className="font-medium text-slate-800">{formatDate(candidate.termin_slot_1)}</span>
                  </div>
                  {selectedSlot === 1 && <CheckCircle className="h-5 w-5 text-emerald-500" />}
                </div>
              </button>
            )}

            {candidate?.termin_slot_2 && (
              <button
                type="button"
                onClick={() => setSelectedSlot(2)}
                className={cn(
                  "w-full p-4 rounded-lg border-2 text-left transition-all",
                  selectedSlot === 2
                    ? "border-emerald-500 bg-emerald-50"
                    : "border-slate-200 hover:border-slate-300 bg-white"
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
                      selectedSlot === 2 ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-600"
                    )}>
                      2
                    </div>
                    <span className="font-medium text-slate-800">{formatDate(candidate.termin_slot_2)}</span>
                  </div>
                  {selectedSlot === 2 && <CheckCircle className="h-5 w-5 text-emerald-500" />}
                </div>
              </button>
            )}

            {candidate?.termin_slot_3 && (
              <button
                type="button"
                onClick={() => setSelectedSlot(3)}
                className={cn(
                  "w-full p-4 rounded-lg border-2 text-left transition-all",
                  selectedSlot === 3
                    ? "border-emerald-500 bg-emerald-50"
                    : "border-slate-200 hover:border-slate-300 bg-white"
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
                      selectedSlot === 3 ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-600"
                    )}>
                      3
                    </div>
                    <span className="font-medium text-slate-800">{formatDate(candidate.termin_slot_3)}</span>
                  </div>
                  {selectedSlot === 3 && <CheckCircle className="h-5 w-5 text-emerald-500" />}
                </div>
              </button>
            )}

            <div className="pt-2 flex items-center gap-2 text-sm text-slate-500">
              <Clock className="h-4 w-4" />
              <span>Das Gespräch dauert ca. 20 Minuten per Microsoft Teams</span>
            </div>
          </CardContent>
        </Card>

        {/* Contact Data Confirmation */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="h-5 w-5 text-slate-400" />
              Ihre Kontaktdaten
            </CardTitle>
            <CardDescription>
              Bitte überprüfen und ggf. korrigieren Sie Ihre Daten
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-slate-400" />
                  E-Mail
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ihre@email.de"
                  className="bg-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone" className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-slate-400" />
                  Telefon
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+49 123 456789"
                  className="bg-white"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="city" className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-slate-400" />
                  Stadt
                </Label>
                <Input
                  id="city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="z.B. München"
                  className="bg-white"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Optional Comment */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg">Nachricht (optional)</CardTitle>
            <CardDescription>
              Haben Sie eine Frage oder Anmerkung?
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Ihre Nachricht an uns..."
              rows={3}
              className="bg-white"
            />
          </CardContent>
        </Card>

        {/* Error Display */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 flex-shrink-0" />
            <span>{errorMessage || 'Ein Fehler ist aufgetreten.'}</span>
          </div>
        )}

        {/* Submit */}
        <div className="flex flex-col gap-4">
          <Button
            onClick={handleSubmitTermin}
            disabled={!selectedSlot || isSubmitting}
            className="w-full py-6 text-lg bg-emerald-600 hover:bg-emerald-700"
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="h-5 w-5 animate-spin mr-2" />
                Wird gesendet...
              </>
            ) : (
              <>
                <Send className="h-5 w-5 mr-2" />
                Termin bestätigen
              </>
            )}
          </Button>

          <p className="text-xs text-center text-slate-500">
            Mit dem Absenden bestätigen Sie Ihre Terminwahl. Sie erhalten im Anschluss eine Bestätigung per E-Mail.
          </p>
        </div>

        {/* Footer */}
        <div className="text-center pt-8 border-t">
          <p className="text-sm text-slate-500 mb-1">TransNext Logistik GmbH</p>
          <p className="text-xs text-slate-400">Ihr Partner für Fahrzeugüberführungen</p>
        </div>
      </div>
    </div>
  )
}
