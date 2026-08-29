import { config } from "dotenv";

// globalSetup runs in a separate context from each test file's worker, so
// DATABASE_URL must be loaded again here for files that import `@/db`
// directly (cleanup helpers) to see the test DB rather than throwing on a
// missing env var or, worse, silently resolving `.env.local`'s production URL.
config({ path: ".env.test" });

// Defense in depth alongside the same check in global-setup.ts: test files'
// afterAll hooks run db.delete() directly — refuse before any of that runs
// if DATABASE_URL isn't clearly local.
const dbUrl = process.env.DATABASE_URL ?? "";
if (!/(^|@)(127\.0\.0\.1|localhost)([:/]|$)/.test(dbUrl)) {
  throw new Error(
    "Refusing to run integration tests: DATABASE_URL is not a local database."
  );
}
