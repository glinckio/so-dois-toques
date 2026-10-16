import { expect, test } from "@playwright/test";
import { confirmar, entrarComoAdmin } from "./apoio";

test("FEED-CA-01, FEED-CA-06 e FEED-CA-07: responde sem login e o administrador lê, marca e remove", async ({
  page,
  browser,
}) => {
  test.slow();
  const marca = `Aulas show ${Math.random().toString(36).slice(2, 8)}`;

  // Sem login: o formulário abre direto.
  const visitante = await browser.newContext();
  const aluno = await visitante.newPage();
  await aluno.goto("/avaliar");
  await expect(aluno).toHaveURL("/avaliar");
  await expect(aluno.getByRole("heading", { name: "Como estão as aulas?" })).toBeVisible();
  await aluno.getByTitle("Boa", { exact: true }).click();
  await expect(aluno.getByRole("radio", { name: "4 de 5, Boa" })).toBeChecked();
  await aluno.getByLabel("O que você está achando das aulas? (opcional)").fill(marca);
  await aluno.getByLabel("O que podemos melhorar? (opcional)").fill("<b>Mais</b> horários");
  await aluno.getByRole("button", { name: "Enviar resposta" }).click();
  await expect(aluno.getByTestId("agradecimento")).toBeVisible();
  await visitante.close();

  // O administrador vê a resposta nova no Início e no painel.
  await entrarComoAdmin(page);
  await expect(page.getByTestId("feedback-nao-lido")).toBeVisible();
  await page.goto("/feedback");
  const resposta = page.getByTestId("resposta-feedback").filter({ hasText: marca });
  await expect(resposta).toBeVisible();
  await expect(resposta.getByText("Nova")).toBeVisible();
  await expect(resposta.getByText("Anônimo")).toBeVisible();
  // FEED-CA-09: o HTML aparece como texto.
  await expect(resposta.getByText("<b>Mais</b> horários")).toBeVisible();
  await expect(page.getByTestId("link-feedback")).toHaveValue(/\/avaliar$/);

  await resposta.getByRole("button", { name: "Marcar como lida" }).click();
  await expect(resposta.getByText("Nova")).toHaveCount(0);

  await resposta.getByRole("button", { name: "Remover" }).click();
  await confirmar(page);
  await expect(page.getByTestId("resposta-feedback").filter({ hasText: marca })).toHaveCount(0);
});
