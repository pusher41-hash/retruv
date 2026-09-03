import { eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  lostItems,
  foundItems,
  matches,
  categories,
} from "@/db/schema";
import { PUBLICLY_VISIBLE_MODERATION_STATUSES } from "@/lib/moderation";
import { PageHeader, StatusBadge, MatchBadge } from "@/components/ui";
import { formatRelative, formatCFA, statusColor } from "@/lib/utils";
import { COUNTRIES, countryName } from "@/lib/constants";
import { CategoryIcon } from "@/lib/category-icons";
import { Globe2 } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

const PUBLICLY_VISIBLE_STATUSES_SQL = sql.join(
  PUBLICLY_VISIBLE_MODERATION_STATUSES.map((s) => sql`${s}`),
  sql`, `
);

type CountryStat = { country: string; lost: number; found: number; matches: number };

async function getCountryStats(): Promise<CountryStat[]> {
  const [lostByCountry, foundByCountry, matchesByCountry] = await Promise.all([
    db
      .select({ country: lostItems.country, count: sql<number>`count(*)::int` })
      .from(lostItems)
      .where(inArray(lostItems.moderationStatus, PUBLICLY_VISIBLE_MODERATION_STATUSES))
      .groupBy(lostItems.country),
    db
      .select({ country: foundItems.country, count: sql<number>`count(*)::int` })
      .from(foundItems)
      .where(inArray(foundItems.moderationStatus, PUBLICLY_VISIBLE_MODERATION_STATUSES))
      .groupBy(foundItems.country),
    db
      .select({ country: lostItems.country, count: sql<number>`count(*)::int` })
      .from(matches)
      .innerJoin(lostItems, eq(matches.lostItemId, lostItems.id))
      .groupBy(lostItems.country),
  ]);

  const byCountry = new Map<string, CountryStat>();
  const ensure = (country: string) => {
    let row = byCountry.get(country);
    if (!row) {
      row = { country, lost: 0, found: 0, matches: 0 };
      byCountry.set(country, row);
    }
    return row;
  };
  for (const r of lostByCountry) ensure(r.country).lost = r.count;
  for (const r of foundByCountry) ensure(r.country).found = r.count;
  for (const r of matchesByCountry) ensure(r.country).matches = r.count;

  return [...byCountry.values()].sort((a, b) => b.matches - a.matches);
}

