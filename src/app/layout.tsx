import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import ClientBody from './ClientBody'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'TransNext Logistik – Fahrzeugüberführung, Aufbereitung, An- & Abmeldung aus Bochum',
  description: 'Fahrzeugüberführung auf Eigen- oder Fremdachse – regional, bundes- & europaweit. Aufbereitung und Zulassungsservice. Ein Baum pro Überführung.',
  keywords: 'Fahrzeugüberführung, Fahrzeugaufbereitung, Zulassung, Anmeldung, Abmeldung, Bochum, Ruhrgebiet, Transport',
  authors: [{ name: 'TransNext Logistik' }],
  robots: 'index, follow',
  icons: {
    icon: '/favicon.png',
    shortcut: '/favicon.png',
    apple: '/apple-touch-icon.png',
  },
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="de" className="scroll-smooth">
      <head>
        <link rel="icon" type="image/png" href="/favicon.png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className={inter.className}>
        <ClientBody>{children}</ClientBody>
      </body>
    </html>
  )
}
