"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { TransNextLogo } from "@/components/ui/logo"
import { ShieldCheck, Lock, User } from "lucide-react"
import { signIn, getUserProfile } from "@/lib/api"

export default function AdminLoginPage() {
  const router = useRouter()
  const [credentials, setCredentials] = useState({
    email: "",
    password: ""
  })
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      const { user } = await signIn(credentials.email, credentials.password)

      if (!user) {
        throw new Error("Anmeldung fehlgeschlagen")
      }

      // Prüfe ob Benutzer Admin ist
      const profile = await getUserProfile(user.id)

      if (profile.role !== 'admin') {
        setError("Sie haben keine Admin-Berechtigung")
        setIsLoading(false)
        return
      }

      // Login erfolgreich
      router.push("/admin/dashboard")
    } catch (err) {
      console.error("Login Fehler:", err)
      setError("Ungültige Zugangsdaten oder keine Admin-Berechtigung")
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex flex-col items-center justify-center p-4">
      {/* Logo */}
      <div className="mb-12">
        <TransNextLogo width={250} height={75} showText={true} />
      </div>

      {/* Login Card */}
      <Card className="w-full max-w-md shadow-xl border-2">
        <CardHeader className="text-center space-y-2 pb-8">
          <CardTitle className="text-2xl text-primary-blue">Admin-Portal</CardTitle>
          <CardDescription>
            Melden Sie sich an, um Touren und Auslagen zu verwalten
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                E-Mail
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@transnext.de"
                value={credentials.email}
                onChange={(e) => setCredentials({ ...credentials, email: e.target.value })}
                className="border-gray-300 focus:border-primary-blue"
                disabled={isLoading}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="flex items-center gap-2">
                <Lock className="h-4 w-4" />
                Passwort
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={credentials.password}
                onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                className="border-gray-300 focus:border-primary-blue"
                disabled={isLoading}
                required
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full bg-primary-blue hover:bg-blue-700 text-white font-semibold py-6"
              disabled={isLoading}
            >
              {isLoading ? "Anmelden..." : "Anmelden"}
            </Button>

            <div className="text-center text-sm text-gray-500 mt-4">
              <p className="bg-blue-50 border border-blue-200 text-blue-800 px-3 py-2 rounded-lg">
                <ShieldCheck className="h-4 w-4 inline mr-2" />
                Gesicherte Anmeldung mit Supabase
              </p>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Info Footer */}
      <div className="mt-8 text-center text-sm text-gray-600">
        <p>TransNext Logistik GmbH</p>
        <p className="mt-1">Verwaltungssystem für Touren & Auslagen</p>
      </div>
    </div>
  )
}
