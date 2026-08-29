import { randomUUID } from "crypto";
import { put } from "@vercel/blob";

/**
 * A second, independent copy of every audit event, outside the app's own
 * database: even someone who obtains the DB credentials and runs `DELETE
 * FROM audit_logs` (RETRUV_LANDMINES.md #9 / RETRUV_REDTEAM.md P4-2) does
 * not touch these. Originally written to local disk (`fs.appendFile`
 * against a growing `audit.ndjson`) — that never actually worked in
 * production (Vercel's serverless functions have no writable/persistent
 * filesystem outside /tmp, same root cause as the photo-upload bug fixed
 * the same day, see project memory) so this secondary trail had silently
 * been a no-op since launch.
 *
 * Each event is now its own small object in the private Blob store — not
 * one appended-to file — since Blob has no append primitive; writing a
 * whole growing file back on every single audit event would mean an
 * ever-larger read-modify-write on every request. Many small immutable
 * objects fits the object-storage model Blob actually offers.
 *
 * Shares the private store with storage.ts's upload originals (same
 * `BLOB_PRIVATE_STORE_ID` override for tests — see storage.ts), distinguished
 * by the `audit-trail/` pathname prefix.
 */
const PRIVATE_STORE_ID = process.env.BLOB_PRIVATE_STORE_ID;

export async function appendAuditTrail(
  entry: Record<string, unknown>
): Promise<void> {
  try {
    const loggedAt = new Date();
    const pathname = `audit-trail/${loggedAt.toISOString()}-${randomUUID()}.json`;
    await put(pathname, JSON.stringify({ ...entry, loggedAt: loggedAt.toISOString() }), {
      access: "private",
      storeId: PRIVATE_STORE_ID,
      contentType: "application/json",
      addRandomSuffix: false,
    });
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
