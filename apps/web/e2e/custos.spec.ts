import { expect, test } from "@playwright/test";
import { cadastrarUsuario, confirmar, emailUnico, entrarComoAdmin, primeiroAcesso } from "./apoio";

const DIAS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
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

test("CUSTO-CA-01, CUSTO-CA-02, CUSTO-CA-03, CUSTO-CA-04, CUSTO-CA-05 e CUSTO-CA-08: do valor da hora ao resultado da turma", async ({
  page,
  browser,
}) => {
  const marca = Math.random().toString(36).slice(2, 8);
  const hoje = hojeSP();
  await entrarComoAdmin(page);

  const emailProfessor = emailUnico("prof-custos");
  const nomeProfessor = `Professor ${marca}`;
  const senhaTemporaria = await cadastrarUsuario(page, {
    nome: nomeProfessor,
    email: emailProfessor,
    perfil: "Professor",
  });

  await page.goto("/aulas/locais");
  const nomeLocal = `Arena Parceira ${marca}`;
  await page.getByLabel("Nome do local").fill(nomeLocal);
  await page.getByRole("button", { name: "Cadastrar" }).click();
  await expect(page.getByText(`Local ${nomeLocal} cadastrado.`)).toBeVisible();

  // Turma com aula hoje: o mês tem pelo menos uma aula.
  await page.goto("/aulas/turmas/nova");
  const nomeTurma = `Custos ${marca}`;
  await page.getByLabel("Nome da turma").fill(nomeTurma);
  await page.getByLabel("Local").selectOption({ label: nomeLocal });
  await page.getByLabel("Professor").selectOption({ label: nomeProfessor });
  await page.getByLabel("Vagas").fill("4");
  const diaDeHoje = new Date(`${hoje}T12:00:00Z`).getUTCDay();
  await page.getByLabel("Dia 1").selectOption({ label: DIAS[diaDeHoje]! });
  await page.getByLabel("Dia 2").selectOption({ label: DIAS[(diaDeHoje + 3) % 7]! });
  await page.getByRole("button", { name: "Salvar turma" }).click();
  await expect(page.getByText("Turma salva.")).toBeVisible();

  // Valor da hora e custo previsto.
  await page.goto("/aulas/custos");
  const local = page.getByRole("listitem", { name: nomeLocal });
  await expect(local.getByTestId("resumo-local")).toContainText("sem valor da hora");
  await local.getByLabel("Valor da hora (R$)").fill("60,00");
  await local.getByRole("button", { name: "Salvar valor" }).click();
  await expect(local.getByText("Valor da hora salvo.")).toBeVisible();
  await expect(local.getByTestId("resumo-local")).toContainText(/previsto R\$\s?\d/);
  await expect(local.getByRole("link", { name: nomeTurma })).toBeVisible();

  // Pagamento à quadra sai do Caixa.
  const formPagamento = local.getByRole("form", { name: `Registrar pagamento a ${nomeLocal}` });
  await formPagamento.getByLabel("Valor pago (R$)").fill("100,00");
  await formPagamento.getByLabel("Forma de pagamento").selectOption({ label: "Dinheiro" });
  await formPagamento.getByRole("button", { name: "Registrar pagamento" }).click();
  await expect(local.getByText("Pagamento registrado e lançado no Caixa.")).toBeVisible();
  await expect(local.getByTestId("resumo-local")).toContainText("pago R$ 100,00");

  await page.goto(`/caixa?data=${hoje}`);
  await expect(page.getByText(`Quadra ${nomeLocal} de ${nomeDoMes(hoje)}`)).toBeVisible();

  // Resultado: a única turma do local leva todo o custo.
  await page.goto("/aulas/resultado");
  const linha = page.getByRole("row", { name: new RegExp(nomeTurma) });
  await expect(linha).toContainText("R$ 100,00");
  await expect(linha).toContainText("-R$ 100,00");

  // Estorno.
  await page.goto("/aulas/custos");
  await local.getByText("Estornar", { exact: true }).click();
  await local.getByLabel("Motivo").fill("Valor errado");
  await local.getByRole("button", { name: "Estornar pagamento" }).click();
  await confirmar(page);
  await expect(local.getByText(/Estornado em .* Motivo: Valor errado/)).toBeVisible();
  await expect(local.getByTestId("resumo-local")).toContainText("pago R$ 0,00");
  await page.goto("/aulas/resultado");
  await expect(page.getByRole("row", { name: new RegExp(nomeTurma) })).not.toContainText(
    "R$ 100,00",
  );

  // Professor não vê custos nem resultado.
  const contexto = await browser.newContext();
  const professor = await contexto.newPage();
  try {
    await primeiroAcesso(professor, emailProfessor, senhaTemporaria, "rede-alta-2026-c");
    for (const rota of ["/aulas/custos", "/aulas/resultado"]) {
      await professor.goto(rota);
      await expect(professor.getByRole("heading", { name: "Acesso negado" })).toBeVisible();
    }
  } finally {
    await contexto.close();
  }
});
