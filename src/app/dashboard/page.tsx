import Link from "next/link";
import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  foundItems,
  lostItems,
  matches,
  notifications,
} from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import {
  MatchBadge,
  PageHeader,
  ReputationBadge,
  StatCard,
  StatusBadge,
} from "@/components/ui";
import { formatRelative } from "@/lib/utils";
import { FadeIn, StaggerGroup, StaggerItem } from "@/components/motion";
import { Link2, Search, Sparkles, Star } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const myLost = await db
    .select()
    .from(lostItems)
    .where(eq(lostItems.userId, user.id))
    .orderBy(desc(lostItems.createdAt))
    .limit(10);

  const myFound = await db
    .select()
    .from(foundItems)
    .where(eq(foundItems.userId, user.id))
    .orderBy(desc(foundItems.createdAt))
    .limit(10);

  const myLostIds = myLost.map((i) => i.id);
  const myFoundIds = myFound.map((i) => i.id);

  const allMatches = await db
    .select()
    .from(matches)
    .orderBy(desc(matches.createdAt))
    .limit(100);

  const myMatches = allMatches.filter(
    (m) => myLostIds.includes(m.lostItemId) || myFoundIds.includes(m.foundItemId)
  );

  const notifs = await db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, user.id))
    .orderBy(desc(notifications.createdAt))
    .limit(5);

  return (
    <div className="container-app py-8">
      <PageHeader
        eyebrow="Mon espace"
        title={`Bonjour, ${user.fullName.split(" ")[0]}`}
        description="Gérez vos déclarations, correspondances et récupérations."
        action={<ReputationBadge level={user.reputationLevel} />}
      />

      <StaggerGroup className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StaggerItem><StatCard label="Objets perdus" value={myLost.length} icon={Search} /></StaggerItem>
        <StaggerItem><StatCard label="Objets trouvés" value={myFound.length} icon={Sparkles} /></StaggerItem>
        <StaggerItem><StatCard label="Correspondances" value={myMatches.length} icon={Link2} /></StaggerItem>
        <StaggerItem>
          <StatCard
            label="Réputation"
            value={user.reputationScore}
            hint={user.city ?? undefined}
            icon={Star}
          />
        </StaggerItem>
      </StaggerGroup>

      <div className="mb-6 grid gap-3 sm:grid-cols-2">
        <Link href="/declare/lost" className="btn btn-primary btn-lg">
          <Search className="h-5 w-5" />
          Déclarer une perte
        </Link>
        <Link href="/declare/found" className="btn btn-accent btn-lg">
          <Sparkles className="h-5 w-5" />
          Déclarer une trouvaille
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-bold text-retruv-navy">Mes pertes</h2>
            <Link href="/lost" className="text-sm font-semibold text-retruv-blue">
              Voir
            </Link>
          </div>
          <div className="space-y-3">
            {myLost.map((item) => (
              <Link key={item.id} href={`/lost/${item.id}`} className="card block p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-bold text-slate-900">{item.title}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {item.city} · {formatRelative(item.createdAt)}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <StatusBadge status={item.status} />
                    {item.moderationStatus === "pending_review" ||
                    item.moderationStatus === "rejected" ? (
                      <StatusBadge status={item.moderationStatus} />
                    ) : null}
                  </div>
                </div>
              </Link>
            ))}
            {myLost.length === 0 ? (
              <div className="card p-6 text-sm text-slate-500">
                Aucune déclaration de perte.
              </div>
            ) : null}
          </div>
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-bold text-retruv-navy">Mes trouvailles</h2>
            <Link href="/found" className="text-sm font-semibold text-retruv-teal">
              Voir
            </Link>
          </div>
          <div className="space-y-3">
            {myFound.map((item) => (
              <Link key={item.id} href={`/found/${item.id}`} className="card block p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-bold text-slate-900">{item.title}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {item.city} · {formatRelative(item.createdAt)}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <StatusBadge status={item.status} />
                    {item.moderationStatus === "pending_review" ||
                    item.moderationStatus === "rejected" ? (
                      <StatusBadge status={item.moderationStatus} />
                    ) : null}
                  </div>
                </div>
              </Link>
            ))}
            {myFound.length === 0 ? (
              <div className="card p-6 text-sm text-slate-500">
                Aucune déclaration de trouvaille.
              </div>
            ) : null}
          </div>
        </section>
      </div>

      <section className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-bold text-retruv-navy">Correspondances</h2>
          <Link href="/matches" className="text-sm font-semibold text-retruv-blue">
            Toutes
          </Link>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {myMatches.slice(0, 4).map((m) => (
            <Link key={m.id} href={`/matches/${m.id}`} className="card p-4">
              <div className="flex flex-wrap items-center gap-2">
                <MatchBadge level={m.level} score={m.score} />
                <StatusBadge status={m.status} />
              </div>
              <p className="mt-3 text-sm text-slate-600">
                Ouverte {formatRelative(m.createdAt)}
              </p>
            </Link>
          ))}
          {myMatches.length === 0 ? (
            <div className="card p-6 text-sm text-slate-500 md:col-span-2">
              Aucune correspondance pour le moment. RETRUV continue de surveiller.
            </div>
          ) : null}
        </div>
      </section>

      <section className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-bold text-retruv-navy">Notifications</h2>
          <Link
            href="/notifications"
            className="text-sm font-semibold text-retruv-blue"
          >
            Toutes
          </Link>
        </div>
        <div className="space-y-2">
          {notifs.map((n) => (
            <Link
              key={n.id}
              href={n.link || "/notifications"}
              className={`card block p-4 ${n.isRead ? "" : "border-sky-200 bg-sky-50/50"}`}
            >
              <p className="font-bold text-slate-900">{n.title}</p>
              <p className="mt-1 text-sm text-slate-600">{n.body}</p>
              <p className="mt-2 text-xs text-slate-400">
                {formatRelative(n.createdAt)}
              </p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
