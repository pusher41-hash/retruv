"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Field } from "@/components/ui";
import { MessageCircle } from "lucide-react";

type Question = {
  id: string;
  question: string;
  type: string;
};

type RecoveryPoint = {
  id: string;
  name: string;
  city: string;
};

export function MatchActions({
  matchId,
  role,
  status,
  conversationId,
  recovery,
  existingQuestions,
  points,
  isPerson = false,
}: {
  matchId: string;
  role: string;
  status: string;
  conversationId: string | null;
  recovery: {
    id: string;
    status: string;
    method: string;
    ownerConfirmed: boolean;
    finderConfirmed: boolean;
    hasRestitutionCode: boolean;
  } | null;
  existingQuestions?: Question[];
  points: RecoveryPoint[];
  /** A person can't be "handed over" at a kiosk — swaps recovery-flow copy accordingly. */
  isPerson?: boolean;
}) {
  const router = useRouter();
  const [questions, setQuestions] = useState<Question[]>(existingQuestions ?? []);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [verifyScore, setVerifyScore] = useState<number | null>(null);
  const [restitutionCode, setRestitutionCode] = useState("");

  const canVerify =
    role === "owner" &&
    ["notified", "pending", "verifying"].includes(status);

  const canRecover =
    status === "verified" || status === "completed" || !!recovery;

  async function startOrSubmitVerification(e?: FormEvent) {
    e?.preventDefault();
    setLoading(true);
    setError("");
    setMsg("");

    const body =
      questions.length > 0 && Object.keys(answers).length > 0
        ? { answers }
        : {};

    const res = await fetch(`/api/matches/${matchId}/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Erreur de vérification");
      return;
    }

    if (data.verification?.questions) {
      setQuestions(data.verification.questions);
    }
    if (data.verification?.score != null) {
      setVerifyScore(data.verification.score);
    }
    setMsg(data.message || "OK");
    if (data.verification?.passed) {
      router.refresh();
    }
  }

  async function createRecovery(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/recoveries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        matchId,
        method: fd.get("method"),
        recoveryPointId: fd.get("recoveryPointId") || null,
        meetupLocation: fd.get("meetupLocation") || null,
        notes: fd.get("notes") || null,
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Erreur");
      return;
    }
    setMsg("Récupération organisée");
    router.refresh();
  }

  async function recoveryAction(action: "confirm" | "complete" | "cancel") {
    if (!recovery) return;
    setLoading(true);
    setError("");
    const res = await fetch("/api/recoveries", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recoveryId: recovery.id,
        action,
        code: action === "complete" ? restitutionCode.trim() || undefined : undefined,
        rating:
          action === "complete"
            ? { score: 5, comment: "Merci via RETRUV" }
            : undefined,
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Erreur");
      return;
    }
    setMsg("Mise à jour enregistrée");
    setRestitutionCode("");
    router.refresh();
  }

  const answerReady = useMemo(() => {
    if (questions.length === 0) return false;
    return questions.every((q) => (answers[q.id] || "").trim().length > 0);
  }, [questions, answers]);

  return (
    <div className="space-y-4">
      {error ? <Alert type="error">{error}</Alert> : null}
      {msg ? <Alert type="success">{msg}</Alert> : null}
      {verifyScore != null ? (
        <Alert type={verifyScore >= 70 ? "success" : "warning"}>
          Score de vérification : {verifyScore}%
        </Alert>
      ) : null}

      {canVerify ? (
        <div className="card p-5">
          <h3 className="font-bold text-retruv-navy">
            {isPerson ? "Vérification d'identité" : "Vérification de propriété"}
          </h3>
          <p className="mt-2 text-sm text-slate-600">
            {isPerson
              ? "Répondez aux questions pour confirmer qu'il s'agit bien de la personne recherchée. Les tentatives sont limitées anti-fraude."
              : "Répondez aux questions pour prouver que l'objet vous appartient. Les tentatives sont limitées anti-fraude."}
          </p>

          {questions.length === 0 ? (
            <button
              className="btn btn-primary mt-4 w-full"
              disabled={loading}
              onClick={() => startOrSubmitVerification()}
            >
              {loading ? "Chargement..." : "Commencer la vérification"}
            </button>
          ) : (
            <form onSubmit={startOrSubmitVerification} className="mt-4 space-y-3">
              {questions.map((q) => (
                <Field key={q.id} label={q.question}>
                  <input
                    className="input"
                    value={answers[q.id] || ""}
                    onChange={(e) =>
                      setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))
                    }
                    type={q.type === "date" ? "date" : "text"}
                    required
                  />
                </Field>
              ))}
              <button
                className="btn btn-primary w-full"
                disabled={loading || !answerReady}
              >
                {loading ? "Analyse..." : "Soumettre mes réponses"}
              </button>
            </form>
          )}
        </div>
      ) : null}

      {role === "finder" && ["notified", "pending", "verifying"].includes(status) ? (
        <Alert type="info">
          En attente de la vérification du propriétaire potentiel. Vous serez
          notifié.
        </Alert>
      ) : null}

      {conversationId ? (
        <a href={`/messages/${conversationId}`} className="btn btn-secondary w-full">
          <MessageCircle className="h-4 w-4" />
          Ouvrir la messagerie sécurisée
        </a>
      ) : null}

      {canRecover && !recovery ? (
        <form onSubmit={createRecovery} className="card space-y-3 p-5">
          <h3 className="font-bold text-retruv-navy">
            {isPerson ? "Organiser les retrouvailles" : "Organiser la récupération"}
          </h3>
          <Field label="Méthode">
            <select
              className="select"
              name="method"
              defaultValue={isPerson ? "authority" : "recovery_point"}
            >
              <option value="direct_meetup">
                {isPerson ? "Retrouvailles directes" : "Rencontre directe"}
              </option>
              {!isPerson ? <option value="recovery_point">Point RETRUV</option> : null}
              <option value="authority">Via autorité{isPerson ? " (recommandé)" : ""}</option>
              {!isPerson ? <option value="delivery">Livraison (bientôt)</option> : null}
            </select>
          </Field>
          {!isPerson ? (
            <Field label="Point RETRUV">
              <select className="select" name="recoveryPointId" defaultValue="">
                <option value="">—</option>
                {points.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.city})
                  </option>
                ))}
              </select>
            </Field>
          ) : null}
          <Field label={isPerson ? "Lieu des retrouvailles (si rencontre)" : "Lieu de rendez-vous (si rencontre)"}>
            <input className="input" name="meetupLocation" />
          </Field>
          <Field label="Notes">
            <textarea className="textarea" name="notes" />
          </Field>
          <button className="btn btn-accent w-full" disabled={loading}>
            {isPerson ? "Proposer les retrouvailles" : "Proposer la récupération"}
          </button>
        </form>
      ) : null}

      {recovery ? (
        <div className="card space-y-3 p-5">
          <h3 className="font-bold text-retruv-navy">
            {isPerson ? "Retrouvailles" : "Récupération"}
          </h3>
          <p className="text-sm text-slate-600">
            Méthode : <strong>{recovery.method}</strong> · Statut :{" "}
            <strong>{recovery.status}</strong>
          </p>
          <p className="text-xs text-slate-500">
            {isPerson ? "Déclarant" : "Owner"} confirmé : {recovery.ownerConfirmed ? "oui" : "non"} ·{" "}
            {isPerson ? "Personne ayant signalé" : "Finder"} confirmé :{" "}
            {recovery.finderConfirmed ? "oui" : "non"}
          </p>
          <div className="grid gap-2">
            {recovery.status !== "completed" && recovery.status !== "cancelled" ? (
              <>
                <button
                  className="btn btn-secondary"
                  disabled={loading}
                  onClick={() => recoveryAction("confirm")}
                >
                  Confirmer ma participation
                </button>

                {recovery.hasRestitutionCode ? (
                  <Field
                    label={
                      isPerson
                        ? "Code de confirmation (reçu par notification)"
                        : "Code de restitution (reçu par notification)"
                    }
                  >
                    <input
                      className="input"
                      value={restitutionCode}
                      onChange={(e) => setRestitutionCode(e.target.value)}
                      maxLength={6}
                      placeholder="Ex : 7K3PXQ"
                    />
                  </Field>
                ) : (
                  <p className="text-xs text-slate-500">
                    {isPerson
                      ? "Un code de confirmation vous sera envoyé par notification dès que les retrouvailles pourront être confirmées."
                      : "Un code de restitution vous sera envoyé par notification dès que la remise pourra être confirmée."}
                  </p>
                )}
                <button
                  className="btn btn-primary"
                  disabled={loading}
                  onClick={() => recoveryAction("complete")}
                >
                  {isPerson ? "Confirmer les retrouvailles" : "Confirmer la restitution"}
                </button>
                <button
                  className="btn btn-danger"
                  disabled={loading}
                  onClick={() => recoveryAction("cancel")}
                >
                  Annuler
                </button>
              </>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
