"use client"

import { useEffect, useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { PDFViewerDialog } from "@/components/pdf-viewer-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { TransNextLogo } from "@/components/ui/logo"
import { LogOut, FileText, Search, Clock, CheckCircle, XCircle, TrendingUp, Euro, Download, CreditCard, Users, UserPlus, UserX, Eye, EyeOff, Edit, ArrowLeft, Trash2, RefreshCw } from "lucide-react"
import {
  getCurrentUser,
  getUserProfile,
  signOut,
  updateArbeitsnachweisStatus,
  updateAuslagennachweisStatus
} from "@/lib/api"
import {
  getAllArbeitsnachweiseAdmin,
  getAllAuslagennachweiseAdmin,
  getAllFahrerAdmin,
  createFahrer,
  updateFahrerStatus,
  updateFahrer,
  deleteTour,
  billMultipleTours,
  deleteAuslage,
  billMultipleAuslagen,
  markTourAsRuecklaufer,
  getMonatsueberschuss,
  updateTour,
  updateAuslage
} from "@/lib/admin-api"
import { exportTourenPDF, exportAuslagenPDF, exportAuslagenWithBelege } from "@/lib/pdf-export"
import { calculateTourVerdienst, MONTHLY_LIMIT, calculateMonthlyPayout } from "@/lib/salary-calculator"
import { calculateCustomerTotal } from "@/lib/customer-pricing"

/**
 * Vergleicht zwei Namen unabhängig von der Reihenfolge (Vorname Nachname vs. Nachname Vorname)
 * z.B. "Hicham Salmi" === "Salmi Hicham"
 */
function namesMatch(name1: string, name2: string): boolean {
  if (!name1 || !name2) return false

  // Direkter Vergleich (case-insensitive)
  if (name1.toLowerCase().trim() === name2.toLowerCase().trim()) return true

  // Vergleiche die Namen in beiden Reihenfolgen
  const parts1 = name1.trim().split(/\s+/)
  const parts2 = name2.trim().split(/\s+/)

  // Wenn unterschiedliche Anzahl von Teilen, kein Match
  if (parts1.length !== parts2.length) return false

  // Prüfe ob alle Teile in beiden Namen vorkommen (unabhängig von der Reihenfolge)
  const sortedParts1 = parts1.map(p => p.toLowerCase()).sort().join(' ')
  const sortedParts2 = parts2.map(p => p.toLowerCase()).sort().join(' ')

  return sortedParts1 === sortedParts2
}

interface Tour {
  id: number
  tourNr: string
  datum: string
  gefahreneKm: string
  wartezeit: string
  fahrer: string
  status: string
  erstelltAm: string
  belegUrl?: string
  istRuecklaufer?: boolean
  auftraggeber?: string
  zeitmodell?: string
  festes_gehalt?: number
}

// NOTE: File is too large to include in full. See local changes.
