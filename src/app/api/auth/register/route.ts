import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { users } from "@/db/schema";
import { createSession, hashPassword } from "@/lib/auth";
import { jsonError, jsonOk, handleApiError } from "@/lib/api";
import { logAudit } from "@/lib/security";
import { getClientIp, verifyTurnstileToken } from "@/lib/turnstile";

const schema = z.object({
  fullName: z.string().min(2).max(120),
  phone: z.string().min(8).max(20),
  email: z.string().email().optional().or(z.literal("")),
  password: z.string().min(6).max(100),
  city: z.string().max(100).optional(),
  country: z.string().length(2),
  turnstileToken: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const data = schema.parse(body);

    const captcha = await verifyTurnstileToken(
      data.turnstileToken,
      getClientIp(req)
    );
    if (!captcha.ok) {
      return jsonError(captcha.reason ?? "Vérification anti-robot échouée", 403);
    }

    const phone = data.phone.replace(/\s/g, "");
    const existing = await db
      .select()
      .from(users)
      .where(eq(users.phone, phone))
      .limit(1);
    if (existing[0]) {
      return jsonError("Ce numéro est déjà utilisé", 409);
    }

    if (data.email) {
      const byEmail = await db
        .select()
        .from(users)
        .where(eq(users.email, data.email))
        .limit(1);
      if (byEmail[0]) {
        return jsonError("Cet email est déjà utilisé", 409);
      }
    }

    const passwordHash = await hashPassword(data.password);
    const [user] = await db
      .insert(users)
      .values({
        fullName: data.fullName.trim(),
        phone,
        email: data.email || null,
        passwordHash,
        city: data.city || null,
        country: data.country,
      })
      .returning();

    await createSession(user.id);
    await logAudit({
      userId: user.id,
      action: "user.register",
      entityType: "user",
      entityId: user.id,
    });

    return jsonOk({
      user: {
        id: user.id,
        fullName: user.fullName,
        phone: user.phone,
        role: user.role,
        city: user.city,
      },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return jsonError(err.issues[0]?.message ?? "Données invalides");
    }
    return handleApiError(err);
  }
}
