import Link from "next/link";
import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { fraudFlags, users } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { formatRelative } from "@/lib/utils";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 30;

export default async function AdminFraudFlagsPage({
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
    .select({ flag: fraudFlags, flaggedUser: users })
    .from(fraudFlags)
    .innerJoin(users, eq(fraudFlags.userId, users.id))
    .orderBy(desc(fraudFlags.severity), desc(fraudFlags.createdAt))
    .limit(PAGE_SIZE + 1)
    .offset((page - 1) * PAGE_SIZE);

  const rows = allRows.slice(0, PAGE_SIZE);
  const hasMore = allRows.length > PAGE_SIZE;

  return (
    <div className="container-app py-8">
      <PageHeader
        back={{ href: "/admin", label: "Dashboard admin" }}
        eyebrow="Administration"
        title="Flags fraude"
        description={`${rows.length} flag(s) sur cette page, sévérité décroissante.`}
      />

      <div className="card overflow-x-auto p-2">
        <table className="min-w-full text-left text-sm">
          <thead className="text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-3">Utilisateur</th>
              <th className="px-3 py-3">Type</th>
              <th className="px-3 py-3">Sévérité</th>
              <th className="px-3 py-3">Détails</th>
              <th className="px-3 py-3">Statut</th>
              <th className="px-3 py-3">Quand</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ flag, flaggedUser }) => (
              <tr key={flag.id} className="border-t border-slate-100 align-top">
                <td className="px-3 py-3 font-semibold text-slate-900">
                  <Link
                    href={`/admin/users/${flaggedUser.id}`}
                    className="hover:text-retruv-blue hover:underline"
                  >
                    {flaggedUser.fullName}
                  </Link>
                </td>
                <td className="px-3 py-3 text-slate-600">{flag.flagType}</td>
                <td className="px-3 py-3">
                  <span
                    className={`badge ${
                      flag.severity >= 4
                        ? "border-rose-200 bg-rose-50 text-rose-700"
                        : flag.severity >= 2
                          ? "border-amber-200 bg-amber-50 text-amber-700"
                          : "border-slate-200 bg-slate-50 text-slate-600"
                    }`}
                  >
                    {flag.severity}
                  </span>
                </td>
                <td className="px-3 py-3 max-w-sm text-xs text-slate-500">
                  {flag.details ?? "—"}
                </td>
                <td className="px-3 py-3">
                  {flag.isResolved ? (
                    <span className="badge border-emerald-200 bg-emerald-50 text-emerald-700">
                      Résolu
                    </span>
                  ) : (
                    <span className="badge border-rose-200 bg-rose-50 text-rose-700">
                      Non résolu
                    </span>
                  )}
                </td>
                <td className="px-3 py-3 text-slate-400">{formatRelative(flag.createdAt)}</td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-slate-500">
                  Aucun flag de fraude.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {page > 1 || hasMore ? (
        <div className="mt-6 flex items-center justify-center gap-3">
          {page > 1 ? (
            <Link href={`/admin/fraud-flags?page=${page - 1}`} className="btn btn-secondary">
              ← Précédent
            </Link>
          ) : null}
          <span className="text-sm font-semibold text-slate-500">Page {page}</span>
          {hasMore ? (
            <Link href={`/admin/fraud-flags?page=${page + 1}`} className="btn btn-secondary">
              Suivant →
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
