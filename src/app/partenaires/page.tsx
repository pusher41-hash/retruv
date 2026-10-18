import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { partners } from "@/db/schema";
import { PageHeader } from "@/components/ui";
import { COUNTRIES, countryName } from "@/lib/constants";
import {
  Building2,
  GraduationCap,
  Train,
  Building,
  Hotel,
  Store,
  Landmark,
  Plane,
  Bus,
  ShieldCheck,
  Handshake,
  Briefcase,
  MapPin,
  ShoppingBag,
  Sparkles,
  Heart,
  Zap,
  Globe2,
  Filter,
  Flag,
  Search,
  type LucideIcon,
} from "lucide-react";

export const dynamic = "force-dynamic";

const FALLBACK_PARTNERS: { title: string; desc: string; icon: LucideIcon; emoji: string }[] = [
  {
    title: "🚆 Gares & Transport",
    desc: "🏟️ Gares, ✈️ aéroports, 🚌 réseaux de bus, partout dans le monde 🌍. Dépôt d'objets, récupération, visibilité. Le point devient un service public utile ✨",
    icon: Train,
    emoji: "🚆",
  },
  {
    title: "🎓 Universités & Campus",
    desc: "🏫 Établissements d'enseignement, quel que soit le pays 🌍. Déclarations de documents étudiants, récupération au secrétariat, confiance institutionnelle 🎓✨",
    icon: GraduationCap,
    emoji: "🎓",
  },
  {
    title: "🏢 Entreprises & Commerces",
    desc: "🏨 Hôtels, 🛍️ centres commerciaux, 🏢 entreprises. Intégration du moteur de matching via 🔌 API. Réputation et service client 💼✨",
    icon: Building2,
    emoji: "🏢",
  },
];

const iconMap: Record<string, LucideIcon> = {
  Train,
  GraduationCap,
  Building2,
  Building,
  Hotel,
  Store,
  Landmark,
  Plane,
  Bus,
  ShieldCheck,
  Handshake,
  Briefcase,
  MapPin,
  ShoppingBag,
};

async function getPartners() {
  try {
    const rows = await db
      .select()
      .from(partners)
      .where(eq(partners.isActive, true))
      .orderBy(asc(partners.sortOrder), asc(partners.createdAt));
    return rows.length > 0 ? rows : null;
  } catch {
    return null;
  }
}

type SearchParams = { country?: string; type?: string };

