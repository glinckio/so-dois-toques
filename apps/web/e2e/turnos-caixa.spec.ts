import { expect, test } from "@playwright/test";
import { cadastrarUsuario, confirmar, emailUnico, entrarComoAdmin, primeiroAcesso } from "./apoio";

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

    await test.step("VIVO-CA-08: o painel mostra há quanto tempo o caixa está aberto e atualiza sozinho", async () => {
      await expect(atendente.getByTestId("tempo-aberto")).toHaveText(
        /Aberto há (menos de 1 min|1 min)/,
      );
      // Outra pessoa abre o painel com o relógio do navegador controlado: dois minutos
      // depois, sem recarregar a página, o tempo já mudou.
      const contextoRelogio = await browser.newContext();
      try {
        const painel = await contextoRelogio.newPage();
        await painel.clock.install();
        await entrarComoAdmin(painel);
        await painel.goto("/caixa");
        const tempo = painel.getByTestId("tempo-aberto");
        await expect(tempo).toHaveText(/Aberto há (menos de 1 min|\d+ min)/);
        const antes = (await tempo.textContent()) ?? "";
        await painel.clock.fastForward("02:00");
        await expect(tempo).not.toHaveText(antes);
        await expect(tempo).toHaveText(/Aberto há \d+ min/);
      } finally {
        await contextoRelogio.close();
      }
    });

    // Avulsos: sangria em Pix é recusada; despesa em dinheiro entra. Tipo e forma são
    // escolhidos em blocos; escolher sangria já marca o dinheiro.
    const avulso = atendente.getByRole("form", { name: "Lançamento avulso" });
    await avulso.getByText("Sangria", { exact: true }).click();
    await expect(avulso.getByRole("radio", { name: "Dinheiro", exact: true })).toBeChecked();
    await avulso.getByText("Pix", { exact: true }).click();
    await expect(avulso.getByRole("radio", { name: "Pix" })).toBeChecked();
    await avulso.getByLabel("Valor (R$)").fill("10,00");
    await avulso.getByLabel("Descrição").fill("Levar ao cofre");
    await avulso.getByRole("button", { name: "Registrar lançamento" }).click();
    await expect(avulso.getByRole("alert")).toHaveText("Suprimento e sangria são só em dinheiro.");
    // O que foi digitado continua no formulário depois do erro.
    await expect(avulso.getByLabel("Descrição")).toHaveValue("Levar ao cofre");

    const despesa = `Garrafões de água ${marca}`;
    // O que foi escolhido também volta marcado.
    await expect(avulso.getByRole("radio", { name: /^Sangria/ })).toBeChecked();
    await avulso.getByText("Despesa", { exact: true }).click();
    await avulso.getByText("Dinheiro", { exact: true }).click();
    await expect(avulso.getByText("Sai do caixa em dinheiro")).toBeVisible();
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
    await confirmar(page);
    await expect(page.getByText(`Estorno: ${despesa}`)).toBeVisible();

    // Fechamento com diferença exige observação.
    await atendente.reload();
    const fechamento = atendente.getByRole("form", { name: "Fechar caixa" });
    await fechamento.getByLabel("Dinheiro contado (R$)").fill("1,00");
    // A diferença aparece enquanto se digita, antes de enviar.
    await expect(fechamento.getByTestId("diferenca-fechamento")).toContainText("Não bateu");
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
