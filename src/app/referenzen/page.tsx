import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Quote,
  Star,
  ArrowRight
} from "lucide-react"

const testimonials = [
  {
    quote: "gute und verlässliche Zusammenarbeit",
    author: "Nur Özkent",
    company: "finn GmbH",
    location: "München",
    rating: 5,
    service: "Fahrzeugüberführung"
  },
  {
    quote: "schnell und immer zuverlässig",
    author: "Emil Karakozov",
    company: "Autogalerie Rehberg",
    location: "Herborn",
    rating: 5,
    service: "Fahrzeugüberführung"
  },
  {
    quote: "Sehr freundlich und gute Kommunikation. Keine Probleme und pünktliche Lieferung. Vielen Dank",
    author: "Michele Da Lucia",
    company: "Privatkunde",
    location: "Tirol, Österreich",
    rating: 5,
    service: "Fahrzeugüberführung"
  },
  {
    quote: "Danke für die saubere Arbeit",
    author: "M. Altani",
    company: "Profina",
    location: "Bochum",
    rating: 5,
    service: "Fahrzeugaufbereitung"
  },
  {
    quote: "Super gutes Team und top Fahrer",
    author: "M. Salkanovic",
    company: "Smart and Care Logistics",
    location: "Essen",
    rating: 5,
    service: "Fahrzeugüberführung"
  },
  {
    quote: "Habe gute Erfahrung gemacht, korrekte und unkomplizierte Abwicklung",
    author: "Emil K.",
    company: "Privatkunde",
    location: "Dortmund",
    rating: 5,
    service: "Fahrzeugüberführung"
  }
]

export default function ReferenzenPage() {
  return (
    <div className="space-y-0">
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-blue-50 to-white py-16 md:py-24">
        <div className="container-wide">
          <div className="text-center space-y-6">
            <h1 className="hero-title text-primary-blue">
              Referenzen & Kundenstimmen
            </h1>
            <p className="section-subtitle max-w-2xl mx-auto">
              Überzeugen Sie sich selbst: Hier berichten unsere Kunden von ihren
              Erfahrungen mit TransNext Logistik.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Badge variant="secondary" className="text-sm px-3 py-1">
                ⭐ 5-Sterne Bewertungen
              </Badge>
              <Badge variant="secondary" className="text-sm px-3 py-1">
                🏢 Privat- & Geschäftskunden
              </Badge>
              <Badge variant="secondary" className="text-sm px-3 py-1">
                🌍 Regional bis europaweit
              </Badge>
            </div>
          </div>
        </div>
      </section>

      {/* Customer Testimonials */}
      <section className="py-16 md:py-20">
        <div className="container-wide">
          <div className="text-center space-y-4 mb-12">
            <h2 className="section-title text-primary-blue">Was unsere Kunden sagen</h2>
            <p className="section-subtitle">
              Authentische Bewertungen von zufriedenen Kunden
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow">
                <CardContent className="pt-6">
                  <Quote className="h-8 w-8 text-primary-blue mx-auto mb-4" />
                  <p className="italic mb-4 text-center">"{testimonial.quote}"</p>

                  <div className="flex justify-center mb-3">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 text-yellow-400 fill-current" />
                    ))}
                  </div>

                  <div className="text-center">
                    <p className="font-semibold">{testimonial.author}</p>
                    <p className="text-sm text-muted-foreground">{testimonial.company}</p>
                    <p className="text-xs text-muted-foreground">{testimonial.location}</p>
                    <Badge variant="outline" className="mt-2 text-xs">
                      {testimonial.service}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Partner Logos */}
      <section className="py-16 md:py-20 bg-slate-50">
        <div className="container-wide">
          <div className="text-center space-y-4 mb-12">
            <h2 className="section-title text-primary-blue">Unsere Kunden vertrauen uns</h2>
            <p className="section-subtitle">
              Von Privatkunden bis zu großen Unternehmen – eine Auswahl unserer Partner
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="bg-white rounded-lg p-8 flex items-center justify-center hover:shadow-lg transition-shadow min-h-[180px]">
              <img src="/images/leasplan-logo.png" alt="LeasePlan" className="max-w-full max-h-24 object-contain" />
            </div>
            <div className="bg-white rounded-lg p-8 flex items-center justify-center hover:shadow-lg transition-shadow min-h-[180px]">
              <img src="/images/logo-2.png" alt="Partner 2" className="max-w-full max-h-24 object-contain" />
            </div>
            <div className="bg-white rounded-lg p-8 flex items-center justify-center hover:shadow-lg transition-shadow min-h-[180px]">
              <img src="/images/logo-3.svg" alt="Partner 3" className="max-w-full max-h-24 object-contain" />
            </div>
            <div className="bg-white rounded-lg p-8 flex items-center justify-center hover:shadow-lg transition-shadow min-h-[180px]">
              <img src="/images/logo-4.png" alt="Partner 4" className="max-w-full max-h-24 object-contain" />
            </div>
            <div className="bg-white rounded-lg p-8 flex items-center justify-center hover:shadow-lg transition-shadow min-h-[180px]">
              <img src="/images/logo-5.png" alt="Partner 5" className="max-w-full max-h-24 object-contain" />
            </div>
            <div className="bg-white rounded-lg p-8 flex items-center justify-center hover:shadow-lg transition-shadow min-h-[180px]">
              <img src="/images/logo-6.png" alt="Partner 6" className="max-w-full max-h-24 object-contain" />
            </div>
          </div>
        </div>
      </section>

      {/* Statistics */}
      <section className="py-16 md:py-20 bg-primary-blue text-white">
        <div className="container-wide">
          <div className="text-center space-y-4 mb-12">
            <h2 className="section-title">Zahlen, die für sich sprechen</h2>
            <p className="section-subtitle text-blue-100">
              Unsere Erfolgsbilanz in Zahlen
            </p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-4xl font-bold mb-2">100+</div>
              <p className="text-blue-100">Zufriedene Kunden</p>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold mb-2">3.000+</div>
              <p className="text-blue-100">Durchgeführte Überführungen</p>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold mb-2">100+</div>
              <p className="text-blue-100">Aufbereitete Fahrzeuge</p>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold mb-2">300+</div>
              <p className="text-blue-100">Gepflanzte Bäume</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-20">
        <div className="container-wide text-center space-y-6">
          <h2 className="section-title text-primary-blue">Werden auch Sie unser nächster zufriedener Kunde</h2>
          <p className="section-subtitle">
            Lassen Sie uns gemeinsam Ihr Projekt besprechen
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/kontakt">
              <Button size="lg" className="bg-primary-blue hover-primary-darken">
                Projekt besprechen
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
      </section>
    </div>
  )
}
