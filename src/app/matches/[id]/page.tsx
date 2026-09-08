import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import {
  categories,
  conversations,
  foundItems,
  lostItems,
  matches,
  recoveries,
  recoveryPoints,
  users,
  verifications,
} from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import {
  MatchBadge,
  PageHeader,
  ReputationBadge,
  ScoreBar,
  StatusBadge,
} from "@/components/ui";
import { MatchActions } from "@/components/match-actions";
import { PopIn } from "@/components/motion";
import { formatDate, formatRelative, getMatchLevelLabel } from "@/lib/utils";
import { sanitizePublicDescription } from "@/lib/security";
import { getCategoryFieldConfig, isPersonCategory } from "@/lib/category-fields";
import { Calendar, IdCard, MapPin, Palette } from "lucide-react";

const RING_COLOR: Record<string, string> = {
  weak: "#94a3b8",
  possible: "#f59e0b",
  probable: "#f97316",
  very_probable: "#059669",
};

export const dynamic = "force-dynamic";

const BREAKDOWN_LABELS: Record<string, string> = {
  category: "Catégorie",
  subcategory: "Sous-catégorie",
  brandModel: "Marque / modèle",
  color: "Couleur",
  description: "Description",
  location: "Localisation",
  date: "Date",
  serial: "Identifiant partiel",
};

