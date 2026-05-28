/**
 * E-Mail-Vorlagen für Onboarding-Kommunikation
 *
 * Variablen:
 * - {{vorname}} - Vorname des Kandidaten
 * - {{nachname}} - Nachname des Kandidaten
 * - {{termin_1}} - Termin-Slot 1 (Datum + Uhrzeit)
 * - {{termin_2}} - Termin-Slot 2 (Datum + Uhrzeit)
 * - {{termin_3}} - Termin-Slot 3 (Datum + Uhrzeit)
 * - {{teams_link}} - Teams-Link für Videocall
 * - {{ansprechpartner}} - Name des HR-Ansprechpartners
 * - {{firma}} - Firmenname (TransNext Logistik)
 * - {{portal_link}} - Link zum Fahrer-Portal (zukünftig)
 * - {{bewerber_link}} - Öffentlicher Bewerberlink für Terminwahl (Phase 3a)
 */

export type EmailTemplateType =
  | 'erstkontakt'
  | 'terminangebot'
  | 'teams_link'
  | 'personalfragebogen'
  | 'infomaterial'
  | 'fehlende_dokumente'
  | 'vertrag'
  | 'absage'
  | 'willkommen'

export interface EmailTemplate {
  id: EmailTemplateType
  name: string
  subject: string
  body: string
  suggestedStatus?: string // Vorgeschlagener Status nach Versand
}

