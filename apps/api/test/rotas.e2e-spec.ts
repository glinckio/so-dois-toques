import "reflect-metadata";
import { RequestMethod, type INestApplication } from "@nestjs/common";
import { METHOD_METADATA, PATH_METADATA } from "@nestjs/common/constants.js";
import { MetadataScanner, ModulesContainer, Reflector } from "@nestjs/core";
import { randomUUID } from "node:crypto";
import request from "supertest";
import { AREA, PUBLICO, SEM_CHAVE_INTERNA } from "../src/comum/decoradores.js";
import { cliente, criarApp, criarUsuario, SENHA_BOA } from "./apoio.js";

type Rota = {
  metodo: string;
  caminho: string;
  area?: string;
  publica: boolean;
  semChave: boolean;
};

/** Rotas que respondem sem a chave interna (LANC-CA-03). */
const SEM_CHAVE = ["GET /health"];
/** Rotas que respondem sem sessão. */
const SEM_SESSAO = ["POST /auth/login"];
/** Rotas da própria conta: exigem sessão, mas nenhuma área. */
const DA_PROPRIA_CONTA = [
  "POST /auth/logout",
  "GET /auth/eu",
  "POST /auth/senha",
  "GET /acesso/:area",
];

function juntar(...partes: string[]): string {
  const caminho = partes
    .flatMap((p) => p.split("/"))
    .filter(Boolean)
    .join("/");
  return `/${caminho}`;
}

/** Lista as rotas registradas a partir dos próprios metadados do Nest. */
function inventario(app: INestApplication): Rota[] {
  const modulos = app.get(ModulesContainer);
  const scanner = new MetadataScanner();
  const reflector = app.get(Reflector);
  const rotas: Rota[] = [];
  for (const modulo of modulos.values()) {
    for (const controller of modulo.controllers.values()) {
      const classe = controller.metatype as new (...args: never[]) => object;
      if (!classe) continue;
      const base = (Reflect.getMetadata(PATH_METADATA, classe) as string | undefined) ?? "";
      const prototipo = classe.prototype as Record<string, (...args: unknown[]) => unknown>;
      for (const nome of scanner.getAllMethodNames(prototipo)) {
        const handler = prototipo[nome]!;
        const caminho = Reflect.getMetadata(PATH_METADATA, handler) as string | undefined;
        if (caminho === undefined) continue;
        const metodo = Reflect.getMetadata(METHOD_METADATA, handler) as RequestMethod;
        const alvos = [handler, classe];
        rotas.push({
          metodo: RequestMethod[metodo],
          caminho: juntar(base, caminho),
          area: reflector.getAllAndOverride<string | undefined>(AREA, alvos),
          publica: reflector.getAllAndOverride<boolean>(PUBLICO, alvos) ?? false,
          semChave: reflector.getAllAndOverride<boolean>(SEM_CHAVE_INTERNA, alvos) ?? false,
        });
      }
    }
  }
  return rotas;
}

const chave = (r: Rota) => `${r.metodo} ${r.caminho}`;
const concreto = (caminho: string) =>
  caminho.replace(/:area\b/g, "aulas").replace(/:[a-zA-Z]+/g, () => randomUUID());

describe("Inventário de rotas da API (LANC-CA-03)", () => {
  let app: INestApplication;
  let rotas: Rota[];

  beforeAll(async () => {
    app = await criarApp();
    rotas = inventario(app);
  });

  afterAll(async () => {
    await app.close();
  });

  it("LANC-CA-03: o inventário encontra as rotas de todos os módulos", () => {
    expect(rotas.length).toBeGreaterThan(40);
    for (const prefixo of ["/alunos", "/mensalidades", "/contabil", "/horarios", "/usuarios"]) {
      expect(rotas.some((r) => r.caminho.startsWith(prefixo))).toBe(true);
    }
  });

  it("LANC-CA-03: só as rotas da lista fixa dispensam chave, sessão ou área", () => {
    expect(rotas.filter((r) => r.semChave).map(chave)).toEqual(SEM_CHAVE);
    expect(rotas.filter((r) => r.publica).map(chave)).toEqual(SEM_SESSAO);
    const semArea = rotas.filter((r) => !r.area && !r.semChave && !r.publica).map(chave);
    expect(semArea.sort()).toEqual([...DA_PROPRIA_CONTA].sort());
  });

  it("LANC-CA-03: sem a chave interna toda rota responde 401, menos o health", async () => {
    const servidor = app.getHttpServer();
    for (const rota of rotas) {
      if (SEM_CHAVE.includes(chave(rota))) continue;
      const metodo = rota.metodo.toLowerCase() as "get" | "post" | "patch" | "put" | "delete";
      const resposta = await request(servidor)[metodo](concreto(rota.caminho));
      expect({ rota: chave(rota), status: resposta.status }).toEqual({
        rota: chave(rota),
        status: 401,
      });
    }
  });

  it("LANC-CA-03: com a chave e sem sessão toda rota responde 401, menos o login", async () => {
    const servidor = app.getHttpServer();
    const chaveInterna = process.env["INTERNAL_API_KEY"]!;
    for (const rota of rotas) {
      if (SEM_CHAVE.includes(chave(rota)) || SEM_SESSAO.includes(chave(rota))) continue;
      const metodo = rota.metodo.toLowerCase() as "get" | "post" | "patch" | "put" | "delete";
      const resposta = await request(servidor)
        [metodo](concreto(rota.caminho))
        .set("X-Chave-Interna", chaveInterna);
      expect({ rota: chave(rota), status: resposta.status }).toEqual({
        rota: chave(rota),
        status: 401,
      });
    }
  });

  it("FOCO-CA-01: as rotas de estoque, caixa, quadras parceiras e aluguel de quadra não existem mais", async () => {
    const removidas = [
      "GET /caixa/sessao",
      "POST /caixa/sessoes",
      "POST /caixa/avulsos",
      "GET /caixa/lancamentos",
      "GET /produtos",
      "POST /estoque/vendas",
      "POST /estoque/compras",
      "GET /locais",
      "POST /locais",
      "GET /custos",
      "POST /custos/pagamentos",
      "GET /horarios/faixas",
      "POST /horarios/reservas",
      "GET /horarios/quadras",
      "GET /horarios/clientes/anonimizaveis",
      "POST /horarios/clientes/anonimizar",
    ];
    const existentes = new Set(rotas.map(chave));
    for (const rota of removidas) expect(existentes.has(rota), rota).toBe(false);
    for (const prefixo of ["/caixa", "/produtos", "/estoque", "/locais", "/custos"]) {
      expect(
        rotas.some((r) => r.caminho.startsWith(prefixo)),
        prefixo,
      ).toBe(false);
    }

    // Com sessão de administrador, elas respondem 404.
    const admin = await criarUsuario(app, "ADMINISTRADOR");
    const api = cliente(app);
    const token = await api.entrar(admin.email, SENHA_BOA);
    for (const rota of removidas) {
      const [metodo, caminho] = rota.split(" ") as [string, string];
      const resposta =
        metodo === "GET" ? await api.get(caminho, token) : await api.post(caminho, {}, token);
      expect({ rota, status: resposta.status }).toEqual({ rota, status: 404 });
    }
  });
});
