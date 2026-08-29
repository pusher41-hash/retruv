import { PageHeader } from "@/components/ui";
import { DeclareForm } from "@/components/declare-form";

export default function DeclareLostPage() {
  return (
    <div className="container-app py-8">
      <div className="mx-auto max-w-2xl">
        <PageHeader
          eyebrow="Déclaration"
          title="J'ai perdu"
          description="Objet, document, ou une personne portée disparue : décrivez la situation, RETRUV cherchera automatiquement des correspondances."
        />
        <DeclareForm mode="lost" />
      </div>
    </div>
  );
}
