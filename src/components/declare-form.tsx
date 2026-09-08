"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Alert, Field } from "@/components/ui";
import { TurnstileWidget } from "@/components/turnstile-widget";
import { CategoryIcon } from "@/lib/category-icons";
import { COLORS, ITEM_CONDITIONS } from "@/lib/constants";
import { getCategoryFieldConfig } from "@/lib/category-fields";
import { Loader2 } from "lucide-react";

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-400">
      {children}
    </p>
  );
}

type Cat = {
  id: string;
  slug: string;
  nameFr: string;
  icon: string;
  isSensitive: boolean;
  parentId: string | null;
  children?: Cat[];
};

export function DeclareForm({ mode }: { mode: "lost" | "found" }) {
  const router = useRouter();
  const [tree, setTree] = useState<Cat[]>([]);
  const [parentId, setParentId] = useState("");
  const [subId, setSubId] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [points, setPoints] = useState<{ id: string; name: string; city: string }[]>([]);
  const [photos, setPhotos] = useState<{ id: string; previewUrl: string }[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const MAX_PHOTOS = 4;

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((d) => setTree(d.categories ?? []));
    if (mode === "found") {
      fetch("/api/points")
        .then((r) => r.json())
        .then((d) => setPoints(d.points ?? []));
    }
  }, [mode]);

  async function handlePhotoSelect(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    const room = MAX_PHOTOS - photos.length;
    if (room <= 0) return;
    setPhotoError("");
    setUploadingPhoto(true);

    for (const file of files.slice(0, room)) {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        setPhotoError(data.error || "Échec de l'envoi de la photo");
        continue;
      }
      setPhotos((prev) => [
        ...prev,
        { id: data.photoId, previewUrl: URL.createObjectURL(file) },
      ]);
    }
    setUploadingPhoto(false);
  }

  function removePhoto(id: string) {
    setPhotos((prev) => prev.filter((p) => p.id !== id));
  }

  const children = useMemo(() => {
    return tree.find((t) => t.id === parentId)?.children ?? [];
  }, [tree, parentId]);

  const selectedSub = children.find((c) => c.id === subId);
  const selectedParent = tree.find((t) => t.id === parentId);
  const sensitive = !!selectedParent?.isSensitive || !!selectedSub?.isSensitive;

  // The whole point of this component: the form reshapes itself around
  // whatever category/subcategory is selected, instead of asking every
  // declarer the same "marque / modèle / N° de série" regardless of
  // whether they're reporting a bicycle or a missing child.
  const fieldConfig = useMemo(
    () => getCategoryFieldConfig(selectedParent?.slug, selectedSub?.slug),
    [selectedParent, selectedSub]
  );

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    const fd = new FormData(e.currentTarget);

    const details: Record<string, string> = {};
    for (const f of fieldConfig.extraFields) {
      const value = fd.get(`detail_${f.key}`);
      if (value) details[f.key] = String(value);
    }

    const payload: Record<string, unknown> = {
      categoryId: parentId,
      subcategoryId: subId || null,
      title: fd.get("title"),
      description: fd.get("description"),
      brand: fieldConfig.showBrand ? fd.get("brand") || null : null,
      model: fieldConfig.showModel ? fd.get("model") || null : null,
      color: fieldConfig.showColor ? fd.get("color") || null : null,
      distinctiveFeatures: fd.get("distinctiveFeatures") || null,
      serialPartial: fieldConfig.showSerial ? fd.get("serialPartial") || null : null,
      // Sent once, in full — the server encrypts it and derives the public
      // masked display value; never displayed anywhere after this.
      idFull: fieldConfig.showIdPartial ? fd.get("idFull") || null : null,
      details: Object.keys(details).length ? details : undefined,
      city: fd.get("city"),
      district: fd.get("district") || null,
      locationApprox: fd.get("locationApprox") || null,
      // No country field: the server derives it from the declarer's own
      // profile (see /api/lost, /api/found) — RETRUV is worldwide, so
      // there's no single default country to hardcode here.
      photoIds: photos.length ? photos.map((p) => p.id) : undefined,
      turnstileToken: fd.get("cf-turnstile-response") || undefined,
    };

    if (mode === "lost") {
      payload.lostDate = fd.get("eventDate") || null;
      payload.lostTimeApprox = fd.get("eventTime") || null;
      payload.rewardAmount =
        fieldConfig.showReward && fd.get("rewardAmount")
          ? Number(fd.get("rewardAmount"))
          : null;
      payload.privateNotes = fd.get("privateNotes") || null;
    } else {
      payload.foundDate = fd.get("eventDate") || null;
      payload.foundTimeApprox = fd.get("eventTime") || null;
      payload.condition = fieldConfig.showCondition ? fd.get("condition") || null : null;
      payload.recoveryPointId = fieldConfig.showRecoveryPoint
        ? fd.get("recoveryPointId") || null
        : null;
    }

    const res = await fetch(mode === "lost" ? "/api/lost" : "/api/found", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    setLoading(false);

    if (res.status === 401) {
      setError("Connectez-vous pour déclarer un objet.");
      router.push("/login");
      return;
    }
    if (!res.ok) {
      setError(data.error || "Erreur lors de l'enregistrement");
      return;
    }

    if (data.pendingModeration) {
      setSuccess(
        "Déclaration enregistrée. Elle sera vérifiée par notre équipe avant publication publique — généralement sous quelques heures, pour la sécurité de la personne concernée."
      );
      setTimeout(() => {
        router.push("/dashboard");
        router.refresh();
      }, 1800);
      return;
    }

    const matchesFound = data.matchesFound ?? 0;
    setSuccess(
      matchesFound > 0
        ? `Déclaration enregistrée. ${matchesFound} correspondance(s) détectée(s) !`
        : "Déclaration enregistrée. RETRUV surveille les nouvelles correspondances."
    );
    setTimeout(() => {
      router.push(matchesFound > 0 ? "/matches" : "/dashboard");
      router.refresh();
    }, 1200);
  }

  return (
    <form onSubmit={onSubmit} className="card space-y-6 p-5 sm:p-6">
      <AnimatePresence mode="popLayout">
        {error ? (
          <motion.div key="err" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <Alert type="error">{error}</Alert>
          </motion.div>
        ) : null}
        {success ? (
          <motion.div key="ok" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <Alert type="success">{success}</Alert>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {fieldConfig.safetyNotice ? (
        <Alert type="error">
          <strong>Avant toute chose :</strong> {fieldConfig.safetyNotice}
        </Alert>
      ) : sensitive ? (
        <Alert type="warning">
          Catégorie sensible détectée. Les numéros complets, photos lisibles et
          données personnelles ne seront jamais affichés publiquement. Utilisez
          uniquement des identifiants partiellement masqués (ex : {fieldConfig.idPartialPlaceholder}).
        </Alert>
      ) : null}

      <div className="space-y-3">
        <SectionTitle>Que souhaitez-vous déclarer ?</SectionTitle>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {tree.map((c) => {
            const isSelected = c.id === parentId;
            return (
              <button
                key={c.id}
                type="button"
                aria-pressed={isSelected}
                onClick={() => {
                  setParentId(c.id);
                  setSubId("");
                }}
                className={`flex flex-col items-center gap-1.5 rounded-lg border-1.5 p-3 text-center transition ${
                  isSelected
                    ? "border-retruv-blue bg-sky-50 text-retruv-blue shadow-xs"
                    : "border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                }`}
                style={{ borderWidth: "1.5px" }}
              >
                <CategoryIcon slug={c.slug} className="h-6 w-6" />
                <span className="text-xs font-semibold leading-tight">{c.nameFr}</span>
              </button>
            );
          })}
        </div>

        {parentId && children.length > 0 ? (
          <Field label="Sous-catégorie (optionnel)">
            <select
              className="select"
              value={subId}
              onChange={(e) => setSubId(e.target.value)}
            >
              <option value="">Optionnel</option>
              {children.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nameFr}
                </option>
              ))}
            </select>
          </Field>
        ) : null}
      </div>

      <SectionTitle>Description</SectionTitle>
      <Field label="Titre court">
        <input
          className="input"
          name="title"
          required
          placeholder={
            mode === "lost"
              ? fieldConfig.titlePlaceholderLost
              : fieldConfig.titlePlaceholderFound
          }
        />
      </Field>

      <Field
        label="Description"
        hint="Décrivez sans coller de numéros complets ni d'adresse personnelle."
      >
        <textarea
          className="textarea"
          name="description"
          required
          minLength={10}
          placeholder="Couleur, état, circonstances..."
        />
      </Field>

      {fieldConfig.showBrand || fieldConfig.showModel || fieldConfig.showColor ? (
        <div className="grid gap-4 sm:grid-cols-3">
          {fieldConfig.showBrand ? (
            <Field label="Marque">
              <input className="input" name="brand" placeholder={fieldConfig.brandPlaceholder} />
            </Field>
          ) : null}
          {fieldConfig.showModel ? (
            <Field label="Modèle">
              <input className="input" name="model" placeholder={fieldConfig.modelPlaceholder} />
            </Field>
          ) : null}
          {fieldConfig.showColor ? (
            <Field label="Couleur">
              <select className="select" name="color" defaultValue="">
                <option value="">—</option>
                {COLORS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </Field>
          ) : null}
        </div>
      ) : null}

      {fieldConfig.extraFields.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {fieldConfig.extraFields.map((f) => (
            <Field key={f.key} label={f.label} hint={f.hint}>
              {f.type === "select" ? (
                <select className="select" name={`detail_${f.key}`} defaultValue="">
                  <option value="">—</option>
                  {(f.options ?? []).map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  className="input"
                  name={`detail_${f.key}`}
                  type={f.type === "number" ? "number" : "text"}
                  placeholder={f.placeholder}
                />
              )}
            </Field>
          ))}
        </div>
      ) : null}

      <Field label={fieldConfig.distinctiveLabel} hint={fieldConfig.distinctiveHint}>
        <textarea
          className="textarea"
          name="distinctiveFeatures"
          maxLength={1000}
          placeholder={fieldConfig.distinctivePlaceholder}
        />
      </Field>

      {fieldConfig.showSerial || fieldConfig.showIdPartial ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {fieldConfig.showSerial ? (
            <Field label={fieldConfig.serialLabel} hint={fieldConfig.serialHint}>
              <input className="input" name="serialPartial" placeholder={fieldConfig.serialPlaceholder} />
            </Field>
          ) : null}
          {fieldConfig.showIdPartial ? (
            <Field label={fieldConfig.idPartialLabel} hint={fieldConfig.idPartialHint}>
              <input
                className="input"
                name="idFull"
                autoComplete="off"
                placeholder={fieldConfig.idPartialPlaceholder}
              />
            </Field>
          ) : null}
        </div>
      ) : null}

      <SectionTitle>Lieu &amp; date</SectionTitle>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label={mode === "lost" ? fieldConfig.eventDateLabelLost : fieldConfig.eventDateLabelFound}
        >
          <input className="input" type="date" name="eventDate" />
        </Field>
        <Field label="Heure approx.">
          <input
            className="input"
            name="eventTime"
            placeholder="14h00"
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={fieldConfig.cityLabel}>
          <input
            className="input"
            name="city"
            required
            placeholder="Ex : Rome, Milan, Lyon..."
          />
        </Field>
        <Field label="Quartier">
          <input className="input" name="district" placeholder="Ex : Trastevere, Centro..." />
        </Field>
      </div>

      <Field label="Lieu approximatif">
        <input
          className="input"
          name="locationApprox"
          placeholder="Marché central, gare, arrêt de bus..."
        />
      </Field>

      {mode === "lost" ? (
        <>
          {fieldConfig.showReward ? (
            <Field
              label="Récompense (optionnel)"
              hint="Dans votre devise locale. Jamais obligatoire."
            >
              <input
                className="input"
                name="rewardAmount"
                type="number"
                min={0}
                step={500}
                placeholder="0"
              />
            </Field>
          ) : null}
          <Field
            label="Notes privées (non publiées)"
            hint="Réservées à la vérification."
          >
            <textarea className="textarea" name="privateNotes" />
          </Field>
        </>
      ) : (
        <>
          {fieldConfig.showCondition ? (
            <Field label="État de l'objet">
              <select className="select" name="condition" defaultValue="Bon">
                {ITEM_CONDITIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </Field>
          ) : null}
          {fieldConfig.showRecoveryPoint ? (
            <Field label="Déposer dans un Point RETRUV (optionnel)">
              <select className="select" name="recoveryPointId" defaultValue="">
                <option value="">Non, je garde l&apos;objet</option>
                {points.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {p.city}
                  </option>
                ))}
              </select>
            </Field>
          ) : null}
        </>
      )}

      <SectionTitle>Photos</SectionTitle>
      <Field
        label="Photos (optionnel)"
        hint={
          fieldConfig.safetyNotice
            ? "Une photo claire du visage aide énormément une recherche — elle sera visible publiquement, contrairement aux documents sensibles."
            : sensitive && fieldConfig.blurSensitivePhotos
              ? "Les photos de documents sensibles sont automatiquement floutées avant publication."
              : "3-4 photos aident au matching et à la vérification."
        }
      >
        <input
          className="input"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          disabled={uploadingPhoto || photos.length >= MAX_PHOTOS}
          onChange={handlePhotoSelect}
        />
        {photoError ? (
          <p className="mt-1 text-xs text-rose-600">{photoError}</p>
        ) : null}
        {photos.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-2">
            {photos.map((p) => (
              <div key={p.id} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.previewUrl}
                  alt=""
                  className="h-16 w-16 rounded-lg object-cover"
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    removePhoto(p.id);
                  }}
                  className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-slate-800 text-xs text-white"
                  aria-label="Retirer la photo"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        ) : null}
      </Field>

      <TurnstileWidget />

      <button className="btn btn-primary w-full" disabled={loading || !parentId || uploadingPhoto}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {loading
          ? "Enregistrement & analyse..."
          : mode === "lost"
            ? fieldConfig.safetyNotice
              ? "Publier ma déclaration de disparition"
              : "Publier ma déclaration de perte"
            : fieldConfig.safetyNotice
              ? "Publier mon signalement"
              : "Publier ma déclaration de trouvaille"}
      </button>
    </form>
  );
}
