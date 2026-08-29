import Link from "next/link";
import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import { EmptyState, PageHeader } from "@/components/ui";
import { formatRelative } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const rows = await db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, user.id))
    .orderBy(desc(notifications.createdAt))
    .limit(50);

  // mark all read
  for (const n of rows) {
    if (!n.isRead) {
      await db
        .update(notifications)
        .set({ isRead: true })
        .where(eq(notifications.id, n.id));
    }
  }

  return (
    <div className="container-app py-8">
      <PageHeader
        eyebrow="Alertes"
        title="Notifications"
        description="Correspondances, vérifications, messages et récupérations."
      />

      {rows.length === 0 ? (
        <EmptyState title="Aucune notification" />
      ) : (
        <div className="space-y-2">
          {rows.map((n) => (
            <Link
              key={n.id}
              href={n.link || "/dashboard"}
              className="card block p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-bold text-slate-900">{n.title}</p>
                  <p className="mt-1 text-sm text-slate-600">{n.body}</p>
                </div>
                <span className="badge border-slate-200 bg-slate-50 text-slate-600">
                  {n.type}
                </span>
              </div>
              <p className="mt-2 text-xs text-slate-400">
                {formatRelative(n.createdAt)}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
