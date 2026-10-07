import { expect, test, type Page } from "@playwright/test";
import { entrarComoAdmin } from "./apoio";

const DIAS_CURTOS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const diaEmSP = (dias: number) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(
    new Date(Date.now() + dias * 24 * 60 * 60 * 1000),
  );

/**
 * Funcionamento das 6h às 23h, R$ 80,00 a hora, todos os dias: a mesma faixa de
 * horarios.spec.ts. Quem chegar depois recebe "se sobrepõe", e tudo bem.
 */
async function garantirFaixas(page: Page) {
  await page.goto("/horarios/faixas");
  const faixa = page.getByRole("form", { name: "Nova faixa de preço" });
  for (const d of DIAS_CURTOS) {
    await faixa.getByLabel(d, { exact: true }).check();
  }
  await faixa.getByLabel("Das").selectOption({ label: "06:00" });
  await faixa.getByLabel("Até").selectOption({ label: "23:00" });
  await faixa.getByLabel("Valor da hora (R$)").fill("80,00");
  await faixa.getByRole("button", { name: "Criar faixa" }).click();
  await expect(faixa.getByText(/Faixa de R\$ 80,00 por hora criada\.|se sobrepõe/)).toBeVisible();
}

test("VIVO-CA-06: a faixa de dias marca o dia escolhido e uma reserva de três horas é um único bloco na grade", async ({
  page,
}, testInfo) => {
  const marca = Math.random().toString(36).slice(2, 8);
  // Celular e computador rodam ao mesmo tempo e as quadras não aceitam reservas
  // sobrepostas: cada projeto usa um dia só seu (horarios.spec.ts usa +20 e +40 dias).
  const data = diaEmSP(testInfo.project.name === "celular" ? 33 : 53);
  const [ano, mes, dia] = data.split("-");
  const diaSemana = new Date(`${data}T12:00:00Z`).getUTCDay();
  await entrarComoAdmin(page);
  await garantirFaixas(page);

  // Faixa de dias: os sete dias da semana, com o dia escolhido marcado.
  await page.goto(`/horarios?data=${data}`);
  await expect(page.getByTestId("dia-da-grade")).toContainText(`${dia}/${mes}/${ano}`);
  const faixaDeDias = page.getByRole("navigation", { name: "Escolher dia" });
  await expect(faixaDeDias.getByRole("listitem")).toHaveCount(7);
  const escolhido = faixaDeDias.locator('[aria-current="date"]');
  await expect(escolhido).toHaveCount(1);
  await expect(escolhido).toHaveAccessibleName(`${DIAS_CURTOS[diaSemana]} ${Number(dia)}`);

  // Reserva de três horas a partir da célula livre da Quadra 2 às 15h.
  const grade = page.getByRole("table", { name: "Grade do dia" });
  await grade.getByRole("link", { name: "Reservar Quadra 2 às 15:00" }).click();
  const form = page.getByRole("form", { name: "Nova reserva" });
  await expect(form.getByLabel("Início")).toHaveValue("15");
  await form.getByText("3 horas", { exact: true }).click();
  await expect(form.getByLabel("3 horas")).toBeChecked();
  await form.getByLabel("Nome do cliente").fill(`Bloco ${marca}`);
  await form.getByRole("button", { name: "Reservar" }).click();
  await expect(page.getByText("Reserva criada.")).toBeVisible();
  await expect(page.getByText("15:00 às 18:00")).toBeVisible();

  // Na grade, a reserva é um bloco só, que abrange as linhas das 15h, 16h e 17h.
  await page.goto(`/horarios?data=${data}`);
  const nomeDoBloco = new RegExp(`Bloco ${marca}`);
  const bloco = grade.getByRole("link", { name: nomeDoBloco });
  await expect(bloco).toHaveCount(1);
  await expect(bloco).toContainText("15:00 às 18:00");
  // A célula do bloco abrange três linhas da tabela (o localizador interno é relativo à célula).
  await expect(
    grade.getByRole("cell").filter({ has: page.getByRole("link", { name: nomeDoBloco }) }),
  ).toHaveAttribute("aria-rowspan", "3");
  for (const hora of ["15:00", "16:00", "17:00"]) {
    await expect(grade.getByRole("link", { name: `Reservar Quadra 2 às ${hora}` })).toHaveCount(0);
  }
  await expect(grade.getByRole("link", { name: "Reservar Quadra 2 às 18:00" })).toBeVisible();

  // O bloco começa na linha das 15h e termina onde começa a linha das 18h (a entrada
  // animada pode estar terminando: tenta de novo até as posições baterem).
  const as15 = grade.getByRole("rowheader", { name: "15:00", exact: true });
  const as18 = grade.getByRole("rowheader", { name: "18:00", exact: true });
  await expect(async () => {
    const [caixa, linha15, linha18] = await Promise.all([
      bloco.boundingBox(),
      as15.boundingBox(),
      as18.boundingBox(),
    ]);
    expect(caixa).not.toBeNull();
    expect(linha15).not.toBeNull();
    expect(linha18).not.toBeNull();
    expect(Math.abs(caixa!.y - linha15!.y)).toBeLessThan(10);
    expect(Math.abs(caixa!.y + caixa!.height - linha18!.y)).toBeLessThan(10);
  }).toPass();
});
