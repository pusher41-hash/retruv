import { desc, eq, and, inArray, isNull } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { categories, foundItems, recoveryPoints, uploads, users } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { jsonError, jsonOk, handleApiError } from "@/lib/api";
import { CAPTCHA_DECLARATION_THRESHOLD, DECLARATION_EXPIRY_DAYS } from "@/lib/constants";
import { extractKeywords } from "@/lib/utils";
import { runMatchingForFoundItem } from "@/lib/matching";
import {
  checkDeclarationRate,
  encryptPrivatePayload,
  isSensitiveCategory,
  logAudit,
  processSensitivePhotos,
  sanitizePublicDescription,
} from "@/lib/security";
import { getCategoryFieldConfig, isPersonCategory, sanitizeDetails } from "@/lib/category-fields";
import {
  notifyModeratorsOfPendingReview,
  PUBLICLY_VISIBLE_MODERATION_STATUSES,
} from "@/lib/moderation";
import { getClientIp, verifyTurnstileToken } from "@/lib/turnstile";

const createSchema = z.object({
  categoryId: z.string().uuid(),
  subcategoryId: z.string().uuid().optional().nullable(),
  title: z.string().min(3).max(200),
  description: z.string().min(10).max(2000),
  brand: z.string().max(100).optional().nullable(),
  model: z.string().max(100).optional().nullable(),
  color: z.string().max(50).optional().nullable(),
  distinctiveFeatures: z.string().max(1000).optional().nullable(),
  serialPartial: z.string().max(50).optional().nullable(),
  idPartialMasked: z.string().max(50).optional().nullable(),
  details: z.record(z.string(), z.union([z.string(), z.number()])).optional().nullable(),
  foundDate: z.string().optional().nullable(),
  foundTimeApprox: z.string().max(50).optional().nullable(),
  city: z.string().min(2).max(100),
  district: z.string().max(100).optional().nullable(),
  locationApprox: z.string().max(300).optional().nullable(),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  condition: z.string().max(50).optional().nullable(),
  recoveryPointId: z.string().uuid().optional().nullable(),
  privateData: z.record(z.string(), z.unknown()).optional().nullable(),
  photoIds: z.array(z.string().uuid()).max(6).optional().nullable(),
  country: z.string().length(2).optional(),
  turnstileToken: z.string().optional(),
});

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const city = searchParams.get("city");
    const categoryId = searchParams.get("categoryId");
    const mine = searchParams.get("mine");
    const limit = Math.min(Number(searchParams.get("limit") ?? 30), 100);

    let userId: string | null = null;
    if (mine === "1") {
      const user = await requireUser();
      userId = user.id;
    }

    const conditions = [];
    if (userId) {
      conditions.push(eq(foundItems.userId, userId));
    } else {
      conditions.push(eq(foundItems.status, "active"));
      conditions.push(inArray(foundItems.moderationStatus, PUBLICLY_VISIBLE_MODERATION_STATUSES));
    }
    if (city) conditions.push(eq(foundItems.city, city));
    if (categoryId) conditions.push(eq(foundItems.categoryId, categoryId));

    const rows = await db
      .select({
        item: foundItems,
        category: categories,
        userName: users.fullName,
        reputationLevel: users.reputationLevel,
      })
      .from(foundItems)
      .innerJoin(categories, eq(foundItems.categoryId, categories.id))
      .innerJoin(users, eq(foundItems.userId, users.id))
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(foundItems.createdAt))
      .limit(limit);

    const items = rows.map((r) => ({
      id: r.item.id,
      title: r.item.title,
      description: sanitizePublicDescription(
        r.item.description,
        r.item.isSensitive
      ),
      brand: r.item.brand,
      model: r.item.model,
      color: r.item.color,
      distinctiveFeatures: r.item.isSensitive
        ? null
        : r.item.distinctiveFeatures,
      city: r.item.city,
      district: r.item.district,
      locationApprox: r.item.locationApprox,
      foundDate: r.item.foundDate,
      condition: r.item.condition,
      status: r.item.status,
      isSensitive: r.item.isSensitive,
      photoUrls: r.item.isSensitive
        ? r.item.blurredPhotoUrls
        : r.item.photoUrls,
      category: r.category,
      rewardHidden: true,
      owner: {
        name: r.userName.split(" ")[0],
        reputationLevel: r.reputationLevel,
      },
      createdAt: r.item.createdAt,
      idPartialMasked: r.item.idPartialMasked,
      serialPartial: r.item.isSensitive ? null : r.item.serialPartial,
    }));

    return jsonOk({ items });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const body = await req.json();
    const data = createSchema.parse(body);

    const rate = await checkDeclarationRate(user.id);
    if (!rate.ok) return jsonError(rate.reason ?? "Limite atteinte", 429);

    if (rate.count >= CAPTCHA_DECLARATION_THRESHOLD) {
      const captcha = await verifyTurnstileToken(
        data.turnstileToken,
        getClientIp(req)
      );
      if (!captcha.ok) {
        return jsonError(captcha.reason ?? "Vérification anti-robot échouée", 403);
      }
    }

    const [cat] = await db
      .select()
      .from(categories)
      .where(eq(categories.id, data.categoryId))
      .limit(1);
    if (!cat) return jsonError("Catégorie invalide");

    let subSlug = "";
    if (data.subcategoryId) {
      const [sub] = await db
        .select()
        .from(categories)
        .where(eq(categories.id, data.subcategoryId))
        .limit(1);
      // A subcategory not actually belonging to the submitted category would
      // let its own config (e.g. requiresModeration) be silently skipped —
      // this is the only thing standing between "Enfant disparu" and a
      // categoryId of "Objets personnels" bypassing mandatory moderation.
      if (!sub || sub.parentId !== cat.id) {
        return jsonError("Sous-catégorie invalide pour cette catégorie");
      }
      subSlug = sub.slug;
    }

    const sensitive =
      cat.isSensitive ||
      isSensitiveCategory(cat.slug) ||
      isSensitiveCategory(subSlug);
    const fieldConfig = getCategoryFieldConfig(cat.slug, subSlug);
    const sanitizedDetails = sanitizeDetails(data.details, cat.slug, subSlug);
    // Defense in depth: missing-person content is always moderated,
    // regardless of what fieldConfig resolved to.
    const requiresModeration =
      fieldConfig.requiresModeration || isPersonCategory(cat.slug, subSlug);

    if (data.recoveryPointId) {
      const [rp] = await db
        .select()
        .from(recoveryPoints)
        .where(eq(recoveryPoints.id, data.recoveryPointId))
        .limit(1);
      if (!rp) return jsonError("Point RETRUV invalide");
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + DECLARATION_EXPIRY_DAYS);

    const keywords = extractKeywords(
      [
        data.title,
        data.description,
        data.distinctiveFeatures,
        data.brand,
        data.model,
        ...(sanitizedDetails ? Object.values(sanitizedDetails) : []),
      ]
        .filter(Boolean)
        .join(" ")
    );

    let pendingUploads: { id: string; privateFilename: string }[] = [];
    if (data.photoIds?.length) {
      const rows = await db
        .select()
        .from(uploads)
        .where(
          and(
            inArray(uploads.id, data.photoIds),
            eq(uploads.userId, user.id),
            isNull(uploads.usedAt)
          )
        );
      if (rows.length !== data.photoIds.length) {
        return jsonError("Une ou plusieurs photos sont invalides ou déjà utilisées");
      }
      pendingUploads = rows.map((r) => ({
        id: r.id,
        privateFilename: r.privateFilename,
      }));
    }

    const photos = await processSensitivePhotos(
      pendingUploads,
      sensitive && fieldConfig.blurSensitivePhotos
    );

    const [item] = await db
      .insert(foundItems)
      .values({
        userId: user.id,
        categoryId: data.categoryId,
        subcategoryId: data.subcategoryId || null,
        title: data.title.trim(),
        description: data.description.trim(),
        brand: data.brand || null,
        model: data.model || null,
        color: data.color || null,
        distinctiveFeatures: data.distinctiveFeatures || null,
        serialPartial: data.serialPartial || null,
        idPartialMasked: data.idPartialMasked || null,
        details: sanitizedDetails,
        keywords,
        foundDate: data.foundDate ? new Date(data.foundDate) : null,
        foundTimeApprox: data.foundTimeApprox || null,
        city: data.city,
        district: data.district || null,
        locationApprox: data.locationApprox || null,
        latitude: data.latitude ?? null,
        longitude: data.longitude ?? null,
        condition: data.condition || null,
        recoveryPointId: data.recoveryPointId || null,
        photoUrls: sensitive && fieldConfig.blurSensitivePhotos ? [] : photos.publicUrls,
        blurredPhotoUrls: photos.blurredUrls,
        privateDataEncrypted: data.privateData
          ? encryptPrivatePayload(data.privateData)
          : null,
        isSensitive: sensitive,
        moderationStatus: requiresModeration ? "pending_review" : "auto_approved",
        status: "active",
        expiresAt,
        country: data.country || user.country || "IT",
      })
      .returning();

    if (pendingUploads.length) {
      await db
        .update(uploads)
        .set({ usedAt: new Date() })
        .where(
          inArray(
            uploads.id,
            pendingUploads.map((p) => p.id)
          )
        );
    }

    await logAudit({
      userId: user.id,
      action: "found.create",
      entityType: "found_item",
      entityId: item.id,
    });

    if (item.moderationStatus === "pending_review") {
      await notifyModeratorsOfPendingReview("found", item);
      return jsonOk(
        { item: { ...item, privateDataEncrypted: undefined }, matchesFound: 0, pendingModeration: true },
        201
      );
    }

    const matchResults = await runMatchingForFoundItem(item.id);

    return jsonOk({ item: { ...item, privateDataEncrypted: undefined }, matchesFound: matchResults.length }, 201);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return jsonError(err.issues[0]?.message ?? "Données invalides");
    }
    return handleApiError(err);
  }
}
