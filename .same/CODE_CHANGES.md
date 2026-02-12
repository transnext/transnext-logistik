# 📝 Code-Änderungen für Supabase-Integration

## Übersicht der zu ändernden Dateien

1. ✅ Admin-Login
2. ✅ Fahrerportal-Login
3. ✅ Fahrer-Verwaltung
4. ✅ Arbeitsnachweis hochladen
5. ✅ Auslagennachweis hochladen
6. ✅ Monatsabrechnung laden
7. ✅ Auslagenabrechnung laden
8. ✅ Admin-Dashboard laden

---

# DATEI 1: Admin-Login

**Datei:** `src/app/admin/page.tsx`

## Änderungen oben hinzufügen:

```typescript
import { supabase } from '@/lib/supabase'
```

## handleLogin-Funktion ersetzen:

**ALT (Demo):**
```typescript
const handleLogin = (e: React.FormEvent) => {
  e.preventDefault()
  if (credentials.username && credentials.password) {
    sessionStorage.setItem("admin_logged_in", "true")
    sessionStorage.setItem("admin_name", credentials.username)
    router.push("/admin/dashboard")
  } else {
    setError("Bitte füllen Sie alle Felder aus")
  }
}
```

**NEU (Supabase):**
```typescript
const handleLogin = async (e: React.FormEvent) => {
  e.preventDefault()
  setError("")

  try {
    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email: credentials.username,
      password: credentials.password,
    })

    if (authError) throw authError

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, full_name')
      .eq('id', data.user.id)
      .single()

    if (profileError || profile.role !== 'admin') {
      setError('Kein Admin-Account')
      await supabase.auth.signOut()
      return
    }

    router.push('/admin/dashboard')
  } catch (err: any) {
    setError('Ungültige Anmeldedaten')
  }
}
```

## Input-Label ändern:

```typescript
// ALT:
<Label htmlFor="username">Benutzername</Label>
<Input id="username" type="text" placeholder="admin" .../>

// NEU:
<Label htmlFor="username">E-Mail</Label>
<Input id="username" type="email" placeholder="admin@transnext.de" .../>
```

---

# DATEI 2: Fahrerportal-Login

**Datei:** `src/app/fahrerportal/page.tsx`

## Import hinzufügen:

```typescript
import { supabase } from '@/lib/supabase'
```

## handleLogin ersetzen:

```typescript
const handleLogin = async (e: React.FormEvent) => {
  e.preventDefault()
  setError("")

  try {
    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email: credentials.username,
      password: credentials.password,
    })

    if (authError) throw authError

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, full_name')
      .eq('id', data.user.id)
      .single()

    if (profile?.role !== 'fahrer') {
      setError('Kein Fahrer-Account')
      await supabase.auth.signOut()
      return
    }

    const { data: fahrer } = await supabase
      .from('fahrer')
      .select('status')
      .eq('user_id', data.user.id)
      .single()

    if (fahrer?.status !== 'aktiv') {
      setError('Account deaktiviert')
      await supabase.auth.signOut()
      return
    }

    router.push('/fahrerportal/dashboard')
  } catch (err: any) {
    setError('Ungültige Anmeldedaten')
  }
}
```

## Label ändern:

```typescript
<Label htmlFor="username">E-Mail</Label>
<Input id="username" type="email" placeholder="ihr.name@transnext.de" .../>
```

---

# DATEI 3: Fahrer-Verwaltung (Admin)

**Datei:** `src/app/admin/dashboard/page.tsx`

## Import hinzufügen:

```typescript
import { supabase } from '@/lib/supabase'
```

## handleAddFahrer ersetzen:

