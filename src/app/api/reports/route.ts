import { z } from "zod";
import { db } from "@/db";
import { reports } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { jsonError, jsonOk, handleApiError } from "@/lib/api";
import { checkReportRate, flagFraud, logAudit } from "@/lib/security";

const schema = z.object({
  targetType: z.enum([
    "user",
    "lost_item",
    "found_item",
    "message",
    "match",
  ]),
  targetId: z.string().uuid(),
  reason: z.string().min(3).max(200),
  details: z.string().max(2000).optional(),
});

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const data = schema.parse(await req.json());

    const rate = await checkReportRate(user.id, data.targetType, data.targetId);
    if (!rate.ok) return jsonError(rate.reason ?? "Limite atteinte", 429);

    const [report] = await db
      .insert(reports)
      .values({
        reporterId: user.id,
        targetType: data.targetType,
        targetId: data.targetId,
        reason: data.reason,
        details: data.details,
      })
      .returning();

    if (data.targetType === "user") {
      await flagFraud({
        userId: data.targetId,
        flagType: "user_report",
        severity: 2,
        details: data.reason,
      });
    }

    await logAudit({
      userId: user.id,
      action: "report.create",
      entityType: data.targetType,
      entityId: data.targetId,
    });

    return jsonOk({ report }, 201);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return jsonError(err.issues[0]?.message ?? "Données invalides");
    }
    return handleApiError(err);
  }
}
