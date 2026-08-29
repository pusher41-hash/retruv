import { desc, eq, or } from "drizzle-orm";
import { db } from "@/db";
import { conversations, matches, messages, users } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { jsonOk, handleApiError } from "@/lib/api";

export async function GET() {
  try {
    const user = await requireUser();

    const convos = await db
      .select({
        conversation: conversations,
        match: matches,
      })
      .from(conversations)
      .innerJoin(matches, eq(conversations.matchId, matches.id))
      .where(
        or(
          eq(conversations.participant1Id, user.id),
          eq(conversations.participant2Id, user.id)
        )
      )
      .orderBy(desc(conversations.updatedAt))
      .limit(50);

    const result = [];
    for (const c of convos) {
      const otherId =
        c.conversation.participant1Id === user.id
          ? c.conversation.participant2Id
          : c.conversation.participant1Id;
      const [other] = await db
        .select()
        .from(users)
        .where(eq(users.id, otherId))
        .limit(1);
      const [lastMsg] = await db
        .select()
        .from(messages)
        .where(eq(messages.conversationId, c.conversation.id))
        .orderBy(desc(messages.createdAt))
        .limit(1);

      result.push({
        id: c.conversation.id,
        matchId: c.conversation.matchId,
        matchScore: c.match.score,
        matchLevel: c.match.level,
        isActive: c.conversation.isActive,
        phoneShared: c.conversation.phoneShared,
        otherUser: other
          ? {
              id: other.id,
              name: other.fullName.split(" ")[0],
              reputationLevel: other.reputationLevel,
            }
          : null,
        lastMessage: lastMsg
          ? {
              content: lastMsg.content,
              createdAt: lastMsg.createdAt,
              isRead: lastMsg.isRead,
              isMine: lastMsg.senderId === user.id,
            }
          : null,
        updatedAt: c.conversation.updatedAt,
      });
    }

    return jsonOk({ conversations: result });
  } catch (err) {
    return handleApiError(err);
  }
}