```typescript
const handleAddFahrer = async (e: React.FormEvent) => {
  e.preventDefault()

  try {
    // 1. Auth User erstellen
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: `${newFahrer.benutzername}@transnext.de`,
      password: newFahrer.passwort || '',
      options: {
        data: { full_name: `${newFahrer.vorname} ${newFahrer.nachname}` }
      }
    })

    if (authError) throw authError
    if (!authData.user) throw new Error('User nicht erstellt')

    // 2. Profil erstellen
    const { error: profileError } = await supabase
      .from('profiles')
      .insert([{
        id: authData.user.id,
        role: 'fahrer',
        full_name: `${newFahrer.vorname} ${newFahrer.nachname}`
      }])

    if (profileError) throw profileError

    // 3. Fahrer-Daten speichern
    const { error: fahrerError } = await supabase
      .from('fahrer')
      .insert([{
        user_id: authData.user.id,
        vorname: newFahrer.vorname,
        nachname: newFahrer.nachname,
        geburtsdatum: newFahrer.geburtsdatum,
        adresse: newFahrer.adresse,
        plz: newFahrer.plz,
        ort: newFahrer.ort,
        fuehrerschein_nr: newFahrer.fuehrerscheinNr,
        fuehrerschein_datum: newFahrer.fuehrerscheinDatum,
        ausstellende_behoerde: newFahrer.ausstellendeBehoerde,
        fuehrerscheinklassen: newFahrer.fuehrerscheinklassen,
        ausweisnummer: newFahrer.ausweisnummer,
        ausweis_ablauf: newFahrer.ausweisAblauf,
        status: 'aktiv'
      }])

    if (fahrerError) throw fahrerError

    alert(`Fahrer angelegt!\n\nLogin:\nE-Mail: ${newFahrer.benutzername}@transnext.de\nPasswort: ${newFahrer.passwort}`)

    setNewFahrer({ /* reset */ })
    setShowAddFahrer(false)
    loadData()
  } catch (err: any) {
    alert(`Fehler: ${err.message}`)
  }
}
```

## loadData für Fahrer:

```typescript
const loadData = async () => {
  try {
    // Fahrer laden
    const { data: fahrerData } = await supabase
      .from('fahrer')
      .select('*')
      .order('created_at', { ascending: false })

    if (fahrerData) setFahrer(fahrerData)

    // Touren laden
    const { data: touren } = await supabase
      .from('arbeitsnachweise')
      .select('*, profiles(full_name)')
      .order('created_at', { ascending: false })

    if (touren) {
      setTouren(touren.map(t => ({
        ...t,
        fahrer: t.profiles?.full_name || 'Unbekannt',
        gefahreneKm: t.gefahrene_km?.toString() || '0'
      })))
    }

    // Auslagen laden
    const { data: auslagen } = await supabase
      .from('auslagennachweise')
      .select('*, profiles(full_name)')
      .order('created_at', { ascending: false })

    if (auslagen) {
      setAuslagen(auslagen.map(a => ({
        ...a,
        fahrer: a.profiles?.full_name || 'Unbekannt'
      })))
    }
  } catch (err) {
    console.error('Fehler:', err)
  }
}
```

## toggleFahrerStatus:

```typescript
const toggleFahrerStatus = async (userId: string) => {
  const f = fahrer.find(x => x.user_id === userId)
  if (!f) return

  const newStatus = f.status === 'aktiv' ? 'inaktiv' : 'aktiv'

  const { error } = await supabase
    .from('fahrer')
    .update({ status: newStatus })
    .eq('user_id', userId)

  if (!error) loadData()
}
```

## updateTourStatus & updateAuslageStatus:

```typescript
const updateTourStatus = async (id: number, newStatus: string) => {
  const { error } = await supabase
    .from('arbeitsnachweise')
    .update({ status: newStatus })
    .eq('id', id)

  if (!error) loadData()
}

const updateAuslageStatus = async (id: number, newStatus: string) => {
  const { error } = await supabase
    .from('auslagennachweise')
    .update({ status: newStatus })
    .eq('id', id)

  if (!error) loadData()
}
```

---

# DATEI 4: Arbeitsnachweis hochladen

**Datei:** `src/app/fahrerportal/arbeitsnachweis/page.tsx`

## Import:

```typescript
import { supabase } from '@/lib/supabase'
```

## handleSubmit:

