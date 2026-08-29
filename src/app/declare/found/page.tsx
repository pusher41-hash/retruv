import { PageHeader } from "@/components/ui";
import { DeclareForm } from "@/components/declare-form";

export default function DeclareFoundPage() {
  return (
    <div className="container-app py-8">
      <div className="mx-auto max-w-2xl">
        <PageHeader
          eyebrow="Déclaration"
          title="J'ai trouvé"
          description="Signalez ce que — ou qui — vous avez trouvé. Pour les documents sensibles et les personnes retrouvées, les données restent protégées."
        />
        <DeclareForm mode="found" />
      </div>
    </div>
  );
}
