import { redirect } from "next/navigation";
import { desc } from "drizzle-orm";
import { db } from "@/db";
import { recoveryPoints } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import { PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function AdminRecoveryPointsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.role !== "admin" && user.role !== "moderator") redirect("/dashboard");

  const points = await db
    .select()
    .from(recoveryPoints)
    .orderBy(desc(recoveryPoints.isActive), recoveryPoints.city);

  return (
    <div className="container-app py-8">
      <PageHeader
        back={{ href: "/admin", label: "Dashboard admin" }}
        eyebrow="Administration"
        title="Points RETRUV"
        description={`${points.length} point(s), actifs et inactifs.`}
      />

      <div className="card overflow-x-auto p-2">
        <table className="min-w-full text-left text-sm">
          <thead className="text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-3">Nom</th>
              <th className="px-3 py-3">Type</th>
              <th className="px-3 py-3">Ville / Adresse</th>
              <th className="px-3 py-3">Responsable</th>
              <th className="px-3 py-3">Contact</th>
              <th className="px-3 py-3">Déposés</th>
              <th className="px-3 py-3">Récupérés</th>
              <th className="px-3 py-3">Statut</th>
            </tr>
          </thead>
          <tbody>
            {points.map((p) => (
              <tr key={p.id} className="border-t border-slate-100">
                <td className="px-3 py-3 font-semibold text-slate-900">{p.name}</td>
                <td className="px-3 py-3 text-slate-600">{p.type}</td>
                <td className="px-3 py-3 text-slate-500">
                  {p.city} · {p.address}
                </td>
                <td className="px-3 py-3 text-slate-500">{p.managerName ?? "—"}</td>
                <td className="px-3 py-3 text-slate-500">
                  {p.phone ?? "—"}
                  {p.email ? ` · ${p.email}` : ""}
                </td>
                <td className="px-3 py-3 text-slate-600">{p.itemsDeposited}</td>
                <td className="px-3 py-3 text-slate-600">{p.itemsRecovered}</td>
                <td className="px-3 py-3">
                  {p.isActive ? (
                    <span className="badge border-emerald-200 bg-emerald-50 text-emerald-700">
                      Actif
                    </span>
                  ) : (
                    <span className="badge border-slate-200 bg-slate-50 text-slate-600">
                      Inactif
                    </span>
                  )}
                </td>
              </tr>
            ))}
            {points.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-slate-500">
                  Aucun point de récupération.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
