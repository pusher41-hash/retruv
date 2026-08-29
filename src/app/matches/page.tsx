import Link from "next/link";
import { redirect } from "next/navigation";
import { desc, eq, or } from "drizzle-orm";
import { db } from "@/db";
import { categories, foundItems, lostItems, matches } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import {
  EmptyState,
  MatchBadge,
  PageHeader,
  StatusBadge,
} from "@/components/ui";
import { formatRelative } from "@/lib/utils";
import { CategoryIcon } from "@/lib/category-icons";

export const dynamic = "force-dynamic";

export default async function MatchesPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const rows = await db
    .select({
      match: matches,
      lost: lostItems,
      found: foundItems,
      category: categories,
    })
    .from(matches)
    .innerJoin(lostItems, eq(matches.lostItemId, lostItems.id))
    .innerJoin(foundItems, eq(matches.foundItemId, foundItems.id))
    .innerJoin(categories, eq(lostItems.categoryId, categories.id))
    .where(
      or(eq(lostItems.userId, user.id), eq(foundItems.userId, user.id))
    )
    .orderBy(desc(matches.score))
    .limit(50);

  return (
    <div className="container-app py-8">
      <PageHeader
        eyebrow="IA Matching"
        title="Correspondances"
        description="Scores multi-signaux. Une correspondance n'est jamais une preuve absolue — la vérification de propriété reste obligatoire."
      />

      {rows.length === 0 ? (
        <EmptyState
          title="Aucune correspondance"
          description="Déclarez une perte ou une trouvaille pour activer le moteur RETRUV."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Link href="/declare/lost" className="btn btn-primary">
                J&apos;ai perdu
              </Link>
              <Link href="/declare/found" className="btn btn-accent">
                J&apos;ai trouvé
              </Link>
            </div>
          }
        />
      ) : (
        <div className="grid gap-3">
          {rows.map(({ match, lost, found, category }) => {
            const role = lost.userId === user.id ? "owner" : "finder";
            return (
              <Link
                key={match.id}
                href={`/matches/${match.id}`}
                className="card block p-5 transition hover:-translate-y-0.5"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <CategoryIcon slug={category.slug} className="h-6 w-6 text-retruv-navy" />
                  <MatchBadge level={match.level} score={match.score} />
                  <StatusBadge status={match.status} />
                  <span className="badge border-slate-200 bg-slate-50 text-slate-600">
                    {role === "owner" ? "Vous êtes le propriétaire" : "Vous êtes le trouveur"}
                  </span>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl bg-sky-50 p-3">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-sky-700">
                      Perdu
                    </p>
                    <p className="mt-1 font-bold text-slate-900">{lost.title}</p>
                    <p className="text-xs text-slate-500">{lost.city}</p>
                  </div>
                  <div className="rounded-2xl bg-teal-50 p-3">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-teal-700">
                      Trouvé
                    </p>
                    <p className="mt-1 font-bold text-slate-900">{found.title}</p>
                    <p className="text-xs text-slate-500">{found.city}</p>
                  </div>
                </div>
                <p className="mt-3 text-xs text-slate-400">
                  Détectée {formatRelative(match.createdAt)}
                </p>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
