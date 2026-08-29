"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ArchiveExpiredButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  async function run() {
    setLoading(true);
    setMsg("");
    setError("");
    const res = await fetch("/api/admin/archive-expired", { method: "POST" });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Erreur");
      return;
    }
    const total = (data.lostArchived ?? 0) + (data.foundArchived ?? 0);
    setMsg(
      total > 0
        ? `${total} déclaration(s) archivée(s) (${data.lostArchived} perdues, ${data.foundArchived} trouvées).`
        : "Aucune déclaration expirée à archiver."
    );
    router.refresh();
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={run}
        disabled={loading}
        className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
      >
        {loading ? "Archivage..." : "Archiver les déclarations expirées"}
      </button>
      {msg ? <p className="text-xs text-emerald-600">{msg}</p> : null}
      {error ? <p className="text-xs text-rose-600">{error}</p> : null}
    </div>
  );
}
