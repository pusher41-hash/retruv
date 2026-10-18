"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Globe2, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";

export function AdminPartnerSeedButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function seed() {
    if (!confirm("Peupler la base avec les partenaires officiels mondiaux (police, campus, transport) pour les 36 pays ?\n\nCela va créer 111 partenaires. Les doublons seront ignorés.")) {
      return;
    }
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const res = await fetch("/api/admin/partners/seed", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur");
      setResult(data.message || `${data.inserted} ajoutés, ${data.skipped} déjà présents`);
      router.refresh();
      setTimeout(() => router.refresh(), 1000);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={seed}
        disabled={loading}
        className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 transition disabled:opacity-50"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Globe2 className="h-4 w-4" />}
        {loading ? "Peuplement en cours..." : "Peupler les 36 pays officiels"}
      </button>
      {result && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" /> {result}
        </div>
      )}
      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-800 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" /> {error}
        </div>
      )}
      <p className="text-xs text-slate-500">Un clic ajoute 111 partenaires officiels pour les 36 pays RETRUV.</p>
    </div>
  );
}
