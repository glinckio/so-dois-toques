import { expect, type Page, test } from "@playwright/test";
import { cadastrarUsuario, confirmar, emailUnico, entrarComoAdmin, primeiroAcesso } from "./apoio";
import { ADMIN_E2E } from "./dados";

const noCelular = (page: Page) => (page.viewportSize()?.width ?? 1280) < 1024;

/** Telas de todas as áreas, com as subpáginas que não dependem de um cadastro. */
const TELAS = [
  "/",
  "/aulas",
  "/aulas/alunos",
  "/aulas/alunos/novo",
  "/aulas/turmas/nova",
  "/aulas/planos",
  "/aulas/locais",
  "/aulas/custos",
  "/aulas/resultado",
  "/horarios",
  "/horarios/nova",
  "/horarios/fixas",
  "/horarios/faixas",
  "/horarios/privacidade",
  "/estoque",
  "/estoque/venda",
  "/estoque/compra",
  "/estoque/vendas",
  "/caixa",
  "/caixa/turnos",
  "/caixa/mensalidades",
  "/caixa/inadimplentes",
  "/contabil",
  "/usuarios",
  "/auditoria",
  "/trocar-senha",
];

/** Erros do console e da página (a CSP bloqueando algo aparece aqui). */
function vigiarErros(page: Page) {
  const erros: string[] = [];
  page.on("console", (mensagem) => {
    if (mensagem.type() === "error") erros.push(`${page.url()}: ${mensagem.text()}`);
  });
  page.on("pageerror", (erro) => erros.push(`${page.url()}: ${erro.message}`));
  return erros;
}

test("VIVO-CA-11: nenhuma tela das áreas tem erro de CSP ou de script", async ({ page }) => {
  test.setTimeout(120_000);
  const erros = vigiarErros(page);
  await entrarComoAdmin(page);
  for (const tela of TELAS) {
    await page.goto(tela);
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
    // Dá tempo para as animações e os ajustes feitos no navegador rodarem.
    await page.waitForTimeout(150);
  }
  expect(erros).toEqual([]);
});

test("VIVO-CA-01: com reduzir movimento, as animações e transições ficam desligadas", async ({
  page,
}) => {
  // Maior duração de animação e de transição entre os elementos animados da tela, em segundos.
  const movimento = () =>
    page.evaluate(() => {
      const animados = [
        ...document.querySelectorAll<HTMLElement>('[class*="animate-"], .cascata > *, a, button'),
      ];
      const segundos = (valor: string) => Math.max(...valor.split(",").map((v) => parseFloat(v)));
      return {
        animacao: Math.max(
          ...animados.map((el) => segundos(getComputedStyle(el).animationDuration)),
        ),
        transicao: Math.max(
          ...animados.map((el) => segundos(getComputedStyle(el).transitionDuration)),
        ),
        repete: animados.some((el) => getComputedStyle(el).animationIterationCount === "infinite"),
      };
    });

  await entrarComoAdmin(page);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  const normal = await movimento();
  expect(normal.animacao).toBeGreaterThan(0.1);
  expect(normal.transicao).toBeGreaterThan(0.1);

  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  const reduzido = await movimento();
  expect(reduzido.animacao).toBeLessThan(0.001);
  expect(reduzido.transicao).toBeLessThan(0.001);
  expect(reduzido.repete).toBe(false);
});

