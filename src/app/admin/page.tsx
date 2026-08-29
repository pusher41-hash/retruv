import Link from "next/link";
import { redirect } from "next/navigation";
import { count, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  archivedDeclarations,
  auditLogs,
  foundItems,
  fraudFlags,
  lostItems,
  matches,
  recoveries,
  recoveryPoints,
  reports,
  users,
} from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import {
  MatchBadge,
  PageHeader,
  StatCard,
  StatusBadge,
} from "@/components/ui";
import { ArchiveExpiredButton } from "@/components/archive-expired-button";
import { formatRelative, maskPhone } from "@/lib/utils";
import {
  Archive,
  CheckCircle2,
  Flag,
  Link2,
  MapPin,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.role !== "admin" && user.role !== "moderator") redirect("/dashboard");

  const [userCount] = await db.select({ c: count() }).from(users);
  const [lostCount] = await db.select({ c: count() }).from(lostItems);
  const [foundCount] = await db.select({ c: count() }).from(foundItems);
  const [matchCount] = await db.select({ c: count() }).from(matches);
  const [completedRec] = await db
    .select({ c: count() })
    .from(recoveries)
    .where(eq(recoveries.status, "completed"));
  const [openReports] = await db
    .select({ c: count() })
    .from(reports)
    .where(eq(reports.status, "open"));
  const [fraudCount] = await db
    .select({ c: count() })
    .from(fraudFlags)
    .where(eq(fraudFlags.isResolved, false));
  const [pointsCount] = await db.select({ c: count() }).from(recoveryPoints);
  const [archivedCount] = await db
    .select({ c: count() })
    .from(archivedDeclarations);
  const [pendingLostMod] = await db
    .select({ c: count() })
    .from(lostItems)
    .where(eq(lostItems.moderationStatus, "pending_review"));
  const [pendingFoundMod] = await db
    .select({ c: count() })
    .from(foundItems)
    .where(eq(foundItems.moderationStatus, "pending_review"));
  const pendingModerationCount = (pendingLostMod?.c ?? 0) + (pendingFoundMod?.c ?? 0);

  const recentUsers = await db
    .select()
    .from(users)
    .orderBy(desc(users.createdAt))
    .limit(8);

  const recentMatches = await db
    .select()
    .from(matches)
    .orderBy(desc(matches.createdAt))
    .limit(8);

  const recentLogs = await db
    .select()
    .from(auditLogs)
    .orderBy(desc(auditLogs.createdAt))
    .limit(12);

  const byCity = await db
    .select({
      city: lostItems.city,
      count: sql<number>`count(*)::int`,
    })
    .from(lostItems)
    .groupBy(lostItems.city)
    .orderBy(sql`count(*) desc`)
    .limit(8);

  const matchLevels = await db
    .select({
      level: matches.level,
      count: sql<number>`count(*)::int`,
    })
    .from(matches)
    .groupBy(matches.level);

  const recoveryRate =
    (matchCount?.c ?? 0) > 0
      ? Math.round(((completedRec?.c ?? 0) / (matchCount?.c ?? 1)) * 100)
      : 0;

  return (
    <div className="container-app py-8">
      <PageHeader
        eyebrow="Administration"
        title="Dashboard RETRUV"
        description="Pilotité, correspondances, fraudes et points de récupération."
        action={<ArchiveExpiredButton />}
      />

      {pendingModerationCount > 0 ? (
        <Link
          href="/admin/moderation"
          className="mb-6 flex items-center justify-between rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900 transition hover:bg-amber-100"
        >
          <span className="flex items-center gap-2 font-bold">
            <ShieldCheck className="h-5 w-5" />
            {pendingModerationCount} déclaration(s) de personnes disparues en attente de vérification
          </span>
          <span className="text-sm font-semibold">Traiter la file →</span>
        </Link>
      ) : null}

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Utilisateurs" value={userCount?.c ?? 0} icon={Users} />
        <StatCard label="Objets perdus" value={lostCount?.c ?? 0} icon={Search} />
        <StatCard label="Objets trouvés" value={foundCount?.c ?? 0} icon={Sparkles} />
        <StatCard label="Correspondances" value={matchCount?.c ?? 0} icon={Link2} />
        <StatCard
          label="Récupérations"
          value={completedRec?.c ?? 0}
          hint={`Taux ${recoveryRate}%`}
          icon={CheckCircle2}
        />
        <StatCard label="Signalements ouverts" value={openReports?.c ?? 0} icon={Flag} />
        <StatCard
          label="En vérification (personnes)"
          value={pendingModerationCount}
          icon={ShieldCheck}
        />
        <StatCard label="Flags fraude" value={fraudCount?.c ?? 0} icon={ShieldAlert} />
        <StatCard label="Points RETRUV" value={pointsCount?.c ?? 0} icon={MapPin} />
        <StatCard
          label="Déclarations archivées"
          value={archivedCount?.c ?? 0}
          icon={Archive}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card p-5">
          <h2 className="font-bold text-retruv-navy">Villes les plus actives</h2>
          <div className="mt-4 space-y-2">
            {byCity.map((c) => (
              <div
                key={c.city}
                className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm"
              >
                <span className="font-semibold text-slate-800">{c.city}</span>
                <span className="font-bold text-retruv-blue">{c.count}</span>
              </div>
            ))}
            {byCity.length === 0 ? (
              <p className="text-sm text-slate-500">Pas encore de données.</p>
            ) : null}
          </div>
        </section>

        <section className="card p-5">
          <h2 className="font-bold text-retruv-navy">Niveaux de matching</h2>
          <div className="mt-4 space-y-2">
            {matchLevels.map((m) => (
              <div
                key={m.level}
                className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2"
              >
                <MatchBadge level={m.level} />
                <span className="font-bold text-slate-800">{m.count}</span>
              </div>
            ))}
            {matchLevels.length === 0 ? (
              <p className="text-sm text-slate-500">Aucun match pour l&apos;instant.</p>
            ) : null}
          </div>
        </section>

        <section className="card p-5">
          <h2 className="font-bold text-retruv-navy">Utilisateurs récents</h2>
          <div className="mt-4 space-y-2">
            {recentUsers.map((u) => (
              <div
                key={u.id}
                className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm"
              >
                <div>
                  <p className="font-semibold text-slate-900">{u.fullName}</p>
                  <p className="text-xs text-slate-500">
                    {maskPhone(u.phone)} · {u.city ?? "—"} · {u.role}
                  </p>
                </div>
                {u.isBlocked ? (
                  <StatusBadge status="suspended" />
                ) : (
                  <span className="text-xs text-slate-400">
                    {formatRelative(u.createdAt)}
                  </span>
                )}
              </div>
            ))}
          </div>
        </section>

        <section className="card p-5">
          <h2 className="font-bold text-retruv-navy">Correspondances récentes</h2>
          <div className="mt-4 space-y-2">
            {recentMatches.map((m) => (
              <a
                key={m.id}
                href={`/matches/${m.id}`}
                className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2"
              >
                <MatchBadge level={m.level} score={m.score} />
                <StatusBadge status={m.status} />
              </a>
            ))}
          </div>
        </section>

        <section className="card p-5 lg:col-span-2">
          <h2 className="font-bold text-retruv-navy">Journal d&apos;audit</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-2 py-2">Action</th>
                  <th className="px-2 py-2">Entité</th>
                  <th className="px-2 py-2">Quand</th>
                </tr>
              </thead>
              <tbody>
                {recentLogs.map((l) => (
                  <tr key={l.id} className="border-t border-slate-100">
                    <td className="px-2 py-2 font-medium text-slate-800">
                      {l.action}
                    </td>
                    <td className="px-2 py-2 text-slate-500">
                      {l.entityType ?? "—"} {l.entityId ? `· ${l.entityId.slice(0, 8)}` : ""}
                    </td>
                    <td className="px-2 py-2 text-slate-400">
                      {formatRelative(l.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
