import "dotenv/config";
import { defineConfig } from "vitest/config";
import { urlBancoDeTeste } from "./test/banco-de-teste.js";

const bancoDeTeste = process.env["DATABASE_URL"]
  ? { DATABASE_URL: urlBancoDeTeste(process.env["DATABASE_URL"]) }
  : {};

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
          env: bancoDeTeste,
          globalSetup: ["test/global-setup.ts"],
          fileParallelism: false,
          testTimeout: 20_000,
          hookTimeout: 60_000,
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
        "src/cli/**",
        "src/**/*.module.ts",
        "src/**/*.controller.ts",
        "src/prisma/**",
        "src/setup.ts",
        // Acesso ao banco: coberto pelos testes de integração (test/*.e2e-spec.ts).
        // A cobertura de unidade mede as regras puras.
        "src/**/*.service.ts",
        "src/acesso/guardas.ts",
        "src/comum/decoradores.ts",
      ],
      thresholds: { lines: 80, functions: 80, branches: 80, statements: 80 },
    },
  },
});
