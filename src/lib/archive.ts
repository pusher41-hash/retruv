import { and, eq, lt, ne } from "drizzle-orm";
import { db } from "@/db";
import { archivedDeclarations, foundItems, lostItems } from "@/db/schema";
import { DECLARATION_ARCHIVE_GRACE_DAYS } from "./constants";
import { logAudit } from "./security";

/**
 * Moves lost/found declarations that expired more than
 * `DECLARATION_ARCHIVE_GRACE_DAYS` ago out of the live tables and into
 * `archivedDeclarations` (full row snapshot), then deletes the live row.
 * `recovered` items are never touched — a successful outcome is kept live
 * indefinitely, matching the retention policy already documented for RETRUV.
 *
 * Deleting the live row cascades (via existing FK `onDelete: cascade`) to
 * any matches/verifications/conversations/messages/recoveries still
 * attached to it. That is intentional: an item past its 90-day expiry plus
 * a 7-day grace period is treated as an abandoned declaration, not an
 * active case.
 */
export async function archiveExpiredDeclarations(): Promise<{
  lostArchived: number;
  foundArchived: number;
}> {
  const cutoff = new Date(
    Date.now() - DECLARATION_ARCHIVE_GRACE_DAYS * 24 * 60 * 60 * 1000
  );

  const staleLost = await db
    .select()
    .from(lostItems)
    .where(
      and(lt(lostItems.expiresAt, cutoff), ne(lostItems.status, "recovered"))
    );

  for (const item of staleLost) {
    await db.insert(archivedDeclarations).values({
      originalId: item.id,
      type: "lost",
      userId: item.userId,
      data: { ...item },
      expiredAt: item.expiresAt ?? cutoff,
    });
    await db.delete(lostItems).where(eq(lostItems.id, item.id));
  }

  const staleFound = await db
    .select()
    .from(foundItems)
    .where(
      and(lt(foundItems.expiresAt, cutoff), ne(foundItems.status, "recovered"))
    );

  for (const item of staleFound) {
    await db.insert(archivedDeclarations).values({
      originalId: item.id,
      type: "found",
      userId: item.userId,
      data: { ...item },
      expiredAt: item.expiresAt ?? cutoff,
    });
    await db.delete(foundItems).where(eq(foundItems.id, item.id));
  }

  const lostArchived = staleLost.length;
  const foundArchived = staleFound.length;

  if (lostArchived + foundArchived > 0) {
    await logAudit({
      action: "declarations.archive_expired",
      entityType: "system",
      metadata: { lostArchived, foundArchived },
    });
  }

  return { lostArchived, foundArchived };
}
