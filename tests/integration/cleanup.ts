import { inArray, like, or } from "drizzle-orm";
import { db } from "@/db";
import {
  auditLogs,
  conversations,
  foundItems,
  fraudFlags,
  lostItems,
  messages,
  ratings,
  recoveryPoints,
  reports,
  users,
  verifications,
} from "@/db/schema";

/**
 * Deletes every user created by the integration suite (phone prefix
 * `+22677`, see helpers.randomPhone) and everything that references them.
 *
 * Most of the graph cascades automatically once a user's lost/found items
 * are gone (users → lostItems/foundItems → matches → verifications/
 * conversations/recoveries → messages/ratings, all `onDelete: cascade`).
 * But several columns reference `users.id` directly with NO cascade —
 * `audit_logs.user_id` deliberately so (an audit trail that silently
 * vanished whenever its subject was deleted would defeat the point), the
 * rest just weren't wired for cascade delete. Postgres will reject `DELETE
 * FROM users` outright if any of these still point at a row being removed,
 * so they're cleared first.
 */
export async function cleanupTestUsers(): Promise<void> {
  const testUsers = await db
    .select({ id: users.id })
    .from(users)
    .where(like(users.phone, "+22677%"));
  const ids = testUsers.map((u) => u.id);
  if (ids.length === 0) return;

  await db.delete(auditLogs).where(inArray(auditLogs.userId, ids));
  await db.delete(fraudFlags).where(inArray(fraudFlags.userId, ids));
  await db
    .delete(ratings)
    .where(or(inArray(ratings.fromUserId, ids), inArray(ratings.toUserId, ids)));
  await db
    .delete(reports)
    .where(or(inArray(reports.reporterId, ids), inArray(reports.reviewedBy, ids)));
  await db.delete(messages).where(inArray(messages.senderId, ids));
  await db
    .delete(verifications)
    .where(
      or(
        inArray(verifications.claimantId, ids),
        inArray(verifications.reviewedBy, ids)
      )
    );
  await db
    .delete(conversations)
    .where(
      or(
        inArray(conversations.participant1Id, ids),
        inArray(conversations.participant2Id, ids)
      )
    );
  await db
    .update(recoveryPoints)
    .set({ managerUserId: null })
    .where(inArray(recoveryPoints.managerUserId, ids));
  await db
    .update(lostItems)
    .set({ moderatedBy: null })
    .where(inArray(lostItems.moderatedBy, ids));
  await db
    .update(foundItems)
    .set({ moderatedBy: null })
    .where(inArray(foundItems.moderatedBy, ids));

  await db.delete(users).where(inArray(users.id, ids));
}
