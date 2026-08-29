import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    include: ["tests/integration/**/*.test.ts"],
    setupFiles: ["./vitest.integration.setup.ts"],
    globalSetup: ["./tests/integration/global-setup.ts"],
    // Real HTTP round-trips + bcrypt hashing + a real DB — slower than the
    // pure-function unit suite, and file-parallel workers would otherwise
    // race on shared tables (users, sessions) against one shared server.
    fileParallelism: false,
    testTimeout: 20_000,
    hookTimeout: 60_000,
  },
});
