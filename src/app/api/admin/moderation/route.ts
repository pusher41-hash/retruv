import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { jsonError, jsonOk, handleApiError } from "@/lib/api";
import {
  approveDeclaration,
  listPendingModeration,
  rejectDeclaration,
} from "@/lib/moderation";

export async function GET() {
  try {
    await requireAdmin();
    const { pendingLost, pendingFound } = await listPendingModeration();
    return jsonOk({ pendingLost, pendingFound });
  } catch (err) {
    return handleApiError(err);
  }
}

const patchSchema = z.object({
  type: z.enum(["lost", "found"]),
  id: z.string().uuid(),
  action: z.enum(["approve", "reject"]),
  reason: z.string().max(500).optional(),
});

export async function PATCH(req: Request) {
  try {
    const moderator = await requireAdmin();
    const body = await req.json();
    const data = patchSchema.parse(body);

    if (data.action === "approve") {
      const result = await approveDeclaration(data.type, data.id, moderator.id);
      if (!result) return jsonError("Déclaration introuvable ou déjà traitée", 404);
      return jsonOk(result);
    }

    const item = await rejectDeclaration(
      data.type,
      data.id,
      moderator.id,
      data.reason ?? ""
    );
    if (!item) return jsonError("Déclaration introuvable ou déjà traitée", 404);
    return jsonOk({ item });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return jsonError(err.issues[0]?.message ?? "Données invalides");
    }
    return handleApiError(err);
  }
}
