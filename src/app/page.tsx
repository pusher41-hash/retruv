import Link from "next/link";
import { and, eq, inArray, sql, desc } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/db";
import {
  categories,
  foundItems,
  lostItems,
  matches,
  recoveryPoints,
  recoveries,
} from "@/db/schema";
import { formatCFA, formatRelative } from "@/lib/utils";
import { sanitizePublicDescription } from "@/lib/security";
import { getCategoryFieldConfig } from "@/lib/category-fields";
import { PUBLICLY_VISIBLE_MODERATION_STATUSES } from "@/lib/moderation";
import { MatchBadge, StatusBadge } from "@/components/ui";
import { CategoryIcon } from "@/lib/category-icons";
import { Globe2, MapPin, Search, Sparkles } from "lucide-react";

const subcategories = alias(categories, "subcategories");

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [lostCount] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(lostItems);
  const [foundCount] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(foundItems);
  const [matchCount] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(matches);
  const [recoveredCount] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(recoveries)
    .where(eq(recoveries.status, "completed"));
  const [pointsCount] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(recoveryPoints);

  const recentLost = await db
    .select({
      item: lostItems,
      category: categories,
      subcategorySlug: subcategories.slug,
    })
    .from(lostItems)
    .innerJoin(categories, eq(lostItems.categoryId, categories.id))
    .leftJoin(subcategories, eq(lostItems.subcategoryId, subcategories.id))
    .where(
      and(
        eq(lostItems.status, "active"),
        inArray(lostItems.moderationStatus, PUBLICLY_VISIBLE_MODERATION_STATUSES)
      )
    )
    .orderBy(desc(lostItems.createdAt))
    .limit(4);

  const recentFound = await db
    .select({
      item: foundItems,
      category: categories,
      subcategorySlug: subcategories.slug,
    })
    .from(foundItems)
    .innerJoin(categories, eq(foundItems.categoryId, categories.id))
    .leftJoin(subcategories, eq(foundItems.subcategoryId, subcategories.id))
    .where(
      and(
        eq(foundItems.status, "active"),
        inArray(foundItems.moderationStatus, PUBLICLY_VISIBLE_MODERATION_STATUSES)
      )
    )
    .orderBy(desc(foundItems.createdAt))
    .limit(4);

  const topMatches = await db
    .select()
    .from(matches)
    .orderBy(desc(matches.score))
    .limit(3);

  return (
    <div>
      <section className="container-app py-8 sm:py-12">
        {/* Badge international */}
        <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-retruv-blue/10 to-retruv-teal/10 px-4 py-1.5 text-xs font-extrabold uppercase tracking-[0.14em] text-retruv-blue border border-retruv-blue/10">
          <Globe2 className="h-3.5 w-3.5" />
          Plateforme mondiale — Regroupement intelligent par pays
        </div>
        <div className="hero-grid">
          <div className="card overflow-hidden p-6 sm:p-8">
            <div className="inline-flex items-center gap-2 rounded-full bg-sky-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-retruv-blue">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Disponible dans le monde entier
            </div>
            <h1 className="mt-4 max-w-xl text-4xl font-black leading-[1.05] tracking-tight text-retruv-navy sm:text-5xl">
              RETRUV
            </h1>
            <p className="mt-3 text-xl font-semibold text-retruv-sky sm:text-2xl">
              Un regroupement intelligent, sans frontières.
            </p>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-600">
              RETRUV n&apos;est ancré dans aucun pays en particulier. C&apos;est une plateforme mondiale où chaque pays — Italie, France, Canada, Brésil, Maroc, Sénégal, Inde, Japon, et au-delà — devient un nœud du même réseau de confiance. Perdu en Italie ? Trouvé au Canada ? Le système connecte au-delà des frontières, sur tous les continents.
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              <Link
                href="/declare/lost"
                className="action-lost flex min-h-28 flex-col justify-between rounded-[1.4rem] p-5 shadow-lg shadow-sky-200/60 transition hover:-translate-y-0.5"
              >
                <Search className="h-8 w-8 text-white" strokeWidth={2.25} />
                <div>
                  <div className="text-3xl font-black text-white drop-shadow-md">J&apos;AI PERDU</div>
                  <div className="mt-1 text-sm font-bold text-white/95 drop-shadow">
                    Déclarer un objet perdu
                  </div>
                </div>
              </Link>
              <Link
                href="/declare/found"
                className="action-found flex min-h-28 flex-col justify-between rounded-[1.4rem] p-5 shadow-lg shadow-teal-200/60 transition hover:-translate-y-0.5"
              >
                <Sparkles className="h-8 w-8 text-white" strokeWidth={2.25} />
                <div>
                  <div className="text-3xl font-black text-white drop-shadow-md">J&apos;AI TROUVÉ</div>
                  <div className="mt-1 text-sm font-bold text-white/95 drop-shadow">
                    Signaler un objet trouvé
                  </div>
                </div>
              </Link>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Link href="/lost" className="btn btn-secondary text-sm">
                Rechercher
              </Link>
              <Link href="/matches" className="btn btn-secondary text-sm">
                Correspondances
              </Link>
              <Link href="/points" className="btn btn-secondary text-sm">
                Points RETRUV
              </Link>
              <Link href="/hub" className="btn btn-secondary text-sm bg-gradient-to-r from-retruv-blue to-retruv-teal text-white border-none">
                <Globe2 className="h-4 w-4" />
                Monde
              </Link>
              <Link href="/map" className="btn btn-secondary text-sm">
                Carte
              </Link>
            </div>
          </div>

          <div className="grid gap-4">
          <div className="card bg-gradient-to-br from-retruv-navy via-[#0e3a6d] to-retruv-teal p-6 text-white">
            <p className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-[0.16em] text-sky-200">
              <Globe2 className="h-3.5 w-3.5" />
              Impact mondial — Regroupement par pays
            </p>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="stat-pill">
                  <div className="text-2xl font-black">{lostCount?.c ?? 0}</div>
                  <div className="text-xs text-sky-100">Objets perdus</div>
                </div>
                <div className="stat-pill">
                  <div className="text-2xl font-black">{foundCount?.c ?? 0}</div>
                  <div className="text-xs text-sky-100">Objets trouvés</div>
                </div>
                <div className="stat-pill">
                  <div className="text-2xl font-black">{matchCount?.c ?? 0}</div>
                  <div className="text-xs text-sky-100">Correspondances</div>
                </div>
                <div className="stat-pill">
                  <div className="text-2xl font-black">
                    {recoveredCount?.c ?? 0}
                  </div>
                  <div className="text-xs text-sky-100">Récupérations</div>
                </div>
              </div>
              <p className="mt-5 text-sm text-sky-50/90">
                {pointsCount?.c ?? 0} points de récupération partenaires actifs.
              </p>
            </div>

        <div className="card bg-white border-2 border-slate-100 p-5">
          <h2 className="font-extrabold text-retruv-navy text-lg">Comment ça marche ?</h2>
              <ol className="mt-4 space-y-3 text-sm text-slate-800 font-medium">
                  <li className="flex gap-3 text-[#0f172a] font-bold text-base">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0e4d92] text-xs font-black text-white shadow-md">1</span>
                  <span>Vous déclarez une perte ou une trouvaille en quelques secondes.</span>
                </li>
                  <li className="flex gap-3 text-[#0f172a] font-bold text-base">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0d9488] text-xs font-black text-white shadow-md">2</span>
                  <span>RETRUV calcule un score de correspondance multi-signaux.</span>
                </li>
                  <li className="flex gap-3 text-[#0f172a] font-bold text-base">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#f59e0b] text-xs font-black text-white shadow-md">3</span>
                  <span>La propriété est vérifiée sans exposer les données sensibles.</span>
                </li>
                  <li className="flex gap-3 text-[#0f172a] font-bold text-base">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#059669] text-xs font-black text-white shadow-md">4</span>
                  <span>Vous organisez la récupération via chat ou Point RETRUV.</span>
                </li>
              </ol>
            </div>
          </div>
        </div>
      </section>

      <section className="container-app pb-8">
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-extrabold text-retruv-navy">
              Déclarations récentes
            </h2>
            <p className="text-sm text-slate-500">
              Données partiellement masquées pour protéger les utilisateurs.
            </p>
          </div>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-retruv-navy text-lg">Objets perdus</h3>
              <Link href="/lost" className="text-sm font-semibold text-retruv-blue">
                Tout voir
              </Link>
            </div>
            {recentLost.map(({ item, category }) => (
              <Link
                key={item.id}
                href={`/lost/${item.id}`}
                className="card block p-4 transition hover:-translate-y-0.5"
              >
                <div className="flex gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50">
                    <CategoryIcon slug={category.slug} className="h-6 w-6 text-retruv-blue" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="font-bold text-slate-900">{item.title}</h4>
                      <StatusBadge status={item.status} />
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm text-slate-600">
                      {sanitizePublicDescription(item.description, item.isSensitive)}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {item.city}
                      </span>
                      <span>·</span>
                      <span>{formatRelative(item.createdAt)}</span>
                      {item.rewardAmount ? (
                        <>
                          <span>·</span>
                          <span className="font-semibold text-amber-700">
                            {formatCFA(item.rewardAmount)}
                          </span>
                        </>
                      ) : null}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-retruv-navy text-lg">Objets trouvés</h3>
              <Link href="/found" className="text-sm font-semibold text-retruv-teal">
                Tout voir
              </Link>
            </div>
            {recentFound.map(({ item, category, subcategorySlug }) => {
              const fieldConfig = getCategoryFieldConfig(category.slug, subcategorySlug);
              return (
              <Link
                key={item.id}
                href={`/found/${item.id}`}
                className="card block p-4 transition hover:-translate-y-0.5"
              >
                <div className="flex gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-50">
                    <CategoryIcon slug={category.slug} className="h-6 w-6 text-retruv-teal" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="font-bold text-slate-900">{item.title}</h4>
                      <StatusBadge status={item.status} />
                      {item.isSensitive ? (
                        <span className="badge border-rose-200 bg-rose-50 text-rose-700">
                          {fieldConfig.safetyNotice ? "Personne" : "Sensible"}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm text-slate-600">
                      {item.isSensitive && fieldConfig.blurSensitivePhotos
                        ? "Document sensible — détails masqués pour protection."
                        : sanitizePublicDescription(item.description, item.isSensitive)}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {item.city}
                      </span>
                      <span>·</span>
                      <span>{formatRelative(item.createdAt)}</span>
                    </div>
                  </div>
                </div>
              </Link>
              );
            })}
          </div>
        </div>
      </section>

      {topMatches.length > 0 ? (
        <section className="container-app pb-10">
          <h2 className="mb-4 text-xl font-extrabold text-retruv-navy">
            Correspondances intelligentes
          </h2>
          <div className="grid gap-3 md:grid-cols-3">
            {topMatches.map((m) => (
              <Link key={m.id} href={`/matches/${m.id}`} className="card p-5">
                <MatchBadge level={m.level} score={m.score} />
                <p className="mt-3 text-sm text-slate-600">
                  Le moteur RETRUV a croisé catégorie, description, lieu, date
                  et identifiants partiels.
                </p>
                <p className="mt-3 text-xs text-slate-400">
                  Ce score n&apos;est jamais une preuve absolue de propriété.
                </p>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section className="container-app pb-12">
        <div className="card overflow-hidden bg-gradient-to-r from-retruv-navy to-[#123f73] p-6 text-white sm:p-8">
          <div className="grid gap-6 md:grid-cols-[1.3fr_0.7fr] md:items-center">
            <div>
              <h2 className="text-2xl font-black">Perdre n&apos;est plus forcément perdre pour toujours.</h2>
              <p className="mt-3 max-w-2xl text-sky-100">
                Documents, téléphones, sacs, motos, animaux, personnes
                disparues… RETRUV protège les identités, détecte les fraudes
                et facilite les retrouvailles.
              </p>
            </div>
            <div className="grid gap-2">
              <Link href="/register" className="btn btn-accent">
                Créer un compte gratuit
              </Link>
              <Link
                href="/login"
                className="btn border border-white/20 bg-white/10 text-white"
              >
                J&apos;ai déjà un compte
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
