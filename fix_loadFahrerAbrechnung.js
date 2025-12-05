const fs = require('fs');

const filePath = 'src/app/admin/dashboard/page.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Ersetze die loadFahrerAbrechnung Funktion
const oldFunction = `const loadFahrerAbrechnung = async (fahrerId: number) => {
  setSelectedFahrerId(fahrerId)
  // Filter Touren für diesen Fahrer
  const fahrerName = fahrer.find(f => f.id === fahrerId)
  if (!fahrerName) return
  const fahrerTourenFiltered = touren.filter(t => t.fahrer === \`\${fahrerName.vorname} \${fahrerName.nachname}\`)
  const fahrerAuslagenFiltered = auslagen.filter(a => a.fahrer === \`\${fahrerName.vorname} \${fahrerName.nachname}\`)
  setFahrerTouren(fahrerTourenFiltered)
  setFahrerAuslagen(fahrerAuslagenFiltered)
  // Lade Vormonat-Überschuss
  try {
    // Berechne Vormonat (aktuell Dezember 2024, Vormonat = November 2024)
    const now = new Date()
    const currentMonth = \`\${now.getFullYear()}-\${String(now.getMonth() + 1).padStart(2, '0')}\`
    const [year, month] = currentMonth.split('-')
    const date = new Date(parseInt(year), parseInt(month) - 2, 1) // -2 weil Monat 0-basiert ist
    const vormonat = \`\${date.getFullYear()}-\${String(date.getMonth() + 1).padStart(2, '0')}\`
    // Hole user_id vom Fahrer
    const fahrerData = await getAllFahrerAdmin()
    const fahrerInfo = fahrerData.find((f: any) => f.id === fahrerId)
    if (fahrerInfo && fahrerInfo.user_id) {
      // Prüfe auf manuellen Überschuss
      const manuellerUeberschuss = await getMonatsueberschuss(fahrerInfo.user_id, vormonat)
      if (manuellerUeberschuss) {
        console.log(\`Manueller Überschuss für \${fahrerName.vorname} \${fahrerName.nachname} (\${vormonat}):\`, manuellerUeberschuss.ueberschuss)
        setFahrerVormonatUeberschuss(manuellerUeberschuss.ueberschuss)
      } else {
        // Kein manueller Überschuss, berechne aus Touren
        const vormonatTouren = touren.filter(t =>
          t.fahrer === \`\${fahrerName.vorname} \${fahrerName.nachname}\` &&
          t.datum.startsWith(vormonat)
        )
        const vormonatGesamt = vormonatTouren.reduce((sum, t) => {
          const km = parseFloat(t.gefahreneKm) || 0
          const verdienst = t.istRuecklaufer ? 0 : calculateTourVerdienst(km, t.wartezeit)
          return sum + verdienst
        }, 0)
        const { ueberschuss } = calculateMonthlyPayout(vormonatGesamt)
        setFahrerVormonatUeberschuss(ueberschuss)
      }
    } else {
      setFahrerVormonatUeberschuss(0)
    }
  } catch (error) {
    console.error("Fehler beim Laden des Vormonat-Überschusses:", error)
    setFahrerVormonatUeberschuss(0)
  }
}`;

const newFunction = `const loadFahrerAbrechnung = async (fahrerId: number) => {
  setSelectedFahrerId(fahrerId)
  setFahrerVormonatUeberschuss(0) // Reset
  
  // Filter Touren für diesen Fahrer
  const fahrerData = fahrer.find(f => f.id === fahrerId)
  if (!fahrerData) return
  
  const fahrerTourenFiltered = touren.filter(t => t.fahrer === \`\${fahrerData.vorname} \${fahrerData.nachname}\`)
  const fahrerAuslagenFiltered = auslagen.filter(a => a.fahrer === \`\${fahrerData.vorname} \${fahrerData.nachname}\`)
  setFahrerTouren(fahrerTourenFiltered)
  setFahrerAuslagen(fahrerAuslagenFiltered)
  
  // Lade Vormonat-Überschuss
  try {
    // Berechne Vormonat (aktuell Dezember 2024, Vormonat = November 2024)
    const now = new Date()
    const currentMonth = \`\${now.getFullYear()}-\${String(now.getMonth() + 1).padStart(2, '0')}\`
    const [year, month] = currentMonth.split('-')
    const date = new Date(parseInt(year), parseInt(month) - 2, 1)
    const vormonat = \`\${date.getFullYear()}-\${String(date.getMonth() + 1).padStart(2, '0')}\`
    
    console.log('=== VORMONAT-ÜBERSCHUSS DEBUG ===')
    console.log('Fahrer:', fahrerData.vorname, fahrerData.nachname)
    console.log('Fahrer-ID:', fahrerId)
    console.log('User-ID:', (fahrerData as any).user_id)
    console.log('Vormonat:', vormonat)
    
    // Verwende die bereits geladenen Fahrer-Daten
    const userId = (fahrerData as any).user_id
    
    if (userId) {
      // Prüfe auf manuellen Überschuss
      const manuellerUeberschuss = await getMonatsueberschuss(userId, vormonat)
      console.log('Manueller Überschuss Ergebnis:', manuellerUeberschuss)
      
      if (manuellerUeberschuss && manuellerUeberschuss.ueberschuss) {
        console.log(\`✅ Manueller Überschuss gefunden: €\${manuellerUeberschuss.ueberschuss}\`)
        setFahrerVormonatUeberschuss(Number(manuellerUeberschuss.ueberschuss))
      } else {
        console.log('ℹ️ Kein manueller Überschuss, berechne aus Touren')
        // Kein manueller Überschuss, berechne aus Touren
        const vormonatTouren = touren.filter(t =>
          t.fahrer === \`\${fahrerData.vorname} \${fahrerData.nachname}\` &&
          t.datum.startsWith(vormonat)
        )
        console.log('Vormonat-Touren gefunden:', vormonatTouren.length)
        
        const vormonatGesamt = vormonatTouren.reduce((sum, t) => {
          const km = parseFloat(t.gefahreneKm) || 0
          const verdienst = t.istRuecklaufer ? 0 : calculateTourVerdienst(km, t.wartezeit)
          return sum + verdienst
        }, 0)
        
        const { ueberschuss } = calculateMonthlyPayout(vormonatGesamt)
        console.log('Berechneter Überschuss:', ueberschuss)
        setFahrerVormonatUeberschuss(ueberschuss)
      }
    } else {
      console.warn('❌ Keine user_id gefunden für Fahrer:', fahrerData.vorname, fahrerData.nachname)
      setFahrerVormonatUeberschuss(0)
    }
  } catch (error) {
    console.error("❌ Fehler beim Laden des Vormonat-Überschusses:", error)
    setFahrerVormonatUeberschuss(0)
  }
}`;

content = content.replace(oldFunction, newFunction);

fs.writeFileSync(filePath, content, 'utf8');
console.log('✅ loadFahrerAbrechnung Funktion aktualisiert!');
