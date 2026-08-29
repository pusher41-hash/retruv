import { config } from "dotenv";

// Mirrors Next.js's own env file resolution (.env.local) so modules that
// read process.env.DATABASE_URL / RETRUV_ENC_KEY at import time (src/db,
// security.ts) don't throw when tests run outside `next dev`/`next build`.
config({ path: ".env.local" });
