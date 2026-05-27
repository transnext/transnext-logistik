import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Building,
  Mail,
  FileText
} from "lucide-react"

export default function ImpressumPage() {
  return (
    <div className="space-y-0">
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-blue-50 to-white py-16 md:py-24">
        <div className="container-wide">
          <div className="text-center space-y-6">
            <h1 className="hero-title text-primary-blue">
              Impressum
            </h1>
            <p className="section-subtitle max-w-2xl mx-auto">
              Rechtliche Informationen zu TransNext Logistik gemäß § 5 TMG
            </p>
          </div>
        </div>
      </section>

      {/* Legal Information */}
      <section className="py-16 md:py-20">
        <div className="container-wide">
          <div className="max-w-4xl mx-auto space-y-8">

            {/* Company Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Building className="h-5 w-5 text-primary-blue" />
                  <span>Angaben gemäß § 5 TMG</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-semibold mb-2">Firmenname</h3>
                    <p className="text-muted-foreground">
                      TransNext Logistik<br />
                      Nicholas Mandzel & Burak Aydin GbR
                    </p>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">Geschäftsführung</h3>
                    <p className="text-muted-foreground">
                      Nicholas Mandzel und Burak Aydin
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Contact Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Mail className="h-5 w-5 text-primary-blue" />
                  <span>Kontakt</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-semibold mb-2">Adresse</h3>
                    <div className="text-muted-foreground">
                      <p>Herner Str. 299A</p>
                      <p>44809 Bochum</p>
                      <p>Deutschland</p>
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">Kontaktdaten</h3>
                    <div className="text-muted-foreground space-y-1">
                      <p>Telefon: <a href="tel:+4915563509886" className="text-primary-blue hover:underline">+49 155 635 098 86</a></p>
                      <p>E-Mail: <a href="mailto:info@transnext.de" className="text-primary-blue hover:underline">info@transnext.de</a></p>
                      <p>Internet: www.transnext.de</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Registry Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="h-5 w-5 text-primary-blue" />
                  <span>Umsatzsteuer-Identifikationsnummer</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-muted-foreground">
                  <p>Umsatzsteuer-Identifikationsnummer gemäß § 27 a Umsatzsteuergesetz:</p>
                  <p className="font-semibold text-foreground mt-2">DE368722694</p>
                  <p className="mt-4 text-sm">
                    Hinweis: Als Gesellschaft bürgerlichen Rechts (GbR) besteht keine Pflicht zur Eintragung im Handelsregister.
                  </p>
                </div>
              </CardContent>
            </Card>



            {/* EU Dispute Resolution */}
            <Card>
              <CardHeader>
                <CardTitle>EU-Streitschlichtung</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-muted-foreground">
                  <p className="mb-4">
                    Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit:
                  </p>
                  <p className="text-primary-blue">
                    <a href="https://ec.europa.eu/consumers/odr/" target="_blank" rel="noopener noreferrer" className="hover:underline">
                      https://ec.europa.eu/consumers/odr/
                    </a>
                  </p>
                  <p className="mt-4">
                    Unsere E-Mail-Adresse finden Sie oben im Impressum.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Consumer Dispute Resolution */}
            <Card>
              <CardHeader>
                <CardTitle>Verbraucherstreitbeilegung/Universalschlichtungsstelle</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-muted-foreground">
                  <p>
                    Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer
                    Verbraucherschlichtungsstelle teilzunehmen.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Disclaimer */}
            <Card>
              <CardHeader>
                <CardTitle>Haftung für Inhalte</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-muted-foreground space-y-4">
                  <p>
                    Als Diensteanbieter sind wir gemäß § 7 Abs.1 TMG für eigene Inhalte auf diesen Seiten
                    nach den allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 TMG sind wir als
                    Diensteanbieter jedoch nicht unter der Verpflichtung, übermittelte oder gespeicherte
                    fremde Informationen zu überwachen oder nach Umständen zu forschen, die auf eine
                    rechtswidrige Tätigkeit hinweisen.
                  </p>
                  <p>
                    Verpflichtungen zur Entfernung oder Sperrung der Nutzung von Informationen nach den
                    allgemeinen Gesetzen bleiben hiervon unberührt. Eine diesbezügliche Haftung ist jedoch
                    erst ab dem Zeitpunkt der Kenntnis einer konkreten Rechtsverletzung möglich. Bei
                    Bekanntwerden von entsprechenden Rechtsverletzungen werden wir diese Inhalte umgehend entfernen.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Copyright */}
            <Card>
              <CardHeader>
                <CardTitle>Urheberrecht</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-muted-foreground space-y-4">
                  <p>
                    Die durch die Seitenbetreiber erstellten Inhalte und Werke auf diesen Seiten unterliegen
                    dem deutschen Urheberrecht. Die Vervielfältigung, Bearbeitung, Verbreitung und jede Art
                    der Verwertung außerhalb der Grenzen des Urheberrechtes bedürfen der schriftlichen
                    Zustimmung des jeweiligen Autors bzw. Erstellers.
                  </p>
                  <p>
                    Downloads und Kopien dieser Seite sind nur für den privaten, nicht kommerziellen Gebrauch gestattet.
                    Soweit die Inhalte auf dieser Seite nicht vom Betreiber erstellt wurden, werden die Urheberrechte
                    Dritter beachtet. Insbesondere werden Inhalte Dritter als solche gekennzeichnet. Sollten Sie
                    trotzdem auf eine Urheberrechtsverletzung aufmerksam werden, bitten wir um einen entsprechenden Hinweis.
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
