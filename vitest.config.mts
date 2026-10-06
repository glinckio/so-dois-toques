import { defineConfig } from "vitest/config";

// Testes dos scripts da raiz (verificador de specs).
export default defineConfig({
  test: {
    include: ["scripts/**/*.test.ts"],
    environment: "node",
  },
});
