import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { categories, foundItems, lostItems, users } from "@/db/schema";
import { createNotification, createNotifications, logAudit } from "./security";
import { runMatchingForFoundItem, runMatchingForLostItem } from "./matching";

export type ModerationTargetType = "lost" | "found";

/**
 * Fires the moment a declaration lands in the moderation queue — the queue
 * itself (`/admin/moderation`) is passive, so without this a pending report
 * only surfaces when a moderator happens to check it, which can silently
 * break the "reviewed within a few hours" promise made to declarants.
 *
 * Two channels, both best-effort and never allowed to fail the declaration
 * request that triggered them:
 *  - an in-app notification to every non-blocked admin/moderator account
 *  - an optional Slack Incoming Webhook post (`RETRUV_MODERATION_WEBHOOK_URL`,
 *    e.g. `https://hooks.slack.com/services/...`), so a moderator gets a
 *    real-time ping in a channel they already watch.
 */
export async function notifyModeratorsOfPendingReview(
  type: ModerationTargetType,
  item: { id: string; title: string; city: string }
): Promise<void> {
  const moderators = await db
    .select({ id: users.id })
    .from(users)
    .where(
      and(inArray(users.role, ["admin", "moderator"]), eq(users.isBlocked, false))
    );

  await Promise.allSettled([
    moderators.length
      ? createNotifications(
          moderators.map((m) => ({
            userId: m.id,
            type: "system" as const,
            title: "Nouvelle déclaration à modérer",
            body: `« ${item.title} » (${itemTypeLabel(type)}, ${item.city}) attend une revue.`,
            link: "/admin/moderation",
          }))
        )
      : Promise.resolve(),
    forwardModerationWebhook(type, item),
  ]);
}

function itemTypeLabel(type: ModerationTargetType): string {
  return type === "lost" ? "perdu" : "trouvé";
}

const APP_BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://retruv.vercel.app";

/**
 * Posts to a Slack Incoming Webhook (see https://api.slack.com/messaging/webhooks).
 * `blocks` gives a formatted message with a clickable link straight to the
 * moderation queue; `text` is kept as the required fallback/notification-
 * preview string for clients that don't render blocks.
 */
async function forwardModerationWebhook(
  type: ModerationTargetType,
  item: { id: string; title: string; city: string }
): Promise<void> {
  const url = process.env.RETRUV_MODERATION_WEBHOOK_URL;
  if (!url) return;
  const summary = `« ${item.title} » (${itemTypeLabel(type)}, ${item.city}) attend une revue.`;
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        text: `🔔 Nouvelle déclaration à modérer — ${summary}`,
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `🔔 *Nouvelle déclaration à modérer*\n${summary}`,
            },
          },
          {
            type: "actions",
            elements: [
              {
                type: "button",
                text: { type: "plain_text", text: "Ouvrir la file de modération" },
                url: `${APP_BASE_URL}/admin/moderation`,
                style: "primary",
              },
            ],
          },
        ],
      }),
    });
  } catch {
    // Best-effort — an unreachable external sink must never break the app.
  }
}

/** Declarations awaiting a human moderator, oldest first — see /admin/moderation. */
export async function listPendingModeration() {
  const [pendingLost, pendingFound] = await Promise.all([
    db
      .select({ item: lostItems, category: categories })
      .from(lostItems)
      .innerJoin(categories, eq(lostItems.categoryId, categories.id))
      .where(eq(lostItems.moderationStatus, "pending_review"))
      .orderBy(asc(lostItems.createdAt)),
    db
      .select({ item: foundItems, category: categories })
      .from(foundItems)
      .innerJoin(categories, eq(foundItems.categoryId, categories.id))
      .where(eq(foundItems.moderationStatus, "pending_review"))
      .orderBy(asc(foundItems.createdAt)),
  ]);
  // Strip the encrypted ID payload before this reaches the admin
  // moderation page's API response — even ciphertext has no reason to
  // leave the server; nothing in the moderation UI needs it.
  return {
    pendingLost: pendingLost.map((r) => ({
      ...r,
      item: { ...r.item, idFullEncrypted: undefined },
    })),
    pendingFound: pendingFound.map((r) => ({
      ...r,
      item: { ...r.item, idFullEncrypted: undefined },
    })),
  };
}

/**
 * Publishes a declaration that was held for moderation: flips it visible,
 * notifies the declarant, and only now runs the matching engine — a pending
 * report never contributes matches or notifications to anyone until a human
 * has confirmed it's a legitimate report.
 */
export async function approveDeclaration(
  type: ModerationTargetType,
  id: string,
  moderatorId: string
) {
  const table = type === "lost" ? lostItems : foundItems;
  const [item] = await db
    .update(table)
    .set({
      moderationStatus: "approved",
      moderatedBy: moderatorId,
      moderatedAt: new Date(),
      moderationNotes: null,
    })
    .where(and(eq(table.id, id), eq(table.moderationStatus, "pending_review")))
    .returning();
  if (!item) return null;

  await createNotification({
    userId: item.userId,
    type: "system",
    title: "Déclaration validée",
    body: "Votre déclaration a été vérifiée par notre équipe et est maintenant visible publiquement.",
    link: `/${type}/${item.id}`,
  });

  const matchResults =
    type === "lost"
      ? await runMatchingForLostItem(item.id)
      : await runMatchingForFoundItem(item.id);

  await logAudit({
    userId: moderatorId,
    action: `${type}.moderation.approve`,
    entityType: `${type}_item`,
    entityId: item.id,
  });

  return { item, matchesFound: matchResults.length };
}

/**
 * Rejects a declaration: it never becomes publicly visible or matched. The
 * declarant is told, with the reason when one was given, so a legitimate
 * report can be corrected and resubmitted rather than silently vanishing.
 */
export async function rejectDeclaration(
  type: ModerationTargetType,
  id: string,
  moderatorId: string,
  reason: string
) {
  const table = type === "lost" ? lostItems : foundItems;
  const [item] = await db
    .update(table)
    .set({
      moderationStatus: "rejected",
      moderatedBy: moderatorId,
      moderatedAt: new Date(),
      moderationNotes: reason || null,
    })
    .where(and(eq(table.id, id), eq(table.moderationStatus, "pending_review")))
    .returning();
  if (!item) return null;

  await createNotification({
    userId: item.userId,
    type: "system",
    title: "Déclaration non validée",
    body: reason
      ? `Votre déclaration n'a pas été validée par notre équipe : ${reason}`
      : "Votre déclaration n'a pas été validée par notre équipe.",
    link: `/${type}/${item.id}`,
  });

  await logAudit({
    userId: moderatorId,
    action: `${type}.moderation.reject`,
    entityType: `${type}_item`,
    entityId: item.id,
    metadata: { reason },
  });

  return item;
}

/** Public-visibility gate: everywhere a declaration list or detail is shown to a stranger. */
export const PUBLICLY_VISIBLE_MODERATION_STATUSES = ["auto_approved", "approved"] as const;

export function isPubliclyVisible(moderationStatus: string): boolean {
  return (PUBLICLY_VISIBLE_MODERATION_STATUSES as readonly string[]).includes(
    moderationStatus
  );
}
