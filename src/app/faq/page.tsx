import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  HelpCircle,
  ArrowRight,
  Phone,
  Mail
} from "lucide-react"

const faqData = [
  {
    category: "Fahrzeugüberführung",
    questions: [
      {
        question: "Welche Informationen werden für ein Überführungs-Angebot benötigt?",
        answer: "Für ein aussagekräftiges Angebot benötigen wir: Start- und Zielort (PLZ), Fahrzeugtyp (PKW, Transporter, etc.), gewünschte Transportart (Eigen- oder Fremdachse), Wunschtermin und Ihre Kontaktdaten. Optional hilfreich: Fahrzeugwert, besondere Anforderungen oder Zusatzleistungen."
      },
      {
        question: "Eigen- vs. Fremdachse – was passt wann?",
        answer: "Eigenachse eignet sich für fahrbereite Fahrzeuge und ist kostengünstiger. Fremdachse empfiehlt sich bei: nicht fahrbereiten Fahrzeugen, Oldtimern, Luxusfahrzeugen, fehlender Zulassung oder wenn Sie Kilometerstand schonen möchten."
      },
      {
        question: "Welche Regionen bedient TransNext?",
        answer: "Wir sind regional im Ruhrgebiet und ganz NRW tätig, deutschlandweit aktiv und bieten auch europaweite Überführungen an. Besonders stark sind wir im Raum Bochum, Dortmund, Essen und dem gesamten Ruhrgebiet vertreten."
      },
      {
        question: "Ist mein Fahrzeug während der Überführung versichert?",
        answer: "Ja, alle unsere Überführungen sind vollumfänglich versichert. Die Versicherung deckt Transport- und Haftpflichtschäden ab. Details zur Deckungssumme und den Bedingungen erhalten Sie mit Ihrem Angebot."
      },
      {
        question: "Wie kurzfristig sind Überführungstermine möglich?",
        answer: "Je nach Auslastung können wir oft schon innerhalb von 24-48 Stunden starten. Für Eilaufträge haben wir einen Express-Service. Planen Sie idealerweise 2-3 Werktage Vorlauf ein."
      }
    ]
  },
  {
    category: "Fahrzeugaufbereitung",
    questions: [
      {
        question: "Welches Aufbereitungspaket ist für mich richtig?",
        answer: "Basic eignet sich für regelmäßige Pflege und den Alltag. Premium ist ideal bei stärkeren Verschmutzungen oder vor dem Verkauf. Showroom wählen Sie für Oldtimer, Luxusfahrzeuge oder wenn perfekte Optik wichtig ist."
      },
      {
        question: "Wie lange dauert eine Fahrzeugaufbereitung?",
        answer: "Basic: 2-3 Stunden, Premium: 4-6 Stunden, Showroom: 6-8 Stunden oder länger je nach Fahrzeugzustand. Wir informieren Sie über die voraussichtliche Dauer bei der Terminvereinbarung."
      },
      {
        question: "Kann ich während der Aufbereitung warten?",
        answer: "Bei kürzeren Aufbereitungen (Basic) ist Warten möglich. Bei längeren Paketen empfehlen wir einen Termin mit Fahrzeugabgabe und -abholung. Gerne organisieren wir auch einen Leihwagen (kostenpflichtig)."
      },
      {
        question: "Arbeiten Sie auch bei schlechtem Wetter?",
        answer: "Wir haben überdachte Arbeitsplätze und können bei den meisten Wetterlagen arbeiten. Bei extremen Bedingungen (starker Regen, Frost) terminieren wir um, um optimale Ergebnisse zu gewährleisten."
      }
    ]
  },
  {
    category: "An- und Abmeldung",
    questions: [
      {
        question: "Wie läuft die Abwicklung bei An-/Abmeldung?",
        answer: "Sie senden uns die Unterlagen zu (Post oder persönlich). Wir prüfen die Vollständigkeit, gehen zur Zulassungsstelle, erledigen alle Formalitäten und senden Ihnen die neuen Dokumente/Kennzeichen sicher zurück. Dauer: meist 1-2 Werktage."
      },
      {
        question: "Welche Dokumente brauche ich für eine Neuzulassung?",
        answer: "Fahrzeugbrief (CoC-Papiere bei Neufahrzeugen), gültige HU-/AU-Bescheinigung, Versicherungsbestätigung (eVB-Nummer), Personalausweis und bei Fremdanmeldung eine Vollmacht. Detaillierte Checkliste finden Sie auf unserer Zulassungsseite."
      },
      {
        question: "Können Sie auch Wunschkennzeichen besorgen?",
        answer: "Ja, wir kümmern uns um die Reservierung und Beantragung Ihres Wunschkennzeichens. Dies ist ein optionaler Service mit zusätzlichen Kosten. Teilen Sie uns Ihren Wunsch einfach mit der Anfrage mit."
      },
      {
        question: "Was passiert bei unvollständigen Unterlagen?",
        answer: "Wir prüfen alle Dokumente vor dem Behördengang und informieren Sie über fehlende Unterlagen. Erst wenn alles vollständig ist, starten wir den Prozess. So vermeiden wir Verzögerungen und zusätzliche Kosten."
      }
    ]
  },
  {
    category: "Allgemeine Fragen",
    questions: [
      {
        question: "Wie funktioniert die Baum-Pflanzung?",
        answer: "Für jede Überführung pflanzen wir einen Baum über unseren Partner. Sie erhalten auf Wunsch eine digitale Baum-Urkunde per E-Mail mit Koordinaten und Informationen. Dies ist unser Beitrag zum Klimaschutz und bei Überführungen kostenfrei inklusive."
      },
      {
        question: "Welche Zahlungsarten akzeptieren Sie?",
        answer: "Wir akzeptieren Überweisung, Lastschrift, PayPal sowie Barzahlung bei persönlicher Übergabe. Geschäftskunden können auf Rechnung zahlen (nach Bonitätsprüfung). Kreditkartenzahlung ist in Vorbereitung."
      },
      {
        question: "Wie erreiche ich TransNext Logistik?",
        answer: "Telefonisch unter +49 155 635 098 86, per E-Mail an info@transnext.de, über unser Kontaktformular oder persönlich in Bochum (Herner Str. 299A, 44809 Bochum). Unsere Geschäftszeiten: Täglich 09:00 - 18:00 Uhr. Termine außerhalb der Geschäftszeiten nach Absprache möglich."
      },
      {
        question: "Arbeiten Sie auch am Wochenende?",
        answer: "Standardmäßig arbeiten wir Mo-Fr. Wochenendtermine sind nach Absprache möglich (ggf. mit Aufschlag). Überführungen können auch am Wochenende durchgeführt werden, je nach Verfügbarkeit und Zielort."
      },
      {
        question: "Haben Sie Gewerbetarife?",
        answer: "Ja, wir bieten spezielle Konditionen für Autohändler, Leasinggesellschaften und Flottenbetreiber. Sprechen Sie uns auf Rahmenverträge und Mengenrabatte an. Ab 10 Fahrzeugen/Jahr gelten Sonderkonditionen."
      }
    ]
  }
]

