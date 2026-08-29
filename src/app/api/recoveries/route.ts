import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import {
  foundItems,
  lostItems,
  matches,
  ratings,
  recoveries,
  recoveryPoints,
  users,
} from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { jsonError, jsonOk, handleApiError } from "@/lib/api";
import {
  checkRatingRate,
  createNotification,
  createNotifications,
  generateRestitutionCode,
  logAudit,
  ratingTrustWeight,
} from "@/lib/security";
import { REPUTATION_THRESHOLDS } from "@/lib/constants";

/**
 * Generates a restitution code the first time a recovery reaches a stage
 * where physical handover becomes possible, and notifies owner + finder
 * separately. The code is never included in the shared recovery object
 * returned by GET-style responses — only pushed via personal notifications.
 */
async function ensureRestitutionCode(params: {
  recoveryId: string;
  existingCode: string | null;
  matchId: string;
  ownerId: string;
  finderId: string;
}): Promise<string> {
  if (params.existingCode) return params.existingCode;

  const code = generateRestitutionCode();
  await db
    .update(recoveries)
    .set({ restitutionCode: code, updatedAt: new Date() })
    .where(eq(recoveries.id, params.recoveryId));

  await createNotifications([
    {
      userId: params.ownerId,
      type: "recovery_update",
      title: "Code de restitution RETRUV",
      body: `Votre code de restitution est ${code}. Présentez-le uniquement au moment de la remise physique, jamais avant.`,
      link: `/matches/${params.matchId}`,
    },
    {
      userId: params.finderId,
      type: "recovery_update",
      title: "Code de restitution RETRUV",
      body: `Le code de restitution pour cette remise est ${code}. Demandez-le au propriétaire avant de remettre l'objet.`,
      link: `/matches/${params.matchId}`,
    },
  ]);

  await logAudit({
    action: "recovery.restitution_code_issued",
    entityType: "recovery",
    entityId: params.recoveryId,
  });

  return code;
}

const createSchema = z.object({
  matchId: z.string().uuid(),
  method: z.enum(["direct_meetup", "recovery_point", "delivery", "authority"]),
  recoveryPointId: z.string().uuid().optional().nullable(),
  meetupLocation: z.string().max(300).optional().nullable(),
  meetupDate: z.string().optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
});

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const data = createSchema.parse(await req.json());

    const [row] = await db
      .select({
        match: matches,
        lost: lostItems,
        found: foundItems,
      })
      .from(matches)
      .innerJoin(lostItems, eq(matches.lostItemId, lostItems.id))
      .innerJoin(foundItems, eq(matches.foundItemId, foundItems.id))
      .where(eq(matches.id, data.matchId))
      .limit(1);

    if (!row) return jsonError("Correspondance introuvable", 404);
    if (row.match.status !== "verified" && row.match.status !== "completed") {
      return jsonError(
        "La propriété doit être vérifiée avant d'organiser la récupération"
      );
    }
    if (row.lost.userId !== user.id && row.found.userId !== user.id) {
      return jsonError("Accès refusé", 403);
    }

    // /securite documents this as a hard rule ("interdite par le système")
    // for sensitive documents (CNI, passeport, permis...) — it wasn't
    // actually enforced anywhere before this check. A direct, unmonitored
    // handover is exactly the scenario RETRUV_REDTEAM.md's "faux passeport"
    // walkthrough warns about; only a staffed Point RETRUV or an
    // authorized authority is allowed to hand over a sensitive item.
    const isSensitiveItem = row.lost.isSensitive || row.found.isSensitive;
    if (isSensitiveItem && !["recovery_point", "authority"].includes(data.method)) {
      return jsonError(
        "Pour un document sensible, la récupération doit passer par un Point RETRUV ou une autorité habilitée — la rencontre directe et la livraison ne sont pas autorisées.",
        403
      );
    }

    if (data.method === "recovery_point" && data.recoveryPointId) {
      const [rp] = await db
        .select()
        .from(recoveryPoints)
        .where(eq(recoveryPoints.id, data.recoveryPointId))
        .limit(1);
      if (!rp) return jsonError("Point RETRUV invalide");
    }

    const existing = await db
      .select()
      .from(recoveries)
      .where(eq(recoveries.matchId, data.matchId))
      .limit(1);

    if (existing[0] && existing[0].status !== "cancelled") {
      return jsonError("Une récupération existe déjà pour cette correspondance");
    }

    const [rec] = await db
      .insert(recoveries)
      .values({
        matchId: data.matchId,
        method: data.method,
        recoveryPointId: data.recoveryPointId || null,
        meetupLocation: data.meetupLocation || null,
        meetupDate: data.meetupDate ? new Date(data.meetupDate) : null,
        notes: data.notes || null,
        status:
          data.method === "recovery_point" ? "at_point" : "proposed",
      })
      .returning();

    const otherId =
      row.lost.userId === user.id ? row.found.userId : row.lost.userId;

    await createNotification({
      userId: otherId,
      type: "recovery_update",
      title: "Récupération organisée",
      body: `Une récupération a été proposée (${data.method}).`,
      link: `/matches/${data.matchId}`,
    });

    await logAudit({
      userId: user.id,
      action: "recovery.create",
      entityType: "recovery",
      entityId: rec.id,
    });

    // A recovery_point handover can happen as soon as the item is dropped
    // off, so the restitution code must exist from the start.
    if (rec.status === "at_point") {
      await ensureRestitutionCode({
        recoveryId: rec.id,
        existingCode: rec.restitutionCode,
        matchId: data.matchId,
        ownerId: row.lost.userId,
        finderId: row.found.userId,
      });
    }

    return jsonOk({ recovery: rec }, 201);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return jsonError(err.issues[0]?.message ?? "Données invalides");
    }
    return handleApiError(err);
  }
}

