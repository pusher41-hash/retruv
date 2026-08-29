"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Alert, PageHeader } from "@/components/ui";
import { KeyRound, Shield, Sparkles } from "lucide-react";

export default function QuickLoginClient() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function quickLogin(phone: string) {
    setLoading(true);
    setError("");
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, password: "retruv2026" }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Échec de connexion — essayez directement via /login");
    } else {
      router.push("/dashboard");
      router.refresh();
    }
  }

  return (
    <div className="container-app py-12">
      <PageHeader
        eyebrow="Accès rapide"
        title="Connexion forcée — Comptes démo"
        description="Si la page /login ne passe pas, utilisez ces boutons directs. Les comptes sont dans la base."
      />

      <div className="card p-6 max-w-xl mx-auto space-y-4">
        {error ? <Alert type="error">{error}</Alert> : null}
        <p className="text-sm text-slate-600 font-medium">Cliquez pour vous connecter immédiatement sans formulaire :</p>

        <div className="grid gap-3">
          <button
            onClick={() => quickLogin("+22670111111")}
            disabled={loading}
            className="btn btn-primary w-full text-base py-4"
          >
            <KeyRound className="h-5 w-5" />
            Aïcha (PASSEPORT perdu — Bobo) — +22670111111
          </button>
          <button
            onClick={() => quickLogin("+22670222222")}
            disabled={loading}
            className="btn btn-accent w-full text-base py-4"
          >
            <Sparkles className="h-5 w-5" />
            Moussa (Trouveur vérifié) — +22670222222
          </button>
          <button
            onClick={() => quickLogin("+22670000000")}
            disabled={loading}
            className="btn btn-secondary w-full text-base py-4"
          >
            <Shield className="h-5 w-5" />
            Admin — +22670000000
          </button>
        </div>

        <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-700 space-y-1 border border-slate-100">
          <p><strong>Mot de passe commun :</strong> <code className="bg-white px-1 rounded text-retruv-blue font-bold">retruv2026</code></p>
          <p><strong>Si ça ne marche pas :</strong> la route `/login` peut avoir un problème de cookie. Utilisez ce bouton.</p>
          <p><strong>Après connexion :</strong> allez sur <Link href="/dashboard" className="font-bold text-retruv-blue">/dashboard</Link> ou <Link href="/matches" className="font-bold text-retruv-blue">/matches</Link>.</p>
        </div>
      </div>
    </div>
  );
}
