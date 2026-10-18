
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { partners } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { jsonOk, handleApiError } from "@/lib/api";
import { logAudit } from "@/lib/security";

export const dynamic = "force-dynamic";

// Regex JS pour emojis : couvre la plupart des blocs emoji
const EMOJI_RE = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}\u{1FA70}-\u{1FAFF}]/gu;

function stripEmojis(s: string): string {
  return s
    .replace(EMOJI_RE, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export async function POST() {
  try {
    const admin = await requireAdmin();

    const rows = await db.select().from(partners);
    let cleaned = 0;
    let updatedTitles: string[] = [];

    for (const p of rows) {
      const newTitle = stripEmojis(p.title);
      const newDesc = stripEmojis(p.description);
      if (newTitle !== p.title || newDesc !== p.description) {
        await db.execute(sql`UPDATE partners SET title = ${newTitle}, description = ${newDesc}, updated_at = now() WHERE id = ${p.id}`);
        cleaned++;
        if (newTitle !== p.title) updatedTitles.push(`${p.title} -> ${newTitle}`);
      }
    }

    // aussi nettoyer via SQL direct pour les cas restants (double sécurité)
    // enlève les étoiles décoratives finales type " *" ou " ✨" laissées après strip
    await db.execute(sql`UPDATE partners SET description = regexp_replace(description, '\s*[✨⭐🌍💙🤝🕌🚆🏛️🚓🎓]+\s*$', '', 'g'), title = regexp_replace(title, '^[^\x20-\x7E\xC0-\xFF]+\s*', '', 'g'), updated_at = now() WHERE description ~ '[^\x00-\x7F]' OR title ~ '[^\x00-\x7F]'`);

    await logAudit({
      userId: admin.id,
      action: "partner.clean_emoji",
      entityType: "partner",
      entityId: `${cleaned} cleaned`,
      metadata: { cleaned, total: rows.length },
    });

    return jsonOk({ cleaned, total: rows.length, message: `${cleaned} partenaires nettoyés (emojis retirés) — ${rows.length} au total` });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function GET() {
  try {
    await requireAdmin();
    const rows = await db.select().from(partners);
    // preview ceux qui ont encore des emojis
    const withEmoji = rows.filter(r => EMOJI_RE.test(r.title) || EMOJI_RE.test(r.description));
    return jsonOk({ total: rows.length, withEmoji: withEmoji.length, preview: withEmoji.slice(0,5).map(p=>({title:p.title, description:p.description.slice(0,80)})) });
  } catch (err) {
    return handleApiError(err);
  }
}
