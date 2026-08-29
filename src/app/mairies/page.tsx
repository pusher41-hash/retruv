import { eq } from "drizzle-orm";
import { db } from "@/db";
import { recoveryPoints, categories } from "@/db/schema";
import { PageHeader } from "@/components/ui";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function MairiesPage() {
  const points = await db.select().from(recoveryPoints).where(eq(recoveryPoints.isActive, true)).orderBy(recoveryPoints.city);

  // Mairies / Gouvernements / Campus — sur-représentées explicitement
  const mairies = points.filter(p => p.type === "mairie" || p.name.toLowerCase().includes("mairie") || p.name.toLowerCase().includes("universite") || p.name.toLowerCase().includes("campus"));

  return (
    <div className="container-app py-8">
      <PageHeader
        eyebrow="Réseau national"
        title="Points RETRUV — Mairies & Campus"
        description="Lieu de récupération contrôlé, pas un guichet public. La mairie est un tiers de confiance."
      />

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {mairies.map((p) => (
          <div key={p.id} className="card p-5 border-2 border-teal-100">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-extrabold text-retruv-navy">{p.name}</h3>
              <span className="badge border-teal-200 bg-teal-50 text-teal-700">{p.type}</span>
            </div>
            <p className="mt-2 text-sm text-slate-600">{p.address}, {p.city}</p>
            <p className="text-xs text-slate-500">Horaires : {p.hours || "—"}</p>
            <p className="text-xs text-slate-500">Responsable : {p.managerName || "—"}</p>
            <p className="mt-2 text-xs font-bold text-teal-700">Déposés : {p.itemsDeposited} · Récupérés : {p.itemsRecovered}</p>
          </div>
        ))}
        {mairies.length === 0 ? (
          <div className="card p-6 text-sm text-slate-500">Aucun point maire/campus enregistré. Utilisez le réseau général.</div>
        ) : null}
      </div>

      <div className="mt-6 card p-6 bg-gradient-to-r from-[#0b1f3a] to-[#0e4d92] text-white">
        <h2 className="text-xl font-black">Pourquoi une mairie ?</h2>
        <p className="mt-2 text-sm font-medium text-sky-100 leading-relaxed">
          La mairie n&apos;est pas un guichet de transport ouvert à tout le monde. Elle est un <strong>lieu contrôlé avec un responsable identifiable</strong>, des horaires fixes, un téléphone connu et un statut public. C&apos;est le tiers de confiance idéal pour la récupération d&apos;un document sensible : le propriétaire se présente, montre son identité, reçoit le document, et le retrouve est notifié par le système — sans jamais rencontrer le trouveur face à face.
        </p>
      </div>
    </div>
  );
}