export default async function MatchDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const { id } = await params;

  const [row] = await db
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
    .where(eq(matches.id, id))
    .limit(1);

  if (!row) notFound();

  let subSlug: string | undefined;
  if (row.lost.subcategoryId) {
    const [sub] = await db
      .select({ slug: categories.slug })
      .from(categories)
      .where(eq(categories.id, row.lost.subcategoryId))
      .limit(1);
    subSlug = sub?.slug;
  }
  const isPerson = isPersonCategory(row.category.slug, subSlug);
  const fieldConfig = getCategoryFieldConfig(row.category.slug, subSlug);

  const isOwner = row.lost.userId === user.id;
  const isFinder = row.found.userId === user.id;
  const isStaff = user.role === "admin" || user.role === "moderator";
  if (!isOwner && !isFinder && !isStaff) redirect("/matches");

  const role = isOwner ? "owner" : isFinder ? "finder" : "staff";

  const [owner] = await db
    .select()
    .from(users)
    .where(eq(users.id, row.lost.userId))
    .limit(1);
  const [finder] = await db
    .select()
    .from(users)
    .where(eq(users.id, row.found.userId))
    .limit(1);

  const verifs = await db
    .select()
    .from(verifications)
    .where(eq(verifications.matchId, id));

  const [convo] = await db
    .select()
    .from(conversations)
    .where(eq(conversations.matchId, id))
    .limit(1);

  const [recovery] = await db
    .select()
    .from(recoveries)
    .where(eq(recoveries.matchId, id))
    .limit(1);

  const points = await db.select().from(recoveryPoints).limit(20);

  const breakdown = row.match.scoreBreakdown ?? {};
  const verified =
    row.match.status === "verified" || row.match.status === "completed";

  return (
    <div className="container-app py-8">
      <PageHeader
        back={{ href: "/matches", label: "Correspondances" }}
        eyebrow="Correspondance"
        title="Analyse RETRUV"
        description={
          isPerson
            ? "Le score indique une probabilité, pas une preuve. Contactez la police avant toute retrouvaille organisée par vos soins."
            : "Le score indique une probabilité, pas une preuve. La vérification protège contre les faux propriétaires."
        }
      />

      <PopIn className="card mb-4 flex flex-col items-center gap-4 p-6 text-center sm:flex-row sm:text-left">
        <div
          className="relative flex h-24 w-24 shrink-0 items-center justify-center rounded-full"
          style={{
            background: `conic-gradient(${RING_COLOR[row.match.level] ?? RING_COLOR.weak} ${Math.round(
              row.match.score
            )}%, #e2e8f0 0)`,
          }}
        >
          <div className="flex h-[4.6rem] w-[4.6rem] flex-col items-center justify-center rounded-full bg-white">
            <span className="text-2xl font-black text-retruv-navy">
              {Math.round(row.match.score)}%
            </span>
          </div>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Score de correspondance
          </p>
          <p className="mt-1 text-lg font-extrabold text-retruv-navy">
            {getMatchLevelLabel(row.match.level)}
          </p>
          <div className="mt-2 flex flex-wrap justify-center gap-2 sm:justify-start">
            <MatchBadge level={row.match.level} score={row.match.score} />
            <StatusBadge status={row.match.status} />
          </div>
        </div>
      </PopIn>

      {fieldConfig.safetyNotice ? (
        <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
          <strong>Avant toute chose :</strong> {fieldConfig.safetyNotice}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-4">
          <div className="card p-5">
            <h2 className="font-bold text-retruv-navy">Détail du score</h2>
            <p className="mt-1 text-sm text-slate-500">
              Détectée {formatRelative(row.match.createdAt)}
            </p>
            <div className="mt-5 space-y-3">
              {Object.entries(breakdown).map(([k, v]) => (
                <ScoreBar
                  key={k}
                  label={BREAKDOWN_LABELS[k] ?? k}
                  value={Number(v) || 0}
                />
              ))}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="card p-5">
              <p className="text-xs font-bold uppercase tracking-wide text-sky-700">
                {isPerson ? "Personne recherchée" : "Déclaration perdue"}
              </p>
              <h3 className="mt-2 text-lg font-bold">{row.lost.title}</h3>
              <p className="mt-2 text-sm text-slate-600">
                {isOwner
                  ? row.lost.description
                  : sanitizePublicDescription(
                      row.lost.description,
                      row.lost.isSensitive
                    )}
              </p>
              <div className="mt-3 space-y-1 text-xs text-slate-500">
                <p className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" />
                  {row.lost.city}{row.lost.district ? ` · ${row.lost.district}` : ""}
                </p>
                {row.lost.lostDate ? (
                  <p className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    {formatDate(row.lost.lostDate)}
                  </p>
                ) : null}
                {row.lost.color ? (
                  <p className="flex items-center gap-1.5">
                    <Palette className="h-3.5 w-3.5" />
                    {row.lost.color}
                  </p>
                ) : null}
                {row.lost.idPartialMasked ? (
                  <p className="flex items-center gap-1.5">
                    <IdCard className="h-3.5 w-3.5" />
                    {row.lost.idPartialMasked}
                  </p>
                ) : null}
              </div>
              <Link
                href={`/lost/${row.lost.id}`}
                className="mt-3 inline-block text-sm font-semibold text-retruv-blue"
              >
                Voir la fiche →
              </Link>
            </div>

            <div className="card p-5">
              <p className="text-xs font-bold uppercase tracking-wide text-teal-700">
                {isPerson ? "Personne repérée" : "Déclaration trouvée"}
              </p>
              <h3 className="mt-2 text-lg font-bold">{row.found.title}</h3>
              <p className="mt-2 text-sm text-slate-600">
                {isFinder || verified
                  ? row.found.description
                  : sanitizePublicDescription(
                      row.found.description,
                      row.found.isSensitive
                    )}
              </p>
              <div className="mt-3 space-y-1 text-xs text-slate-500">
                <p className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" />
                  {row.found.city}
                </p>
                {row.found.foundDate ? (
                  <p className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    {formatDate(row.found.foundDate)}
                  </p>
                ) : null}
                {row.found.color ? (
                  <p className="flex items-center gap-1.5">
                    <Palette className="h-3.5 w-3.5" />
                    {row.found.color}
                  </p>
                ) : null}
                {row.found.idPartialMasked ? (
                  <p className="flex items-center gap-1.5">
                    <IdCard className="h-3.5 w-3.5" />
                    {row.found.idPartialMasked}
                  </p>
                ) : null}
              </div>
              <Link
                href={`/found/${row.found.id}`}
                className="mt-3 inline-block text-sm font-semibold text-retruv-teal"
              >
                Voir la fiche →
              </Link>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="card p-4">
              <p className="text-xs font-bold uppercase text-slate-500">
                {isPerson ? "Déclarant" : "Propriétaire"}
              </p>
              {isStaff && owner ? (
                <Link
                  href={`/admin/users/${owner.id}`}
                  className="mt-1 block font-bold hover:text-retruv-blue hover:underline"
                >
                  {owner.fullName.split(" ")[0]}
                </Link>
              ) : (
                <p className="mt-1 font-bold">{owner?.fullName.split(" ")[0]}</p>
              )}
              {owner ? <ReputationBadge level={owner.reputationLevel} /> : null}
            </div>
            <div className="card p-4">
              <p className="text-xs font-bold uppercase text-slate-500">
                {isPerson ? "A signalé l'avoir vue" : "Trouveur"}
              </p>
              {isStaff && finder ? (
                <Link
                  href={`/admin/users/${finder.id}`}
                  className="mt-1 block font-bold hover:text-retruv-blue hover:underline"
                >
                  {finder.fullName.split(" ")[0]}
                </Link>
              ) : (
                <p className="mt-1 font-bold">{finder?.fullName.split(" ")[0]}</p>
              )}
              {finder ? <ReputationBadge level={finder.reputationLevel} /> : null}
            </div>
          </div>
        </div>

        <div>
          <MatchActions
            matchId={id}
            role={role}
            status={row.match.status}
            conversationId={convo?.id ?? null}
            recovery={
              recovery
                ? {
                    id: recovery.id,
                    status: recovery.status,
                    method: recovery.method,
                    ownerConfirmed: recovery.ownerConfirmed,
                    finderConfirmed: recovery.finderConfirmed,
                    hasRestitutionCode: !!recovery.restitutionCode,
                  }
                : null
            }
            existingQuestions={
              isOwner && verifs[0]
                ? (verifs[0].questions ?? []).map((q) => ({
                    id: q.id,
                    question: q.question,
                    type: q.type,
                  }))
                : []
            }
            points={points.map((p) => ({
              id: p.id,
              name: p.name,
              city: p.city,
            }))}
            isPerson={isPerson}
          />
        </div>
      </div>
    </div>
  );
}
