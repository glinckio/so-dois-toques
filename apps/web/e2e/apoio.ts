import { expect, type Page } from "@playwright/test";
import { ADMIN_E2E } from "./dados";

export async function entrar(page: Page, email: string, senha: string) {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(senha);
  await page.getByRole("button", { name: "Entrar" }).click();
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
