"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Users,
  Heart,
  TrendingUp,
  Coffee,
  Car,
  Briefcase,
  Clock,
  Euro,
  MapPin,
  Send,
  FileText
} from "lucide-react"

const benefits = [
  {
    icon: Euro,
    title: "Faires Gehalt",
    description: "Leistungsgerechte Bezahlung mit transparenter Struktur"
  },
  {
    icon: TrendingUp,
    title: "Weiterentwicklung",
    description: "Regelmäßige Schulungen und Aufstiegsmöglichkeiten"
  },
  {
    icon: Users,
    title: "Teamkultur",
    description: "Kollegiales Miteinander und offene Kommunikation"
  },
  {
    icon: Coffee,
    title: "Moderne Ausstattung",
    description: "Aktuelle Technik und professionelle Arbeitsplätze"
  },
  {
    icon: Heart,
    title: "Work-Life-Balance",
    description: "Flexible Arbeitszeiten und familienfreundliche Regelungen"
  },
  {
    icon: Car,
    title: "Nachhaltigkeit",
    description: "Sinnstiftende Arbeit mit Umweltbewusstsein"
  }
]

const openPositions = [
  {
    title: "Fahrer:in Fahrzeugüberführung",
    type: "Minijob",
    location: "Ruhrgebiet, Frankfurt, Hamburg, Berlin, München",
    requirements: [
      "Führerschein Klasse B (min. 2 Jahre)",
      "Zuverlässigkeit und Pünktlichkeit",
      "Flexibilität bei Reisebereitschaft",
      "Freundliches Auftreten gegenüber Kunden"
    ],
    description: "Überführung von PKW und leichten Nutzfahrzeugen auf Eigenachse deutschlandweit und europaweit. Wir suchen Fahrer an mehreren Standorten in ganz Deutschland."
  },
  {
    title: "Disponent:in Fahrzeuglogistik",
    type: "Vollzeit / Teilzeit",
    location: "Bochum",
    requirements: [
      "Ausbildung im Bereich Logistik/Spedition",
      "Erfahrung in der Disposition",
      "Gute PC-Kenntnisse",
      "Organisationstalent und Stressresistenz"
    ],
    description: "Planung und Koordination von Fahrzeugüberführungen, Kundenkommunikation und Optimierung der Routen."
  },
  {
    title: "Social Media Manager:in",
    type: "Minijob",
    location: "Bochum / Remote",
    requirements: [
      "Erfahrung mit Social Media Plattformen (Instagram, Facebook, LinkedIn)",
      "Kreativität und Gespür für ansprechende Inhalte",
      "Grundkenntnisse in Grafikdesign und Content-Erstellung",
      "Kommunikationsstärke und Teamfähigkeit"
    ],
    description: "Betreuung unserer Social-Media-Kanäle, Erstellung von Beiträgen und Stories, Community-Management und Unterstützung bei der digitalen Außendarstellung."
  }
]

