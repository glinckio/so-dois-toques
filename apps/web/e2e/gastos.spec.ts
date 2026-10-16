import { expect, test } from "@playwright/test";
import { cadastrarUsuario, confirmar, emailUnico, entrarComoAdmin, primeiroAcesso } from "./apoio";

const DIAS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

test("GASTO-CA-01 e GASTO-CA-02: quadra nova, turma nela e agenda por quadra", async ({ page }) => {
  test.slow();
  const marca = Math.random().toString(36).slice(2, 8);
  const nome = `Arena ${marca}`;
  await entrarComoAdmin(page);

  await page.goto("/horarios/quadras");
  const nova = page.getByRole("form", { name: "Nova quadra" });
  await nova.getByLabel("Nome da nova quadra").fill(nome);
  await nova.getByRole("button", { name: "Cadastrar quadra" }).click();
  await expect(page.getByText("Quadra cadastrada.")).toBeVisible();
  await expect(page.getByRole("list", { name: "Quadras" })).toContainText(nome);

  // A turma acontece na quadra escolhida.
  await page.goto("/aulas/turmas/nova");
  await page.getByLabel("Quadra").selectOption({ label: nome });
  await page.getByLabel("Dia da semana").selectOption({ label: DIAS[3]! });
  await page.getByLabel("Início", { exact: true }).fill("10:00");
  await page.getByLabel("Fim", { exact: true }).fill("11:00");
  await page.getByText("Misto", { exact: true }).click();
  await page.getByRole("button", { name: "Salvar turma" }).click();
  await expect(page.getByText("Turma salva.")).toBeVisible();
  await expect(page.getByText(nome, { exact: true }).first()).toBeVisible();

  // A agenda mostra uma quadra por vez; a nova aparece na escolha do topo.
  await page.goto("/horarios");
  await page
    .getByRole("navigation", { name: "Escolher quadra" })
    .getByRole("link", { name: nome })
    .click();
  await expect(page.getByRole("heading", { level: 2, name: nome })).toBeVisible();

  // Desativada, a quadra some da agenda e dos formulários, mas fica na lista.
  await page.goto("/horarios/quadras");
  const form = page.getByRole("form", { name: `Quadra ${nome}` });
  await form.getByLabel("Ativa").uncheck();
  await form.getByRole("button", { name: "Salvar" }).click();
  await expect(form.getByText("Quadra salva.")).toBeVisible();
  await page.goto("/aulas/turmas/nova");
  await expect(page.getByLabel("Quadra").getByRole("option", { name: nome })).toHaveCount(0);
});

test("GASTO-CA-03, GASTO-CA-05, GASTO-CA-06 e GASTO-CA-09: contrato mensal, gasto, estorno e acesso só do administrador", async ({
  page,
  browser,
}) => {
  test.slow();
  const marca = Math.random().toString(36).slice(2, 8);
  await entrarComoAdmin(page);

  // Contrato mensal na quadra principal.
  await page.goto("/contabil/contratos");
  const contrato = page.getByRole("form", { name: "Novo contrato mensal" });
  await contrato.getByLabel("Valor por mês (R$)").fill("850,00");
  await contrato.getByLabel("Dia do pagamento (1 a 28)").fill("28");
  await contrato.getByRole("button", { name: "Registrar contrato" }).click();
  await expect(page.getByText(/^Contrato registrado\./)).toBeVisible();
  await expect(page.getByRole("list", { name: "Contratos" })).toContainText("R$ 850,00");

  // Gasto de equipamento: entra nas saídas do mês e no Contábil.
  await page.goto("/contabil/gastos");
  await expect(page.getByTestId("saldo-em-caixa")).toContainText("R$");
  const form = page.getByRole("form", { name: "Lançar gasto" });
  await form.getByText("Equipamento", { exact: true }).click();
  await form.getByLabel("Descrição").fill(`Bolas ${marca}`);
  await form.getByLabel("Valor (R$)").fill("123,45");
  await form.getByRole("button", { name: "Lançar gasto" }).click();
  await expect(page.getByText(/^Gasto lançado\./)).toBeVisible();
  const saidas = page.getByRole("list", { name: "Saídas" });
  const item = saidas.getByRole("listitem").filter({ hasText: `Bolas ${marca}` });
  await expect(item).toContainText("R$ 123,45");

  // Estorno com motivo: o original fica marcado e entra o contrário.
  await item.locator("summary", { hasText: "Estornar" }).click();
  await item.getByLabel("Motivo").fill("Compra devolvida");
  await item.getByRole("button", { name: "Estornar" }).click();
  await confirmar(page);
  await expect(saidas.getByText("Estorno: Compra devolvida").first()).toBeVisible();
  await expect(saidas.getByRole("listitem").filter({ hasText: `Bolas ${marca}` })).toContainText(
    "Estornado",
  );

  await page.goto("/contabil");
  await expect(page.getByTestId("indicador-Saldo-em-caixa")).toBeVisible();
  await expect(page.getByTestId("indicador-Gastos")).toBeVisible();
  await expect(page.getByRole("table", { name: "Saídas por tipo" })).toContainText("Equipamentos");

  // A atendente não vê gastos, contratos nem quadras.
  const email = emailUnico("atendente-gastos");
  const senha = await cadastrarUsuario(page, {
    nome: `Atendente ${marca}`,
    email,
    perfil: "Atendente",
  });
  const contexto = await browser.newContext();
  const atendente = await contexto.newPage();
  try {
    await primeiroAcesso(atendente, email, senha, "saque-curto-2026-g");
    for (const rota of ["/contabil/gastos", "/contabil/contratos", "/horarios/quadras"]) {
      await atendente.goto(rota);
      await expect(atendente.getByRole("heading", { name: "Acesso negado" })).toBeVisible();
    }
  } finally {
    await contexto.close();
  }
});
