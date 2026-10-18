import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { recoveryPoints } from "@/db/schema";
import { PageHeader, StatCard } from "@/components/ui";
import { COUNTRIES, countryName } from "@/lib/constants";
import { CheckCircle2, Clock, Filter, Flag, Globe2, MapPin, Package, Phone, Search, User } from "lucide-react";

export const dynamic = "force-dynamic";

async function getPoints() {
  try {
    const rows = await db.select().from(recoveryPoints).where(eq(recoveryPoints.isActive, true)).orderBy(asc(recoveryPoints.city), asc(recoveryPoints.name));
    return rows;
  } catch {
    return [];
  }
}

type SearchParams = { country?: string; type?: string };

const TYPE_LABELS: Record<string, string> = {
  gare: "Gare",
  mairie: "Mairie",
  commissariat: "Commissariat",
  universite: "Université",
  autre: "Autre",
};

export default async function PointsPage({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  const params = await searchParams;
  const selectedCountry = params?.country?.toUpperCase() ?? "";
  const selectedType = params?.type ?? "";

  const allPoints = await getPoints();

  let points = allPoints;
  if (selectedCountry) points = points.filter((p) => p.country === selectedCountry);
  if (selectedType) points = points.filter((p) => p.type === selectedType);

  const deposited = points.reduce((s, p) => s + p.itemsDeposited, 0);
  const recovered = points.reduce((s, p) => s + p.itemsRecovered, 0);

  const countryCounts = new Map<string, number>();
  for (const p of allPoints) {
    const c = p.country ?? "IT";
    countryCounts.set(c, (countryCounts.get(c) ?? 0) + 1);
  }
  const activeCountries = Array.from(countryCounts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 12);

  const typeCounts = new Map<string, number>();
  for (const p of allPoints) typeCounts.set(p.type, (typeCounts.get(p.type) ?? 0) + 1);

  return (
    <div className="container-app py-8">
      <PageHeader
        eyebrow="Réseau"
        title="Points RETRUV"
        description="Déposez ou récupérez un objet dans un lieu de confiance : commissariat, gare, campus, mairie. Réseau vérifié dans 36 pays."
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <StatCard label="Points actifs" value={points.length} icon={MapPin} />
        <StatCard label="Objets déposés" value={deposited} icon={Package} />
        <StatCard label="Objets récupérés" value={recovered} icon={CheckCircle2} />
      </div>

      {allPoints.length > 8 ? (
        <div className="card p-4 mb-6 border-slate-200">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <Filter className="h-4 w-4 text-slate-500" /> Filtrer les points
                <span className="rounded-full bg-slate-50 border border-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600">
                  {points.length} / {allPoints.length} affichés
                </span>
              </div>
              <form method="GET" className="flex gap-2 flex-wrap">
                <div className="relative">
                  <Flag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <select name="country" defaultValue={selectedCountry} className="select pl-10 pr-8 py-2 text-sm">
                    <option value="">Tous les pays ({allPoints.length})</option>
                    {COUNTRIES.filter((c) => countryCounts.has(c.code)).map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.name} — {countryCounts.get(c.code)} point(s)
                      </option>
                    ))}
                  </select>
                </div>
                <div className="relative">
                  <select name="type" defaultValue={selectedType} className="select py-2 text-sm">
                    <option value="">Tous les types</option>
                    {Array.from(typeCounts.entries()).map(([t, cnt]) => (
                      <option key={t} value={t}>
                        {TYPE_LABELS[t] ?? t} — {cnt}
                      </option>
                    ))}
                  </select>
                </div>
                <button type="submit" className="btn btn-primary py-2 px-4 text-sm gap-1">
                  <Search className="h-4 w-4" /> Filtrer
                </button>
                <Link href="/points" className="btn btn-secondary py-2 px-3 text-sm">
                  Tous
                </Link>
              </form>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/points"
                className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${!selectedCountry ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"}`}
              >
                Tous <span className="bg-white/20 px-1.5 py-0.5 rounded-full text-xs">{allPoints.length}</span>
              </Link>
              {activeCountries.map(([code, count]) => {
                const c = COUNTRIES.find((x) => x.code === code);
                const isActive = selectedCountry === code;
                const href = selectedType ? `/points?country=${code}&type=${selectedType}` : `/points?country=${code}`;
                return (
                  <Link
                    key={code}
                    href={href}
                    className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${isActive ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"}`}
                  >
                    {c?.name ?? code} <span className={`${isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"} px-1.5 py-0.5 rounded-full`}>{count}</span>
                  </Link>
                );
              })}
            </div>
            {selectedCountry || selectedType ? (
              <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 flex items-center gap-2 text-sm">
                <Search className="h-4 w-4 text-slate-500" />
                <span className="font-medium text-slate-700">
                  Affichage :{" "}
                  {selectedCountry ? <span className="font-bold">{countryName(selectedCountry)}</span> : "Tous pays"}
                  {selectedType ? ` · ${TYPE_LABELS[selectedType] ?? selectedType}` : ""} — {points.length} point(s)
                </span>
                <Link href="/points" className="ml-auto text-xs font-semibold text-slate-600 hover:underline">
                  Effacer filtre
                </Link>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {points.length === 0 ? (
        <div className="card p-8 text-center border-slate-200">
          <p className="text-sm font-medium text-slate-700">Aucun point trouvé pour ce filtre.</p>
          <p className="mt-1 text-xs text-slate-500">Essayez un autre pays ou effacez les filtres pour voir l'ensemble du réseau mondial.</p>
          <Link href="/points" className="btn btn-secondary mt-4">
            Voir tous les points
          </Link>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {points.map((p) => (
            <div key={p.id} className="card p-5 border-slate-200 hover:border-slate-300 transition">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-semibold text-slate-600 capitalize">
                      {TYPE_LABELS[p.type] ?? p.type}
                    </span>
                    <span className="ml-2 text-slate-500">{countryName(p.country)} · {p.city}</span>
                  </p>
                  <h2 className="mt-2 text-base font-bold text-slate-900">{p.name}</h2>
                </div>
                <div className="rounded-xl bg-slate-50 border border-slate-200 px-3 py-2 text-center min-w-[70px]">
                  <div className="text-lg font-black text-slate-900">{p.itemsRecovered}</div>
                  <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">récupérés</div>
                </div>
              </div>
              <p className="mt-3 text-sm text-slate-600 flex items-start gap-1.5">
                <MapPin className="h-3.5 w-3.5 mt-0.5 text-slate-400 shrink-0" />
                {p.address}, {p.city}
              </p>
              <div className="mt-3 grid gap-1 text-sm text-slate-500">
                {p.hours ? (
                  <p className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" /> {p.hours}
                  </p>
                ) : null}
                {p.phone ? (
                  <p className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5" /> {p.phone}
                  </p>
                ) : null}
                {p.managerName ? (
                  <p className="flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5" /> {p.managerName}
                  </p>
                ) : null}
              </div>
              <div className="mt-3 flex items-center justify-between text-xs">
                <span className="text-slate-500">
                  Déposés : <span className="font-semibold text-slate-700">{p.itemsDeposited}</span>
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-1 text-xs font-semibold text-emerald-700">
                  <CheckCircle2 className="h-3 w-3" /> Opérationnel
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="card mt-8 overflow-hidden border-slate-200">
        <div className="bg-slate-900 p-6 text-white">
          <h3 className="text-lg font-bold">Le modèle en 3 piliers</h3>
          <div className="mt-4 grid gap-6 md:grid-cols-3">
            <div>
              <h4 className="font-semibold text-slate-200">Gratuit</h4>
              <p className="mt-1 text-sm text-slate-300">Déclaration et récupération libres pour tous, sans frais d'accès.</p>
            </div>
            <div>
              <h4 className="font-semibold text-slate-200">Tiers de confiance</h4>
              <p className="mt-1 text-sm text-slate-300">Commissariats, gares, campus : lieux contrôlés avec responsable identifié.</p>
            </div>
            <div>
              <h4 className="font-semibold text-slate-200">Réseau mondial</h4>
              <p className="mt-1 text-sm text-slate-300">Un même réseau présent dans 36 pays, pour un document perdu à Ouaga et retrouvé à Lyon.</p>
            </div>
          </div>
        </div>
        <div className="bg-slate-50 border-t border-slate-100 px-6 py-3 flex items-center justify-between text-xs text-slate-500">
          <span>RETRUV — Retrouvons ce qui compte</span>
          <span className="hidden sm:inline">Réseau opérationnel dans 36 pays</span>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="/map" className="btn btn-primary gap-2">
          <MapPin className="h-4 w-4" /> Voir la carte
        </Link>
        <Link href="/partenaires" className="btn btn-secondary gap-2">
          <Globe2 className="h-4 w-4" /> Voir les partenaires
        </Link>
        <Link href="/hub" className="btn btn-secondary gap-2">
          <Globe2 className="h-4 w-4" /> Explorer le réseau
        </Link>
      </div>
    </div>
  );
}
