import { and, eq, lt, notInArray } from "drizzle-orm";
import { db } from "@/db";
import { archivedDeclarations, foundItems, lostItems } from "@/db/schema";
import { DECLARATION_ARCHIVE_GRACE_DAYS } from "./constants";
import { logAudit } from "./security";

/**
 * Moves lost/found declarations that expired more than
 * `DECLARATION_ARCHIVE_GRACE_DAYS` ago out of the live tables and into
 * `archivedDeclarations` (full row snapshot), then deletes the live row.
 * `recovered`, `matched`, and `in_recovery` items are never touched — a
 * successful outcome is kept live indefinitely, and an item with an active
 * match/conversation/recovery in progress is not "abandoned" just because
 * its original 90-day window closed while that process was still ongoing
 * (verification and recovery can easily take longer than that on their own).
 *
 * Deleting the live row cascades (via existing FK `onDelete: cascade`) to
 * any matches/verifications/conversations/messages/recoveries still
 * attached to it. That is intentional for a genuinely abandoned declaration
 * — which is exactly why the statuses above must never reach this path.
 */
const ARCHIVE_EXCLUDED_STATUSES: (typeof lostItems.$inferSelect)["status"][] = [
  "recovered",
  "matched",
  "in_recovery",
];

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
      and(
        lt(lostItems.expiresAt, cutoff),
        notInArray(lostItems.status, ARCHIVE_EXCLUDED_STATUSES)
      )
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
      and(
        lt(foundItems.expiresAt, cutoff),
        notInArray(foundItems.status, ARCHIVE_EXCLUDED_STATUSES)
      )
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
