"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ModerationActions({
  type,
  id,
}: {
  type: "lost" | "found";
  id: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showReject, setShowReject] = useState(false);
  const [reason, setReason] = useState("");

  async function act(action: "approve" | "reject") {
    setLoading(true);
    setError("");
    const res = await fetch("/api/admin/moderation", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, id, action, reason: reason || undefined }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Erreur");
      return;
    }
    router.refresh();
  }

  return (
    <div className="mt-3 space-y-2">
      {error ? <p className="text-xs font-semibold text-rose-600">{error}</p> : null}
      {!showReject ? (
        <div className="flex gap-2">
          <button
            type="button"
            disabled={loading}
            onClick={() => act("approve")}
            className="btn btn-primary flex-1"
          >
            {loading ? "..." : "Approuver et publier"}
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => setShowReject(true)}
            className="btn btn-danger flex-1"
          >
            Refuser
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <textarea
            className="textarea"
            placeholder="Raison du refus (envoyée au déclarant, optionnel)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={500}
          />
          <div className="flex gap-2">
            <button
              type="button"
              disabled={loading}
              onClick={() => act("reject")}
              className="btn btn-danger flex-1"
            >
              {loading ? "..." : "Confirmer le refus"}
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => setShowReject(false)}
              className="btn btn-secondary flex-1"
            >
              Annuler
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
