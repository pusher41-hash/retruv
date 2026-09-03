import Link from "next/link";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/db";
import { categories, foundItems } from "@/db/schema";
import { PageHeader, StatusBadge } from "@/components/ui";
import { formatRelative } from "@/lib/utils";
import { sanitizePublicDescription } from "@/lib/security";
import { getCategoryFieldConfig } from "@/lib/category-fields";
import { PUBLICLY_VISIBLE_MODERATION_STATUSES } from "@/lib/moderation";
import { CategoryIcon } from "@/lib/category-icons";
import { MapPin } from "lucide-react";

const subcategories = alias(categories, "subcategories");

export const dynamic = "force-dynamic";

const PAGE_SIZE = 24;

export default async function FoundListPage({
  searchParams,
}: {
  searchParams: Promise<{ city?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const city = sp.city;
  const page = Math.max(1, Number(sp.page) || 1);

  const [allRows, topCities] = await Promise.all([
    db
      .select({ item: foundItems, category: categories, subcategorySlug: subcategories.slug })
      .from(foundItems)
      .innerJoin(categories, eq(foundItems.categoryId, categories.id))
      .leftJoin(subcategories, eq(foundItems.subcategoryId, subcategories.id))
      .where(
        and(
          city ? eq(foundItems.city, city) : eq(foundItems.status, "active"),
          inArray(foundItems.moderationStatus, PUBLICLY_VISIBLE_MODERATION_STATUSES)
        )
      )
      .orderBy(desc(foundItems.createdAt))
      .limit(PAGE_SIZE + 1)
      .offset((page - 1) * PAGE_SIZE),
    // Cities actually in use worldwide, not a fixed list from one country.
    db
      .select({ city: foundItems.city, count: sql<number>`count(*)::int` })
      .from(foundItems)
      .where(eq(foundItems.status, "active"))
      .groupBy(foundItems.city)
      .orderBy(desc(sql`count(*)`))
      .limit(8),
  ]);

  const rows = allRows.slice(0, PAGE_SIZE);
  const hasMore = allRows.length > PAGE_SIZE;
  const pageHref = (p: number) =>
    `/found?${city ? `city=${encodeURIComponent(city)}&` : ""}page=${p}`;

  return (
    <div className="container-app py-8">
      <PageHeader
        eyebrow="Recherche"
        title="Objets trouvés"
        description="Les documents sensibles sont automatiquement protégés."
        action={
          <Link href="/declare/found" className="btn btn-accent">
            J&apos;ai trouvé
          </Link>
        }
      />

      <div className="mb-5 flex flex-wrap gap-2">
        <Link
          href="/found"
          className={`rounded-full px-3 py-1.5 text-sm font-semibold ${
            !city ? "bg-retruv-navy text-white" : "bg-white text-slate-600"
          }`}
        >
          Toutes
        </Link>
        {topCities.map(({ city: c }) => (
          <Link
            key={c}
            href={`/found?city=${encodeURIComponent(c)}`}
            className={`rounded-full px-3 py-1.5 text-sm font-semibold ${
              city === c ? "bg-retruv-navy text-white" : "bg-white text-slate-600"
            }`}
          >
            {c}
          </Link>
        ))}
      </div>

      <div className="grid gap-3">
        {rows.map(({ item, category, subcategorySlug }) => {
          const fieldConfig = getCategoryFieldConfig(category.slug, subcategorySlug);
          return (
          <Link key={item.id} href={`/found/${item.id}`} className="card p-4">
            <div className="flex gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-50">
                <CategoryIcon slug={category.slug} className="h-6 w-6 text-retruv-teal" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-bold text-slate-900">{item.title}</h2>
                  <StatusBadge status={item.status} />
                  {item.isSensitive ? (
                    <span className="badge border-rose-200 bg-rose-50 text-rose-700">
                      {fieldConfig.safetyNotice ? "Personne" : "Sensible"}
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 line-clamp-2 text-sm text-slate-600">
                  {item.isSensitive && fieldConfig.blurSensitivePhotos
                    ? "Document sensible — détails masqués. Utilisez la vérification de propriété."
                    : sanitizePublicDescription(item.description, item.isSensitive)}
                </p>
                <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                  <span>{category.nameFr}</span>
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {item.city}
                  </span>
                  <span>{formatRelative(item.createdAt)}</span>
                </div>
              </div>
            </div>
          </Link>
          );
        })}
        {rows.length === 0 ? (
          <div className="card p-8 text-center text-slate-500">
            Aucune déclaration pour ce filtre.
          </div>
        ) : null}
      </div>

      {page > 1 || hasMore ? (
        <div className="mt-6 flex items-center justify-center gap-3">
          {page > 1 ? (
            <Link href={pageHref(page - 1)} className="btn btn-secondary">
              ← Précédent
            </Link>
          ) : null}
          <span className="text-sm font-semibold text-slate-500">Page {page}</span>
          {hasMore ? (
            <Link href={pageHref(page + 1)} className="btn btn-secondary">
              Suivant →
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