export default function FAQPage() {
  return (
    <div className="space-y-0">
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-blue-50 to-white py-16 md:py-24">
        <div className="container-wide">
          <div className="text-center space-y-6">
            <h1 className="hero-title text-primary-blue">
              Häufig gestellte Fragen
            </h1>
            <p className="section-subtitle max-w-2xl mx-auto">
              Hier finden Sie Antworten auf die wichtigsten Fragen rund um unsere
              Leistungen. Sollten Sie weitere Fragen haben, kontaktieren Sie uns gerne direkt.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a href="tel:+4915563509886">
                <Button size="lg" className="bg-primary-blue hover-primary-darken">
                  <Phone className="mr-2 h-4 w-4" />
                  Direkt anrufen
                </Button>
              </a>
              <a href="mailto:info@transnext.de">
                <Button size="lg" variant="outline" className="border-primary-blue text-primary-blue">
                  <Mail className="mr-2 h-4 w-4" />
                  E-Mail schreiben
                </Button>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Content */}
      <section className="py-16 md:py-20">
        <div className="container-wide">
          <div className="space-y-12">
            {faqData.map((category, categoryIndex) => (
              <div key={categoryIndex} className="space-y-8">
                <div className="text-center">
                  <h2 className="text-2xl md:text-3xl font-bold text-primary-blue mb-4">
                    {category.category}
                  </h2>
                  <div className="w-24 h-1 bg-primary-blue mx-auto"></div>
                </div>

                <div className="grid gap-6 max-w-4xl mx-auto">
                  {category.questions.map((faq, faqIndex) => (
                    <Card key={faqIndex} className="hover:shadow-lg transition-shadow">
                      <CardHeader>
                        <CardTitle className="flex items-start space-x-3 text-left">
                          <HelpCircle className="h-5 w-5 text-primary-blue mt-1 flex-shrink-0" />
                          <span className="text-lg">{faq.question}</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-muted-foreground leading-relaxed pl-8">
                          {faq.answer}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Quick Links */}
      <section className="py-16 md:py-20 bg-slate-50">
        <div className="container-wide">
          <div className="text-center space-y-4 mb-12">
            <h2 className="section-title text-primary-blue">Weitere Informationen</h2>
            <p className="section-subtitle">
              Entdecken Sie unsere Leistungen im Detail
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="text-center hover:shadow-lg transition-shadow">
              <CardContent className="pt-8">
                <div className="p-4 bg-primary-blue/10 rounded-full w-16 h-16 mx-auto mb-6 flex items-center justify-center">
                  <HelpCircle className="h-8 w-8 text-primary-blue" />
                </div>
                <h3 className="text-xl font-semibold mb-4">Fahrzeugüberführung</h3>
                <p className="text-muted-foreground mb-6">
                  Detaillierte Informationen zu unseren Überführungsleistungen
                </p>
                <Link href="/fahrzeugueberfuehrung">
                  <Button variant="ghost" className="text-primary-blue">
                    Mehr erfahren <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="text-center hover:shadow-lg transition-shadow">
              <CardContent className="pt-8">
                <div className="p-4 bg-primary-blue/10 rounded-full w-16 h-16 mx-auto mb-6 flex items-center justify-center">
                  <HelpCircle className="h-8 w-8 text-primary-blue" />
                </div>
                <h3 className="text-xl font-semibold mb-4">Fahrzeugaufbereitung</h3>
                <p className="text-muted-foreground mb-6">
                  Alle Details zu unseren Aufbereitungspaketen
                </p>
                <Link href="/fahrzeugaufbereitung">
                  <Button variant="ghost" className="text-primary-blue">
                    Mehr erfahren <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="text-center hover:shadow-lg transition-shadow">
              <CardContent className="pt-8">
                <div className="p-4 bg-primary-blue/10 rounded-full w-16 h-16 mx-auto mb-6 flex items-center justify-center">
                  <HelpCircle className="h-8 w-8 text-primary-blue" />
                </div>
                <h3 className="text-xl font-semibold mb-4">Zulassungsservice</h3>
                <p className="text-muted-foreground mb-6">
                  Informationen zu An-, Um- und Abmeldungen
                </p>
                <Link href="/an-und-abmeldung">
                  <Button variant="ghost" className="text-primary-blue">
                    Mehr erfahren <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Contact CTA */}
      <section className="py-16 md:py-20 bg-primary-blue text-white">
        <div className="container-wide text-center space-y-6">
          <h2 className="section-title">Ihre Frage ist nicht dabei?</h2>
          <p className="section-subtitle text-blue-100">
            Kontaktieren Sie uns direkt – wir helfen Ihnen gerne weiter
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="tel:+4915563509886">
              <Button size="lg" className="bg-white text-primary-blue hover:bg-gray-100">
                <Phone className="mr-2 h-4 w-4" />
                +49 155 635 098 86
              </Button>
            </a>
            <Link href="/kontakt">
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-primary-blue">
                <Mail className="mr-2 h-4 w-4" />
                Kontaktformular
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
