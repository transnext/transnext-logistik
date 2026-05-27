import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Users,
  MapPin,
  TreePine,
  Shield,
  Award,
  Heart,
  Truck,
  Star
} from "lucide-react"

export default function UeberUnsPage() {
  return (
    <div className="space-y-0">
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-blue-50 to-white py-16 md:py-24">
        <div className="container-wide">
          <div className="max-w-4xl mx-auto text-center">
            <div className="space-y-6">
              <div className="space-y-4">
                <h1 className="hero-title text-primary-blue">
                  Aus Bochum – für Deutschland und Europa
                </h1>
                <p className="section-subtitle">
                  TransNext Logistik ist Ihr spezialisierter Partner für Fahrzeugüberführung,
                  Aufbereitung sowie An- und Abmeldung. Bodenständig, zuverlässig und mit
                  Blick für das Detail.
                </p>
              </div>

              {/* Key Facts */}
              <div className="flex flex-wrap gap-4 justify-center">
                <Badge variant="secondary" className="text-sm px-3 py-1">
                  🏠 Bochum-verwurzelt
                </Badge>
                <Badge variant="secondary" className="text-sm px-3 py-1">
                  📅 6 Jahre Erfahrung
                </Badge>
                <Badge variant="secondary" className="text-sm px-3 py-1">
                  🌳 300+ Gepflanzte Bäume
                </Badge>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Company Story */}
      <section className="py-16 md:py-20">
        <div className="container-wide">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <div className="space-y-4">
              <h2 className="section-title text-primary-blue">Unsere Geschichte</h2>
              <p className="section-subtitle">
                Von der Ruhrgebiets-Idee zum europaweit tätigen Logistikspezialisten
              </p>
            </div>

            <div className="text-lg text-muted-foreground space-y-6 text-left">
              <p>
                TransNext Logistik entstand aus der Überzeugung, dass Fahrzeuglogistik mehr als nur
                Transport bedeutet. In Bochum, im Herzen des Ruhrgebiets, haben wir uns auf die
                Fahnen geschrieben, jeden Auftrag mit der Sorgfalt und dem Engagement anzugehen,
                die unsere Kunden verdienen.
              </p>

              <p>
                Was als lokale Initiative begann, ist heute zu einem überregional geschätzten
                Dienstleister gewachsen. Über 20 Mitarbeitende sorgen täglich dafür, dass
                Fahrzeuge sicher von A nach B gelangen, professionell aufbereitet werden oder
                alle bürokratischen Hürden der Zulassung problemlos gemeistert werden.
              </p>

              <p>
                Besonders stolz sind wir auf unser Nachhaltigkeitsversprechen: Für jede
                Überführung pflanzen wir einen Baum. So verbinden wir traditionelle Werte
                des Ruhrgebiets – Zuverlässigkeit und Bodenständigkeit – mit dem Blick
                für die Zukunft unseres Planeten.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-16 md:py-20 bg-slate-50">
        <div className="container-wide">
          <div className="text-center space-y-4 mb-12">
            <h2 className="section-title text-primary-blue">Unsere Werte</h2>
            <p className="section-subtitle">
              Was uns antreibt und unsere Arbeit prägt
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <Card className="text-center hover:shadow-lg transition-shadow">
              <CardContent className="pt-8">
                <div className="p-4 bg-primary-blue/10 rounded-full w-16 h-16 mx-auto mb-6 flex items-center justify-center">
                  <Shield className="h-8 w-8 text-primary-blue" />
                </div>
                <h3 className="text-xl font-semibold mb-4">Zuverlässigkeit</h3>
                <p className="text-muted-foreground">
                  Ihre Fahrzeuge sind bei uns in sicheren Händen. Wir halten, was wir versprechen.
                </p>
              </CardContent>
            </Card>

            <Card className="text-center hover:shadow-lg transition-shadow">
              <CardContent className="pt-8">
                <div className="p-4 bg-primary-blue/10 rounded-full w-16 h-16 mx-auto mb-6 flex items-center justify-center">
                  <Heart className="h-8 w-8 text-primary-blue" />
                </div>
                <h3 className="text-xl font-semibold mb-4">Kundenorientierung</h3>
                <p className="text-muted-foreground">
                  Ihre Zufriedenheit steht im Mittelpunkt. Wir denken mit und finden Lösungen.
                </p>
              </CardContent>
            </Card>

            <Card className="text-center hover:shadow-lg transition-shadow">
              <CardContent className="pt-8">
                <div className="p-4 bg-green-100 rounded-full w-16 h-16 mx-auto mb-6 flex items-center justify-center">
                  <TreePine className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="text-xl font-semibold mb-4">Nachhaltigkeit</h3>
                <p className="text-muted-foreground">
                  Ein Baum pro Überführung – für eine bessere Zukunft für alle.
                </p>
              </CardContent>
            </Card>

            <Card className="text-center hover:shadow-lg transition-shadow">
              <CardContent className="pt-8">
                <div className="p-4 bg-primary-blue/10 rounded-full w-16 h-16 mx-auto mb-6 flex items-center justify-center">
                  <Award className="h-8 w-8 text-primary-blue" />
                </div>
                <h3 className="text-xl font-semibold mb-4">Qualität</h3>
                <p className="text-muted-foreground">
                  Wir arbeiten mit Präzision und Sorgfalt – vom ersten Kontakt bis zur Übergabe.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Bochum Identity */}
      <section className="py-16 md:py-20">
        <div className="container-wide">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div className="space-y-4">
                <h2 className="section-title text-primary-blue">Bochum-Identität</h2>
                <p className="text-lg">
                  Das Ruhrgebiet prägt uns – und wir sind stolz darauf. Die Mentalität unserer
                  Heimat spiegelt sich in allem wider, was wir tun: bodenständig, direkt,
                  verlässlich und mit dem Herz am rechten Fleck.
                </p>
                <p className="text-muted-foreground">
                  Nicht umsonst haben wir unsere Farbwelt an die Tradition des VfL Bochum
                  angelehnt – eine Hommage an unsere Wurzeln und die Verbundenheit mit der Region.
                </p>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Warum das Ruhrgebiet?</h3>
                <ul className="space-y-2">
                  <li className="flex items-center space-x-2">
                    <Star className="h-4 w-4 text-primary-blue" />
                    <span>Zentrale Lage für deutschlandweite Überführungen</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Star className="h-4 w-4 text-primary-blue" />
                    <span>Automotive-Tradition und Expertise</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Star className="h-4 w-4 text-primary-blue" />
                    <span>Starke lokale Netzwerke und Partnerschaften</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Star className="h-4 w-4 text-primary-blue" />
                    <span>Kurze Wege zu Autohäusern und Gewerbeparks</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="text-center">
              <div className="bg-slate-50 rounded-lg p-12">
                <MapPin className="h-24 w-24 mx-auto text-primary-blue mb-6" />
                <h3 className="text-xl font-semibold mb-4">Standort Bochum</h3>
                <p className="text-muted-foreground mb-4">
                  Mitten im Ruhrgebiet – zentral erreichbar
                </p>
                <div className="text-primary-blue font-medium">
                  <p>Herner Str. 299A</p>
                  <p>44809 Bochum</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Team & Kennzahlen */}
      <section className="py-16 md:py-20 bg-slate-50">
        <div className="container-wide">
          <div className="text-center space-y-4 mb-12">
            <h2 className="section-title text-primary-blue">Unser Team</h2>
            <p className="section-subtitle">
              Menschen, die den Unterschied machen
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="space-y-8">
              <div className="space-y-4">
                <h3 className="text-2xl font-bold">Über 20 Mitarbeitende mit Herzblut</h3>
                <p className="text-lg text-muted-foreground">
                  Unser Team besteht aus erfahrenen Fahrern, Aufbereitungsspezialisten,
                  Zulassungsexperten und Disponenten. Was uns eint: Die Leidenschaft für
                  Fahrzeuge und der Anspruch, jeden Auftrag perfekt zu erledigen.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary-blue mb-2">6</div>
                  <p className="text-muted-foreground">Jahre Erfahrung</p>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600 mb-2">300+</div>
                  <p className="text-muted-foreground">Gepflanzte Bäume</p>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary-blue mb-2">100+</div>
                  <p className="text-muted-foreground">Zufriedene Kunden</p>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary-blue mb-2">3</div>
                  <p className="text-muted-foreground">Kernleistungen</p>
                </div>
              </div>
            </div>


          </div>
        </div>
      </section>

      {/* Nachhaltigkeit Detail */}
      <section id="nachhaltigkeit" className="py-16 md:py-20 bg-green-50">
        <div className="container-wide">
          <div className="text-center space-y-4 mb-12">
            <h2 className="section-title text-primary-blue">Nachhaltigkeit als Versprechen</h2>
            <p className="section-subtitle">
              Ein Baum pro Überführung – unser Beitrag für morgen
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-2xl font-bold">Warum Bäume pflanzen?</h3>
                <p className="text-lg">
                  Jede Überführung verursacht CO₂-Emissionen. Als verantwortungsbewusstes
                  Unternehmen wollen wir nicht nur kompensieren, sondern einen echten
                  Mehrwert schaffen. Deshalb pflanzen wir für jede Überführung einen Baum.
                </p>
              </div>

              <div className="space-y-4">
                <h4 className="text-lg font-semibold">So funktioniert's:</h4>
                <ul className="space-y-3">
                  <li className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-bold mt-0.5">1</div>
                    <span>Für jede Überführung wird automatisch ein Baum gepflanzt</span>
                  </li>
                  <li className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-bold mt-0.5">2</div>
                    <span>Auf Wunsch erhalten Sie eine digitale Baum-Urkunde per E-Mail</span>
                  </li>
                  <li className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-bold mt-0.5">3</div>
                    <span>Die Kosten sind bereits in unserem Service enthalten</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-20 bg-primary-blue text-white">
        <div className="container-wide text-center space-y-6">
          <h2 className="section-title">Lernen Sie uns kennen</h2>
          <p className="section-subtitle text-blue-100">
            Überzeugen Sie sich selbst von unserer Arbeitsweise und unserem Service
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/kontakt">
              <Button size="lg" className="bg-white text-primary-blue hover:bg-gray-100">
                Kontakt aufnehmen
              </Button>
            </Link>
            <Link href="/kontakt">
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-primary-blue">
                Angebot anfordern
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
