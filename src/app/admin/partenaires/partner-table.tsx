"use client";

import { useState } from "react";
import { AdminPartnerActions, AdminPartnerEditInline } from "@/components/admin-partner-actions";
import Link from "next/link";
import { Building2, GraduationCap, Train, Building, Hotel, Store, Landmark, Plane, Bus, ShieldCheck, Handshake, Briefcase, MapPin, ShoppingBag } from "lucide-react";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
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
  createdAt: Date;
};

export function PartnerTable({ partners, isAdmin }: { partners: Partner[]; isAdmin: boolean }) {
  const [editingId, setEditingId] = useState<string | null>(null);

  if (partners.length === 0) {
    return <div className="card p-8 text-center text-slate-500 text-sm">Aucun partenaire configuré. Ajoutez le premier avec le bouton ci-dessus.</div>;
  }

  return (
    <div className="space-y-3">
      {partners.map((p) => {
        const Icon = iconMap[p.icon] ?? Building2;
        const isEditing = editingId === p.id;
        return (
          <div key={p.id} className="card overflow-hidden">
            <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="flex gap-4 flex-1 min-w-0">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sky-50">
                  <Icon className="h-6 w-6 text-retruv-blue" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-black text-retruv-navy">{p.title}</h3>
                    {p.isActive ? (
                      <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700">Actif</span>
                    ) : (
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-bold text-slate-600">Inactif</span>
                    )}
                    <span className="text-xs text-slate-400">Ordre: {p.sortOrder}</span>
                  </div>
                  <p className="mt-1 text-sm text-slate-600 leading-relaxed line-clamp-3">{p.description}</p>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                    {p.city ? <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2.5 py-1 border border-slate-200">📍 {p.city}{p.country ? ` · ${p.country}` : ""}</span> : null}
                    {p.website ? <Link href={p.website} target="_blank" className="underline hover:text-retruv-blue">🌐 {p.website.replace(/^https?:\/\//, "").slice(0, 32)}</Link> : null}
                    {p.logoUrl ? <span className="text-slate-400">🖼️ logo</span> : null}
                  </div>
                </div>
              </div>
              {isAdmin ? (
                <div className="flex flex-col gap-2 shrink-0">
                  <button type="button" onClick={() => setEditingId(isEditing ? null : p.id)} className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-700 hover:bg-sky-100">
                    {isEditing ? "Fermer" : "✏️ Modifier"}
                  </button>
                  <AdminPartnerActions id={p.id} isActive={p.isActive} />
                </div>
              ) : null}
            </div>
            {isEditing && isAdmin ? (
              <div className="border-t border-slate-100 p-4 bg-slate-50/40">
                <AdminPartnerEditInline partner={p} onClose={() => setEditingId(null)} />
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
