"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AdminPointActions({
  id,
  isActive,
}: {
  id: string;
  isActive: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  async function toggleActive() {
    setLoading(true);
    setError("");
    const res = await fetch(`/api/admin/points/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !isActive }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Erreur");
      return;
    }
    router.refresh();
  }

  async function del() {
    setLoading(true);
    setError("");
    const res = await fetch(`/api/admin/points/${id}`, { method: "DELETE" });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Erreur");
      setConfirmingDelete(false);
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={toggleActive}
          disabled={loading}
          className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
        >
          {isActive ? "Désactiver" : "Activer"}
        </button>
        {confirmingDelete ? (
          <>
            <button
              type="button"
              onClick={() => setConfirmingDelete(false)}
              disabled={loading}
              className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={del}
              disabled={loading}
              className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100"
            >
              Confirmer
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmingDelete(true)}
            disabled={loading}
            className="rounded-lg border border-rose-200 px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50"
          >
            Supprimer
          </button>
        )}
      </div>
      {error ? <span className="text-xs text-rose-600">{error}</span> : null}
    </div>
  );
}
