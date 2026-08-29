import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { conversations, userBlocks } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { jsonError, jsonOk, handleApiError } from "@/lib/api";
import { logAudit } from "@/lib/security";

type Params = { params: Promise<{ id: string }> };

async function resolveOther(id: string, userId: string) {
  const [convo] = await db
    .select()
    .from(conversations)
    .where(eq(conversations.id, id))
    .limit(1);
  if (!convo) return { error: jsonError("Conversation introuvable", 404) };
  if (convo.participant1Id !== userId && convo.participant2Id !== userId) {
    return { error: jsonError("Accès refusé", 403) };
  }
  const otherId =
    convo.participant1Id === userId
      ? convo.participant2Id
      : convo.participant1Id;
  return { otherId };
}

export async function POST(_req: Request, { params }: Params) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const resolved = await resolveOther(id, user.id);
    if ("error" in resolved) return resolved.error;

    await db
      .insert(userBlocks)
      .values({ blockerId: user.id, blockedId: resolved.otherId })
      .onConflictDoNothing({
        target: [userBlocks.blockerId, userBlocks.blockedId],
      });

    await logAudit({
      userId: user.id,
      action: "user.block",
      entityType: "user",
      entityId: resolved.otherId,
    });

    return jsonOk({ blocked: true });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const resolved = await resolveOther(id, user.id);
    if ("error" in resolved) return resolved.error;

    await db
      .delete(userBlocks)
      .where(
        and(
          eq(userBlocks.blockerId, user.id),
          eq(userBlocks.blockedId, resolved.otherId)
        )
      );

    await logAudit({
      userId: user.id,
      action: "user.unblock",
      entityType: "user",
      entityId: resolved.otherId,
    });

    return jsonOk({ blocked: false });
  } catch (err) {
    return handleApiError(err);
  }
}
