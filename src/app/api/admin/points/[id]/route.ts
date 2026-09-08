import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { recoveryPoints } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { jsonError, jsonOk, handleApiError } from "@/lib/api";
import { logAudit } from "@/lib/security";

type Params = { params: Promise<{ id: string }> };

const patchSchema = z.object({
  name: z.string().min(2).max(200).optional(),
  type: z.string().min(2).max(50).optional(),
  address: z.string().min(2).max(300).optional(),
  city: z.string().min(2).max(100).optional(),
  country: z.string().length(2).optional(),
  phone: z.string().max(30).optional().nullable(),
  email: z.string().email().max(200).optional().nullable(),
  hours: z.string().max(200).optional().nullable(),
  managerName: z.string().max(200).optional().nullable(),
  isActive: z.boolean().optional(),
});

export async function PATCH(req: Request, { params }: Params) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    const data = patchSchema.parse(await req.json());

    const [existing] = await db
      .select()
      .from(recoveryPoints)
      .where(eq(recoveryPoints.id, id))
      .limit(1);
    if (!existing) return jsonError("Point introuvable", 404);

    const [point] = await db
      .update(recoveryPoints)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(recoveryPoints.id, id))
      .returning();

    await logAudit({
      userId: admin.id,
      action: "recovery_point.update",
      entityType: "recovery",
      entityId: id,
    });

    return jsonOk({ point });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return jsonError(err.issues[0]?.message ?? "Données invalides");
    }
    return handleApiError(err);
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;

    const [existing] = await db
      .select()
      .from(recoveryPoints)
      .where(eq(recoveryPoints.id, id))
      .limit(1);
    if (!existing) return jsonError("Point introuvable", 404);

    try {
      await db.delete(recoveryPoints).where(eq(recoveryPoints.id, id));
    } catch (err: unknown) {
      // FK constraint (found_items.recovery_point_id / recoveries.recovery_point_id)
      // — a point still referenced by real declarations/recoveries can't be
      // hard-deleted without orphaning them. Deactivating hides it from new
      // declarations while keeping history intact. drizzle-orm's
      // node-postgres driver can surface the raw pg error either directly
      // or wrapped with the original under `.cause` depending on version,
      // so check both rather than assume one shape.
      const code =
        (err as { code?: string })?.code ??
        (err as { cause?: { code?: string } })?.cause?.code;
      if (code === "23503") {
        return jsonError(
          "Ce point est référencé par des déclarations ou récupérations existantes — désactivez-le plutôt que de le supprimer.",
          409
        );
      }
      throw err;
    }

    await logAudit({
      userId: admin.id,
      action: "recovery_point.delete",
      entityType: "recovery",
      entityId: id,
    });

    return jsonOk({ deleted: true });
  } catch (err) {
    return handleApiError(err);
  }
}
