import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { jsonOk, handleApiError } from "@/lib/api";

export async function GET() {
  try {
    const user = await requireUser();
    const rows = await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, user.id))
      .orderBy(desc(notifications.createdAt))
      .limit(50);

    const unread = rows.filter((n) => !n.isRead).length;
    return jsonOk({ notifications: rows, unread });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await requireUser();
    const body = await req.json().catch(() => ({}));
    if (typeof body.id === "string") {
      // Scoped to the caller — otherwise any authenticated user could mark
      // another user's notification as read by guessing/obtaining its id.
      await db
        .update(notifications)
        .set({ isRead: true })
        .where(
          and(eq(notifications.id, body.id), eq(notifications.userId, user.id))
        );
    } else {
      await db
        .update(notifications)
        .set({ isRead: true })
        .where(eq(notifications.userId, user.id));
    }
    return jsonOk({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
