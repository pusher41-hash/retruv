import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import MinimalNav from "@/components/minimal-nav";
import "./globals.css";

export const metadata: Metadata = {
  title: "RETRUV — Retrouvons ce qui compte",
  description:
    "Plateforme intelligente de mise en relation entre personnes ayant perdu quelque chose et personnes l'ayant retrouvé. Burkina Faso et Afrique de l'Ouest.",
  applicationName: "RETRUV",
  keywords: [
    "objets perdus",
    "objets trouvés",
    "Burkina Faso",
    "RETRUV",
    "passeport",
    "CNI",
    "téléphone perdu",
  ],
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "RETRUV",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#0e4d92",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <MinimalNav />
        <main className="safe-bottom min-h-screen">{children}</main>
      </body>
    </html>
  );
}
