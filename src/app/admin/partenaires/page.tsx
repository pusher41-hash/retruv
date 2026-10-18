import { redirect } from "next/navigation";
import { asc } from "drizzle-orm";
import { db } from "@/db";
import { partners } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { AdminAddPartnerForm } from "@/components/admin-partner-form";
import { PartnerTable } from "./partner-table";
import { countryName } from "@/lib/constants";

export const dynamic = "force-dynamic";

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
    const msg = (e as Error)?.message ?? "";
    if (msg.includes("does not exist") || msg.includes("relation")) {
      warning = "Table partners manquante — exécutez sql/002-partners.sql sur votre base Neon. Affichage temporairement vide.";
    } else {
      console.error("Admin partners load error:", e);
      warning = `Erreur de chargement: ${(e as Error).message}`;
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
