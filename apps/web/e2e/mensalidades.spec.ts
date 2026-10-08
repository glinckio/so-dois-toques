import { expect, test } from "@playwright/test";
import { cadastrarUsuario, confirmar, emailUnico, entrarComoAdmin, primeiroAcesso } from "./apoio";

const MESES = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];
const hojeSP = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
const nomeDoMes = (data: string) => `${MESES[Number(data.slice(5, 7)) - 1]} de ${data.slice(0, 4)}`;

test("MENS-CA-01, MENS-CA-02, MENS-CA-05, MENS-CA-09, MENS-CA-11, MENS-CA-12, MENS-CA-17 e MENS-CA-18: do plano ao recibo e ao Caixa", async ({
  page,
  browser,
}) => {
  const marca = Math.random().toString(36).slice(2, 8);
  const mes = nomeDoMes(hojeSP());
  await entrarComoAdmin(page);

  // Atendente que vai receber o pagamento.
  const emailAtendente = emailUnico("atendente-caixa");
  const nomeAtendente = `Atendente ${marca}`;
  const senhaTemporaria = await cadastrarUsuario(page, {
    nome: nomeAtendente,
    email: emailAtendente,
    perfil: "Atendente",
  });

  // Plano.
  await page.goto("/aulas/planos");
  const nomePlano = `Plano 2x ${marca}`;
  const formPlano = page.getByRole("form", { name: "Cadastrar plano" });
  await formPlano.getByLabel("Nome do plano").fill(nomePlano);
  await formPlano.getByLabel("Aulas por semana").fill("2");
  await formPlano.getByLabel("Valor mensal (R$)").fill("150,5");
  await formPlano.getByRole("button", { name: "Cadastrar plano" }).click();
  await expect(page.getByText(`Plano ${nomePlano} cadastrado.`)).toBeVisible();
  await expect(page.getByText("R$ 150,50 por mês").first()).toBeVisible();

  // Aluno com o plano, com desconto.
  await page.goto("/aulas/alunos/novo");
  const nomeAluno = `Carla Caixa ${marca}`;
  await page.getByLabel("Nome", { exact: true }).fill(nomeAluno);
  await page.getByLabel("Telefone (com DDD)").fill("(21) 99876-5432");
  await page.getByLabel("Data de nascimento").fill("1992-04-15");
  await page.getByLabel("Nome do contato").fill("Contato");
  await page.getByLabel("Telefone do contato").fill("(21) 3456-7890");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Salvar aluno" }).click();
  await expect(page.getByText("Aluno salvo.")).toBeVisible();
  await expect(page.getByText("Sem plano: o aluno não recebe mensalidade.")).toBeVisible();

  await page
    .getByRole("combobox", { name: "Plano", exact: true })
    .selectOption({ label: `${nomePlano} (R$ 150,50)` });
  await page.getByLabel("Dia de vencimento (1 a 28)").fill("28");
  await page.getByLabel("Desconto mensal (R$, opcional)").fill("20,50");
  await page.getByRole("button", { name: "Salvar plano do aluno" }).click();
  await expect(page.getByText("Informe o motivo do desconto.")).toBeVisible();
  await page.getByLabel("Motivo do desconto").fill("Irmãos");
  await page.getByRole("button", { name: "Salvar plano do aluno" }).click();
  await expect(page.getByText("Plano do aluno salvo.")).toBeVisible();
  await expect(page.getByText("R$ 130,00 por mês · vence todo dia 28")).toBeVisible();

  // Geração do mês.
  await page.goto("/caixa/mensalidades");
  await expect(
    page.getByRole("heading", { level: 1, name: `Mensalidades de ${mes}` }),
  ).toBeVisible();
  await page.getByRole("button", { name: `Gerar mensalidades de ${mes}` }).click();
  await expect(page.getByText(/mensalidades? gerada|Nenhuma mensalidade nova/)).toBeVisible();
  await page.getByLabel("Aluno").fill(nomeAluno);
  await page.getByRole("button", { name: "Filtrar" }).click();
  const linha = page.getByRole("link", { name: new RegExp(nomeAluno) });
  await expect(linha).toContainText("R$ 130,00");
  const urlMensalidade = new URL((await linha.getAttribute("href"))!, page.url()).toString();

  // A atendente registra o pagamento e vê o recibo, mas não estorna nem mexe em planos.
  const contexto = await browser.newContext();
  const atendente = await contexto.newPage();
  try {
    await primeiroAcesso(atendente, emailAtendente, senhaTemporaria, "caixa-balcao-2026-z");
    await atendente.goto(urlMensalidade);
    await expect(atendente.getByRole("heading", { level: 1, name: nomeAluno })).toBeVisible();
    // A forma de pagamento é escolhida em blocos.
    const pagamento = atendente.getByRole("form", { name: "Registrar pagamento" });
    await pagamento.getByText("Pix", { exact: true }).click();
    await expect(pagamento.getByRole("radio", { name: "Pix" })).toBeChecked();
    await atendente.getByRole("button", { name: "Registrar pagamento" }).click();
    await expect(atendente.getByText("Pagamento registrado.")).toBeVisible();
    const recibo = atendente.getByRole("article");
    await expect(recibo).toContainText(/Recibo nº \d+/);
    await expect(recibo).toContainText(nomeAluno);
    await expect(recibo).toContainText("R$ 130,00");
    await expect(recibo).toContainText(`mensalidade de ${mes}`);
    await expect(recibo).toContainText(nomeAtendente);

    await atendente.goto(urlMensalidade);
    await expect(atendente.getByTestId("situacao")).toHaveText("Paga");
    await expect(atendente.getByRole("button", { name: "Estornar pagamento" })).toHaveCount(0);
    await expect(atendente.getByRole("button", { name: /Gerar mensalidades/ })).toHaveCount(0);
    await atendente.goto("/aulas/planos");
    await expect(atendente.getByRole("heading", { name: "Acesso negado" })).toBeVisible();

    await atendente.goto("/caixa");
    await expect(atendente.getByRole("heading", { level: 1, name: "Caixa do dia" })).toBeVisible();
    await expect(
      atendente
        .getByRole("list", { name: "Lançamentos" })
        .getByText(`Mensalidade de ${mes}`)
        .first(),
    ).toBeVisible();
  } finally {
    await contexto.close();
  }

  // O administrador estorna; a mensalidade volta a ficar devida.
  await page.goto(urlMensalidade);
  const estorno = page.getByRole("form", { name: "Estornar pagamento" });
  await estorno.getByLabel("Motivo").fill("Pagamento registrado em dobro");
  await estorno.getByRole("button", { name: "Estornar pagamento" }).click();
  await confirmar(page);
  await expect(
    page.getByText(/Estornado em .* Motivo: Pagamento registrado em dobro/),
  ).toBeVisible();
  await expect(page.getByTestId("situacao")).not.toHaveText("Paga");
  await expect(page.getByRole("button", { name: "Registrar pagamento" })).toBeVisible();
});

test("MENS-CA-19: professor não entra no Caixa nem em Planos", async ({ page, browser }) => {
  await entrarComoAdmin(page);
  const email = emailUnico("prof-caixa");
  const senhaTemporaria = await cadastrarUsuario(page, {
    nome: "Professor Caixa",
    email,
    perfil: "Professor",
  });
  const contexto = await browser.newContext();
  const professor = await contexto.newPage();
  try {
    await primeiroAcesso(professor, email, senhaTemporaria, "rede-alta-2026-w");
    for (const rota of ["/caixa", "/caixa/mensalidades", "/caixa/inadimplentes", "/aulas/planos"]) {
      await professor.goto(rota);
      await expect(professor.getByRole("heading", { name: "Acesso negado" })).toBeVisible();
    }
  } finally {
    await contexto.close();
  }
});
