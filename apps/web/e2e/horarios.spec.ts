import { expect, test } from "@playwright/test";
import { cadastrarUsuario, emailUnico, entrarComoAdmin, primeiroAcesso } from "./apoio";

const diaEmSP = (dias: number) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(
    new Date(Date.now() + dias * 24 * 60 * 60 * 1000),
  );

test("HOR-CA-01, HOR-CA-02, HOR-CA-03, HOR-CA-07, HOR-CA-08 e HOR-CA-09: da faixa de preço à reserva paga e cancelada", async ({
  page,
  browser,
}, testInfo) => {
  const marca = Math.random().toString(36).slice(2, 8);
  // Celular e computador rodam ao mesmo tempo: cada um reserva num dia diferente.
  const data = diaEmSP(testInfo.project.name === "celular" ? 20 : 40);
  const [ano, mes, dia] = data.split("-");
  await entrarComoAdmin(page);

  // Funcionamento das 6h às 23h, R$ 80,00 a hora, todos os dias. O outro projeto pode
  // ter criado antes: aí a faixa se sobrepõe e é recusada.
  await page.goto("/horarios/faixas");
  const faixa = page.getByRole("form", { name: "Nova faixa de preço" });
  for (const d of ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]) {
    await faixa.getByLabel(d, { exact: true }).check();
  }
  await faixa.getByLabel("Das").selectOption({ label: "06:00" });
  await faixa.getByLabel("Até").selectOption({ label: "23:00" });
  await faixa.getByLabel("Valor da hora (R$)").fill("80,00");
  await faixa.getByRole("button", { name: "Criar faixa" }).click();
  await expect(faixa.getByText(/Faixa de R\$ 80,00 por hora criada\.|se sobrepõe/)).toBeVisible();
  await page.reload();
  await expect(page.getByRole("list", { name: "Faixas de preço" })).toContainText(
    "06:00 às 23:00 · R$ 80,00 por hora",
  );

  const emailAtendente = emailUnico("atendente-horarios");
  const senhaAtendente = await cadastrarUsuario(page, {
    nome: `Atendente ${marca}`,
    email: emailAtendente,
    perfil: "Atendente",
  });

  const contexto = await browser.newContext();
  const atendente = await contexto.newPage();
  try {
    await primeiroAcesso(atendente, emailAtendente, senhaAtendente, "rede-alta-2026-h");

    // Grade do dia: clica no horário livre e reserva duas horas.
    await atendente.goto(`/horarios?data=${data}`);
    await expect(atendente.getByTestId("dia-da-grade")).toContainText(`${dia}/${mes}/${ano}`);
    await atendente.getByRole("link", { name: "Reservar Quadra 1 às 19:00" }).click();
    const form = atendente.getByRole("form", { name: "Nova reserva" });
    await expect(form.getByLabel("Início")).toHaveValue("19");
    await expect(form.getByText("Bloqueio (aula, manutenção)")).toHaveCount(0);
    await form.getByLabel("Duração").selectOption({ label: "2 horas" });
    await form.getByLabel("Nome do cliente").fill(`Cliente ${marca}`);
    await form.getByLabel("Telefone (opcional)").fill("(21) 99876-5432");
    await form.getByRole("button", { name: "Reservar" }).click();

    await expect(atendente.getByText("Reserva criada.")).toBeVisible();
    await expect(
      atendente.getByRole("heading", { name: `Reserva de Cliente ${marca}` }),
    ).toBeVisible();
    await expect(atendente.getByText("19:00 às 21:00")).toBeVisible();
    await expect(atendente.getByText("R$ 160,00 · A pagar")).toBeVisible();
    await expect(atendente.getByTestId("situacao-pagamento")).toHaveText("A pagar");
    const urlReserva = atendente.url().split("?")[0] as string;

    // Pagamento no Caixa.
    const pagamento = atendente.getByRole("form", { name: "Receber pagamento" });
    await pagamento.getByLabel("Forma de pagamento").selectOption({ label: "Pix" });
    await pagamento.getByRole("button", { name: "Registrar pagamento" }).click();
    await expect(atendente.getByTestId("situacao-pagamento")).toHaveText("Pago");

    // A grade mostra o horário ocupado e pago.
    await atendente.goto(`/horarios?data=${data}`);
    const grade = atendente.getByRole("table", { name: "Grade do dia" });
    await expect(
      grade.getByRole("link", { name: new RegExp(`Cliente ${marca}`) }).first(),
    ).toContainText("Pago");
    await expect(grade.getByRole("link", { name: "Reservar Quadra 1 às 20:00" })).toHaveCount(0);

    // O mesmo horário não pode ser reservado de novo.
    await atendente.goto(`/horarios/nova?data=${data}&hora=20`);
    const outra = atendente.getByRole("form", { name: "Nova reserva" });
    await outra.getByLabel("Nome do cliente").fill("Outro cliente");
    await outra.getByRole("button", { name: "Reservar" }).click();
    await expect(outra.getByText(/Horário ocupado/)).toBeVisible();
    await expect(outra.getByLabel("Nome do cliente")).toHaveValue("Outro cliente");

    // Atendente não configura preços nem estorna; cancela com antecedência e o valor volta.
    await atendente.goto("/horarios/faixas");
    await expect(atendente.getByRole("form", { name: "Nova faixa de preço" })).toHaveCount(0);
    await atendente.goto(urlReserva);
    await expect(atendente.getByText("Estornar pagamento")).toHaveCount(0);
    await atendente.locator("summary", { hasText: "Cancelar reserva" }).click();
    const cancelar = atendente.getByRole("form", { name: "Cancelar reserva" });
    await cancelar.getByLabel("Motivo").fill("Vai chover");
    await cancelar.getByRole("button", { name: "Cancelar reserva" }).click();
    await expect(atendente.getByText(/Cancelada em .* Motivo: Vai chover/)).toBeVisible();
    await expect(
      atendente.getByText(/Estornado em .* Motivo: Cancelamento: Vai chover/),
    ).toBeVisible();

    await atendente.goto(`/horarios?data=${data}`);
    await expect(atendente.getByRole("link", { name: "Reservar Quadra 1 às 20:00" })).toBeVisible();
  } finally {
    await contexto.close();
  }

  // Administrador bloqueia um horário para aula.
  await page.goto(`/horarios/nova?data=${data}&hora=8`);
  const bloqueio = page.getByRole("form", { name: "Nova reserva" });
  await bloqueio.getByText("Bloqueio (aula, manutenção)").click();
  await bloqueio.getByLabel("Motivo do bloqueio").fill(`Aula ${marca}`);
  await bloqueio.getByRole("button", { name: "Bloquear horário" }).click();
  await expect(page.getByText("Horário bloqueado.")).toBeVisible();
  await page.goto(`/horarios?data=${data}`);
  await expect(page.getByRole("table", { name: "Grade do dia" })).toContainText(
    `Bloqueado: Aula ${marca}`,
  );

  // Professor não acessa os horários.
  const emailProfessor = emailUnico("prof-horarios");
  const senhaProfessor = await cadastrarUsuario(page, {
    nome: `Professor ${marca}`,
    email: emailProfessor,
    perfil: "Professor",
  });
  const contextoProfessor = await browser.newContext();
  const professor = await contextoProfessor.newPage();
  try {
    await primeiroAcesso(professor, emailProfessor, senhaProfessor, "rede-alta-2026-p");
    for (const rota of ["/horarios", "/horarios/nova", "/horarios/faixas"]) {
      await professor.goto(rota);
      await expect(professor.getByRole("heading", { name: "Acesso negado" })).toBeVisible();
    }
  } finally {
    await contextoProfessor.close();
  }
});
