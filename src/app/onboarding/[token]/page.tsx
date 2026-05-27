"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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
  Send
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  getPublicCandidateByToken,
  submitAppointmentSelection
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

  // Form State
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null)
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [city, setCity] = useState("")
  const [comment, setComment] = useState("")

  // Load candidate data
  useEffect(() => {
    const loadData = async () => {
      if (!token) return

      setIsLoading(true)
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
        setIsLoading(false)
        return
      }

      if (result.candidate) {
        setCandidate(result.candidate)
        setEmail(result.candidate.email || '')
        setPhone(result.candidate.phone || '')
        setCity(result.candidate.city || '')
      }

      setIsLoading(false)
    }

    loadData()
  }, [token])

  const handleSubmit = async () => {
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

  const formatDate = (dateStr: string | null): string => {
    if (!dateStr) return ''
    return formatTerminSlot(dateStr)
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

  // Error State
  if (error && !alreadyUsed) {
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

  // Already Used or Submitted State
  if (alreadyUsed || submitted) {
    const selectedDate = candidate && selectedSlot
      ? selectedSlot === 1 ? candidate.termin_slot_1
        : selectedSlot === 2 ? candidate.termin_slot_2
          : candidate.termin_slot_3
      : null

    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-lg border-0 shadow-xl">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="h-8 w-8 text-emerald-600" />
            </div>
            <CardTitle className="text-xl text-slate-800">
              {submitted ? 'Termin bestätigt!' : 'Termin bereits gewählt'}
            </CardTitle>
            <CardDescription className="text-slate-600">
              {submitted
                ? 'Vielen Dank! Wir haben Ihre Terminwahl erhalten.'
                : 'Sie haben bereits einen Termin für Ihr Gespräch gewählt.'
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {candidate && (
              <div className="text-center">
                <p className="text-lg font-medium text-slate-800 mb-2">
                  Hallo {candidate.first_name} {candidate.last_name}!
                </p>
              </div>
            )}

            {selectedDate && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-center">
                <p className="text-sm text-emerald-600 font-medium mb-1">Ihr gewählter Termin:</p>
                <p className="text-lg font-semibold text-emerald-800">
                  {formatDate(selectedDate)}
                </p>
              </div>
            )}

            <div className="p-4 bg-slate-50 rounded-lg text-center">
              <p className="text-sm text-slate-600 mb-2">
                Sie erhalten in Kürze eine Bestätigung mit dem Teams-Link für das Gespräch.
              </p>
              <p className="text-sm text-slate-500">
                Bei Fragen erreichen Sie uns unter: <span className="font-medium">info@transnext.de</span>
              </p>
            </div>

            <div className="text-center pt-4 border-t">
              <p className="text-xs text-slate-400">TransNext Logistik GmbH</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Main Form
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
                      selectedSlot === 1
                        ? "bg-emerald-500 text-white"
                        : "bg-slate-100 text-slate-600"
                    )}>
                      1
                    </div>
                    <span className="font-medium text-slate-800">
                      {formatDate(candidate.termin_slot_1)}
                    </span>
                  </div>
                  {selectedSlot === 1 && (
                    <CheckCircle className="h-5 w-5 text-emerald-500" />
                  )}
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
                      selectedSlot === 2
                        ? "bg-emerald-500 text-white"
                        : "bg-slate-100 text-slate-600"
                    )}>
                      2
                    </div>
                    <span className="font-medium text-slate-800">
                      {formatDate(candidate.termin_slot_2)}
                    </span>
                  </div>
                  {selectedSlot === 2 && (
                    <CheckCircle className="h-5 w-5 text-emerald-500" />
                  )}
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
                      selectedSlot === 3
                        ? "bg-emerald-500 text-white"
                        : "bg-slate-100 text-slate-600"
                    )}>
                      3
                    </div>
                    <span className="font-medium text-slate-800">
                      {formatDate(candidate.termin_slot_3)}
                    </span>
                  </div>
                  {selectedSlot === 3 && (
                    <CheckCircle className="h-5 w-5 text-emerald-500" />
                  )}
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
            onClick={handleSubmit}
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
