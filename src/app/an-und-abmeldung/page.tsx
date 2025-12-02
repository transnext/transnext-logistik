import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  FileText,
  Car,
  ArrowRight,
  CheckCircle
} from "lucide-react"

export default function AnUndAbmeldungPage() {
  return (
    <div className="space-y-0">
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-blue-50 to-white py-16 md:py-24">
        <div className="container-wide">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div className="space-y-4">
                <h1 className="hero-title text-primary-blue">
                  Zulassungsservice – An- und Abmeldung zuverlässig erledigt
                </h1>
                <p className="section-subtitle">
                  Wir übernehmen den kompletten Behördengang für Sie. Schnell,
                  korrekt und mit allen erforderlichen Dokumenten.
                </p>
              </div>

              {/* Trust Bullets */}
              <div className="flex flex-wrap gap-4">
                <Badge variant="secondary" className="text-sm px-3 py-1">
                  📋 Behördengang inklusive
                </Badge>
                <Badge variant="secondary" className="text-sm px-3 py-1">
                  ⚡ Schnell & korrekt
                </Badge>
              </div>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/kontakt">
                  <Button size="lg" className="bg-primary-blue hover-primary-darken">
                    Unterlagen einreichen
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/kontakt">
                  <Button size="lg" variant="outline" className="border-primary-blue text-primary-blue">
                    Angebot anfordern
                  </Button>
                </Link>
              </div>
            </div>

            {/* Hero Image */}
            <div className="lg:order-2">
              <div className="rounded-lg overflow-hidden shadow-xl">
                <img
                  src="/images/zulassungsservice-hero.jpg"
                  alt="Zulassungsservice - An- und Abmeldung"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="py-16 md:py-20">
        <div className="container-wide">
          <div className="text-center space-y-4 mb-12">
            <h2 className="section-title text-primary-blue">Unsere Zulassungsleistungen</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-primary-blue/10 rounded-lg">
                    <Car className="h-6 w-6 text-primary-blue" />
                  </div>
                  <CardTitle className="text-xl">Neuzulassung</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <CardDescription className="text-base">
                  Erstanmeldung von Fahrzeugen mit allen erforderlichen Kennzeichen und Dokumenten.
                </CardDescription>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span>Antragstellung bei der Zulassungsstelle</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span>Kennzeichenbestellung</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-primary-blue/10 rounded-lg">
                    <ArrowRight className="h-6 w-6 text-primary-blue" />
                  </div>
                  <CardTitle className="text-xl">Ummeldung</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <CardDescription className="text-base">
                  Ummeldung bei Wohnortwechsel oder Halterwechsel – regional und überregional.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-primary-blue/10 rounded-lg">
                    <FileText className="h-6 w-6 text-primary-blue" />
                  </div>
                  <CardTitle className="text-xl">Abmeldung</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <CardDescription className="text-base">
                  Ordnungsgemäße Abmeldung bei Verkauf, Verschrottung oder Stilllegung.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-20 bg-primary-blue text-white">
        <div className="container-wide text-center space-y-6">
          <h2 className="section-title">Bereit für Ihren Zulassungsservice?</h2>
          <p className="section-subtitle text-blue-100">
            Übersenden Sie uns Ihre Unterlagen und wir erledigen den Rest
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/kontakt">
              <Button size="lg" className="bg-white text-primary-blue hover:bg-gray-100">
                Unterlagen einreichen
              </Button>
            </Link>
            <Link href="/kontakt">
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-primary-blue">
                Kostenvoranschlag anfordern
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
