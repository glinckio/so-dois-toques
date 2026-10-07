import type { INestApplication } from "@nestjs/common";
import { hojeEmSaoPaulo, paraDataDoBanco } from "../src/aulas/regras.js";
import { PrismaService } from "../src/prisma/prisma.service.js";
import { criarApp } from "./apoio.js";
import { type Api, logado, unico } from "./apoio-aulas.js";

const hoje = () => hojeEmSaoPaulo(new Date());
const amanha = () => hojeEmSaoPaulo(new Date(Date.now() + 24 * 60 * 60 * 1000));

describe("Etapa 6: estoque da lanchonete", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let admin: Awaited<ReturnType<typeof logado>>;

  beforeAll(async () => {
    app = await criarApp();
    prisma = app.get(PrismaService);
    admin = await logado(app, "ADMINISTRADOR");
    await abrirCaixa();
  });

  afterAll(async () => {
    await fecharCaixa();
    await app.close();
  });

  // A venda precisa de caixa aberto; só existe um caixa.
  async function abrirCaixa() {
    const { api, token } = admin;
    const atual = await api.get("/caixa/sessao", token).expect(200);
    if (atual.body.turno) return atual.body.turno.id as string;
    return (await api.post("/caixa/sessoes", { trocoInicialCentavos: 0 }, token).expect(201)).body
      .id as string;
  }

  async function fecharCaixa() {
    const { api, token } = admin;
    const turno = (await api.get("/caixa/sessao", token).expect(200)).body.turno;
    if (!turno) return;
    await api
      .post(
        `/caixa/sessoes/${turno.id}/fechar`,
        {
          contadoDinheiroCentavos: Math.max(turno.esperadoDinheiroCentavos, 0),
          observacao: "Fim do teste",
        },
        token,
      )
      .expect(200);
  }

  async function criarProduto(extra: Record<string, unknown> = {}) {
    const { api, token } = admin;
    const resposta = await api
      .post(
        "/produtos",
        { nome: unico("Água"), precoCentavos: 500, estoqueMinimo: 5, ...extra },
        token,
      )
      .expect(201);
    return resposta.body.id as string;
  }

  async function comprar(
    produtoId: string,
    quantidade: number,
    totalCentavos: number,
    quem: { api: Api; token: string } = admin,
  ) {
    const resposta = await quem.api
      .post(
        "/estoque/compras",
        { produtoId, quantidade, totalCentavos, forma: "PIX", data: hoje() },
        quem.token,
      )
      .expect(201);
    return resposta.body as { id: string; lancamentoId: string };
  }

  async function vender(
    itens: { produtoId: string; quantidade: number }[],
    forma = "DINHEIRO",
    quem: { api: Api; token: string } = admin,
  ) {
    return quem.api.post("/estoque/vendas", { itens, forma }, quem.token);
  }

  const produto = (id: string) => prisma.produto.findUniqueOrThrow({ where: { id } });

  it("ESTQ-CA-01: cadastra e altera produto; nome repetido e faixas inválidas são recusados; preço novo não muda vendas feitas", async () => {
    const { api, token } = admin;
    const nome = unico("Pastel");
    const id = await criarProduto({ nome, precoCentavos: 800 });
    const lista = await api.get("/produtos", token).expect(200);
    expect(lista.body).toContainEqual(
      expect.objectContaining({ id, nome, precoCentavos: 800, saldo: 0, ativo: true }),
    );
    await api.post("/produtos", { nome, precoCentavos: 900 }, token).expect(409);
    for (const invalido of [
      { precoCentavos: 0 },
      { precoCentavos: 100_001 },
      { precoCentavos: 5.5 },
      { estoqueMinimo: -1 },
      { estoqueMinimo: 10_001 },
      { nome: "A" },
    ]) {
      await api
        .post("/produtos", { nome: unico("Produto"), precoCentavos: 500, ...invalido }, token)
        .expect(400);
    }

    await comprar(id, 10, 4000);
    const venda = await vender([{ produtoId: id, quantidade: 2 }]);
    expect(venda.status).toBe(201);
    await api
      .patch(`/produtos/${id}`, { nome, precoCentavos: 1000, estoqueMinimo: 2, ativo: true }, token)
      .expect(200);
    const item = await prisma.itemVenda.findFirstOrThrow({ where: { vendaId: venda.body.id } });
    expect(item.precoCentavos).toBe(800);
    expect(
      (await prisma.venda.findUniqueOrThrow({ where: { id: venda.body.id } })).totalCentavos,
    ).toBe(1600);
    const outra = await criarProduto();
    const nomeOutro = (await produto(outra)).nome;
    await api
      .patch(
        `/produtos/${outra}`,
        { nome, precoCentavos: 500, estoqueMinimo: 0, ativo: true },
        token,
      )
      .expect(409);
    expect((await produto(outra)).nome).toBe(nomeOutro);
    // O banco também recusa saldo negativo.
    await expect(prisma.produto.update({ where: { id }, data: { saldo: -1 } })).rejects.toThrow();
  });

  it("ESTQ-CA-02: compra soma ao saldo, recalcula o custo médio e lança a saída no Caixa", async () => {
    const { api, token, usuario } = admin;
    const id = await criarProduto();
    const primeira = await comprar(id, 10, 2000);
    expect(await produto(id)).toMatchObject({ saldo: 10, custoMedioCentavos: 200 });
    await comprar(id, 20, 5000);
    expect(await produto(id)).toMatchObject({ saldo: 30, custoMedioCentavos: 233 });

    const lancamento = await prisma.lancamento.findUniqueOrThrow({
      where: { id: primeira.lancamentoId },
    });
    expect(lancamento).toMatchObject({
      tipo: "SAIDA",
      valorCentavos: 2000,
      forma: "PIX",
      categoria: "COMPRA_ESTOQUE",
      data: paraDataDoBanco(hoje()),
      origemTipo: "Compra",
      origemId: primeira.id,
      criadoPorId: usuario.id,
    });
    const movimento = await prisma.movimentoEstoque.findFirstOrThrow({
      where: { origemId: primeira.id },
    });
    expect(movimento).toMatchObject({ tipo: "COMPRA", quantidade: 10, saldoDepois: 10 });

    const antes = await prisma.lancamento.count();
    const inativo = await criarProduto({ ativo: false });
    const base = { produtoId: id, quantidade: 1, totalCentavos: 100, forma: "PIX", data: hoje() };
    for (const invalido of [
      { data: amanha() },
      { produtoId: inativo },
      { quantidade: 0 },
      { quantidade: 10_001 },
      { quantidade: 1.5 },
      { totalCentavos: 0 },
    ]) {
      const resposta = await api.post("/estoque/compras", { ...base, ...invalido }, token);
      expect(resposta.status).toBe(400);
    }
    await api
      .post(
        "/estoque/compras",
        { ...base, produtoId: "00000000-0000-4000-8000-000000000000" },
        token,
      )
      .expect(404);
    expect(await prisma.lancamento.count()).toBe(antes);
    expect((await produto(id)).saldo).toBe(30);
  });

  it("ESTQ-CA-03: venda com vários itens baixa o saldo, guarda preço e custo e lança a entrada no turno", async () => {
    const { api, token } = admin;
    const turno = await abrirCaixa();
    const agua = await criarProduto({ precoCentavos: 500 });
    const pastel = await criarProduto({ precoCentavos: 800 });
    await comprar(agua, 10, 2000);
    await comprar(pastel, 5, 2500);

    const venda = await vender(
      [
        { produtoId: agua, quantidade: 2 },
        { produtoId: pastel, quantidade: 1 },
        { produtoId: agua, quantidade: 1 },
      ],
      "PIX",
    );
    expect(venda.status).toBe(201);
    expect(venda.body.totalCentavos).toBe(3 * 500 + 800);
    expect(await produto(agua)).toMatchObject({ saldo: 7 });
    expect(await produto(pastel)).toMatchObject({ saldo: 4 });
    const itens = await prisma.itemVenda.findMany({ where: { vendaId: venda.body.id } });
    expect(itens).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          produtoId: agua,
          quantidade: 3,
          precoCentavos: 500,
          custoCentavos: 200,
        }),
        expect.objectContaining({
          produtoId: pastel,
          quantidade: 1,
          precoCentavos: 800,
          custoCentavos: 500,
        }),
      ]),
    );
    expect(
      await prisma.lancamento.findUniqueOrThrow({ where: { id: venda.body.lancamentoId } }),
    ).toMatchObject({
      tipo: "ENTRADA",
      categoria: "VENDA",
      valorCentavos: 2300,
      forma: "PIX",
      sessaoId: turno,
      origemId: venda.body.id,
    });

    // Sem saldo: a venda inteira é recusada e nada muda.
    const antes = await prisma.lancamento.count();
    const semSaldo = await vender([
      { produtoId: agua, quantidade: 1 },
      { produtoId: pastel, quantidade: 5 },
    ]);
    expect(semSaldo.status).toBe(409);
    expect(semSaldo.body.mensagem ?? semSaldo.text).toMatch(/Saldo insuficiente/);
    expect((await produto(agua)).saldo).toBe(7);
    const inativo = await criarProduto({ ativo: false });
    expect((await vender([{ produtoId: inativo, quantidade: 1 }])).status).toBe(400);
    expect((await vender([])).status).toBe(400);
    expect((await vender([{ produtoId: agua, quantidade: 1 }], "CHEQUE")).status).toBe(400);
    expect(await prisma.lancamento.count()).toBe(antes);

    await fecharCaixa();
    expect((await vender([{ produtoId: agua, quantidade: 1 }])).status).toBe(409);
    expect((await produto(agua)).saldo).toBe(7);
    await abrirCaixa();

    const doDia = await api.get(`/estoque/vendas?data=${hoje()}`, token).expect(200);
    expect(doDia.body.vendas).toContainEqual(
      expect.objectContaining({ id: venda.body.id, totalCentavos: 2300, forma: "PIX" }),
    );
  });

  it("ESTQ-CA-04: duas vendas simultâneas do último item: só uma passa e o saldo não fica negativo", async () => {
    const id = await criarProduto();
    await comprar(id, 1, 200);
    const respostas = await Promise.all([
      vender([{ produtoId: id, quantidade: 1 }]),
      vender([{ produtoId: id, quantidade: 1 }]),
      vender([{ produtoId: id, quantidade: 1 }]),
    ]);
    expect(respostas.map((r) => r.status).sort((a, b) => a - b)).toEqual([201, 409, 409]);
    expect((await produto(id)).saldo).toBe(0);
    expect(await prisma.itemVenda.count({ where: { produtoId: id } })).toBe(1);
  });

  it("ESTQ-CA-05: administrador ajusta o saldo com motivo; ajuste que deixaria negativo é recusado", async () => {
    const { api, token, usuario } = admin;
    const id = await criarProduto();
    await comprar(id, 5, 1000);
    await api
      .post("/estoque/ajustes", { produtoId: id, quantidade: -2, motivo: "Venceu" }, token)
      .expect(201);
    await api
      .post("/estoque/ajustes", { produtoId: id, quantidade: 4, motivo: "Inventário" }, token)
      .expect(201);
    expect(await produto(id)).toMatchObject({ saldo: 7, custoMedioCentavos: 200 });
    await api
      .post("/estoque/ajustes", { produtoId: id, quantidade: -8, motivo: "Sumiu" }, token)
      .expect(409);
    await api
      .post("/estoque/ajustes", { produtoId: id, quantidade: 0, motivo: "Nada" }, token)
      .expect(400);
    await api.post("/estoque/ajustes", { produtoId: id, quantidade: -1 }, token).expect(400);
    expect((await produto(id)).saldo).toBe(7);
    const ajustes = await prisma.movimentoEstoque.findMany({
      where: { produtoId: id, tipo: "AJUSTE" },
      orderBy: { criadoEm: "asc" },
    });
    expect(ajustes.map((m) => [m.quantidade, m.saldoDepois, m.motivo, m.criadoPorId])).toEqual([
      [-2, 3, "Venceu", usuario.id],
      [4, 7, "Inventário", usuario.id],
    ]);
    // O histórico do estoque não muda nem é apagado.
    await expect(
      prisma.movimentoEstoque.update({ where: { id: ajustes[0]!.id }, data: { quantidade: 1 } }),
    ).rejects.toThrow();
    await expect(
      prisma.movimentoEstoque.delete({ where: { id: ajustes[0]!.id } }),
    ).rejects.toThrow();
  });

  it("ESTQ-CA-06: estorna venda e compra com motivo, com lançamento contrário; estornar de novo é recusado", async () => {
    const { api, token } = admin;
    const turno = await abrirCaixa();
    const id = await criarProduto({ precoCentavos: 700 });
    const compra = await comprar(id, 6, 1800);
    const venda = await vender([{ produtoId: id, quantidade: 2 }]);
    expect(venda.status).toBe(201);

    await api.post(`/estoque/vendas/${venda.body.id}/estornar`, {}, token).expect(400);
    const respostas = await Promise.all([
      api.post(`/estoque/vendas/${venda.body.id}/estornar`, { motivo: "Desistiu" }, token),
      api.post(`/estoque/vendas/${venda.body.id}/estornar`, { motivo: "Desistiu" }, token),
    ]);
    expect(respostas.map((r) => r.status).sort((a, b) => a - b)).toEqual([200, 409]);
    expect((await produto(id)).saldo).toBe(6);
    const estornoVenda = await prisma.lancamento.findUniqueOrThrow({
      where: { estornoDeId: venda.body.lancamentoId },
    });
    expect(estornoVenda).toMatchObject({
      tipo: "SAIDA",
      valorCentavos: 1400,
      forma: "DINHEIRO",
      categoria: "ESTORNO",
      sessaoId: turno,
    });

    // Compra com saldo vendido não pode ser desfeita.
    const vendaGrande = await vender([{ produtoId: id, quantidade: 3 }]);
    expect(vendaGrande.status).toBe(201);
    await api
      .post(`/estoque/compras/${compra.id}/estornar`, { motivo: "Errei a nota" }, token)
      .expect(409);
    await api
      .post(`/estoque/vendas/${vendaGrande.body.id}/estornar`, { motivo: "Volta" }, token)
      .expect(200);
    await api
      .post(`/estoque/compras/${compra.id}/estornar`, { motivo: "Errei a nota" }, token)
      .expect(200);
    await api
      .post(`/estoque/compras/${compra.id}/estornar`, { motivo: "De novo" }, token)
      .expect(409);
    expect((await produto(id)).saldo).toBe(0);
    expect(
      await prisma.lancamento.findUniqueOrThrow({ where: { estornoDeId: compra.lancamentoId } }),
    ).toMatchObject({ tipo: "ENTRADA", valorCentavos: 1800, categoria: "ESTORNO" });

    // Estorno de venda precisa de caixa aberto.
    await comprar(id, 1, 300);
    const ultima = await vender([{ produtoId: id, quantidade: 1 }]);
    await fecharCaixa();
    await api
      .post(`/estoque/vendas/${ultima.body.id}/estornar`, { motivo: "Sem caixa" }, token)
      .expect(409);
    await abrirCaixa();
    await api
      .post(
        "/estoque/vendas/00000000-0000-4000-8000-000000000000/estornar",
        { motivo: "Nada" },
        token,
      )
      .expect(404);
  });

  it("ESTQ-CA-07: lista com saldo, custo médio e alerta de mínimo; extrato com saldo depois", async () => {
    const { api, token } = admin;
    const id = await criarProduto({ estoqueMinimo: 5 });
    await comprar(id, 8, 2400);
    let lista = await api.get("/produtos", token).expect(200);
    expect(lista.body.find((p: { id: string }) => p.id === id)).toMatchObject({
      saldo: 8,
      custoMedioCentavos: 300,
      abaixoDoMinimo: false,
    });
    await vender([{ produtoId: id, quantidade: 3 }]);
    lista = await api.get("/produtos", token).expect(200);
    expect(lista.body.find((p: { id: string }) => p.id === id)).toMatchObject({
      saldo: 5,
      abaixoDoMinimo: true,
    });

    const extrato = await api.get(`/produtos/${id}/movimentos`, token).expect(200);
    expect(extrato.body.produto).toMatchObject({ id, saldo: 5, abaixoDoMinimo: true });
    expect(
      extrato.body.movimentos.map(
        (m: { tipo: string; quantidade: number; saldoDepois: number }) => [
          m.tipo,
          m.quantidade,
          m.saldoDepois,
        ],
      ),
    ).toEqual([
      ["VENDA", -3, 5],
      ["COMPRA", 8, 8],
    ]);
    const compras = await api.get(`/produtos/${id}/compras`, token).expect(200);
    expect(compras.body).toHaveLength(1);
    await api.get("/produtos/00000000-0000-4000-8000-000000000000/movimentos", token).expect(404);
  });

  it("ESTQ-CA-08: atendente vende e compra, mas não cadastra, ajusta nem estorna; professor não acessa", async () => {
    const atendente = await logado(app, "ATENDENTE");
    const id = await criarProduto();
    const compra = await comprar(id, 4, 800, atendente);
    const venda = await vender([{ produtoId: id, quantidade: 1 }], "PIX", atendente);
    expect(venda.status).toBe(201);
    await atendente.api.get("/produtos", atendente.token).expect(200);
    await atendente.api.get(`/produtos/${id}/movimentos`, atendente.token).expect(200);
    await atendente.api.get("/estoque/vendas", atendente.token).expect(200);
    await atendente.api
      .post("/produtos", { nome: unico("Proibido"), precoCentavos: 100 }, atendente.token)
      .expect(403);
    await atendente.api
      .patch(`/produtos/${id}`, { nome: unico("X"), precoCentavos: 1 }, atendente.token)
      .expect(403);
    await atendente.api
      .post("/estoque/ajustes", { produtoId: id, quantidade: -1, motivo: "Teste" }, atendente.token)
      .expect(403);
    await atendente.api
      .post(`/estoque/vendas/${venda.body.id}/estornar`, { motivo: "Teste" }, atendente.token)
      .expect(403);
    await atendente.api
      .post(`/estoque/compras/${compra.id}/estornar`, { motivo: "Teste" }, atendente.token)
      .expect(403);

    const professor = await logado(app, "PROFESSOR");
    await professor.api.get("/produtos", professor.token).expect(403);
    await professor.api.get(`/produtos/${id}/movimentos`, professor.token).expect(403);
    await professor.api.get("/estoque/vendas", professor.token).expect(403);
    expect((await vender([{ produtoId: id, quantidade: 1 }], "PIX", professor)).status).toBe(403);
    await professor.api
      .post(
        "/estoque/compras",
        { produtoId: id, quantidade: 1, totalCentavos: 100, forma: "PIX", data: hoje() },
        professor.token,
      )
      .expect(403);
    expect((await produto(id)).saldo).toBe(3);
  });

  it("ESTQ-CA-09: cadastro, alteração, compra, venda, ajuste e estornos ficam na auditoria com autor, data e IP", async () => {
    const { api, token, usuario } = admin;
    const id = await criarProduto({ precoCentavos: 600 });
    const nome = (await produto(id)).nome;
    await api
      .patch(`/produtos/${id}`, { nome, precoCentavos: 650, estoqueMinimo: 5, ativo: true }, token)
      .expect(200);
    const compra = await comprar(id, 3, 900);
    const venda = await vender([{ produtoId: id, quantidade: 1 }]);
    await api
      .post(
        "/estoque/ajustes",
        { produtoId: id, quantidade: 1, motivo: "Achou no depósito" },
        token,
      )
      .expect(201);
    await api
      .post(`/estoque/vendas/${venda.body.id}/estornar`, { motivo: "Engano" }, token)
      .expect(200);
    await api
      .post(`/estoque/compras/${compra.id}/estornar`, { motivo: "Engano" }, token)
      .expect(200);

    const registros = await prisma.auditoria.findMany({
      where: { OR: [{ alvoId: id }, { alvoId: venda.body.id }] },
      orderBy: { criadaEm: "asc" },
    });
    expect(registros.map((r) => r.acao)).toEqual([
      "PRODUTO_CRIADO",
      "PRODUTO_ALTERADO",
      "COMPRA_REGISTRADA",
      "VENDA_REGISTRADA",
      "ESTOQUE_AJUSTADO",
      "VENDA_ESTORNADA",
      "COMPRA_ESTORNADA",
    ]);
    for (const registro of registros) {
      expect(registro.atorId).toBe(usuario.id);
      expect(registro.ip).toBeTruthy();
      expect(registro.criadaEm).toBeInstanceOf(Date);
    }
    expect(registros[1]?.detalhes).toMatchObject({ precoAnterior: 600, precoNovo: 650 });
    expect(registros[4]?.detalhes).toMatchObject({ quantidade: 1, motivo: "Achou no depósito" });
  });
});
