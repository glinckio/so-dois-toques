import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    projects: [
      {
        extends: true,
        test: { name: "unit", include: ["src/**/*.spec.ts"] },
      },
      {
        extends: true,
        test: {
          name: "integration",
          include: ["test/**/*.e2e-spec.ts"],
          setupFiles: ["dotenv/config"],
          fileParallelism: false,
        },
      },
    ],
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: [
        "src/generated/**",
        "src/**/*.spec.ts",
        "src/main.ts",
        "src/**/*.module.ts",
        "src/**/*.controller.ts",
        "src/prisma/**",
        "src/setup.ts",
      ],
      thresholds: { lines: 80, functions: 80, branches: 80, statements: 80 },
    },
  },
});
