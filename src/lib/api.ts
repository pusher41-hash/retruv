import { NextResponse } from "next/server";

export function jsonOk<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function handleApiError(err: unknown) {
  if (err instanceof Error) {
    if (err.message === "UNAUTHORIZED") {
      return jsonError("Connexion requise", 401);
    }
    if (err.message === "FORBIDDEN") {
      return jsonError("Accès refusé", 403);
    }
    console.error(err);
    return jsonError("Erreur serveur", 500);
  }
  return jsonError("Erreur serveur", 500);
}