const confirmSchema = z.object({
  recoveryId: z.string().uuid(),
  action: z.enum(["confirm", "complete", "cancel"]),
  code: z.string().trim().length(6).optional(),
  rating: z
    .object({
      score: z.number().int().min(1).max(5),
      comment: z.string().max(500).optional(),
    })
    .optional(),
});

export async function PATCH(req: Request) {
  try {
    const user = await requireUser();
    const data = confirmSchema.parse(await req.json());

    const [rec] = await db
      .select()
      .from(recoveries)
      .where(eq(recoveries.id, data.recoveryId))
      .limit(1);
    if (!rec) return jsonError("Récupération introuvable", 404);

    const [row] = await db
      .select({
        match: matches,
        lost: lostItems,
        found: foundItems,
      })
      .from(matches)
      .innerJoin(lostItems, eq(matches.lostItemId, lostItems.id))
      .innerJoin(foundItems, eq(matches.foundItemId, foundItems.id))
      .where(eq(matches.id, rec.matchId))
      .limit(1);

    if (!row) return jsonError("Correspondance introuvable", 404);
    const isOwner = row.lost.userId === user.id;
    const isFinder = row.found.userId === user.id;
    if (!isOwner && !isFinder) return jsonError("Accès refusé", 403);

    if (data.action === "cancel") {
      const [updated] = await db
        .update(recoveries)
        .set({ status: "cancelled", updatedAt: new Date() })
        .where(eq(recoveries.id, rec.id))
        .returning();
      return jsonOk({ recovery: updated });
    }

    if (data.action === "confirm") {
      const patch: Partial<typeof recoveries.$inferInsert> = {
        updatedAt: new Date(),
        status: "accepted",
      };
      if (isOwner) patch.ownerConfirmed = true;
      if (isFinder) patch.finderConfirmed = true;

      const ownerOk = isOwner ? true : rec.ownerConfirmed;
      const finderOk = isFinder ? true : rec.finderConfirmed;
      if (ownerOk && finderOk) patch.status = "accepted";

      const [updated] = await db
        .update(recoveries)
        .set(patch)
        .where(eq(recoveries.id, rec.id))
        .returning();

      if (updated.status === "accepted") {
        await ensureRestitutionCode({
          recoveryId: updated.id,
          existingCode: updated.restitutionCode,
          matchId: updated.matchId,
          ownerId: row.lost.userId,
          finderId: row.found.userId,
        });
      }

      return jsonOk({ recovery: updated });
    }

    // complete
    const ownerConfirmed = isOwner ? true : rec.ownerConfirmed;
    const finderConfirmed = isFinder ? true : rec.finderConfirmed;
    const finalizing = ownerConfirmed && finderConfirmed;

    // The physical handover only finalizes once the restitution code —
    // known only to owner and finder via private notification — is proven.
    if (finalizing) {
      if (!rec.restitutionCode) {
        await ensureRestitutionCode({
          recoveryId: rec.id,
          existingCode: rec.restitutionCode,
          matchId: rec.matchId,
          ownerId: row.lost.userId,
          finderId: row.found.userId,
        });
        return jsonError(
          "Un code de restitution a été envoyé au propriétaire et au trouveur par notification. Renseignez-le pour confirmer la remise.",
          409
        );
      }
      if (
        !data.code ||
        data.code.toUpperCase() !== rec.restitutionCode.toUpperCase()
      ) {
        return jsonError("Code de restitution incorrect ou manquant.", 403);
      }
    }

    const [updated] = await db
      .update(recoveries)
      .set({
        ownerConfirmed,
        finderConfirmed,
        status: finalizing ? "completed" : rec.status,
        completedAt: finalizing ? new Date() : rec.completedAt,
        restitutionCodeVerifiedAt: finalizing
          ? new Date()
          : rec.restitutionCodeVerifiedAt,
        updatedAt: new Date(),
      })
      .where(eq(recoveries.id, rec.id))
      .returning();

    if (finalizing) {
      await db
        .update(matches)
        .set({ status: "completed", updatedAt: new Date() })
        .where(eq(matches.id, rec.matchId));
      await db
        .update(lostItems)
        .set({ status: "recovered", updatedAt: new Date() })
        .where(eq(lostItems.id, row.lost.id));
      await db
        .update(foundItems)
        .set({ status: "recovered", updatedAt: new Date() })
        .where(eq(foundItems.id, row.found.id));

      if (rec.recoveryPointId) {
        const [rp] = await db
          .select()
          .from(recoveryPoints)
          .where(eq(recoveryPoints.id, rec.recoveryPointId))
          .limit(1);
        if (rp) {
          await db
            .update(recoveryPoints)
            .set({
              itemsRecovered: rp.itemsRecovered + 1,
              updatedAt: new Date(),
            })
            .where(eq(recoveryPoints.id, rp.id));
        }
      }

      // Reputation boost
      await bumpReputation(row.found.userId, 10);
      await bumpReputation(row.lost.userId, 5);

      await createNotifications([
        {
          userId: row.lost.userId,
          type: "recovery_update",
          title: "Objet récupéré !",
          body: "La récupération est confirmée. Merci d'utiliser RETRUV.",
          link: `/matches/${rec.matchId}`,
        },
        {
          userId: row.found.userId,
          type: "recovery_update",
          title: "Récupération terminée",
          body: "Merci d'avoir aidé à rendre cet objet. Votre réputation a augmenté.",
          link: `/matches/${rec.matchId}`,
        },
      ]);
    }

    if (data.rating) {
      const toUserId = isOwner ? row.found.userId : row.lost.userId;
      const rateCheck = await checkRatingRate(toUserId);
      if (rateCheck.ok) {
        await db.insert(ratings).values({
          recoveryId: rec.id,
          fromUserId: user.id,
          toUserId,
          score: data.rating.score,
          comment: data.rating.comment,
        });
        const weight = ratingTrustWeight(user.reputationLevel);
        await bumpReputation(toUserId, Math.round(data.rating.score * 2 * weight));
      }
    }

    await logAudit({
      userId: user.id,
      action: "recovery.complete",
      entityType: "recovery",
      entityId: rec.id,
      metadata: finalizing ? { restitutionCodeVerified: true } : undefined,
    });

    return jsonOk({ recovery: updated });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return jsonError(err.issues[0]?.message ?? "Données invalides");
    }
    return handleApiError(err);
  }
}

async function bumpReputation(userId: string, points: number) {
  const [u] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!u) return;
  const score = u.reputationScore + points;
  let level: typeof u.reputationLevel = "new";
  if (score >= REPUTATION_THRESHOLDS.partner) level = "partner";
  else if (score >= REPUTATION_THRESHOLDS.super_finder) level = "super_finder";
  else if (score >= REPUTATION_THRESHOLDS.verified_finder)
    level = "verified_finder";
  else if (score >= REPUTATION_THRESHOLDS.reliable) level = "reliable";

  await db
    .update(users)
    .set({ reputationScore: score, reputationLevel: level, updatedAt: new Date() })
    .where(eq(users.id, userId));
}
