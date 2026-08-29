import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { categories, foundItems, recoveryPoints, users } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import {
  PageHeader,
  ReputationBadge,
  StatusBadge,
} from "@/components/ui";
import { formatDate, formatRelative } from "@/lib/utils";
import { sanitizePublicDescription } from "@/lib/security";
import { CategoryIcon } from "@/lib/category-icons";
import { getCategoryFieldConfig } from "@/lib/category-fields";

export const dynamic = "force-dynamic";

export default async function FoundDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const me = await getSessionUser();

  const [row] = await db
    .select({
      item: foundItems,
      category: categories,
      user: users,
    })
    .from(foundItems)
    .innerJoin(categories, eq(foundItems.categoryId, categories.id))
    .innerJoin(users, eq(foundItems.userId, users.id))
    .where(eq(foundItems.id, id))
    .limit(1);

  if (!row) notFound();

  const isStaff = me?.role === "admin" || me?.role === "moderator";
  const isFinder = me?.id === row.item.userId;
  if (
    row.item.moderationStatus !== "auto_approved" &&
    row.item.moderationStatus !== "approved" &&
    !isFinder &&
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

  let point = null;
  if (row.item.recoveryPointId) {
    const [p] = await db
      .select()
      .from(recoveryPoints)
      .where(eq(recoveryPoints.id, row.item.recoveryPointId))
      .limit(1);
    point = p;
  }

  // A missing person's public appeal needs its description and photo
  // visible even though the category is flagged sensitive — only the
  // category's own blur setting (never blurred for persons) gates that.
  const description =
    isFinder || !fieldConfig.blurSensitivePhotos
      ? sanitizePublicDescription(row.item.description, row.item.isSensitive)
      : "Document sensible trouvé. Les détails identifiants sont masqués. Si c'est le vôtre, déclarez votre perte et passez la vérification.";

  const photos =
    (isFinder || !fieldConfig.blurSensitivePhotos
      ? row.item.photoUrls
      : row.item.blurredPhotoUrls) ?? [];

  return (
    <div className="container-app py-8">
      <PageHeader
        eyebrow={row.category.nameFr}
        title={row.item.title}
        description={`Signalé ${formatRelative(row.item.createdAt)} · ${row.item.city}`}
        action={<StatusBadge status={row.item.status} />}
      />

      {row.item.moderationStatus === "pending_review" ? (
        <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <strong>En cours de vérification :</strong> ce signalement n&apos;est
          visible que par vous tant qu&apos;un modérateur RETRUV ne l&apos;a pas
          validé — généralement sous quelques heures.
        </div>
      ) : row.item.moderationStatus === "rejected" ? (
        <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
          <strong>Signalement non validé</strong>
          {row.item.moderationNotes ? ` : ${row.item.moderationNotes}` : "."} Il
          n&apos;est visible que par vous et n&apos;apparaît pas publiquement.
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[1.4fr_0.8fr]">
        <div className="card space-y-4 p-5 sm:p-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-teal-50">
            <CategoryIcon slug={row.category.slug} className="h-8 w-8 text-retruv-teal" />
          </div>
          <p className="leading-relaxed text-slate-700">{description}</p>

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
          {fieldConfig.blurSensitivePhotos && !isFinder && photos.length > 0 ? (
            <p className="text-xs text-slate-500">
              Photos floutées automatiquement (document sensible).
            </p>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2">
            {row.item.brand ? <Info label="Marque" value={row.item.brand} /> : null}
            {row.item.model ? <Info label="Modèle" value={row.item.model} /> : null}
            {row.item.color ? <Info label="Couleur" value={row.item.color} /> : null}
            {row.item.condition ? (
              <Info label="État" value={row.item.condition} />
            ) : null}
            {row.item.foundDate ? (
              <Info label="Date de trouvaille" value={formatDate(row.item.foundDate)} />
            ) : null}
            <Info label="Ville" value={row.item.city} />
            {row.item.district && (isFinder || !row.item.isSensitive) ? (
              <Info label="Quartier" value={row.item.district} />
            ) : null}
            {row.item.idPartialMasked ? (
              <Info label="ID partiel" value={row.item.idPartialMasked} />
            ) : null}
            {row.item.details &&
              fieldConfig.extraFields.map((f) => {
                const value = row.item.details?.[f.key];
                return value ? <Info key={f.key} label={f.label} value={value} /> : null;
              })}
          </div>

          {fieldConfig.safetyNotice ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
              <strong>Avant toute chose :</strong> {fieldConfig.safetyNotice}
            </div>
          ) : null}

          {point ? (
            <div className="rounded-2xl border border-teal-200 bg-teal-50 p-4 text-sm text-teal-900">
              <p className="font-bold">Disponible au Point RETRUV</p>
              <p className="mt-1">
                {point.name} — {point.address}, {point.city}
              </p>
              {point.hours ? <p className="mt-1">Horaires : {point.hours}</p> : null}
            </div>
          ) : null}
        </div>

        <div className="space-y-4">
          <div className="card p-5">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Trouveur
            </p>
            <p className="mt-2 text-lg font-bold text-retruv-navy">
              {row.user.fullName.split(" ")[0]}
            </p>
            <div className="mt-2">
              <ReputationBadge level={row.user.reputationLevel} />
            </div>
          </div>
          <div className="card p-5">
            <p className="font-bold text-slate-900">
              {fieldConfig.safetyNotice ? "C'est la personne que vous recherchez ?" : "C'est à vous ?"}
            </p>
            <p className="mt-2 text-sm text-slate-600">
              {fieldConfig.safetyNotice
                ? "Contactez la police pour confirmer l'identité, puis déclarez la disparition sur RETRUV pour permettre la mise en relation."
                : "Déclarez la perte avec les mêmes caractéristiques. RETRUV proposera une correspondance, puis une vérification."}
            </p>
            <Link href="/declare/lost" className="btn btn-primary mt-4 w-full">
              {fieldConfig.safetyNotice ? "Déclarer une disparition" : "Déclarer une perte"}
            </Link>
            <Link href="/matches" className="btn btn-secondary mt-2 w-full">
              Voir les correspondances
            </Link>
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
