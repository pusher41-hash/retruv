"use client";

import { useState } from "react";
import { AdminPartnerActions, AdminPartnerEditInline } from "@/components/admin-partner-actions";
import Link from "next/link";
import { Building2, GraduationCap, Train, Building, Hotel, Store, Landmark, Plane, Bus, ShieldCheck, Handshake, Briefcase, MapPin, ShoppingBag, Sparkles, Globe, Eye, EyeOff, Trophy, type LucideIcon } from "lucide-react";

const iconMap: Record<string, LucideIcon> = {
  Train,
  GraduationCap,
  Building2,
  Building,
  Hotel,
  Store,
  Landmark,
  Plane,
  Bus,
  ShieldCheck,
  Handshake,
  Briefcase,
  MapPin,
  ShoppingBag,
};

type Partner = {
  id: string;
  title: string;
  description: string;
  icon: string;
  website: string | null;
  logoUrl: string | null;
  city: string | null;
  country: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: string | Date;
};

export function PartnerTable({ partners, isAdmin }: { partners: Partner[]; isAdmin: boolean }) {
  const [editingId, setEditingId] = useState<string | null>(null);

  if (partners.length === 0) {
    return (
      <div className="card p-10 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-50 to-blue-50 border border-sky-100">
          <Sparkles className="h-8 w-8 text-retruv-blue" />
        </div>
        <h3 className="mt-4 text-lg font-black text-retruv-navy">✨ Aucun partenaire pour l'instant</h3>
        <p className="mt-1 text-sm text-slate-500 max-w-md mx-auto">Clique sur <span className="font-bold text-retruv-blue">✨ Ajouter un partenaire</span> ci-dessus pour créer le premier. Il apparaîtra instantanément sur la page publique <span className="font-mono text-xs bg-slate-50 px-1.5 py-0.5 rounded border">/partenaires</span> 🌍</p>
        <div className="mt-4 flex justify-center gap-2 text-xs text-slate-400">
          <span className="inline-flex items-center gap-1">🚆 Transport</span>
          <span>•</span>
          <span className="inline-flex items-center gap-1">🎓 Campus</span>
          <span>•</span>
          <span className="inline-flex items-center gap-1">🏢 Commerce</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {partners.map((p, idx) => {
        const Icon = iconMap[p.icon] ?? Building2;
        const isEditing = editingId === p.id;
        const isTop = idx === 0;
        return (
          <div key={p.id} className={`card overflow-hidden transition-all hover:shadow-lg hover:border-sky-200 ${isTop ? "ring-2 ring-amber-100 border-amber-200" : ""}`}>
            {isTop && (
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-100 px-4 py-1.5 flex items-center gap-2 text-xs font-bold text-amber-800">
                <Trophy className="h-3.5 w-3.5" /> 🏆 Partenaire mis en avant (ordre 0) — premier sur la page publique
              </div>
            )}
            <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="flex gap-4 flex-1 min-w-0">
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-sm border ${p.isActive ? "bg-gradient-to-br from-sky-50 to-blue-50 border-sky-100" : "bg-slate-50 border-slate-200"}`}>
                  <Icon className={`h-6 w-6 ${p.isActive ? "text-retruv-blue" : "text-slate-400"}`} strokeWidth={2} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-black text-retruv-navy flex items-center gap-2">
                      <span>{p.title}</span>
                      {isTop && <span className="text-sm">⭐</span>}
                    </h3>
                    {p.isActive ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                        <Eye className="h-3 w-3" /> ✅ Actif
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-500">
                        <EyeOff className="h-3 w-3" /> 😴 Inactif
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-400 bg-slate-50 px-2 py-1 rounded-full border border-slate-200">
                      🔢 Ordre: <span className="font-black text-slate-700">{p.sortOrder}</span>
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-600 leading-relaxed">{p.description}</p>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    {p.city ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-sky-50 to-blue-50 px-3 py-1.5 font-bold text-sky-700 border border-sky-200">
                        📍 {p.city}{p.country ? ` · ${p.country} 🌍` : ""}
                      </span>
                    ) : null}
                    {p.website ? (
                      <Link href={p.website} target="_blank" className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 font-bold text-sky-700 border border-sky-200 hover:bg-sky-50">
                        <Globe className="h-3 w-3" /> 🌐 Site web
                      </Link>
                    ) : null}
                    {p.logoUrl ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-3 py-1.5 font-bold text-violet-700 border border-violet-200">
                        🖼️ Logo disponible
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
              {isAdmin ? (
                <div className="flex flex-col gap-2 shrink-0">
                  <button type="button" onClick={() => setEditingId(isEditing ? null : p.id)} className={`inline-flex items-center justify-center gap-1.5 rounded-xl border px-4 py-2 text-xs font-black transition ${isEditing ? "border-amber-200 bg-amber-50 text-amber-700" : "border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100"}`}>
                    {isEditing ? <><X className="h-3.5 w-3.5" /> Fermer</> : <>✏️ Modifier</>}
                  </button>
                  <AdminPartnerActions id={p.id} isActive={p.isActive} />
                </div>
              ) : null}
            </div>
            {isEditing && isAdmin ? (
              <div className="border-t border-slate-100 p-4 bg-gradient-to-br from-slate-50 to-white">
                <AdminPartnerEditInline partner={p} onClose={() => setEditingId(null)} />
              </div>
            ) : null}
          </div>
        );
      })}
      <div className="text-center pt-2">
        <p className="text-xs text-slate-400">💡 Astuce du jour — Les partenaires <span className="font-bold text-emerald-600">✅ Actifs</span> sont visibles sur <Link href="/partenaires" className="underline font-bold text-retruv-blue hover:text-retruv-navy">/partenaires</Link> 🌍✨</p>
      </div>
    </div>
  );
}

function X({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M18 6L6 18M6 6l12 12" /></svg>;
}
