"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Field } from "@/components/ui";
import { COUNTRIES } from "@/lib/constants";

const PARTNER_ICONS = [
  { value: "Train", label: "🚆 Train / Transport" },
  { value: "GraduationCap", label: "🎓 Université" },
  { value: "Building2", label: "🏢 Entreprise / Commerce" },
  { value: "Building", label: "🏛️ Institution" },
  { value: "Landmark", label: "🏛️ Mairie / Admin" },
  { value: "Hotel", label: "🏨 Hôtel" },
  { value: "Store", label: "🏪 Commerce" },
  { value: "Plane", label: "✈️ Aéroport" },
  { value: "Bus", label: "🚌 Bus / Réseau" },
  { value: "Handshake", label: "🤝 Partenaire" },
  { value: "ShieldCheck", label: "🛡️ Sécurité / Police" },
  { value: "Briefcase", label: "💼 Bureau" },
  { value: "MapPin", label: "📍 Point local" },
  { value: "ShoppingBag", label: "🛍️ Centre commercial" },
] as const;

export function AdminAddPartnerForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    const payload = {
      title: fd.get("title"),
      description: fd.get("description"),
      icon: fd.get("icon"),
      website: fd.get("website") || null,
      logoUrl: fd.get("logoUrl") || null,
      city: fd.get("city") || null,
      country: fd.get("country") || null,
      sortOrder: fd.get("sortOrder") ? Number(fd.get("sortOrder")) : 0,
    };
    const res = await fetch("/api/admin/partners", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Erreur lors de la création");
      return;
    }
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="btn btn-primary">
        + Ajouter un partenaire
      </button>
    );
  }

  return (
    <form onSubmit={onSubmit} className="card space-y-4 p-5">
      {error ? <Alert type="error">{error}</Alert> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Titre *">
          <input className="input" name="title" required maxLength={120} placeholder="Ex: Gares & Transport" />
        </Field>
        <Field label="Icône">
          <select className="select" name="icon" required defaultValue="Building2">
            {PARTNER_ICONS.map((i) => (
              <option key={i.value} value={i.value}>{i.label}</option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="Description *">
        <textarea className="textarea min-h-[90px]" name="description" required maxLength={600} placeholder="Décrivez le type de partenaire, ses avantages..." />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Site web (optionnel)">
          <input className="input" name="website" placeholder="https://..." />
        </Field>
        <Field label="Logo URL (optionnel)">
          <input className="input" name="logoUrl" placeholder="https://.../logo.png" />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Ville (optionnel)">
          <input className="input" name="city" placeholder="Bobo-Dioulasso" />
        </Field>
        <Field label="Pays (optionnel)">
          <select className="select" name="country" defaultValue="">
            <option value="">— Aucun —</option>
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>{c.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Ordre d'affichage">
          <input className="input" name="sortOrder" type="number" min={0} max={1000} defaultValue={0} />
        </Field>
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={() => setOpen(false)} className="btn btn-secondary" disabled={loading}>Annuler</button>
        <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? "Création..." : "Créer le partenaire"}</button>
      </div>
    </form>
  );
}
