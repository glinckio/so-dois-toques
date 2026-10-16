import { expect, test, type Page } from "@playwright/test";
import { confirmar, entrarComoAdmin } from "./apoio";
import { EVOLUTION_FALSO } from "./dados";

/** PNG de 1×1 para os anexos. */
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

/** Simula uma mensagem chegando do WhatsApp no microserviço falso. */
async function receber(page: Page, numero: string, texto: string, nome?: string) {
  const r = await page.request.post(`${EVOLUTION_FALSO}/__teste/receber`, {
    data: { numero, texto, nome },
  });
  expect(r.ok()).toBe(true);
}

// O número da escola é um só para o servidor de testes inteiro: o fluxo roda no desktop,
// de ponta a ponta, e no fim confere o layout do celular.
test("CHAT-CA-03, CHAT-CA-04, CHAT-CA-06, CHAT-CA-08 e CHAT-CA-11: conecta, conversa, recebe ao vivo e sem tempo real", async ({
  page,
}, info) => {
  test.skip(info.project.name !== "desktop", "um número só por servidor de testes");
  test.slow();
  const numero = `55519${String(Date.now()).slice(-8)}`;
  await receber(page, numero, "Oi, tem vaga na turma de sábado?", "Interessada E2E");

  await entrarComoAdmin(page);

  // CHAT-CA-03: conexão pelo QR code.
  await page.goto("/chat/conexao");
  const desconectar = page.getByRole("button", { name: "Desconectar o número" });
  if (await desconectar.isVisible()) {
    await desconectar.click();
    await confirmar(page);
    await expect(page.getByText("WhatsApp desconectado do sistema.")).toBeVisible();
  }
  await page.getByRole("button", { name: "Conectar pelo QR code" }).click();
  await expect(page.getByTestId("qrcode")).toBeVisible();
  await page.request.post(`${EVOLUTION_FALSO}/__teste/conectar`);
  await expect(page.getByText("WhatsApp conectado. As conversas já aparecem no Chat.")).toBeVisible(
    {
      timeout: 15_000,
    },
  );

  // CHAT-CA-04: a conversa aparece na lista e abre.
  await page.goto("/chat");
  const conversa = page.getByTestId("conversa").filter({ hasText: "Interessada E2E" });
  await expect(conversa).toBeVisible();
  await conversa.click();
  await expect(page.getByTestId("titulo-conversa")).toHaveText("Interessada E2E");
  await expect(
    page.getByRole("list", { name: "Mensagens" }).getByText("Oi, tem vaga na turma de sábado?"),
  ).toBeVisible();

  // CHAT-CA-06 e 09: texto com emoji, enviado com Enter, mostra quem enviou.
  const campo = page.getByLabel("Mensagem", { exact: true });
  await campo.fill("Temos sim! Às 9h 🏐");
  await campo.press("Enter");
  const enviada = page.getByTestId("mensagem").filter({ hasText: "Temos sim! Às 9h 🏐" });
  await expect(enviada).toBeVisible();
  await expect(enviada).toContainText("Administração E2E");

  // CHAT-CA-08: mensagem recebida aparece sozinha, sem recarregar.
  await receber(page, numero, "Que ótimo, obrigada!");
  await expect(
    page.getByRole("list", { name: "Mensagens" }).getByText("Que ótimo, obrigada!"),
  ).toBeVisible({ timeout: 5_000 });

  // CHAT-CA-06: foto com legenda pelo anexo.
  await page.getByTestId("arquivo-anexo").setInputFiles({
    name: "quadra.png",
    mimeType: "image/png",
    buffer: PNG,
  });
  await expect(page.getByTestId("previa-anexo")).toBeVisible();
  await page.getByLabel("Legenda").fill("Nossa quadra");
  await page.getByRole("button", { name: "Enviar", exact: true }).click();
  await expect(
    page
      .locator('[data-testid="mensagem"][data-tipo="imagem"]')
      .filter({ hasText: "Nossa quadra" }),
  ).toBeVisible();

  // Reação numa mensagem recebida.
  const recebida = page.getByTestId("mensagem").filter({ hasText: "Que ótimo, obrigada!" });
  await recebida.hover();
  await recebida.getByRole("button", { name: "Ações da mensagem" }).click();
  await recebida.getByRole("button", { name: "Reagir com ❤️" }).click();
  await expect(recebida.getByLabel("Reações: ❤️")).toBeVisible();

  // CHAT-CA-11: número sem WhatsApp é avisado.
  await page.getByRole("button", { name: "Nova conversa" }).click();
  await page.getByLabel("Número com DDD").fill("(51) 99999-0000");
  await page.getByRole("button", { name: "Abrir", exact: true }).click();
  await expect(page.getByText("Este número não tem WhatsApp.")).toBeVisible();

  // CHAT-CA-08: sem os eventos ao vivo, a tela atualiza sozinha.
  await page.route("**/chat/eventos", (rota) => rota.abort());
  await page.goto(`/chat?numero=${numero}`);
  await expect(page.getByTestId("titulo-conversa")).toHaveText("Interessada E2E");
  await receber(page, numero, "Mensagem sem tempo real");
  await expect(
    page.getByRole("list", { name: "Mensagens" }).getByText("Mensagem sem tempo real"),
  ).toBeVisible({ timeout: 15_000 });
  await page.unroute("**/chat/eventos");

  // No celular, uma tela de cada vez.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/chat?numero=${numero}`);
  await expect(page.getByTestId("titulo-conversa")).toBeVisible();
  await expect(page.getByLabel("Buscar conversa")).toBeHidden();
  await page.getByRole("button", { name: "Voltar para as conversas" }).click();
  await expect(page.getByLabel("Buscar conversa")).toBeVisible();
});
