import { fileURLToPath } from "node:url";

import { config } from "dotenv";
import { defineConfig } from "vitest/config";

// Entegrasyon testleri canlı Supabase'e bağlanır.
config({ path: ".env.local" });

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "server-only": fileURLToPath(new URL("./tests/stub/server-only.ts", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["tests/entegrasyon/**/*.test.ts"],
    // Gerçek veritabanına gidildiği için paralel çalıştırılmaz.
    fileParallelism: false,
    testTimeout: 30_000,
  },
});
