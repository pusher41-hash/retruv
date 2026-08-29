import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { listPendingModeration } from "@/lib/moderation";
import { getCategoryFieldConfig } from "@/lib/category-fields";
import { PageHeader } from "@/components/ui";
import { ModerationActions } from "@/components/moderation-actions";
import { formatRelative } from "@/lib/utils";
import { CategoryIcon } from "@/lib/category-icons";
import { ShieldCheck } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ModerationQueuePage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.role !== "admin" && user.role !== "moderator") redirect("/dashboard");

  const { pendingLost, pendingFound } = await listPendingModeration();
  const total = pendingLost.length + pendingFound.length;

  return (
    <div className="container-app py-8">
      <PageHeader
        eyebrow="Modération"
        title="File d'attente — Personnes disparues"
        description="Ces déclarations ne sont ni publiques ni mises en correspondance tant qu'elles ne sont pas validées ici."
        action={
          <Link href="/admin" className="btn btn-secondary">
            Retour au dashboard
          </Link>
        }
      />

      {total === 0 ? (
        <div className="card flex items-center gap-3 p-6 text-slate-600">
          <ShieldCheck className="h-6 w-6 text-emerald-600" />
          Aucune déclaration en attente de vérification.
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {pendingLost.map(({ item, category }) => {
            const fieldConfig = getCategoryFieldConfig(category.slug);
            return (
              <div key={item.id} className="card space-y-3 p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CategoryIcon slug={category.slug} className="h-5 w-5 text-retruv-blue" />
                    <span className="badge border-sky-200 bg-sky-50 text-sky-700">
                      Perdu
                    </span>
                  </div>
                  <span className="text-xs text-slate-400">
                    {formatRelative(item.createdAt)}
                  </span>
                </div>
                <h3 className="font-bold text-slate-900">{item.title}</h3>
                <p className="text-sm text-slate-600">{item.description}</p>
                <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                  <span>{item.city}</span>
                  {item.details &&
                    fieldConfig.extraFields.map((f) => {
                      const value = item.details?.[f.key];
                      return value ? (
                        <span key={f.key} className="badge border-slate-200 bg-slate-50">
                          {f.label} : {value}
                        </span>
                      ) : null;
                    })}
                </div>
                {item.photoUrls && item.photoUrls.length > 0 ? (
                  <div className="grid grid-cols-4 gap-2">
                    {item.photoUrls.map((url) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={url}
                        src={url}
                        alt=""
                        className="aspect-square w-full rounded-xl object-cover"
                      />
                    ))}
                  </div>
                ) : null}
                <Link
                  href={`/lost/${item.id}`}
                  className="text-sm font-semibold text-retruv-blue"
                >
                  Voir la fiche complète →
                </Link>
                <ModerationActions type="lost" id={item.id} />
              </div>
            );
          })}

          {pendingFound.map(({ item, category }) => {
            const fieldConfig = getCategoryFieldConfig(category.slug);
            return (
              <div key={item.id} className="card space-y-3 p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CategoryIcon slug={category.slug} className="h-5 w-5 text-retruv-teal" />
                    <span className="badge border-teal-200 bg-teal-50 text-teal-700">
                      Trouvé
                    </span>
                  </div>
                  <span className="text-xs text-slate-400">
                    {formatRelative(item.createdAt)}
                  </span>
                </div>
                <h3 className="font-bold text-slate-900">{item.title}</h3>
                <p className="text-sm text-slate-600">{item.description}</p>
                <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                  <span>{item.city}</span>
                  {item.details &&
                    fieldConfig.extraFields.map((f) => {
                      const value = item.details?.[f.key];
                      return value ? (
                        <span key={f.key} className="badge border-slate-200 bg-slate-50">
                          {f.label} : {value}
                        </span>
                      ) : null;
                    })}
                </div>
                {item.photoUrls && item.photoUrls.length > 0 ? (
                  <div className="grid grid-cols-4 gap-2">
                    {item.photoUrls.map((url) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={url}
                        src={url}
                        alt=""
                        className="aspect-square w-full rounded-xl object-cover"
                      />
                    ))}
                  </div>
                ) : null}
                <Link
                  href={`/found/${item.id}`}
                  className="text-sm font-semibold text-retruv-teal"
                >
                  Voir la fiche complète →
                </Link>
                <ModerationActions type="found" id={item.id} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