export default async function GlobalHubPage({
  searchParams,
}: {
  searchParams: Promise<{ country?: string }>;
}) {
  const sp = await searchParams;
  const selected = sp.country || "ALL";

  // Stats par pays (tous les pays actifs dans la DB, sans favoriser un pays)
  const countryStats = await getCountryStats();

  const items = await db.execute(sql`
    SELECT
      'lost' AS type,
      l.id AS id,
      l.title,
      l.city,
      l.country,
      l.status,
      l.created_at AS created_at,
      c.name_fr AS category_name,
      c.slug AS category_slug
    FROM lost_items l
    JOIN categories c ON l.category_id = c.id
    WHERE (${selected === "ALL" ? sql`true` : sql`l.country = ${selected}`})
      AND l.status = 'active'
      AND l.moderation_status IN (${PUBLICLY_VISIBLE_STATUSES_SQL})
    UNION ALL
    SELECT
      'found' AS type,
      f.id AS id,
      f.title,
      f.city,
      f.country,
      f.status,
      f.created_at AS created_at,
      c.name_fr AS category_name,
      c.slug AS category_slug
    FROM found_items f
    JOIN categories c ON f.category_id = c.id
    WHERE (${selected === "ALL" ? sql`true` : sql`f.country = ${selected}`})
      AND f.status = 'active'
      AND f.moderation_status IN (${PUBLICLY_VISIBLE_STATUSES_SQL})
    ORDER BY created_at DESC
    LIMIT 40
  `);

  return (
    <div className="container-app py-8">
      <PageHeader
        eyebrow="International"
        title="RETRUV — Regroupement mondial"
        description="Une plateforme sans frontières. Tout le monde, partout, connecté par la confiance."
      />
      <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#0e4d92] to-[#0d9488] px-4 py-2 text-xs font-extrabold uppercase tracking-[0.14em] text-white border border-white/10 shadow-lg shadow-blue-900/20">
        <Globe2 className="h-3.5 w-3.5" />
        Plateforme mondiale — Regroupement intelligent par pays
      </div>

      {/* Hero international */}
      <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#0b1f3a] via-[#0e3a6d] to-[#0d9488] p-8 shadow-[0_24px_60px_rgba(11,31,58,0.35)]">
        <div className="relative z-10 max-w-2xl">
          <h2 className="text-3xl font-black tracking-tight sm:text-5xl text-white">
            Un regroupement par pays, sans distinction.
          </h2>
          <p className="mt-4 text-base leading-relaxed text-white/95 sm:text-lg">
            RETRUV n&apos;appartient à aucun pays en particulier. C&apos;est une plateforme mondiale où chaque pays, chaque ville, chaque quartier devient un nœud du même réseau de confiance.
            Perdu en Italie ? Trouvé au Canada ? Le système connecte au-delà des frontières, sur tous les continents.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/declare/lost" className="btn btn-accent">
              J&apos;ai perdu — partout
            </Link>
            <Link href="/points" className="btn border border-white/20 bg-white/10 text-white">
              Points RETRUV mondiaux
            </Link>
          </div>
        </div>
        <div className="absolute -right-10 -top-10 h-64 w-64 rounded-full bg-white/5 blur-3xl md:-right-20 md:h-96 md:w-96" />
        <div className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-teal-400/20 blur-3xl md:h-72 md:w-72" />
      </section>

      {/* Regroupement intelligent par pays */}
      <section className="mt-10">
        <h3 className="flex items-center gap-2 text-2xl font-black tracking-tight text-retruv-navy">
          <Globe2 className="h-6 w-6 text-retruv-blue" />
          Regroupement intelligent par pays
        </h3>
        <p className="mt-2 text-base font-bold leading-relaxed text-slate-600">
          Chaque pays est un nœud du réseau. Le système détecte automatiquement la proximité et le contexte local.
        </p>

        <div className="mt-5 flex flex-wrap gap-2">
          <Link
            href="/hub?country=ALL"
            className={`rounded-full px-4 py-2 text-sm font-bold transition ${
              selected === "ALL" ? "bg-retruv-navy text-white shadow-md" : "bg-white text-slate-600 border border-slate-200 hover:border-retruv-blue"
            }`}
          >
            Monde entier
          </Link>
          {COUNTRIES.map(({ code, name }) => (
            <Link
              key={code}
              href={`/hub?country=${code}`}
              className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                selected === code ? "bg-retruv-blue text-white shadow-md" : "bg-white text-slate-600 border border-slate-200 hover:border-retruv-blue"
              }`}
            >
              {name}
            </Link>
          ))}
        </div>
      </section>

      {/* Stats par pays */}
      <section className="mt-8">
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
          {countryStats.map((stat) => (
            <div key={stat.country} className="card p-5">
              <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-retruv-blue">
                {countryName(stat.country)}
              </p>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl bg-sky-50 p-2">
                  <div className="text-lg font-black text-retruv-blue">{stat.lost}</div>
                  <div className="text-[10px] font-extrabold text-slate-600">Perdus</div>
                </div>
                <div className="rounded-xl bg-teal-50 p-2">
                  <div className="text-lg font-black text-retruv-teal">{stat.found}</div>
                  <div className="text-[10px] font-extrabold text-slate-600">Trouvés</div>
                </div>
                <div className="rounded-xl bg-violet-50 p-2">
                  <div className="text-lg font-black text-violet-600">{stat.matches}</div>
                  <div className="text-[10px] font-extrabold text-slate-600">Matches</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Déclarations récentes (filtrées par pays) */}
      <section className="mt-10">
        <h3 className="text-xl font-extrabold text-retruv-navy">
          Déclarations dans {selected === "ALL" ? "le monde" : countryName(selected)}
        </h3>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {(items.rows as Array<{ type: string; id: string; title: string; city: string; country: string; status: string; created_at: Date; category_name: string; category_slug: string }>)
            .map((item) => (
              <Link
                key={`${item.type}-${item.id}`}
                href={item.type === "lost" ? `/lost/${item.id}` : `/found/${item.id}`}
                className="card block p-4 transition hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(11,31,58,0.1)]"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-retruv-navy to-retruv-blue shadow-md shadow-sky-200">
                    <CategoryIcon slug={item.category_slug} className="h-6 w-6 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="font-bold text-slate-900">{item.title}</h4>
                      <StatusBadge status={item.status} />
                      <span className="badge border-slate-200 bg-slate-50 text-slate-500 text-xs font-bold">
                        {countryName(item.country)}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {item.category_name} · {item.city} · {formatRelative(item.created_at)}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
        </div>
        {(items.rowCount ?? 0) === 0 ? (
          <div className="card mt-4 p-8 text-center text-slate-500">
            Aucune déclaration publique dans cette zone. Soyez le premier.
          </div>
        ) : null}
      </section>

      {/* CTA international */}
      <section className="mt-10">
        <div className="card overflow-hidden bg-gradient-to-r from-retruv-navy to-[#123f73] p-6 text-white sm:p-8">
          <div className="grid gap-6 md:grid-cols-[1.3fr_0.7fr] md:items-center">
            <div>
              <h2 className="text-2xl font-black tracking-tight">
                Le regroupement n&apos;est pas une option — c&apos;est le cœur.
              </h2>
              <p className="mt-3 text-sky-100/90">
                Que vous soyez en Italie, au Sénégal, au Canada, en Inde ou ailleurs dans le monde — RETRUV connecte vos déclarations dans un même réseau intelligent, sécurisé et respectueux des données.
              </p>
            </div>
            <div className="flex gap-2 md:flex-col">
              <Link href="/register" className="btn btn-accent w-full">
                Rejoindre le réseau
              </Link>
              <Link href="/points" className="btn border border-white/20 bg-white/10 text-white w-full">
                Points RETRUV
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
