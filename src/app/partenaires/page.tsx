import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { partners } from "@/db/schema";
import { PageHeader } from "@/components/ui";
import {
  Building2,
  GraduationCap,
  Train,
  Building,
  Hotel,
  Store,
  Landmark,
  Plane,
  Bus,
  ShieldCheck,
  Handshake,
  Briefcase,
  MapPin,
  ShoppingBag,
  type LucideIcon,
} from "lucide-react";

export const dynamic = "force-dynamic";

const FALLBACK_PARTNERS: { title: string; desc: string; icon: LucideIcon }[] = [
  {
    title: "Gares & Transport",
    desc: "Gares, aéroports, réseaux de bus, partout dans le monde. Dépôt d'objets, récupération, visibilité. Le point devient un service public utile.",
    icon: Train,
  },
  {
    title: "Universités & Campus",
    desc: "Établissements d'enseignement, quel que soit le pays. Déclarations de documents étudiants, récupération au secrétariat, confiance institutionnelle.",
    icon: GraduationCap,
  },
  {
    title: "Entreprises & Commerces",
    desc: "Hôtels, centres commerciaux, entreprises. Intégration du moteur de matching via API. Réputation et service client.",
    icon: Building2,
  },
];

const iconMap: Record<string, LucideIcon> = {
  Train,
  GraduationCap,
  Building2,
  Building,
  Hotel,
  Store,
  Landmark,
  Plane,
  Bus,
  ShieldCheck,
  Handshake,
  Briefcase,
  MapPin,
  ShoppingBag,
};

async function getPartners() {
  try {
    const rows = await db
      .select()
      .from(partners)
      .where(eq(partners.isActive, true))
      .orderBy(asc(partners.sortOrder), asc(partners.createdAt));
    return rows.length > 0 ? rows : null;
  } catch {
    // Table missing before migration — fallback to static
    return null;
  }
}

export default async function PartnersPage() {
  const dbPartners = await getPartners();

  return (
    <div className="container-app py-8">
      <PageHeader
        eyebrow="Modèle économique"
        title="Partenaires RETRUV"
        description="Comment une gare, un hôtel, une université ou un transporteur peut devenir un Point RETRUV et utiliser le moteur de matching — dans n'importe quel pays."
      />

      {dbPartners ? (
        <div className="grid gap-5 md:grid-cols-3">
          {dbPartners.map((p) => {
            const Icon = iconMap[p.icon] ?? Building2;
            return (
              <div key={p.id} className="card p-6 flex flex-col">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50">
                  <Icon className="h-6 w-6 text-retruv-blue" strokeWidth={2} />
                </div>
                <h3 className="mt-3 text-lg font-black text-retruv-navy">{p.title}</h3>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed flex-1">{p.description}</p>
                {p.city || p.website ? (
                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    {p.city ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 font-semibold text-slate-600">
                        <MapPin className="h-3 w-3" /> {p.city}{p.country ? ` · ${p.country}` : ""}
                      </span>
                    ) : null}
                    {p.website ? (
                      <a href={p.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sky-700 hover:underline font-semibold">
                        🌐 Site web
                      </a>
                    ) : null}
                  </div>
                ) : null}
                {p.logoUrl ? (
                  <div className="mt-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.logoUrl} alt={`Logo ${p.title}`} className="h-10 object-contain" loading="lazy" />
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-3">
          {FALLBACK_PARTNERS.map((p) => (
            <div key={p.title} className="card p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50">
                <p.icon className="h-6 w-6 text-retruv-blue" strokeWidth={2} />
              </div>
              <h3 className="mt-3 text-lg font-black text-retruv-navy">{p.title}</h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">{p.desc}</p>
            </div>
          ))}
        </div>
      )}

      <div className="card mt-6 p-6 bg-retruv-navy text-white">
        <h3 className="text-xl font-black">Le modèle en 3 piliers</h3>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <div>
            <h4 className="font-extrabold text-sky-200">Gratuit</h4>
            <p className="text-sm text-sky-100/90">Déclaration, récupération, chat : libres pour tous. Aucun biais de classe.</p>
          </div>
          <div>
            <h4 className="font-extrabold text-sky-200">Partenaires</h4>
            <p className="text-sm text-sky-100/90">Points RETRUV, entreprises : visibilité, service, réputation. Intégration API.</p>
          </div>
          <div>
            <h4 className="font-extrabold text-sky-200">API</h4>
            <p className="text-sm text-sky-100/90">Le moteur de matching peut être utilisé par d&apos;autres plateformes. Licence B2B.</p>
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="/points" className="btn btn-primary">
          Voir les points actifs
        </Link>
        <Link href="/hub" className="btn btn-secondary">
          Explorer le réseau mondial
        </Link>
        <Link href="/admin/partenaires" className="btn btn-secondary">
          Gérer les partenaires (admin)
        </Link>
      </div>
    </div>
  );
}
