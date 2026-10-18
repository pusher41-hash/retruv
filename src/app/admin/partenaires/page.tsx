import { redirect } from "next/navigation";
import { asc, sql } from "drizzle-orm";
import { db } from "@/db";
import { partners } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { AdminAddPartnerForm } from "@/components/admin-partner-form";
import { PartnerTable } from "./partner-table";

export const dynamic = "force-dynamic";

async function ensurePartnersTable() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "partners" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "title" text NOT NULL,
      "description" text NOT NULL,
      "icon" text NOT NULL DEFAULT 'Building2',
      "website" text,
      "logo_url" text,
      "city" text,
      "country" text DEFAULT 'IT',
      "is_active" boolean NOT NULL DEFAULT true,
      "sort_order" integer NOT NULL DEFAULT 0,
      "created_at" timestamp NOT NULL DEFAULT now(),
      "updated_at" timestamp NOT NULL DEFAULT now()
    )
  `);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS "partners_active_idx" ON "partners" ("is_active")`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS "partners_sort_idx" ON "partners" ("sort_order")`);
  const existing: unknown = await db.execute(sql`SELECT count(*)::int as c FROM "partners"`);
  const rows = (existing as { rows?: { c?: number }[] })?.rows;
  const count = rows?.[0]?.c ?? 0;
  if (count === 0) {
    await db.execute(sql`
      INSERT INTO "partners" ("title", "description", "icon", "sort_order") VALUES
        ('Gares & Transport', 'Gares, aéroports, réseaux de bus, partout dans le monde. Dépôt d''objets, récupération, visibilité. Le point devient un service public utile.', 'Train', 0),
        ('Universités & Campus', 'Établissements d''enseignement, quel que soit le pays. Déclarations de documents étudiants, récupération au secrétariat, confiance institutionnelle.', 'GraduationCap', 1),
        ('Entreprises & Commerces', 'Hôtels, centres commerciaux, entreprises. Intégration du moteur de matching via API. Réputation et service client.', 'Building2', 2)
    `);
  }
}

export default async function AdminPartnersPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.role !== "admin" && user.role !== "moderator") redirect("/dashboard");
  const isAdmin = user.role === "admin";

  let partnerRows: typeof partners.$inferSelect[] = [];
  let warning: string | null = null;
  try {
    partnerRows = await db.select().from(partners).orderBy(asc(partners.sortOrder), asc(partners.createdAt));
  } catch (e: unknown) {
    const err = e as { message?: string; code?: string; cause?: { code?: string } };
    const msg = err?.message ?? "";
    const code = err?.code ?? err?.cause?.code;
    const isMissingTable = code === "42P01" || msg.includes("does not exist") || msg.includes("relation") || msg.includes("Failed query") || msg.includes("partners");
    if (isMissingTable) {
      try {
        await ensurePartnersTable();
        partnerRows = await db.select().from(partners).orderBy(asc(partners.sortOrder), asc(partners.createdAt));
        warning = "✅ Table partenaires créée automatiquement avec les 3 partenaires de base.";
      } catch (retryErr) {
        console.error("Admin partners auto-create failed:", retryErr);
        warning = `Impossible de créer la table: ${(retryErr as Error).message}`;
      }
    } else {
      console.error("Admin partners load error:", e);
      warning = `Erreur de chargement: ${msg}`;
      partnerRows = [];
    }
  }

  // Serialize for client component (Date -> string to avoid RSC serialization issue)
  const serializedPartners = partnerRows.map((p) => ({
    ...p,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  }));

  return (
    <div className="container-app py-8">
      <PageHeader
        back={{ href: "/admin", label: "Dashboard admin" }}
        eyebrow="Administration"
        title="Partenaires RETRUV"
        description={`${partnerRows.length} partenaire(s) configuré(s) pour l'onglet /partenaires. Visible publiquement si actif.`}
      />

      {warning ? (
        <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          ⚠️ {warning}
        </div>
      ) : null}

      {isAdmin ? (
        <div className="mb-6">
          <AdminAddPartnerForm />
          <p className="mt-2 text-xs text-slate-500">Astuce : l'ordre d'affichage contrôle l'ordre des cartes sur la page publique. 0 = en premier.</p>
        </div>
      ) : null}

      <PartnerTable partners={serializedPartners} isAdmin={isAdmin} />
    </div>
  );
}
