"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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
        <button type="button" onClick={toggle} disabled={loading} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50">
          {isActive ? "Désactiver" : "Activer"}
        </button>
        {confirming ? (
          <>
            <button type="button" onClick={() => setConfirming(false)} disabled={loading} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600">Annuler</button>
            <button type="button" onClick={del} disabled={loading} className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100">Confirmer</button>
          </>
        ) : (
          <button type="button" onClick={() => setConfirming(true)} disabled={loading} className="rounded-lg border border-rose-200 px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50">Supprimer</button>
        )}
      </div>
      {error ? <span className="text-xs text-rose-600">{error}</span> : null}
    </div>
  );
}

export function AdminPartnerEditInline({ partner, onClose }: { partner: { id: string; title: string; description: string; icon: string; website?: string | null; logoUrl?: string | null; city?: string | null; country?: string | null; sortOrder: number }; onClose: () => void }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const ICONS = ["Train","GraduationCap","Building2","Building","Landmark","Hotel","Store","Plane","Bus","Handshake","ShieldCheck","Briefcase","MapPin","ShoppingBag"] as const;

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
    <form onSubmit={onSubmit} className="card p-4 space-y-3 bg-slate-50/50">
      {error ? <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</div> : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block"><span className="label">Titre *</span><input className="input" name="title" required defaultValue={partner.title} /></label>
        <label className="block"><span className="label">Icône</span>
          <select className="select" name="icon" defaultValue={partner.icon}>
            {ICONS.map(i => <option key={i} value={i}>{i}</option>)}
          </select>
        </label>
      </div>
      <label className="block"><span className="label">Description *</span><textarea className="textarea min-h-[80px]" name="description" required defaultValue={partner.description} /></label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block"><span className="label">Site web</span><input className="input" name="website" defaultValue={partner.website ?? ""} /></label>
        <label className="block"><span className="label">Logo URL</span><input className="input" name="logoUrl" defaultValue={partner.logoUrl ?? ""} /></label>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="block"><span className="label">Ville</span><input className="input" name="city" defaultValue={partner.city ?? ""} /></label>
        <label className="block"><span className="label">Pays (code 2)</span><input className="input" name="country" maxLength={2} defaultValue={partner.country ?? ""} placeholder="BF" /></label>
        <label className="block"><span className="label">Ordre</span><input className="input" name="sortOrder" type="number" defaultValue={partner.sortOrder} /></label>
      </div>
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onClose} className="btn btn-secondary" disabled={loading}>Annuler</button>
        <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? "..." : "Enregistrer"}</button>
      </div>
    </form>
  );
}
