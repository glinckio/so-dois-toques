import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { cadastrarUsuario, emailUnico, entrarComoAdmin, primeiroAcesso } from "./apoio";

test("CONT-CA-01, CONT-CA-02, CONT-CA-03, CONT-CA-09 e CONT-CA-10: painel do mês, período, planilha e acesso só do administrador", async ({
  page,
  browser,
}) => {
  const marca = Math.random().toString(36).slice(2, 8);
  await entrarComoAdmin(page);
  await page.goto("/contabil");
  await expect(page.getByRole("heading", { level: 1, name: "Contábil" })).toBeVisible();
  for (const indicador of ["Receitas", "Despesas", "Resultado", "Margem"]) {
    await expect(page.getByTestId(`indicador-${indicador}`)).toBeVisible();
  }
  await expect(page.getByTestId("conferencia")).toContainText("Confere com o Caixa");
  for (const tabela of [
    "Receitas por origem",
    "Despesas por tipo",
    "Ocupação das quadras",
    "Formas de pagamento",
    "Comparativo mensal",
  ]) {
    await expect(page.getByRole("table", { name: tabela })).toBeVisible();
  }
  await expect(
    page.getByRole("table", { name: "Comparativo mensal" }).getByRole("row"),
  ).toHaveCount(13);

  // Mês escolhido e período inválido.
  await page.goto("/contabil?competencia=2026-02");
  await expect(page.getByTestId("periodo")).toContainText("01/02/2026 a 28/02/2026");
  await page.goto("/contabil?de=2026-03-10&ate=2026-03-01");
  await expect(page.getByText("O início precisa ser antes do fim.")).toBeVisible();

  // Planilha dos lançamentos.
  await page.goto("/contabil?competencia=2026-02");
  const baixando = page.waitForEvent("download");
  await page.getByRole("link", { name: "Baixar lançamentos (CSV)" }).click();
  const download = await baixando;
  expect(download.suggestedFilename()).toBe("lancamentos-2026-02-01-a-2026-02-28.csv");
  const caminho = await download.path();
  expect(readFileSync(caminho, "utf8")).toContain('"Data";"Tipo";"Categoria"');

  // Atendente não acessa.
  const email = emailUnico("atendente-contabil");
  const senha = await cadastrarUsuario(page, {
    nome: `Atendente ${marca}`,
    email,
    perfil: "Atendente",
  });
  const contexto = await browser.newContext();
  const atendente = await contexto.newPage();
  try {
    await primeiroAcesso(atendente, email, senha, "rede-alta-2026-c");
    await atendente.goto("/contabil");
    await expect(atendente.getByRole("heading", { name: "Acesso negado" })).toBeVisible();
    const negada = await atendente.goto("/contabil/exportar");
    expect(negada?.status()).toBe(403);
  } finally {
    await contexto.close();
  }
});
