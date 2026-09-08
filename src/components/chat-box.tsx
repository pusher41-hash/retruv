"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { formatRelative } from "@/lib/utils";

type Msg = {
  id: string;
  content: string;
  isMine: boolean;
  isSystem?: boolean;
  createdAt: string;
};

export function ChatBox({ conversationId }: { conversationId: string }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [otherName, setOtherName] = useState("Contact");
  const [phone, setPhone] = useState<string | undefined>();
  const [text, setText] = useState("");
  const [sharePhone, setSharePhone] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [blockedByMe, setBlockedByMe] = useState(false);
  const [blockedByOther, setBlockedByOther] = useState(false);
  const [confirmingBlock, setConfirmingBlock] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  async function load(signal?: AbortSignal) {
    try {
      const res = await fetch(`/api/messages/${conversationId}`, { signal });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Impossible de charger");
        return;
      }
      setMessages(data.messages ?? []);
      setOtherName(data.otherUser?.name ?? "Contact");
      setPhone(data.otherUser?.phone);
      setIsActive(data.conversation?.isActive ?? true);
      setBlockedByMe(data.conversation?.blockedByMe ?? false);
      setBlockedByOther(data.conversation?.blockedByOther ?? false);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setError("Impossible de charger");
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    // The state updates inside load() happen after its `await fetch`, not
    // synchronously in this effect body — the standard fetch-on-mount +
    // poll pattern React's own docs endorse. Flagged anyway by this rule's
    // static analysis, which can't see past the await.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load(controller.signal);
    const t = setInterval(() => load(controller.signal), 5000);
    return () => {
      clearInterval(t);
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const canSend = isActive && !blockedByMe && !blockedByOther;

  async function send(e: FormEvent) {
    e.preventDefault();
    if (!text.trim() || !canSend) return;
    setLoading(true);
    setError("");
    const res = await fetch(`/api/messages/${conversationId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: text, sharePhone }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Envoi impossible");
      return;
    }
    setText("");
    setSharePhone(false);
    await load();
  }

  async function toggleBlock() {
    // Blocking needs a confirmation step first — unblocking doesn't, it's
    // the reversible direction.
    if (!blockedByMe && !confirmingBlock) {
      setConfirmingBlock(true);
      return;
    }
    setConfirmingBlock(false);
    setLoading(true);
    setError("");
    const res = await fetch(`/api/messages/${conversationId}/block`, {
      method: blockedByMe ? "DELETE" : "POST",
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Erreur");
      return;
    }
    setBlockedByMe(data.blocked);
  }

  return (
    <div className="card flex h-[70vh] flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-retruv-navy text-sm font-black text-white">
            {otherName.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-bold text-retruv-navy">{otherName}</p>
            <p className="text-xs text-slate-500">
              Messagerie interne sécurisée
              {phone ? ` · ${phone}` : " · numéros masqués"}
            </p>
          </div>
        </div>
        {confirmingBlock ? (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setConfirmingBlock(false)}
              disabled={loading}
              className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={toggleBlock}
              disabled={loading}
              className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100"
            >
              Confirmer
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={toggleBlock}
            disabled={loading}
            className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
          >
            {blockedByMe ? "Débloquer" : "Bloquer"}
          </button>
        )}
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50/70 p-4">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex ${m.isMine ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] px-3 py-2 text-sm shadow-sm ${
                m.isSystem
                  ? "rounded-xl bg-amber-50 text-amber-900"
                  : m.isMine
                    ? "chat-bubble-mine"
                    : "chat-bubble-other"
              }`}
            >
              <p className="whitespace-pre-wrap">{m.content}</p>
              <p
                className={`mt-1 text-[10px] ${
                  m.isMine ? "text-sky-100" : "text-slate-400"
                }`}
              >
                {formatRelative(m.createdAt)}
              </p>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={send} className="border-t border-slate-100 p-3">
        {error ? (
          <p className="mb-2 text-xs text-rose-600">{error}</p>
        ) : null}

        {!canSend ? (
          <p className="mb-2 rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-600">
            {blockedByMe
              ? "Vous avez bloqué ce contact. Débloquez-le pour reprendre la conversation."
              : blockedByOther
                ? "Ce contact n'est plus disponible."
                : "Conversation fermée (récupération terminée depuis plus de 7 jours)."}
          </p>
        ) : (
          <label className="mb-2 flex items-center gap-2 text-xs text-slate-600">
            <input
              type="checkbox"
              checked={sharePhone}
              onChange={(e) => setSharePhone(e.target.checked)}
            />
            Partager volontairement mon numéro
          </label>
        )}
        <div className="flex gap-2">
          <input
            className="input"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Écrire un message..."
            disabled={!canSend}
          />
          <button
            className="btn btn-primary !px-4"
            disabled={loading || !canSend}
          >
            Envoyer
          </button>
        </div>
      </form>
    </div>
  );
}
