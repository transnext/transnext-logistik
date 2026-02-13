/**
 * TOUR PROGRESS - Single Source of Truth
 * 
 * Zentrale Funktionen für Tour-Fortschritt, Status-Übergänge und UI-State.
 * ALLE UI-Komponenten sollten diese Funktionen verwenden, nicht direkt auf Status zugreifen.
 */
import type { TourStatus } from './tour-types'
// =====================================================
// TYPES
// =====================================================
export interface TourProgress {
  /** Aktuelle Phase der Tour */
  phase: 'not_started' | 'pickup' | 'dropoff' | 'completed'
  /** Nächste erlaubte Aktion (URL-Pfad) */
  nextAction: string | null
  /** Badge-Text für UI */
  badgeText: string
  /** Badge-Farbe-Klassen */
  badgeColor: { bg: string; text: string; border: string }
  /** Kann Übernahme gestartet werden? */
  canStartPickup: boolean
  /** Kann Abgabe gestartet werden? */
  canStartDropoff: boolean
  /** Ist die Tour abgeschlossen? */
  isCompleted: boolean
}
export interface TourLike {
  id: string
  status: TourStatus
}
// =====================================================
// STATUS -> PROGRESS MAPPING
// =====================================================
const STATUS_TO_PROGRESS: Record<TourStatus, Omit<TourProgress, 'nextAction'>> = {
  neu: {
    phase: 'not_started',
    badgeText: 'Neu',
    badgeColor: { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-200' },
    canStartPickup: false,
    canStartDropoff: false,
    isCompleted: false,
  },
  uebernahme_offen: {
    phase: 'pickup',
    badgeText: 'Übernahme offen',
    badgeColor: { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-200' },
    canStartPickup: true,
    canStartDropoff: false,
    isCompleted: false,
  },
  abgabe_offen: {
    phase: 'dropoff',
    badgeText: 'Abgabe offen',
    badgeColor: { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-200' },
    canStartPickup: false,
    canStartDropoff: true,
    isCompleted: false,
  },
  abgeschlossen: {
    phase: 'completed',
    badgeText: 'Abgeschlossen',
    badgeColor: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-200' },
    canStartPickup: false,
    canStartDropoff: false,
    isCompleted: true,
  },
}
// =====================================================
// HAUPTFUNKTION
// =====================================================
/**
 * Berechnet den Fortschritt einer Tour basierend auf dem Status.
 * 
 * @param tour - Tour-Objekt mit id und status
 * @returns TourProgress mit allen UI-relevanten Informationen
 * 
 * @example
 * const progress = getTourProgress(tour)
 * if (progress.canStartPickup) {
 *   router.push(progress.nextAction)
 * }
 */
export function getTourProgress(tour: TourLike): TourProgress {
  const base = STATUS_TO_PROGRESS[tour.status] || STATUS_TO_PROGRESS.neu
  // Nächste Aktion bestimmen
  let nextAction: string | null = null
  if (base.canStartPickup) {
    nextAction = `/fahrer/tour/${tour.id}/pickup`
  } else if (base.canStartDropoff) {
    nextAction = `/fahrer/tour/${tour.id}/dropoff`
  }
  return {
    ...base,
    nextAction,
  }
}
// =====================================================
// HILFSFUNKTIONEN
// =====================================================
/**
 * Prüft ob der aktuelle Status den Zugriff auf eine Phase erlaubt.
 * Verwendet für URL-Guards.
 */
export function canAccessPhase(status: TourStatus, requestedPhase: 'pickup' | 'dropoff'): boolean {
  if (requestedPhase === 'pickup') {
    return status === 'uebernahme_offen'
  }
  if (requestedPhase === 'dropoff') {
    return status === 'abgabe_offen'
  }
  return false
}
/**
 * Gibt die Redirect-URL zurück wenn eine Phase nicht zugänglich ist.
 */
export function getPhaseRedirect(
  tourId: string,
  status: TourStatus,
  requestedPhase: 'pickup' | 'dropoff'
): { redirect: string; reason: string } | null {
  // Pickup angefragt aber bereits abgeschlossen -> Redirect zu Abgabe
  if (requestedPhase === 'pickup' && status === 'abgabe_offen') {
    return {
      redirect: `/fahrer/tour/${tourId}/dropoff`,
      reason: 'Übernahme bereits abgeschlossen. Bitte Abgabe durchführen.',
    }
  }
  // Pickup angefragt aber Tour abgeschlossen -> Redirect zu Details
  if (requestedPhase === 'pickup' && status === 'abgeschlossen') {
    return {
      redirect: `/fahrer/tour/${tourId}`,
      reason: 'Tour bereits abgeschlossen.',
    }
  }
  // Dropoff angefragt aber Pickup noch offen -> Block
  if (requestedPhase === 'dropoff' && status === 'uebernahme_offen') {
    return {
      redirect: `/fahrer/tour/${tourId}/pickup`,
      reason: 'Bitte zuerst die Übernahme abschließen.',
    }
  }
  // Dropoff angefragt aber Tour abgeschlossen -> Redirect zu Details
  if (requestedPhase === 'dropoff' && status === 'abgeschlossen') {
    return {
      redirect: `/fahrer/tour/${tourId}`,
      reason: 'Tour bereits abgeschlossen.',
    }
  }
  return null
}
/**
 * Gibt den nächsten Status nach Abschluss einer Phase zurück.
 */
export function getNextStatus(currentPhase: 'pickup' | 'dropoff'): TourStatus {
  return currentPhase === 'pickup' ? 'abgabe_offen' : 'abgeschlossen'
}
/**
 * Prüft ob eine Tour für Fahrer-Aktionen sichtbar sein sollte.
 * Abgeschlossene Touren werden in der Hauptliste ausgeblendet.
 */
export function isVisibleToDriver(status: TourStatus): boolean {
  return status !== 'abgeschlossen'
}
/**
 * Gibt das Label für einen Status zurück.
 */
export function getStatusLabel(status: TourStatus): string {
  return STATUS_TO_PROGRESS[status]?.badgeText || status
}
/**
 * Gibt die Farben für einen Status zurück.
 */
export function getStatusColors(status: TourStatus): { bg: string; text: string; border: string } {
  return STATUS_TO_PROGRESS[status]?.badgeColor || STATUS_TO_PROGRESS.neu.badgeColor
}
