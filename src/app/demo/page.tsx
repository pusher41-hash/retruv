import { PageHeader } from "@/components/ui";
import Link from "next/link";
import {
  BrainCircuit,
  CheckCircle2,
  Link2,
  MapPin,
  Search,
  Trophy,
  type LucideIcon,
} from "lucide-react";

const steps: {
  num: string;
  title: string;
  desc: string;
  icon: LucideIcon;
}[] = [
  {
    num: "01",
    title: "Aïcha déclare sa perte",
    desc: "À Bobo-Dioulasso, Aïcha signale son passeport perdu au marché central. Elle ne publie pas le numéro complet — uniquement un identifiant partiellement masqué (BF****84) et des détails de description.",
    icon: Search,
  },
  {
    num: "02",
    title: "Le moteur RETRUV analyse",
    desc: "Catégorie, sous-catégorie, couleur (Bordeaux), quartier (Centre-ville), date approximative et identifiant partiel sont croisés. Un score de correspondance est calculé — jamais présenté comme preuve absolue.",
    icon: BrainCircuit,
  },
  {
    num: "03",
    title: "Correspondance détectée",
    desc: "Moussa, trouveur vérifié, a signalé un passeport bordeaux trouvé au même quartier. RETRUV alerte les deux parties : correspondance probable (score ~96 %). Les informations sensibles restent masquées.",
    icon: Link2,
  },
  {
    num: "04",
    title: "Vérification de propriété",
    desc: "Le système pose des questions de vérification (lieu, caractéristique invisible, 2 derniers chiffres de l'identifiant). Aïcha répond correctement — le score de vérification dépasse 70 %.",
    icon: CheckCircle2,
  },
  {
    num: "05",
    title: "Récupération au Point RETRUV",
    desc: "Le passeport est déposé au Point RETRUV — Gare de Bobo-Dioulasso. Un code de restitution est généré. Aïcha se présente avec son identité, le code est vérifié, le document est remis en toute sécurité.",
    icon: MapPin,
  },
  {
    num: "06",
    title: "Dossier fermé — confiance confirmée",
    desc: "Les deux parties confirment la récupération. Le statut passe à « Récupéré ». La réputation de Moussa augmente. Le dossier est archivé après expiration automatique (90 jours).",
    icon: Trophy,
  },
];

export default function DemoPage() {
  return (
    <div className="container-app py-8">
      <PageHeader
        eyebrow="Démonstration"
        title="Le parcours RETRUV — De la perte à la récupération"
        description="Un exemple parmi des milliers, identique dans n'importe quel pays du réseau : Aïcha (Bobo-Dioulasso, passeport) et Moussa (trouveur vérifié). Chaque étape est protégée, vérifiée, transparente."
      />

      <div className="space-y-4">
        {steps.map((s) => (
          <div key={s.num} className="card p-6 flex gap-5 items-start">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-retruv-navy to-retruv-blue shadow-lg shadow-sky-200">
              <s.icon className="h-7 w-7 text-white" strokeWidth={2} />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-black uppercase tracking-[0.16em] text-retruv-blue">Étape {s.num}</span>
              </div>
              <h3 className="text-xl font-extrabold text-retruv-navy">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{s.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="card mt-6 bg-gradient-to-r from-retruv-navy to-[#123f73] p-6 text-white">
        <h2 className="text-xl font-black">Le résultat du scénario</h2>
        <ul className="mt-3 space-y-2 text-sm text-sky-100">
          {[
            "Document sensible protégé du début à la fin",
            "Matching automatique avec score explicite (jamais « preuve »)",
            "Vérification de propriété obligatoire",
            "Récupération via Point RETRUV avec code de restitution",
            "Aucune donnée sensible exposée publiquement",
            "Réputation des deux parties confirmée",
          ].map((line) => (
            <li key={line} className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
              {line}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-6 flex gap-3">
        <Link href="/lost" className="btn btn-primary">Voir les objets perdus</Link>
        <Link href="/hub" className="btn btn-secondary">Explorer le réseau mondial</Link>
      </div>
    </div>
  );
}
