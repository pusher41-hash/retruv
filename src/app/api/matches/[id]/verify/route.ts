import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import {
  conversations,
  foundItems,
  lostItems,
  matches,
  users,
  verifications,
} from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { jsonError, jsonOk, handleApiError } from "@/lib/api";
import {
  buildVerificationQuestions,
  scoreVerificationAnswers,
} from "@/lib/matching";
import {
  checkVerificationRate,
  createNotification,
  createNotifications,
  decryptIdNumber,
  flagFraud,
  logAudit,
} from "@/lib/security";
import { MAX_VERIFY_ATTEMPTS } from "@/lib/constants";

type Params = { params: Promise<{ id: string }> };

const answerSchema = z.object({
  answers: z.record(z.string(), z.string()),
});

export async function POST(req: Request, { params }: Params) {
  try {
    const user = await requireUser();
    const { id } = await params;

    const rate = await checkVerificationRate(user.id);
    if (!rate.ok) return jsonError(rate.reason ?? "Limite atteinte", 429);

    const [row] = await db
      .select({
        match: matches,
        lost: lostItems,
        found: foundItems,
      })
      .from(matches)
      .innerJoin(lostItems, eq(matches.lostItemId, lostItems.id))
      .innerJoin(foundItems, eq(matches.foundItemId, foundItems.id))
      .where(eq(matches.id, id))
      .limit(1);

    if (!row) return jsonError("Correspondance introuvable", 404);

    // Only the owner of the lost item can claim ownership
    if (row.lost.userId !== user.id) {
      return jsonError("Seul le déclarant de la perte peut se vérifier", 403);
    }

    const body = await req.json().catch(() => ({}));
    const hasAnswers = body && body.answers;

    // Start verification if no open one
    let [verif] = await db
      .select()
      .from(verifications)
      .where(eq(verifications.matchId, id))
      .limit(1);

    if (!verif) {
      const questions = buildVerificationQuestions(row.lost);
      [verif] = await db
        .insert(verifications)
        .values({
          matchId: id,
          claimantId: user.id,
          questions,
          status: "pending",
          maxAttempts: MAX_VERIFY_ATTEMPTS,
        })
        .returning();

      await db
        .update(matches)
        .set({ status: "verifying", updatedAt: new Date() })
        .where(eq(matches.id, id));

      await createNotification({
        userId: row.found.userId,
        type: "verification_request",
        title: "Vérification de propriété en cours",
        body: "Le propriétaire potentiel répond aux questions de vérification.",
        link: `/matches/${id}`,
      });

      if (!hasAnswers) {
        return jsonOk({
          verification: {
            id: verif.id,
            questions: questions.map((q) => ({
              id: q.id,
              question: q.question,
              type: q.type,
            })),
            attemptsUsed: 0,
            maxAttempts: MAX_VERIFY_ATTEMPTS,
            status: "pending",
          },
        });
      }
    }

    if (verif.status === "passed") {
      return jsonOk({
        verification: {
          id: verif.id,
          status: "passed",
          score: verif.score,
        },
        message: "Déjà vérifié",
      });
    }

    if (verif.attemptsUsed >= verif.maxAttempts) {
      return jsonError(
        "Nombre maximum de tentatives atteint. Un modérateur doit intervenir.",
        429
      );
    }

    if (!hasAnswers) {
      return jsonOk({
        verification: {
          id: verif.id,
          questions: (verif.questions ?? []).map((q) => ({
            id: q.id,
            question: q.question,
            type: q.type,
          })),
          attemptsUsed: verif.attemptsUsed,
          maxAttempts: verif.maxAttempts,
          status: verif.status,
        },
      });
    }

    const { answers } = answerSchema.parse(body);
    let score = scoreVerificationAnswers(verif.questions ?? [], answers);

    // The "numéro complet" question (see buildVerificationQuestions) is
    // deliberately stored with no expectedHint — verifications.questions is
    // plaintext at rest, and baking the decrypted number in there would
    // undo the point of encrypting idFullEncrypted. Compare it here
    // instead, decrypting fresh and only for the duration of this request.
    const idAnswer = answers.serial_end;
    if (row.lost.idFullEncrypted && idAnswer) {
      const realId = decryptIdNumber(row.lost.idFullEncrypted);
      if (realId && realId.trim().toLowerCase() === idAnswer.trim().toLowerCase()) {
        score = Math.max(score, 95);
      }
    }

    const attemptsUsed = verif.attemptsUsed + 1;
    const passed = score >= 70;

    await db
      .update(verifications)
      .set({
        answers,
        score,
        attemptsUsed,
        status: passed ? "passed" : attemptsUsed >= verif.maxAttempts ? "failed" : "pending",
        updatedAt: new Date(),
      })
      .where(eq(verifications.id, verif.id));

    if (!passed) {
      await db
        .update(users)
        .set({
          failedVerifyAttempts: user.failedVerifyAttempts + 1,
          updatedAt: new Date(),
        })
        .where(eq(users.id, user.id));

      if (score < 30) {
        await flagFraud({
          userId: user.id,
          flagType: "weak_verification",
          severity: 2,
          details: `Score vérification ${score}% sur match ${id}`,
        });
      }

      await logAudit({
        userId: user.id,
        action: "verification.failed",
        entityType: "match",
        entityId: id,
        metadata: { score, attemptsUsed },
      });

      // Definitively exhausted: without this, `matches.status` stayed stuck
      // on "verifying" forever (set when the first attempt started, never
      // moved again) and both items stayed "matched" — permanently excluded
      // from `fetchFoundCandidates`/`fetchLostCandidates`, which only ever
      // consider `status = "active"`. A genuine future match for either
      // item could then never be computed. Reopening both items lets the
      // real owner (if this claimant was mistaken or fraudulent) still be
      // found by a later declaration or the next matching run.
      if (attemptsUsed >= verif.maxAttempts) {
        await db
          .update(matches)
          .set({ status: "rejected", updatedAt: new Date() })
          .where(eq(matches.id, id));
        await db
          .update(lostItems)
          .set({ status: "active", updatedAt: new Date() })
          .where(eq(lostItems.id, row.lost.id));
        await db
          .update(foundItems)
          .set({ status: "active", updatedAt: new Date() })
          .where(eq(foundItems.id, row.found.id));

        await createNotification({
          userId: row.found.userId,
          type: "verification_result",
          title: "Vérification échouée",
          body: "La vérification de propriété a échoué. L'objet trouvé redevient actif et peut correspondre à d'autres déclarations.",
          link: `/found/${row.found.id}`,
        });
      }

      return jsonOk({
        verification: {
          id: verif.id,
          status: attemptsUsed >= verif.maxAttempts ? "failed" : "pending",
          score,
          attemptsUsed,
          maxAttempts: verif.maxAttempts,
          passed: false,
        },
        message:
          attemptsUsed >= verif.maxAttempts
            ? "Vérification échouée. Contactez le support."
            : `Score insuffisant (${score}%). Il vous reste ${verif.maxAttempts - attemptsUsed} tentative(s).`,
      });
    }

    // Passed
    await db
      .update(matches)
      .set({ status: "verified", updatedAt: new Date() })
      .where(eq(matches.id, id));

    await db
      .update(lostItems)
      .set({ status: "in_recovery", updatedAt: new Date() })
      .where(eq(lostItems.id, row.lost.id));
    await db
      .update(foundItems)
      .set({ status: "in_recovery", updatedAt: new Date() })
      .where(eq(foundItems.id, row.found.id));

    // Open conversation
    let [convo] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.matchId, id))
      .limit(1);

    if (!convo) {
      [convo] = await db
        .insert(conversations)
        .values({
          matchId: id,
          participant1Id: row.lost.userId,
          participant2Id: row.found.userId,
        })
        .returning();
    }

    await createNotifications([
      {
        userId: row.found.userId,
        type: "verification_result",
        title: "Propriété vérifiée",
        body: "La vérification de propriété a réussi. Vous pouvez maintenant discuter pour organiser la récupération.",
        link: `/matches/${id}`,
      },
      {
        userId: user.id,
        type: "verification_result",
        title: "Vérification réussie",
        body: `Félicitations ! Score de vérification : ${score}%. Discutez avec le trouveur pour récupérer votre objet.`,
        link: `/messages/${convo.id}`,
      },
    ]);

    await logAudit({
      userId: user.id,
      action: "verification.passed",
      entityType: "match",
      entityId: id,
      metadata: { score },
    });

    return jsonOk({
      verification: {
        id: verif.id,
        status: "passed",
        score,
        attemptsUsed,
        maxAttempts: verif.maxAttempts,
        passed: true,
      },
      conversationId: convo.id,
      message: "Propriété vérifiée avec succès",
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return jsonError(err.issues[0]?.message ?? "Données invalides");
    }
    return handleApiError(err);
  }
}
