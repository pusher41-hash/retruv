"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import {
  Clapperboard,
  Globe2,
  Handshake,
  Home,
  Link2,
  Lock,
  LogOut,
  MapPin,
  Menu,
  MessageCircle,
  Search,
  ShieldCheck,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

type Me = { id: string; fullName: string; role: string } | null;

const links: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/", label: "Accueil", icon: Home },
  { href: "/lost", label: "Perdus", icon: Search },
  { href: "/found", label: "Trouvés", icon: Sparkles },
  { href: "/hub", label: "Monde", icon: Globe2 },
  { href: "/matches", label: "Matchs", icon: Link2 },
  { href: "/messages", label: "Messages", icon: MessageCircle },
  { href: "/points", label: "Points", icon: MapPin },
  { href: "/demo", label: "Démo", icon: Clapperboard },
  { href: "/partenaires", label: "Partenaires", icon: Handshake },
  { href: "/confidentialite", label: "Confidentialité", icon: Lock },
  { href: "/securite", label: "Sécurité", icon: ShieldCheck },
];

export default function MinimalNav() {
  const pathname = usePathname();
  const [me, setMe] = useState<Me>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setMe(d.user))
      .catch(() => setMe(null));
  }, [pathname]);

  return (
    <header className="sticky top-0 z-50 nav-blur">
      <div className="container-app flex h-16 items-center justify-between gap-3">
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-[#0b1f3a] text-lg font-black text-white shadow-sm">
            R
            <span className="absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full bg-[#0d9488] ring-2 ring-white" />
          </div>
          <div>
            <div className="text-lg font-extrabold tracking-tight text-[#0b1f3a] leading-none">RETRUV</div>
            <div className="hidden sm:block text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">International</div>
          </div>
        </Link>

        <nav className="hidden lg:flex items-center gap-1">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                "rounded-lg px-3 py-2 text-sm font-bold transition",
                pathname === l.href
                  ? "bg-[#0e4d92] text-white shadow-md shadow-blue-900/20"
                  : "text-slate-700 hover:bg-slate-100 hover:text-[#0e4d92]"
              )}
            >
              {l.label}
            </Link>
          ))}
          {me?.role === "admin" || me?.role === "moderator" ? (
            <Link href="/admin" className={cn("rounded-lg px-3 py-2 text-sm font-bold transition", pathname.startsWith("/admin") ? "bg-[#0e4d92] text-white shadow-md shadow-blue-900/20" : "text-slate-700 hover:bg-slate-100")}>Admin</Link>
          ) : null}
        </nav>

        <div className="flex items-center gap-2">
          {me ? (
            <>
              <Link href="/dashboard" className="hidden sm:inline-flex rounded-full bg-slate-100 px-4 py-2 text-sm font-extrabold text-slate-800 hover:bg-slate-200 transition">{me.fullName.split(" ")[0]}</Link>
              <button onClick={async () => { await fetch("/api/auth/logout", { method: "POST" }); window.location.href = "/"; }} className="btn btn-secondary text-sm">
                <LogOut className="h-4 w-4" />
                Sortir
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="btn btn-secondary text-sm hidden sm:inline-flex">Connexion</Link>
              {process.env.NODE_ENV !== "production" ? (
                <Link href="/quick-login" className="btn btn-primary text-sm">Connexion rapide</Link>
              ) : null}
            </>
          )}
          <button onClick={() => setOpen(!open)} className="lg:hidden btn btn-secondary text-sm" aria-label="Menu">
            <Menu className="h-4 w-4" />
          </button>
        </div>
      </div>

      {open && (
        <div className="lg:hidden border-t border-slate-100 bg-white/95 backdrop-blur-md px-4 py-3 shadow-xl">
          <div className="grid gap-1">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-2 rounded-xl px-3 py-3 text-base font-bold",
                  pathname === l.href ? "bg-[#0b1f3a] text-white" : "text-slate-700"
                )}
              >
                <l.icon className="h-4 w-4" />
                {l.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
