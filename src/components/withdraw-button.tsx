"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function WithdrawButton({ kind, id }: { kind: "lost" | "found"; id: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function withdraw() {
    setLoading(true);
    setError("");
    const res = await fetch(`/api/${kind}/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "withdraw" }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Erreur lors du retrait");
      return;
    }
    setConfirming(false);
    router.refresh();
  }

  if (confirming) {
    return (
      <div className="flex flex-col items-end gap-2">
        {error ? <p className="text-xs text-rose-600">{error}</p> : null}
        <p className="text-xs text-slate-500">Cette action est irréversible.</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setConfirming(false)}
            disabled={loading}
            className="btn btn-secondary text-sm"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={withdraw}
            disabled={loading}
            className="btn btn-danger text-sm"
          >
            {loading ? "Retrait..." : "Confirmer le retrait"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      className="text-sm font-semibold text-rose-600 hover:underline"
    >
      Retirer ma déclaration
    </button>
  );
}
