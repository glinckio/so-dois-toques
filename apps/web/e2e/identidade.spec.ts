import { expect, type Page, test } from "@playwright/test";
import { cadastrarUsuario, emailUnico, entrarComoAdmin, primeiroAcesso, sair } from "./apoio";

function errosDoConsole(page: Page) {
  const erros: string[] = [];
  page.on("console", (mensagem) => {
    if (mensagem.type() === "error") erros.push(mensagem.text());
  });
  return erros;
}

test("VIS-CA-02: um só menu principal, com a área aberta marcada", async ({ page }) => {
  await entrarComoAdmin(page);
  const menu = page.getByRole("navigation", { name: "Menu principal" });
  await expect(menu).toHaveCount(1);
  await expect(menu.getByRole("link", { name: "Início" })).toHaveAttribute("aria-current", "page");

  await page.goto("/aulas/alunos");
  await expect(menu.getByRole("link", { name: "Aulas" })).toHaveAttribute("aria-current", "page");
  await expect(menu.getByRole("link", { name: "Início" })).not.toHaveAttribute("aria-current");
  await expect(menu.locator('[aria-current="page"]')).toHaveCount(1);
  await expect(
    page.getByRole("navigation", { name: "Menu de Aulas" }).getByRole("link", { name: "Alunos" }),
  ).toHaveAttribute("aria-current", "page");
});

test("VIS-CA-03: o logo aparece no login e no menu, e é o ícone do site", async ({
  page,
  request,
}) => {
  await page.goto("/login");
  const logo = page.getByRole("img", { name: "Logo do Só Dois Toques" });
  await expect(logo).toBeVisible();
  expect(await logo.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);

  await entrarComoAdmin(page);
  await expect(page.getByRole("img", { name: "Só Dois Toques" }).first()).toBeVisible();

  const icone = await request.get("/icon.png");
  expect(icone.status()).toBe(200);
  expect(icone.headers()["content-type"]).toBe("image/png");
  await expect(page.locator('link[rel="icon"][href*="icon.png"]')).toHaveCount(1);
});

test("VIS-CA-04: o Início do administrador mostra o mês e o gráfico de 12 meses", async ({
  page,
}) => {
  const erros = errosDoConsole(page);
  await entrarComoAdmin(page);
  for (const kpi of ["Receitas", "Despesas", "Resultado", "A receber"]) {
    await expect(page.getByTestId(`kpi-${kpi}`)).toHaveText(/^-?R\$\s/);
  }
  const grafico = page.getByTestId("grafico-mensal");
  await expect(grafico).toBeVisible();
  await expect(grafico.getByText("Receitas", { exact: true })).toBeVisible();
  await expect(grafico.getByText("Despesas", { exact: true })).toBeVisible();

  await page.getByText("Ver em tabela").click();
  const tabela = page.getByRole("table", { name: "Comparativo mensal" });
  await expect(tabela).toBeVisible();
  await expect(tabela.getByRole("row")).toHaveCount(13);
  for (const secao of ["Caixa de hoje", "Quadras hoje", "Aulas de hoje", "Estoque"]) {
    await expect(page.getByRole("region", { name: secao })).toBeVisible();
  }
  expect(erros).toEqual([]);
});

test("VIS-CA-05: atendente e professor veem só o resumo das suas áreas", async ({
  page,
  browser,
}) => {
  await entrarComoAdmin(page);
  const emailAtendente = emailUnico("atendente-inicio");
  const senhaAtendente = await cadastrarUsuario(page, {
    nome: "Iara Inicio",
    email: emailAtendente,
    perfil: "Atendente",
  });
  const emailProfessor = emailUnico("professor-inicio");
  const senhaProfessor = await cadastrarUsuario(page, {
    nome: "Paulo Inicio",
    email: emailProfessor,
    perfil: "Professor",
  });

  const contexto = await browser.newContext();
  const pessoa = await contexto.newPage();
  try {
    await primeiroAcesso(pessoa, emailAtendente, senhaAtendente, "saque-curto-2026-a");
    for (const secao of ["Caixa de hoje", "Quadras hoje", "Estoque"]) {
      await expect(pessoa.getByRole("region", { name: secao })).toBeVisible();
    }
    await expect(pessoa.getByTestId("situacao-caixa")).toBeVisible();
    await expect(pessoa.getByRole("region", { name: "Aulas de hoje" })).toHaveCount(0);
    await expect(pessoa.getByTestId("kpi-Receitas")).toHaveCount(0);
    await expect(pessoa.getByTestId("grafico-mensal")).toHaveCount(0);

    await sair(pessoa);
    await expect(pessoa).toHaveURL("/login");
    await primeiroAcesso(pessoa, emailProfessor, senhaProfessor, "manchete-baixa-2026-p");
    await expect(pessoa.getByRole("region", { name: "Aulas de hoje" })).toBeVisible();
    for (const secao of ["Caixa de hoje", "Quadras hoje", "Estoque"]) {
      await expect(pessoa.getByRole("region", { name: secao })).toHaveCount(0);
    }
    await expect(pessoa.getByTestId("kpi-Receitas")).toHaveCount(0);
  } finally {
    await contexto.close();
  }
});

test("VIS-CA-06: o Contábil mostra gráficos com legenda e tabela, sem erros de CSP", async ({
  page,
}) => {
  const erros = errosDoConsole(page);
  await entrarComoAdmin(page);
  await page.goto("/contabil");
  const grafico = page.getByTestId("grafico-mensal");
  await expect(grafico).toBeVisible();
  await expect(grafico.getByText("Receitas", { exact: true })).toBeVisible();
  await expect(page.getByRole("table", { name: "Comparativo mensal" })).toBeVisible();
  for (const barras of ["Receitas por origem", "Despesas por tipo"]) {
    await expect(page.getByTestId(`grafico-${barras}`)).toBeVisible();
    await expect(page.getByRole("table", { name: barras })).toBeVisible();
  }
  expect(erros).toEqual([]);
});

test("VIS-CA-04: o detalhe do mês aparece ao tocar ou passar o mouse no gráfico", async ({
  page,
}) => {
  await entrarComoAdmin(page);
  const grafico = page.getByTestId("grafico-mensal").locator("svg[role=img]:visible");
  const caixa = (await grafico.boundingBox())!;
  await grafico.click({ position: { x: caixa.width - 20, y: caixa.height / 2 } });
  await expect(page.getByTestId("dica-grafico").locator("visible=true")).toContainText("Receitas");
});