export default function KarrierePage() {
  return (
    <div className="space-y-0">
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-blue-50 to-white py-16 md:py-24">
        <div className="container-wide">
          <div className="max-w-4xl mx-auto text-center">
            <div className="space-y-6">
              <div className="space-y-4">
                <h1 className="hero-title text-primary-blue">
                  Werde Teil von TransNext Logistik
                </h1>
                <p className="section-subtitle">
                  Über 20 Mitarbeitende – wachsendes Team aus Bochum.
                  Wir suchen Menschen, die anpacken und gemeinsam mit uns die
                  Zukunft der Fahrzeuglogistik gestalten.
                </p>
              </div>

              {/* Key Facts */}
              <div className="flex flex-wrap gap-4 justify-center">
                <Badge variant="secondary" className="text-sm px-3 py-1">
                  👥 20+ Kollegen
                </Badge>
                <Badge variant="secondary" className="text-sm px-3 py-1">
                  🌱 Wachsendes Unternehmen
                </Badge>
                <Badge variant="secondary" className="text-sm px-3 py-1">
                  🏠 Bochum-verwurzelt
                </Badge>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  size="lg"
                  className="bg-primary-blue hover-primary-darken"
                  onClick={() => document.getElementById('offene-stellen')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  Offene Stellen ansehen
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-primary-blue text-primary-blue"
                  onClick={() => document.getElementById('bewerbungsformular')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  Initiativbewerbung
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Company Culture */}
      <section className="py-16 md:py-20">
        <div className="container-wide">
          <div className="text-center space-y-4 mb-12">
            <h2 className="section-title text-primary-blue">Warum TransNext?</h2>
            <p className="section-subtitle">
              Was uns als Arbeitgeber auszeichnet
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {benefits.map((benefit, index) => (
              <Card key={index} className="text-center hover:shadow-lg transition-shadow">
                <CardContent className="pt-8">
                  <div className="p-4 bg-primary-blue/10 rounded-full w-16 h-16 mx-auto mb-6 flex items-center justify-center">
                    <benefit.icon className="h-8 w-8 text-primary-blue" />
                  </div>
                  <h3 className="text-xl font-semibold mb-4">{benefit.title}</h3>
                  <p className="text-muted-foreground">{benefit.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Open Positions */}
      <section id="offene-stellen" className="py-16 md:py-20 bg-slate-50">
        <div className="container-wide">
          <div className="text-center space-y-4 mb-12">
            <h2 className="section-title text-primary-blue">Offene Stellen</h2>
            <p className="section-subtitle">
              Finden Sie die Position, die zu Ihnen passt
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {openPositions.map((position, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <CardTitle className="text-xl">{position.title}</CardTitle>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline">{position.type}</Badge>
                        <Badge variant="outline" className="flex items-center space-x-1">
                          <MapPin className="h-3 w-3" />
                          <span>{position.location}</span>
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-muted-foreground">{position.description}</p>

                  <div>
                    <h4 className="font-semibold mb-2">Das bringen Sie mit:</h4>
                    <ul className="space-y-1">
                      {position.requirements.map((req, reqIndex) => (
                        <li key={reqIndex} className="text-sm text-muted-foreground flex items-start space-x-2">
                          <span className="w-1.5 h-1.5 bg-primary-blue rounded-full mt-2 flex-shrink-0"></span>
                          <span>{req}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="pt-4">
                    <Button
                      className="w-full bg-primary-blue hover-primary-darken"
                      onClick={() => document.getElementById('bewerbungsformular')?.scrollIntoView({ behavior: 'smooth' })}
                    >
                      <Send className="mr-2 h-4 w-4" />
                      Jetzt bewerben
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="text-center mt-12">
            <p className="text-muted-foreground mb-4">
              Sie finden nicht die richtige Position für sich?
            </p>
            <Button
              variant="outline"
              className="border-primary-blue text-primary-blue"
              onClick={() => document.getElementById('bewerbungsformular')?.scrollIntoView({ behavior: 'smooth' })}
            >
              Initiativbewerbung senden
            </Button>
          </div>
        </div>
      </section>

      {/* Application Process */}
      <section className="py-16 md:py-20">
        <div className="container-wide">
          <div className="text-center space-y-4 mb-12">
            <h2 className="section-title text-primary-blue">So läuft Ihre Bewerbung ab</h2>
            <p className="section-subtitle">
              Transparenter Bewerbungsprozess in wenigen Schritten
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {[
              {
                step: "1",
                title: "Bewerbung",
                description: "Senden Sie uns Ihre Unterlagen online oder per E-Mail"
              },
              {
                step: "2",
                title: "Prüfung",
                description: "Wir prüfen Ihre Bewerbung und melden uns binnen 5 Werktagen"
              },
              {
                step: "3",
                title: "Gespräch",
                description: "Persönliches Kennenlernen in entspannter Atmosphäre"
              },
              {
                step: "4",
                title: "Entscheidung",
                description: "Schnelle Rückmeldung und bei Zusage: Willkommen im Team!"
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

      {/* Application Form */}
      <section id="bewerbungsformular" className="py-16 md:py-20 bg-slate-50">
        <div className="container-wide">
          <div className="max-w-2xl mx-auto">
            <div className="text-center space-y-4 mb-12">
              <h2 className="section-title text-primary-blue">Online bewerben</h2>
              <p className="section-subtitle">
                Schnell und unkompliziert – oder senden Sie uns Ihre Bewerbung per E-Mail
              </p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Bewerbungsformular</CardTitle>
                <CardDescription>
                  Füllen Sie das Formular aus oder senden Sie Ihre Bewerbung direkt an:{" "}
                  <a href="mailto:bewerbung@transnext.de" className="text-primary-blue hover:underline font-medium">
                    bewerbung@transnext.de
                  </a>
                  <br />
                  <span className="text-sm">
                    Ihre Ansprechpartnerin: Marie Rüschenschulte (Personalangelegenheiten) |{" "}
                    <a href="tel:+4915563509887" className="text-primary-blue hover:underline">
                      +49 155 635 098 87
                    </a>
                  </span>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form
                  name="bewerbung"
                  method="POST"
                  action="/danke"
                  data-netlify="true"
                  netlify-honeypot="bot-field"
                  encType="multipart/form-data"
                  className="space-y-6"
                >
                  <input type="hidden" name="form-name" value="bewerbung" />
                  <p className="hidden">
                    <label>
                      Don't fill this out if you're human: <input name="bot-field" />
                    </label>
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label htmlFor="vorname-bew" className="text-sm font-medium">Vorname *</label>
                      <input
                        type="text"
                        id="vorname-bew"
                        name="vorname"
                        className="w-full p-3 border border-input rounded-md"
                        placeholder="Ihr Vorname"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="nachname-bew" className="text-sm font-medium">Nachname *</label>
                      <input
                        type="text"
                        id="nachname-bew"
                        name="nachname"
                        className="w-full p-3 border border-input rounded-md"
                        placeholder="Ihr Nachname"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label htmlFor="email-bew" className="text-sm font-medium">E-Mail *</label>
                      <input
                        type="email"
                        id="email-bew"
                        name="email"
                        className="w-full p-3 border border-input rounded-md"
                        placeholder="ihre@email.de"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="telefon-bew" className="text-sm font-medium">Telefon</label>
                      <input
                        type="tel"
                        id="telefon-bew"
                        name="telefon"
                        className="w-full p-3 border border-input rounded-md"
                        placeholder="0234 / 123456"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label htmlFor="position" className="text-sm font-medium">Position *</label>
                      <select id="position" name="position" className="w-full p-3 border border-input rounded-md" required>
                        <option value="">Bitte wählen...</option>
                        <option value="fahrer">Fahrer:in Fahrzeugüberführung</option>
                        <option value="disposition">Disponent:in Fahrzeuglogistik</option>
                        <option value="social-media">Social Media Manager:in (Minijob)</option>
                        <option value="initiativ">Initiativbewerbung</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="standort" className="text-sm font-medium">Bevorzugter Standort</label>
                      <select id="standort" name="standort" className="w-full p-3 border border-input rounded-md">
                        <option value="">Bitte wählen...</option>
                        <option value="ruhrgebiet">Ruhrgebiet</option>
                        <option value="frankfurt">Frankfurt</option>
                        <option value="hamburg">Hamburg</option>
                        <option value="berlin">Berlin</option>
                        <option value="muenchen">München</option>
                        <option value="bochum">Bochum</option>
                        <option value="remote">Remote</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="anschreiben" className="text-sm font-medium">Anschreiben</label>
                    <textarea
                      id="anschreiben"
                      name="anschreiben"
                      className="w-full p-3 border border-input rounded-md min-h-[100px]"
                      placeholder="Kurze Beschreibung Ihrer Motivation..."
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="unterlagen" className="text-sm font-medium">Bewerbungsunterlagen (PDF, max. 10MB)</label>
                    <input
                      type="file"
                      id="unterlagen"
                      name="unterlagen"
                      accept=".pdf,.doc,.docx"
                      className="w-full p-3 border border-input rounded-md"
                    />
                    <p className="text-xs text-muted-foreground">
                      Lebenslauf, Zeugnisse, Anschreiben als PDF
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-start space-x-2">
                      <input type="checkbox" id="privacy-career" name="datenschutz" className="mt-1" required />
                      <label htmlFor="privacy-career" className="text-sm text-muted-foreground">
                        Ich habe die Datenschutzerklärung gelesen und stimme der Verarbeitung meiner Bewerberdaten zu. *
                      </label>
                    </div>

                    <Button type="submit" className="w-full bg-primary-blue hover-primary-darken">
                      <Send className="mr-2 h-4 w-4" />
                      Bewerbung absenden
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Contact */}
      <section className="py-16 md:py-20 bg-primary-blue text-white">
        <div className="container-wide text-center space-y-6">
          <h2 className="section-title">Haben Sie Fragen?</h2>
          <p className="section-subtitle text-blue-100">
            Sprechen Sie uns gerne direkt an – wir freuen uns auf Sie!
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              className="bg-white text-primary-blue hover:bg-gray-100"
              onClick={() => window.location.href = 'tel:+4915563509887'}
            >
              Direkt anrufen: +49 155 635 098 87
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-white text-white hover:bg-white hover:text-primary-blue"
              onClick={() => window.location.href = 'mailto:bewerbung@transnext.de'}
            >
              E-Mail schreiben
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}
