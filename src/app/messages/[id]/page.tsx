import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { conversations } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { ChatBox } from "@/components/chat-box";
import Link from "next/link";

export default async function MessageThreadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const { id } = await params;

  const [convo] = await db
    .select()
    .from(conversations)
    .where(eq(conversations.id, id))
    .limit(1);

  if (!convo) notFound();
  const isStaff = user.role === "admin" || user.role === "moderator";
  if (convo.participant1Id !== user.id && convo.participant2Id !== user.id && !isStaff) {
    redirect("/messages");
  }

  return (
    <div className="container-app py-8">
      <PageHeader
        back={{ href: "/messages", label: "Messages" }}
        eyebrow="Discussion"
        title="Conversation sécurisée"
        description="Ne partagez des informations sensibles qu'après validation mutuelle."
        action={
          <Link
            href={`/matches/${convo.matchId}`}
            className="text-sm font-semibold text-retruv-blue"
          >
            Voir la correspondance →
          </Link>
        }
      />
      <ChatBox conversationId={id} />
    </div>
  );
}
