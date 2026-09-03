import Link from "next/link";
import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { reports, users } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import { PageHeader, StatusBadge } from "@/components/ui";
import { formatRelative } from "@/lib/utils";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 30;

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.role !== "admin" && user.role !== "moderator") redirect("/dashboard");

  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);

  const allRows = await db
    .select({ report: reports, reporter: users })
    .from(reports)
    .innerJoin(users, eq(reports.reporterId, users.id))
    .orderBy(desc(reports.createdAt))
    .limit(PAGE_SIZE + 1)
    .offset((page - 1) * PAGE_SIZE);

  const rows = allRows.slice(0, PAGE_SIZE);
  const hasMore = allRows.length > PAGE_SIZE;

  return (
    <div className="container-app py-8">
      <PageHeader
        back={{ href: "/admin", label: "Dashboard admin" }}
        eyebrow="Administration"
        title="Signalements"
        description={`${rows.length} signalement(s) sur cette page.`}
      />

      <div className="card overflow-x-auto p-2">
        <table className="min-w-full text-left text-sm">
          <thead className="text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-3">Cible</th>
              <th className="px-3 py-3">Motif</th>
              <th className="px-3 py-3">Signalé par</th>
              <th className="px-3 py-3">Statut</th>
              <th className="px-3 py-3">Quand</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ report, reporter }) => {
              const targetHref =
                report.targetType === "lost_item"
                  ? `/lost/${report.targetId}`
                  : report.targetType === "found_item"
                    ? `/found/${report.targetId}`
                    : report.targetType === "user"
                      ? `/admin/users/${report.targetId}`
                      : report.targetType === "match"
                        ? `/matches/${report.targetId}`
                        : null;
              return (
              <tr key={report.id} className="border-t border-slate-100 align-top">
                <td className="px-3 py-3 text-slate-600">
                  {targetHref ? (
                    <Link href={targetHref} className="hover:text-retruv-blue hover:underline">
                      {report.targetType} · {report.targetId.slice(0, 8)}
                    </Link>
                  ) : (
                    <>
                      {report.targetType} · {report.targetId.slice(0, 8)}
                    </>
                  )}
                </td>
                <td className="px-3 py-3">
                  <p className="font-semibold text-slate-900">{report.reason}</p>
                  {report.details ? (
                    <p className="mt-0.5 max-w-sm text-xs text-slate-500">{report.details}</p>
                  ) : null}
                </td>
                <td className="px-3 py-3 text-slate-500">
                  <Link
                    href={`/admin/users/${reporter.id}`}
                    className="hover:text-retruv-blue hover:underline"
                  >
                    {reporter.fullName}
                  </Link>
                </td>
                <td className="px-3 py-3">
                  <StatusBadge status={report.status} />
                </td>
                <td className="px-3 py-3 text-slate-400">{formatRelative(report.createdAt)}</td>
              </tr>
              );
            })}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-slate-500">
                  Aucun signalement.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {page > 1 || hasMore ? (
        <div className="mt-6 flex items-center justify-center gap-3">
          {page > 1 ? (
            <Link href={`/admin/reports?page=${page - 1}`} className="btn btn-secondary">
              ← Précédent
            </Link>
          ) : null}
          <span className="text-sm font-semibold text-slate-500">Page {page}</span>
          {hasMore ? (
            <Link href={`/admin/reports?page=${page + 1}`} className="btn btn-secondary">
              Suivant →
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
