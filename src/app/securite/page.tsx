import Link from "next/link";
import { PageHeader } from "@/components/ui";
import { CheckCircle2, Lock, MapPin, PenLine, XCircle } from "lucide-react";

export default function RecoverySafetyPage() {
  return (
    <div className="container-app py-8">
      <PageHeader
        eyebrow="Sécurité — Récupération sécurisée"
        title="Comment récupérer sans risque"
        description="Le système interdit la rencontre publique pour les documents sensibles et propose des lieux contrôlés."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="card p-5 border-rose-200 bg-rose-50/40">
          <h3 className="flex items-center gap-2 font-extrabold text-rose-700">
            <XCircle className="h-5 w-5" />
            Non autorisé
          </h3>
          <ul className="mt-3 space-y-2 text-sm font-medium text-slate-700">
            <li>• Guichet public (gare ouverte)</li>
            <li>• Commissariat sans responsable assigné</li>
            <li>• Rencontre directe sans vérification</li>
            <li>• Remise sans code de restitution</li>
            <li>• Lieu de rencontre sur le territoire intermédiaire</li>
          </ul>
        </div>
        <div className="card p-5 border-teal-200 bg-teal-50/40">
          <h3 className="flex items-center gap-2 font-extrabold text-teal-700">
            <CheckCircle2 className="h-5 w-5" />
            Point RETRUV
          </h3>
          <ul className="mt-3 space-y-2 text-sm font-medium text-slate-700">
            <li>• Mairie contrôlée (responsable assigné)</li>
            <li>• Gare avec Point RETRUV (pas le guichet)</li>
            <li>• Université (campus sécurisé)</li>
            <li>• Code de restitution obligatoire</li>
            <li>• Récupération par le propriétaire seul</li>
          </ul>
        </div>
        <div className="card p-5 border-violet-200 bg-violet-50/40">
          <h3 className="flex items-center gap-2 font-extrabold text-violet-700">
            <Lock className="h-5 w-5" />
            Autorité
          </h3>
          <ul className="mt-3 space-y-2 text-sm font-medium text-slate-700">
            <li>• CNI / Passeport / Permis uniquement</li>
            <li>• Agent habilité participe</li>
            <li>• Vérification physique des données</li>
            <li>• Signature de remise</li>
            <li>• Pas de rencontre avec le trouveur</li>
          </ul>
        </div>
      </div>

      <div className="card mt-6 p-6 bg-retruv-navy text-white">
        <h2 className="text-2xl font-black">Règle de récupération sécurisée</h2>
        <p className="mt-3 text-base font-medium text-sky-100 leading-relaxed">
          Pour tout objet <strong>sensible</strong> (document officiel) : la récupération se fait uniquement via un <strong>Point RETRUV</strong> (mairie, campus, gare avec responsable) ou via <strong>autorité habilitée</strong>. La rencontre directe avec le trouveur dans un lieu public est <strong>interdite par le système</strong> pour ces catégories. Pour les objets non sensibles (téléphone, sac, clé) : rencontre directe autorisée <strong>si et seulement si</strong> la vérification de propriété est passée et que les deux parties utilisent le chat interne.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 mt-6">
        <Link href="/points" className="card p-5 block hover:-translate-y-0.5 transition">
          <h3 className="flex items-center gap-2 font-extrabold text-retruv-navy text-lg">
            <MapPin className="h-5 w-5" />
            Points RETRUV — Mairies & Campus
          </h3>
          <p className="mt-2 text-sm text-slate-600">Mairies, campus universitaires, gares avec responsable — dans chaque pays du réseau. Chaque point a un responsable, des horaires, un téléphone et un statut.</p>
        </Link>
        <Link href="/declare/found" className="card p-5 block hover:-translate-y-0.5 transition border-teal-200">
          <h3 className="flex items-center gap-2 font-extrabold text-teal-700 text-lg">
            <PenLine className="h-5 w-5" />
            Déclarer un objet trouvé
          </h3>
          <p className="mt-2 text-sm text-slate-600">Déclarez un objet trouvé et proposez un dépôt au Point RETRUV le plus proche — pas de rencontre obligatoire.</p>
        </Link>
      </div>
    </div>
  );
}
