"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Alert, Field, PageHeader } from "@/components/ui";
import { TurnstileWidget } from "@/components/turnstile-widget";
import { COUNTRIES } from "@/lib/constants";

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName: fd.get("fullName"),
        phone: fd.get("phone"),
        email: fd.get("email") || "",
        password: fd.get("password"),
        city: fd.get("city"),
        country: fd.get("country"),
        turnstileToken: fd.get("cf-turnstile-response") || undefined,
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Inscription impossible");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="container-app py-8">
      <div className="mx-auto max-w-lg">
        <div className="mb-6 flex justify-center">
          <div className="relative flex h-14 w-14 items-center justify-center rounded-xl bg-retruv-navy text-2xl font-black text-white">
            R
            <span className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-retruv-teal ring-2 ring-white" />
          </div>
        </div>
        <PageHeader
          eyebrow="Compte"
          title="Créer un compte"
          description="Gratuit. Un numéro de téléphone suffit pour commencer."
        />
        <form onSubmit={onSubmit} className="card space-y-4 p-6">
          {error ? <Alert type="error">{error}</Alert> : null}
          <Field label="Nom complet">
            <input className="input" name="fullName" required minLength={2} />
          </Field>
          <Field label="Téléphone" hint="Format international recommandé, ex : +39, +33, +226...">
            <input
              className="input"
              name="phone"
              required
              placeholder="+39 320 000 0000"
            />
          </Field>
          <Field label="Email (optionnel)">
            <input className="input" name="email" type="email" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Pays">
              <select className="select" name="country" defaultValue="">
                <option value="" disabled>
                  Choisir un pays
                </option>
                {COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Ville" hint="Ex : Rome, Dakar, Toronto...">
              <input className="input" name="city" placeholder="Votre ville" />
            </Field>
          </div>
          <Field label="Mot de passe" hint="Minimum 6 caractères">
            <input
              className="input"
              name="password"
              type="password"
              required
              minLength={6}
            />
          </Field>
          <TurnstileWidget />
          <button className="btn btn-primary w-full" disabled={loading}>
            {loading ? "Création..." : "Créer mon compte"}
          </button>
          <p className="text-center text-sm text-slate-500">
            Déjà inscrit ?{" "}
            <Link href="/login" className="font-semibold text-retruv-blue">
              Se connecter
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
