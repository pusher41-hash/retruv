import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { foundItems, lostItems, matches } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { jsonError, jsonOk, handleApiError } from "@/lib/api";
import { createNotification, logAudit } from "@/lib/security";

type Params = { params: Promise<{ id: string }> };

const patchSchema = z.object({
  action: z.enum(["withdraw", "hide", "show"]),
  reason: z.string().max(500).optional(),
});

/**
 * Mirror of api/lost/[id] — see that file for why this exists. Withdrawing
 * a found declaration also releases any open match, freeing the linked
 * lost item to be matched again instead of staying stuck on this one.
 */
export async function PATCH(req: Request, { params }: Params) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const isStaff = user.role === "admin" || user.role === "moderator";

    const [item] = await db
      .select()
      .from(foundItems)
      .where(eq(foundItems.id, id))
      .limit(1);
    if (!item) return jsonError("Déclaration introuvable", 404);
    if (item.userId !== user.id && !isStaff) {
      return jsonError("Accès refusé", 403);
    }

    const { action, reason } = patchSchema.parse(await req.json());

    if (action === "hide" || action === "show") {
      if (!isStaff) return jsonError("Accès refusé", 403);
      const [updated] = await db
        .update(foundItems)
        .set({
          moderationStatus: action === "hide" ? "rejected" : "approved",
          moderatedBy: user.id,
          moderatedAt: new Date(),
          moderationNotes: action === "hide" ? reason || "Masqué par un administrateur" : null,
        })
        .where(eq(foundItems.id, id))
        .returning();

      await logAudit({
        userId: user.id,
        action: `found_item.${action}`,
        entityType: "found_item",
        entityId: id,
        metadata: reason ? { reason } : undefined,
      });

      return jsonOk({ item: updated });
    }

    if (action === "withdraw") {
      if (item.status === "recovered") {
        return jsonError("Cet objet a déjà été remis à son propriétaire, impossible de retirer la déclaration.");
      }
      if (item.status === "withdrawn") {
        return jsonOk({ item });
      }

      const openMatches = await db
        .select()
        .from(matches)
        .where(
          and(
            eq(matches.foundItemId, id),
            inArray(matches.status, ["pending", "notified", "verifying", "verified"])
          )
        );

      for (const m of openMatches) {
        await db
          .update(matches)
          .set({ status: "rejected", updatedAt: new Date() })
          .where(eq(matches.id, m.id));
        await db
          .update(lostItems)
          .set({ status: "active", updatedAt: new Date() })
          .where(eq(lostItems.id, m.lostItemId));
        const [lost] = await db
          .select()
          .from(lostItems)
          .where(eq(lostItems.id, m.lostItemId))
          .limit(1);
        if (lost) {
          await createNotification({
            userId: lost.userId,
            type: "system",
            title: "Déclaration retirée",
            body: "Le trouveur a retiré sa déclaration. Votre déclaration de perte redevient active et peut correspondre à d'autres objets trouvés.",
            link: `/lost/${lost.id}`,
          });
        }
      }

      const [updated] = await db
        .update(foundItems)
        .set({ status: "withdrawn", updatedAt: new Date() })
        .where(eq(foundItems.id, id))
        .returning();

      await logAudit({
        userId: user.id,
        action: "found_item.withdraw",
        entityType: "found_item",
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
