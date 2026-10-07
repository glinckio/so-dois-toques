import { describe, expect, it } from "vitest";
import { itensDoMenu } from "./areas";
import { filtroAuditoria, formatarDataHora, linkPagina } from "./auditoria";
import { COOKIE_SESSAO, opcoesCookieSessao, rotaPublica } from "./cookie";
import { ipDoCliente } from "./ip";

describe("menu", () => {
  it("ACESSO-CA-11: mostra só as áreas liberadas, na ordem do menu", () => {
    expect(itensDoMenu(["aulas", "inicio"]).map((i) => i.rotulo)).toEqual(["Início", "Aulas"]);
    expect(itensDoMenu(["inicio", "horarios", "estoque", "caixa"]).map((i) => i.href)).toEqual([
      "/",
      "/horarios",
      "/estoque",
      "/caixa",
    ]);
    expect(itensDoMenu(["area-desconhecida"])).toEqual([]);
  });
});

describe("cookie de sessão", () => {
  it("ACESSO-CA-08: HttpOnly, SameSite=Lax, Secure em produção e validade de 7 dias", () => {
    expect(COOKIE_SESSAO).toBe("sdt_sessao");
    expect(opcoesCookieSessao(true)).toEqual({
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 604800,
    });
    expect(opcoesCookieSessao(false).secure).toBe(false);
  });

  it("ACESSO-CA-05: só o login abre sem sessão", () => {
    expect(rotaPublica("/login")).toBe(true);
    for (const rota of ["/", "/usuarios", "/aulas", "/trocar-senha", "/login/x"]) {
      expect(rotaPublica(rota), rota).toBe(false);
    }
  });
});

describe("IP do cliente", () => {
  const cabecalhos = (valores: Record<string, string>) => new Headers(valores);

  it("ACESSO-CA-04: usa o IP que o proxy da hospedagem viu, não o que o visitante inventou", () => {
    // O visitante manda "1.2.3.4"; o proxy acrescenta o IP real no fim.
    const forjado = cabecalhos({ "x-forwarded-for": "1.2.3.4, 203.0.113.7" });
    expect(ipDoCliente(forjado)).toBe("203.0.113.7");
    // Dois proxies confiáveis (CDN + balanceador): o penúltimo é o visitante.
    expect(
      ipDoCliente(cabecalhos({ "x-forwarded-for": "1.2.3.4, 203.0.113.7, 10.0.0.1" }), 2),
    ).toBe("203.0.113.7");
    // Mais saltos que IPs na lista: fica com o primeiro.
    expect(ipDoCliente(cabecalhos({ "x-forwarded-for": "203.0.113.7" }), 3)).toBe("203.0.113.7");
  });

  it("cai para o X-Real-IP sem X-Forwarded-For", () => {
    expect(ipDoCliente(cabecalhos({ "x-real-ip": "2001:db8::1" }))).toBe("2001:db8::1");
    expect(ipDoCliente(cabecalhos({}))).toBeUndefined();
  });

  it("descarta valores que não parecem IP", () => {
    expect(ipDoCliente(cabecalhos({ "x-forwarded-for": "<script>" }))).toBeUndefined();
  });
});

describe("filtro da auditoria", () => {
  it("ACESSO-CA-20: converte período no fuso de São Paulo, usuário, ação e página", () => {
    const { filtro, consulta } = filtroAuditoria({
      inicio: "2026-10-01",
      fim: "2026-10-06",
      usuarioId: "0b8f9a3e-1c2d-4e5f-8a9b-0c1d2e3f4a5b",
      acao: "LOGIN_RECUSADO",
      pagina: "3",
    });
    expect(Object.fromEntries(consulta)).toEqual({
      pagina: "3",
      tamanho: "50",
      inicio: "2026-10-01T00:00:00.000-03:00",
      fim: "2026-10-06T23:59:59.999-03:00",
      usuarioId: "0b8f9a3e-1c2d-4e5f-8a9b-0c1d2e3f4a5b",
      acao: "LOGIN_RECUSADO",
    });
    expect(linkPagina(filtro, 4)).toBe(
      "/auditoria?inicio=2026-10-01&fim=2026-10-06&usuarioId=0b8f9a3e-1c2d-4e5f-8a9b-0c1d2e3f4a5b&acao=LOGIN_RECUSADO&pagina=4",
    );
  });

  it("ACESSO-CA-20: ignora filtros inválidos", () => {
    const { filtro, consulta } = filtroAuditoria({
      inicio: "ontem",
      usuarioId: "1 OR 1=1",
      acao: "APAGAR",
      pagina: "-2",
      fim: ["2026-10-01"],
    });
    expect(filtro).toEqual({
      pagina: 1,
      inicio: undefined,
      fim: undefined,
      usuarioId: undefined,
      acao: undefined,
    });
    expect(Object.fromEntries(consulta)).toEqual({ pagina: "1", tamanho: "50" });
    expect(linkPagina(filtro, 2)).toBe("/auditoria?pagina=2");
  });

  it("mostra data e hora no horário de Brasília", () => {
    expect(formatarDataHora("2026-10-06T03:30:00.000Z")).toBe("06/10/2026, 00:30:00");
  });
});
