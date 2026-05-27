"use client"

import { useRef, useState, useCallback } from "react"
import { Button } from "./button"
import { Camera, Upload, X, Image as ImageIcon, RotateCcw } from "lucide-react"

interface PhotoCaptureProps {
  photos: string[]
  onPhotosChange: (photos: string[]) => void
  maxPhotos?: number
  labels?: string[]
  required?: boolean
}

export function PhotoCapture({
  photos,
  onPhotosChange,
  maxPhotos = 4,
  labels = ["Vorne", "Hinten", "Links", "Rechts"],
  required = false,
}: PhotoCaptureProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>, index?: number) => {
      const files = e.target.files
      if (!files || files.length === 0) return

      const file = files[0]
      if (!file.type.startsWith("image/")) {
        alert("Bitte nur Bilddateien auswählen")
        return
      }

      const reader = new FileReader()
      reader.onload = () => {
        const dataUrl = reader.result as string
        const newPhotos = [...photos]

        if (index !== undefined) {
          // Replace specific photo
          newPhotos[index] = dataUrl
        } else {
          // Add to first empty slot
          const emptyIndex = newPhotos.findIndex((p) => !p)
          if (emptyIndex >= 0) {
            newPhotos[emptyIndex] = dataUrl
          } else if (newPhotos.length < maxPhotos) {
            newPhotos.push(dataUrl)
          }
        }

        onPhotosChange(newPhotos)
      }
      reader.readAsDataURL(file)

      // Reset input
      e.target.value = ""
      setSelectedIndex(null)
    },
    [photos, maxPhotos, onPhotosChange]
  )

  const removePhoto = (index: number) => {
    const newPhotos = [...photos]
    newPhotos[index] = ""
    onPhotosChange(newPhotos)
  }

  const openCamera = (index: number) => {
    setSelectedIndex(index)
    cameraInputRef.current?.click()
  }

  const openFileSelector = (index: number) => {
    setSelectedIndex(index)
    fileInputRef.current?.click()
  }

  // Initialize photos array if needed
  const displayPhotos = [...photos]
  while (displayPhotos.length < maxPhotos) {
    displayPhotos.push("")
  }

  const filledCount = displayPhotos.filter((p) => p).length

  return (
    <div className="space-y-4">
      {/* Hidden inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFileSelect(e, selectedIndex ?? undefined)}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => handleFileSelect(e, selectedIndex ?? undefined)}
      />

      {/* Photo grid */}
      <div className="grid grid-cols-2 gap-3">
        {displayPhotos.slice(0, maxPhotos).map((photo, index) => (
          <div
            key={index}
            className={`relative aspect-[4/3] rounded-lg border-2 overflow-hidden ${
              photo
                ? "border-green-300 bg-green-50"
                : required
                  ? "border-dashed border-orange-300 bg-orange-50"
                  : "border-dashed border-gray-300 bg-gray-50"
            }`}
          >
            {photo ? (
              <>
                <img
                  src={photo}
                  alt={labels[index] || `Foto ${index + 1}`}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/0 hover:bg-black/40 transition-colors group">
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => openCamera(index)}
                      className="h-8 w-8 p-0"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      onClick={() => removePhoto(index)}
                      className="h-8 w-8 p-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                  <span className="text-white text-xs font-medium">
                    {labels[index] || `Foto ${index + 1}`}
                  </span>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full p-3">
                <ImageIcon className="h-8 w-8 text-gray-400 mb-2" />
                <span className="text-xs text-gray-500 text-center mb-3">
                  {labels[index] || `Foto ${index + 1}`}
                </span>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => openCamera(index)}
                    className="h-8 px-2 text-xs"
                  >
                    <Camera className="h-3 w-3 mr-1" />
                    Kamera
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => openFileSelector(index)}
                    className="h-8 px-2 text-xs"
                  >
                    <Upload className="h-3 w-3 mr-1" />
                    Datei
                  </Button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Status */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-500">
          {filledCount} von {maxPhotos} Fotos
        </span>
        {required && filledCount === 0 && (
          <span className="text-orange-600">Mindestens 1 Foto erforderlich</span>
        )}
        {filledCount === maxPhotos && (
          <span className="text-green-600">Alle Fotos erfasst</span>
        )}
      </div>
    </div>
  )
}
