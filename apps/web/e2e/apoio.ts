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
  await form.getByLabel("Perfil").selectOption({ label: dados.perfil });
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
