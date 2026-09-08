import { eq } from "drizzle-orm";
import { db } from "@/db";
import {
  categories,
  conversations,
  foundItems,
  lostItems,
  matches,
  recoveries,
  users,
  verifications,
} from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { jsonError, jsonOk, handleApiError } from "@/lib/api";
import { sanitizePublicDescription } from "@/lib/security";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  try {
    const user = await requireUser();
    const { id } = await params;

    const [row] = await db
      .select({
        match: matches,
        lost: lostItems,
        found: foundItems,
        lostCat: categories,
      })
      .from(matches)
      .innerJoin(lostItems, eq(matches.lostItemId, lostItems.id))
      .innerJoin(foundItems, eq(matches.foundItemId, foundItems.id))
      .innerJoin(categories, eq(lostItems.categoryId, categories.id))
      .where(eq(matches.id, id))
      .limit(1);

    if (!row) return jsonError("Correspondance introuvable", 404);

    const isOwner = row.lost.userId === user.id;
    const isFinder = row.found.userId === user.id;
    const isStaff = user.role === "admin" || user.role === "moderator";

    if (!isOwner && !isFinder && !isStaff) {
      return jsonError("Accès refusé", 403);
    }

    const [lostUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, row.lost.userId))
      .limit(1);
    const [foundUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, row.found.userId))
      .limit(1);

    const verifs = await db
      .select()
      .from(verifications)
      .where(eq(verifications.matchId, id));

    const convos = await db
      .select()
      .from(conversations)
      .where(eq(conversations.matchId, id));

    const recs = await db
      .select()
      .from(recoveries)
      .where(eq(recoveries.matchId, id));

    // Privacy: never reveal full sensitive details until verified
    const verified =
      row.match.status === "verified" || row.match.status === "completed";

    return jsonOk({
      match: {
        id: row.match.id,
        score: row.match.score,
        level: row.match.level,
        status: row.match.status,
        scoreBreakdown: row.match.scoreBreakdown,
        createdAt: row.match.createdAt,
      },
      role: isOwner ? "owner" : isFinder ? "finder" : "staff",
      lostItem: {
        id: row.lost.id,
        title: row.lost.title,
        description: isOwner
          ? row.lost.description
          : sanitizePublicDescription(row.lost.description, row.lost.isSensitive),
        city: row.lost.city,
        district: verified || isOwner ? row.lost.district : row.lost.district,
        locationApprox: row.lost.locationApprox,
        lostDate: row.lost.lostDate,
        color: row.lost.color,
        brand: row.lost.brand,
        model: row.lost.model,
        status: row.lost.status,
        isSensitive: row.lost.isSensitive,
        rewardAmount: row.lost.rewardAmount,
        category: row.lostCat,
        distinctiveFeatures:
          isOwner || verified ? row.lost.distinctiveFeatures : null,
        idPartialMasked: row.lost.idPartialMasked,
      },
      foundItem: {
        id: row.found.id,
        title: row.found.title,
        description:
          isFinder || verified
            ? row.found.description
            : sanitizePublicDescription(
                row.found.description,
                row.found.isSensitive
              ),
        city: row.found.city,
        district: row.found.district,
        locationApprox: verified || isFinder ? row.found.locationApprox : row.found.city,
        foundDate: row.found.foundDate,
        color: row.found.color,
        brand: row.found.brand,
        model: row.found.model,
        condition: row.found.condition,
        status: row.found.status,
        isSensitive: row.found.isSensitive,
        recoveryPointId: row.found.recoveryPointId,
        distinctiveFeatures:
          isFinder || verified ? row.found.distinctiveFeatures : null,
        idPartialMasked: row.found.idPartialMasked,
      },
      owner: lostUser
        ? {
            id: lostUser.id,
            name: lostUser.fullName.split(" ")[0],
            reputationLevel: lostUser.reputationLevel,
            reputationScore: lostUser.reputationScore,
            city: lostUser.city,
          }
        : null,
      finder: foundUser
        ? {
            id: foundUser.id,
            name: foundUser.fullName.split(" ")[0],
            reputationLevel: foundUser.reputationLevel,
            reputationScore: foundUser.reputationScore,
            city: foundUser.city,
          }
        : null,
      verifications: verifs.map((v) => ({
        id: v.id,
        status: v.status,
        score: v.score,
        attemptsUsed: v.attemptsUsed,
        maxAttempts: v.maxAttempts,
        // Never include `expectedHint` here, even for the owner: the owner
        // IS the claimant these questions test (see verify/route.ts — only
        // row.lost.userId may submit answers), so leaking the expected
        // answer to them defeats the entire ownership-verification check.
        questions: v.questions?.map((q) => ({
          id: q.id,
          question: q.question,
          type: q.type,
        })),
        createdAt: v.createdAt,
        claimantId: v.claimantId,
      })),
      conversationId: convos[0]?.id ?? null,
      // The restitution code is never returned via API: it only reaches
      // owner and finder as a private notification.
      recovery: recs[0]
        ? {
            id: recs[0].id,
            matchId: recs[0].matchId,
            method: recs[0].method,
            status: recs[0].status,
            recoveryPointId: recs[0].recoveryPointId,
            meetupLocation: recs[0].meetupLocation,
            meetupDate: recs[0].meetupDate,
            notes: recs[0].notes,
            ownerConfirmed: recs[0].ownerConfirmed,
            finderConfirmed: recs[0].finderConfirmed,
            hasRestitutionCode: !!recs[0].restitutionCode,
            completedAt: recs[0].completedAt,
            createdAt: recs[0].createdAt,
          }
        : null,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
