"use client"

import { useRef, useEffect, useState, forwardRef, useImperativeHandle } from "react"
import { Button } from "./button"
import { Trash2, Check } from "lucide-react"

export interface SignaturePadRef {
  clear: () => void
  isEmpty: () => boolean
  toDataURL: () => string
}

interface SignaturePadProps {
  onSignatureChange?: (hasSignature: boolean) => void
  width?: number
  height?: number
  className?: string
}

export const SignaturePad = forwardRef<SignaturePadRef, SignaturePadProps>(
  ({ onSignatureChange, width = 400, height = 200, className = "" }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const [isDrawing, setIsDrawing] = useState(false)
    const [hasContent, setHasContent] = useState(false)
    const lastPos = useRef<{ x: number; y: number } | null>(null)

    useImperativeHandle(ref, () => ({
      clear: () => {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext("2d")
        if (!ctx) return
        ctx.fillStyle = "#ffffff"
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        setHasContent(false)
        onSignatureChange?.(false)
      },
      isEmpty: () => !hasContent,
      toDataURL: () => {
        const canvas = canvasRef.current
        if (!canvas) return ""
        return canvas.toDataURL("image/png")
      },
    }))

    useEffect(() => {
      const canvas = canvasRef.current
      if (!canvas) return

      // Set canvas size
      const dpr = window.devicePixelRatio || 1
      const rect = canvas.getBoundingClientRect()
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr

      const ctx = canvas.getContext("2d")
      if (!ctx) return

      ctx.scale(dpr, dpr)
      ctx.fillStyle = "#ffffff"
      ctx.fillRect(0, 0, rect.width, rect.height)
      ctx.strokeStyle = "#1e3a5f"
      ctx.lineWidth = 2
      ctx.lineCap = "round"
      ctx.lineJoin = "round"
    }, [])

    const getPosition = (e: React.TouchEvent | React.MouseEvent) => {
      const canvas = canvasRef.current
      if (!canvas) return { x: 0, y: 0 }

      const rect = canvas.getBoundingClientRect()

      if ("touches" in e) {
        const touch = e.touches[0]
        return {
          x: touch.clientX - rect.left,
          y: touch.clientY - rect.top,
        }
      } else {
        return {
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        }
      }
    }

    const startDrawing = (e: React.TouchEvent | React.MouseEvent) => {
      e.preventDefault()
      setIsDrawing(true)
      lastPos.current = getPosition(e)
    }

    const draw = (e: React.TouchEvent | React.MouseEvent) => {
      if (!isDrawing || !lastPos.current) return
      e.preventDefault()

      const canvas = canvasRef.current
      const ctx = canvas?.getContext("2d")
      if (!canvas || !ctx) return

      const currentPos = getPosition(e)

      ctx.beginPath()
      ctx.moveTo(lastPos.current.x, lastPos.current.y)
      ctx.lineTo(currentPos.x, currentPos.y)
      ctx.stroke()

      lastPos.current = currentPos

      if (!hasContent) {
        setHasContent(true)
        onSignatureChange?.(true)
      }
    }

    const stopDrawing = () => {
      setIsDrawing(false)
      lastPos.current = null
    }

    const handleClear = () => {
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext("2d")
      if (!ctx) return

      const rect = canvas.getBoundingClientRect()
      ctx.fillStyle = "#ffffff"
      ctx.fillRect(0, 0, rect.width, rect.height)
      setHasContent(false)
      onSignatureChange?.(false)
    }

    return (
      <div className={`space-y-3 ${className}`}>
        <div className="relative border-2 border-dashed border-gray-300 rounded-lg overflow-hidden bg-white">
          <canvas
            ref={canvasRef}
            className="w-full touch-none cursor-crosshair"
            style={{ height: `${height}px` }}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
          />
          {!hasContent && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <p className="text-gray-400 text-sm">Hier unterschreiben</p>
            </div>
          )}
        </div>
        <div className="flex justify-between items-center">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleClear}
            disabled={!hasContent}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Löschen
          </Button>
          {hasContent && (
            <div className="flex items-center gap-2 text-green-600 text-sm">
              <Check className="h-4 w-4" />
              Unterschrift erfasst
            </div>
          )}
        </div>
      </div>
    )
  }
)

SignaturePad.displayName = "SignaturePad"