test("VIVO-CA-02: menu em grupos no computador e barra com Mais no celular", async ({ page }) => {
  await entrarComoAdmin(page);
  const menu = page.getByRole("navigation", { name: "Menu principal" });
  await expect(menu.getByRole("link", { name: "Início" })).toHaveAttribute("aria-current", "page");

  if (noCelular(page)) {
    await expect(menu.getByRole("link")).toHaveCount(4);
    await menu.getByRole("button", { name: "Mais" }).click();
    await expect(menu.getByText("Mais áreas")).toBeVisible();
    await menu.getByRole("link", { name: "Auditoria" }).click();
    await expect(page).toHaveURL("/auditoria");
    await expect(menu.getByText("Mais áreas")).toBeHidden();
    await menu.getByRole("button", { name: "Mais" }).click();
    await expect(menu.getByRole("link", { name: "Auditoria" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  } else {
    for (const grupo of ["Visão geral", "Operação", "Gestão"]) {
      await expect(menu.getByText(grupo, { exact: true })).toBeVisible();
    }
    await expect(menu.getByRole("link")).toHaveCount(8);
    await menu.getByRole("link", { name: "Auditoria" }).click();
    await expect(page).toHaveURL("/auditoria");
    await expect(menu.getByRole("link", { name: "Auditoria" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  }
  await expect(menu.getByRole("link", { name: "Início" })).not.toHaveAttribute("aria-current");
});

test("VIVO-CA-03: a busca rápida abre, filtra, leva à área e busca alunos", async ({ page }) => {
  await entrarComoAdmin(page);
  const busca = page.getByRole("dialog", { name: "Busca rápida" });
  const abrirBusca = async () => {
    if (noCelular(page)) await page.getByRole("button", { name: "Buscar ou ir para" }).click();
    else await page.keyboard.press("Control+k");
    await expect(busca).toBeVisible();
  };

  await abrirBusca();
  const campo = busca.getByRole("combobox", { name: "Buscar ou ir para" });
  await expect(campo).toBeFocused();
  await expect(busca.getByRole("option", { name: "Contábil", exact: true })).toBeVisible();
  await campo.fill("audit");
  await expect(busca.getByRole("option").first()).toHaveText("Auditoria");
  await expect(busca.getByRole("option", { name: "Contábil", exact: true })).toHaveCount(0);
  await campo.press("Enter");
  await expect(page).toHaveURL("/auditoria");
  await expect(busca).toBeHidden();

  await abrirBusca();
  await campo.fill("Mariana");
  await busca.getByRole("option", { name: /Buscar alunos por .Mariana./ }).click();
  await expect(page).toHaveURL("/aulas/alunos?busca=Mariana");

  await abrirBusca();
  await campo.press("Escape");
  await expect(busca).toBeHidden();
});

test("VIVO-CA-03: a busca rápida só lista o que o perfil pode abrir", async ({ page, browser }) => {
  await entrarComoAdmin(page);
  const email = emailUnico("busca");
  const senha = await cadastrarUsuario(page, {
    nome: "Atendente da Busca",
    email,
    perfil: "Atendente",
  });
  const contexto = await browser.newContext({ viewport: page.viewportSize() });
  const atendente = await contexto.newPage();
  try {
    await primeiroAcesso(atendente, email, senha, "bola-na-rede-2026");
    if (noCelular(atendente))
      await atendente.getByRole("button", { name: "Buscar ou ir para" }).click();
    else await atendente.keyboard.press("Control+k");
    const busca = atendente.getByRole("dialog", { name: "Busca rápida" });
    await expect(busca.getByRole("option", { name: "Caixa", exact: true })).toBeVisible();
    await expect(busca.getByRole("option", { name: "Contábil", exact: true })).toHaveCount(0);
    await busca.getByRole("combobox").fill("aluno");
    await expect(busca.getByText("Nada encontrado.")).toBeVisible();
  } finally {
    await contexto.close();
  }
});

test("VIVO-CA-04: a confirmação do sistema só executa com Confirmar", async ({ page }) => {
  await entrarComoAdmin(page);
  const email = emailUnico("confirmacao");
  await cadastrarUsuario(page, { nome: "Pessoa da Confirmação", email, perfil: "Professor" });
  const item = page.getByRole("listitem").filter({ hasText: email });
  const janela = page.getByRole("dialog", { name: /Desativar Pessoa da Confirmação/ });

  await item.getByRole("button", { name: "Desativar" }).click();
  await expect(janela).toBeVisible();
  await expect(janela).toContainText("não consegue mais entrar");
  await janela.getByRole("button", { name: "Cancelar" }).click();
  await expect(janela).toBeHidden();

  await item.getByRole("button", { name: "Desativar" }).click();
  await expect(janela).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(janela).toBeHidden();
  await page.reload();
  await expect(item).not.toContainText("desativado");

  await item.getByRole("button", { name: "Desativar" }).click();
  await confirmar(page);
  await expect(item).toContainText("desativado");
});

test("VIVO-CA-05: o menu da pessoa mostra nome e perfil e leva a Trocar senha e Sair", async ({
  page,
}) => {
  await entrarComoAdmin(page);
  const abrir = page.getByRole("button", { name: /Abrir o menu da pessoa/ });
  const menu = page.getByLabel("Menu da pessoa");

  await abrir.click();
  await expect(menu).toBeVisible();
  await expect(menu.getByTestId("nome-da-pessoa")).toHaveText(ADMIN_E2E.nome);
  await expect(menu).toContainText("Administrador");
  await menu.getByRole("link", { name: "Trocar senha" }).click();
  await expect(page).toHaveURL("/trocar-senha");

  await abrir.click();
  await menu.getByRole("button", { name: "Sair" }).click();
  await expect(page).toHaveURL(/\/login/);
});

test("VIVO-CA-10: mostrar senha no login, força e conferência na troca de senha", async ({
  page,
}) => {
  await page.goto("/login");
  const senha = page.getByLabel("Senha");
  await senha.fill("segredo-de-teste");
  await expect(senha).toHaveAttribute("type", "password");
  await page.getByRole("button", { name: "Mostrar senha" }).click();
  await expect(senha).toHaveAttribute("type", "text");
  await page.getByRole("button", { name: "Ocultar senha" }).click();
  await expect(senha).toHaveAttribute("type", "password");

  await entrarComoAdmin(page);
  await page.goto("/trocar-senha");
  const nova = page.getByLabel("Nova senha", { exact: true });
  const forca = page.getByTestId("forca-da-senha");
  const confere = page.getByTestId("confere-senha");

  await nova.fill("curta");
  await expect(forca).toContainText("Curta demais");
  await nova.fill("Copa-Gelada-2026-Areia");
  await expect(forca).toContainText("Forte");

  await page.getByLabel("Confirme a nova senha").fill("Copa-Gelada-2026");
  await expect(confere).toHaveText("As senhas ainda não conferem.");
  await page.getByLabel("Confirme a nova senha").fill("Copa-Gelada-2026-Areia");
  await expect(confere).toHaveText("As senhas conferem.");
});

test("VIVO-CA-12: anéis, roscas e barras têm texto para leitor de tela", async ({ page }) => {
  await entrarComoAdmin(page);
  const semRotulo = () =>
    page
      .locator('main [role="img"]')
      .evaluateAll((els) =>
        els.filter((el) => !(el.getAttribute("aria-label") ?? "").trim()).map((el) => el.outerHTML),
      );

  await expect(page.getByRole("table", { name: "Receitas por origem" })).toBeAttached();
  expect(await page.locator('main [role="img"]').count()).toBeGreaterThan(0);
  expect(await semRotulo()).toEqual([]);

  await page.goto("/contabil");
  await expect(page.getByRole("img", { name: /Margem do período/ })).toBeVisible();
  await expect(page.getByRole("table", { name: "Receitas por origem" })).toBeVisible();
  await expect(page.getByRole("table", { name: "Despesas por tipo" })).toBeVisible();
  expect(await semRotulo()).toEqual([]);
});

test("VIVO-CA-14: a auditoria agrupa por dia e marca o tipo de evento", async ({ page }) => {
  await entrarComoAdmin(page);
  await page.goto("/auditoria");
  const registros = page.getByRole("list", { name: "Registros de auditoria" });
  await expect(registros.getByRole("heading", { level: 2 }).first()).toContainText("Hoje");
  await page.getByRole("navigation", { name: "Período rápido" }).getByText("Hoje").click();
  await expect(page).toHaveURL(/inicio=\d{4}-\d{2}-\d{2}&fim=/);
  await page.getByLabel("Ação").selectOption({ label: "Entrou no sistema" });
  await page.getByRole("button", { name: "Filtrar" }).click();
  await expect(page).toHaveURL(/acao=LOGIN_SUCESSO/);
  await expect(page.getByText("Mostrando só:")).toContainText("Entrou no sistema");
  await expect(registros.getByText("Entrou no sistema").first()).toBeVisible();
  await expect(registros.getByText(ADMIN_E2E.nome).first()).toBeVisible();
  await page.getByRole("link", { name: "Limpar filtros" }).click();
  await expect(page).toHaveURL("/auditoria");
});

test("a situação do caixa aparece no menu lateral do computador e no Início", async ({ page }) => {
  await entrarComoAdmin(page);
  if (noCelular(page)) {
    await expect(page.getByTestId("status-caixa-menu")).toBeHidden();
    await expect(page.getByTestId("situacao-caixa")).toContainText(/Aberto|Fechado/);
    return;
  }
  const situacao = page.getByTestId("status-caixa-menu");
  await expect(situacao).toContainText(/Caixa (aberto|fechado)/);
  await situacao.click();
  await expect(page).toHaveURL("/caixa");
});
