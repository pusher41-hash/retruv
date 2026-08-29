import { promises as fs } from "fs";
import path from "path";

// Never inside `public/`: files here are not reachable by any HTTP route.
const PRIVATE_DIR = path.join(process.cwd(), "private-uploads");
// Served automatically by Next.js as static assets under /uploads/*.
const PUBLIC_DIR = path.join(process.cwd(), "public", "uploads");

let dirsReady: Promise<void> | null = null;

export function ensureUploadDirs(): Promise<void> {
  if (!dirsReady) {
    dirsReady = Promise.all([
      fs.mkdir(PRIVATE_DIR, { recursive: true }),
      fs.mkdir(PUBLIC_DIR, { recursive: true }),
    ]).then(() => undefined);
  }
  return dirsReady;
}

// Filenames are always server-generated UUIDs (see /api/upload and
// processSensitivePhotos), never derived from user input, so there is no
// path-traversal surface here.
export function privateUploadPath(filename: string): string {
  return path.join(PRIVATE_DIR, filename);
}

export function publicUploadPath(filename: string): string {
  return path.join(PUBLIC_DIR, filename);
}

export function publicUploadUrl(filename: string): string {
  return `/uploads/${filename}`;
}
