import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { recoveryPoints } from "@/db/schema";
import { PageHeader } from "@/components/ui";
import { countryName } from "@/lib/constants";
import { MapPin, Clock, Phone, User, Printer, CheckCircle2 } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function PointDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [point] = await db.select().from(recoveryPoints).where(eq(recoveryPoints.id, id)).limit(1);
  if (!point) notFound();
  let qrDataUrl: string | null = null;
  try {
    const QR = await import("qrcode");
    const url = `https://retruv.vercel.app/declare/found?pointId=${point.id}`;
    qrDataUrl = await QR.toDataURL(url, { width: 300, margin: 2 });
  } catch {}
  const scanUrl = `https://retruv.vercel.app/declare/found?pointId=${point.id}`;
  return (
    <div className="container-app py-8">
      <PageHeader back={{ href: "/points", label: "Points RETRUV" }} eyebrow="Point vérifié" title={point.name} description={`${point.city} · ${countryName(point.country)} — ${point.address}`} />
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card p-5 border-slate-200">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500"><span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-semibold text-slate-600 capitalize">{point.type}</span><span className="ml-2">{point.city} · {countryName(point.country)}</span></p>
          <h2 className="mt-2 text-lg font-bold text-slate-900">{point.name}</h2>
          <p className="mt-1 text-sm text-slate-600">{point.address}, {point.city}</p>
          <div className="mt-3 grid gap-1 text-sm text-slate-500">
            {point.hours ? <p className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> {point.hours}</p> : null}
            {point.phone ? <p className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" /> {point.phone}</p> : null}
            {point.managerName ? <p className="flex items-center gap-1.5"><User className="h-3.5 w-3.5" /> {point.managerName}</p> : null}
          </div>
          <div className="mt-4 flex items-center justify-between text-xs"><span className="text-slate-500">Déposés <b className="text-slate-700">{point.itemsDeposited}</b> · Récupérés <b className="text-slate-700">{point.itemsRecovered}</b></span><span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-1 text-xs font-semibold text-emerald-700"><CheckCircle2 className="h-3 w-3" /> Opérationnel</span></div>
        </div>
        <div className="card p-5 border-slate-200 text-center">
          <h3 className="text-sm font-bold text-slate-900 flex items-center justify-center gap-2"><Printer className="h-4 w-4" /> QR offline — A4 imprimable</h3>
          <p className="mt-1 text-xs text-slate-500">Scannez en gare pour pré-remplir le dépôt avec ce Point</p>
          {qrDataUrl ? <img src={qrDataUrl} alt={`QR ${point.name}`} className="mx-auto mt-4 h-[260px] w-[260px] border border-slate-200 rounded-xl p-2 bg-white" /> : <div className="mx-auto mt-4 h-[260px] w-[260px] border border-slate-200 rounded-xl flex items-center justify-center text-slate-400 text-sm">QR indisponible</div>}
          <p className="mt-3 text-xs font-mono text-slate-600 break-all">{scanUrl}</p>
          <div className="mt-4 flex gap-2 justify-center"><Link href={`/declare/found?pointId=${point.id}`} className="btn btn-primary gap-2"><MapPin className="h-4 w-4" /> Déposer ici</Link><Link href="/points" className="btn btn-secondary gap-2"><Printer className="h-4 w-4" /> Imprimer</Link></div>
          <p className="mt-2 text-[11px] text-slate-500">Imprimez et affichez à l&apos;accueil du Point</p>
        </div>
      </div>
    </div>
  );
}
