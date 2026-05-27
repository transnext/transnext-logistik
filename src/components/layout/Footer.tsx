import Link from "next/link"
import { MapPin, Phone, Mail, Facebook, Instagram, Linkedin } from "lucide-react"
import { TransNextLogo } from "@/components/ui/logo"

const footerSections = [
  {
    title: "Leistungen",
    links: [
      { title: "Fahrzeugüberführung", href: "/fahrzeugueberfuehrung" },
      { title: "Fahrzeugaufbereitung", href: "/fahrzeugaufbereitung" },
      { title: "An- und Abmeldung", href: "/an-und-abmeldung" }
    ]
  },
  {
    title: "Unternehmen",
    links: [
      { title: "Über uns", href: "/ueber-uns" },
      { title: "Karriere", href: "/karriere" },
      { title: "Referenzen", href: "/referenzen" },
      { title: "FAQ", href: "/faq" }
    ]
  },
  {
    title: "Rechtliches",
    links: [
      { title: "Impressum", href: "/impressum" },
      { title: "Datenschutz", href: "/datenschutz" },
      { title: "Cookie-Präferenzen", href: "#cookie-settings" },
      { title: "Fahrerportal", href: "/fahrerportal" },
      { title: "Admin-Portal", href: "/admin" }
    ]
  }
]

export function Footer() {
  return (
    <footer className="bg-slate-50 border-t">
      <div className="container-wide py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="space-y-4">
            <Link href="/" className="block">
              <TransNextLogo width={180} height={40} showText={true} />
            </Link>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>Ihr zuverlässiger Partner für Fahrzeugüberführung, Aufbereitung und Zulassungsservice aus Bochum.</p>

              <div className="space-y-1 pt-2">
                <div className="flex items-center space-x-2">
                  <MapPin className="h-4 w-4 flex-shrink-0" />
                  <div>
                    <p>Herner Str. 299A</p>
                    <p>44809 Bochum</p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Phone className="h-4 w-4 flex-shrink-0" />
                  <a href="tel:+4915563509886" className="hover:text-primary-blue transition-colors">
                    +49 155 635 098 86
                  </a>
                </div>

                <div className="flex items-center space-x-2">
                  <Mail className="h-4 w-4 flex-shrink-0" />
                  <a href="mailto:info@transnext.de" className="hover:text-primary-blue transition-colors">
                    info@transnext.de
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Sections */}
          {footerSections.map((section) => (
            <div key={section.title} className="space-y-4">
              <h3 className="text-sm font-semibold text-primary-blue">{section.title}</h3>
              <ul className="space-y-2">
                {section.links?.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {link.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Map and Social Section */}
        <div className="mt-12 pt-8 border-t">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Social Media */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-primary-blue">Folgen Sie uns</h3>
              <div className="flex space-x-4">
                <a
                  href="https://www.facebook.com/transnext"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-primary-blue transition-colors"
                  aria-label="Facebook"
                >
                  <Facebook className="h-5 w-5" />
                </a>
                <a
                  href="https://www.instagram.com/transnextlogistik/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-primary-blue transition-colors"
                  aria-label="Instagram"
                >
                  <Instagram className="h-5 w-5" />
                </a>
                <a
                  href="https://de.linkedin.com/company/transnext-logistik?trk=public_jobs_topcard_logo"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-primary-blue transition-colors"
                  aria-label="LinkedIn"
                >
                  <Linkedin className="h-5 w-5" />
                </a>
              </div>
            </div>

            {/* Interactive Map */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-primary-blue">Unser Standort</h3>
              <a
                href="https://www.google.com/maps/search/?api=1&query=Herner+Str.+299A+44809+Bochum"
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-lg overflow-hidden shadow-md border border-border bg-gradient-to-br from-blue-50 to-slate-100 hover:shadow-lg transition-shadow"
              >
                <div className="relative h-[250px] flex flex-col items-center justify-center p-8 text-center">
                  <img
                    src="/images/standort-logo.png"
                    alt="TransNext Logistik Logo"
                    className="h-20 w-20 object-contain mb-4"
                  />
                  <div className="space-y-2">
                    <h4 className="font-semibold text-lg text-foreground">TransNext Logistik</h4>
                    <p className="text-sm text-muted-foreground">Herner Str. 299A</p>
                    <p className="text-sm text-muted-foreground">44809 Bochum</p>
                    <p className="text-xs text-primary-blue font-medium mt-4 flex items-center justify-center gap-2">
                      <MapPin className="h-4 w-4" />
                      In Google Maps öffnen
                    </p>
                  </div>
                </div>
              </a>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-8 pt-8 border-t text-center">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} TransNext Logistik. Alle Rechte vorbehalten.
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Aus Bochum – für Deutschland und Europa
          </p>
        </div>
      </div>
    </footer>
  )
}
