import { expect, test } from "@playwright/test";
import {
  cadastrarUsuario,
  criarTurmaPelaTela,
  emailUnico,
  entrarComoAdmin,
  primeiroAcesso,
} from "./apoio";

const DIAS_CURTOS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const diaEmSP = (dias: number) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(
    new Date(Date.now() + dias * 24 * 60 * 60 * 1000),
  );

test("FOCO-CA-05, FOCO-CA-06 e FOCO-CA-07: bloqueio pela agenda, conflito e liberação", async ({
  page,
}, testInfo) => {
  const marca = Math.random().toString(36).slice(2, 8);
  // Celular e computador rodam ao mesmo tempo e dois bloqueios não se sobrepõem:
  // cada projeto usa um dia só seu.
  const data = diaEmSP(testInfo.project.name === "celular" ? 33 : 53);
  const [ano, mes, dia] = data.split("-");
  const diaSemana = new Date(`${data}T12:00:00Z`).getUTCDay();
  await entrarComoAdmin(page);

  // Faixa de dias: os sete dias da semana, com o dia escolhido marcado.
  await page.goto(`/horarios?data=${data}`);
  await expect(page.getByTestId("dia-da-grade")).toContainText(`${dia}/${mes}/${ano}`);
  const faixaDeDias = page.getByRole("navigation", { name: "Escolher dia" });
  await expect(faixaDeDias.getByRole("listitem")).toHaveCount(7);
  await expect(faixaDeDias.locator('[aria-current="date"]')).toHaveAccessibleName(
    `${DIAS_CURTOS[diaSemana]} ${Number(dia)}`,
  );

  // Toca na hora livre das 15h e bloqueia até as 18h.
  const agenda = page.getByRole("list", { name: `Agenda da quadra em ${data}` });
  await agenda.getByRole("link", { name: "Bloquear às 15:00" }).click();
  const form = page.getByRole("form", { name: "Bloquear horário" });
  await expect(form.getByLabel("Das")).toHaveValue("15");
  await form.getByLabel("Até").selectOption({ label: "18:00" });
  await form.getByLabel("Motivo do bloqueio").fill(`Manutenção ${marca}`);
  await form.getByRole("button", { name: "Bloquear horário" }).click();
  await expect(page.getByText("Horário bloqueado.")).toBeVisible();
  const urlBloqueio = page.url().split("?")[0] as string;

  // Na agenda, o bloqueio é um bloco só, de 12 quartos de hora.
  await page.goto(`/horarios?data=${data}`);
  const nomeDoBloco = new RegExp(`Bloqueado: Manutenção ${marca}`);
  await expect(agenda.getByRole("link", { name: nomeDoBloco })).toHaveCount(1);
  // O localizador de dentro do filtro é relativo ao item da lista.
  const item = agenda
    .getByRole("listitem")
    .filter({ has: page.getByRole("link", { name: nomeDoBloco }) });
  await expect(item).toHaveAttribute("data-linhas", "12");
  for (const hora of ["15:00", "16:00", "17:00"]) {
    await expect(agenda.getByRole("link", { name: `Bloquear às ${hora}` })).toHaveCount(0);
  }
  await expect(agenda.getByRole("link", { name: "Bloquear às 18:00" })).toBeVisible();

  // O mesmo horário não pode ser bloqueado de novo.
  await page.goto(`/horarios/bloquear?data=${data}&hora=16`);
  const outro = page.getByRole("form", { name: "Bloquear horário" });
  await outro.getByLabel("Até").selectOption({ label: "17:00" });
  await outro.getByLabel("Motivo do bloqueio").fill("Outro motivo");
  await outro.getByRole("button", { name: "Bloquear horário" }).click();
  await expect(page.getByText(`Esse horário já está bloqueado em ${dia}/${mes}.`)).toBeVisible();

  // Liberar com motivo devolve as horas à agenda.
  await page.goto(urlBloqueio);
  const liberar = page.getByRole("form", { name: "Liberar horário" });
  await liberar.getByLabel("Motivo").fill("Manutenção adiada");
  await liberar.getByRole("button", { name: "Liberar horário" }).click();
  await expect(page.getByText(/Cancelado em .* Motivo: Manutenção adiada/)).toBeVisible();
  await page.goto(`/horarios?data=${data}`);
  await expect(agenda.getByRole("link", { name: "Bloquear às 15:00" })).toBeVisible();
});

test("FOCO-CA-05 e FOCO-CA-08: a aula da turma aparece na agenda; a atendente só vê", async ({
  page,
  browser,
}) => {
  const hoje = diaEmSP(0);
  await entrarComoAdmin(page);
  const emailAtendente = emailUnico("atendente-agenda");
  const senhaAtendente = await cadastrarUsuario(page, {
    nome: "Atendente Agenda",
    email: emailAtendente,
    perfil: "Atendente",
  });

  // Turma com aula hoje: aparece na agenda com o nível e o horário.
  const { inicio, fim } = await criarTurmaPelaTela(page, { vagas: 6 });
  const nomeDaAula = new RegExp(`Aula Iniciante · Misto, ${inicio} às ${fim}`);
  await page.goto(`/horarios?data=${hoje}`);
  const agenda = page.getByRole("list", { name: `Agenda da quadra em ${hoje}` });
  await expect(agenda.getByRole("link", { name: nomeDaAula })).toHaveCount(1);

  const contexto = await browser.newContext();
  const pessoa = await contexto.newPage();
  try {
    // A atendente vê a aula (e abre a turma para a presença), mas não bloqueia.
    await primeiroAcesso(pessoa, emailAtendente, senhaAtendente, "saque-curto-2026-q");
    await pessoa.goto(`/horarios?data=${hoje}`);
    const agendaDaAtendente = pessoa.getByRole("list", { name: `Agenda da quadra em ${hoje}` });
    await expect(agendaDaAtendente.getByRole("link", { name: nomeDaAula })).toHaveCount(1);
    await expect(agendaDaAtendente.getByRole("link", { name: /^Bloquear às/ })).toHaveCount(0);
    await pessoa.goto("/horarios/bloquear");
    await expect(pessoa.getByRole("heading", { name: "Acesso negado" })).toBeVisible();
  } finally {
    await contexto.close();
  }
});
