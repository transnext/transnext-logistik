"use client"

import { useEffect, useState, useRef, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { TransNextLogo, TransNextIcon } from "@/components/ui/logo"
import { SignaturePadRef } from "@/components/ui/signature-pad"
import { ArrowLeft, ArrowRight, Car, MapPin, CheckCircle, Loader2, AlertCircle } from "lucide-react"
import { getCurrentUser } from "@/lib/api"
import type { Tour } from "@/lib/supabase"
import { getTourById, formatFahrzeugart } from "@/lib/touren-api"
import { completeProtocol, getPreExistingDamages } from "@/lib/protocol-api"
import {
  type WizardStep,
  type ProtocolFormData,
  type ProtocolPhase,
  type CableStatus,
  type ProtocolDamage,
  WIZARD_STEPS,
  WIZARD_STEP_LABELS,
  INITIAL_FORM_DATA,
  validateProtocolStep,
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

  const driverSignatureRef = useRef<SignaturePadRef>(null)
  const recipientSignatureRef = useRef<SignaturePadRef>(null)

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
        const damages = await getPreExistingDamages(tourId)
        setPreExistingDamages(damages)
      }
    } catch (e) {
      console.error(e)
      setError("Tour konnte nicht geladen werden")
    } finally {
      setIsLoading(false)
    }
  }

  const currentStepIndex = WIZARD_STEPS.indexOf(currentStep)
  const isEAuto = tour?.fahrzeugart === "e-auto"
  const phase: ProtocolPhase = typ === "abgabe" ? "dropoff" : "pickup"

  const updateFormData = <K extends keyof ProtocolFormData>(key: K, value: ProtocolFormData[K]) => {
    setFormData(prev => ({ ...prev, [key]: value }))
  }

  const goNext = () => {
    const nextIndex = currentStepIndex + 1
    if (nextIndex < WIZARD_STEPS.length) {
      setCurrentStep(WIZARD_STEPS[nextIndex])
      window.scrollTo(0, 0)
    }
  }

  const goPrev = () => {
    const prevIndex = currentStepIndex - 1
    if (prevIndex >= 0) {
      setCurrentStep(WIZARD_STEPS[prevIndex])
      window.scrollTo(0, 0)
    }
  }

  const canProceed = (): boolean => {
    const validation = validateProtocolStep(currentStep, formData, isEAuto)
    return validation.isValid
  }

  const handleSubmit = async () => {
    if (!tour || !typ) return

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
    } catch (e) {
      console.error(e)
      setError(e instanceof Error ? e.message : "Fehler beim Speichern")
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
      {/* Header */}
      <header className="bg-white border-b shadow-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 flex items-center gap-3">
          <div className="sm:hidden"><TransNextIcon size={28} /></div>
          <div className="hidden sm:block"><TransNextLogo width={110} height={34} showText /></div>
          <div className="h-6 w-px bg-gray-300" />
          <h1 className="text-lg font-semibold text-primary-blue truncate">{getStepTitle()}</h1>
        </div>
      </header>

      {/* Progress */}
      <div className="bg-white border-b px-4 py-3">
        <div className="container mx-auto max-w-2xl">
          <div className="flex items-center justify-between mb-2 overflow-x-auto">
            {WIZARD_STEPS.map((step, index) => {
              const isActive = index === currentStepIndex
              const isCompleted = index < currentStepIndex
              return (
                <div key={step} className="flex items-center flex-shrink-0">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
                    isCompleted ? "bg-green-500 text-white" : isActive ? (phase === "pickup" ? "bg-green-600 text-white" : "bg-blue-600 text-white") : "bg-gray-200 text-gray-500"
                  }`}>
                    {isCompleted ? <CheckCircle className="h-4 w-4" /> : index + 1}
                  </div>
                  {index < WIZARD_STEPS.length - 1 && (
                    <div className={`w-6 sm:w-10 h-0.5 mx-0.5 ${isCompleted ? "bg-green-500" : "bg-gray-200"}`} />
                  )}
                </div>
              )
            })}
          </div>
          <div className="flex justify-between text-[10px] text-gray-500 overflow-x-auto">
            {WIZARD_STEPS.map(step => (
              <span key={step} className="flex-shrink-0 px-1">{WIZARD_STEP_LABELS[step]}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Tour Info */}
      <div className="container mx-auto px-4 py-3 max-w-2xl">
        <div className="bg-white rounded-lg border p-3 flex items-center gap-3">
          <Car className="h-8 w-8 text-primary-blue flex-shrink-0" />
          <div className="min-w-0">
            <div className="font-semibold text-primary-blue">Tour #{tour.tour_nummer}</div>
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
        {currentStep === "uebernahme" && <StepUebernahme formData={formData} updateFormData={updateFormData} isEAuto={isEAuto} phase={phase} />}
        {currentStep === "fotos" && <StepFotos formData={formData} updateFormData={updateFormData} />}
        {currentStep === "vorschaeden" && <StepVorschaeden preExistingDamages={preExistingDamages} phase={phase} />}
        {currentStep === "schaeden" && <StepSchaeden formData={formData} updateFormData={updateFormData} />}
        {currentStep === "unterschriften" && <StepUnterschriften formData={formData} updateFormData={updateFormData} driverSignatureRef={driverSignatureRef} recipientSignatureRef={recipientSignatureRef} />}
        {currentStep === "bestaetigung" && <StepBestaetigung formData={formData} updateFormData={updateFormData} tour={tour} phase={phase} isEAuto={isEAuto} error={error} />}
      </main>

      {/* Footer Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4">
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
              disabled={isSubmitting || !canProceed()}
            >
              {isSubmitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Speichert...</> : <><CheckCircle className="h-4 w-4 mr-2" />Protokoll abschicken</>}
            </Button>
          ) : (
            <Button
              className={`flex-1 ${phase === "pickup" ? "bg-green-600 hover:bg-green-700" : "bg-blue-600 hover:bg-blue-700"}`}
              onClick={goNext}
              disabled={!canProceed()}
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
