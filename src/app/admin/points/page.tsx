import { redirect } from "next/navigation";
import { desc, sql } from "drizzle-orm";
import { db } from "@/db";
import { recoveryPoints } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { AdminAddPointForm } from "@/components/admin-point-form";
import { AdminPointActions } from "@/components/admin-point-actions";
import { AdminPointSeedButton } from "@/components/admin-point-seed-button";
import { countryName } from "@/lib/constants";

export const dynamic = "force-dynamic";

async function ensureRecoveryPointsTable() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "recovery_points" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "name" text NOT NULL,
      "type" text NOT NULL,
      "address" text NOT NULL,
      "city" text NOT NULL,
      "country" text DEFAULT 'IT' NOT NULL,
      "latitude" real,
      "longitude" real,
      "phone" text,
      "email" text,
      "hours" text,
      "manager_name" text,
      "manager_user_id" uuid,
      "is_active" boolean DEFAULT true NOT NULL,
      "items_deposited" integer DEFAULT 0 NOT NULL,
      "items_recovered" integer DEFAULT 0 NOT NULL,
      "created_at" timestamp DEFAULT now() NOT NULL,
      "updated_at" timestamp DEFAULT now() NOT NULL
    )
  `);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS "recovery_points_city_idx" ON "recovery_points" ("city")`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS "recovery_points_active_idx" ON "recovery_points" ("is_active")`);
}

export default async function AdminRecoveryPointsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.role !== "admin" && user.role !== "moderator") redirect("/dashboard");
  const isAdmin = user.role === "admin";

  let points: typeof recoveryPoints.$inferSelect[] = [];
  let warning: string | null = null;
  let isSuccess = false;

  try {
    points = await db.select().from(recoveryPoints).orderBy(desc(recoveryPoints.isActive), recoveryPoints.city);
  } catch (e: unknown) {
    const err = e as { message?: string; code?: string; cause?: { code?: string } };
    const msg = err?.message ?? "";
    const code = err?.code ?? err?.cause?.code;
    const isMissingTable = code === "42P01" || msg.includes("does not exist") || msg.includes("relation") || msg.includes("Failed query") || msg.includes("recovery_points");
    if (isMissingTable) {
      try {
        await ensureRecoveryPointsTable();
        points = await db.select().from(recoveryPoints).orderBy(desc(recoveryPoints.isActive), recoveryPoints.city);
        warning = "Table Points créée automatiquement. Vous pouvez maintenant ajouter et peuppler les points mondiaux.";
        isSuccess = true;
      } catch (retryErr) {
        console.error("Admin points auto-create failed:", retryErr);
        warning = `Impossible de créer la table: ${(retryErr as Error).message}`;
      }
    } else {
      console.error("Admin points load error:", e);
      warning = `Erreur de chargement: ${msg}`;
      points = [];
    }
  }

  return (
    <div className="container-app py-8">
      <PageHeader
        back={{ href: "/admin", label: "Dashboard admin" }}
        eyebrow="Administration"
        title="Points RETRUV"
        description={`${points.length} point(s) opérationnel(s) — commissariats, gares, campus. Actifs visibles publiquement sur /points et /map.`}
      />

      {warning ? (
        <div className={`mb-4 rounded-xl border px-4 py-3 text-sm ${isSuccess ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-900"}`}>
          {warning}
        </div>
      ) : null}

      {isAdmin ? (
        <div className="mb-6 mt-4 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 items-start">
            <AdminAddPointForm />
            <div className="hidden sm:block h-10 w-px bg-slate-200 mx-1" />
            <AdminPointSeedButton />
          </div>
          <p className="text-xs text-slate-500">
            Les points inactifs sont masqués publiquement mais conservés pour l'historique des récupérations. Un clic ajoute 111 points vérifiés pour les 36 pays.
          </p>
        </div>
      ) : (
        <div className="mb-6 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          Accès en lecture seule. Seul un administrateur peut ajouter ou modifier les points.
        </div>
      )}

      <div className="card overflow-x-auto p-2 border-slate-200">
        <table className="min-w-full text-left text-sm">
          <thead className="text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-3">Nom</th>
              <th className="px-3 py-3">Type</th>
              <th className="px-3 py-3">Ville / Adresse</th>
              <th className="px-3 py-3">Pays</th>
              <th className="px-3 py-3">Responsable</th>
              <th className="px-3 py-3">Contact</th>
              <th className="px-3 py-3">Déposés</th>
              <th className="px-3 py-3">Récupérés</th>
              <th className="px-3 py-3">Statut</th>
              {isAdmin ? <th className="px-3 py-3">Actions</th> : null}
            </tr>
          </thead>
          <tbody>
            {points.map((p) => (
              <tr key={p.id} className="border-t border-slate-100">
                <td className="px-3 py-3 font-semibold text-slate-900">{p.name}</td>
                <td className="px-3 py-3">
                  <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-semibold text-slate-700 capitalize">
                    {p.type}
                  </span>
                </td>
                <td className="px-3 py-3 text-slate-500">
                  {p.city} · {p.address}
                </td>
                <td className="px-3 py-3 text-slate-500">{countryName(p.country)}</td>
                <td className="px-3 py-3 text-slate-500">{p.managerName ?? "—"}</td>
                <td className="px-3 py-3 text-slate-500">
                  {p.phone ?? "—"}
                  {p.email ? ` · ${p.email}` : ""}
                </td>
                <td className="px-3 py-3 text-slate-600 font-medium">{p.itemsDeposited}</td>
                <td className="px-3 py-3 text-slate-600 font-medium">{p.itemsRecovered}</td>
                <td className="px-3 py-3">
                  {p.isActive ? (
                    <span className="badge border-emerald-200 bg-emerald-50 text-emerald-700">Actif</span>
                  ) : (
                    <span className="badge border-slate-200 bg-slate-50 text-slate-600">Inactif</span>
                  )}
                </td>
                {isAdmin ? (
                  <td className="px-3 py-3">
                    <AdminPointActions id={p.id} isActive={p.isActive} />
                  </td>
                ) : null}
              </tr>
            ))}
            {points.length === 0 ? (
              <tr>
                <td colSpan={isAdmin ? 10 : 9} className="px-3 py-10 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <p className="text-sm font-medium text-slate-600">Aucun point de récupération.</p>
                    <p className="text-xs text-slate-500">Créez le premier point ou utilisez le peuplement mondial pour démarrer le réseau.</p>
                  </div>
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
