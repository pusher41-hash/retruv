"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Field } from "@/components/ui";
import { COUNTRIES } from "@/lib/constants";
import { Sparkles, Plus, X, Building2, Tag, Palette, FileText, Globe, Image as ImageIcon, MapPin, Flag, ListOrdered, Save } from "lucide-react";

const PARTNER_ICONS = [
  { value: "Train", label: "🚆 Train / Transport", icon: "🚆" },
  { value: "GraduationCap", label: "🎓 Université / Campus", icon: "🎓" },
  { value: "Building2", label: "🏢 Entreprise / Commerce", icon: "🏢" },
  { value: "Building", label: "🏛️ Institution / Mairie", icon: "🏛️" },
  { value: "Landmark", label: "🏛️ Mairie / Admin", icon: "🏛️" },
  { value: "Hotel", label: "🏨 Hôtel / Hébergement", icon: "🏨" },
  { value: "Store", label: "🏪 Boutique / Commerce", icon: "🏪" },
  { value: "Plane", label: "✈️ Aéroport / Avion", icon: "✈️" },
  { value: "Bus", label: "🚌 Bus / Réseau urbain", icon: "🚌" },
  { value: "Handshake", label: "🤝 Partenaire officiel", icon: "🤝" },
  { value: "ShieldCheck", label: "🛡️ Police / Sécurité", icon: "🛡️" },
  { value: "Briefcase", label: "💼 Entreprise / Bureau", icon: "💼" },
  { value: "MapPin", label: "📍 Point local / Quartier", icon: "📍" },
  { value: "ShoppingBag", label: "🛍️ Centre commercial / Marché", icon: "🛍️" },
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
      <button type="button" onClick={() => setOpen(true)} className="btn btn-primary gap-2">
        <Plus className="h-4 w-4" /> ✨ Ajouter un partenaire
      </button>
    );
  }

  return (
    <form onSubmit={onSubmit} className="card overflow-hidden">
      {/* Header modern with gradient */}
      <div className="bg-gradient-to-r from-sky-50 to-blue-50 border-b border-sky-100 px-5 py-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white shadow-sm border border-sky-100">
          <Sparkles className="h-5 w-5 text-retruv-blue" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-black text-retruv-navy flex items-center gap-2">
            <span>✨ Nouveau partenaire RETRUV</span>
            <span className="hidden sm:inline text-xs font-semibold text-sky-600 bg-white px-2 py-0.5 rounded-full border border-sky-200">Moderne</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">Renseigne les infos — la carte apparaîtra instantanément sur <span className="font-semibold text-sky-700">/partenaires</span> ✨</p>
        </div>
        <button type="button" onClick={() => setOpen(false)} className="rounded-xl bg-white p-2 border border-slate-200 hover:bg-slate-50">
          <X className="h-4 w-4 text-slate-500" />
        </button>
      </div>

      <div className="p-5 space-y-4">
        {error ? <Alert type="error">⚠️ {error}</Alert> : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="🏷️ Titre du partenaire *">
            <div className="relative">
              <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              <input className="input pl-10" name="title" required maxLength={120} placeholder="Ex: 🚆 Gares & Transport" />
            </div>
          </Field>
          <Field label="🎨 Icône / Style">
            <div className="relative">
              <Palette className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              <select className="select pl-10" name="icon" required defaultValue="Building2">
                {PARTNER_ICONS.map((i) => (
                  <option key={i.value} value={i.value}>{i.label}</option>
                ))}
              </select>
            </div>
          </Field>
        </div>

        <Field label="📝 Description *">
          <div className="relative">
            <FileText className="absolute left-3 top-3 h-4 w-4 text-slate-400 pointer-events-none" />
            <textarea className="textarea min-h-[90px] pl-10" name="description" required maxLength={600} placeholder="✨ Décrivez le type de partenaire, ses avantages, son rôle dans le réseau RETRUV..." />
          </div>
          <span className="mt-1 block text-xs text-slate-400">💡 Astuce : utilise un ton accueillant, 1-2 phrases suffisent.</span>
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="🌐 Site web (optionnel)">
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input className="input pl-10" name="website" placeholder="https://partenaire.bf ✨" />
            </div>
          </Field>
          <Field label="🖼️ Logo URL (optionnel)">
            <div className="relative">
              <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input className="input pl-10" name="logoUrl" placeholder="https://.../logo.png 🎨" />
            </div>
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="📍 Ville (optionnel)">
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input className="input pl-10" name="city" placeholder="Bobo-Dioulasso 🇧🇫" />
            </div>
          </Field>
          <Field label="🌍 Pays (optionnel)">
            <div className="relative">
              <Flag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <select className="select pl-10" name="country" defaultValue="">
                <option value="">— Aucun 🌐 —</option>
                {COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>{c.name}</option>
                ))}
              </select>
            </div>
          </Field>
          <Field label="🔢 Ordre d'affichage">
            <div className="relative">
              <ListOrdered className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input className="input pl-10" name="sortOrder" type="number" min={0} max={1000} defaultValue={0} placeholder="0 = premier ⭐" />
            </div>
          </Field>
        </div>

        <div className="flex gap-2 pt-2 border-t border-slate-100">
          <button type="button" onClick={() => setOpen(false)} className="btn btn-secondary gap-2" disabled={loading}>
            <X className="h-4 w-4" /> Annuler
          </button>
          <button type="submit" className="btn btn-primary gap-2 flex-1 sm:flex-none" disabled={loading}>
            {loading ? <><span className="animate-spin">⏳</span> Création...</> : <><Save className="h-4 w-4" /> ✨ Créer le partenaire</>}
          </button>
        </div>
      </div>
    </form>
  );
}
