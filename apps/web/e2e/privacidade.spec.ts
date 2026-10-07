import { expect, test } from "@playwright/test";
import { cadastrarUsuario, emailUnico, entrarComoAdmin, primeiroAcesso } from "./apoio";

test("LANC-CA-07 e LANC-CA-08: administrador vê o prazo de guarda dos clientes; atendente não acessa", async ({
  page,
  browser,
}) => {
  await entrarComoAdmin(page);
  await page.goto("/horarios");
  await page
    .getByRole("navigation", { name: "Menu dos Horários" })
    .getByRole("link", { name: "Privacidade" })
    .click();
  await expect(page.getByRole("heading", { name: "Privacidade dos clientes" })).toBeVisible();
  // Banco dos testes não tem reservas com mais de 12 meses.
  await expect(page.getByRole("region", { name: "Reservas além do prazo" })).toContainText(
    "0 reservas avulsas e 0 reservas fixas com dados de cliente",
  );
  await expect(page.getByText("Nada para anonimizar agora.")).toBeVisible();

  const email = emailUnico("atendente-privacidade");
  const senha = await cadastrarUsuario(page, {
    nome: "Atendente privacidade",
    email,
    perfil: "Atendente",
  });
  const contexto = await browser.newContext();
  const atendente = await contexto.newPage();
  try {
    await primeiroAcesso(atendente, email, senha, "rede-alta-2026-p");
    await atendente.goto("/horarios");
    await expect(
      atendente
        .getByRole("navigation", { name: "Menu dos Horários" })
        .getByRole("link", { name: "Privacidade" }),
    ).toHaveCount(0);
    await atendente.goto("/horarios/privacidade");
    await expect(atendente.getByRole("heading", { name: "Acesso negado" })).toBeVisible();
  } finally {
    await contexto.close();
  }
});
