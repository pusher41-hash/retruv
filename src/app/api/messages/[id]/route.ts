import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { conversations, matches, messages, users } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { jsonError, jsonOk, handleApiError } from "@/lib/api";
import {
  createNotification,
  getBlockStatus,
  isConversationStale,
  logAudit,
} from "@/lib/security";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  try {
    const user = await requireUser();
    const { id } = await params;

    const [convo] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, id))
      .limit(1);

    if (!convo) return jsonError("Conversation introuvable", 404);
    if (
      convo.participant1Id !== user.id &&
      convo.participant2Id !== user.id &&
      user.role !== "admin"
    ) {
      return jsonError("Accès refusé", 403);
    }

    const otherId =
      convo.participant1Id === user.id
        ? convo.participant2Id
        : convo.participant1Id;

    let isActive = convo.isActive;
    if (isActive) {
      const [match] = await db
        .select({ status: matches.status, updatedAt: matches.updatedAt })
        .from(matches)
        .where(eq(matches.id, convo.matchId))
        .limit(1);
      if (match && isConversationStale(match)) {
        isActive = false;
        await db
          .update(conversations)
          .set({ isActive: false, updatedAt: new Date() })
          .where(eq(conversations.id, id));
      }
    }

    const { blockedByViewer, blockedByOther } = await getBlockStatus(
      user.id,
      otherId
    );

    const msgs = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, id))
      .orderBy(asc(messages.createdAt))
      .limit(200);

    // Mark as read
    for (const m of msgs) {
      if (!m.isRead && m.senderId !== user.id) {
        await db
          .update(messages)
          .set({ isRead: true })
          .where(eq(messages.id, m.id));
      }
    }

    const [other] = await db
      .select()
      .from(users)
      .where(eq(users.id, otherId))
      .limit(1);

    return jsonOk({
      conversation: {
        id: convo.id,
        matchId: convo.matchId,
        phoneShared: convo.phoneShared,
        isActive,
        blockedByMe: blockedByViewer,
        blockedByOther,
      },
      otherUser: other
        ? {
            id: other.id,
            name: other.fullName.split(" ")[0],
            reputationLevel: other.reputationLevel,
            phone: convo.phoneShared ? other.phone : undefined,
          }
        : null,
      messages: msgs.map((m) => ({
        id: m.id,
        content: m.content,
        isMine: m.senderId === user.id,
        isSystem: m.isSystem,
        createdAt: m.createdAt,
      })),
    });
  } catch (err) {
    return handleApiError(err);
  }
}

const postSchema = z.object({
  content: z.string().min(1).max(2000),
  sharePhone: z.boolean().optional(),
});

export async function POST(req: Request, { params }: Params) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const body = postSchema.parse(await req.json());

    const [convo] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, id))
      .limit(1);

    if (!convo) return jsonError("Conversation introuvable", 404);
    if (
      convo.participant1Id !== user.id &&
      convo.participant2Id !== user.id
    ) {
      return jsonError("Accès refusé", 403);
    }

    const otherId =
      convo.participant1Id === user.id
        ? convo.participant2Id
        : convo.participant1Id;

    if (convo.isActive) {
      const [match] = await db
        .select({ status: matches.status, updatedAt: matches.updatedAt })
        .from(matches)
        .where(eq(matches.id, convo.matchId))
        .limit(1);
      if (match && isConversationStale(match)) {
        await db
          .update(conversations)
          .set({ isActive: false, updatedAt: new Date() })
          .where(eq(conversations.id, id));
        return jsonError(
          "Conversation fermée automatiquement (récupération terminée depuis plus de 7 jours)"
        );
      }
    }
    if (!convo.isActive) return jsonError("Conversation fermée");

    const { blockedByViewer, blockedByOther } = await getBlockStatus(
      user.id,
      otherId
    );
    if (blockedByViewer) {
      return jsonError(
        "Vous avez bloqué ce contact. Débloquez-le pour reprendre la conversation."
      );
    }
    if (blockedByOther) {
      return jsonError("Impossible d'envoyer un message à ce contact.");
    }

    if (body.sharePhone) {
      await db
        .update(conversations)
        .set({ phoneShared: true, updatedAt: new Date() })
        .where(eq(conversations.id, id));
    }

    const [msg] = await db
      .insert(messages)
      .values({
        conversationId: id,
        senderId: user.id,
        content: body.content.trim(),
      })
      .returning();

    await db
      .update(conversations)
      .set({ updatedAt: new Date() })
      .where(eq(conversations.id, id));

    await createNotification({
      userId: otherId,
      type: "message",
      title: "Nouveau message",
      body: body.content.slice(0, 100),
      link: `/messages/${id}`,
    });

    await logAudit({
      userId: user.id,
      action: "message.send",
      entityType: "conversation",
      entityId: id,
    });

    return jsonOk({
      message: {
        id: msg.id,
        content: msg.content,
        isMine: true,
        createdAt: msg.createdAt,
      },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return jsonError(err.issues[0]?.message ?? "Données invalides");
    }
    return handleApiError(err);
  }
}
