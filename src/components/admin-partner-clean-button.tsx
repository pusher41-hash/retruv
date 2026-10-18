
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eraser, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";

export function AdminPartnerCleanButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function clean() {
    if (!confirm("Nettoyer tous les emojis enfantins des partenaires existants ?\n\nLes titres et descriptions seront épurés (ex: étoiles en fin de phrase supprimées). Aucune suppression, seulement un nettoyage.")) return;
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const res = await fetch("/api/admin/partners/clean", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur");
      setResult(data.message || `${data.cleaned} nettoyés`);
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
        onClick={clean}
        disabled={loading}
        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition disabled:opacity-50"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eraser className="h-4 w-4" />}
        {loading ? "Nettoyage..." : "Nettoyer les emojis"}
      </button>
      {result && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" /> {result}
        </div>
      )}
      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-800 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" /> {error}
        </div>
      )}
    </div>
  );
}