export const EMAIL_TEMPLATES: Record<EmailTemplateType, EmailTemplate> = {
  erstkontakt: {
    id: 'erstkontakt',
    name: 'Erstkontakt / Einladung zum Gespräch',
    subject: 'Ihre Bewerbung bei TransNext Logistik',
    body: `Guten Tag {{vorname}} {{nachname}},

vielen Dank für Ihr Interesse an einer Zusammenarbeit mit TransNext Logistik.

Wir haben Ihre Bewerbung erhalten und würden Sie gerne in einem kurzen Gespräch persönlich kennenlernen.

Bitte teilen Sie uns mit, wann Sie Zeit für ein ca. 20-minütiges Telefonat oder Videogespräch haben.

Bei Fragen können Sie sich jederzeit an uns wenden.

Mit freundlichen Grüßen
{{ansprechpartner}}
TransNext Logistik GmbH`,
    suggestedStatus: 'kontakt_aufgenommen'
  },

  terminangebot: {
    id: 'terminangebot',
    name: 'Terminangebot (3 Slots)',
    subject: 'Terminvorschläge für Ihr Gespräch - TransNext Logistik',
    body: `Guten Tag {{vorname}} {{nachname}},

vielen Dank für Ihr Interesse an einer Zusammenarbeit mit uns.

Gerne möchten wir Sie in einem kurzen Gespräch kennenlernen. Bitte wählen Sie einen der folgenden Termine:

• {{termin_1}}
• {{termin_2}}
• {{termin_3}}


Klicken Sie einfach auf folgenden Link, um Ihren Wunschtermin auszuwählen:
{{bewerber_link}}


Das Gespräch dauert ca. 20 Minuten und findet per Microsoft Teams statt. Den Link erhalten Sie nach Ihrer Terminbestätigung.

Bei Fragen erreichen Sie uns jederzeit.

Mit freundlichen Grüßen
{{ansprechpartner}}
TransNext Logistik GmbH`,
    suggestedStatus: 'termin_angeboten'
  },

  teams_link: {
    id: 'teams_link',
    name: 'Teams-Link senden',
    subject: 'Ihr Gesprächstermin - TransNext Logistik',
    body: `Guten Tag {{vorname}} {{nachname}},

Ihr Gesprächstermin steht fest. Hier sind die Details:

📅 Termin: {{termin_1}}
💻 Microsoft Teams

Bitte klicken Sie zum vereinbarten Zeitpunkt auf folgenden Link:
{{teams_link}}

Falls Sie den Termin nicht wahrnehmen können, geben Sie uns bitte rechtzeitig Bescheid.

Wir freuen uns auf das Gespräch!

Mit freundlichen Grüßen
{{ansprechpartner}}
TransNext Logistik GmbH`,
    suggestedStatus: 'termin_geplant'
  },

  personalfragebogen: {
    id: 'personalfragebogen',
    name: 'Personalfragebogen-Link senden',
    subject: 'Bitte Personalfragebogen ausfüllen - TransNext Logistik',
    body: `Guten Tag {{vorname}} {{nachname}},

vielen Dank für das gute Gespräch!

Für die weitere Bearbeitung benötigen wir noch einige Angaben von Ihnen.

Bitte öffnen Sie folgenden Link und füllen Sie den digitalen Personalfragebogen vollständig aus:

{{bewerber_link}}

Was Sie dort erledigen können:
• Ihren Gesprächstermin bestätigen (falls noch nicht erledigt)
• Den Personalfragebogen mit Ihren persönlichen Daten ausfüllen
• Alle Angaben prüfen und absenden

Bitte füllen Sie den Fragebogen zeitnah aus, damit wir Ihre Bewerbung weiter bearbeiten können.

Bei Fragen stehen wir Ihnen gerne zur Verfügung.

Mit freundlichen Grüßen
{{ansprechpartner}}
TransNext Logistik GmbH`,
    suggestedStatus: 'personalfragebogen_gesendet'
  },

  infomaterial: {
    id: 'infomaterial',
    name: 'Infomaterial senden',
    subject: 'Informationen zum Start bei TransNext Logistik',
    body: `Guten Tag {{vorname}} {{nachname}},

anbei erhalten Sie wichtige Informationen für Ihren Start bei TransNext Logistik:

📄 Infoblatt für neue Fahrer
📄 Übersicht unserer Kunden und Einsatzgebiete
📄 Hinweise zur Fahrzeugübernahme

Bitte lesen Sie die Unterlagen aufmerksam durch. Bei Fragen können Sie sich jederzeit an uns wenden.

Als nächsten Schritt bitten wir Sie, den Online-Quiz zu absolvieren (Link folgt separat).

Mit freundlichen Grüßen
{{ansprechpartner}}
TransNext Logistik GmbH`,
    suggestedStatus: 'infomaterial_gesendet'
  },

  fehlende_dokumente: {
    id: 'fehlende_dokumente',
    name: 'Fehlende Dokumente nachfordern',
    subject: 'Noch fehlende Unterlagen - TransNext Logistik',
    body: `Guten Tag {{vorname}} {{nachname}},

vielen Dank für die bereits eingereichten Unterlagen.

Leider fehlen uns noch folgende Dokumente:

• [BITTE DOKUMENTE HIER EINFÜGEN]

Bitte reichen Sie diese schnellstmöglich nach, damit wir den Onboarding-Prozess abschließen können.

Sie können die Dokumente als Scan oder gut lesbares Foto per E-Mail senden.

Bei Fragen stehen wir Ihnen gerne zur Verfügung.

Mit freundlichen Grüßen
{{ansprechpartner}}
TransNext Logistik GmbH`,
    suggestedStatus: 'dokumente_angefordert'
  },

  vertrag: {
    id: 'vertrag',
    name: 'Vertrag senden',
    subject: 'Ihr Vertrag - TransNext Logistik',
    body: `Guten Tag {{vorname}} {{nachname}},

wir freuen uns, Ihnen Ihren Vertrag zusenden zu können!

📄 Im Anhang finden Sie Ihren Vertrag in zweifacher Ausführung.

Bitte unterschreiben Sie beide Exemplare und senden Sie ein unterschriebenes Exemplar an uns zurück:

Per Post:
TransNext Logistik GmbH
[ADRESSE]

Oder als Scan per E-Mail an diese Adresse.

Nach Eingang Ihres unterschriebenen Vertrags erhalten Sie weitere Informationen zum Start.

Mit freundlichen Grüßen
{{ansprechpartner}}
TransNext Logistik GmbH`,
    suggestedStatus: 'vertrag_gesendet'
  },

  absage: {
    id: 'absage',
    name: 'Absage',
    subject: 'Ihre Bewerbung bei TransNext Logistik',
    body: `Guten Tag {{vorname}} {{nachname}},

vielen Dank für Ihr Interesse an einer Zusammenarbeit mit TransNext Logistik.

Nach sorgfältiger Prüfung müssen wir Ihnen leider mitteilen, dass wir Ihre Bewerbung nicht weiter berücksichtigen können.

Wir wünschen Ihnen für Ihre berufliche Zukunft alles Gute.

Mit freundlichen Grüßen
{{ansprechpartner}}
TransNext Logistik GmbH`,
    suggestedStatus: 'abgelehnt'
  },

  willkommen: {
    id: 'willkommen',
    name: 'Willkommen / Nächster Schritt',
    subject: 'Willkommen bei TransNext Logistik!',
    body: `Guten Tag {{vorname}} {{nachname}},

herzlich willkommen bei TransNext Logistik! 🎉

Wir freuen uns, Sie in unserem Team begrüßen zu dürfen.

Ihre nächsten Schritte:

1. Sie erhalten in Kürze Ihre Zugangsdaten für unser Fahrerportal
2. Bitte melden Sie sich dort an und vervollständigen Sie Ihr Profil
3. Tragen Sie Ihre Verfügbarkeiten ein

Bei Fragen stehen wir Ihnen jederzeit zur Verfügung.

Wir freuen uns auf die Zusammenarbeit!

Mit freundlichen Grüßen
{{ansprechpartner}}
TransNext Logistik GmbH`,
    suggestedStatus: 'freigegeben'
  }
}

