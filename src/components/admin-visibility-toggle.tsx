"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function AdminVisibilityToggle({
  kind,
  id,
  currentlyHidden,
}: {
  kind: "lost" | "found";
  id: string;
  currentlyHidden: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function toggle() {
    setLoading(true);
    setError("");
    const res = await fetch(`/api/${kind}/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: currentlyHidden ? "show" : "hide" }),
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
    <div className="flex items-center gap-2">
      <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-slate-700">
        <input
          type="checkbox"
          checked={currentlyHidden}
          onChange={toggle}
          disabled={loading}
          className="h-4 w-4 accent-retruv-blue"
        />
        Masquer cette déclaration au public
      </label>
      {error ? <span className="text-xs text-rose-600">{error}</span> : null}
    </div>
  );
}
