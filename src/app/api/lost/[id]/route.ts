import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { foundItems, lostItems, matches } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { jsonError, jsonOk, handleApiError } from "@/lib/api";
import { createNotification, logAudit } from "@/lib/security";

type Params = { params: Promise<{ id: string }> };

const patchSchema = z.object({
  action: z.literal("withdraw"),
});

/**
 * The only mutation this route supports today is withdrawal — a declarer
 * retrieving their item by other means, or correcting a mistaken
 * declaration, previously had no way out at all: `lostItems.status` has a
 * `"withdrawn"` value in its enum that nothing ever assigned. Any match
 * still open on this item is released too, so the other party's item
 * becomes available for matching again instead of staying silently stuck.
 */
export async function PATCH(req: Request, { params }: Params) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const isStaff = user.role === "admin" || user.role === "moderator";

    const [item] = await db
      .select()
      .from(lostItems)
      .where(eq(lostItems.id, id))
      .limit(1);
    if (!item) return jsonError("Déclaration introuvable", 404);
    if (item.userId !== user.id && !isStaff) {
      return jsonError("Accès refusé", 403);
    }

    const { action } = patchSchema.parse(await req.json());

    if (action === "withdraw") {
      if (item.status === "recovered") {
        return jsonError("Cet objet a déjà été récupéré, impossible de retirer la déclaration.");
      }
      if (item.status === "withdrawn") {
        return jsonOk({ item });
      }

      const openMatches = await db
        .select()
        .from(matches)
        .where(
          and(
            eq(matches.lostItemId, id),
            inArray(matches.status, ["pending", "notified", "verifying", "verified"])
          )
        );

      for (const m of openMatches) {
        await db
          .update(matches)
          .set({ status: "rejected", updatedAt: new Date() })
          .where(eq(matches.id, m.id));
        await db
          .update(foundItems)
          .set({ status: "active", updatedAt: new Date() })
          .where(eq(foundItems.id, m.foundItemId));
        const [found] = await db
          .select()
          .from(foundItems)
          .where(eq(foundItems.id, m.foundItemId))
          .limit(1);
        if (found) {
          await createNotification({
            userId: found.userId,
            type: "system",
            title: "Déclaration retirée",
            body: "Le déclarant a retiré sa déclaration de perte. Votre objet trouvé redevient actif et peut correspondre à d'autres déclarations.",
            link: `/found/${found.id}`,
          });
        }
      }

      const [updated] = await db
        .update(lostItems)
        .set({ status: "withdrawn", updatedAt: new Date() })
        .where(eq(lostItems.id, id))
        .returning();

      await logAudit({
        userId: user.id,
        action: "lost_item.withdraw",
        entityType: "lost_item",
        entityId: id,
      });

      return jsonOk({ item: updated });
    }

    return jsonError("Action inconnue");
  } catch (err) {
    if (err instanceof z.ZodError) {
      return jsonError(err.issues[0]?.message ?? "Données invalides");
    }
    return handleApiError(err);
  }
}
