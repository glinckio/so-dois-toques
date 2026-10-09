import { expect, test } from "@playwright/test";
import { cadastrarUsuario, emailUnico, entrarComoAdmin, primeiroAcesso } from "./apoio";

const DIAS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const hojeSP = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());

test("AULAS-CA-01, AULAS-CA-10, AULAS-CA-15, AULAS-CA-17 e AULAS-CA-20: da turma nova à presença do professor", async ({
  page,
  browser,
}) => {
  const marca = Math.random().toString(36).slice(2, 8);
  await entrarComoAdmin(page);

  // Professor novo, para a turma dele.
  const emailProfessor = emailUnico("prof-aulas");
  const nomeProfessor = `Professor ${marca}`;
  const senhaTemporaria = await cadastrarUsuario(page, {
    nome: nomeProfessor,
    email: emailProfessor,
    perfil: "Professor",
  });

  // Local.
  await page.goto("/aulas/locais");
  // AJU-CA-01: na coluna estreita do cadastro, os tipos ficam um embaixo do outro e o
  // texto de cada bloco cabe inteiro, sem cortar.
  const tipos = page.getByRole("group", { name: "Tipo" });
  const parceira = await tipos
    .locator("label")
    .filter({ hasText: "Quadra parceira" })
    .boundingBox();
  const propria = await tipos.locator("label").filter({ hasText: "Quadra própria" }).boundingBox();
  expect(propria!.y).toBeGreaterThanOrEqual(parceira!.y + parceira!.height);
  for (const texto of ["Quadra parceira", "Paga por hora de aula", "Do Só Dois Toques"]) {
    const linhas = await tipos.getByText(texto, { exact: true }).evaluate((el) => {
      // Uma caixa por linha de texto: mais de uma altura distinta é texto quebrado.
      const faixa = document.createRange();
      faixa.selectNodeContents(el);
      return new Set([...faixa.getClientRects()].map((r) => Math.round(r.top))).size;
    });
    expect(linhas, texto).toBe(1);
  }
  const nomeLocal = `Arena ${marca}`;
  await page.getByLabel("Nome do local").fill(nomeLocal);
  await page.getByRole("button", { name: "Cadastrar" }).click();
  await expect(page.getByText(`Local ${nomeLocal} cadastrado.`)).toBeVisible();

  // Turma com aula hoje.
  await page.goto("/aulas/turmas/nova");
  const nomeTurma = `Iniciantes ${marca}`;
  await page.getByLabel("Nome da turma").fill(nomeTurma);
  await page.getByLabel("Local").selectOption({ label: nomeLocal });
  await page.getByLabel("Professor").selectOption({ label: nomeProfessor });
  await page.getByLabel("Vagas").fill("2");
  const hoje = hojeSP();
  await page
    .getByLabel("Dia 1")
    .selectOption({ label: DIAS[new Date(`${hoje}T12:00:00Z`).getUTCDay()]! });
  await page
    .getByLabel("Dia 2")
    .selectOption({ label: DIAS[(new Date(`${hoje}T12:00:00Z`).getUTCDay() + 3) % 7]! });
  await page.getByRole("button", { name: "Salvar turma" }).click();
  await expect(page.getByText("Turma salva.")).toBeVisible();
  await expect(page.getByRole("heading", { level: 1, name: nomeTurma })).toBeVisible();
  const urlTurma = page.url().replace(/\?.*$/, "");

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

  // O professor marca a presença no celular ou no computador.
  const contexto = await browser.newContext();
  const professor = await contexto.newPage();
  try {
    await primeiroAcesso(professor, emailProfessor, senhaTemporaria, "rede-alta-2026-x");
    await professor.goto("/aulas");
    await expect(professor.getByRole("heading", { name: "Minhas turmas" })).toBeVisible();
    await professor.getByRole("link", { name: new RegExp(nomeTurma) }).click();
    await professor.getByRole("link", { name: "Lista de presença" }).click();
    const lista = professor.getByRole("list", { name: "Lista de presença" });
    await expect(lista).toContainText(nomeAluno);
    await lista.getByRole("button", { name: "Presente" }).click();
    await professor.getByRole("button", { name: "Salvar presença" }).click();
    await expect(professor.getByText("Presença salva.")).toBeVisible();
    await expect(professor.getByText("1 de 1 presentes")).toBeVisible();
    await expect(lista).toContainText(`Marcado por ${nomeProfessor}`);

    // Cadastros são só do administrador.
    await professor.goto("/aulas/locais");
    await expect(professor.getByRole("heading", { name: "Acesso negado" })).toBeVisible();
    await professor.goto("/aulas/alunos/novo");
    await expect(professor.getByRole("heading", { name: "Acesso negado" })).toBeVisible();
  } finally {
    await contexto.close();
  }
});

test("AULAS-CA-21: atendente não entra em Aulas", async ({ page, browser }) => {
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
    await expect(atendente.getByRole("heading", { name: "Acesso negado" })).toBeVisible();
  } finally {
    await contexto.close();
  }
});
