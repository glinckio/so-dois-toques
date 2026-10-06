import { expect, test } from "@playwright/test";
import { cadastrarUsuario, emailUnico, entrar, entrarComoAdmin } from "./apoio";
import { ADMIN_E2E } from "./dados";

test("ACESSO-CA-05: sem sessão, qualquer página leva ao login", async ({ page }) => {
  for (const rota of ["/", "/usuarios", "/auditoria", "/aulas", "/trocar-senha"]) {
    await page.goto(rota);
    await expect(page, rota).toHaveURL("/login");
  }
  await expect(page.getByRole("heading", { name: "Só Dois Toques" })).toBeVisible();
});

test("ACESSO-CA-01 e ACESSO-CA-07: entrar leva ao início e sair encerra a sessão", async ({
  page,
  context,
}) => {
  await entrarComoAdmin(page);
  await expect(page.getByText(`Olá, ${ADMIN_E2E.nome}.`)).toBeVisible();

  const cookie = (await context.cookies()).find((c) => c.name === "sdt_sessao");
  expect(cookie).toMatchObject({ httpOnly: true, sameSite: "Lax" });

  await page.getByRole("button", { name: "Sair" }).click();
  await expect(page).toHaveURL("/login");

  // Reaproveitar o cookie antigo não dá acesso.
  await context.addCookies([cookie!]);
  await page.goto("/usuarios");
  await expect(page).toHaveURL(/\/login\?expirada=1$/);
  await expect(page.getByText("Sua sessão expirou. Entre novamente.")).toBeVisible();
});

test("ACESSO-CA-02: senha errada mostra mensagem genérica", async ({ page }) => {
  await entrar(page, ADMIN_E2E.email, "senha-totalmente-errada");
  await expect(page.getByText("E-mail ou senha incorretos")).toBeVisible();
  await expect(page).toHaveURL("/login");
});

test("ACESSO-CA-12, ACESSO-CA-13, ACESSO-CA-11 e ACESSO-CA-10: novo professor troca a senha e vê só o que pode", async ({
  page,
  browser,
}) => {
  await entrarComoAdmin(page);
  const email = emailUnico("professor");
  const senhaTemporaria = await cadastrarUsuario(page, {
    nome: "Paula Professora",
    email,
    perfil: "Professor",
  });
  await expect(page.getByRole("list", { name: "Lista de usuários" })).toContainText(email);

  const contexto = await browser.newContext();
  const professor = await contexto.newPage();
  try {
    await entrar(professor, email, senhaTemporaria);
    await expect(professor).toHaveURL("/trocar-senha");
    await expect(professor.getByText("Você entrou com uma senha temporária.")).toBeVisible();

    // Sem trocar a senha, nenhuma outra página abre.
    await professor.goto("/aulas");
    await expect(professor).toHaveURL("/trocar-senha");

    await professor.getByLabel("Senha atual").fill(senhaTemporaria);
    await professor.getByLabel("Nova senha", { exact: true }).fill("1234567890");
    await professor.getByLabel("Confirme a nova senha").fill("1234567890");
    await professor.getByRole("button", { name: "Salvar nova senha" }).click();
    await expect(professor.getByText("Essa senha é muito comum. Escolha outra.")).toBeVisible();

    await professor.getByLabel("Senha atual").fill(senhaTemporaria);
    await professor.getByLabel("Nova senha", { exact: true }).fill("bola-na-rede-2026");
    await professor.getByLabel("Confirme a nova senha").fill("bola-na-rede-2026");
    await professor.getByRole("button", { name: "Salvar nova senha" }).click();
    await expect(professor).toHaveURL("/?senha=trocada");
    await expect(professor.getByText("Senha alterada com sucesso.")).toBeVisible();

    const menu = professor.getByRole("navigation", { name: "Menu principal" });
    await expect(menu.getByRole("link")).toHaveText(["Início", "Aulas"]);

    await professor.goto("/usuarios");
    await expect(professor.getByRole("heading", { name: "Acesso negado" })).toBeVisible();
    await professor.goto("/contabil");
    await expect(professor.getByRole("heading", { name: "Acesso negado" })).toBeVisible();
    await professor.goto("/aulas");
    await expect(professor.getByRole("heading", { name: "Minhas turmas" })).toBeVisible();
  } finally {
    await contexto.close();
  }
});

test("ACESSO-CA-11: atendente vê Horários, Estoque e Caixa no menu", async ({ page, browser }) => {
  await entrarComoAdmin(page);
  const email = emailUnico("atendente");
  const senhaTemporaria = await cadastrarUsuario(page, {
    nome: "Ana Atendente",
    email,
    perfil: "Atendente",
  });

  const contexto = await browser.newContext();
  const atendente = await contexto.newPage();
  try {
    await entrar(atendente, email, senhaTemporaria);
    await atendente.getByLabel("Senha atual").fill(senhaTemporaria);
    await atendente.getByLabel("Nova senha", { exact: true }).fill("copa-gelada-2026");
    await atendente.getByLabel("Confirme a nova senha").fill("copa-gelada-2026");
    await atendente.getByRole("button", { name: "Salvar nova senha" }).click();
    const menu = atendente.getByRole("navigation", { name: "Menu principal" });
    await expect(menu.getByRole("link")).toHaveText(["Início", "Horários", "Estoque", "Caixa"]);
  } finally {
    await contexto.close();
  }
});

test("ACESSO-CA-14: desativar pela tela tira o usuário do sistema na hora", async ({
  page,
  browser,
}) => {
  await entrarComoAdmin(page);
  const email = emailUnico("desativar");
  const senhaTemporaria = await cadastrarUsuario(page, {
    nome: "Davi Desativado",
    email,
    perfil: "Atendente",
  });

  const contexto = await browser.newContext();
  const outro = await contexto.newPage();
  try {
    await entrar(outro, email, senhaTemporaria);
    await expect(outro).toHaveURL("/trocar-senha");

    const item = page.getByRole("listitem").filter({ hasText: email });
    page.once("dialog", (dialogo) => dialogo.accept());
    await item.getByRole("button", { name: "Desativar" }).click();
    await expect(item).toContainText("desativado");

    await outro.reload();
    await expect(outro).toHaveURL(/\/login/);
    await entrar(outro, email, senhaTemporaria);
    await expect(outro.getByText("E-mail ou senha incorretos")).toBeVisible();
  } finally {
    await contexto.close();
  }
});

test("ACESSO-CA-20: a auditoria filtra por ação e mostra os registros", async ({ page }) => {
  await entrarComoAdmin(page);
  await page.goto("/auditoria");
  await page.getByLabel("Ação").selectOption({ label: "Entrou no sistema" });
  await page.getByRole("button", { name: "Filtrar" }).click();
  await expect(page).toHaveURL(/acao=LOGIN_SUCESSO/);
  const registros = page.getByRole("list", { name: "Registros de auditoria" });
  await expect(registros.getByRole("listitem").first()).toContainText("Entrou no sistema");
  await expect(registros).not.toContainText("Saiu do sistema");
});
