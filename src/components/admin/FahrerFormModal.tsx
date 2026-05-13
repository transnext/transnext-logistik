"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { UserPlus, CheckCircle, Eye, EyeOff } from "lucide-react"

// Fahrer-Interface für das Formular
export interface FahrerFormData {
  vorname?: string
  nachname?: string
  geburtsdatum?: string
  adresse?: string
  plz?: string
  ort?: string
  fuehrerscheinNr?: string
  fuehrerscheinDatum?: string
  ausstellendeBehoerde?: string
  fuehrerscheinklassen?: string[]
  ausweisnummer?: string
  ausweisAblauf?: string
  benutzername?: string
  passwort?: string
  zeitmodell?: string
  festesGehalt?: number
}

// Liste der Führerscheinklassen
const FUEHRERSCHEINKLASSEN = ['B', 'BE', 'C', 'CE', 'C1', 'C1E', 'D', 'DE', 'D1', 'D1E', 'AM', 'A1', 'A2', 'A', 'L', 'T']

interface FahrerFormModalProps {
  /** Modus: create = neuen Fahrer anlegen, edit = bestehenden Fahrer bearbeiten */
  mode: 'create' | 'edit'
  /** Aktuelle Fahrer-Daten */
  fahrer: FahrerFormData
  /** Handler: Fahrer-Daten ändern */
  onFahrerChange: (fahrer: FahrerFormData) => void
  /** Handler: Formular abschicken */
  onSubmit: (e: React.FormEvent) => void
  /** Handler: Abbrechen */
  onCancel: () => void
  /** Handler: Führerscheinklasse ändern */
  onKlassenChange: (klasse: string, checked: boolean) => void
  /** Passwort sichtbar? (nur für mode="create") */
  showPassword?: boolean
  /** Handler: Passwort-Sichtbarkeit umschalten (nur für mode="create") */
  onTogglePassword?: () => void
}

/**
 * FahrerFormModal - Formular zum Erstellen oder Bearbeiten eines Fahrers
 *
 * Diese Komponente enthält KEINE API-Aufrufe.
 * Alle Handler werden über Props übergeben.
 */
