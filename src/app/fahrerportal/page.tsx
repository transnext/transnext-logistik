"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { TransNextLogo } from "@/components/ui/logo"
import { LogIn } from "lucide-react"
import { signIn, getUserProfile } from "@/lib/api"

export default function FahrerportalLogin() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      const { user } = await signIn(email, password)

      if (!user) {
        throw new Error("Kein Benutzer gefunden")
      }

      // Prüfe ob Benutzer ein Fahrer ist
      const profile = await getUserProfile(user.id)

      if (profile.role !== 'fahrer') {
        setError("Dieser Zugang ist nur für Fahrer verfügbar")
        setIsLoading(false)
        return
      }

      // Login erfolgreich
      router.push("/fahrerportal/dashboard")
    } catch (err) {
      console.error("Login Fehler:", err)
      setError(err instanceof Error ? err.message : "Ungültige Zugangsdaten")
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 to-white p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <TransNextLogo width={200} height={60} showText={true} />
          </div>
          <div>
            <CardTitle className="text-2xl text-primary-blue">Fahrerportal</CardTitle>
            <CardDescription>Melden Sie sich mit Ihren Zugangsdaten an</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-Mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="ihre.email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Passwort</Label>
              <Input
                id="password"
                type="password"
                placeholder="Ihr Passwort"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                required
              />
            </div>
            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}
            <Button
              type="submit"
              className="w-full bg-primary-blue hover-primary-darken"
              disabled={isLoading}
            >
              <LogIn className="mr-2 h-4 w-4" />
              {isLoading ? "Anmelden..." : "Anmelden"}
            </Button>
          </form>
          <div className="mt-6 text-center text-sm text-muted-foreground">
            <p>Bei Problemen mit dem Zugang wenden Sie sich bitte an:</p>
            <p className="font-medium text-primary-blue mt-1">dispo@transnext.de</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
