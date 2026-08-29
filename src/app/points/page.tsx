import { eq } from "drizzle-orm";
import { db } from "@/db";
import { recoveryPoints } from "@/db/schema";
import { PageHeader, StatCard } from "@/components/ui";
import { CheckCircle2, Clock, MapPin, Package, Phone, User } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function PointsPage() {
  const points = await db
    .select()
    .from(recoveryPoints)
    .where(eq(recoveryPoints.isActive, true));

  const deposited = points.reduce((s, p) => s + p.itemsDeposited, 0);
  const recovered = points.reduce((s, p) => s + p.itemsRecovered, 0);

  return (
    <div className="container-app py-8">
      <PageHeader
        eyebrow="Réseau"
        title="Points RETRUV"
        description="Déposez ou récupérez un objet dans un lieu de confiance : gare, mairie, commissariat, campus..."
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <StatCard label="Points actifs" value={points.length} icon={MapPin} />
        <StatCard label="Objets déposés" value={deposited} icon={Package} />
        <StatCard label="Objets récupérés" value={recovered} icon={CheckCircle2} />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {points.map((p) => (
          <div key={p.id} className="card p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-teal-700">
                  {p.type}
                </p>
                <h2 className="mt-1 text-lg font-bold text-retruv-navy">
                  {p.name}
                </h2>
              </div>
              <div className="rounded-2xl bg-teal-50 px-3 py-2 text-center">
                <div className="text-lg font-black text-teal-700">
                  {p.itemsRecovered}
                </div>
                <div className="text-[10px] font-semibold text-teal-700">
                  récupérés
                </div>
              </div>
            </div>
            <p className="mt-3 text-sm text-slate-600">
              {p.address}, {p.city}
            </p>
            <div className="mt-3 grid gap-1 text-sm text-slate-500">
              {p.hours ? (
                <p className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" /> {p.hours}
                </p>
              ) : null}
              {p.phone ? (
                <p className="flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5" /> {p.phone}
                </p>
              ) : null}
              {p.managerName ? (
                <p className="flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5" /> {p.managerName}
                </p>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
