"use client"

import { useEffect, useState, useRef, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { TransNextLogo, TransNextIcon } from "@/components/ui/logo"
import { SignaturePadRef } from "@/components/ui/signature-pad"
import {
  ArrowLeft, ArrowRight, Car, MapPin, CheckCircle, Loader2, AlertCircle,
  Menu, X, XCircle
} from "lucide-react"
import { getCurrentUser } from "@/lib/api"
import type { Tour } from "@/lib/supabase"
import { getTourById, formatFahrzeugart } from "@/lib/touren-api"
import { completeProtocol, getPreExistingDamages, getPickupProtocolData } from "@/lib/protocol-api"
import {
  type WizardStep,
  type ProtocolFormData,
  type ProtocolPhase,
  type CableStatus,
  type ProtocolDamage,
  WIZARD_STEP_LABELS,
  INITIAL_FORM_DATA,
  validateProtocolStep,
  getWizardStepsForPhase,
} from "@/lib/protocol-types"
import {
  StepAuftragsdaten,
  StepUebernahme,
  StepFotos,
  StepVorschaeden,
  StepSchaeden,
  StepUnterschriften,
  StepBestaetigung,
} from "@/components/protokoll"

// Pickup-Daten Interface
interface PickupData {
  km_stand?: number
  started_at?: string
}

function ProtokollWizardContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const tourId = searchParams.get("tourId")
  const typ = searchParams.get("typ") as "uebernahme" | "abgabe" | null

  const [tour, setTour] = useState<Tour | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [currentStep, setCurrentStep] = useState<WizardStep>("auftragsdaten")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [preExistingDamages, setPreExistingDamages] = useState<ProtocolDamage[]>([])
  const [formData, setFormData] = useState<ProtocolFormData>(INITIAL_FORM_DATA)
  const [pickupData, setPickupData] = useState<PickupData | undefined>(undefined)
  const [showMenu, setShowMenu] = useState(false)

  const driverSignatureRef = useRef<SignaturePadRef>(null)
  const recipientSignatureRef = useRef<SignaturePadRef>(null)

  // Phase bestimmen
  const phase: ProtocolPhase = typ === "abgabe" ? "dropoff" : "pickup"

  // Phasenabhängige Steps
  const wizardSteps = getWizardStepsForPhase(phase)

  useEffect(() => {
    loadData()
  }, [tourId])

  const loadData = async () => {
    if (!tourId || !typ) {
      router.push("/fahrerportal/touren")
      return
    }

    try {
      const user = await getCurrentUser()
      if (!user) {
        router.push("/fahrerportal")
        return
      }

      const tourData = await getTourById(tourId)
      setTour(tourData)

      if (tourData.fahrzeugart === "e-auto") {
        setFormData(prev => ({ ...prev, cable_status: "not_present" as CableStatus }))
      }

      if (typ === "abgabe") {
        // Vorschäden und Übernahme-Daten laden
        const [damages, pickupInfo] = await Promise.all([
          getPreExistingDamages(tourId),
          getPickupProtocolData(tourId)
        ])
        setPreExistingDamages(damages)
        if (pickupInfo) {
          setPickupData({
            km_stand: pickupInfo.km_stand,
            started_at: pickupInfo.started_at
          })
        }
      }
    } catch (e) {
      console.error(e)
      setError("Tour konnte nicht geladen werden")
    } finally {
      setIsLoading(false)
    }
  }

  const currentStepIndex = wizardSteps.indexOf(currentStep)
  const isEAuto = tour?.fahrzeugart === "e-auto"

  const updateFormData = <K extends keyof ProtocolFormData>(key: K, value: ProtocolFormData[K]) => {
    setFormData(prev => ({ ...prev, [key]: value }))
  }

  // Validierungsstatus für jeden Step berechnen
  const getStepValidationStatus = (step: WizardStep): 'valid' | 'invalid' | 'neutral' => {
    // Auftragsdaten ist immer valide (read-only)
    if (step === 'auftragsdaten') return 'valid'

    // Vorschäden bei Abgabe: valide sobald Daten geladen
    if (step === 'vorschaeden' && phase === 'dropoff') {
      return 'valid' // Read-only, immer erfüllt
    }

    const validation = validateProtocolStep(step, formData, isEAuto ?? false, phase)
    return validation.isValid ? 'valid' : 'invalid'
  }

  // Direkt zu einem Step navigieren
  const goToStep = (step: WizardStep) => {
    setCurrentStep(step)
    setShowMenu(false)
    window.scrollTo(0, 0)
  }

  const goNext = () => {
    const nextIndex = currentStepIndex + 1
    if (nextIndex < wizardSteps.length) {
      setCurrentStep(wizardSteps[nextIndex])
      window.scrollTo(0, 0)
    }
  }

  const goPrev = () => {
    const prevIndex = currentStepIndex - 1
    if (prevIndex >= 0) {
      setCurrentStep(wizardSteps[prevIndex])
      window.scrollTo(0, 0)
    }
  }

  const canProceed = (): boolean => {
    const validation = validateProtocolStep(currentStep, formData, isEAuto ?? false, phase)
    return validation.isValid
  }

  // Prüft ob alle Steps valide sind (für Abschicken)
  const canSubmit = (): boolean => {
    for (const step of wizardSteps) {
      const validation = validateProtocolStep(step, formData, isEAuto ?? false, phase)
      if (!validation.isValid) return false
    }
    return true
  }

  const handleSubmit = async () => {
    if (!tour || !typ) return

    // Finale Validierung
    if (!canSubmit()) {
      // Sammle alle Fehler für detaillierte Anzeige
      const allErrors: string[] = []
      for (const step of wizardSteps) {
        const validation = validateProtocolStep(step, formData, isEAuto ?? false, phase)
        if (!validation.isValid) {
          allErrors.push(...validation.errors.map(e => `${WIZARD_STEP_LABELS[step]}: ${e}`))
        }
      }
      setError(`Bitte alle Pflichtfelder ausfüllen:\n${allErrors.slice(0, 3).join('\n')}${allErrors.length > 3 ? `\n... und ${allErrors.length - 3} weitere` : ''}`)
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const finalFormData = { ...formData }
      if (driverSignatureRef.current && !driverSignatureRef.current.isEmpty()) {
        finalFormData.driver_signature = driverSignatureRef.current.toDataURL()
      }
      if (recipientSignatureRef.current && !recipientSignatureRef.current.isEmpty()) {
        finalFormData.recipient_signature = recipientSignatureRef.current.toDataURL()
      }

      await completeProtocol(tour.id, phase, finalFormData)
      router.push("/fahrerportal/touren?success=" + typ)
    } catch (e: unknown) {
      console.error("[Protokoll] Submit Fehler:", e)

      // Detaillierte Fehlermeldung extrahieren
      let errorMessage = "Fehler beim Speichern"

      if (e instanceof Error) {
        // Versuche JSON aus der Fehlermeldung zu parsen
        try {
          const parsed = JSON.parse(e.message)
          if (parsed.error) {
            errorMessage = parsed.error
          } else if (parsed.message) {
            errorMessage = parsed.message
          } else {
            errorMessage = e.message
          }
        } catch {
          // Kein JSON, verwende die Fehlermeldung direkt
          errorMessage = e.message
        }

        // RLS/Constraint Fehler erkennen
        if (errorMessage.includes('violates row-level security')) {
          errorMessage = "Zugriff verweigert: Sie haben keine Berechtigung für diese Aktion."
        } else if (errorMessage.includes('duplicate key')) {
          errorMessage = "Protokoll existiert bereits für diese Tour."
        } else if (errorMessage.includes('foreign key')) {
          errorMessage = "Ungültige Referenz: Tour oder Fahrer nicht gefunden."
        }
      } else if (typeof e === 'object' && e !== null) {
        const errObj = e as Record<string, unknown>
        if (errObj.status) {
          errorMessage = `Serverfehler (${errObj.status})`
        }
        if (errObj.error) {
          errorMessage = String(errObj.error)
        }
      }

      setError(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  const getStepTitle = (): string => {
    const typText = phase === "pickup" ? "Übernahme" : "Abgabe"
    return `${typText} - ${WIZARD_STEP_LABELS[currentStep]}`
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary-blue" />
      </div>
    )
  }

  if (!tour || !typ) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="py-8 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">Fehler</h2>
            <p className="text-gray-600 mb-4">{error || "Tour nicht gefunden"}</p>
            <Link href="/fahrerportal/touren">
              <Button>Zurück zur Übersicht</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Header mit Menü-Button */}
      <header className="bg-white border-b shadow-sm sticky top-0 z-20">
        <div className="container mx-auto px-4 py-3 flex items-center gap-3">
          <div className="sm:hidden"><TransNextIcon size={28} /></div>
          <div className="hidden sm:block"><TransNextLogo width={110} height={34} showText /></div>
          <div className="h-6 w-px bg-gray-300" />
          <h1 className="text-lg font-semibold text-primary-blue truncate flex-1">{getStepTitle()}</h1>
          {/* Menü Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowMenu(!showMenu)}
            className="flex items-center gap-1"
          >
            <Menu className="h-4 w-4" />
            <span className="hidden sm:inline">Menü</span>
          </Button>
        </div>
      </header>

      {/* Navigation Menü Overlay */}
      {showMenu && (
        <div className="fixed inset-0 z-30 bg-black/50" onClick={() => setShowMenu(false)}>
          <div
            className="absolute right-0 top-0 h-full w-72 bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="font-semibold text-primary-blue">Navigation</h2>
              <Button variant="ghost" size="sm" onClick={() => setShowMenu(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-2">
              {wizardSteps.map((step, index) => {
                const isActive = step === currentStep
                const validationStatus = getStepValidationStatus(step)

                return (
                  <button
                    key={step}
                    onClick={() => goToStep(step)}
                    className={`w-full text-left p-3 rounded-lg flex items-center gap-3 transition-colors ${
                      isActive
                        ? (phase === "pickup" ? "bg-green-100 text-green-800" : "bg-blue-100 text-blue-800")
                        : "hover:bg-gray-100"
                    }`}
                  >
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                      validationStatus === 'valid'
                        ? "bg-green-500 text-white"
                        : validationStatus === 'invalid'
                          ? "bg-red-500 text-white"
                          : "bg-gray-200 text-gray-600"
                    }`}>
                      {validationStatus === 'valid' ? (
                        <CheckCircle className="h-3 w-3" />
                      ) : validationStatus === 'invalid' ? (
                        <XCircle className="h-3 w-3" />
                      ) : (
                        index + 1
                      )}
                    </div>
                    <span className="flex-1">{WIZARD_STEP_LABELS[step]}</span>
                    {validationStatus === 'invalid' && !isActive && (
                      <span className="text-xs text-red-600">Unvollständig</span>
                    )}
                  </button>
                )
              })}
            </div>
            <div className="absolute bottom-0 left-0 right-0 p-4 border-t bg-white">
              <Link href="/fahrerportal/touren">
                <Button variant="outline" className="w-full">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Protokoll abbrechen
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Progress - Klickbare Schritte mit Validierungsstatus */}
      <div className="bg-white border-b px-4 py-3">
        <div className="container mx-auto max-w-2xl">
          <div className="flex items-center justify-between mb-2 overflow-x-auto">
            {wizardSteps.map((step, index) => {
              const isActive = index === currentStepIndex
              const validationStatus = getStepValidationStatus(step)

              return (
                <div key={step} className="flex items-center flex-shrink-0">
                  <button
                    onClick={() => goToStep(step)}
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium transition-all hover:scale-110 ${
                      validationStatus === 'valid'
                        ? "bg-green-500 text-white"
                        : validationStatus === 'invalid'
                          ? "bg-red-500 text-white"
                          : isActive
                            ? (phase === "pickup" ? "bg-green-600 text-white" : "bg-blue-600 text-white")
                            : "bg-gray-200 text-gray-500 hover:bg-gray-300"
                    }`}
                  >
                    {validationStatus === 'valid' ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : validationStatus === 'invalid' ? (
                      <XCircle className="h-4 w-4" />
                    ) : (
                      index + 1
                    )}
                  </button>
                  {index < wizardSteps.length - 1 && (
                    <div className={`w-6 sm:w-10 h-0.5 mx-0.5 ${
                      validationStatus === 'valid' ? "bg-green-500" : "bg-gray-200"
                    }`} />
                  )}
                </div>
              )
            })}
          </div>
          <div className="flex justify-between text-[10px] text-gray-500 overflow-x-auto">
            {wizardSteps.map(step => {
              const validationStatus = getStepValidationStatus(step)
              return (
                <button
                  key={step}
                  onClick={() => goToStep(step)}
                  className={`flex-shrink-0 px-1 transition-colors ${
                    validationStatus === 'valid'
                      ? "text-green-600"
                      : validationStatus === 'invalid'
                        ? "text-red-600"
                        : "hover:text-primary-blue"
                  }`}
                >
                  {WIZARD_STEP_LABELS[step]}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Tour Info */}
      <div className="container mx-auto px-4 py-3 max-w-2xl">
        <div className="bg-white rounded-lg border p-3 flex items-center gap-3">
          <Car className="h-8 w-8 text-primary-blue flex-shrink-0" />
          <div className="min-w-0">
            <div className="font-semibold text-primary-blue">Tour {tour.tour_nummer}</div>
            <div className="text-sm text-gray-600 truncate">{tour.kennzeichen} • {formatFahrzeugart(tour.fahrzeugart)}</div>
          </div>
          <div className="ml-auto text-right text-sm flex-shrink-0">
            <div className="flex items-center gap-1 text-gray-600">
              <MapPin className="h-3 w-3 text-green-600" />{tour.abholort_ort}
            </div>
            <div className="flex items-center gap-1 text-gray-600">
              <MapPin className="h-3 w-3 text-red-600" />{tour.abgabeort_ort}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="container mx-auto px-4 py-6 pb-32 max-w-2xl">
        {currentStep === "auftragsdaten" && <StepAuftragsdaten tour={tour} />}
        {currentStep === "uebernahme" && (
          <StepUebernahme
            formData={formData}
            updateFormData={updateFormData}
            isEAuto={isEAuto ?? false}
            phase={phase}
            pickupData={pickupData}
          />
        )}
        {currentStep === "fotos" && <StepFotos formData={formData} updateFormData={updateFormData} />}
        {currentStep === "vorschaeden" && <StepVorschaeden preExistingDamages={preExistingDamages} phase={phase} />}
        {currentStep === "schaeden" && <StepSchaeden formData={formData} updateFormData={updateFormData} />}
        {currentStep === "unterschriften" && <StepUnterschriften formData={formData} updateFormData={updateFormData} driverSignatureRef={driverSignatureRef} recipientSignatureRef={recipientSignatureRef} />}
        {currentStep === "bestaetigung" && <StepBestaetigung formData={formData} updateFormData={updateFormData} tour={tour} phase={phase} isEAuto={isEAuto ?? false} error={error} />}
      </main>

      {/* Footer Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4 z-10">
        <div className="container mx-auto max-w-2xl flex gap-3">
          {currentStep === "auftragsdaten" ? (
            <Link href="/fahrerportal/touren" className="flex-1">
              <Button variant="outline" className="w-full"><ArrowLeft className="h-4 w-4 mr-2" />Abbrechen</Button>
            </Link>
          ) : (
            <Button variant="outline" className="flex-1" onClick={goPrev} disabled={isSubmitting}>
              <ArrowLeft className="h-4 w-4 mr-2" />Zurück
            </Button>
          )}

          {currentStep === "bestaetigung" ? (
            <Button
              className={`flex-1 ${phase === "pickup" ? "bg-green-600 hover:bg-green-700" : "bg-blue-600 hover:bg-blue-700"}`}
              onClick={handleSubmit}
              disabled={isSubmitting || !canSubmit()}
            >
              {isSubmitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Speichert...</> : <><CheckCircle className="h-4 w-4 mr-2" />Protokoll abschicken</>}
            </Button>
          ) : (
            <Button
              className={`flex-1 ${phase === "pickup" ? "bg-green-600 hover:bg-green-700" : "bg-blue-600 hover:bg-blue-700"}`}
              onClick={goNext}
            >
              Weiter<ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

export default function ProtokollWizardPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary-blue" /></div>}>
      <ProtokollWizardContent />
    </Suspense>
  )
}
