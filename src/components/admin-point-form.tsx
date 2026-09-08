"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Field } from "@/components/ui";
import { COUNTRIES } from "@/lib/constants";

const POINT_TYPES = ["gare", "mairie", "commissariat", "universite", "autre"] as const;

export function AdminAddPointForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    const payload = {
      name: fd.get("name"),
      type: fd.get("type"),
      address: fd.get("address"),
      city: fd.get("city"),
      country: fd.get("country"),
      phone: fd.get("phone") || null,
      email: fd.get("email") || null,
      hours: fd.get("hours") || null,
      managerName: fd.get("managerName") || null,
    };
    const res = await fetch("/api/admin/points", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Erreur lors de la création");
      return;
    }
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="btn btn-primary">
        + Ajouter un point
      </button>
    );
  }

  return (
    <form onSubmit={onSubmit} className="card space-y-4 p-5">
      {error ? <Alert type="error">{error}</Alert> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nom">
          <input className="input" name="name" required placeholder="RETRUV POINT — Gare de Turin" />
        </Field>
        <Field label="Type">
          <select className="select" name="type" required defaultValue="gare">
            {POINT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="Adresse">
        <input className="input" name="address" required placeholder="Piazza dei Cinquecento" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Ville">
          <input className="input" name="city" required placeholder="Turin" />
        </Field>
        <Field label="Pays">
          <select className="select" name="country" required defaultValue="">
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
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Téléphone (optionnel)">
          <input className="input" name="phone" placeholder="+39..." />
        </Field>
        <Field label="Email (optionnel)">
          <input className="input" name="email" type="email" />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Horaires (optionnel)">
          <input className="input" name="hours" placeholder="Lun–Sam 8h–18h" />
        </Field>
        <Field label="Responsable (optionnel)">
          <input className="input" name="managerName" />
        </Field>
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={() => setOpen(false)} className="btn btn-secondary" disabled={loading}>
          Annuler
        </button>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? "Création..." : "Créer le point"}
        </button>
      </div>
    </form>
  );
}