export function FahrerFormModal({
  mode,
  fahrer,
  onFahrerChange,
  onSubmit,
  onCancel,
  onKlassenChange,
  showPassword = false,
  onTogglePassword
}: FahrerFormModalProps) {
  const isCreate = mode === 'create'
  const idPrefix = isCreate ? '' : 'edit-'

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-2xl text-primary-blue">
          {isCreate ? 'Neuen Fahrer anlegen' : 'Fahrer bearbeiten'}
        </CardTitle>
        <CardDescription>
          {isCreate
            ? 'Alle Felder ausfüllen um einen neuen Fahrer-Account zu erstellen'
            : 'Fahrer-Daten aktualisieren (Email und Passwort können nicht geändert werden)'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-6">
          {/* Persönliche Daten */}
          <div className="border-b pb-6">
            <h3 className="font-semibold text-lg mb-4 text-primary-blue">Persönliche Daten</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor={`${idPrefix}vorname`}>Vorname *</Label>
                <Input
                  id={`${idPrefix}vorname`}
                  required
                  value={fahrer.vorname || ''}
                  onChange={(e) => onFahrerChange({ ...fahrer, vorname: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor={`${idPrefix}nachname`}>Nachname *</Label>
                <Input
                  id={`${idPrefix}nachname`}
                  required
                  value={fahrer.nachname || ''}
                  onChange={(e) => onFahrerChange({ ...fahrer, nachname: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor={`${idPrefix}geburtsdatum`}>Geburtsdatum *</Label>
                <Input
                  id={`${idPrefix}geburtsdatum`}
                  type="date"
                  required
                  value={fahrer.geburtsdatum || ''}
                  onChange={(e) => onFahrerChange({ ...fahrer, geburtsdatum: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor={`${idPrefix}adresse`}>Straße & Hausnummer *</Label>
                <Input
                  id={`${idPrefix}adresse`}
                  required
                  placeholder={isCreate ? 'z.B. Musterstr. 123' : undefined}
                  value={fahrer.adresse || ''}
                  onChange={(e) => onFahrerChange({ ...fahrer, adresse: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor={`${idPrefix}plz`}>PLZ *</Label>
                <Input
                  id={`${idPrefix}plz`}
                  required
                  placeholder={isCreate ? 'z.B. 44809' : undefined}
                  value={fahrer.plz || ''}
                  onChange={(e) => onFahrerChange({ ...fahrer, plz: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor={`${idPrefix}ort`}>Ort *</Label>
                <Input
                  id={`${idPrefix}ort`}
                  required
                  placeholder={isCreate ? 'z.B. Bochum' : undefined}
                  value={fahrer.ort || ''}
                  onChange={(e) => onFahrerChange({ ...fahrer, ort: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Führerschein-Daten */}
          <div className="border-b pb-6">
            <h3 className="font-semibold text-lg mb-4 text-primary-blue">Führerschein-Daten</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor={`${idPrefix}fuehrerscheinNr`}>Führerschein-Nummer *</Label>
                <Input
                  id={`${idPrefix}fuehrerscheinNr`}
                  required
                  placeholder={isCreate ? 'z.B. D123456789' : undefined}
                  value={fahrer.fuehrerscheinNr || ''}
                  onChange={(e) => onFahrerChange({ ...fahrer, fuehrerscheinNr: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor={`${idPrefix}fuehrerscheinDatum`}>Ausstellungsdatum *</Label>
                <Input
                  id={`${idPrefix}fuehrerscheinDatum`}
                  type="date"
                  required
                  value={fahrer.fuehrerscheinDatum || ''}
                  onChange={(e) => onFahrerChange({ ...fahrer, fuehrerscheinDatum: e.target.value })}
                />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor={`${idPrefix}ausstellendeBehoerde`}>Ausstellende Behörde *</Label>
                <Input
                  id={`${idPrefix}ausstellendeBehoerde`}
                  required
                  placeholder={isCreate ? 'z.B. Stadt Bochum' : undefined}
                  value={fahrer.ausstellendeBehoerde || ''}
                  onChange={(e) => onFahrerChange({ ...fahrer, ausstellendeBehoerde: e.target.value })}
                />
              </div>
              <div className="md:col-span-2">
                <Label>Führerscheinklassen * (mindestens eine auswählen)</Label>
                <div className="grid grid-cols-4 md:grid-cols-8 gap-2 mt-2">
                  {FUEHRERSCHEINKLASSEN.map(klasse => (
                    <label key={klasse} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={fahrer.fuehrerscheinklassen?.includes(klasse) || false}
                        onChange={(e) => onKlassenChange(klasse, e.target.checked)}
                        className="rounded border-gray-300"
                      />
                      <span className="text-sm font-medium">{klasse}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Ausweis-Daten */}
          <div className="border-b pb-6">
            <h3 className="font-semibold text-lg mb-4 text-primary-blue">Personalausweis-Daten</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor={`${idPrefix}ausweisnummer`}>Ausweisnummer *</Label>
                <Input
                  id={`${idPrefix}ausweisnummer`}
                  required
                  placeholder={isCreate ? 'z.B. L123456789' : undefined}
                  value={fahrer.ausweisnummer || ''}
                  onChange={(e) => onFahrerChange({ ...fahrer, ausweisnummer: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor={`${idPrefix}ausweisAblauf`}>Ablaufdatum *</Label>
                <Input
                  id={`${idPrefix}ausweisAblauf`}
                  type="date"
                  required
                  value={fahrer.ausweisAblauf || ''}
                  onChange={(e) => onFahrerChange({ ...fahrer, ausweisAblauf: e.target.value })}
                />
              </div>
            </div>

            {/* Zeitmodell */}
            <div className="border-b pb-6 mt-6">
              <h3 className="font-semibold text-lg mb-4 text-primary-blue">Beschäftigungsart</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor={`${idPrefix}zeitmodell`}>Zeitmodell *</Label>
                  <Select
                    value={fahrer.zeitmodell || 'minijob'}
                    onValueChange={(value) => onFahrerChange({ ...fahrer, zeitmodell: value as 'minijob' | 'werkstudent' | 'teilzeit' | 'vollzeit' })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Zeitmodell wählen" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="minijob">Minijob</SelectItem>
                      <SelectItem value="werkstudent">Werkstudent</SelectItem>
                      <SelectItem value="teilzeit">Teilzeit</SelectItem>
                      <SelectItem value="vollzeit">Vollzeit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <p className="text-sm text-gray-600">
                    {fahrer.zeitmodell === 'minijob' && 'Abrechnung nach KM-Range-Tabelle'}
                    {fahrer.zeitmodell === 'werkstudent' && 'Stundenlohn: 12,82€ + Zeiterfassung'}
                    {fahrer.zeitmodell === 'teilzeit' && 'Stundenlohn: 12,82€ + Zeiterfassung'}
                    {fahrer.zeitmodell === 'vollzeit' && 'Gehalt nach Vereinbarung'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Zugangsdaten - nur für Create-Modus */}
          {isCreate && (
            <div className="border-b pb-6">
              <h3 className="font-semibold text-lg mb-4 text-primary-blue">Zugangsdaten für Fahrerportal</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="benutzername">Benutzername *</Label>
                  <Input
                    id="benutzername"
                    required
                    placeholder="z.B. max.mustermann"
                    value={fahrer.benutzername || ''}
                    onChange={(e) => onFahrerChange({ ...fahrer, benutzername: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="passwort">Passwort *</Label>
                  <div className="relative">
                    <Input
                      id="passwort"
                      type={showPassword ? "text" : "password"}
                      required
                      placeholder="Sicheres Passwort"
                      value={fahrer.passwort || ''}
                      onChange={(e) => onFahrerChange({ ...fahrer, passwort: e.target.value })}
                    />
                    <button
                      type="button"
                      onClick={onTogglePassword}
                      className="absolute right-3 top-3 text-gray-500"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Festes Gehalt - nur für Create-Modus und Vollzeit */}
          {isCreate && fahrer.zeitmodell === 'vollzeit' && (
            <div className="mt-4">
              <Label htmlFor="festesGehalt">Festes monatliches Gehalt (€) *</Label>
              <Input
                id="festesGehalt"
                type="number"
                step="0.01"
                min="0"
                placeholder="z.B. 1500"
                value={fahrer.festesGehalt || 0}
                onChange={(e) => onFahrerChange({ ...fahrer, festesGehalt: parseFloat(e.target.value) || 0 })}
              />
            </div>
          )}

          <div className="flex gap-4">
            <Button type="submit" className="bg-primary-blue hover:bg-blue-700">
              {isCreate ? (
                <>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Fahrer anlegen
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Änderungen speichern
                </>
              )}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel}>
              Abbrechen
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
