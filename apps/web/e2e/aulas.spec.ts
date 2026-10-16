import { expect, test } from "@playwright/test";
import {
  cadastrarUsuario,
  criarTurmaPelaTela,
  emailUnico,
  entrarComoAdmin,
  primeiroAcesso,
} from "./apoio";

test("AULAS-CA-01, TURMA-CA-01, AULAS-CA-15, AULAS-CA-17 e TURMA-CA-05: da turma nova à presença marcada pelo atendente", async ({
  page,
  browser,
}) => {
  const marca = Math.random().toString(36).slice(2, 8);
  await entrarComoAdmin(page);

  // Atendente nova, que marca a presença.
  const emailAtendente = emailUnico("atendente-aulas");
  const nomeAtendente = `Atendente ${marca}`;
  const senhaTemporaria = await cadastrarUsuario(page, {
    nome: nomeAtendente,
    email: emailAtendente,
    perfil: "Atendente",
  });

  // Turma com aula hoje: dia, horário, nível e vagas.
  const { url: urlTurma, inicio } = await criarTurmaPelaTela(page, {
    vagas: 2,
    categoria: "Feminino",
  });
  await expect(page.getByRole("heading", { level: 1 })).toContainText(inicio);
  // TURMA-CA-08: a categoria aparece junto do nível.
  await expect(page.getByText("Feminino", { exact: true }).first()).toBeVisible();

  // Aluno: sem consentimento é recusado; com consentimento, salvo.
  await page.goto("/aulas/alunos/novo");
  const nomeAluno = `Ana Areia ${marca}`;
  await page.getByLabel("Nome", { exact: true }).fill(nomeAluno);
  // AJU-CA-02: o telefone se formata enquanto se digita, só com os números.
  await page.getByLabel("Telefone (com DDD)").pressSequentially("21a998765432");
  await expect(page.getByLabel("Telefone (com DDD)")).toHaveValue("(21) 99876-5432");
  await page.getByLabel("Data de nascimento").fill("1995-03-20");
  await page.getByLabel("Nome do contato").fill("Maria Contato");
  await page.getByLabel("Telefone do contato").pressSequentially("2134567890");
  await expect(page.getByLabel("Telefone do contato")).toHaveValue("(21) 3456-7890");
  await page.getByRole("button", { name: "Salvar aluno" }).click();
  await expect(
    page.getByText("Registre o consentimento do aluno (ou do responsável) para salvar o cadastro."),
  ).toBeVisible();
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Salvar aluno" }).click();
  await expect(page.getByText("Aluno salvo.")).toBeVisible();
  await expect(page.getByText("(21) 99876-5432")).toBeVisible();
  await expect(page.getByText(/Dado pelo aluno em/)).toBeVisible();

  // Matrícula pela busca na turma.
  await page.goto(urlTurma);
  await page.getByLabel("Buscar aluno por nome ou telefone").fill(`ana areia ${marca}`);
  // "Buscar" exato: a barra do topo tem o botão "Buscar ou ir para…" da busca rápida.
  await page.getByRole("button", { name: "Buscar", exact: true }).click();
  await page
    .getByRole("list", { name: "Alunos encontrados" })
    .getByRole("button", { name: "Matricular" })
    .click();
  await expect(page.getByRole("list", { name: "Alunos matriculados" })).toContainText(nomeAluno);
  await expect(page.getByTestId("vagas")).toContainText("1 de 2 vagas ocupadas");

  // A atendente marca a presença no celular ou no computador.
  const contexto = await browser.newContext();
  const professor = await contexto.newPage();
  try {
    await primeiroAcesso(professor, emailAtendente, senhaTemporaria, "rede-alta-2026-x");
    await professor.goto("/aulas");
    await expect(professor.getByRole("heading", { name: "Turmas da semana" })).toBeVisible();
    await professor.goto(urlTurma);
    await professor.getByRole("link", { name: "Lista de presença" }).click();
    const lista = professor.getByRole("list", { name: "Lista de presença" });
    await expect(lista).toContainText(nomeAluno);
    await lista.getByRole("button", { name: "Presente" }).click();
    await professor.getByRole("button", { name: "Salvar presença" }).click();
    await expect(professor.getByText("Presença salva.")).toBeVisible();
    await expect(professor.getByText("1 de 1 presentes")).toBeVisible();
    await expect(lista).toContainText(`Marcado por ${nomeAtendente}`);

    // Cadastros são só do administrador.
    await professor.goto("/aulas/alunos/novo");
    await expect(professor.getByRole("heading", { name: "Acesso negado" })).toBeVisible();
  } finally {
    await contexto.close();
  }
});

test("AULAS-CA-21 e TURMA-CA-05: atendente vê os alunos, mas não cadastra aluno nem turma", async ({
  page,
  browser,
}) => {
  await entrarComoAdmin(page);
  const email = emailUnico("atendente-aulas");
  const senhaTemporaria = await cadastrarUsuario(page, {
    nome: "Atendente Aulas",
    email,
    perfil: "Atendente",
  });
  const contexto = await browser.newContext();
  const atendente = await contexto.newPage();
  try {
    await primeiroAcesso(atendente, email, senhaTemporaria, "caixa-forte-2026-y");
    await atendente.goto("/aulas/alunos");
    await expect(atendente.getByRole("heading", { name: "Acesso negado" })).toHaveCount(0);
    for (const rota of ["/aulas/alunos/novo", "/aulas/turmas/nova", "/aulas/planos"]) {
      await atendente.goto(rota);
      await expect(atendente.getByRole("heading", { name: "Acesso negado" })).toBeVisible();
    }
  } finally {
    await contexto.close();
  }
});
