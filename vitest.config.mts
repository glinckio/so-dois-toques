import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const alias = {
  "@": fileURLToPath(new URL("./src", import.meta.url)),
  "server-only": fileURLToPath(new URL("./src/test/server-only-stub.ts", import.meta.url)),
};

export default defineConfig({
  resolve: { alias },
  test: {
    projects: [
      {
        resolve: { alias },
        test: {
          name: "unit",
          include: ["src/**/*.test.ts", "scripts/**/*.test.ts"],
          exclude: ["src/**/*.int.test.ts"],
          environment: "node",
        },
      },
      {
        resolve: { alias },
        test: {
          name: "integration",
          include: ["src/**/*.int.test.ts"],
          environment: "node",
          setupFiles: ["dotenv/config"],
        },
      },
    ],
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts", "scripts/spec-coverage.ts"],
      exclude: [
        "src/generated/**",
        "src/**/*.test.ts",
        "src/test/**",
        "src/app/**",
        "src/proxy.ts",
        "src/lib/db.ts",
      ],
      thresholds: { lines: 80, functions: 80, branches: 80, statements: 80 },
    },
  },
});
