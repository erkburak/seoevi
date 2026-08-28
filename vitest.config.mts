import { fileURLToPath } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // Testler Next.js sunucu bağlamı dışında çalıştığından bu koruma devre dışı bırakılır.
      "server-only": fileURLToPath(new URL("./tests/stub/server-only.ts", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // Entegrasyon testleri canlı Supabase ve DataForSEO gerektirir;
    // ayrı yapılandırmayla çalıştırılır (npm run test:entegrasyon).
    exclude: ["tests/entegrasyon/**"],
    globals: false,
  },
});