```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault()

  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Nicht angemeldet')

    const { error } = await supabase
      .from('arbeitsnachweise')
      .insert([{
        user_id: user.id,
        tour_nr: formData.tourNr,
        datum: formData.datum,
        gefahrene_km: parseFloat(formData.gefahreneKm),
        wartezeit: formData.wartezeit || 'keine',
        status: 'pending'
      }])

    if (error) throw error

    setSaved(true)
    setTimeout(() => {
      setSaved(false)
      setFormData({ tourNr: "", datum: "", gefahreneKm: "", wartezeit: "", beleg: null })
    }, 2000)
  } catch (err: any) {
    alert(`Fehler: ${err.message}`)
  }
}
```

---

# DATEI 5: Auslagennachweis hochladen

**Datei:** `src/app/fahrerportal/auslagennachweis/page.tsx`

## Import:

```typescript
import { supabase } from '@/lib/supabase'
```

## handleSubmit:

```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault()

  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Nicht angemeldet')

    const { error } = await supabase
      .from('auslagennachweise')
      .insert([{
        user_id: user.id,
        tour_nr: formData.tourNr,
        kennzeichen: formData.kennzeichen,
        datum: formData.datum,
        startort: formData.startort,
        zielort: formData.zielort,
        belegart: formData.belegart,
        kosten: parseFloat(formData.kosten),
        status: 'pending'
      }])

    if (error) throw error

    setSaved(true)
    setTimeout(() => {
      setSaved(false)
      setFormData({ /* reset */ })
    }, 2000)
  } catch (err: any) {
    alert(`Fehler: ${err.message}`)
  }
}
```

---

# DATEI 6: Monatsabrechnung

**Datei:** `src/app/fahrerportal/monatsabrechnung/page.tsx`

## Import:

```typescript
import { supabase } from '@/lib/supabase'
```

## loadTouren:

```typescript
const loadTouren = async () => {
  if (!selectedMonth) return

  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data, error } = await supabase
      .from('arbeitsnachweise')
      .select('*')
      .eq('user_id', user.id)
      .gte('datum', `${selectedMonth}-01`)
      .lt('datum', `${selectedMonth}-31`)
      .order('datum', { ascending: false })

    if (error) throw error

    const tourenMitVerdienst = data.map(tour => {
      const km = tour.gefahrene_km
      const base = km * 0.40

      let bonus = 0
      if (tour.wartezeit === "30-60") bonus = 15
      else if (tour.wartezeit === "60-90") bonus = 25
      else if (tour.wartezeit === "90-120") bonus = 35

      return {
        ...tour,
        gefahreneKm: km.toString(),
        verdienst: base + bonus
      }
    })

    setTouren(tourenMitVerdienst)
    setGesamtVerdienst(tourenMitVerdienst.reduce((s, t) => s + t.verdienst, 0))
  } catch (err) {
    console.error(err)
  }
}
```

---

# DATEI 7: Auslagenabrechnung

**Datei:** `src/app/fahrerportal/auslagenabrechnung/page.tsx`

## Import:

```typescript
import { supabase } from '@/lib/supabase'
```

## loadAuslagen:

```typescript
const loadAuslagen = async () => {
  if (!selectedMonth) return

  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data, error } = await supabase
      .from('auslagennachweise')
      .select('*')
      .eq('user_id', user.id)
      .gte('datum', `${selectedMonth}-01`)
      .lt('datum', `${selectedMonth}-31`)
      .order('datum', { ascending: false })

    if (error) throw error

    setAuslagen(data)
    setGesamtKosten(data.reduce((s, a) => s + parseFloat(a.kosten?.toString() || '0'), 0))
  } catch (err) {
    console.error(err)
  }
}
```

---

## ✅ Fertig!

**Alle Code-Änderungen sind dokumentiert.**

Folgen Sie der Reihenfolge und passen Sie jede Datei an.

Nach allen Änderungen:
1. Server neu starten: `bun run dev`
2. Testen Sie alle Flows
3. Bei Fehlern: Browser-Konsole prüfen

**Viel Erfolg! 🚀**
