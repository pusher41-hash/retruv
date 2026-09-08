"use client";

import { useState } from "react";

export function AdminResetPasswordButton({ userId }: { userId: string }) {
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [tempPassword, setTempPassword] = useState<string | null>(null);

  async function reset() {
    setLoading(true);
    setError("");
    const res = await fetch(`/api/admin/users/${userId}/reset-password`, {
      method: "POST",
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Erreur lors de la réinitialisation");
      return;
    }
    setConfirming(false);
    setTempPassword(data.temporaryPassword);
  }

  if (tempPassword) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm">
        <p className="font-bold text-emerald-900">Nouveau mot de passe temporaire :</p>
        <p className="mt-1 select-all font-mono text-base font-bold text-emerald-900">
          {tempPassword}
        </p>
        <p className="mt-1 text-xs text-emerald-800">
          Affiché une seule fois — transmettez-le à l&apos;utilisateur par un canal de confiance.
        </p>
      </div>
    );
  }

  if (confirming) {
    return (
      <div className="flex flex-col items-start gap-2">
        {error ? <p className="text-xs text-rose-600">{error}</p> : null}
        <p className="text-xs text-slate-500">
          Génère un nouveau mot de passe et invalide l&apos;ancien immédiatement.
        </p>
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
            onClick={reset}
            disabled={loading}
            className="btn btn-danger text-sm"
          >
            {loading ? "..." : "Confirmer la réinitialisation"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      className="text-sm font-semibold text-retruv-blue hover:underline"
    >
      Réinitialiser le mot de passe
    </button>
  );
}
