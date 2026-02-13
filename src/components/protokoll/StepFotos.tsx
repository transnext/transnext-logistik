"use client"

import { useRef, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Camera, Trash2, Image, X } from "lucide-react"
import type { ProtocolFormData, PhotoCategory } from "@/lib/protocol-types"
import { PHOTO_CATEGORIES } from "@/lib/protocol-types"

interface StepFotosProps {
  formData: ProtocolFormData
  updateFormData: <K extends keyof ProtocolFormData>(key: K, value: ProtocolFormData[K]) => void
}

export function StepFotos({ formData, updateFormData }: StepFotosProps) {
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)
  const [activeCategory, setActiveCategory] = useState<PhotoCategory | null>(null)
  const [showActionSheet, setShowActionSheet] = useState(false)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !activeCategory) return

    const reader = new FileReader()
    reader.onload = () => {
      const newPhotos = { ...formData.photos, [activeCategory]: reader.result as string }
      updateFormData("photos", newPhotos)
    }
    reader.readAsDataURL(file)
    e.target.value = ""
    setActiveCategory(null)
    setShowActionSheet(false)
  }

  const openActionSheet = (category: PhotoCategory) => {
    setActiveCategory(category)
    setShowActionSheet(true)
  }

  const handleCameraChoice = () => {
    cameraInputRef.current?.click()
  }

  const handleGalleryChoice = () => {
    galleryInputRef.current?.click()
  }

  const closeActionSheet = () => {
    setShowActionSheet(false)
    setActiveCategory(null)
  }

  const removePhoto = (category: PhotoCategory) => {
    const newPhotos = { ...formData.photos }
    delete newPhotos[category]
    updateFormData("photos", newPhotos)
  }

  const completedCount = PHOTO_CATEGORIES.filter(c => formData.photos[c.id]).length
  const activeCategoryLabel = activeCategory
    ? PHOTO_CATEGORIES.find(c => c.id === activeCategory)?.label
    : ""

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Camera className="h-5 w-5 text-primary-blue" />
            Fahrzeugfotos ({completedCount}/{PHOTO_CATEGORIES.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 mb-4">
            Alle Fotos sind Pflicht. Tippen Sie auf ein Feld, um ein Foto aufzunehmen oder aus der Galerie zu wählen.
          </p>

          {/* Hidden inputs für Kamera und Galerie */}
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFileSelect}
          />
          <input
            ref={galleryInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileSelect}
          />

          <div className="space-y-2">
            {PHOTO_CATEGORIES.map((cat) => {
              const hasPhoto = !!formData.photos[cat.id]
              return (
                <div
                  key={cat.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                    hasPhoto
                      ? "border-green-300 bg-green-50"
                      : "border-dashed border-orange-300 bg-orange-50"
                  }`}
                  onClick={() => !hasPhoto && openActionSheet(cat.id)}
                >
                  <div className="flex-shrink-0">
                    {hasPhoto ? (
                      <img
                        src={formData.photos[cat.id]}
                        alt={cat.label}
                        className="w-12 h-12 object-cover rounded"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center">
                        <Camera className="h-5 w-5 text-gray-400" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{cat.label}</p>
                    <p className={`text-xs ${hasPhoto ? "text-green-600" : "text-orange-600"}`}>
                      {hasPhoto ? "Erfasst" : "Pflicht"}
                    </p>
                  </div>
                  {hasPhoto && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        removePhoto(cat.id)
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Action Sheet Overlay */}
      {showActionSheet && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-end justify-center"
          onClick={closeActionSheet}
        >
          <div
            className="bg-white w-full max-w-md rounded-t-2xl p-4 pb-8 animate-in slide-in-from-bottom duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg">{activeCategoryLabel}</h3>
              <Button variant="ghost" size="sm" onClick={closeActionSheet}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="space-y-2">
              <Button
                className="w-full h-14 text-base justify-start gap-4 bg-primary-blue hover:bg-blue-700"
                onClick={handleCameraChoice}
              >
                <Camera className="h-6 w-6" />
                Kamera öffnen
              </Button>

              <Button
                variant="outline"
                className="w-full h-14 text-base justify-start gap-4"
                onClick={handleGalleryChoice}
              >
                <Image className="h-6 w-6" />
                Aus Galerie auswählen
              </Button>

              <Button
                variant="ghost"
                className="w-full h-12 text-base text-gray-500"
                onClick={closeActionSheet}
              >
                Abbrechen
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
