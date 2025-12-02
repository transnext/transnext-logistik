import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Truck,
  Sparkles,
  FileText,
  ArrowRight,
  CheckCircle,
  Globe,
  Users,
  TreePine,
  Shield,
  Clock,
  Star,
  Quote
} from "lucide-react"

export default function HomePage() {
  return (
    <div className="space-y-0">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-b from-blue-50 to-white py-16 md:py-24 overflow-hidden">
        <div className="container-wide">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6 z-10">
              <div className="space-y-4">
                <h1 className="hero-title text-primary-blue">
                  Wir bewegen Fahrzeuge. <br />
                  <span className="text-secondary-blue">Sicher. Pünktlich. Nachhaltig.</span>
                </h1>
                <p className="section-subtitle">
                  Fahrzeugüberführung auf Eigen- oder Fremdachse, professionelle Aufbereitung
                  sowie An- und Abmeldung – regional, bundes- und europaweit.
                </p>
              </div>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/kontakt">
                  <Button size="lg" className="bg-primary-blue hover-primary-darken w-full sm:w-auto">
                    Angebot anfordern
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/kontakt">
                  <Button size="lg" variant="outline" className="border-primary-blue text-primary-blue w-full sm:w-auto">
                    Kontakt aufnehmen
                  </Button>
                </Link>
              </div>
            </div>

            {/* Hero Image */}
            <div className="lg:order-2 relative">
              <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl border-4 border-white">
                <Image
                  src="/images/hero-transnext.jpg"
                  alt="TransNext Logistik Mitarbeiter vor Fahrzeugflotte - Professionelle Fahrzeugüberführung aus Bochum"
                  fill
                  className="object-cover object-center"
                  priority
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-primary-blue/10 via-transparent to-transparent"></div>
              </div>
              {/* Decorative elements */}
              <div className="absolute -z-10 top-10 -right-10 w-72 h-72 bg-secondary-blue rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
              <div className="absolute -z-10 -bottom-10 -left-10 w-72 h-72 bg-primary-blue rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Services Teaser */}
      <section className="py-16 md:py-20">
        <div className="container-wide">
          <div className="text-center space-y-4 mb-12">
            <h2 className="section-title text-primary-blue">Unsere Leistungen</h2>
            <p className="section-subtitle">
              Alles rund um Ihr Fahrzeug – aus einer Hand
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-primary-blue/10 rounded-lg">
                    <Truck className="h-6 w-6 text-primary-blue" />
                  </div>
                  <CardTitle className="text-xl">Fahrzeugüberführung</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <CardDescription className="text-base">
                  Auf Eigen- oder Fremdachse – vom Ruhrgebiet bis Europa.
                </CardDescription>
                <Link href="/fahrzeugueberfuehrung">
                  <Button variant="ghost" className="text-primary-blue hover:bg-primary-blue/10 p-0">
                    Mehr erfahren <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-primary-blue/10 rounded-lg">
                    <Sparkles className="h-6 w-6 text-primary-blue" />
                  </div>
                  <CardTitle className="text-xl">Fahrzeugaufbereitung</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <CardDescription className="text-base">
                  Wert- und lackschonend, innen wie außen.
                </CardDescription>
                <Link href="/fahrzeugaufbereitung">
                  <Button variant="ghost" className="text-primary-blue hover:bg-primary-blue/10 p-0">
                    Mehr erfahren <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-primary-blue/10 rounded-lg">
                    <FileText className="h-6 w-6 text-primary-blue" />
                  </div>
                  <CardTitle className="text-xl">An- und Abmeldung</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <CardDescription className="text-base">
                  Zuverlässige Zulassungsservices – schnell und korrekt.
                </CardDescription>
                <Link href="/an-und-abmeldung">
                  <Button variant="ghost" className="text-primary-blue hover:bg-primary-blue/10 p-0">
                    Mehr erfahren <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* USPs Section */}
      <section className="py-16 md:py-20 bg-slate-50">
        <div className="container-wide">
          <div className="text-center space-y-4 mb-12">
            <h2 className="section-title text-primary-blue">Warum TransNext?</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center space-y-4">
              <div className="p-4 bg-white rounded-full w-16 h-16 mx-auto flex items-center justify-center">
                <Globe className="h-8 w-8 text-primary-blue" />
              </div>
              <h3 className="font-semibold text-lg">Flexibel</h3>
              <p className="text-muted-foreground">Regional, bundes- und europaweit</p>
            </div>

            <div className="text-center space-y-4">
              <div className="p-4 bg-white rounded-full w-16 h-16 mx-auto flex items-center justify-center">
                <Users className="h-8 w-8 text-primary-blue" />
              </div>
              <h3 className="font-semibold text-lg">Spezialisiert</h3>
              <p className="text-muted-foreground">Überführung, Aufbereitung, Zulassung aus einer Hand</p>
            </div>

            <div className="text-center space-y-4">
              <div className="p-4 bg-white rounded-full w-16 h-16 mx-auto flex items-center justify-center">
                <TreePine className="h-8 w-8 text-primary-blue" />
              </div>
              <h3 className="font-semibold text-lg">Nachhaltig</h3>
              <p className="text-muted-foreground">Ein Baum pro Überführung</p>
            </div>

            <div className="text-center space-y-4">
              <div className="p-4 bg-white rounded-full w-16 h-16 mx-auto flex items-center justify-center">
                <Shield className="h-8 w-8 text-primary-blue" />
              </div>
              <h3 className="font-semibold text-lg">Verlässlich</h3>
              <p className="text-muted-foreground">Planungssicher, transparent, persönlich</p>
            </div>
          </div>
        </div>
      </section>

      {/* Process Steps */}
      <section className="py-16 md:py-20">
        <div className="container-wide">
          <div className="text-center space-y-4 mb-12">
            <h2 className="section-title text-primary-blue">So einfach geht's</h2>
            <p className="section-subtitle">In vier Schritten zu Ihrem Ziel</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {[
              {
                step: "1",
                title: "Anfrage stellen",
                description: "Senden Sie uns Ihre Anfrage über unser Formular oder rufen Sie uns an"
              },
              {
                step: "2",
                title: "Angebot erhalten",
                description: "Wir erstellen ein individuelles Angebot nach Ihren Wünschen"
              },
              {
                step: "3",
                title: "Durchführung",
                description: "Termintreue Abwicklung durch unser erfahrenes Team"
              },
              {
                step: "4",
                title: "Abschluss & Baum",
                description: "Zufriedene Übergabe und Ihre Baum-Pflanzung bestätigt"
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

      {/* Sustainability Section */}
      <section className="py-16 md:py-20 bg-green-50">
        <div className="container-wide">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div className="space-y-4">
                <h2 className="section-title text-primary-blue">Nachhaltigkeit leben</h2>
                <p className="text-lg">
                  Für jede Überführung pflanzen wir einen Baum und gleichen so CO₂-Emissionen
                  anteilig aus. Auf Wunsch erhalten Sie eine Baum-Urkunde per E-Mail.
                </p>
              </div>
              <Link href="/ueber-uns#nachhaltigkeit">
                <Button className="bg-green-600 hover:bg-green-700">
                  Mehr zu Nachhaltigkeit
                  <TreePine className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
            <div className="text-center">
              <div className="bg-white rounded-lg p-8">
                <div className="relative w-full aspect-square max-w-md mx-auto">
                  <Image
                    src="/images/nachhaltigkeit.png"
                    alt="TransNext Logistik Nachhaltigkeit - Ein Baum pro Überführung"
                    fill
                    className="object-contain"
                    sizes="(max-width: 768px) 100vw, 50vw"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* References Teaser */}
      <section className="py-16 md:py-20">
        <div className="container-wide">
          <div className="text-center space-y-4 mb-12">
            <h2 className="section-title text-primary-blue">Was unsere Kunden sagen</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                quote: "gute und verlässliche Zusammenarbeit",
                author: "Nur Özkent",
                company: "finn GmbH",
                location: "München",
                rating: 5
              },
              {
                quote: "schnell und immer zuverlässig",
                author: "Emil Karakozov",
                company: "Autogalerie Rehberg",
                location: "Herborn",
                rating: 5
              },
              {
                quote: "Sehr freundlich und gute Kommunikation. Keine Probleme und pünktliche Lieferung. Vielen Dank",
                author: "Michele Da Lucia",
                company: "Privatkunde",
                location: "Tirol, Österreich",
                rating: 5
              }
            ].map((testimonial, index) => (
              <Card key={index} className="text-center">
                <CardContent className="pt-6">
                  <Quote className="h-8 w-8 text-primary-blue mx-auto mb-4" />
                  <p className="italic mb-4">"{testimonial.quote}"</p>
                  <div className="flex justify-center mb-2">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 text-yellow-400 fill-current" />
                    ))}
                  </div>
                  <p className="font-semibold">{testimonial.author}</p>
                  <p className="text-sm text-muted-foreground">{testimonial.company}</p>
                  <p className="text-xs text-muted-foreground">{testimonial.location}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="text-center mt-8">
            <Link href="/referenzen">
              <Button variant="outline" className="border-primary-blue text-primary-blue">
                Alle Referenzen ansehen
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Quick Contact Form */}
      <section className="py-16 md:py-20 bg-primary-blue text-white">
        <div className="container-wide">
          <div className="text-center space-y-4 mb-12">
            <h2 className="section-title">Schnellanfrage</h2>
            <p className="section-subtitle text-blue-100">
              Erhalten Sie ein unverbindliches Angebot in wenigen Minuten
            </p>
          </div>

          <div className="max-w-2xl mx-auto">
            <Card className="border-0">
              <CardContent className="p-8">
                <form
                  name="schnellanfrage"
                  method="POST"
                  action="/danke"
                  data-netlify="true"
                  netlify-honeypot="bot-field"
                >
                  <input type="hidden" name="form-name" value="schnellanfrage" />
                  <p className="hidden">
                    <label>
                      Don't fill this out if you're human: <input name="bot-field" />
                    </label>
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label htmlFor="start" className="text-sm font-medium text-foreground">Start PLZ/Land *</label>
                      <input
                        id="start"
                        name="start"
                        className="w-full p-3 border border-input rounded-md"
                        placeholder="z.B. 44787"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="ziel" className="text-sm font-medium text-foreground">Ziel PLZ/Land *</label>
                      <input
                        id="ziel"
                        name="ziel"
                        className="w-full p-3 border border-input rounded-md"
                        placeholder="z.B. 10115"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="fahrzeugtyp" className="text-sm font-medium text-foreground">Fahrzeugtyp *</label>
                      <select id="fahrzeugtyp" name="fahrzeugtyp" className="w-full p-3 border border-input rounded-md" required>
                        <option value="PKW">PKW</option>
                        <option value="Transporter">Transporter</option>
                        <option value="Motorrad">Motorrad</option>
                        <option value="LKW">LKW</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="transportart" className="text-sm font-medium text-foreground">Transportart *</label>
                      <select id="transportart" name="transportart" className="w-full p-3 border border-input rounded-md" required>
                        <option value="Eigenachse">Eigenachse</option>
                        <option value="Fremdachse offen">Fremdachse offen</option>
                        <option value="Fremdachse geschlossen">Fremdachse geschlossen</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="email-quick" className="text-sm font-medium text-foreground">E-Mail *</label>
                      <input
                        type="email"
                        id="email-quick"
                        name="email"
                        className="w-full p-3 border border-input rounded-md"
                        placeholder="ihre@email.de"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="telefon" className="text-sm font-medium text-foreground">Telefon</label>
                      <input
                        type="tel"
                        id="telefon"
                        name="telefon"
                        className="w-full p-3 border border-input rounded-md"
                        placeholder="0234 / 123456"
                      />
                    </div>
                  </div>

                  <div className="mt-6 space-y-4">
                    <div className="flex items-start space-x-2">
                      <input type="checkbox" id="privacy-quick" name="datenschutz" className="mt-1" required />
                      <label htmlFor="privacy-quick" className="text-sm text-muted-foreground">
                        Ich stimme der Datenschutzerklärung zu und bin damit einverstanden,
                        dass TransNext Logistik meine Daten zur Bearbeitung meiner Anfrage verwendet. *
                      </label>
                    </div>

                    <Button type="submit" className="w-full bg-white text-primary-blue hover:bg-gray-100">
                      Angebot anfordern
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 md:py-20 bg-slate-900 text-white">
        <div className="container-wide text-center space-y-6">
          <h2 className="section-title">Bereit, Ihr Fahrzeug zu bewegen?</h2>
          <p className="section-subtitle text-slate-300">
            Kontaktieren Sie uns noch heute für ein unverbindliches Angebot
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/kontakt">
              <Button size="lg" className="bg-primary-blue hover-primary-darken">
                Angebot anfordern
              </Button>
            </Link>
            <Link href="/kontakt">
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-slate-900">
                Kontakt aufnehmen
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