// ============================================================
// TEMPLATE PROCESSING
// ============================================================

export interface TemplateVariables {
  vorname: string
  nachname: string
  termin_1?: string
  termin_2?: string
  termin_3?: string
  teams_link?: string
  ansprechpartner: string
  firma?: string
  portal_link?: string
  bewerber_link?: string
}

/**
 * Ersetzt Variablen in einem Template-Text
 */
export function processTemplate(template: string, variables: TemplateVariables): string {
  let result = template

  result = result.replace(/\{\{vorname\}\}/g, variables.vorname || '')
  result = result.replace(/\{\{nachname\}\}/g, variables.nachname || '')
  result = result.replace(/\{\{termin_1\}\}/g, variables.termin_1 || '[Termin 1]')
  result = result.replace(/\{\{termin_2\}\}/g, variables.termin_2 || '[Termin 2]')
  result = result.replace(/\{\{termin_3\}\}/g, variables.termin_3 || '[Termin 3]')
  result = result.replace(/\{\{teams_link\}\}/g, variables.teams_link || '[Teams-Link]')
  result = result.replace(/\{\{ansprechpartner\}\}/g, variables.ansprechpartner || 'Ihr TransNext Team')
  result = result.replace(/\{\{firma\}\}/g, variables.firma || 'TransNext Logistik GmbH')
  result = result.replace(/\{\{portal_link\}\}/g, variables.portal_link || '[Portal-Link]')
  result = result.replace(/\{\{bewerber_link\}\}/g, variables.bewerber_link || '[Bewerber-Link wird nach Speichern generiert]')

  return result
}

/**
 * Formatiert einen Termin für Anzeige in E-Mails
 */
export function formatTerminSlot(date: Date | string | null): string {
  if (!date) return '[Kein Termin]'

  const d = typeof date === 'string' ? new Date(date) : date

  return d.toLocaleDateString('de-DE', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }) + ' Uhr'
}

/**
 * Generiert eine E-Mail aus Template und Kandidatendaten
 */
export function generateEmail(
  templateType: EmailTemplateType,
  variables: TemplateVariables
): { subject: string; body: string; suggestedStatus?: string } {
  const template = EMAIL_TEMPLATES[templateType]

  return {
    subject: processTemplate(template.subject, variables),
    body: processTemplate(template.body, variables),
    suggestedStatus: template.suggestedStatus
  }
}

/**
 * Liste aller verfügbaren Templates für Dropdown
 */
export function getTemplateList(): { id: EmailTemplateType; name: string }[] {
  return Object.values(EMAIL_TEMPLATES).map(t => ({
    id: t.id,
    name: t.name
  }))
}
