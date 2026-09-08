"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Alert, Field, PageHeader } from "@/components/ui";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phone: fd.get("phone"),
        password: fd.get("password"),
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Connexion impossible");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="container-app py-8">
      <div className="mx-auto max-w-md">
        <div className="mb-6 flex justify-center">
          <div className="relative flex h-14 w-14 items-center justify-center rounded-xl bg-retruv-navy text-2xl font-black text-white">
            R
            <span className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-retruv-teal ring-2 ring-white" />
          </div>
        </div>
        <PageHeader
          eyebrow="Compte"
          title="Connexion"
          description="Connectez-vous avec votre numéro de téléphone."
        />
        <form onSubmit={onSubmit} className="card space-y-4 p-6">
          {error ? <Alert type="error">{error}</Alert> : null}
          <Field label="Téléphone" hint="Format international, ex : +39, +33, +226...">
            <input
              className="input"
              name="phone"
              required
              placeholder="+39 320 000 0000"
              autoComplete="tel"
            />
          </Field>
          <Field label="Mot de passe">
            <input
              className="input"
              name="password"
              type="password"
              required
              autoComplete="current-password"
            />
          </Field>
          <button className="btn btn-primary w-full" disabled={loading}>
            {loading ? "Connexion..." : "Se connecter"}
          </button>
          <p className="text-center text-sm text-slate-500">
            Pas de compte ?{" "}
            <Link href="/register" className="font-semibold text-retruv-blue">
              S&apos;inscrire
            </Link>
          </p>
        </form>
        {process.env.NODE_ENV !== "production" ? (
          <div className="card mt-4 p-4 text-sm text-slate-600">
            <p className="font-bold text-slate-800">Comptes démo</p>
            <ul className="mt-2 space-y-1 text-xs">
              <li>Admin : +22670000000 / retruv2026</li>
              <li>Aïcha (passeport perdu) : +22670111111 / retruv2026</li>
              <li>Moussa (trouveur) : +22670222222 / retruv2026</li>
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  );
}
