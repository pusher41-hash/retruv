/**
 * Shared, verbatim-identical logic between api/lost and api/found —
 * everything up to (not including) the actual insert, whose fields
 * genuinely differ between the two (lostDate/rewardAmount vs.
 * foundDate/recoveryPointId/privateDataEncrypted).
 *
 * This exists because the duplication was a real, demonstrated risk: the
 * country-default fix ("BF" → "IT") and the categoryId/subcategoryId
 * mismatch validation (see resolveDeclarationCategory below) both had to be
 * applied twice, by hand, in two files — exactly the kind of drift a future
 * fix could silently miss in one of the two routes.
 */
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { categories, type foundItems, type lostItems } from "@/db/schema";
import {
  getCategoryFieldConfig,
  isPersonCategory,
  type CategoryFieldConfig,
} from "./category-fields";
import {
  checkDeclarationRate,
  checkDuplicateDeclaration,
  isSensitiveCategory,
} from "./security";
import { getClientIp, verifyTurnstileToken } from "./turnstile";
import { CAPTCHA_DECLARATION_THRESHOLD, DECLARATION_EXPIRY_DAYS } from "./constants";
import { extractKeywords } from "./utils";

export type CategoryResolution =
  | {
      ok: true;
      cat: typeof categories.$inferSelect;
      subSlug: string;
      fieldConfig: CategoryFieldConfig;
      sensitive: boolean;
      requiresModeration: boolean;
    }
  | { ok: false; error: string };

/** Resolves + validates category/subcategory and derives the config both routes need from it. */
export async function resolveDeclarationCategory(
  categoryId: string,
  subcategoryId: string | null | undefined
): Promise<CategoryResolution> {
  const [cat] = await db
    .select()
    .from(categories)
    .where(eq(categories.id, categoryId))
    .limit(1);
  if (!cat) return { ok: false, error: "Catégorie invalide" };

  let subSlug = "";
  if (subcategoryId) {
    const [sub] = await db
      .select()
      .from(categories)
      .where(eq(categories.id, subcategoryId))
      .limit(1);
    if (!sub || sub.parentId !== cat.id) {
      return { ok: false, error: "Sous-catégorie invalide pour cette catégorie" };
    }
    subSlug = sub.slug;
  }

  const sensitive =
    cat.isSensitive || isSensitiveCategory(cat.slug) || isSensitiveCategory(subSlug);
  const fieldConfig = getCategoryFieldConfig(cat.slug, subSlug);
  // Defense in depth: missing-person content is always moderated, regardless
  // of what fieldConfig resolved to.
  const requiresModeration =
    fieldConfig.requiresModeration || isPersonCategory(cat.slug, subSlug);

  return { ok: true, cat, subSlug, fieldConfig, sensitive, requiresModeration };
}

export type GuardResult =
  | { ok: true }
  | { ok: false; error: string; status: number };

/** Rate limit → duplicate-submission check → CAPTCHA past the rate threshold, in that order. */
export async function checkDeclarationGuards(opts: {
  userId: string;
  title: string;
  city: string;
  turnstileToken?: string;
  table: typeof lostItems | typeof foundItems;
  req: Request;
}): Promise<GuardResult> {
  const rate = await checkDeclarationRate(opts.userId);
  if (!rate.ok) return { ok: false, error: rate.reason ?? "Limite atteinte", status: 429 };

  const dup = await checkDuplicateDeclaration(opts.table, opts.userId, opts.title, opts.city);
  if (!dup.ok) return { ok: false, error: dup.reason ?? "Déclaration en double", status: 429 };

  if (rate.count >= CAPTCHA_DECLARATION_THRESHOLD) {
    const captcha = await verifyTurnstileToken(opts.turnstileToken, getClientIp(opts.req));
    if (!captcha.ok) {
      return {
        ok: false,
        error: captcha.reason ?? "Vérification anti-robot échouée",
        status: 403,
      };
    }
  }

  return { ok: true };
}

export function computeDeclarationExpiresAt(): Date {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + DECLARATION_EXPIRY_DAYS);
  return expiresAt;
}

export function buildDeclarationKeywords(
  fields: (string | null | undefined)[],
  sanitizedDetails: Record<string, string> | null
): string[] {
  return extractKeywords(
    [...fields, ...(sanitizedDetails ? Object.values(sanitizedDetails) : [])]
      .filter(Boolean)
      .join(" ")
  );
}
