import Link from "next/link";
import { PageHeader } from "@/components/ui";
import { Building2, GraduationCap, Train, type LucideIcon } from "lucide-react";

const PARTNER_TYPES: { title: string; desc: string; icon: LucideIcon }[] = [
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

export default function PartnersPage() {
  return (
    <div className="container-app py-8">
      <PageHeader
        eyebrow="Modèle économique"
        title="Partenaires RETRUV"
        description="Comment une gare, un hôtel, une université ou un transporteur peut devenir un Point RETRUV et utiliser le moteur de matching — dans n'importe quel pays."
      />

      <div className="grid gap-5 md:grid-cols-3">
        {PARTNER_TYPES.map((p) => (
          <div key={p.title} className="card p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50">
              <p.icon className="h-6 w-6 text-retruv-blue" strokeWidth={2} />
            </div>
            <h3 className="mt-3 text-lg font-black text-retruv-navy">{p.title}</h3>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">{p.desc}</p>
          </div>
        ))}
      </div>

      <div className="card mt-6 p-6 bg-gradient-to-r from-retruv-navy to-[#123f73] text-white">
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

      <div className="mt-6 flex gap-3">
        <Link href="/points" className="btn btn-primary">Voir les points actifs</Link>
        <Link href="/hub" className="btn btn-secondary">Explorer le réseau mondial</Link>
      </div>
    </div>
  );
}
