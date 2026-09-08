import { clsx, type ClassValue } from "clsx";
import { MATCH_LEVELS } from "./constants";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatRelative(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = Date.now();
  const diff = now - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "À l'instant";
  if (mins < 60) return `Il y a ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `Il y a ${days}j`;
  return formatDate(d);
}

export function maskPhone(phone: string): string {
  if (phone.length < 6) return "***";
  return phone.slice(0, 4) + "****" + phone.slice(-2);
}

export function maskId(id: string, visibleStart = 2, visibleEnd = 2): string {
  if (!id || id.length <= visibleStart + visibleEnd) return "****";
  return (
    id.slice(0, visibleStart) +
    "*".repeat(Math.min(id.length - visibleStart - visibleEnd, 8)) +
    id.slice(-visibleEnd)
  );
}

export function maskSensitiveText(text: string): string {
  let result = text;
  // Mask long digit sequences (ID numbers, cards)
  result = result.replace(/\b\d{6,}\b/g, (m) => maskId(m, 2, 2));
  // Mask email-like
  result = result.replace(
    /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    "***@***.***"
  );
  return result;
}

export function extractKeywords(text: string): string[] {
  const stopWords = new Set([
    "le", "la", "les", "un", "une", "des", "de", "du", "et", "ou", "à", "a",
    "en", "dans", "sur", "pour", "par", "avec", "sans", "ce", "cette", "ces",
    "mon", "ma", "mes", "son", "sa", "ses", "qui", "que", "quoi", "dont",
    "est", "sont", "été", "être", "avoir", "j", "ai", "je", "il", "elle",
    "nous", "vous", "ils", "elles", "the", "a", "an", "and", "or", "in",
    "on", "at", "to", "for", "of", "is", "was", "are", "were", "lost",
    "found", "perdu", "trouvé", "objet", "très", "plus", "aussi",
  ]);
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !stopWords.has(w))
    .slice(0, 30);
}

export function getMatchLevel(
  score: number
): "weak" | "possible" | "probable" | "very_probable" {
  if (score >= MATCH_LEVELS.very_probable.min) return "very_probable";
  if (score >= MATCH_LEVELS.probable.min) return "probable";
  if (score >= MATCH_LEVELS.possible.min) return "possible";
  return "weak";
}

export function getMatchLevelLabel(level: string): string {
  return MATCH_LEVELS[level as keyof typeof MATCH_LEVELS]?.label ?? level;
}

export function getMatchLevelColor(level: string): string {
  const map: Record<string, string> = {
    weak: "bg-slate-100 text-slate-700 border-slate-200",
    possible: "bg-amber-50 text-amber-800 border-amber-200",
    probable: "bg-orange-50 text-orange-800 border-orange-200",
    very_probable: "bg-emerald-50 text-emerald-800 border-emerald-200",
  };
  return map[level] ?? map.weak;
}

export function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function daysBetween(a: Date | null, b: Date | null): number | null {
  if (!a || !b) return null;
  return Math.abs(a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24);
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function statusLabel(status: string): string {
  const map: Record<string, string> = {
    active: "Active",
    matched: "Correspondance",
    in_recovery: "En récupération",
    recovered: "Récupéré",
    expired: "Expirée",
    withdrawn: "Retirée",
    suspended: "Suspendue",
    pending: "En attente",
    notified: "Notifiée",
    verifying: "Vérification",
    verified: "Vérifiée",
    rejected: "Rejetée",
    completed: "Terminée",
    proposed: "Proposée",
    accepted: "Acceptée",
    at_point: "Au point RETRUV",
    in_transit: "En transit",
    cancelled: "Annulée",
    disputed: "Litige",
    open: "Ouvert",
    reviewing: "En cours",
    resolved: "Résolu",
    dismissed: "Rejeté",
    pending_review: "En vérification",
  };
  return map[status] ?? status;
}

export function statusColor(status: string): string {
  const map: Record<string, string> = {
    active: "bg-sky-50 text-sky-700 border-sky-200",
    matched: "bg-violet-50 text-violet-700 border-violet-200",
    in_recovery: "bg-amber-50 text-amber-700 border-amber-200",
    recovered: "bg-emerald-50 text-emerald-700 border-emerald-200",
    completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
    verified: "bg-emerald-50 text-emerald-700 border-emerald-200",
    expired: "bg-slate-100 text-slate-600 border-slate-200",
    rejected: "bg-rose-50 text-rose-700 border-rose-200",
    suspended: "bg-rose-50 text-rose-700 border-rose-200",
    cancelled: "bg-slate-100 text-slate-600 border-slate-200",
    pending: "bg-amber-50 text-amber-700 border-amber-200",
    notified: "bg-sky-50 text-sky-700 border-sky-200",
    verifying: "bg-orange-50 text-orange-700 border-orange-200",
    proposed: "bg-sky-50 text-sky-700 border-sky-200",
    accepted: "bg-violet-50 text-violet-700 border-violet-200",
    at_point: "bg-teal-50 text-teal-700 border-teal-200",
    pending_review: "bg-amber-50 text-amber-700 border-amber-200",
  };
  return map[status] ?? "bg-slate-100 text-slate-600 border-slate-200";
}

export function reputationLabel(level: string): string {
  const map: Record<string, string> = {
    new: "Nouveau",
    reliable: "Utilisateur fiable",
    verified_finder: "Trouveur vérifié",
    super_finder: "Super trouveur",
    partner: "Partenaire RETRUV",
  };
  return map[level] ?? level;
}

/**
 * Formats a reward amount in whatever currency it was actually declared in
 * (see `rewardCurrency` in db/schema.ts) — RETRUV is worldwide, so hardcoding
 * "FCFA" for every reward regardless of the declarer's country would be
 * exactly the kind of implicit "this is a West African product" signal the
 * platform is trying to avoid.
 */
export function formatMoney(
  amount: number | null | undefined,
  currency?: string | null
): string {
  if (amount == null) return "";
  const code = currency || "XOF";
  // XOF/XAF (CFA francs) have no widely-recognized currency symbol in
  // Intl's data — "FCFA" is how people actually refer to them.
  if (code === "XOF" || code === "XAF") {
    return `${new Intl.NumberFormat("fr-FR").format(amount)} FCFA`;
  }
  try {
    return new Intl.NumberFormat("fr-FR", { style: "currency", currency: code }).format(amount);
  } catch {
    return `${new Intl.NumberFormat("fr-FR").format(amount)} ${code}`;
  }
}

export function approximateLocation(
  lat: number | null | undefined,
  lng: number | null | undefined
): { lat: number; lng: number } | null {
  if (lat == null || lng == null) return null;
  // Round to ~1km precision for privacy
  return {
    lat: Math.round(lat * 100) / 100,
    lng: Math.round(lng * 100) / 100,
  };
}
