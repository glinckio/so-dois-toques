import { expect, test } from "@playwright/test";
import { cadastrarUsuario, emailUnico, entrarComoAdmin, primeiroAcesso } from "./apoio";

// Roda num projeto à parte, um de cada vez: só existe um caixa (playwright.config.ts).

test("CAIXA-CA-01, CAIXA-CA-02, CAIXA-CA-04, CAIXA-CA-05, CAIXA-CA-06 e CAIXA-CA-07: atendente abre, lança, fecha; administrador estorna", async ({
  page,
  browser,
}) => {
  const marca = Math.random().toString(36).slice(2, 8);
  await entrarComoAdmin(page);
  const emailAtendente = emailUnico("atendente-turno");
  const senhaAtendente = await cadastrarUsuario(page, {
    nome: `Atendente ${marca}`,
    email: emailAtendente,
    perfil: "Atendente",
  });
  const emailProfessor = emailUnico("prof-turno");
  const senhaProfessor = await cadastrarUsuario(page, {
    nome: `Professor ${marca}`,
    email: emailProfessor,
    perfil: "Professor",
  });

  const contexto = await browser.newContext();
  const atendente = await contexto.newPage();
  try {
    await primeiroAcesso(atendente, emailAtendente, senhaAtendente, "rede-alta-2026-t");

    // Abertura.
    await atendente.goto("/caixa");
    const fechado = atendente.getByRole("region", { name: "Caixa fechado" });
    await fechado.getByLabel("Troco na gaveta (R$)").fill("50,00");
    await fechado.getByRole("button", { name: "Abrir caixa" }).click();
    await expect(atendente.getByTestId("turno-aberto")).toContainText(`Atendente ${marca}`);
    await expect(atendente.getByTestId("turno-aberto")).toContainText("troco R$ 50,00");

    // Avulsos: sangria em Pix é recusada; despesa em dinheiro entra.
    const avulso = atendente.getByRole("form", { name: "Lançamento avulso" });
    await avulso.getByLabel("Tipo").selectOption("SANGRIA");
    await avulso.getByLabel("Forma").selectOption({ label: "Pix" });
    await avulso.getByLabel("Valor (R$)").fill("10,00");
    await avulso.getByLabel("Descrição").fill("Levar ao cofre");
    await avulso.getByRole("button", { name: "Registrar lançamento" }).click();
    await expect(avulso.getByText("Suprimento e sangria são só em dinheiro.")).toBeVisible();
    // O que foi digitado continua no formulário depois do erro.
    await expect(avulso.getByLabel("Descrição")).toHaveValue("Levar ao cofre");

    const despesa = `Garrafões de água ${marca}`;
    await avulso.getByLabel("Tipo").selectOption("DESPESA");
    await avulso.getByLabel("Forma").selectOption({ label: "Dinheiro" });
    await avulso.getByLabel("Valor (R$)").fill("12,50");
    await avulso.getByLabel("Descrição").fill(despesa);
    await avulso.getByRole("button", { name: "Registrar lançamento" }).click();
    await expect(avulso.getByText("Lançamento registrado.")).toBeVisible();
    await expect(atendente.getByText(despesa)).toBeVisible();
    // Atendente não estorna.
    await expect(atendente.getByText("Estornar", { exact: true })).toHaveCount(0);

    // Administrador estorna o avulso.
    await page.goto("/caixa");
    const linha = page.getByRole("listitem").filter({ hasText: despesa });
    await linha.getByText("Estornar", { exact: true }).click();
    await linha.getByLabel("Motivo").fill("Lançado errado");
    await linha.getByRole("button", { name: "Estornar lançamento" }).click();
    await expect(page.getByText(`Estorno: ${despesa}`)).toBeVisible();

    // Fechamento com diferença exige observação.
    await atendente.reload();
    const fechamento = atendente.getByRole("form", { name: "Fechar caixa" });
    await fechamento.getByLabel("Dinheiro contado (R$)").fill("1,00");
    await fechamento.getByRole("button", { name: "Fechar caixa" }).click();
    await expect(fechamento.getByText(/explique a diferença na observação/)).toBeVisible();
    await fechamento
      .getByLabel("Observação (obrigatória se não bater)")
      .fill("Conferência do teste");
    await fechamento.getByRole("button", { name: "Fechar caixa" }).click();

    // Relatório do turno.
    await expect(atendente.getByRole("heading", { name: "Turno do caixa" })).toBeVisible();
    await expect(atendente.getByText(/Caixa fechado\. Diferença de/)).toBeVisible();
    const resumo = atendente.getByLabel("Resumo do turno");
    await expect(resumo).toContainText("R$ 50,00");
    await expect(resumo).toContainText("R$ 1,00");
    await expect(resumo).toContainText("Conferência do teste");
    await expect(atendente.getByLabel("Lançamentos do turno")).toContainText(despesa);
    await expect(atendente.getByLabel("Lançamentos do turno")).toContainText(`Estorno: ${despesa}`);
    await expect(
      atendente.getByRole("button", { name: "Imprimir ou salvar em PDF" }),
    ).toBeVisible();

    await atendente.goto("/caixa/turnos");
    await expect(atendente.getByLabel("Turnos").getByRole("listitem").first()).toContainText(
      `fechado por Atendente ${marca}`,
    );
    await atendente.goto("/caixa");
    await expect(atendente.getByRole("region", { name: "Caixa fechado" })).toBeVisible();
  } finally {
    await contexto.close();
  }

  // Professor não acessa o caixa.
  const contextoProfessor = await browser.newContext();
  const professor = await contextoProfessor.newPage();
  try {
    await primeiroAcesso(professor, emailProfessor, senhaProfessor, "rede-alta-2026-p");
    for (const rota of ["/caixa", "/caixa/turnos"]) {
      await professor.goto(rota);
      await expect(professor.getByRole("heading", { name: "Acesso negado" })).toBeVisible();
    }
  } finally {
    await contextoProfessor.close();
  }
});
