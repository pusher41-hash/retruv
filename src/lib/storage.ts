import { get, put } from "@vercel/blob";

/**
 * Two separate Blob stores, not one: `access` on Vercel Blob is a store-wide
 * setting, not per-object, so a genuinely private original and a publicly
 * servable redacted derivative can't live in the same store. In production
 * the private store is the `BLOB_READ_WRITE_TOKEN`'s default store (no
 * `storeId` needed) and the public one is `BLOB_PUBLIC_STORE_ID`.
 * `BLOB_PRIVATE_STORE_ID` is an optional override — unset in production
 * (falls back to the token's default store, as above) but set by
 * tests/integration/ (see .env.test) to point at dedicated test-only Blob
 * stores instead, so the suite never writes to the real private store.
 *
 * Replaced local-disk storage (`fs.writeFile` under `process.cwd()`) after
 * discovering every photo upload was failing in production with
 * `ENOENT: no such file or directory, mkdir '/var/task/private-uploads'` —
 * Vercel's serverless functions only have a writable /tmp, which doesn't
 * persist across invocations anyway, so local disk was never viable here.
 */
const PRIVATE_STORE_ID = process.env.BLOB_PRIVATE_STORE_ID;
const PUBLIC_STORE_ID = process.env.BLOB_PUBLIC_STORE_ID;

if (process.env.DEBUG_TEST_SERVER) {
  console.log(
    "[storage.ts diag] PUBLIC_STORE_ID:",
    PUBLIC_STORE_ID ? `len=${PUBLIC_STORE_ID.length} matches=${PUBLIC_STORE_ID === "store_auMuHPRCzI0loqW6"}` : "undefined",
    "| PRIVATE_STORE_ID:",
    PRIVATE_STORE_ID ? `len=${PRIVATE_STORE_ID.length} matches=${PRIVATE_STORE_ID === "store_mi6zospZHXmp55iE"}` : "undefined"
  );
}

// Filenames are always server-generated UUIDs (see /api/upload and
// processSensitivePhotos), never derived from user input, so there is no
// path-traversal surface here.
function privatePathname(filename: string): string {
  return `private/${filename}`;
}

/** Writes a private original — never fetchable by a plain URL, only via `readPrivateUpload`. */
export async function putPrivateUpload(filename: string, data: Buffer): Promise<void> {
  await put(privatePathname(filename), data, {
    access: "private",
    storeId: PRIVATE_STORE_ID,
    contentType: "image/jpeg",
    addRandomSuffix: false,
  });
}

/** Reads a private original back into memory for server-side processing (e.g. the blur pipeline). */
export async function readPrivateUpload(filename: string): Promise<Buffer> {
  const result = await get(privatePathname(filename), {
    access: "private",
    storeId: PRIVATE_STORE_ID,
  });
  if (!result || result.statusCode !== 200) {
    throw new Error(`private upload not found: ${filename}`);
  }
  const chunks: Uint8Array[] = [];
  const reader = result.stream.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}

/** Writes a public/redacted derivative and returns its public URL. */
export async function putPublicUpload(filename: string, data: Buffer): Promise<string> {
  const result = await put(filename, data, {
    access: "public",
    storeId: PUBLIC_STORE_ID,
    contentType: "image/jpeg",
    addRandomSuffix: false,
  });
  return result.url;
}
