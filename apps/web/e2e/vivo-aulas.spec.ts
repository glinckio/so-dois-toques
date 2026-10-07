import { expect, test, type Page } from "@playwright/test";
import { entrarComoAdmin } from "./apoio";
import { ADMIN_E2E } from "./dados";

const DIAS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const hojeSP = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());

/** Só letras: a busca de alunos também procura dígitos no telefone, e isso traria outros alunos. */
const marcaSoDeLetras = () =>
  Array.from(
    { length: 8 },
    () => "abcdefghijklmnopqrstuvwxyz"[Math.floor(Math.random() * 26)],
  ).join("");

async function cadastrarAluno(page: Page, nome: string) {
  await page.goto("/aulas/alunos/novo");
  await page.getByLabel("Nome", { exact: true }).fill(nome);
  await page.getByLabel("Telefone (com DDD)").fill("(21) 99876-5432");
  await page.getByLabel("Data de nascimento").fill("2001-05-10");
  await page.getByLabel("Nome do contato").fill("Contato Vivo");
  await page.getByLabel("Telefone do contato").fill("(21) 3456-7890");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Salvar aluno" }).click();
  await expect(page.getByText("Aluno salvo.")).toBeVisible();
}

test("VIVO-CA-09: na presença, o contador e o anel acompanham cada marcação", async ({ page }) => {
  const marca = marcaSoDeLetras();
  const diaDeHoje = new Date(`${hojeSP()}T12:00:00Z`).getUTCDay();
  await entrarComoAdmin(page);

  // Local e turma com aula hoje, dada pelo próprio administrador.
  await page.goto("/aulas/locais");
  const nomeLocal = `Arena Viva ${marca}`;
  await page.getByLabel("Nome do local").fill(nomeLocal);
  await page.getByRole("button", { name: "Cadastrar" }).click();
  await expect(page.getByText(`Local ${nomeLocal} cadastrado.`)).toBeVisible();

  await page.goto("/aulas/turmas/nova");
  const nomeTurma = `Presença Viva ${marca}`;
  await page.getByLabel("Nome da turma").fill(nomeTurma);
  await page.getByLabel("Local").selectOption({ label: nomeLocal });
  await page.getByLabel("Professor").selectOption({ label: ADMIN_E2E.nome });
  await page.getByLabel("Vagas").fill("4");
  await page.getByLabel("Dia 1").selectOption({ label: DIAS[diaDeHoje]! });
  await page.getByLabel("Dia 2").selectOption({ label: DIAS[(diaDeHoje + 3) % 7]! });
  await page.getByRole("button", { name: "Salvar turma" }).click();
  await expect(page.getByText("Turma salva.")).toBeVisible();
  const urlTurma = page.url().replace(/\?.*$/, "");

  // Três alunos, matriculados pela busca da turma.
  const [ana, bia, caio] = ["Ana", "Bia", "Caio"].map((n) => `${n} Viva ${marca}`) as [
    string,
    string,
    string,
  ];
  for (const nome of [ana, bia, caio]) await cadastrarAluno(page, nome);
  await page.goto(urlTurma);
  await page.getByLabel("Buscar aluno por nome ou telefone").fill(`viva ${marca}`);
  await page.getByRole("button", { name: "Buscar", exact: true }).click();
  const encontrados = page.getByRole("list", { name: "Alunos encontrados" });
  for (const nome of [ana, bia, caio]) {
    const linha = encontrados.getByRole("listitem").filter({ hasText: nome });
    await linha.getByRole("button", { name: "Matricular" }).click();
    await expect(linha).toContainText("Já está na turma");
  }
  await expect(page.getByTestId("vagas")).toContainText("3 de 4 vagas ocupadas");

  // A presença abre na aula de hoje, com ninguém marcado.
  await page.getByRole("link", { name: "Lista de presença" }).click();
  await expect(page).toHaveURL(/\/presenca/);
  const lista = page.getByRole("list", { name: "Lista de presença" });
  const contador = page.getByTestId("contador-presenca");
  const anel = page.getByTestId("anel-presenca");
  const botao = (nome: string, rotulo: "Presente" | "Ausente") =>
    lista.getByRole("group", { name: `Presença de ${nome}` }).getByRole("button", { name: rotulo });
  const anelDiz = (presentes: number, ausentes: string, semMarcar: number) =>
    expect(anel).toHaveAttribute(
      "aria-label",
      `Presença: ${presentes} de 3 presentes, ${ausentes} e ${semMarcar} sem marcar`,
    );

  await expect(contador).toHaveText("0 de 3 presentes");
  await anelDiz(0, "0 ausentes", 3);

  // Cada toque muda o contador e o anel na hora, antes de salvar.
  await botao(ana, "Presente").click();
  await expect(botao(ana, "Presente")).toHaveAttribute("aria-pressed", "true");
  await expect(contador).toHaveText("1 de 3 presentes");
  await anelDiz(1, "0 ausentes", 2);

  await botao(bia, "Presente").click();
  await expect(contador).toHaveText("2 de 3 presentes");
  await anelDiz(2, "0 ausentes", 1);

  await botao(caio, "Ausente").click();
  await expect(contador).toHaveText("2 de 3 presentes");
  await anelDiz(2, "1 ausente", 0);

  // Trocar a marca de um aluno também acompanha.
  await botao(bia, "Ausente").click();
  await expect(botao(bia, "Presente")).toHaveAttribute("aria-pressed", "false");
  await expect(contador).toHaveText("1 de 3 presentes");
  await anelDiz(1, "2 ausentes", 0);

  // Depois de salvar e de abrir a tela de novo, o contador e o anel mostram o que foi salvo.
  await page.getByRole("button", { name: "Salvar presença" }).click();
  await expect(page.getByText("Presença salva.")).toBeVisible();
  await expect(contador).toHaveText("1 de 3 presentes");
  await page.reload();
  await expect(contador).toHaveText("1 de 3 presentes");
  await anelDiz(1, "2 ausentes", 0);
  await expect(page.getByRole("img", { name: /1 de 3 presentes/ })).toBeVisible();
  await expect(botao(caio, "Ausente")).toHaveAttribute("aria-pressed", "true");
});
