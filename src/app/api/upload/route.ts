import { randomUUID } from "crypto";
import sharp from "sharp";
import { db } from "@/db";
import { uploads } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { jsonError, jsonOk, handleApiError } from "@/lib/api";
import { checkUploadRate, logAudit } from "@/lib/security";
import { putPrivateUpload } from "@/lib/storage";

const MAX_SIZE_BYTES = 8 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function POST(req: Request) {
  try {
    const user = await requireUser();

    const rate = await checkUploadRate(user.id);
    if (!rate.ok) return jsonError(rate.reason ?? "Limite atteinte", 429);

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return jsonError("Fichier manquant");
    }
    if (file.size === 0 || file.size > MAX_SIZE_BYTES) {
      return jsonError("Fichier invalide (8 Mo maximum)");
    }
    if (!ALLOWED_TYPES.has(file.type)) {
      return jsonError("Format non supporté (JPEG, PNG ou WEBP uniquement)");
    }

    const inputBuffer = Buffer.from(await file.arrayBuffer());

    // Re-decoding with sharp both validates that this is a genuine image
    // (rejecting anything that merely spoofs the declared mime type) and
    // strips all EXIF/GPS metadata by re-encoding to a fresh JPEG.
    let normalized: Buffer;
    try {
      normalized = await sharp(inputBuffer)
        .rotate()
        .resize({
          width: 2000,
          height: 2000,
          fit: "inside",
          withoutEnlargement: true,
        })
        .jpeg({ quality: 88 })
        .toBuffer();
    } catch {
      return jsonError("Image invalide ou corrompue");
    }

    const id = randomUUID();
    const filename = `${id}.jpg`;
    await putPrivateUpload(filename, normalized);

    const [row] = await db
      .insert(uploads)
      .values({
        id,
        userId: user.id,
        privateFilename: filename,
        sizeBytes: normalized.length,
      })
      .returning();

    await logAudit({
      userId: user.id,
      action: "upload.create",
      entityType: "upload",
      entityId: row.id,
    });

    return jsonOk({ photoId: row.id }, 201);
  } catch (err) {
    return handleApiError(err);
  }
}
