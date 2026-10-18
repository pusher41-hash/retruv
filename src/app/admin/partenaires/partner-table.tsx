"use client";

import { useState } from "react";
import { AdminPartnerActions, AdminPartnerEditInline } from "@/components/admin-partner-actions";
import Link from "next/link";
import { Building2, GraduationCap, Train, Building, Hotel, Store, Landmark, Plane, Bus, ShieldCheck, Handshake, Briefcase, MapPin, ShoppingBag, Globe, Eye, EyeOff } from "lucide-react";
import type { LucideIcon } from "lucide-react";

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
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-slate-50 border border-slate-200">
          <Handshake className="h-7 w-7 text-slate-400" />
        </div>
        <h3 className="mt-4 text-base font-bold text-slate-800">Aucun partenaire configuré</h3>
        <p className="mt-1 text-sm text-slate-500 max-w-md mx-auto">Ajoutez un partenaire avec le bouton ci-dessus ou utilisez la fonction de peuplement automatique pour les 35 pays.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {partners.map((p) => {
        const Icon = iconMap[p.icon] ?? Building2;
        const isEditing = editingId === p.id;
        return (
          <div key={p.id} className="card overflow-hidden transition hover:border-slate-200">
            <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="flex gap-4 flex-1 min-w-0">
                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${p.isActive ? "bg-slate-50 border-slate-200" : "bg-slate-100 border-slate-200"}`}>
                  <Icon className={`h-5 w-5 ${p.isActive ? "text-slate-700" : "text-slate-400"}`} strokeWidth={1.75} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-bold text-slate-900">{p.title}</h3>
                    {p.isActive ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                        <Eye className="h-3 w-3" /> Actif
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">
                        <EyeOff className="h-3 w-3" /> Inactif
                      </span>
                    )}
                    <span className="text-xs text-slate-400">Ordre {p.sortOrder}</span>
                  </div>
                  <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">{p.description}</p>
                  <div className="mt-2.5 flex flex-wrap gap-2 text-xs">
                    {p.city ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2.5 py-1 font-medium text-slate-600 border border-slate-200">
                        <MapPin className="h-3 w-3" /> {p.city}{p.country ? ` · ${p.country}` : ""}
                      </span>
                    ) : null}
                    {p.website ? (
                      <Link href={p.website} target="_blank" className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 font-medium text-slate-600 border border-slate-200 hover:bg-slate-50">
                        <Globe className="h-3 w-3" /> Site web
                      </Link>
                    ) : null}
                    {p.logoUrl ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2.5 py-1 font-medium text-slate-500 border border-slate-200">
                        Logo disponible
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
              {isAdmin ? (
                <div className="flex flex-col gap-2 shrink-0">
                  <button type="button" onClick={() => setEditingId(isEditing ? null : p.id)} className={`inline-flex items-center justify-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${isEditing ? "border-slate-300 bg-slate-100 text-slate-700" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}>
                    {isEditing ? "Fermer" : "Modifier"}
                  </button>
                  <AdminPartnerActions id={p.id} isActive={p.isActive} />
                </div>
              ) : null}
            </div>
            {isEditing && isAdmin ? (
              <div className="border-t border-slate-100 p-4 bg-slate-50">
                <AdminPartnerEditInline partner={p} onClose={() => setEditingId(null)} />
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