export default async function PartnersPage({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  const params = await searchParams;
  const selectedCountry = params?.country?.toUpperCase() ?? "";
  const dbPartnersAll = await getPartners();

  // Filter by country if selected
  const dbPartners = selectedCountry && dbPartnersAll
    ? dbPartnersAll.filter((p) => p.country === selectedCountry)
    : dbPartnersAll;

  // Count per country for filter pills
  const countryCounts = new Map<string, number>();
  if (dbPartnersAll) {
    for (const p of dbPartnersAll) {
      const c = p.country ?? "IT";
      countryCounts.set(c, (countryCounts.get(c) ?? 0) + 1);
    }
  }
  const activeCountries = Array.from(countryCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12); // top 12 for pill row


  return (
    <div className="container-app py-8">
      <PageHeader
        eyebrow="✨ Modèle économique moderne"
        title="🤝 Partenaires RETRUV"
        description="✨ Comment une 🚆 gare, 🏨 un hôtel, 🎓 une université ou 🚌 un transporteur peut devenir un Point RETRUV et utiliser le moteur de matching — dans n'importe quel pays 🌍💙"
      />

      {/* Hero badge */}
      <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-sky-50 to-blue-50 border border-sky-200 px-4 py-2 text-xs font-bold text-sky-700">
        <Sparkles className="h-4 w-4" /> ✨ Réseau mondial • Moderne • Emoji-friendly <Globe2 className="h-4 w-4" />
      </div>

      {/* 🌍 Filtres pays — moderne RETRUV */}
      {dbPartnersAll && dbPartnersAll.length > 8 ? (
        <div className="card p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-black text-retruv-navy">
              <Filter className="h-4 w-4 text-sky-600" /> 🌍 Filtrer par pays
              <span className="rounded-full bg-sky-50 border border-sky-200 px-2 py-0.5 text-xs font-bold text-sky-700">{dbPartners?.length ?? 0} / {dbPartnersAll.length} affichés</span>
            </div>
            <form method="GET" className="flex gap-2">
              <div className="relative">
                <Flag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <select name="country" defaultValue={selectedCountry} className="select pl-10 pr-8 py-2 text-sm">
                  <option value="">🌍 Tous les pays ({dbPartnersAll.length})</option>
                  {COUNTRIES.filter(c => countryCounts.has(c.code)).map(c => (
                    <option key={c.code} value={c.code}> {c.name} — {countryCounts.get(c.code)} partenaire(s)</option>
                  ))}
                </select>
              </div>
              <button type="submit" className="btn btn-primary py-2 px-4 text-sm gap-1"><Search className="h-4 w-4" /> Filtrer</button>
              <Link href="/partenaires" className="btn btn-secondary py-2 px-3 text-sm">🔄 Tous</Link>
            </form>
          </div>
          {/* Pill row */}
          <div className="mt-3 flex flex-wrap gap-2">
            <Link href="/partenaires" className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition ${!selectedCountry ? "bg-retruv-blue text-white border-retruv-blue" : "bg-white text-slate-600 border-slate-200 hover:border-sky-300"}`}>
              🌍 Tous <span className="bg-white/20 px-1.5 py-0.5 rounded-full text-xs">{dbPartnersAll.length}</span>
            </Link>
            {activeCountries.map(([code, count]) => {
              const c = COUNTRIES.find(x => x.code === code);
              const isActive = selectedCountry === code;
              return (
                <Link key={code} href={`/partenaires?country=${code}`} className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition ${isActive ? "bg-retruv-blue text-white border-retruv-blue shadow-md" : "bg-white text-slate-600 border-slate-200 hover:border-sky-300 hover:text-sky-700"}`}>
                  🌍 {c?.name ?? code} <span className={`${isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"} px-1.5 py-0.5 rounded-full`}>{count}</span>
                </Link>
              );
            })}
            {selectedCountry && !countryCounts.has(selectedCountry) ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-3 py-1.5 text-xs font-bold text-amber-700">⚠️ Aucun partenaire pour {countryName(selectedCountry)} — essaie un autre pays</span>
            ) : null}
          </div>
          {selectedCountry ? (
            <div className="mt-3 rounded-xl bg-gradient-to-r from-sky-50 to-blue-50 border border-sky-100 px-3 py-2 flex items-center gap-2 text-sm">
              <Search className="h-4 w-4 text-sky-600" />
              <span className="font-semibold text-sky-800">📍 Affichage : <span className="font-black">{countryName(selectedCountry)}</span> — {dbPartners?.length ?? 0} partenaire(s) officiel(s) 🌍✨</span>
              <Link href="/partenaires" className="ml-auto text-xs font-bold text-sky-600 hover:underline">✕ Effacer filtre</Link>
            </div>
          ) : null}
        </div>
      ) : null}

      {dbPartners ? (
        <div className="grid gap-5 md:grid-cols-3">
          {dbPartners.map((p) => {
            const Icon = iconMap[p.icon] ?? Building2;
            return (
              <div key={p.id} className="card p-6 flex flex-col hover:shadow-lift hover:border-sky-200 transition-all group">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-50 to-blue-50 border border-sky-100 group-hover:scale-105 transition-transform shadow-sm">
                  <Icon className="h-7 w-7 text-retruv-blue" strokeWidth={2} />
                </div>
                <h3 className="mt-4 text-lg font-black text-retruv-navy flex items-center gap-2">
                  {p.title}
                  <span className="text-sm opacity-60">✨</span>
                </h3>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed flex-1">{p.description}</p>
                {p.city || p.website ? (
                  <div className="mt-4 flex flex-wrap gap-2 text-xs">
                    {p.city ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-sky-50 to-blue-50 px-3 py-1.5 font-bold text-sky-700 border border-sky-200">
                        <MapPin className="h-3.5 w-3.5" /> 📍 {p.city}{p.country ? ` · ${p.country} 🌍` : ""}
                      </span>
                    ) : null}
                    {p.website ? (
                      <a href={p.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 font-bold text-sky-700 border border-sky-200 hover:bg-sky-50 hover:border-sky-300 transition">
                        🌐 <Globe2 className="h-3.5 w-3.5" /> Site web
                      </a>
                    ) : null}
                  </div>
                ) : null}
                {p.logoUrl ? (
                  <div className="mt-4 rounded-xl bg-slate-50 border border-slate-200 p-3 flex items-center justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.logoUrl} alt={`Logo ${p.title}`} className="h-10 object-contain" loading="lazy" />
                  </div>
                ) : null}
                <div className="mt-4 flex items-center gap-1 text-xs text-slate-400">
                  <Heart className="h-3 w-3 text-rose-400" /> <span>Partenaire de confiance RETRUV</span> 💙
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-3">
          {FALLBACK_PARTNERS.map((p) => (
            <div key={p.title} className="card p-6 hover:shadow-lift hover:border-sky-200 transition-all group">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-50 to-blue-50 border border-sky-100 group-hover:scale-105 transition-transform">
                <p.icon className="h-7 w-7 text-retruv-blue" strokeWidth={2} />
              </div>
              <h3 className="mt-4 text-lg font-black text-retruv-navy flex items-center gap-2">{p.title} <span className="text-sm">✨</span></h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">{p.desc}</p>
              <div className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-sky-600 bg-sky-50 px-2.5 py-1 rounded-full border border-sky-100">
                {p.emoji} Partenaire officiel <Sparkles className="h-3 w-3" />
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="card mt-8 overflow-hidden">
        <div className="bg-gradient-to-r from-retruv-navy via-[#0e2a5a] to-retruv-navy p-6 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-sky-500/10 to-transparent rounded-full blur-3xl" />
          <h3 className="text-xl font-black flex items-center gap-3 relative">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 border border-white/20">
              <Zap className="h-5 w-5 text-amber-300" />
            </span>
            ✨ Le modèle en 3 piliers
            <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-white/10 border border-white/20 px-3 py-1 text-xs font-bold text-sky-200">Moderne 🚀</span>
          </h3>
          <div className="mt-6 grid gap-6 md:grid-cols-3 relative">
            <div className="rounded-2xl bg-white/5 border border-white/10 p-4 backdrop-blur-sm hover:bg-white/10 transition">
              <h4 className="font-black text-sky-200 flex items-center gap-2">🆓 Gratuit <Heart className="h-4 w-4 text-rose-300" /></h4>
              <p className="mt-2 text-sm text-sky-100/90 leading-relaxed">Déclaration, récupération, chat : libres pour tous 💬 Aucun biais de classe 💙 Tout le monde y a droit 🌍</p>
            </div>
            <div className="rounded-2xl bg-white/5 border border-white/10 p-4 backdrop-blur-sm hover:bg-white/10 transition">
              <h4 className="font-black text-sky-200 flex items-center gap-2">🤝 Partenaires <Sparkles className="h-4 w-4 text-amber-300" /></h4>
              <p className="mt-2 text-sm text-sky-100/90 leading-relaxed">Points RETRUV, entreprises : visibilité 👀, service 🛎️, réputation ⭐ Intégration 🔌 API ✨</p>
            </div>
            <div className="rounded-2xl bg-white/5 border border-white/10 p-4 backdrop-blur-sm hover:bg-white/10 transition">
              <h4 className="font-black text-sky-200 flex items-center gap-2">🔌 API <Zap className="h-4 w-4 text-sky-300" /></h4>
              <p className="mt-2 text-sm text-sky-100/90 leading-relaxed">Le moteur de matching peut être utilisé par d'autres plateformes 💻 Licence B2B 📈 Moderne & puissant 🚀</p>
            </div>
          </div>
        </div>
        <div className="bg-slate-50 border-t border-slate-100 px-6 py-3 flex items-center justify-between text-xs text-slate-500">
          <span className="flex items-center gap-2">💡 <span className="font-semibold">RETRUV</span> — Retrouvons ce qui compte 💙🌍</span>
          <span className="hidden sm:flex items-center gap-1">Fait avec <Heart className="h-3 w-3 text-rose-500 fill-rose-500" /> à Bobo-Dioulasso 🇧🇫</span>
        </div>
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/points" className="btn btn-primary gap-2">
          <MapPin className="h-4 w-4" /> 📍 Voir les points actifs
        </Link>
        <Link href="/hub" className="btn btn-secondary gap-2">
          <Globe2 className="h-4 w-4" /> 🌍 Explorer le réseau mondial
        </Link>
        <Link href="/admin/partenaires" className="btn btn-secondary gap-2 border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100">
          <Building2 className="h-4 w-4" /> ✨ Gérer les partenaires (admin)
        </Link>
      </div>

      <div className="mt-4 text-center">
        <p className="text-xs text-slate-400">✨ Page modernisée avec 💙 emojis, 🎨 icônes Lucide & 🌍 style RETRUV — 100% administrable sans code 🚀</p>
      </div>
    </div>
  );
}
