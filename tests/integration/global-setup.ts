import { config } from "dotenv";
import { spawn, spawnSync, type ChildProcess } from "child_process";
import path from "path";
import { BASE_URL } from "./helpers";

config({ path: ".env.test" });

let serverProcess: ChildProcess | null = null;

async function waitForHealth(timeoutMs: number): Promise<void> {
  const start = Date.now();
  let lastError: unknown;
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${BASE_URL}/api/health`);
      if (res.ok) return;
    } catch (err) {
      lastError = err;
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(
    `Test server did not become healthy within ${timeoutMs}ms: ${lastError}`
  );
}

/**
 * Hard safety net: this suite creates and deletes real rows (users,
 * declarations, sessions...) on whatever DATABASE_URL the spawned server
 * ends up with. .env.local's DATABASE_URL is the SAME database as
 * production (see project memory) — if env precedence ever breaks and that
 * leaks through, refuse to run rather than risk writing test data there.
 */
function assertLocalDatabase(): void {
  const url = process.env.DATABASE_URL ?? "";
  const isLocal = /(^|@)(127\.0\.0\.1|localhost)([:/]|$)/.test(url);
  if (!isLocal) {
    throw new Error(
      "Refusing to run integration tests: DATABASE_URL does not point at " +
        "a local database. Expected 127.0.0.1/localhost (see .env.test). " +
        "Got a host that looks like it could be the shared prod/dev Neon DB."
    );
  }
}

/**
 * Boots a real `next dev` server against the local retruv_test database
 * (never the shared DATABASE_URL from .env.local — see .env.test) so
 * integration tests exercise actual route handlers, `next/headers`
 * cookies(), and real SQL — the things a pure unit test can't reach.
 * `env: { ...process.env }` matters: DATABASE_URL is already set on this
 * process from the `config()` call above, and Next's own .env.local loading
 * never overrides an already-defined process.env var, so the spawned server
 * inherits the test DB rather than quietly falling back to production.
 *
 * Invoked as `node <next-cli-script>` directly (no `shell: true`, no npx
 * wrapper) so `serverProcess.pid` IS the actual dev server process, not a
 * cmd.exe/npx ancestor a few layers up. With the shell-wrapped version,
 * `.kill()` on teardown only killed the wrapper and left the real Next
 * process (and the port) running — confirmed by a leaked server surviving
 * a full test run and still answering on :3100 afterward.
 */
async function isPortAlreadyServing(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/api/health`, {
      signal: AbortSignal.timeout(1500),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export default async function globalSetup() {
  assertLocalDatabase();
  if (await isPortAlreadyServing()) {
    throw new Error(
      `Something is already listening on ${BASE_URL} before this run even ` +
        "started a server — likely a leaked process from a previous " +
        "interrupted test run. Find and kill it, then retry (on Windows: " +
        "Get-CimInstance Win32_Process | Where CommandLine -like '*next*' )."
    );
  }
  const port = new URL(BASE_URL).port;
  const nextBin = path.join(process.cwd(), "node_modules", "next", "dist", "bin", "next");
  serverProcess = spawn(process.execPath, [nextBin, "dev", "-p", port], {
    cwd: process.cwd(),
    env: { ...process.env },
    stdio: process.env.DEBUG_TEST_SERVER ? "inherit" : "ignore",
  });

  serverProcess.on("error", (err) => {
    throw new Error(`Failed to start test server: ${err}`);
  });

  await waitForHealth(60_000);

  const seedRes = await fetch(`${BASE_URL}/api/seed`);
  if (!seedRes.ok) {
    throw new Error(`/api/seed failed during test setup: ${await seedRes.text()}`);
  }

  return async () => {
    if (!serverProcess || serverProcess.killed || serverProcess.pid == null) return;
    // `next dev` forks its own child (start-server.js does the actual
    // listening — confirmed with Get-CimInstance while debugging this
    // setup) as a separate OS process, so a plain ChildProcess.kill() on
    // the CLI wrapper we spawned leaves that grandchild (and its own
    // postcss build workers) running and still bound to the port. `taskkill
    // /T` kills the whole tree rooted at our PID instead.
    if (process.platform === "win32") {
      spawnSync("taskkill", ["/pid", String(serverProcess.pid), "/T", "/F"]);
    } else {
      serverProcess.kill();
    }
  };
}
