import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { ChatBox } from "@/components/chat-box";

export default async function MessageThreadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const { id } = await params;

  return (
    <div className="container-app py-8">
      <PageHeader
        eyebrow="Discussion"
        title="Conversation sécurisée"
        description="Ne partagez des informations sensibles qu'après validation mutuelle."
      />
      <ChatBox conversationId={id} />
    </div>
  );
}
