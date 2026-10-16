import { expect, type Page } from "@playwright/test";
import { ADMIN_E2E } from "./dados";

export async function entrar(page: Page, email: string, senha: string) {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(senha);
  await page.getByRole("button", { name: "Entrar" }).click();
}

/** Sai do sistema pelo menu da pessoa (aberto pelo avatar). */
export async function sair(page: Page) {
  await page.getByRole("button", { name: /Abrir o menu da pessoa/ }).click();
  await page.getByRole("button", { name: "Sair" }).click();
}

/** Confirma a ação no diálogo de confirmação do sistema. */
export async function confirmar(page: Page) {
  const dialogo = page.getByRole("dialog");
  await expect(dialogo).toBeVisible();
  await dialogo.getByRole("button", { name: "Confirmar" }).click();
}

export async function entrarComoAdmin(page: Page) {
  await entrar(page, ADMIN_E2E.email, ADMIN_E2E.senha);
  await expect(page).toHaveURL("/");
}

let contador = 0;
export function emailUnico(prefixo: string) {
  contador += 1;
  return `${prefixo}-${Date.now().toString(36)}-${contador}-${Math.random().toString(36).slice(2, 6)}@exemplo.com`;
}

/** Cadastra um usuário pela tela e devolve a senha temporária exibida. */
export async function cadastrarUsuario(
  page: Page,
  dados: { nome: string; email: string; perfil: string },
) {
  await page.goto("/usuarios");
  const form = page.locator("form", {
    has: page.getByRole("heading", { name: "Cadastrar usuário" }),
  });
  await form.getByLabel("Nome").fill(dados.nome);
  await form.getByLabel("E-mail").fill(dados.email);
  await form.getByText(dados.perfil, { exact: true }).click();
  await form.getByRole("button", { name: "Cadastrar" }).click();
  const senha = form.getByTestId("senha-temporaria");
  await expect(senha).toBeVisible();
  return (await senha.textContent())!.trim();
}

/** Entra com a senha temporária e define a senha definitiva. */
export async function primeiroAcesso(
  page: Page,
  email: string,
  senhaTemporaria: string,
  novaSenha: string,
) {
  await entrar(page, email, senhaTemporaria);
  await expect(page).toHaveURL("/trocar-senha");
  await page.getByLabel("Senha atual").fill(senhaTemporaria);
  await page.getByLabel("Nova senha", { exact: true }).fill(novaSenha);
  await page.getByLabel("Confirme a nova senha").fill(novaSenha);
  await page.getByRole("button", { name: "Salvar nova senha" }).click();
  await expect(page).toHaveURL("/?senha=trocada");
}

const hhmm = (minutos: number) =>
  `${String(Math.floor(minutos / 60)).padStart(2, "0")}:${String(minutos % 60).padStart(2, "0")}`;

const DIAS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

/** Dia da semana de hoje em São Paulo (0 = domingo). */
export function diaDeHojeSP() {
  const hoje = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(
    new Date(),
  );
  return new Date(`${hoje}T12:00:00Z`).getUTCDay();
}

/**
 * Cria uma turma pela tela (TURMA-CA-01) e devolve o endereço dela e o horário. A quadra é
 * uma só e duas turmas ativas não dividem horário, e os testes rodam ao mesmo tempo no
 * celular e no computador: cada turma ganha uma aula de um minuto sorteada entre 05:00
 * e 23:58.
 */
export async function criarTurmaPelaTela(
  page: Page,
  dados: { diaSemana?: number; vagas?: number } = {},
) {
  const inicio = 5 * 60 + Math.floor(Math.random() * (19 * 60 - 1));
  await page.goto("/aulas/turmas/nova");
  await page
    .getByLabel("Dia da semana")
    .selectOption({ label: DIAS[dados.diaSemana ?? diaDeHojeSP()]! });
  await page.getByLabel("Início", { exact: true }).fill(hhmm(inicio));
  await page.getByLabel("Fim", { exact: true }).fill(hhmm(inicio + 1));
  if (dados.vagas !== undefined) await page.getByLabel("Vagas").fill(String(dados.vagas));
  await page.getByRole("button", { name: "Salvar turma" }).click();
  await expect(page.getByText("Turma salva.")).toBeVisible();
  return { url: page.url().replace(/\?.*$/, ""), inicio: hhmm(inicio), fim: hhmm(inicio + 1) };
}
