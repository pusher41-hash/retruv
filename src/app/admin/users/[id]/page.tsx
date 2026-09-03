import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { foundItems, fraudFlags, lostItems, reports, users } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import { PageHeader, ReputationBadge, StatusBadge } from "@/components/ui";
import { formatRelative, maskPhone } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const me = await getSessionUser();
  if (!me) redirect("/login");
  if (me.role !== "admin" && me.role !== "moderator") redirect("/dashboard");

  const { id } = await params;

  const [target] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (!target) notFound();

  const [myLost, myFound, reportsAgainst, reportsFiled, flags] = await Promise.all([
    db
      .select()
      .from(lostItems)
      .where(eq(lostItems.userId, id))
      .orderBy(desc(lostItems.createdAt)),
    db
      .select()
      .from(foundItems)
      .where(eq(foundItems.userId, id))
      .orderBy(desc(foundItems.createdAt)),
    db
      .select()
      .from(reports)
      .where(eq(reports.targetType, "user"))
      .orderBy(desc(reports.createdAt)),
    db
      .select()
      .from(reports)
      .where(eq(reports.reporterId, id))
      .orderBy(desc(reports.createdAt)),
    db
      .select()
      .from(fraudFlags)
      .where(eq(fraudFlags.userId, id))
      .orderBy(desc(fraudFlags.severity)),
  ]);
  const reportsAgainstUser = reportsAgainst.filter((r) => r.targetId === id);

  return (
    <div className="container-app py-8">
      <PageHeader
        back={{ href: "/admin/users", label: "Utilisateurs" }}
        eyebrow="Administration"
        title={target.fullName}
        description={`${maskPhone(target.phone)} · ${target.city ?? "—"} · inscrit ${formatRelative(target.createdAt)}`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <span className="badge border-slate-200 bg-slate-50 text-slate-600">{target.role}</span>
            <ReputationBadge level={target.reputationLevel} />
            {target.isBlocked ? <StatusBadge status="suspended" /> : null}
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card p-5">
          <h2 className="font-bold text-retruv-navy">
            Objets perdus déclarés ({myLost.length})
          </h2>
          <div className="mt-3 space-y-2">
            {myLost.map((item) => (
              <Link
                key={item.id}
                href={`/lost/${item.id}`}
                className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm hover:bg-slate-100"
              >
                <span className="font-semibold text-slate-800">{item.title}</span>
                <span className="flex items-center gap-1.5">
                  <StatusBadge status={item.status} />
                  {item.moderationStatus === "pending_review" ||
                  item.moderationStatus === "rejected" ? (
                    <StatusBadge status={item.moderationStatus} />
                  ) : null}
                </span>
              </Link>
            ))}
            {myLost.length === 0 ? (
              <p className="text-sm text-slate-500">Aucune déclaration.</p>
            ) : null}
          </div>
        </section>

        <section className="card p-5">
          <h2 className="font-bold text-retruv-navy">
            Objets trouvés déclarés ({myFound.length})
          </h2>
          <div className="mt-3 space-y-2">
            {myFound.map((item) => (
              <Link
                key={item.id}
                href={`/found/${item.id}`}
                className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm hover:bg-slate-100"
              >
                <span className="font-semibold text-slate-800">{item.title}</span>
                <span className="flex items-center gap-1.5">
                  <StatusBadge status={item.status} />
                  {item.moderationStatus === "pending_review" ||
                  item.moderationStatus === "rejected" ? (
                    <StatusBadge status={item.moderationStatus} />
                  ) : null}
                </span>
              </Link>
            ))}
            {myFound.length === 0 ? (
              <p className="text-sm text-slate-500">Aucune déclaration.</p>
            ) : null}
          </div>
        </section>

        <section className="card p-5">
          <h2 className="font-bold text-retruv-navy">
            Flags fraude sur ce compte ({flags.length})
          </h2>
          <div className="mt-3 space-y-2">
            {flags.map((f) => (
              <div key={f.id} className="rounded-xl bg-slate-50 px-3 py-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-800">{f.flagType}</span>
                  <span className="text-xs font-bold text-slate-500">Sévérité {f.severity}</span>
                </div>
                {f.details ? <p className="mt-1 text-xs text-slate-500">{f.details}</p> : null}
              </div>
            ))}
            {flags.length === 0 ? (
              <p className="text-sm text-slate-500">Aucun flag.</p>
            ) : null}
          </div>
        </section>

        <section className="card p-5">
          <h2 className="font-bold text-retruv-navy">
            Signalements contre ce compte ({reportsAgainstUser.length})
          </h2>
          <div className="mt-3 space-y-2">
            {reportsAgainstUser.map((r) => (
              <div key={r.id} className="rounded-xl bg-slate-50 px-3 py-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-800">{r.reason}</span>
                  <StatusBadge status={r.status} />
                </div>
              </div>
            ))}
            {reportsAgainstUser.length === 0 ? (
              <p className="text-sm text-slate-500">Aucun signalement.</p>
            ) : null}
          </div>
        </section>

        <section className="card p-5 lg:col-span-2">
          <h2 className="font-bold text-retruv-navy">
            Signalements déposés par cet utilisateur ({reportsFiled.length})
          </h2>
          <div className="mt-3 space-y-2">
            {reportsFiled.map((r) => (
              <div key={r.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm">
                <span className="font-semibold text-slate-800">
                  {r.reason} — {r.targetType} · {r.targetId.slice(0, 8)}
                </span>
                <StatusBadge status={r.status} />
              </div>
            ))}
            {reportsFiled.length === 0 ? (
              <p className="text-sm text-slate-500">Aucun signalement déposé.</p>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}
