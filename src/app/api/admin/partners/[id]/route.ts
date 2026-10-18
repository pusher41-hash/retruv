import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { partners } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";
import { logAudit } from "@/lib/security";

type Params = { params: Promise<{ id: string }> };

const ALLOWED_ICONS = [
  "Train",
  "GraduationCap",
  "Building2",
  "Building",
  "Hotel",
  "Store",
  "Landmark",
  "Plane",
  "Bus",
  "ShieldCheck",
  "Handshake",
  "Briefcase",
  "MapPin",
  "University",
  "Warehouse",
  "ShoppingBag",
] as const;

const patchSchema = z.object({
  title: z.string().min(2).max(120).optional(),
  description: z.string().min(10).max(600).optional(),
  icon: z.enum(ALLOWED_ICONS).optional(),
  website: z.string().max(300).optional().nullable(),
  logoUrl: z.string().max(500).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  country: z.string().length(2).optional().nullable(),
  sortOrder: z.number().int().min(0).max(1000).optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(req: Request, { params }: Params) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    const data = patchSchema.parse(await req.json());

    const [existing] = await db.select().from(partners).where(eq(partners.id, id)).limit(1);
    if (!existing) return jsonError("Partenaire introuvable", 404);

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (data.title !== undefined) updateData.title = data.title.trim();
    if (data.description !== undefined) updateData.description = data.description.trim();
    if (data.icon !== undefined) updateData.icon = data.icon;
    if (data.website !== undefined) updateData.website = data.website || null;
    if (data.logoUrl !== undefined) updateData.logoUrl = data.logoUrl || null;
    if (data.city !== undefined) updateData.city = data.city || null;
    if (data.country !== undefined) updateData.country = data.country || null;
    if (data.sortOrder !== undefined) updateData.sortOrder = data.sortOrder;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    const [row] = await db.update(partners).set(updateData).where(eq(partners.id, id)).returning();

    await logAudit({
      userId: admin.id,
      action: "partner.update",
      entityType: "partner",
      entityId: id,
    });

    return jsonOk({ partner: row });
  } catch (err) {
    if (err instanceof z.ZodError) return jsonError(err.issues[0]?.message ?? "Données invalides");
    return handleApiError(err);
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;

    const [existing] = await db.select().from(partners).where(eq(partners.id, id)).limit(1);
    if (!existing) return jsonError("Partenaire introuvable", 404);

    await db.delete(partners).where(eq(partners.id, id));

    await logAudit({
      userId: admin.id,
      action: "partner.delete",
      entityType: "partner",
      entityId: id,
    });

    return jsonOk({ deleted: true });
  } catch (err) {
    return handleApiError(err);
  }
}
