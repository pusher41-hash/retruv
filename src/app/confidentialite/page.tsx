import Link from "next/link";
import { PageHeader } from "@/components/ui";

export default function ConfidentialitePage() {
  return (
    <div className="container-app py-8">
      <PageHeader
        eyebrow="Protection"
        title="Confidentialité — RETRUV"
        description="Le minimum de données nécessaires pour récupérer l'objet. Rien d'autre."
      />

      <div className="grid gap-4 md:grid-cols-2">
        <div className="card p-6">
          <h3 className="text-xl font-extrabold text-retruv-navy">Documents sensibles (CNI, passeport, permis)</h3>
          <ul className="mt-4 space-y-2 text-sm text-slate-700 font-medium list-disc pl-4">
            <li>Numéro complet : <strong>jamais publié</strong></li>
            <li>Photo lisible du document : <strong>jamais affichée publiquement</strong></li>
            <li>Adresse, date de naissance complète : <strong>jamais exposée</strong></li>
            <li>Identifiant : <strong>partiellement masqué</strong> (ex : BF****84)</li>
            <li>Chiffrement AES-256-GCM appliqué aux données sensibles</li>
          </ul>
        </div>
        <div className="card p-6">
          <h3 className="text-xl font-extrabold text-retruv-navy">Contrôle d&apos;accès</h3>
          <ul className="mt-4 space-y-2 text-sm text-slate-700 font-medium list-disc pl-4">
            <li>Déclarations expirées : suppression automatique après 90 jours</li>
            <li>Tentatives de vérification : limitées (3 max par match)</li>
            <li>Rate-limit : déclarations et vérifications contrôlées</li>
            <li>Audit log : toutes les actions sensibles enregistrées</li>
            <li>Signalement : tout utilisateur peut signaler un abus</li>
          </ul>
        </div>
      </div>

      <div className="card mt-6 p-6 bg-retruv-navy text-white">
        <h3 className="text-xl font-black">Notre engagement</h3>
        <p className="mt-2 text-sm font-medium text-white/95 leading-relaxed">
          RETRUV est conçu selon le principe : <strong>le minimum de données nécessaires pour récupérer l&apos;objet</strong>. Nous ne vendons pas de données. Nous ne publions pas de numéros complets. Nous supprimons automatiquement. La confiance n&apos;est pas un argument de vente — c&apos;est la fondation technique du produit.
        </p>
      </div>

      <div className="mt-6 flex gap-3">
        <Link href="/hub" className="btn btn-primary">Explorer le réseau</Link>
        <Link href="/demo" className="btn btn-secondary">Voir la démo</Link>
      </div>
    </div>
  );
}
