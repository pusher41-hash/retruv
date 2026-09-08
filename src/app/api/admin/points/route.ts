import { z } from "zod";
import { db } from "@/db";
import { recoveryPoints } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { jsonError, jsonOk, handleApiError } from "@/lib/api";
import { logAudit } from "@/lib/security";

const createSchema = z.object({
  name: z.string().min(2).max(200),
  type: z.string().min(2).max(50),
  address: z.string().min(2).max(300),
  city: z.string().min(2).max(100),
  country: z.string().length(2),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  phone: z.string().max(30).optional().nullable(),
  email: z.string().email().max(200).optional().nullable(),
  hours: z.string().max(200).optional().nullable(),
  managerName: z.string().max(200).optional().nullable(),
});

export async function POST(req: Request) {
  try {
    const admin = await requireAdmin();
    const data = createSchema.parse(await req.json());

    const [point] = await db
      .insert(recoveryPoints)
      .values({
        name: data.name.trim(),
        type: data.type.trim(),
        address: data.address.trim(),
        city: data.city.trim(),
        country: data.country,
        latitude: data.latitude ?? null,
        longitude: data.longitude ?? null,
        phone: data.phone || null,
        email: data.email || null,
        hours: data.hours || null,
        managerName: data.managerName || null,
      })
      .returning();

    await logAudit({
      userId: admin.id,
      action: "recovery_point.create",
      entityType: "recovery",
      entityId: point.id,
    });

    return jsonOk({ point }, 201);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return jsonError(err.issues[0]?.message ?? "Données invalides");
    }
    return handleApiError(err);
  }
}
