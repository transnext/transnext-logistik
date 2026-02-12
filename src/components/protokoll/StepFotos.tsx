"use client"

import { useRef, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Camera, Trash2 } from "lucide-react"
import type { ProtocolFormData, PhotoCategory } from "@/lib/protocol-types"
import { PHOTO_CATEGORIES } from "@/lib/protocol-types"

interface StepFotosProps {
  formData: ProtocolFormData
  updateFormData: <K extends keyof ProtocolFormData>(key: K, value: ProtocolFormData[K]) => void
}

export function StepFotos({ formData, updateFormData }: StepFotosProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [activeCategory, setActiveCategory] = useState<PhotoCategory | null>(null)

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
  }

  const openCamera = (category: PhotoCategory) => {
    setActiveCategory(category)
    fileInputRef.current?.click()
  }

  const removePhoto = (category: PhotoCategory) => {
    const newPhotos = { ...formData.photos }
    delete newPhotos[category]
    updateFormData("photos", newPhotos)
  }

  const completedCount = PHOTO_CATEGORIES.filter(c => formData.photos[c.id]).length

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Camera className="h-5 w-5 text-primary-blue" />
          Fahrzeugfotos ({completedCount}/{PHOTO_CATEGORIES.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-600 mb-4">
          Alle Fotos sind Pflicht. Tippen Sie auf ein Feld, um ein Foto aufzunehmen.
        </p>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
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
                onClick={() => !hasPhoto && openCamera(cat.id)}
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
  )
}
