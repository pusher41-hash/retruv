"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Power, PowerOff, Trash2, X, Check, Pencil, Save, Globe, Image as ImageIcon, MapPin, Flag, ListOrdered, Tag, FileText, Palette } from "lucide-react";

export function AdminPartnerActions({ id, isActive }: { id: string; isActive: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [confirming, setConfirming] = useState(false);

  async function toggle() {
    setLoading(true);
    setError("");
    const res = await fetch(`/api/admin/partners/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !isActive }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error || "Erreur"); return; }
    router.refresh();
  }

  async function del() {
    setLoading(true);
    const res = await fetch(`/api/admin/partners/${id}`, { method: "DELETE" });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error || "Erreur"); setConfirming(false); return; }
    router.refresh();
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2 flex-wrap justify-end">
        <button type="button" onClick={toggle} disabled={loading} className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition ${isActive ? "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100" : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"}`}>
          {isActive ? <><PowerOff className="h-3.5 w-3.5" /> 😴 Désactiver</> : <><Power className="h-3.5 w-3.5" /> ✅ Activer</>}
        </button>
        {confirming ? (
          <>
            <button type="button" onClick={() => setConfirming(false)} disabled={loading} className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50">
              <X className="h-3.5 w-3.5" /> Annuler
            </button>
            <button type="button" onClick={del} disabled={loading} className="inline-flex items-center gap-1 rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100">
              <Check className="h-3.5 w-3.5" /> ✅ Confirmer
            </button>
          </>
        ) : (
          <button type="button" onClick={() => setConfirming(true)} disabled={loading} className="inline-flex items-center gap-1 rounded-xl border border-rose-200 bg-white px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-50">
            <Trash2 className="h-3.5 w-3.5" /> 🗑️ Supprimer
          </button>
        )}
      </div>
      {error ? <span className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-2 py-1">⚠️ {error}</span> : null}
    </div>
  );
}

export function AdminPartnerEditInline({ partner, onClose }: { partner: { id: string; title: string; description: string; icon: string; website?: string | null; logoUrl?: string | null; city?: string | null; country?: string | null; sortOrder: number }; onClose: () => void }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const ICONS = [
    { v: "Train", l: "🚆 Train" },
    { v: "GraduationCap", l: "🎓 Université" },
    { v: "Building2", l: "🏢 Commerce" },
    { v: "Building", l: "🏛️ Institution" },
    { v: "Landmark", l: "🏛️ Mairie" },
    { v: "Hotel", l: "🏨 Hôtel" },
    { v: "Store", l: "🏪 Boutique" },
    { v: "Plane", l: "✈️ Aéroport" },
    { v: "Bus", l: "🚌 Bus" },
    { v: "Handshake", l: "🤝 Partenaire" },
    { v: "ShieldCheck", l: "🛡️ Sécurité" },
    { v: "Briefcase", l: "💼 Bureau" },
    { v: "MapPin", l: "📍 Local" },
    { v: "ShoppingBag", l: "🛍️ Marché" },
  ] as const;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const payload = {
      title: fd.get("title"),
      description: fd.get("description"),
      icon: fd.get("icon"),
      website: (fd.get("website") as string) || null,
      logoUrl: (fd.get("logoUrl") as string) || null,
      city: (fd.get("city") as string) || null,
      country: (fd.get("country") as string) || null,
      sortOrder: fd.get("sortOrder") ? Number(fd.get("sortOrder")) : 0,
    };
    const res = await fetch(`/api/admin/partners/${partner.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error || "Erreur"); return; }
    router.refresh();
    onClose();
  }

  return (
    <form onSubmit={onSubmit} className="card overflow-hidden border-sky-200">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-100 px-4 py-3 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white shadow-sm border border-amber-200">
          <Pencil className="h-4 w-4 text-amber-600" />
        </div>
        <div className="flex-1">
          <h4 className="text-sm font-black text-amber-900">✏️ Modifier le partenaire</h4>
          <p className="text-xs text-amber-700/70">Modifie les infos — sauvegarde instantanée ✨</p>
        </div>
        <button type="button" onClick={onClose} className="rounded-xl bg-white p-1.5 border border-amber-200 hover:bg-amber-50">
          <X className="h-4 w-4 text-amber-600" />
        </button>
      </div>

      <div className="p-4 space-y-3 bg-white">
        {error ? <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800 flex items-center gap-2">⚠️ {error}</div> : null}

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="label flex items-center gap-1.5"><Tag className="h-3.5 w-3.5 text-sky-600" /> 🏷️ Titre *</span>
            <div className="relative">
              <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input className="input pl-10" name="title" required defaultValue={partner.title} placeholder="Ex: 🚆 Gares & Transport" />
            </div>
          </label>
          <label className="block">
            <span className="label flex items-center gap-1.5"><Palette className="h-3.5 w-3.5 text-sky-600" /> 🎨 Icône</span>
            <div className="relative">
              <Palette className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <select className="select pl-10" name="icon" defaultValue={partner.icon}>
                {ICONS.map(i => <option key={i.v} value={i.v}>{i.l}</option>)}
              </select>
            </div>
          </label>
        </div>

        <label className="block">
          <span className="label flex items-center gap-1.5"><FileText className="h-3.5 w-3.5 text-sky-600" /> 📝 Description *</span>
          <div className="relative">
            <FileText className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <textarea className="textarea min-h-[80px] pl-10" name="description" required defaultValue={partner.description} placeholder="Décris le partenaire avec ton ✨..." />
          </div>
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="label flex items-center gap-1.5"><Globe className="h-3.5 w-3.5 text-sky-600" /> 🌐 Site web</span>
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input className="input pl-10" name="website" defaultValue={partner.website ?? ""} placeholder="https://... 🌍" />
            </div>
          </label>
          <label className="block">
            <span className="label flex items-center gap-1.5"><ImageIcon className="h-3.5 w-3.5 text-sky-600" /> 🖼️ Logo URL</span>
            <div className="relative">
              <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input className="input pl-10" name="logoUrl" defaultValue={partner.logoUrl ?? ""} placeholder="https://.../logo.png 🎨" />
            </div>
          </label>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <label className="block">
            <span className="label flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-sky-600" /> 📍 Ville</span>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input className="input pl-10" name="city" defaultValue={partner.city ?? ""} placeholder="Bobo-Dioulasso 🇧🇫" />
            </div>
          </label>
          <label className="block">
            <span className="label flex items-center gap-1.5"><Flag className="h-3.5 w-3.5 text-sky-600" /> 🌍 Pays</span>
            <div className="relative">
              <Flag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input className="input pl-10" name="country" maxLength={2} defaultValue={partner.country ?? ""} placeholder="BF 🇧🇫" />
            </div>
          </label>
          <label className="block">
            <span className="label flex items-center gap-1.5"><ListOrdered className="h-3.5 w-3.5 text-sky-600" /> 🔢 Ordre</span>
            <div className="relative">
              <ListOrdered className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input className="input pl-10" name="sortOrder" type="number" defaultValue={partner.sortOrder} placeholder="0 ⭐" />
            </div>
          </label>
        </div>

        <div className="flex gap-2 justify-end pt-2 border-t border-slate-100">
          <button type="button" onClick={onClose} className="btn btn-secondary gap-2"><X className="h-4 w-4" /> Annuler</button>
          <button type="submit" className="btn btn-primary gap-2" disabled={loading}>{loading ? "⏳ Enregistrement..." : <><Save className="h-4 w-4" /> ✨ Enregistrer</>}</button>
        </div>
      </div>
    </form>
  );
}
