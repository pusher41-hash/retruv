import Link from "next/link";
import { redirect } from "next/navigation";
import { desc, eq, or } from "drizzle-orm";
import { db } from "@/db";
import { conversations, matches, messages, users } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import { EmptyState, MatchBadge, PageHeader } from "@/components/ui";
import { formatRelative } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function MessagesPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

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
    .orderBy(desc(conversations.updatedAt));

  const items = [];
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
    const [last] = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, c.conversation.id))
      .orderBy(desc(messages.createdAt))
      .limit(1);
    items.push({ c, other, last });
  }

  return (
    <div className="container-app py-8">
      <PageHeader
        eyebrow="Messagerie"
        title="Messages"
        description="Les numéros restent privés jusqu'à partage volontaire."
      />

      {items.length === 0 ? (
        <EmptyState
          title="Aucune conversation"
          description="Les discussions s'ouvrent après une vérification de propriété réussie."
          action={
            <Link href="/matches" className="btn btn-primary">
              Voir les correspondances
            </Link>
          }
        />
      ) : (
        <div className="space-y-3">
          {items.map(({ c, other, last }) => (
            <Link
              key={c.conversation.id}
              href={`/messages/${c.conversation.id}`}
              className="card block p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-bold text-slate-900">
                    {other?.fullName.split(" ")[0] ?? "Utilisateur"}
                  </p>
                  <p className="mt-1 line-clamp-1 text-sm text-slate-600">
                    {last?.content ?? "Aucun message"}
                  </p>
                </div>
                <MatchBadge level={c.match.level} score={c.match.score} />
              </div>
              <p className="mt-2 text-xs text-slate-400">
                {last ? formatRelative(last.createdAt) : formatRelative(c.conversation.updatedAt)}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
