import Link from "next/link"
import { Button } from "@/components/ui/button"
import { CheckCircle } from "lucide-react"

export default function DankePage() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <div className="container-wide">
        <div className="max-w-2xl mx-auto text-center space-y-6 p-8">
          <div className="flex justify-center">
            <div className="bg-green-100 rounded-full p-6">
              <CheckCircle className="h-16 w-16 text-green-600" />
            </div>
          </div>

          <h1 className="text-4xl font-bold text-primary-blue">
            Vielen Dank!
          </h1>

          <p className="text-xl text-muted-foreground">
            Ihre Nachricht wurde erfolgreich übermittelt.
          </p>

          <p className="text-muted-foreground">
            Wir haben Ihre Anfrage erhalten und werden uns schnellstmöglich bei Ihnen melden.
            In der Regel antworten wir innerhalb von 24 Stunden.
          </p>

          <div className="pt-6">
            <Link href="/">
              <Button size="lg" className="bg-primary-blue hover-primary-darken">
                Zurück zur Startseite
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
