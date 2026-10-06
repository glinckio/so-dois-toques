import { expect, type Page, test } from "@playwright/test";
import { cadastrarUsuario, emailUnico, entrarComoAdmin, primeiroAcesso } from "./apoio";

// Roda num projeto à parte, depois dos testes do caixa: a venda precisa do caixa aberto.

const hojeSP = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());

async function abrirCaixaSeFechado(page: Page) {
  await page.goto("/caixa");
  const fechado = page.getByRole("region", { name: "Caixa fechado" });
  if (await fechado.isVisible()) {
    await fechado.getByRole("button", { name: "Abrir caixa" }).click();
    await expect(page.getByTestId("turno-aberto")).toBeVisible();
  }
}

test("ESTQ-CA-01, ESTQ-CA-02, ESTQ-CA-03, ESTQ-CA-05, ESTQ-CA-06, ESTQ-CA-07 e ESTQ-CA-08: do produto à venda e ao extrato", async ({
  page,
  browser,
}) => {
  const marca = Math.random().toString(36).slice(2, 8);
  await entrarComoAdmin(page);

  // Produto.
  await page.goto("/estoque");
  const nome = `Água ${marca}`;
  const cadastro = page.getByRole("form", { name: "Cadastrar produto" });
  await cadastro.getByLabel("Nome do produto").fill(nome);
  await cadastro.getByLabel("Preço de venda (R$)").fill("5,00");
  await cadastro.getByLabel("Estoque mínimo").fill("3");
  await cadastro.getByRole("button", { name: "Cadastrar produto" }).click();
  await expect(page.getByText(`Produto ${nome} cadastrado.`)).toBeVisible();

  // Atendente dá entrada na compra e vende.
  const emailAtendente = emailUnico("atendente-estoque");
  const senhaAtendente = await cadastrarUsuario(page, {
    nome: `Atendente ${marca}`,
    email: emailAtendente,
    perfil: "Atendente",
  });
  await abrirCaixaSeFechado(page);

  const contexto = await browser.newContext();
  const atendente = await contexto.newPage();
  try {
    await primeiroAcesso(atendente, emailAtendente, senhaAtendente, "rede-alta-2026-e");
    await atendente.goto("/estoque/compra");
    const compra = atendente.getByRole("form", { name: "Registrar compra" });
    await compra.getByLabel("Produto").selectOption({ label: `${nome} (tem 0)` });
    await compra.getByLabel("Quantidade").fill("6");
    await compra.getByLabel("Valor total pago (R$)").fill("12,00");
    await compra.getByLabel("Forma de pagamento").selectOption({ label: "Dinheiro" });
    await compra.getByRole("button", { name: "Registrar compra" }).click();
    await expect(compra.getByText("Compra registrada e lançada no Caixa.")).toBeVisible();

    await atendente.goto("/estoque/venda");
    const venda = atendente.getByRole("form", { name: "Registrar venda" });
    // Mais do que tem: a venda é recusada.
    await venda.getByLabel(nome).fill("7");
    await expect(venda.getByTestId("total-venda")).toHaveText("Total: R$ 35,00");
    // O campo já limita ao saldo; tira o limite para ver a recusa da API.
    await venda.getByLabel(nome).evaluate((campo) => campo.removeAttribute("max"));
    await venda.getByRole("button", { name: "Registrar venda" }).click();
    await expect(venda.getByText(/Saldo insuficiente/)).toBeVisible();
    await venda.getByLabel(nome).fill("4");
    await venda.getByText("Dinheiro").click();
    await expect(venda.getByTestId("total-venda")).toHaveText("Total: R$ 20,00");
    await venda.getByRole("button", { name: "Registrar venda" }).click();
    await expect(venda.getByText("Venda de R$ 20,00 registrada.")).toBeVisible();
    await expect(venda.getByTestId("total-venda")).toHaveText("Total: R$ 0,00");

    // Atendente vê o estoque abaixo do mínimo, mas não ajusta.
    await atendente.goto("/estoque");
    await expect(atendente.getByText(`Abaixo do mínimo: ${nome} (2)`)).toBeVisible();
    await expect(atendente.getByRole("form", { name: "Cadastrar produto" })).toHaveCount(0);
    await atendente.getByRole("link", { name: nome }).click();
    await expect(atendente.getByTestId("resumo-produto")).toContainText("2 em estoque");
    await expect(atendente.getByRole("form", { name: "Ajustar estoque" })).toHaveCount(0);
  } finally {
    await contexto.close();
  }

  // Administrador: venda no Caixa, estorno e ajuste.
  await page.goto(`/caixa?data=${hojeSP()}`);
  await expect(page.getByText(`Venda: 4 × ${nome}`)).toBeVisible();
  await expect(page.getByText(`Compra: 6 × ${nome}`)).toBeVisible();

  await page.goto("/estoque/vendas");
  const vendaDoDia = page.getByRole("listitem").filter({ hasText: `4 × ${nome}` });
  await vendaDoDia.getByText("Estornar", { exact: true }).click();
  await vendaDoDia.getByLabel("Motivo").fill("Cliente desistiu");
  await vendaDoDia.getByRole("button", { name: "Estornar venda" }).click();
  await expect(vendaDoDia.getByText(/Estornada em .* Motivo: Cliente desistiu/)).toBeVisible();

  await page.goto("/estoque");
  await page.getByRole("link", { name: nome }).click();
  await expect(page.getByTestId("resumo-produto")).toContainText("6 em estoque");
  const ajuste = page.getByRole("form", { name: "Ajustar estoque" });
  await ajuste.getByLabel("Quantidade").fill("-1");
  await ajuste.getByLabel("Motivo").fill("Garrafa furada");
  await ajuste.getByRole("button", { name: "Ajustar" }).click();
  await expect(ajuste.getByText("Estoque ajustado.")).toBeVisible();
  await expect(page.getByTestId("resumo-produto")).toContainText("5 em estoque");
  const movimentos = page.getByRole("table", { name: "Movimentações" });
  await expect(movimentos).toContainText("Garrafa furada");
  await expect(movimentos).toContainText("Estorno de venda");
  await expect(movimentos).toContainText("Compra");

  // Professor não acessa o estoque.
  const emailProfessor = emailUnico("prof-estoque");
  const senhaProfessor = await cadastrarUsuario(page, {
    nome: `Professor ${marca}`,
    email: emailProfessor,
    perfil: "Professor",
  });
  const contextoProfessor = await browser.newContext();
  const professor = await contextoProfessor.newPage();
  try {
    await primeiroAcesso(professor, emailProfessor, senhaProfessor, "rede-alta-2026-q");
    for (const rota of ["/estoque", "/estoque/venda", "/estoque/compra"]) {
      await professor.goto(rota);
      await expect(professor.getByRole("heading", { name: "Acesso negado" })).toBeVisible();
    }
  } finally {
    await contextoProfessor.close();
  }
});
