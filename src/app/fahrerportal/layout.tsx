import type { Metadata } from 'next'
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Fahrerportal – TransNext Logistik',
  description: 'Fahrerportal für TransNext Logistik Fahrer',
  robots: 'noindex, nofollow', // Portal soll nicht in Suchmaschinen erscheinen
}

export default function FahrerportalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className={inter.className}>
      {children}
    </div>
  )
}
