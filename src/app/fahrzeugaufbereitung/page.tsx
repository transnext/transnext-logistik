"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Sparkles,
  Car,
  Shield,
  Clock,
  ArrowRight,
  CheckCircle,
  Star,
  Droplets,
  Wind,
  Zap
} from "lucide-react"

export default function FahrzeugaufbereitungPage() {
  return (
    <div className="space-y-0">
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-blue-50 to-white py-16 md:py-24" id="hero">
        <div className="container-wide">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div className="space-y-4">
                <h1 className="hero-title text-primary-blue">
                  Professionelle Fahrzeugaufbereitung
                </h1>
                <p className="section-subtitle">
                  Werterhalt, Sauberkeit und perfekter Eindruck – für Privat- und Geschäftskunden.
                  Innen und außen makellos aufbereitet.
                </p>
              </div>

              {/* Trust Bullets */}
              <div className="flex flex-wrap gap-4">
                <Badge variant="secondary" className="text-sm px-3 py-1">
                  ✨ Wert- und lackschonend
                </Badge>
                <Badge variant="secondary" className="text-sm px-3 py-1">
                  🚗 Innen & Außen
                </Badge>
                <Badge variant="secondary" className="text-sm px-3 py-1">
                  ⭐ Profi-Equipment
                </Badge>
              </div>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/kontakt">
                  <Button size="lg" className="bg-primary-blue hover-primary-darken">
                    Termin anfragen
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-primary-blue text-primary-blue"
                  onClick={() => document.querySelector('#aufbereitungspakete')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  Pakete vergleichen
                </Button>
              </div>
            </div>

            {/* Hero Image */}
            <div className="lg:order-2">
              <div className="rounded-lg overflow-hidden shadow-xl">
                <img
                  src="/images/fahrzeugaufbereitung-hero.jpg"
                  alt="Professionelle Fahrzeugaufbereitung"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Service Packages */}
      <section className="py-16 md:py-20" id="aufbereitungspakete">
        <div className="container-wide">
          <div className="text-center space-y-4 mb-12">
            <h2 className="section-title text-primary-blue">Unsere Aufbereitungspakete</h2>
            <p className="section-subtitle">
              Für jeden Anspruch das passende Paket – vom Basis-Service bis zur Showroom-Aufbereitung
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Basic Package */}
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader className="text-center min-h-[200px] flex flex-col justify-end">
                <div className="p-3 bg-blue-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                  <Droplets className="h-8 w-8 text-primary-blue" />
                </div>
                <CardTitle className="text-2xl">Basic</CardTitle>
                <CardDescription className="text-lg">
                  Grundausstattung für den Alltag
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary-blue mb-2">ab 89€</div>
                  <p className="text-sm text-muted-foreground">inkl. MwSt.</p>
                </div>

                <ul className="space-y-3">
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm">Außenwäsche mit Shampoo</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm">Felgenreinigung</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm">Innenraum saugen</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm">Scheiben innen & außen</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm">Fußmatten reinigen</span>
                  </li>
                </ul>

                <Link href="/kontakt">
                  <Button className="w-full bg-primary-blue hover-primary-darken">
                    Paket wählen
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Premium Package */}
            <Card className="hover:shadow-lg transition-shadow border-primary-blue relative">
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <Badge className="bg-primary-blue text-white">Beliebt</Badge>
              </div>
              <CardHeader className="text-center min-h-[200px] flex flex-col justify-end">
                <div className="p-3 bg-primary-blue/20 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                  <Star className="h-8 w-8 text-primary-blue" />
                </div>
                <CardTitle className="text-2xl">Premium</CardTitle>
                <CardDescription className="text-lg">
                  Erweiterte Pflege für Ihren Wagen
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary-blue mb-2">ab 109€</div>
                  <p className="text-sm text-muted-foreground">inkl. MwSt.</p>
                </div>

                <ul className="space-y-3">
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm">Alle Basic-Leistungen</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm">Lackpflege mit Wachs</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm">Politur punktuell</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm">Tiefenreinigung Innenraum</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm">Kunststoffpflege</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm">Reifen schwärzen</span>
                  </li>
                </ul>

                <Link href="/kontakt">
                  <Button className="w-full bg-primary-blue hover-primary-darken">
                    Paket wählen
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Showroom Package */}
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader className="text-center min-h-[200px] flex flex-col justify-end">
                <div className="p-3 bg-yellow-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                  <Zap className="h-8 w-8 text-yellow-600" />
                </div>
                <CardTitle className="text-2xl">Showroom</CardTitle>
                <CardDescription className="text-lg">
                  Perfektion bis ins kleinste Detail
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary-blue mb-2">ab 209€</div>
                  <p className="text-sm text-muted-foreground">inkl. MwSt.</p>
                </div>

                <ul className="space-y-3">
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm">Alle Premium-Leistungen</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm">Lackfinish & Versiegelung</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm">Motorraumreinigung</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm">Geruchsneutralisierung</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm">Lederaufbereitung</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm">Kratzerentfernung</span>
                  </li>
                </ul>

                <Link href="/kontakt">
                  <Button className="w-full bg-primary-blue hover-primary-darken">
                    Paket wählen
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Process */}
      <section className="py-16 md:py-20">
        <div className="container-wide">
          <div className="text-center space-y-4 mb-12">
            <h2 className="section-title text-primary-blue">Unser Aufbereitungsprozess</h2>
            <p className="section-subtitle">Professionell und schonend – Schritt für Schritt</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {[
              {
                step: "1",
                title: "Begutachtung",
                description: "Sorgfältige Inspektion und Beratung zum optimalen Paket"
              },
              {
                step: "2",
                title: "Vorreinigung",
                description: "Grobreinigung und Entfernung von losen Verschmutzungen"
              },
              {
                step: "3",
                title: "Detailarbeit",
                description: "Intensive Reinigung und Pflege nach Paket-Spezifikation"
              },
              {
                step: "4",
                title: "Finishing",
                description: "Qualitätskontrolle und finale Politur für den perfekten Glanz"
              }
            ].map((item, index) => (
              <div key={index} className="text-center space-y-4">
                <div className="relative">
                  <div className="w-16 h-16 bg-primary-blue text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto">
                    {item.step}
                  </div>
                  {index < 3 && (
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

      {/* Benefits */}
      <section className="py-16 md:py-20 bg-slate-50">
        <div className="container-wide">
          <div className="text-center space-y-4 mb-12">
            <h2 className="section-title text-primary-blue">Warum professionelle Aufbereitung?</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center space-y-4">
              <div className="p-4 bg-white rounded-full w-16 h-16 mx-auto flex items-center justify-center">
                <Shield className="h-8 w-8 text-primary-blue" />
              </div>
              <h3 className="font-semibold text-lg">Werterhalt</h3>
              <p className="text-muted-foreground">Regelmäßige Pflege erhält den Fahrzeugwert nachhaltig</p>
            </div>

            <div className="text-center space-y-4">
              <div className="p-4 bg-white rounded-full w-16 h-16 mx-auto flex items-center justify-center">
                <Sparkles className="h-8 w-8 text-primary-blue" />
              </div>
              <h3 className="font-semibold text-lg">Optik</h3>
              <p className="text-muted-foreground">Professioneller Glanz und makelloser Zustand</p>
            </div>

            <div className="text-center space-y-4">
              <div className="p-4 bg-white rounded-full w-16 h-16 mx-auto flex items-center justify-center">
                <Wind className="h-8 w-8 text-primary-blue" />
              </div>
              <h3 className="font-semibold text-lg">Hygiene</h3>
              <p className="text-muted-foreground">Gründliche Reinigung für gesundes Raumklima</p>
            </div>

            <div className="text-center space-y-4">
              <div className="p-4 bg-white rounded-full w-16 h-16 mx-auto flex items-center justify-center">
                <Clock className="h-8 w-8 text-primary-blue" />
              </div>
              <h3 className="font-semibold text-lg">Zeitersparnis</h3>
              <p className="text-muted-foreground">Wir übernehmen die aufwändige Detailarbeit</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-20 bg-primary-blue text-white">
        <div className="container-wide text-center space-y-6">
          <h2 className="section-title">Bereit für Ihre Fahrzeugaufbereitung?</h2>
          <p className="section-subtitle text-blue-100">
            Vereinbaren Sie jetzt einen Termin und lassen Sie Ihr Fahrzeug strahlen
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/kontakt">
              <Button size="lg" className="bg-white text-primary-blue hover:bg-gray-100">
                Termin vereinbaren
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
