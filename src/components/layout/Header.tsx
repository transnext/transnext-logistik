"use client"

import Link from "next/link"
import { useState } from "react"
import { Menu, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { TransNextLogo, TransNextIcon } from "@/components/ui/logo"

const mainNavItems = [
  {
    title: "Leistungen",
    items: [
      {
        title: "Fahrzeugüberführung",
        href: "/fahrzeugueberfuehrung",
        description: "Auf Eigen- oder Fremdachse – vom Ruhrgebiet bis Europa"
      },
      {
        title: "Fahrzeugaufbereitung",
        href: "/fahrzeugaufbereitung",
        description: "Wert- und lackschonend, innen wie außen"
      },
      {
        title: "An- und Abmeldung",
        href: "/an-und-abmeldung",
        description: "Zuverlässige Zulassungsservices – schnell und korrekt"
      }
    ]
  }
]

const navigationItems = [
  { title: "Referenzen", href: "/referenzen" },
  { title: "Karriere", href: "/karriere" },
  { title: "Über uns", href: "/ueber-uns" },
  { title: "FAQ", href: "/faq" },
  { title: "Kontakt", href: "/kontakt" }
]

export function Header() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container-wide">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            {/* Mobile: Show only icon on very small screens */}
            <div className="sm:hidden">
              <TransNextIcon size={32} />
            </div>
            {/* Desktop: Show full logo */}
            <div className="hidden sm:block">
              <TransNextLogo
                className="h-8 md:h-10"
                width={160}
                height={35}
                showText={true}
              />
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-6">
            <NavigationMenu>
              <NavigationMenuList>
                {/* Leistungen Dropdown */}
                <NavigationMenuItem>
                  <NavigationMenuTrigger className="text-base">
                    Leistungen
                  </NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <div className="w-[400px] p-4">
                      <div className="grid gap-3">
                        {mainNavItems[0].items.map((item) => (
                          <Link
                            key={item.href}
                            href={item.href}
                            className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                          >
                            <div className="text-sm font-medium leading-none">
                              {item.title}
                            </div>
                            <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                              {item.description}
                            </p>
                          </Link>
                        ))}
                      </div>
                    </div>
                  </NavigationMenuContent>
                </NavigationMenuItem>

                {/* Other Navigation Items */}
                {navigationItems.map((item) => (
                  <NavigationMenuItem key={item.href}>
                    <Link href={item.href} className={navigationMenuTriggerStyle()}>
                      {item.title}
                    </Link>
                  </NavigationMenuItem>
                ))}
              </NavigationMenuList>
            </NavigationMenu>

            {/* CTA Button */}
            <Link href="/kontakt">
              <Button className="bg-primary-blue hover-primary-darken text-white font-medium">
                Angebot anfordern
              </Button>
            </Link>
          </div>

          {/* Mobile Navigation */}
          <div className="md:hidden">
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-6 w-6" />
                  <span className="sr-only">Menü öffnen</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px]">
                <SheetHeader>
                  <SheetTitle>Navigation</SheetTitle>
                  <SheetDescription>
                    Entdecken Sie unsere Leistungen und erfahren Sie mehr über TransNext Logistik.
                  </SheetDescription>
                </SheetHeader>
                <div className="mt-6 space-y-4">
                  {/* Mobile CTA Button */}
                  <Link href="/kontakt" onClick={() => setIsOpen(false)}>
                    <Button className="w-full bg-primary-blue hover-primary-darken text-white font-medium">
                      Angebot anfordern
                    </Button>
                  </Link>

                  {/* Leistungen */}
                  <div className="space-y-2">
                    <h3 className="font-semibold text-primary-blue">Leistungen</h3>
                    {mainNavItems[0].items.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className="block py-2 pl-4 text-sm text-muted-foreground hover:text-foreground"
                        onClick={() => setIsOpen(false)}
                      >
                        {item.title}
                      </Link>
                    ))}
                  </div>

                  {/* Other Navigation Items */}
                  <div className="space-y-2">
                    {navigationItems.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className="block py-2 text-sm font-medium hover:text-primary-blue"
                        onClick={() => setIsOpen(false)}
                      >
                        {item.title}
                      </Link>
                    ))}
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  )
}
