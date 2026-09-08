import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { categories, lostItems, users } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import {
  MatchBadge,
  PageHeader,
  ReputationBadge,
  StatusBadge,
} from "@/components/ui";
import { formatMoney, formatDate, formatRelative } from "@/lib/utils";
import { sanitizePublicDescription } from "@/lib/security";
import { CategoryIcon } from "@/lib/category-icons";
import { getCategoryFieldConfig } from "@/lib/category-fields";
import { WithdrawButton } from "@/components/withdraw-button";

export const dynamic = "force-dynamic";

export default async function LostDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const me = await getSessionUser();

  const [row] = await db
    .select({
      item: lostItems,
      category: categories,
      user: users,
    })
    .from(lostItems)
    .innerJoin(categories, eq(lostItems.categoryId, categories.id))
    .innerJoin(users, eq(lostItems.userId, users.id))
    .where(eq(lostItems.id, id))
    .limit(1);

  if (!row) notFound();

  const isStaff = me?.role === "admin" || me?.role === "moderator";
  const isOwner = me?.id === row.item.userId;
  // A report awaiting (or refused) moderation isn't public — treat it as
  // not found for anyone but its declarant or a moderator, same as a
  // genuinely missing id, so its existence isn't even confirmed to others.
  if (
    row.item.moderationStatus !== "auto_approved" &&
    row.item.moderationStatus !== "approved" &&
    !isOwner &&
    !isStaff
  ) {
    notFound();
  }

  let subSlug: string | undefined;
  if (row.item.subcategoryId) {
    const [sub] = await db
      .select({ slug: categories.slug })
      .from(categories)
      .where(eq(categories.id, row.item.subcategoryId))
      .limit(1);
    subSlug = sub?.slug;
  }
  const fieldConfig = getCategoryFieldConfig(row.category.slug, subSlug);

  const description = isOwner
    ? row.item.description
    : sanitizePublicDescription(row.item.description, row.item.isSensitive);

  // A category can be "sensitive" (masked details, verification-gated)
  // without its photo being blurred — a missing person's photo is the whole
  // point of a public appeal. Only suppress the public photo when this
  // specific item is actually sensitive AND the category's own config says
  // to blur it — most categories default to blurring, but that default
  // should never apply to an item that was never flagged sensitive.
  const photos =
    (isOwner || !(row.item.isSensitive && fieldConfig.blurSensitivePhotos)
      ? row.item.photoUrls
      : null) ?? [];

  return (
    <div className="container-app py-8">
      <PageHeader
        back={{ href: "/lost", label: "Objets perdus" }}
        eyebrow={row.category.nameFr}
        title={row.item.title}
        description={`Déclaré ${formatRelative(row.item.createdAt)} · ${row.item.city}`}
        action={<StatusBadge status={row.item.status} />}
      />

      {row.item.moderationStatus === "pending_review" ? (
        <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <strong>En cours de vérification :</strong> cette déclaration n&apos;est
          visible que par vous tant qu&apos;un modérateur RETRUV ne l&apos;a pas
          validée — généralement sous quelques heures. Elle ne sera publiée
          publiquement, ni mise en correspondance, qu&apos;une fois approuvée.
        </div>
      ) : row.item.moderationStatus === "rejected" ? (
        <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
          <strong>Déclaration non validée</strong>
          {row.item.moderationNotes ? ` : ${row.item.moderationNotes}` : "."} Elle
          n&apos;est visible que par vous et n&apos;apparaît pas publiquement.
          Contactez-nous si vous pensez qu&apos;il s&apos;agit d&apos;une erreur.
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[1.4fr_0.8fr]">
        <div className="card space-y-4 p-5 sm:p-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-sky-50">
            <CategoryIcon slug={row.category.slug} className="h-8 w-8 text-retruv-blue" />
          </div>
          <p className="text-slate-700 leading-relaxed">{description}</p>

          {photos.length > 0 ? (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {photos.map((url) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={url}
                  src={url}
                  alt=""
                  className="aspect-square w-full rounded-xl object-cover"
                />
              ))}
            </div>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2">
            {row.item.brand ? (
              <Info label="Marque" value={row.item.brand} />
            ) : null}
            {row.item.model ? (
              <Info label="Modèle" value={row.item.model} />
            ) : null}
            {row.item.color ? (
              <Info label="Couleur" value={row.item.color} />
            ) : null}
            {row.item.lostDate ? (
              <Info label="Date de perte" value={formatDate(row.item.lostDate)} />
            ) : null}
            <Info label="Ville" value={row.item.city} />
            {row.item.district ? (
              <Info label="Quartier" value={row.item.district} />
            ) : null}
            {row.item.locationApprox ? (
              <Info label="Lieu approx." value={row.item.locationApprox} />
            ) : null}
            {row.item.idPartialMasked ? (
              <Info label="ID partiel" value={row.item.idPartialMasked} />
            ) : null}
            {row.item.serialPartial && !row.item.isSensitive ? (
              <Info label="Série partielle" value={row.item.serialPartial} />
            ) : null}
            {row.item.details &&
              fieldConfig.extraFields.map((f) => {
                const value = row.item.details?.[f.key];
                return value ? <Info key={f.key} label={f.label} value={value} /> : null;
              })}
          </div>

          {isOwner && row.item.distinctiveFeatures ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <p className="font-bold">
                {fieldConfig.safetyNotice
                  ? "Signes distinctifs (privés / owner)"
                  : "Caractéristiques (privées / owner)"}
              </p>
              <p className="mt-1">{row.item.distinctiveFeatures}</p>
            </div>
          ) : null}

          {fieldConfig.safetyNotice ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
              <strong>Avant toute chose :</strong> {fieldConfig.safetyNotice}
            </div>
          ) : row.item.isSensitive ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
              Document sensible : aucune photo lisible ni numéro complet n&apos;est
              publié. La restitution passe par la vérification de propriété.
            </div>
          ) : null}
        </div>

        <div className="space-y-4">
          <div className="card p-5">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Déclarant
            </p>
            {isStaff ? (
              <Link
                href={`/admin/users/${row.user.id}`}
                className="mt-2 block text-lg font-bold text-retruv-navy hover:text-retruv-blue hover:underline"
              >
                {row.user.fullName.split(" ")[0]}
              </Link>
            ) : (
              <p className="mt-2 text-lg font-bold text-retruv-navy">
                {row.user.fullName.split(" ")[0]}
              </p>
            )}
            <div className="mt-2">
              <ReputationBadge level={row.user.reputationLevel} />
            </div>
            {row.item.rewardAmount ? (
              <p className="mt-4 text-sm">
                Récompense proposée :{" "}
                <span className="font-bold text-amber-700">
                  {formatMoney(row.item.rewardAmount, row.item.rewardCurrency)}
                </span>
              </p>
            ) : null}
            {isOwner && row.item.status !== "withdrawn" && row.item.status !== "recovered" ? (
              <div className="mt-4 flex justify-end border-t border-slate-100 pt-4">
                <WithdrawButton kind="lost" id={row.item.id} />
              </div>
            ) : null}
          </div>

          <div className="card p-5">
            <p className="font-bold text-slate-900">
              {fieldConfig.safetyNotice
                ? "Vous avez vu ou retrouvé cette personne ?"
                : "Vous avez trouvé cet objet ?"}
            </p>
            <p className="mt-2 text-sm text-slate-600">
              {fieldConfig.safetyNotice
                ? "Contactez la police immédiatement, puis déclarez-le sur RETRUV pour prévenir le déclarant."
                : "Déclarez-le sur RETRUV. Le moteur de matching fera le lien automatiquement."}
            </p>
            <Link href="/declare/found" className="btn btn-accent mt-4 w-full">
              {fieldConfig.safetyNotice ? "Signaler l'avoir retrouvée" : "J'ai trouvé un objet"}
            </Link>
            {isOwner ? (
              <Link href="/matches" className="btn btn-secondary mt-2 w-full">
                Voir mes correspondances
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 px-3 py-2">
      <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className="mt-0.5 font-semibold text-slate-800">{value}</div>
    </div>
  );
}
