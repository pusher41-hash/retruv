import { promises as fs } from "fs";
import path from "path";

// Outside `public/`, like private-uploads — never reachable by any HTTP
// route. A second, independent copy of every audit event: even someone who
// obtains the app's own DB credentials and runs `DELETE FROM audit_logs`
// (RETRUV_LANDMINES.md #9 / RETRUV_REDTEAM.md P4-2) does not touch this file.
const AUDIT_DIR = path.join(process.cwd(), "audit-trail");
const AUDIT_FILE = path.join(AUDIT_DIR, "audit.ndjson");

let dirReady: Promise<void> | null = null;
function ensureAuditDir(): Promise<void> {
  if (!dirReady) {
    dirReady = fs.mkdir(AUDIT_DIR, { recursive: true }).then(() => undefined);
  }
  return dirReady;
}

/**
 * Appends one line of newline-delimited JSON. Never opened for truncate or
 * random-offset writes — only ever appended to, and only by this function.
 * Best-effort: a filesystem hiccup here must never break the action being
 * audited, so failures are swallowed.
 */
export async function appendAuditTrail(
  entry: Record<string, unknown>
): Promise<void> {
  try {
    await ensureAuditDir();
    const line = JSON.stringify({ ...entry, loggedAt: new Date().toISOString() });
    await fs.appendFile(AUDIT_FILE, line + "\n", { encoding: "utf8" });
  } catch {
    // Secondary trail only — the primary record is the DB row.
  }
}

/**
 * Optional "long terme" sink (RETRUV_REDTEAM.md P4-2): if configured,
 * forwards every audit event to an external log system (SIEM, Datadog, a
 * simple append-only collector, syslog-over-HTTP bridge, etc.) so history
 * survives even a full compromise of this server. No-op unless
 * RETRUV_AUDIT_WEBHOOK_URL is set. Best-effort — never blocks or fails the
 * caller on an unreachable endpoint.
 */
export async function forwardAuditWebhook(
  entry: Record<string, unknown>
): Promise<void> {
  const url = process.env.RETRUV_AUDIT_WEBHOOK_URL;
  if (!url) return;
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(entry),
    });
  } catch {
    // Best-effort — an unreachable external sink must never break the app.
  }
}
