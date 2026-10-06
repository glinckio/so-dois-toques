import { defineConfig, devices } from "@playwright/test";
import { ADMIN_E2E } from "./e2e/dados";

const port = Number(process.env.PORT ?? 3000);
const portaApi = Number(process.env.API_PORT ?? 3001);
const baseURL = `http://127.0.0.1:${port}`;

// A API sobe com um banco próprio ("_e2e"), recriado a cada execução.
const bancoBase = new URL(
  process.env.DATABASE_URL ?? "postgresql://sdt:sdt_local_dev@localhost:5432/so_dois_toques",
);
bancoBase.pathname = `${bancoBase.pathname.replace(/_(test|e2e)$/, "")}_e2e`;
// Chave usada só entre o web e a API dos testes.
const chaveInterna = "chave-interna-dos-testes-ponta-a-ponta-0000";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL,
    trace: "retain-on-failure",
    // Permite usar um Chromium já instalado na máquina (opcional).
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH }
      : {},
  },
  projects: [
    { name: "celular", use: { ...devices["Pixel 7"] } },
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: [
    {
      command: "pnpm --filter @sdt/api e2e:servidor",
      url: `http://127.0.0.1:${portaApi}/health`,
      reuseExistingServer: false,
      timeout: 120_000,
      stdout: "pipe",
      env: {
        NODE_ENV: "production",
        PORT: String(portaApi),
        DATABASE_URL: bancoBase.toString(),
        WEB_ORIGIN: baseURL,
        INTERNAL_API_KEY: chaveInterna,
        ADMIN_NOME: ADMIN_E2E.nome,
        ADMIN_EMAIL: ADMIN_E2E.email,
        ADMIN_SENHA: ADMIN_E2E.senha,
      },
    },
    {
      command: `pnpm start --port ${port}`,
      url: `${baseURL}/login`,
      reuseExistingServer: false,
      timeout: 120_000,
      env: {
        API_URL: `http://127.0.0.1:${portaApi}`,
        INTERNAL_API_KEY: chaveInterna,
      },
    },
  ],
});
