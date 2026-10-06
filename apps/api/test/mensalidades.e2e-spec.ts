import type { INestApplication } from "@nestjs/common";
import { hojeEmSaoPaulo } from "../src/aulas/regras.js";
import { GeracaoAutomaticaService } from "../src/mensalidades/geracao-automatica.service.js";
import { PrismaService } from "../src/prisma/prisma.service.js";
import { criarApp } from "./apoio.js";
import { criarAluno, logado, unico } from "./apoio-aulas.js";
import {
  assinar,
  criarPlano,
  mensalidadeNoPassado,
  mesAtual,
  mesesAtras,
  proximoMes,
} from "./apoio-mensalidades.js";

const hoje = () => hojeEmSaoPaulo(new Date());

describe("Etapa 3: mensalidades e Caixa", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let admin: Awaited<ReturnType<typeof logado>>;

  beforeAll(async () => {
    app = await criarApp();
    prisma = app.get(PrismaService);
    admin = await logado(app, "ADMINISTRADOR");
  });

  afterAll(async () => {
    await app.close();
  });

  /** Aluno com plano a partir do mês informado e a mensalidade desse mês gerada. */
  async function alunoComMensalidade(
    opcoes: { competencia?: string; valorCentavos?: number; desconto?: number } = {},
  ) {
    const { api, token } = admin;
    const competencia = opcoes.competencia ?? proximoMes();
    const alunoId = await criarAluno(api, token);
    const planoId = await criarPlano(api, token, { valorCentavos: opcoes.valorCentavos ?? 15000 });
    await assinar(api, token, alunoId, planoId, {
      inicio: competencia,
      diaVencimento: 5,
      ...(opcoes.desconto ? { descontoCentavos: opcoes.desconto, motivoDesconto: "Irmãos" } : {}),
    });
    await api.post("/mensalidades/geracoes", { competencia }, token).expect(201);
    const mensalidade = await prisma.mensalidade.findFirstOrThrow({
      where: { alunoId, competencia: new Date(`${competencia}-01T00:00:00Z`) },
    });
    return { alunoId, planoId, competencia, mensalidadeId: mensalidade.id };
  }

  describe("planos e assinaturas", () => {
    it("MENS-CA-01: administrador cadastra plano; nome repetido e faixas inválidas são recusados", async () => {
      const { api, token } = admin;
      const nome = unico("Plano 2x");
      const criado = await api
        .post("/planos", { nome, aulasPorSemana: 2, valorCentavos: 18000 }, token)
        .expect(201);
      const lista = await api.get("/planos", token).expect(200);
      expect(lista.body).toContainEqual(
        expect.objectContaining({ id: criado.body.id, nome, valorCentavos: 18000, ativo: true }),
      );

      await api
        .post("/planos", { nome, aulasPorSemana: 3, valorCentavos: 20000 }, token)
        .expect(409);
      for (const invalido of [
        { aulasPorSemana: 0, valorCentavos: 15000 },
        { aulasPorSemana: 8, valorCentavos: 15000 },
        { aulasPorSemana: 2, valorCentavos: 99 },
        { aulasPorSemana: 2, valorCentavos: 1_000_001 },
        { aulasPorSemana: 2, valorCentavos: 150.5 },
      ]) {
        await api.post("/planos", { nome: unico("Plano"), ...invalido }, token).expect(400);
      }
      // O banco também recusa, mesmo sem passar pela API.
      await expect(
        prisma.plano.create({
          data: { nome: unico("Plano"), aulasPorSemana: 2, valorCentavos: 0 },
        }),
      ).rejects.toThrow();
    });

    it("MENS-CA-02: define o plano do aluno e recusa plano inativo, aluno inativo, dia fora da faixa e desconto sem motivo", async () => {
      const { api, token } = admin;
      const alunoId = await criarAluno(api, token);
      const planoId = await criarPlano(api, token, { valorCentavos: 15000 });
      const rota = `/alunos/${alunoId}/assinatura`;
      const base = { planoId, diaVencimento: 10, inicio: mesAtual() };

      await api.put(rota, { ...base, diaVencimento: 0 }, token).expect(400);
      await api.put(rota, { ...base, diaVencimento: 29 }, token).expect(400);
      await api.put(rota, { ...base, descontoCentavos: 2000 }, token).expect(400);
      await api
        .put(rota, { ...base, descontoCentavos: 15000, motivoDesconto: "Bolsa" }, token)
        .expect(400);
      await api.put(rota, { ...base, inicio: mesesAtras(1) }, token).expect(400);

      await api
        .put(rota, { ...base, descontoCentavos: 3000, motivoDesconto: "Irmãos" }, token)
        .expect(200);
      const assinaturas = await api.get(`/alunos/${alunoId}/assinaturas`, token).expect(200);
      expect(assinaturas.body.vigente).toMatchObject({
        diaVencimento: 10,
        descontoCentavos: 3000,
        motivoDesconto: "Irmãos",
        valorCentavos: 12000,
        inicio: mesAtual(),
        fim: null,
      });

      const inativo = await criarPlano(api, token);
      await api
        .patch(
          `/planos/${inativo}`,
          { nome: unico("Plano"), aulasPorSemana: 1, valorCentavos: 9000, ativo: false },
          token,
        )
        .expect(200);
      await api.put(rota, { ...base, planoId: inativo }, token).expect(409);

      const outroAluno = await criarAluno(api, token);
      await api.post(`/alunos/${outroAluno}/inativar`, {}, token).expect(200);
      await api.put(`/alunos/${outroAluno}/assinatura`, base, token).expect(409);
    });

    it("MENS-CA-03: trocar o plano encerra a assinatura anterior e nunca deixa duas vigentes", async () => {
      const { api, token } = admin;
      const alunoId = await criarAluno(api, token);
      const plano1 = await criarPlano(api, token, { valorCentavos: 12000 });
      const plano2 = await criarPlano(api, token, { valorCentavos: 18000 });
      await assinar(api, token, alunoId, plano1, { inicio: mesAtual() });
      await assinar(api, token, alunoId, plano2, { inicio: proximoMes() });

      const { body } = await api.get(`/alunos/${alunoId}/assinaturas`, token).expect(200);
      expect(body.historico).toHaveLength(2);
      expect(body.vigente).toMatchObject({
        plano: { id: plano2 },
        inicio: proximoMes(),
        fim: null,
      });
      expect(body.historico[1]).toMatchObject({
        plano: { id: plano1 },
        inicio: mesAtual(),
        fim: proximoMes(),
      });

      // Duas trocas ao mesmo tempo: no fim só uma assinatura está vigente.
      await Promise.all([
        api.put(
          `/alunos/${alunoId}/assinatura`,
          { planoId: plano1, diaVencimento: 5, inicio: proximoMes() },
          token,
        ),
        api.put(
          `/alunos/${alunoId}/assinatura`,
          { planoId: plano2, diaVencimento: 6, inicio: proximoMes() },
          token,
        ),
      ]);
      expect(await prisma.assinatura.count({ where: { alunoId, fim: null } })).toBe(1);
    });

    it("MENS-CA-04: inativar ou anonimizar o aluno encerra a assinatura e ele não recebe mensalidade nos meses seguintes", async () => {
      const { api, token } = admin;
      const planoId = await criarPlano(api, token);
      const inativado = await criarAluno(api, token);
      const anonimizado = await criarAluno(api, token);
      await assinar(api, token, inativado, planoId);
      await assinar(api, token, anonimizado, planoId);

      await api.post(`/alunos/${inativado}/inativar`, {}, token).expect(200);
      await api.post(`/alunos/${anonimizado}/anonimizar`, {}, token).expect(200);
      for (const alunoId of [inativado, anonimizado]) {
        const { body } = await api.get(`/alunos/${alunoId}/assinaturas`, token).expect(200);
        expect(body.vigente).toBeNull();
        expect(body.historico[0].fim).toBe(proximoMes());
      }

      await api.post("/mensalidades/geracoes", { competencia: proximoMes() }, token).expect(201);
      expect(
        await prisma.mensalidade.count({ where: { alunoId: { in: [inativado, anonimizado] } } }),
      ).toBe(0);

      // Encerrar o plano direto também funciona, e sem plano vigente é recusado.
      const outro = await criarAluno(api, token);
      await assinar(api, token, outro, planoId);
      await api.delete(`/alunos/${outro}/assinatura`, token).expect(200);
      await api.delete(`/alunos/${outro}/assinatura`, token).expect(409);
    });
  });

  describe("geração", () => {
    it("MENS-CA-05: gera uma mensalidade por assinatura vigente, com desconto e vencimento, sem duplicar", async () => {
      const { api, token } = admin;
      const { alunoId, competencia } = await alunoComMensalidade({
        valorCentavos: 16000,
        desconto: 4000,
      });
      const mensalidade = await prisma.mensalidade.findFirstOrThrow({ where: { alunoId } });
      expect(mensalidade.valorCentavos).toBe(12000);
      expect(mensalidade.vencimento.toISOString().slice(0, 10)).toBe(`${competencia}-05`);

      // Gerar de novo, inclusive duas vezes ao mesmo tempo, não cria outra.
      const segunda = await api.post("/mensalidades/geracoes", { competencia }, token).expect(201);
      expect(segunda.body.competencia).toBe(competencia);
      await Promise.all([
        api.post("/mensalidades/geracoes", { competencia }, token),
        api.post("/mensalidades/geracoes", { competencia }, token),
      ]);
      expect(await prisma.mensalidade.count({ where: { alunoId } })).toBe(1);

      // Mês inválido ou longe demais é recusado.
      await api.post("/mensalidades/geracoes", { competencia: "2026-13" }, token).expect(400);
      await api.post("/mensalidades/geracoes", { competencia: "2099-01" }, token).expect(400);
    });

    it("MENS-CA-06: mudar o valor do plano não altera as mensalidades já geradas", async () => {
      const { api, token } = admin;
      const { alunoId, planoId } = await alunoComMensalidade({ valorCentavos: 15000 });
      const plano = await prisma.plano.findUniqueOrThrow({ where: { id: planoId } });
      await api
        .patch(
          `/planos/${planoId}`,
          { nome: plano.nome, aulasPorSemana: 2, valorCentavos: 20000, ativo: true },
          token,
        )
        .expect(200);
      const mensalidade = await prisma.mensalidade.findFirstOrThrow({ where: { alunoId } });
      expect(mensalidade.valorCentavos).toBe(15000);
    });

    it("MENS-CA-07: a geração automática cria as mensalidades do mês corrente de São Paulo", async () => {
      const { api, token } = admin;
      const alunoId = await criarAluno(api, token);
      const planoId = await criarPlano(api, token);
      await assinar(api, token, alunoId, planoId, { inicio: mesAtual() });

      const resultado = await app.get(GeracaoAutomaticaService).executar();
      expect(resultado?.competencia).toBe(mesAtual());
      const mensalidade = await prisma.mensalidade.findFirstOrThrow({ where: { alunoId } });
      expect(mensalidade.competencia.toISOString().slice(0, 7)).toBe(mesAtual());

      const auditoria = await prisma.auditoria.findFirst({
        where: { acao: "MENSALIDADES_GERADAS", atorId: null },
        orderBy: { id: "desc" },
      });
      expect(auditoria?.detalhes).toMatchObject({ competencia: mesAtual(), automatica: true });
    });
  });

  describe("situação e pagamento", () => {
    it("MENS-CA-08: mensalidade que ainda vai vencer está em aberto e a vencida está atrasada", async () => {
      const { api, token, usuario } = admin;
      const { mensalidadeId: futura } = await alunoComMensalidade();
      const alunoId = await criarAluno(api, token);
      const planoId = await criarPlano(api, token);
      const vencida = await mensalidadeNoPassado(app, alunoId, planoId, usuario.id, mesesAtras(1));

      expect((await api.get(`/mensalidades/${futura}`, token).expect(200)).body.situacao).toBe(
        "EM_ABERTO",
      );
      expect((await api.get(`/mensalidades/${vencida}`, token).expect(200)).body.situacao).toBe(
        "ATRASADA",
      );
    });

    it("MENS-CA-09 e MENS-CA-11: pagamento marca como paga, lança entrada no Caixa e gera recibo numerado", async () => {
      const { api, token, usuario } = admin;
      const { mensalidadeId, competencia } = await alunoComMensalidade({ valorCentavos: 17500 });
      const pago = await api
        .post(`/mensalidades/${mensalidadeId}/pagamentos`, { forma: "PIX", data: hoje() }, token)
        .expect(201);
      expect(pago.body.numeroRecibo).toEqual(expect.any(Number));

      const detalhe = await api.get(`/mensalidades/${mensalidadeId}`, token).expect(200);
      expect(detalhe.body).toMatchObject({
        situacao: "PAGA",
        pagamento: { id: pago.body.id, forma: "PIX", data: hoje() },
      });

      const lancamento = await prisma.lancamento.findFirstOrThrow({
        where: { origemId: mensalidadeId },
      });
      expect(lancamento).toMatchObject({
        tipo: "ENTRADA",
        valorCentavos: 17500,
        forma: "PIX",
        categoria: "MENSALIDADE",
        criadoPorId: usuario.id,
      });
      expect(lancamento.data.toISOString().slice(0, 10)).toBe(hoje());
      // O livro-razão é imutável: nada de dado pessoal nele.
      const aluno = await prisma.mensalidade.findUniqueOrThrow({
        where: { id: mensalidadeId },
        include: { aluno: true },
      });
      expect(lancamento.descricao).not.toContain(aluno.aluno.nome);

      const recibo = await api.get(`/pagamentos/${pago.body.id}/recibo`, token).expect(200);
      expect(recibo.body).toMatchObject({
        numero: pago.body.numeroRecibo,
        aluno: aluno.aluno.nome,
        competencia,
        valorCentavos: 17500,
        forma: "PIX",
        data: hoje(),
        recebidoPor: usuario.nome,
        estornado: false,
      });

      // Recibos seguem em sequência.
      const { mensalidadeId: outra } = await alunoComMensalidade();
      const seguinte = await api
        .post(`/mensalidades/${outra}/pagamentos`, { forma: "DINHEIRO", data: hoje() }, token)
        .expect(201);
      expect(seguinte.body.numeroRecibo).toBeGreaterThan(pago.body.numeroRecibo);
    });

    it("MENS-CA-10: pagamento futuro, repetido, de mensalidade cancelada ou simultâneo é recusado", async () => {
      const { api, token } = admin;
      const { mensalidadeId } = await alunoComMensalidade();
      const rota = `/mensalidades/${mensalidadeId}/pagamentos`;
      await api.post(rota, { forma: "PIX", data: "2099-01-01" }, token).expect(400);
      await api.post(rota, { forma: "BOLETO", data: hoje() }, token).expect(400);

      const respostas = await Promise.all([
        api.post(rota, { forma: "PIX", data: hoje() }, token),
        api.post(rota, { forma: "DINHEIRO", data: hoje() }, token),
      ]);
      expect(respostas.map((r) => r.status).sort((a, b) => a - b)).toEqual([201, 409]);
      expect(await prisma.lancamento.count({ where: { origemId: mensalidadeId } })).toBe(1);
      await api.post(rota, { forma: "PIX", data: hoje() }, token).expect(409);

      const { mensalidadeId: cancelada } = await alunoComMensalidade();
      await api
        .post(`/mensalidades/${cancelada}/cancelar`, { motivo: "Aluno trancou" }, token)
        .expect(200);
      await api
        .post(`/mensalidades/${cancelada}/pagamentos`, { forma: "PIX", data: hoje() }, token)
        .expect(409);
    });

    it("MENS-CA-12: estorno lança saída ligada ao original, devolve a mensalidade e não repete", async () => {
      const { api, token } = admin;
      const { mensalidadeId } = await alunoComMensalidade({ valorCentavos: 14000 });
      const pago = await api
        .post(
          `/mensalidades/${mensalidadeId}/pagamentos`,
          { forma: "CARTAO_DEBITO", data: hoje() },
          token,
        )
        .expect(201);

      await api.post(`/pagamentos/${pago.body.id}/estornar`, {}, token).expect(400);
      const respostas = await Promise.all([
        api.post(
          `/pagamentos/${pago.body.id}/estornar`,
          { motivo: "Registrado no aluno errado" },
          token,
        ),
        api.post(
          `/pagamentos/${pago.body.id}/estornar`,
          { motivo: "Registrado no aluno errado" },
          token,
        ),
      ]);
      expect(respostas.map((r) => r.status).sort((a, b) => a - b)).toEqual([200, 409]);

      const original = await prisma.lancamento.findFirstOrThrow({
        where: { origemId: mensalidadeId },
      });
      const estornos = await prisma.lancamento.findMany({ where: { estornoDeId: original.id } });
      expect(estornos).toHaveLength(1);
      expect(estornos[0]).toMatchObject({
        tipo: "SAIDA",
        valorCentavos: 14000,
        forma: "CARTAO_DEBITO",
        categoria: "ESTORNO",
      });

      const detalhe = await api.get(`/mensalidades/${mensalidadeId}`, token).expect(200);
      expect(detalhe.body.situacao).toBe("EM_ABERTO");
      expect(detalhe.body.pagamento).toBeNull();
      expect(detalhe.body.pagamentos[0].estorno).toMatchObject({
        motivo: "Registrado no aluno errado",
      });
      const recibo = await api.get(`/pagamentos/${pago.body.id}/recibo`, token).expect(200);
      expect(recibo.body.estornado).toBe(true);

      // Depois do estorno, a mensalidade pode ser paga de novo.
      await api
        .post(`/mensalidades/${mensalidadeId}/pagamentos`, { forma: "PIX", data: hoje() }, token)
        .expect(201);
    });

    it("MENS-CA-13: cancela mensalidade em aberto ou atrasada com motivo; paga não pode ser cancelada", async () => {
      const { api, token, usuario } = admin;
      const { mensalidadeId } = await alunoComMensalidade();
      await api.post(`/mensalidades/${mensalidadeId}/cancelar`, {}, token).expect(400);
      await api
        .post(`/mensalidades/${mensalidadeId}/cancelar`, { motivo: "Combinado com o aluno" }, token)
        .expect(200);
      const cancelada = await api.get(`/mensalidades/${mensalidadeId}`, token).expect(200);
      expect(cancelada.body).toMatchObject({
        situacao: "CANCELADA",
        cancelamento: { motivo: "Combinado com o aluno" },
      });
      await api
        .post(`/mensalidades/${mensalidadeId}/cancelar`, { motivo: "De novo" }, token)
        .expect(409);

      const alunoId = await criarAluno(api, token);
      const planoId = await criarPlano(api, token);
      const atrasada = await mensalidadeNoPassado(app, alunoId, planoId, usuario.id, mesesAtras(2));
      await api
        .post(`/mensalidades/${atrasada}/cancelar`, { motivo: "Aula suspensa" }, token)
        .expect(200);

      const { mensalidadeId: paga } = await alunoComMensalidade();
      await api
        .post(`/mensalidades/${paga}/pagamentos`, { forma: "PIX", data: hoje() }, token)
        .expect(201);
      const recusa = await api
        .post(`/mensalidades/${paga}/cancelar`, { motivo: "Engano" }, token)
        .expect(409);
      expect(recusa.body.message).toContain("Estorne antes");
    });
  });

  describe("consultas", () => {
    it("MENS-CA-14: inadimplentes mostra quantas mensalidades atrasadas, total e dias da mais antiga", async () => {
      const { api, token, usuario } = admin;
      const alunoId = await criarAluno(api, token);
      const planoId = await criarPlano(api, token);
      await mensalidadeNoPassado(app, alunoId, planoId, usuario.id, mesesAtras(3), 15000);
      await mensalidadeNoPassado(app, alunoId, planoId, usuario.id, mesesAtras(2), 12000);
      const paga = await mensalidadeNoPassado(app, alunoId, planoId, usuario.id, mesesAtras(1));
      await api
        .post(`/mensalidades/${paga}/pagamentos`, { forma: "PIX", data: hoje() }, token)
        .expect(201);

      const { body } = await api.get("/mensalidades/inadimplentes", token).expect(200);
      const linha = body.itens.find((i: { aluno: { id: string } }) => i.aluno.id === alunoId);
      const antiga = `${mesesAtras(3)}-10`;
      const dias = Math.round((Date.parse(hoje()) - Date.parse(antiga)) / 86_400_000);
      expect(linha).toMatchObject({
        quantidade: 2,
        totalCentavos: 27000,
        vencimentoMaisAntigo: antiga,
        diasDeAtraso: dias,
      });
    });

    it("MENS-CA-15: lista do mês filtra por situação, busca por nome e soma previsto, recebido e em aberto", async () => {
      const { api, token } = admin;
      const competencia = proximoMes();
      const nome = unico("Beatriz Areia");
      const alunoId = await criarAluno(api, token, { nome });
      const planoId = await criarPlano(api, token, { valorCentavos: 15000 });
      await assinar(api, token, alunoId, planoId, { inicio: competencia });
      await api.post("/mensalidades/geracoes", { competencia }, token).expect(201);

      const antes = await api.get(`/mensalidades?competencia=${competencia}`, token).expect(200);
      const busca = await api
        .get(
          `/mensalidades?competencia=${competencia}&busca=${encodeURIComponent(nome.toUpperCase().replace("Á", "A"))}`,
          token,
        )
        .expect(200);
      expect(busca.body.itens).toHaveLength(1);
      expect(busca.body.itens[0]).toMatchObject({
        aluno: { id: alunoId, nome },
        situacao: "EM_ABERTO",
      });

      await api
        .post(
          `/mensalidades/${busca.body.itens[0].id}/pagamentos`,
          { forma: "DINHEIRO", data: hoje() },
          token,
        )
        .expect(201);
      const depois = await api.get(`/mensalidades?competencia=${competencia}`, token).expect(200);
      expect(depois.body.totais.previsto).toBe(antes.body.totais.previsto);
      expect(depois.body.totais.recebido).toBe(antes.body.totais.recebido + 15000);
      expect(depois.body.totais.emAberto).toBe(antes.body.totais.emAberto - 15000);

      const pagas = await api
        .get(`/mensalidades?competencia=${competencia}&situacao=PAGA`, token)
        .expect(200);
      expect(pagas.body.itens.every((i: { situacao: string }) => i.situacao === "PAGA")).toBe(true);
      expect(pagas.body.itens.map((i: { aluno: { id: string } }) => i.aluno.id)).toContain(alunoId);
      const emAberto = await api
        .get(`/mensalidades?competencia=${competencia}&situacao=EM_ABERTO`, token)
        .expect(200);
      expect(emAberto.body.itens.map((i: { aluno: { id: string } }) => i.aluno.id)).not.toContain(
        alunoId,
      );
      await api.get(`/mensalidades?competencia=outubro`, token).expect(400);
    });
  });

  describe("Caixa", () => {
    it("MENS-CA-16: lançamentos não podem ser alterados nem apagados, e valor zero ou negativo é recusado", async () => {
      const { api, token, usuario } = admin;
      const { mensalidadeId } = await alunoComMensalidade();
      await api
        .post(`/mensalidades/${mensalidadeId}/pagamentos`, { forma: "PIX", data: hoje() }, token)
        .expect(201);
      const lancamento = await prisma.lancamento.findFirstOrThrow({
        where: { origemId: mensalidadeId },
      });

      await expect(
        prisma.lancamento.update({ where: { id: lancamento.id }, data: { valorCentavos: 1 } }),
      ).rejects.toThrow();
      await expect(prisma.lancamento.delete({ where: { id: lancamento.id } })).rejects.toThrow();
      await expect(prisma.$executeRawUnsafe('TRUNCATE "Lancamento" CASCADE')).rejects.toThrow();
      for (const valorCentavos of [0, -100]) {
        await expect(
          prisma.lancamento.create({
            data: {
              tipo: "ENTRADA",
              valorCentavos,
              forma: "PIX",
              data: new Date(`${hoje()}T00:00:00Z`),
              categoria: "MENSALIDADE",
              descricao: "Teste",
              criadoPorId: usuario.id,
            },
          }),
        ).rejects.toThrow();
      }
      const intacto = await prisma.lancamento.findUniqueOrThrow({ where: { id: lancamento.id } });
      expect(intacto.valorCentavos).toBe(lancamento.valorCentavos);
    });

    it("MENS-CA-17: o Caixa do dia mostra os lançamentos e o saldo por forma de pagamento", async () => {
      const { api, token } = admin;
      const antes = await api.get(`/caixa/lancamentos?data=${hoje()}`, token).expect(200);
      const { mensalidadeId: a } = await alunoComMensalidade({ valorCentavos: 10000 });
      const { mensalidadeId: b } = await alunoComMensalidade({ valorCentavos: 20000 });
      await api
        .post(`/mensalidades/${a}/pagamentos`, { forma: "PIX", data: hoje() }, token)
        .expect(201);
      const pagoB = await api
        .post(`/mensalidades/${b}/pagamentos`, { forma: "CARTAO_CREDITO", data: hoje() }, token)
        .expect(201);
      await api
        .post(`/pagamentos/${pagoB.body.id}/estornar`, { motivo: "Cobrado em dobro" }, token)
        .expect(200);

      const depois = await api.get(`/caixa/lancamentos?data=${hoje()}`, token).expect(200);
      expect(depois.body.data).toBe(hoje());
      expect(depois.body.lancamentos.length).toBe(antes.body.lancamentos.length + 3);
      const r0 = antes.body.resumo;
      const r1 = depois.body.resumo;
      expect(r1.entradas).toBe(r0.entradas + 30000);
      expect(r1.saidas).toBe(r0.saidas + 20000);
      expect(r1.porForma.PIX.saldo).toBe(r0.porForma.PIX.saldo + 10000);
      expect(r1.porForma.CARTAO_CREDITO.saldo).toBe(r0.porForma.CARTAO_CREDITO.saldo);

      const semData = await api.get("/caixa/lancamentos", token).expect(200);
      expect(semData.body.data).toBe(hoje());
      await api.get("/caixa/lancamentos?data=2026-02-30", token).expect(400);
    });
  });

  describe("permissões e auditoria", () => {
    it("MENS-CA-18: atendente vê e registra pagamento, mas não estorna, cancela, gera nem mexe em planos", async () => {
      const atendente = await logado(app, "ATENDENTE");
      const { api, token } = atendente;
      const { alunoId, planoId, mensalidadeId, competencia } = await alunoComMensalidade();

      await api.get(`/mensalidades?competencia=${competencia}`, token).expect(200);
      await api.get("/mensalidades/inadimplentes", token).expect(200);
      await api.get(`/mensalidades/${mensalidadeId}`, token).expect(200);
      const pago = await api
        .post(
          `/mensalidades/${mensalidadeId}/pagamentos`,
          { forma: "DINHEIRO", data: hoje() },
          token,
        )
        .expect(201);
      await api.get(`/pagamentos/${pago.body.id}/recibo`, token).expect(200);
      await api.get("/caixa/lancamentos", token).expect(200);

      await api
        .post(`/pagamentos/${pago.body.id}/estornar`, { motivo: "Teste" }, token)
        .expect(403);
      await api
        .post(`/mensalidades/${mensalidadeId}/cancelar`, { motivo: "Teste" }, token)
        .expect(403);
      await api.post("/mensalidades/geracoes", { competencia }, token).expect(403);
      await api.get("/planos", token).expect(403);
      await api
        .post("/planos", { nome: unico("Plano"), aulasPorSemana: 1, valorCentavos: 9000 }, token)
        .expect(403);
      await api.get(`/alunos/${alunoId}/assinaturas`, token).expect(403);
      await api
        .put(
          `/alunos/${alunoId}/assinatura`,
          { planoId, diaVencimento: 5, inicio: mesAtual() },
          token,
        )
        .expect(403);
      await api.delete(`/alunos/${alunoId}/assinatura`, token).expect(403);

      const negado = await prisma.auditoria.findFirst({
        where: { acao: "ACESSO_NEGADO", atorId: atendente.usuario.id },
      });
      expect(negado).not.toBeNull();
    });

    it("MENS-CA-19: professor não acessa mensalidades, planos nem o Caixa", async () => {
      const { api, token } = await logado(app, "PROFESSOR");
      const { alunoId, mensalidadeId, competencia } = await alunoComMensalidade();
      await api.get(`/mensalidades?competencia=${competencia}`, token).expect(403);
      await api.get("/mensalidades/inadimplentes", token).expect(403);
      await api.get(`/mensalidades/${mensalidadeId}`, token).expect(403);
      await api
        .post(`/mensalidades/${mensalidadeId}/pagamentos`, { forma: "PIX", data: hoje() }, token)
        .expect(403);
      await api.get("/caixa/lancamentos", token).expect(403);
      await api.get("/planos", token).expect(403);
      await api.get(`/alunos/${alunoId}/assinaturas`, token).expect(403);
    });

    it("MENS-CA-20: planos, assinaturas, geração, pagamento, estorno e cancelamento ficam na auditoria", async () => {
      const { api, token, usuario } = admin;
      const { alunoId, planoId, mensalidadeId } = await alunoComMensalidade();
      const plano = await prisma.plano.findUniqueOrThrow({ where: { id: planoId } });
      await api
        .patch(
          `/planos/${planoId}`,
          { nome: plano.nome, aulasPorSemana: 3, valorCentavos: 21000, ativo: true },
          token,
        )
        .expect(200);
      const pago = await api
        .post(`/mensalidades/${mensalidadeId}/pagamentos`, { forma: "PIX", data: hoje() }, token)
        .expect(201);
      await api
        .post(`/pagamentos/${pago.body.id}/estornar`, { motivo: "Engano" }, token)
        .expect(200);
      await api
        .post(`/mensalidades/${mensalidadeId}/cancelar`, { motivo: "Desistiu" }, token)
        .expect(200);
      await api.delete(`/alunos/${alunoId}/assinatura`, token).expect(200);

      const registros = await prisma.auditoria.findMany({
        where: {
          atorId: usuario.id,
          OR: [
            { alvoId: planoId },
            { alvoId: alunoId },
            { alvoId: mensalidadeId },
            { acao: "MENSALIDADES_GERADAS" },
          ],
        },
      });
      const acoes = [...new Set(registros.map((r) => r.acao))];
      for (const acao of [
        "PLANO_CRIADO",
        "PLANO_ALTERADO",
        "ASSINATURA_DEFINIDA",
        "ASSINATURA_ENCERRADA",
        "MENSALIDADES_GERADAS",
        "PAGAMENTO_REGISTRADO",
        "PAGAMENTO_ESTORNADO",
        "MENSALIDADE_CANCELADA",
      ]) {
        expect(acoes, acao).toContain(acao);
      }
      const pagamento = registros.find((r) => r.acao === "PAGAMENTO_REGISTRADO");
      expect(pagamento?.ip).toBe(api.ip);
      expect(registros.find((r) => r.acao === "PLANO_ALTERADO")?.detalhes).toMatchObject({
        valorAnterior: 15000,
        valorNovo: 21000,
      });
    });
  });
});
