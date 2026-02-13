import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  MapPin,
  Phone,
  Mail,
  Clock,
  Send,
  MessageSquare
} from "lucide-react"

export default function KontaktPage() {
  return (
    <div className="space-y-0">
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-blue-50 to-white py-16 md:py-24">
        <div className="container-wide">
          <div className="text-center space-y-6">
            <h1 className="hero-title text-primary-blue">
              Kontakt
            </h1>
            <p className="section-subtitle max-w-2xl mx-auto">
              Haben Sie Fragen oder benötigen Sie ein Angebot? Kontaktieren Sie uns –
              wir sind gerne für Sie da und beraten Sie unverbindlich.
            </p>
          </div>
        </div>
      </section>

      {/* Contact Information */}
      <section className="py-16 md:py-20">
        <div className="container-wide">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Contact Options */}
            <div className="space-y-8">
              <div>
                <h2 className="section-title text-primary-blue mb-8">Kontaktmöglichkeiten</h2>
              </div>

              <div className="space-y-6">
                <Card className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start space-x-4">
                      <div className="p-3 bg-primary-blue/10 rounded-lg">
                        <Phone className="h-6 w-6 text-primary-blue" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg mb-2">Telefon</h3>
                        <p className="text-muted-foreground mb-2">
                          Rufen Sie uns direkt an – wir beraten Sie gerne
                        </p>
                        <a href="tel:+4915563509886" className="text-primary-blue font-medium hover:underline">
                          +49 155 635 098 86
                        </a>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start space-x-4">
                      <div className="p-3 bg-primary-blue/10 rounded-lg">
                        <Mail className="h-6 w-6 text-primary-blue" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg mb-2">E-Mail</h3>
                        <p className="text-muted-foreground mb-2">
                          Schreiben Sie uns eine E-Mail mit Ihren Fragen
                        </p>
                        <a href="mailto:info@transnext.de" className="text-primary-blue font-medium hover:underline">
                          info@transnext.de
                        </a>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start space-x-4">
                      <div className="p-3 bg-primary-blue/10 rounded-lg">
                        <MapPin className="h-6 w-6 text-primary-blue" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg mb-2">Adresse</h3>
                        <p className="text-muted-foreground mb-2">
                          Besuchen Sie uns in unserem Büro in Bochum
                        </p>
                        <div className="text-primary-blue font-medium">
                          <p>Herner Str. 299A</p>
                          <p>44809 Bochum</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start space-x-4">
                      <div className="p-3 bg-primary-blue/10 rounded-lg">
                        <Clock className="h-6 w-6 text-primary-blue" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg mb-2">Öffnungszeiten</h3>
                        <p className="text-muted-foreground mb-2">
                          Unsere Geschäftszeiten für Beratung und Service
                        </p>
                        <div className="text-primary-blue font-medium space-y-1">
                          <p>Täglich: 09:00 - 18:00 Uhr</p>
                          <p className="text-sm text-muted-foreground">
                            Termine außerhalb der Geschäftszeiten nach Absprache
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Contact Form */}
            <div className="space-y-8">
              <div>
                <h2 className="section-title text-primary-blue mb-8">Allgemeine Anfrage</h2>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Kontaktformular</CardTitle>
                  <CardDescription>
                    Senden Sie uns Ihre Nachricht – wir melden uns schnellstmöglich bei Ihnen zurück
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form
                    name="kontakt"
                    method="POST"
                    action="/danke"
                    className="space-y-6"
                  >
                    <input type="hidden" name="form-name" value="kontakt" />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label htmlFor="vorname" className="text-sm font-medium">Vorname *</label>
                        <input
                          type="text"
                          id="vorname"
                          name="vorname"
                          className="w-full p-3 border border-input rounded-md"
                          placeholder="Ihr Vorname"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <label htmlFor="nachname" className="text-sm font-medium">Nachname *</label>
                        <input
                          type="text"
                          id="nachname"
                          name="nachname"
                          className="w-full p-3 border border-input rounded-md"
                          placeholder="Ihr Nachname"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="email" className="text-sm font-medium">E-Mail *</label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        className="w-full p-3 border border-input rounded-md"
                        placeholder="ihre@email.de"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="betreff" className="text-sm font-medium">Betreff *</label>
                      <select id="betreff" name="betreff" className="w-full p-3 border border-input rounded-md" required>
                        <option value="">Bitte wählen...</option>
                        <option value="fahrzeugueberfuehrung">Fahrzeugüberführung</option>
                        <option value="fahrzeugaufbereitung">Fahrzeugaufbereitung</option>
                        <option value="zulassung">An-/Abmeldung</option>
                        <option value="allgemein">Allgemeine Anfrage</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="nachricht" className="text-sm font-medium">Nachricht *</label>
                      <textarea
                        id="nachricht"
                        name="nachricht"
                        className="w-full p-3 border border-input rounded-md min-h-[120px]"
                        placeholder="Beschreiben Sie Ihr Anliegen..."
                        required
                      />
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-start space-x-2">
                        <input type="checkbox" id="privacy" name="datenschutz" className="mt-1" required />
                        <label htmlFor="privacy" className="text-sm text-muted-foreground">
                          Ich habe die Datenschutzerklärung gelesen und stimme der Verarbeitung meiner Daten zu. *
                        </label>
                      </div>

                      <Button type="submit" className="w-full bg-primary-blue hover-primary-darken">
                        <Send className="mr-2 h-4 w-4" />
                        Nachricht senden
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Map Section */}
      <section className="py-16 md:py-20 bg-slate-50">
        <div className="container-wide">
          <div className="text-center space-y-4 mb-12">
            <h2 className="section-title text-primary-blue">Unser Standort</h2>
            <p className="section-subtitle">
              Finden Sie uns in Bochum – im Herzen des Ruhrgebiets
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Map */}
            <a
              href="https://www.google.com/maps/search/?api=1&query=Herner+Str.+299A+44809+Bochum"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white rounded-lg overflow-hidden shadow-lg border border-border hover:shadow-xl transition-shadow"
            >
              <div className="relative h-[450px] flex flex-col items-center justify-center p-12 text-center bg-gradient-to-br from-blue-50 to-slate-100">
                <img
                  src="/images/standort-logo.png"
                  alt="TransNext Logistik Logo"
                  className="h-32 w-32 object-contain mb-6"
                />
                <div className="space-y-3">
                  <h4 className="font-bold text-2xl text-foreground">TransNext Logistik</h4>
                  <div className="space-y-1 text-muted-foreground">
                    <p className="text-lg">Herner Str. 299A</p>
                    <p className="text-lg">44809 Bochum</p>
                  </div>
                  <div className="pt-6">
                    <div className="inline-flex items-center gap-2 px-6 py-3 bg-primary-blue text-white rounded-lg font-medium">
                      <MapPin className="h-5 w-5" />
                      In Google Maps öffnen & Route planen
                    </div>
                  </div>
                </div>
              </div>
            </a>

            {/* Location Info */}
            <div className="bg-white rounded-lg p-8 shadow-lg border border-border flex flex-col justify-center">
              <div className="space-y-6">
                <div className="flex items-start space-x-4">
                  <MapPin className="h-8 w-8 text-primary-blue mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="text-xl font-semibold mb-2">Standort Bochum</h3>
                    <p className="text-muted-foreground mb-4">
                      Besuchen Sie uns vor Ort – Parkplätze vorhanden
                    </p>
                    <div className="text-primary-blue font-medium space-y-1">
                      <p>Herner Str. 299A</p>
                      <p>44809 Bochum</p>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-6">
                  <h4 className="font-semibold mb-3">Öffnungszeiten</h4>
                  <div className="space-y-2 text-muted-foreground">
                    <p>Täglich: 09:00 - 18:00 Uhr</p>
                    <p className="text-sm">Termine außerhalb der Geschäftszeiten nach Absprache möglich</p>
                  </div>
                </div>

                <div className="border-t pt-6">
                  <h4 className="font-semibold mb-3">Anfahrt</h4>
                  <p className="text-muted-foreground text-sm">
                    Zentral im Ruhrgebiet gelegen, gut erreichbar über die A40 und A43.
                    Ausreichend Parkplätze direkt vor Ort vorhanden.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
