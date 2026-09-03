import Link from "next/link";
import { redirect } from "next/navigation";
import { desc } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import { PageHeader, StatusBadge } from "@/components/ui";
import { formatRelative, maskPhone } from "@/lib/utils";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 30;

export default async function AdminUsersPage({
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
    .select()
    .from(users)
    .orderBy(desc(users.createdAt))
    .limit(PAGE_SIZE + 1)
    .offset((page - 1) * PAGE_SIZE);

  const rows = allRows.slice(0, PAGE_SIZE);
  const hasMore = allRows.length > PAGE_SIZE;

  return (
    <div className="container-app py-8">
      <PageHeader
        back={{ href: "/admin", label: "Dashboard admin" }}
        eyebrow="Administration"
        title="Utilisateurs"
        description={`${rows.length} utilisateur(s) sur cette page.`}
      />

      <div className="card overflow-x-auto p-2">
        <table className="min-w-full text-left text-sm">
          <thead className="text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-3">Nom</th>
              <th className="px-3 py-3">Téléphone</th>
              <th className="px-3 py-3">Rôle</th>
              <th className="px-3 py-3">Ville</th>
              <th className="px-3 py-3">Réputation</th>
              <th className="px-3 py-3">Statut</th>
              <th className="px-3 py-3">Inscrit</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((u) => (
              <tr key={u.id} className="border-t border-slate-100">
                <td className="px-3 py-3 font-semibold text-slate-900">
                  <Link href={`/admin/users/${u.id}`} className="hover:text-retruv-blue hover:underline">
                    {u.fullName}
                  </Link>
                </td>
                <td className="px-3 py-3 text-slate-500">{maskPhone(u.phone)}</td>
                <td className="px-3 py-3 text-slate-600">{u.role}</td>
                <td className="px-3 py-3 text-slate-500">{u.city ?? "—"}</td>
                <td className="px-3 py-3 text-slate-500">{u.reputationScore}</td>
                <td className="px-3 py-3">
                  {u.isBlocked ? (
                    <StatusBadge status="suspended" />
                  ) : (
                    <span className="text-xs font-semibold text-emerald-600">Actif</span>
                  )}
                </td>
                <td className="px-3 py-3 text-slate-400">{formatRelative(u.createdAt)}</td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-slate-500">
                  Aucun utilisateur.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {page > 1 || hasMore ? (
        <div className="mt-6 flex items-center justify-center gap-3">
          {page > 1 ? (
            <Link href={`/admin/users?page=${page - 1}`} className="btn btn-secondary">
              ← Précédent
            </Link>
          ) : null}
          <span className="text-sm font-semibold text-slate-500">Page {page}</span>
          {hasMore ? (
            <Link href={`/admin/users?page=${page + 1}`} className="btn btn-secondary">
              Suivant →
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
