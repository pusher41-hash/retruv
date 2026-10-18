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
  Globe2,
  Filter,
  Flag,
  Search,
  type LucideIcon,
} from "lucide-react";

export const dynamic = "force-dynamic";

const FALLBACK_PARTNERS: { title: string; desc: string; icon: LucideIcon }[] = [
  {
    title: "Gares & Transport",
    desc: "Gares, aéroports, réseaux de bus, partout dans le monde. Dépôt d'objets, récupération, visibilité. Le point devient un service public utile.",
    icon: Train,
  },
  {
    title: "Universités & Campus",
    desc: "Établissements d'enseignement, quel que soit le pays. Déclarations de documents étudiants, récupération au secrétariat, confiance institutionnelle.",
    icon: GraduationCap,
  },
  {
    title: "Entreprises & Commerces",
    desc: "Hôtels, centres commerciaux, entreprises. Intégration du moteur de matching via API. Réputation et service client.",
    icon: Building2,
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

type SearchParams = { country?: string };

export default async function PartnersPage({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  const params = await searchParams;
  const selectedCountry = params?.country?.toUpperCase() ?? "";
  const dbPartnersAll = await getPartners();
  const dbPartners = selectedCountry && dbPartnersAll ? dbPartnersAll.filter((p) => p.country === selectedCountry) : dbPartnersAll;

  const countryCounts = new Map<string, number>();
  if (dbPartnersAll) {
    for (const p of dbPartnersAll) {
      const c = p.country ?? "IT";
      countryCounts.set(c, (countryCounts.get(c) ?? 0) + 1);
    }
  }
  const activeCountries = Array.from(countryCounts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 12);

  return (
    <div className="container-app py-8">
      <PageHeader
        eyebrow="Modèle économique"
        title="Partenaires RETRUV"
        description="Comment une gare, un hôtel, une université ou un transporteur peut devenir un Point RETRUV et utiliser le moteur de matching — dans n'importe quel pays."
      />

      {dbPartnersAll && dbPartnersAll.length > 8 ? (
        <div className="card p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <Filter className="h-4 w-4 text-slate-500" /> Filtrer par pays
              <span className="rounded-full bg-slate-50 border border-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600">{dbPartners?.length ?? 0} / {dbPartnersAll.length} affichés</span>
            </div>
            <form method="GET" className="flex gap-2">
              <div className="relative">
                <Flag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <select name="country" defaultValue={selectedCountry} className="select pl-10 pr-8 py-2 text-sm">
                  <option value="">Tous les pays ({dbPartnersAll.length})</option>
                  {COUNTRIES.filter((c) => countryCounts.has(c.code)).map((c) => (
                    <option key={c.code} value={c.code}>{c.name} — {countryCounts.get(c.code)} partenaire(s)</option>
                  ))}
                </select>
              </div>
              <button type="submit" className="btn btn-primary py-2 px-4 text-sm gap-1"><Search className="h-4 w-4" /> Filtrer</button>
              <Link href="/partenaires" className="btn btn-secondary py-2 px-3 text-sm">Tous</Link>
            </form>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link href="/partenaires" className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${!selectedCountry ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"}`}>
              Tous <span className="bg-white/20 px-1.5 py-0.5 rounded-full text-xs">{dbPartnersAll.length}</span>
            </Link>
            {activeCountries.map(([code, count]) => {
              const c = COUNTRIES.find((x) => x.code === code);
              const isActive = selectedCountry === code;
              return (
                <Link key={code} href={`/partenaires?country=${code}`} className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${isActive ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"}`}>
                  {c?.name ?? code} <span className={`${isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"} px-1.5 py-0.5 rounded-full`}>{count}</span>
                </Link>
              );
            })}
          </div>
          {selectedCountry ? (
            <div className="mt-3 rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 flex items-center gap-2 text-sm">
              <Search className="h-4 w-4 text-slate-500" />
              <span className="font-medium text-slate-700">Affichage : <span className="font-bold">{countryName(selectedCountry)}</span> — {dbPartners?.length ?? 0} partenaire(s) officiel(s)</span>
              <Link href="/partenaires" className="ml-auto text-xs font-semibold text-slate-600 hover:underline">Effacer filtre</Link>
            </div>
          ) : null}
        </div>
      ) : null}

      {dbPartners ? (
        <div className="grid gap-5 md:grid-cols-3">
          {dbPartners.map((p) => {
            const Icon = iconMap[p.icon] ?? Building2;
            return (
              <div key={p.id} className="card p-6 flex flex-col hover:border-slate-200 transition">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-50 border border-slate-200">
                  <Icon className="h-6 w-6 text-slate-700" strokeWidth={1.75} />
                </div>
                <h3 className="mt-4 text-base font-bold text-slate-900">{p.title}</h3>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed flex-1">{p.description}</p>
                {p.city || p.website ? (
                  <div className="mt-4 flex flex-wrap gap-2 text-xs">
                    {p.city ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-3 py-1 font-medium text-slate-600 border border-slate-200">
                        <MapPin className="h-3 w-3" /> {p.city}{p.country ? ` · ${p.country}` : ""}
                      </span>
                    ) : null}
                    {p.website ? (
                      <a href={p.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 font-medium text-slate-600 border border-slate-200 hover:bg-slate-50">
                        <Globe2 className="h-3 w-3" /> Site web
                      </a>
                    ) : null}
                  </div>
                ) : null}
                {p.logoUrl ? (
                  <div className="mt-4 rounded-lg bg-slate-50 border border-slate-200 p-3 flex items-center justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.logoUrl} alt={`Logo ${p.title}`} className="h-10 object-contain" loading="lazy" />
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-3">
          {FALLBACK_PARTNERS.map((p) => (
            <div key={p.title} className="card p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-50 border border-slate-200">
                <p.icon className="h-6 w-6 text-slate-700" strokeWidth={1.75} />
              </div>
              <h3 className="mt-4 text-base font-bold text-slate-900">{p.title}</h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">{p.desc}</p>
            </div>
          ))}
        </div>
      )}

      <div className="card mt-8 overflow-hidden">
        <div className="bg-slate-900 p-6 text-white">
          <h3 className="text-lg font-bold">Le modèle en 3 piliers</h3>
          <div className="mt-4 grid gap-6 md:grid-cols-3">
            <div>
              <h4 className="font-semibold text-slate-200">Gratuit</h4>
              <p className="mt-1 text-sm text-slate-300">Déclaration, récupération, chat : libres pour tous. Aucun biais de classe.</p>
            </div>
            <div>
              <h4 className="font-semibold text-slate-200">Partenaires</h4>
              <p className="mt-1 text-sm text-slate-300">Points RETRUV, entreprises : visibilité, service, réputation. Intégration API.</p>
            </div>
            <div>
              <h4 className="font-semibold text-slate-200">API</h4>
              <p className="mt-1 text-sm text-slate-300">Le moteur de matching peut être utilisé par d'autres plateformes. Licence B2B.</p>
            </div>
          </div>
        </div>
        <div className="bg-slate-50 border-t border-slate-100 px-6 py-3 flex items-center justify-between text-xs text-slate-500">
          <span>RETRUV — Retrouvons ce qui compte</span>
          <span className="hidden sm:inline">Bobo-Dioulasso, Burkina Faso</span>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="/points" className="btn btn-primary gap-2"><MapPin className="h-4 w-4" /> Voir les points actifs</Link>
        <Link href="/hub" className="btn btn-secondary gap-2"><Globe2 className="h-4 w-4" /> Explorer le réseau mondial</Link>
        <Link href="/admin/partenaires" className="btn btn-secondary">Gérer les partenaires</Link>
      </div>
    </div>
  );
}
