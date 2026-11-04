import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Truck,
  Car,
  Shield,
  Clock,
  ArrowRight,
  CheckCircle,
  MapPin,
  Euro,
  FileText,
  Phone
} from "lucide-react"

export default function FahrzeugueberführungPage() {
  return (
    <div className="space-y-0">
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-blue-50 to-white py-16 md:py-24">
        <div className="container-wide">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 lg:gap-6">
            {/* Text Content */}
            <div className="lg:col-span-3 space-y-6 z-10">
              <div className="space-y-4">
                <h1 className="hero-title text-primary-blue">
                  Fahrzeugüberführung auf Eigen- oder Fremdachse
                </h1>
                <p className="section-subtitle">
                  Wir organisieren sichere, planbare Fahrzeugüberführungen – vom
                  Einzeltransport bis zur Flottenbewegung, europaweit.
                </p>
              </div>

              {/* Trust Bullets */}
              <div className="flex flex-wrap gap-4">
                <Badge variant="secondary" className="text-sm px-3 py-1">
                  🚚 Eigen- & Fremdachse
                </Badge>
                <Badge variant="secondary" className="text-sm px-3 py-1">
                  🌍 Europaweit
                </Badge>
                <Badge variant="secondary" className="text-sm px-3 py-1">
                  📋 Vollversichert
                </Badge>
              </div>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/kontakt">
                  <Button size="lg" className="bg-primary-blue hover-primary-darken">
                    Jetzt Angebot erhalten
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/kontakt">
                  <Button size="lg" variant="outline" className="border-primary-blue text-primary-blue">
                    Beratung anfordern
                  </Button>
                </Link>
              </div>
            </div>

            {/* Hero Image */}
            <div className="lg:col-span-2">
              <div className="relative w-full h-full min-h-[300px] lg:min-h-[400px] rounded-2xl overflow-hidden shadow-2xl">
                <Image
                  src="/images/fahrzeugueberfuehrung.png"
                  alt="TransNext Logistik Fahrzeugüberführung - Professionell und sicher"
                  fill
                  className="object-cover"
                  priority
                  sizes="(max-width: 768px) 100vw, 40vw"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services Detail */}
      <section className="py-16 md:py-20">
        <div className="container-wide">
          <div className="text-center space-y-4 mb-12">
            <h2 className="section-title text-primary-blue">Unsere Überführungsleistungen</h2>
            <p className="section-subtitle">
              Individuell angepasst an Ihre Anforderungen
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-primary-blue/10 rounded-lg">
                    <Car className="h-6 w-6 text-primary-blue" />
                  </div>
                  <CardTitle className="text-xl">Überführung auf Eigenachse</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <CardDescription className="text-base">
                  Fahrbereite Fahrzeuge werden von unseren erfahrenen Fahrern sicher überführt.
                </CardDescription>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span>Abgestimmte, optimale Routen</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span>Zuverlässige Übergaben</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span>Vollständige Dokumentation</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span>GPS-Tracking verfügbar</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-primary-blue/10 rounded-lg">
                    <Truck className="h-6 w-6 text-primary-blue" />
                  </div>
                  <CardTitle className="text-xl">Transport auf Fremdachse</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <CardDescription className="text-base">
                  Professioneller Transport für nicht fahrbereite oder besonders wertvolle Fahrzeuge.
                </CardDescription>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span>Offene und geschlossene Transporter</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span>Spezial-Equipment für Oldtimer</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span>Sichere Beladung und Fixierung</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span>Klimatisierte Transporter</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* Coverage Area */}
          <div className="bg-slate-50 rounded-lg p-8">
            <div className="text-center space-y-4 mb-8">
              <h3 className="text-2xl font-bold text-primary-blue">Unsere Reichweite</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center space-y-4">
                <div className="p-4 bg-white rounded-full w-16 h-16 mx-auto flex items-center justify-center">
                  <MapPin className="h-8 w-8 text-primary-blue" />
                </div>
                <h4 className="font-semibold text-lg">Regional Ruhrgebiet</h4>
                <p className="text-muted-foreground">Schnelle Überführungen innerhalb des Ruhrgebiets und NRW</p>
              </div>

              <div className="text-center space-y-4">
                <div className="p-4 bg-white rounded-full w-16 h-16 mx-auto flex items-center justify-center">
                  <MapPin className="h-8 w-8 text-primary-blue" />
                </div>
                <h4 className="font-semibold text-lg">Deutschlandweit</h4>
                <p className="text-muted-foreground">Zuverlässige Überführungen in alle deutschen Bundesländer</p>
              </div>

              <div className="text-center space-y-4">
                <div className="p-4 bg-white rounded-full w-16 h-16 mx-auto flex items-center justify-center">
                  <MapPin className="h-8 w-8 text-primary-blue" />
                </div>
                <h4 className="font-semibold text-lg">Europaweit</h4>
                <p className="text-muted-foreground">Internationale Überführungen in ganz Europa</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Optional Services */}
      <section className="py-16 md:py-20 bg-slate-50">
        <div className="container-wide">
          <div className="text-center space-y-4 mb-12">
            <h2 className="section-title text-primary-blue">Optional buchbare Leistungen</h2>
            <p className="section-subtitle">
              Komplettservice aus einer Hand
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="text-center">
              <CardContent className="pt-6">
                <FileText className="h-12 w-12 text-primary-blue mx-auto mb-4" />
                <h3 className="font-semibold text-lg mb-2">Fahrzeugaufbereitung</h3>
                <p className="text-muted-foreground mb-4">
                  Professionelle Reinigung innen und außen vor der Übergabe
                </p>
                <Link href="/fahrzeugaufbereitung">
                  <Button variant="ghost" className="text-primary-blue">Mehr erfahren</Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardContent className="pt-6">
                <Shield className="h-12 w-12 text-primary-blue mx-auto mb-4" />
                <h3 className="font-semibold text-lg mb-2">An- und Abmeldung</h3>
                <p className="text-muted-foreground mb-4">
                  Zulassungsservice – wir übernehmen den Behördengang
                </p>
                <Link href="/an-und-abmeldung">
                  <Button variant="ghost" className="text-primary-blue">Mehr erfahren</Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardContent className="pt-6">
                <FileText className="h-12 w-12 text-primary-blue mx-auto mb-4" />
                <h3 className="font-semibold text-lg mb-2">Dokumentenlogistik</h3>
                <p className="text-muted-foreground mb-4">
                  Sichere Übermittlung aller fahrzeugbezogenen Dokumente
                </p>
                <Link href="/kontakt">
                  <Button variant="ghost" className="text-primary-blue">Details anfragen</Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Process Steps */}
      <section className="py-16 md:py-20">
        <div className="container-wide">
          <div className="text-center space-y-4 mb-12">
            <h2 className="section-title text-primary-blue">So läuft Ihre Fahrzeugüberführung ab</h2>
            <p className="section-subtitle">Transparent und planbar in fünf Schritten</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
            {[
              {
                step: "1",
                title: "Anfrage & Beratung",
                description: "Kostenlose Beratung und unverbindliches Angebot"
              },
              {
                step: "2",
                title: "Vorbereitung",
                description: "Absprache der Details, Termine und Dokumente"
              },
              {
                step: "3",
                title: "Abholung",
                description: "Professionelle Übernahme Ihres Fahrzeugs vor Ort"
              },
              {
                step: "4",
                title: "Transport",
                description: "Sichere Überführung mit GPS-Tracking"
              },
              {
                step: "5",
                title: "Übergabe",
                description: "Termingerechte Anlieferung und Dokumentation"
              }
            ].map((item, index) => (
              <div key={index} className="text-center space-y-4">
                <div className="relative">
                  <div className="w-16 h-16 bg-primary-blue text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto">
                    {item.step}
                  </div>
                  {index < 4 && (
                    <div className="hidden md:block absolute top-8 left-full w-full h-px bg-border"></div>
                  )}
                </div>
                <h3 className="font-semibold text-lg">{item.title}</h3>
                <p className="text-muted-foreground text-sm">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 md:py-20 bg-slate-50">
        <div className="container-wide">
          <div className="text-center space-y-4 mb-12">
            <h2 className="section-title text-primary-blue">Häufige Fragen zur Fahrzeugüberführung</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold text-lg mb-2">Welche Dokumente benötige ich?</h3>
                <p className="text-muted-foreground">
                  In der Regel benötigen wir Fahrzeugschein, Fahrzeugbrief (falls vorhanden),
                  einen gültigen Ausweis und ggf. eine Vollmacht bei Fremdüberführung.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-lg mb-2">Wie kurzfristig sind Termine möglich?</h3>
                <p className="text-muted-foreground">
                  Je nach Auslastung können wir oft schon innerhalb von 24-48 Stunden starten.
                  Für Eilaufträge sprechen Sie uns direkt an.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-lg mb-2">Ist mein Fahrzeug versichert?</h3>
                <p className="text-muted-foreground">
                  Ja, alle unsere Überführungen sind vollumfänglich versichert.
                  Details zur Versicherung erhalten Sie mit Ihrem Angebot.
                </p>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="font-semibold text-lg mb-2">Was kostet eine Überführung?</h3>
                <p className="text-muted-foreground">
                  Die Kosten hängen von Entfernung, Fahrzeugtyp und Transportart ab.
                  Gerne erstellen wir Ihnen ein kostenloses, unverbindliches Angebot.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-lg mb-2">Kann ich den Transport verfolgen?</h3>
                <p className="text-muted-foreground">
                  Auf Wunsch bieten wir GPS-Tracking für Ihre Überführung an.
                  Sie erhalten regelmäßige Updates zum Status.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-lg mb-2">Übernehmen Sie auch Motorräder?</h3>
                <p className="text-muted-foreground">
                  Ja, wir überführen auch Motorräder, Wohnmobile und andere Fahrzeugtypen.
                  Sprechen Sie uns für spezielle Anforderungen an.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-20 bg-primary-blue text-white">
        <div className="container-wide text-center space-y-6">
          <h2 className="section-title">Bereit für Ihre Fahrzeugüberführung?</h2>
          <p className="section-subtitle text-blue-100">
            Erhalten Sie jetzt Ihr kostenloses, unverbindliches Angebot
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="tel:+4915257068633">
              <Button size="lg" className="bg-white text-primary-blue hover:bg-gray-100">
                <Phone className="mr-2 h-4 w-4" />
                Jetzt anrufen
              </Button>
            </a>
            <Link href="/kontakt">
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-primary-blue">
                Online-Anfrage stellen
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
