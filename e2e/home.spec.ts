import { expect, test } from "@playwright/test";

test("FUND-CA-01: a página inicial abre em português com os módulos", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });

  await page.goto("/");

  await expect(page).toHaveTitle("Só Dois Toques");
  await expect(page.locator("html")).toHaveAttribute("lang", "pt-BR");
  await expect(page.getByRole("heading", { level: 1, name: "Só Dois Toques" })).toBeVisible();
  for (const modulo of ["Aulas", "Horários", "Estoque", "Contábil"]) {
    await expect(page.getByRole("heading", { level: 2, name: modulo })).toBeVisible();
  }
  // Nenhum script ou estilo bloqueado pela CSP.
  expect(errors).toEqual([]);
});

test("FUND-CA-02: a resposta traz os cabeçalhos de segurança", async ({ request }) => {
  const first = await request.get("/");
  const second = await request.get("/");
  const headers = first.headers();

  expect(headers["content-security-policy"]).toMatch(/script-src 'self' 'nonce-[^']+'/);
  expect(headers["x-frame-options"]).toBe("DENY");
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["strict-transport-security"]).toContain("max-age=");
  expect(headers["x-powered-by"]).toBeUndefined();
  // Um nonce novo a cada requisição.
  expect(second.headers()["content-security-policy"]).not.toBe(headers["content-security-policy"]);
});

test("FUND-CA-04: o health check responde sem expor detalhes", async ({ request }) => {
  const response = await request.get("/api/health");
  expect(response.status()).toBe(200);
  expect(await response.json()).toEqual({ status: "ok", database: "ok" });
  expect(response.headers()["cache-control"]).toContain("no-store");
});

test("página inexistente responde 404 em português", async ({ page }) => {
  const response = await page.goto("/nao-existe");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "Página não encontrada" })).toBeVisible();
});
