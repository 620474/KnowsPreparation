import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@prep/contracts": fileURLToPath(
        new URL("../../packages/contracts/src/index.ts", import.meta.url),
      ),
    },
  },
  server: {
    host: "0.0.0.0",
    port: 5173,
  },
  test: {
    environment: "node",
  },
});
