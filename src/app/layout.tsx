import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Plus_Jakarta_Sans } from "next/font/google";
import MinimalNav from "@/components/minimal-nav";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  title: "RETRUV — Retrouvons ce qui compte",
  description:
    "Plateforme internationale et intelligente de mise en relation entre personnes ayant perdu quelque chose et personnes l'ayant retrouvé, partout dans le monde.",
  applicationName: "RETRUV",
  keywords: [
    "objets perdus",
    "objets trouvés",
    "RETRUV",
    "passeport",
    "CNI",
    "téléphone perdu",
    "Italie",
    "France",
    "Burkina Faso",
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
    <html lang="fr" className={jakarta.variable}>
      <body>
        <MinimalNav />
        <main className="safe-bottom min-h-screen">{children}</main>
      </body>
    </html>
  );
}
