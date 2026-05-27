"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

export default function ClientBody({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isFahrerportal = pathname?.startsWith("/fahrerportal");
  const isAdminPortal = pathname?.startsWith("/admin");

  // Remove any extension-added classes during hydration
  useEffect(() => {
    // This runs only on the client after hydration
    document.body.className = "antialiased";
  }, []);

  // Fahrerportal und Admin-Portal haben kein Header/Footer der Hauptseite
  if (isFahrerportal || isAdminPortal) {
    return <div className="antialiased">{children}</div>;
  }

  // Normale Seiten mit Header und Footer
  return (
    <div className="antialiased">
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </div>
    </div>
  );
}
