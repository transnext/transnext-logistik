import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Shield,
  Mail,
  Phone,
  MapPin,
  FileText,
  Eye,
  Lock,
  Database,
  UserCheck
} from "lucide-react"

export default function DatenschutzPage() {
  return (
    <div className="space-y-0">
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-blue-50 to-white py-16 md:py-24">
        <div className="container-wide">
          <div className="text-center space-y-6">
            <h1 className="hero-title text-primary-blue">
              Datenschutzerklärung
            </h1>
            <p className="section-subtitle max-w-2xl mx-auto">
              Transparente Informationen über die Verarbeitung Ihrer personenbezogenen Daten
              bei TransNext Logistik gemäß DSGVO
            </p>
          </div>
        </div>
      </section>

      {/* Privacy Policy Content */}
      <section className="py-16 md:py-20">
        <div className="container-wide">
          <div className="max-w-4xl mx-auto space-y-8">

            {/* Controller Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Shield className="h-5 w-5 text-primary-blue" />
                  <span>1. Verantwortlicher</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-muted-foreground">
                  <p className="mb-4">Verantwortlicher im Sinne der DSGVO:</p>
                  <div className="space-y-2">
                    <p className="font-medium">TransNext Logistik</p>
                    <p>Herner Str. 299A</p>
                    <p>44809 Bochum</p>
                    <p>Deutschland</p>
                    <p>Telefon: <a href="tel:+4915563509886" className="text-primary-blue hover:underline">+49 155 635 098 86</a></p>
                    <p>E-Mail: <a href="mailto:info@transnext.de" className="text-primary-blue hover:underline">info@transnext.de</a></p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Data Protection Officer */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <UserCheck className="h-5 w-5 text-primary-blue" />
                  <span>2. Datenschutzbeauftragter</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-muted-foreground">
                  <p className="mb-4">
                    Bei Fragen zum Datenschutz wenden Sie sich bitte direkt an:
                  </p>
                  <div className="space-y-2">
                    <p>E-Mail: <a href="mailto:info@transnext.de" className="text-primary-blue hover:underline">info@transnext.de</a></p>
                    <p>Telefon: <a href="tel:+4915563509886" className="text-primary-blue hover:underline">+49 155 635 098 86</a></p>
                  </div>
                  <p className="mt-4 text-sm">
                    <em>Wir nehmen den Schutz Ihrer persönlichen Daten sehr ernst und behandeln Ihre Anfragen vertraulich.</em>
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Data Collection Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Database className="h-5 w-5 text-primary-blue" />
                  <span>3. Erhebung und Speicherung personenbezogener Daten</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="text-muted-foreground space-y-4">
                  <h3 className="font-semibold text-foreground">3.1 Beim Besuch unserer Website</h3>
                  <p>
                    Bei jedem Aufruf unserer Website erfassen wir automatisch Informationen,
                    die Ihr Browser übermittelt. Dies sind:
                  </p>
                  <ul className="list-disc pl-6 space-y-1">
                    <li>IP-Adresse des anfordernden Rechners</li>
                    <li>Datum und Uhrzeit des Zugriffs</li>
                    <li>Name und URL der abgerufenen Datei</li>
                    <li>Website, von der aus der Zugriff erfolgt (Referrer-URL)</li>
                    <li>Verwendeter Browser und ggf. das Betriebssystem</li>
                    <li>Name Ihres Access-Providers</li>
                  </ul>
                  <p>
                    Die Verarbeitung erfolgt auf Grundlage des Art. 6 Abs. 1 lit. f DSGVO aus unserem
                    berechtigten Interesse an der Verbesserung der Stabilität und Funktionalität unserer Website.
                  </p>

                  <h3 className="font-semibold text-foreground">3.2 Bei Nutzung unserer Services</h3>
                  <p>
                    Für die Erbringung unserer Dienstleistungen (Fahrzeugüberführung,
                    Aufbereitung, Zulassungsservice) erheben wir folgende Daten:
                  </p>
                  <ul className="list-disc pl-6 space-y-1">
                    <li>Name, Vorname, Anschrift</li>
                    <li>Telefonnummer, E-Mail-Adresse</li>
                    <li>Fahrzeugdaten (Marke, Modell, Kennzeichen, etc.)</li>
                    <li>Standort- und Zielinformationen</li>
                    <li>Zahlungsinformationen</li>
                    <li>Weitere auftragsbezogene Daten</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Legal Basis */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="h-5 w-5 text-primary-blue" />
                  <span>4. Rechtsgrundlage der Verarbeitung</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-muted-foreground space-y-4">
                  <p>
                    Die Verarbeitung Ihrer personenbezogenen Daten erfolgt auf folgenden Rechtsgrundlagen:
                  </p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>
                      <strong>Art. 6 Abs. 1 lit. b DSGVO:</strong> Verarbeitung zur Erfüllung eines Vertrags
                      oder zur Durchführung vorvertraglicher Maßnahmen
                    </li>
                    <li>
                      <strong>Art. 6 Abs. 1 lit. a DSGVO:</strong> Verarbeitung aufgrund Ihrer Einwilligung
                    </li>
                    <li>
                      <strong>Art. 6 Abs. 1 lit. f DSGVO:</strong> Verarbeitung zur Wahrung unserer
                      berechtigten Interessen (z.B. Websiteanalyse, Direktwerbung)
                    </li>
                    <li>
                      <strong>Art. 6 Abs. 1 lit. c DSGVO:</strong> Verarbeitung zur Erfüllung rechtlicher
                      Verpflichtungen (z.B. Aufbewahrungspflichten)
                    </li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Data Sharing */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Eye className="h-5 w-5 text-primary-blue" />
                  <span>5. Weitergabe von Daten</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-muted-foreground space-y-4">
                  <h3 className="font-semibold text-foreground">5.1 Auftragsverarbeiter</h3>
                  <p>
                    Wir geben Ihre personenbezogenen Daten an Dritte nur weiter, wenn:
                  </p>
                  <ul className="list-disc pl-6 space-y-1">
                    <li>Sie ausdrücklich eingewilligt haben (Art. 6 Abs. 1 lit. a DSGVO)</li>
                    <li>Dies zur Erfüllung unserer Vertragspflichten erforderlich ist</li>
                    <li>Eine gesetzliche Verpflichtung besteht (Art. 6 Abs. 1 lit. c DSGVO)</li>
                  </ul>

                  <h3 className="font-semibold text-foreground">5.2 Typische Empfänger</h3>
                  <ul className="list-disc pl-6 space-y-1">
                    <li>Zulassungsstellen (für Zulassungsservices)</li>
                    <li>Versicherungsunternehmen (bei Schäden)</li>
                    <li>IT-Dienstleister (Hosting, E-Mail-Service)</li>
                    <li>Zahlungsdienstleister</li>
                    <li>Nachhaltigkeitspartner (für Baumpflanzungen)</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Data Retention */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Lock className="h-5 w-5 text-primary-blue" />
                  <span>6. Speicherdauer</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-muted-foreground space-y-4">
                  <p>
                    Wir speichern Ihre personenbezogenen Daten nur so lange, wie es für die
                    jeweiligen Zwecke erforderlich ist oder gesetzliche Aufbewahrungsfristen bestehen:
                  </p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>
                      <strong>Vertragsdaten:</strong> 10 Jahre nach Vertragsende (HGB/AO)
                    </li>
                    <li>
                      <strong>Rechnungsdaten:</strong> 10 Jahre (AO)
                    </li>
                    <li>
                      <strong>Website-Logfiles:</strong> 7 Tage
                    </li>
                    <li>
                      <strong>Marketing-Einwilligungen:</strong> Bis zum Widerruf
                    </li>
                    <li>
                      <strong>Bewerberdaten:</strong> 6 Monate nach Abschluss des Bewerbungsverfahrens
                    </li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Rights */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <UserCheck className="h-5 w-5 text-primary-blue" />
                  <span>7. Ihre Rechte</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-muted-foreground space-y-4">
                  <p>Sie haben folgende Rechte bezüglich Ihrer personenbezogenen Daten:</p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li><strong>Recht auf Auskunft</strong> (Art. 15 DSGVO)</li>
                    <li><strong>Recht auf Berichtigung</strong> (Art. 16 DSGVO)</li>
                    <li><strong>Recht auf Löschung</strong> (Art. 17 DSGVO)</li>
                    <li><strong>Recht auf Einschränkung der Verarbeitung</strong> (Art. 18 DSGVO)</li>
                    <li><strong>Recht auf Datenübertragbarkeit</strong> (Art. 20 DSGVO)</li>
                    <li><strong>Recht auf Widerspruch</strong> (Art. 21 DSGVO)</li>
                    <li><strong>Recht auf Widerruf der Einwilligung</strong> (Art. 7 Abs. 3 DSGVO)</li>
                  </ul>
                  <p>
                    Zur Ausübung Ihrer Rechte wenden Sie sich bitte an die oben genannten Kontaktdaten.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Cookies */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Database className="h-5 w-5 text-primary-blue" />
                  <span>8. Cookies und Tracking</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-muted-foreground space-y-4">
                  <h3 className="font-semibold text-foreground">8.1 Essenzielle Cookies</h3>
                  <p>
                    Wir verwenden technisch notwendige Cookies, um die Funktionalität unserer
                    Website zu gewährleisten. Diese werden ohne Ihre Einwilligung gesetzt.
                  </p>

                  <h3 className="font-semibold text-foreground">8.2 Analyse-Cookies</h3>
                  <p>
                    Mit Ihrer Einwilligung verwenden wir Analyse-Tools zur Verbesserung unserer Website.
                    Sie können Ihre Einstellungen jederzeit in unserem Cookie-Banner anpassen.
                  </p>

                  <h3 className="font-semibold text-foreground">8.3 Marketing-Cookies</h3>
                  <p>
                    Marketing-Cookies werden nur mit Ihrer ausdrücklichen Einwilligung gesetzt und
                    können jederzeit deaktiviert werden.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Third Party Services */}
            <Card>
              <CardHeader>
                <CardTitle>9. Drittlandtransfer</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-muted-foreground space-y-4">
                  <p>
                    Sollten wir Dienstleister außerhalb des EU/EWR-Raums einsetzen, informieren wir Sie
                    gesondert über die getroffenen Schutzmaßnahmen (z.B. Angemessenheitsbeschluss,
                    Standardvertragsklauseln).
                  </p>
                  <p>
                    Derzeit arbeiten wir ausschließlich mit Dienstleistern innerhalb der EU/EWR oder
                    solchen mit angemessenem Datenschutzniveau.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Complaints */}
            <Card>
              <CardHeader>
                <CardTitle>10. Beschwerderecht</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-muted-foreground space-y-4">
                  <p>
                    Sie haben das Recht, sich bei einer Datenschutz-Aufsichtsbehörde über die
                    Verarbeitung Ihrer personenbezogenen Daten durch uns zu beschweren.
                  </p>
                  <p>
                    Zuständige Aufsichtsbehörde für unser Unternehmen:
                  </p>
                  <div className="pl-4">
                    <p>Landesbeauftragte für Datenschutz und Informationsfreiheit Nordrhein-Westfalen</p>
                    <p>Kavalleriestraße 2-4</p>
                    <p>40213 Düsseldorf</p>
                    <p>Telefon: 0211/38424-0</p>
                    <p>E-Mail: poststelle@ldi.nrw.de</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Updates */}
            <Card>
              <CardHeader>
                <CardTitle>11. Änderungen dieser Datenschutzerklärung</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-muted-foreground">
                  <p>
                    Wir behalten uns vor, diese Datenschutzerklärung bei Bedarf zu aktualisieren,
                    um sie an geänderte Rechtslage oder bei Änderungen unserer Leistungen anzupassen.
                    Für Ihren erneuten Besuch gilt dann die neue Datenschutzerklärung.
                  </p>
                  <p className="mt-4">
                    <strong>Stand dieser Datenschutzerklärung:</strong> TODO: Aktuelles Datum einfügen
                  </p>
                </div>
              </CardContent>
            </Card>

          </div>
        </div>
      </section>
    </div>
  )
}
