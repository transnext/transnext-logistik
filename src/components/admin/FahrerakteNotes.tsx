"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { EmptyState } from "@/components/ui/empty-state"
import {
  MessageSquare,
  Plus,
  Star,
  AlertTriangle,
  ThumbsUp,
  User,
  Archive,
  RefreshCw,
  Clock,
  X
} from "lucide-react"
import {
  getFahrerNotes,
  createFahrerNote,
  archiveFahrerNote,
  getNoteCategoryLabel,
  type FahrerNote,
  type NoteCategory
} from "@/lib/fahrer-management-api"
import { cn } from "@/lib/utils"

interface FahrerakteNotesProps {
  fahrerId: string
  isAdmin: boolean
}

const NOTE_CATEGORIES: { value: NoteCategory; label: string; icon: React.ReactNode; color: string }[] = [
  { value: 'allgemein', label: 'Allgemein', icon: <MessageSquare className="h-3 w-3" />, color: 'bg-gray-100 text-gray-700 border-gray-200' },
  { value: 'positiv', label: 'Positiv', icon: <ThumbsUp className="h-3 w-3" />, color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { value: 'verhalten', label: 'Verhalten', icon: <User className="h-3 w-3" />, color: 'bg-amber-50 text-amber-700 border-amber-200' },
  { value: 'zuverlaessigkeit', label: 'Zuverlässigkeit', icon: <Clock className="h-3 w-3" />, color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { value: 'kommunikation', label: 'Kommunikation', icon: <MessageSquare className="h-3 w-3" />, color: 'bg-purple-50 text-purple-700 border-purple-200' },
  { value: 'schaden', label: 'Schaden/Vorfall', icon: <AlertTriangle className="h-3 w-3" />, color: 'bg-orange-50 text-orange-700 border-orange-200' },
  { value: 'abmahnung', label: 'Abmahnung', icon: <AlertTriangle className="h-3 w-3" />, color: 'bg-red-50 text-red-700 border-red-200' },
  { value: 'sonstiges', label: 'Sonstiges', icon: <MessageSquare className="h-3 w-3" />, color: 'bg-gray-100 text-gray-700 border-gray-200' }
]

function getCategoryConfig(category: NoteCategory) {
  return NOTE_CATEGORIES.find(c => c.value === category) || NOTE_CATEGORIES[0]
}

export function FahrerakteNotes({ fahrerId, isAdmin }: FahrerakteNotesProps) {
  const [notes, setNotes] = useState<FahrerNote[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")

  // Neue Notiz State
  const [newCategory, setNewCategory] = useState<NoteCategory>('allgemein')
  const [newContent, setNewContent] = useState("")
  const [newIsImportant, setNewIsImportant] = useState(false)

  useEffect(() => {
    loadNotes()
  }, [fahrerId])

  const loadNotes = async () => {
    setIsLoading(true)
    try {
      const data = await getFahrerNotes(fahrerId)
      setNotes(data)
    } catch (err) {
      console.error("Fehler beim Laden der Notizen:", err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddNote = async () => {
    if (!newContent.trim()) {
      setError("Bitte einen Text eingeben")
      return
    }

    setIsSubmitting(true)
    setError("")

    try {
      const result = await createFahrerNote(
        fahrerId,
        newCategory,
        newContent.trim(),
        newIsImportant
      )

      if (!result.success) {
        throw new Error(result.error || 'Fehler beim Speichern')
      }

      // Zurücksetzen und schließen
      setNewContent("")
      setNewCategory('allgemein')
      setNewIsImportant(false)
      setShowAddModal(false)

      // Liste neu laden
      await loadNotes()
    } catch (err) {
      console.error("Fehler beim Speichern:", err)
      setError(err instanceof Error ? err.message : 'Fehler beim Speichern')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleArchiveNote = async (noteId: string) => {
    if (!confirm("Notiz archivieren? Diese Aktion kann nicht rückgängig gemacht werden.")) {
      return
    }

    try {
      const result = await archiveFahrerNote(noteId)
      if (!result.success) {
        throw new Error(result.error || 'Fehler beim Archivieren')
      }
      await loadNotes()
    } catch (err) {
      console.error("Fehler beim Archivieren:", err)
      alert("Fehler beim Archivieren der Notiz")
    }
  }

  const formatDateTime = (dateStr: string): string => {
    return new Date(dateStr).toLocaleString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (!isAdmin) {
    // Disponent/Fahrer: Keinen Zugriff auf interne Notizen
    return null
  }

  if (isLoading) {
    return (
      <Card className="border-gray-100">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-gray-400" />
            Interne Notizen
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-6">
            <RefreshCw className="h-5 w-5 animate-spin text-gray-400" />
            <span className="ml-2 text-sm text-gray-500">Lade Notizen...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Wichtige Notizen zuerst
  const sortedNotes = [...notes].sort((a, b) => {
    if (a.is_important && !b.is_important) return -1
    if (!a.is_important && b.is_important) return 1
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })

  return (
    <>
      <Card className="border-gray-100">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-gray-400" />
                Interne Notizen
                {notes.length > 0 && (
                  <Badge variant="outline" className="ml-2 text-xs">
                    {notes.length}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>Nur für Admin/GF/HR sichtbar</CardDescription>
            </div>
            <Button
              size="sm"
              onClick={() => setShowAddModal(true)}
              className="bg-primary-blue hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-1" />
              Neue Notiz
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {notes.length === 0 ? (
            <EmptyState
              title="Keine Notizen"
              description="Es wurden noch keine internen Notizen für diesen Fahrer erfasst."
              icon={<MessageSquare className="h-12 w-12 text-gray-400" />}
              iconSize="sm"
            />
          ) : (
            <div className="space-y-3">
              {sortedNotes.map(note => {
                const categoryConfig = getCategoryConfig(note.category)

                return (
                  <div
                    key={note.id}
                    className={cn(
                      "p-4 rounded-lg border",
                      note.is_important ? "bg-amber-50/50 border-amber-200" : "bg-gray-50/50 border-gray-100"
                    )}
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {note.is_important && (
                          <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                        )}
                        <Badge className={cn("border text-xs", categoryConfig.color)}>
                          {categoryConfig.icon}
                          <span className="ml-1">{categoryConfig.label}</span>
                        </Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleArchiveNote(note.id)}
                        className="text-gray-400 hover:text-red-600 h-7 w-7 p-0"
                        title="Archivieren"
                      >
                        <Archive className="h-3.5 w-3.5" />
                      </Button>
                    </div>

                    {/* Inhalt */}
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">
                      {note.content}
                    </p>

                    {/* Footer */}
                    <div className="mt-2 pt-2 border-t border-gray-100 flex items-center gap-2 text-xs text-gray-500">
                      <span>{formatDateTime(note.created_at)}</span>
                      <span>•</span>
                      <span>{note.created_by_name || 'Unbekannt'}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Neue Notiz Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary-blue" />
              Neue interne Notiz
            </DialogTitle>
            <DialogDescription>
              Erfassen Sie eine interne Notiz zum Fahrer. Diese ist nur für Admin/GF/HR sichtbar.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Kategorie */}
            <div className="space-y-2">
              <Label htmlFor="category">Kategorie</Label>
              <Select value={newCategory} onValueChange={(v) => setNewCategory(v as NoteCategory)}>
                <SelectTrigger>
                  <SelectValue placeholder="Kategorie wählen" />
                </SelectTrigger>
                <SelectContent>
                  {NOTE_CATEGORIES.map(cat => (
                    <SelectItem key={cat.value} value={cat.value}>
                      <div className="flex items-center gap-2">
                        {cat.icon}
                        <span>{cat.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Inhalt */}
            <div className="space-y-2">
              <Label htmlFor="content">Notiz</Label>
              <Textarea
                id="content"
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                placeholder="Ihre interne Notiz..."
                rows={4}
              />
            </div>

            {/* Wichtig markieren */}
            <div className="flex items-center gap-3">
              <Switch
                id="important"
                checked={newIsImportant}
                onCheckedChange={setNewIsImportant}
              />
              <Label htmlFor="important" className="flex items-center gap-2 cursor-pointer">
                <Star className={cn(
                  "h-4 w-4",
                  newIsImportant ? "text-amber-500 fill-amber-500" : "text-gray-400"
                )} />
                Als wichtig markieren
              </Label>
            </div>

            {/* Fehler */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                {error}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowAddModal(false)}
              disabled={isSubmitting}
            >
              Abbrechen
            </Button>
            <Button
              onClick={handleAddNote}
              disabled={isSubmitting || !newContent.trim()}
              className="bg-primary-blue hover:bg-blue-700"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Speichern...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Notiz erstellen
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
