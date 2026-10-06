import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  deDataDoBanco,
  hojeEmSaoPaulo,
  normalizarBusca,
  paraDataDoBanco,
} from "../aulas/regras.js";
import type { Ator } from "../aulas/comum.js";
import { AuditoriaService } from "../auditoria/auditoria.service.js";
import { Prisma } from "../generated/prisma/client.js";
import { PrismaService } from "../prisma/prisma.service.js";
import {
  competenciaAtual,
  competenciaDe,
  diasDeAtraso,
  nomeDoMes,
  primeiroDia,
  proximaCompetencia,
  resumoDoCaixa,
  situacaoEm,
  vencimentoEm,
  type FormaPagamento,
  type Situacao,
} from "./regras.js";

type Tx = Prisma.TransactionClient;

const MENSAGEM_JA_PAGA = "Esta mensalidade já está paga.";
const MENSAGEM_CANCELADA = "Esta mensalidade está cancelada.";

type MensalidadeComRelacoes = Prisma.MensalidadeGetPayload<{
  include: {
    aluno: { select: { id: true; nome: true } };
    pagamentos: { include: { recebidoPor: { select: { nome: true } } } };
  };
}>;

function paraResposta(m: MensalidadeComRelacoes, hoje: string) {
  const vencimento = deDataDoBanco(m.vencimento);
  const valido = m.pagamentos.find((p) => !p.estornadoEm) ?? null;
  return {
    id: m.id,
    aluno: m.aluno,
    competencia: competenciaDe(deDataDoBanco(m.competencia)),
    valorCentavos: m.valorCentavos,
    vencimento,
    situacao: situacaoEm({ situacao: m.situacao, vencimento }, hoje),
    pagamento: valido
      ? {
          id: valido.id,
          numeroRecibo: valido.numeroRecibo,
          forma: valido.forma,
          data: deDataDoBanco(valido.data),
        }
      : null,
  };
}

const INCLUIR = {
  aluno: { select: { id: true, nome: true } },
  pagamentos: {
    include: { recebidoPor: { select: { nome: true } } },
    orderBy: { recebidoEm: "asc" },
  },
} as const satisfies Prisma.MensalidadeInclude;

@Injectable()
export class MensalidadesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditoria: AuditoriaService,
  ) {}

  // ---------- Geração (MENS-CA-05 a 07) ----------

  /**
   * Cria as mensalidades que faltam no mês para as assinaturas vigentes nele.
   * Pode rodar várias vezes e ao mesmo tempo: o único (aluno, mês) não deixa duplicar.
   */
  async gerar(competencia: string, ator: Ator | null) {
    if (competencia > proximaCompetencia(competenciaAtual(new Date()))) {
      throw new BadRequestException("Só dá para gerar até o próximo mês.");
    }
    const mes = paraDataDoBanco(primeiroDia(competencia));
    const assinaturas = await this.prisma.assinatura.findMany({
      where: { inicio: { lte: mes }, OR: [{ fim: null }, { fim: { gt: mes } }] },
      include: { plano: { select: { valorCentavos: true } } },
    });
    const dados = assinaturas
      .map((a) => ({
        alunoId: a.alunoId,
        assinaturaId: a.id,
        competencia: mes,
        valorCentavos: a.plano.valorCentavos - a.descontoCentavos,
        vencimento: paraDataDoBanco(vencimentoEm(competencia, a.diaVencimento)),
      }))
      .filter((m) => m.valorCentavos > 0);
    const { count } = await this.prisma.mensalidade.createMany({
      data: dados,
      skipDuplicates: true,
    });
    if (count > 0 || ator) {
      await this.auditoria.registrar({
        acao: "MENSALIDADES_GERADAS",
        atorId: ator?.id ?? null,
        ip: ator?.ip,
        detalhes: { competencia, criadas: count, automatica: ator === null },
      });
    }
    return { competencia, criadas: count };
  }

  // ---------- Consultas (MENS-CA-14 e 15) ----------

  async listar(filtro: { competencia: string; situacao?: Situacao; busca?: string }) {
    const hoje = hojeEmSaoPaulo(new Date());
    const hojeBanco = paraDataDoBanco(hoje);
    const competencia = paraDataDoBanco(primeiroDia(filtro.competencia));
    const doMes = await this.prisma.mensalidade.findMany({
      where: { competencia },
      select: { situacao: true, valorCentavos: true },
    });
    const previsto = doMes
      .filter((m) => m.situacao !== "CANCELADA")
      .reduce((soma, m) => soma + m.valorCentavos, 0);
    const recebido = doMes
      .filter((m) => m.situacao === "PAGA")
      .reduce((soma, m) => soma + m.valorCentavos, 0);

    const porSituacao: Record<Situacao, Prisma.MensalidadeWhereInput> = {
      EM_ABERTO: { situacao: "ABERTA", vencimento: { gte: hojeBanco } },
      ATRASADA: { situacao: "ABERTA", vencimento: { lt: hojeBanco } },
      PAGA: { situacao: "PAGA" },
      CANCELADA: { situacao: "CANCELADA" },
    };
    const busca = filtro.busca ? normalizarBusca(filtro.busca) : "";
    const itens = await this.prisma.mensalidade.findMany({
      where: {
        competencia,
        ...(filtro.situacao ? porSituacao[filtro.situacao] : {}),
        ...(busca ? { aluno: { nomeBusca: { contains: busca } } } : {}),
      },
      include: INCLUIR,
      orderBy: [{ vencimento: "asc" }, { aluno: { nomeBusca: "asc" } }],
      take: 500,
    });
    return {
      competencia: filtro.competencia,
      totais: { previsto, recebido, emAberto: previsto - recebido, quantidade: doMes.length },
      itens: itens.map((m) => paraResposta(m, hoje)),
    };
  }

  async inadimplentes() {
    const hoje = hojeEmSaoPaulo(new Date());
    const atrasadas = await this.prisma.mensalidade.findMany({
      where: { situacao: "ABERTA", vencimento: { lt: paraDataDoBanco(hoje) } },
      include: { aluno: { select: { id: true, nome: true, telefone: true } } },
      orderBy: { vencimento: "asc" },
    });
    const porAluno = new Map<
      string,
      {
        aluno: { id: string; nome: string; telefone: string };
        quantidade: number;
        totalCentavos: number;
        vencimentoMaisAntigo: string;
        diasDeAtraso: number;
      }
    >();
    for (const m of atrasadas) {
      const vencimento = deDataDoBanco(m.vencimento);
      const linha = porAluno.get(m.alunoId);
      if (linha) {
        linha.quantidade++;
        linha.totalCentavos += m.valorCentavos;
      } else {
        porAluno.set(m.alunoId, {
          aluno: m.aluno,
          quantidade: 1,
          totalCentavos: m.valorCentavos,
          vencimentoMaisAntigo: vencimento,
          diasDeAtraso: diasDeAtraso(vencimento, hoje),
        });
      }
    }
    const itens = [...porAluno.values()].sort((a, b) => b.diasDeAtraso - a.diasDeAtraso);
    return {
      itens,
      totalCentavos: itens.reduce((soma, i) => soma + i.totalCentavos, 0),
    };
  }

  async buscar(id: string) {
    const m = await this.prisma.mensalidade.findUnique({ where: { id }, include: INCLUIR });
    if (!m) throw new NotFoundException("Mensalidade não encontrada.");
    return {
      ...paraResposta(m, hojeEmSaoPaulo(new Date())),
      cancelamento: m.canceladaEm
        ? { em: m.canceladaEm.toISOString(), motivo: m.motivoCancelamento }
        : null,
      pagamentos: m.pagamentos.map((p) => ({
        id: p.id,
        numeroRecibo: p.numeroRecibo,
        valorCentavos: p.valorCentavos,
        forma: p.forma,
        data: deDataDoBanco(p.data),
        recebidoPor: p.recebidoPor.nome,
        recebidoEm: p.recebidoEm.toISOString(),
        estorno: p.estornadoEm
          ? { em: p.estornadoEm.toISOString(), motivo: p.motivoEstorno }
          : null,
      })),
    };
  }

  // ---------- Pagamento, estorno e cancelamento (MENS-CA-09 a 13) ----------

  private async travar(tx: Tx, id: string) {
    await tx.$queryRaw`SELECT id FROM "Mensalidade" WHERE id = ${id}::uuid FOR UPDATE`;
    const m = await tx.mensalidade.findUnique({ where: { id } });
    if (!m) throw new NotFoundException("Mensalidade não encontrada.");
    return m;
  }

  /** MENS-CA-09 e 10: pagamento inteiro e lançamento de entrada na mesma transação. */
  async pagar(ator: Ator, id: string, dados: { forma: FormaPagamento; data: string }) {
    if (dados.data > hojeEmSaoPaulo(new Date())) {
      throw new BadRequestException("A data do pagamento não pode ser no futuro.");
    }
    try {
      return await this.prisma.$transaction(async (tx) => {
        const m = await this.travar(tx, id);
        if (m.situacao === "PAGA") throw new ConflictException(MENSAGEM_JA_PAGA);
        if (m.situacao === "CANCELADA") throw new ConflictException(MENSAGEM_CANCELADA);
        const competencia = competenciaDe(deDataDoBanco(m.competencia));
        // Sem dado pessoal no livro-razão, que é imutável: o aluno fica na origem.
        const lancamento = await tx.lancamento.create({
          data: {
            tipo: "ENTRADA",
            valorCentavos: m.valorCentavos,
            forma: dados.forma,
            data: paraDataDoBanco(dados.data),
            categoria: "MENSALIDADE",
            descricao: `Mensalidade de ${nomeDoMes(competencia)}`,
            origemTipo: "Mensalidade",
            origemId: m.id,
            criadoPorId: ator.id,
          },
        });
        const pagamento = await tx.pagamento.create({
          data: {
            mensalidadeId: m.id,
            valorCentavos: m.valorCentavos,
            forma: dados.forma,
            data: paraDataDoBanco(dados.data),
            recebidoPorId: ator.id,
            lancamentoId: lancamento.id,
          },
        });
        await tx.mensalidade.update({ where: { id }, data: { situacao: "PAGA" } });
        await this.auditoria.registrar(
          {
            acao: "PAGAMENTO_REGISTRADO",
            atorId: ator.id,
            ip: ator.ip,
            alvoTipo: "Mensalidade",
            alvoId: id,
            detalhes: {
              pagamentoId: pagamento.id,
              numeroRecibo: pagamento.numeroRecibo,
              valorCentavos: m.valorCentavos,
              forma: dados.forma,
              data: dados.data,
              lancamentoId: lancamento.id,
            },
          },
          tx,
        );
        return { id: pagamento.id, numeroRecibo: pagamento.numeroRecibo };
      });
    } catch (erro) {
      // Rede de segurança do índice único parcial (dois pagamentos válidos).
      if (erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === "P2002") {
        throw new ConflictException(MENSAGEM_JA_PAGA);
      }
      throw erro;
    }
  }

  /** MENS-CA-12: estorno com lançamento de saída ligado ao original. */
  async estornar(ator: Ator, pagamentoId: string, motivo: string) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const encontrado = await tx.pagamento.findUnique({ where: { id: pagamentoId } });
        if (!encontrado) throw new NotFoundException("Pagamento não encontrado.");
        await this.travar(tx, encontrado.mensalidadeId);
        // Relê depois da trava: outro estorno pode ter acabado de terminar.
        const pagamento = await tx.pagamento.findUniqueOrThrow({ where: { id: pagamentoId } });
        if (pagamento.estornadoEm) throw new ConflictException("Este pagamento já foi estornado.");
        const hoje = hojeEmSaoPaulo(new Date());
        const estorno = await tx.lancamento.create({
          data: {
            tipo: "SAIDA",
            valorCentavos: pagamento.valorCentavos,
            forma: pagamento.forma,
            data: paraDataDoBanco(hoje),
            categoria: "ESTORNO",
            descricao: `Estorno do recibo nº ${pagamento.numeroRecibo}`,
            origemTipo: "Pagamento",
            origemId: pagamento.id,
            estornoDeId: pagamento.lancamentoId,
            criadoPorId: ator.id,
          },
        });
        await tx.pagamento.update({
          where: { id: pagamento.id },
          data: {
            estornadoEm: new Date(),
            estornadoPorId: ator.id,
            motivoEstorno: motivo,
            estornoLancamentoId: estorno.id,
          },
        });
        await tx.mensalidade.update({
          where: { id: pagamento.mensalidadeId },
          data: { situacao: "ABERTA" },
        });
        await this.auditoria.registrar(
          {
            acao: "PAGAMENTO_ESTORNADO",
            atorId: ator.id,
            ip: ator.ip,
            alvoTipo: "Mensalidade",
            alvoId: pagamento.mensalidadeId,
            detalhes: {
              pagamentoId: pagamento.id,
              numeroRecibo: pagamento.numeroRecibo,
              valorCentavos: pagamento.valorCentavos,
              lancamentoId: estorno.id,
              motivo,
            },
          },
          tx,
        );
        return { id: pagamento.id, lancamentoId: estorno.id };
      });
    } catch (erro) {
      if (erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === "P2002") {
        throw new ConflictException("Este pagamento já foi estornado.");
      }
      throw erro;
    }
  }

  /** MENS-CA-13: só mensalidade sem pagamento válido pode ser cancelada. */
  async cancelar(ator: Ator, id: string, motivo: string) {
    return this.prisma.$transaction(async (tx) => {
      const m = await this.travar(tx, id);
      if (m.situacao === "PAGA") {
        throw new ConflictException("Mensalidade paga não pode ser cancelada. Estorne antes.");
      }
      if (m.situacao === "CANCELADA") throw new ConflictException(MENSAGEM_CANCELADA);
      await tx.mensalidade.update({
        where: { id },
        data: {
          situacao: "CANCELADA",
          canceladaEm: new Date(),
          canceladaPorId: ator.id,
          motivoCancelamento: motivo,
        },
      });
      await this.auditoria.registrar(
        {
          acao: "MENSALIDADE_CANCELADA",
          atorId: ator.id,
          ip: ator.ip,
          alvoTipo: "Mensalidade",
          alvoId: id,
          detalhes: { motivo },
        },
        tx,
      );
      return { id };
    });
  }

  /** MENS-CA-11: dados do recibo. */
  async recibo(pagamentoId: string) {
    const p = await this.prisma.pagamento.findUnique({
      where: { id: pagamentoId },
      include: {
        mensalidade: { include: { aluno: { select: { nome: true } } } },
        recebidoPor: { select: { nome: true } },
      },
    });
    if (!p) throw new NotFoundException("Pagamento não encontrado.");
    return {
      id: p.id,
      numero: p.numeroRecibo,
      aluno: p.mensalidade.aluno.nome,
      competencia: competenciaDe(deDataDoBanco(p.mensalidade.competencia)),
      valorCentavos: p.valorCentavos,
      forma: p.forma,
      data: deDataDoBanco(p.data),
      recebidoPor: p.recebidoPor.nome,
      recebidoEm: p.recebidoEm.toISOString(),
      estornado: p.estornadoEm !== null,
    };
  }

  // ---------- Caixa (MENS-CA-17) ----------

  async lancamentosDoDia(data?: string) {
    const dia = data ?? hojeEmSaoPaulo(new Date());
    const lancamentos = await this.prisma.lancamento.findMany({
      where: { data: paraDataDoBanco(dia) },
      include: { criadoPor: { select: { nome: true } } },
      orderBy: { criadoEm: "asc" },
    });
    return {
      data: dia,
      resumo: resumoDoCaixa(lancamentos),
      lancamentos: lancamentos.map((l) => ({
        id: l.id,
        tipo: l.tipo,
        valorCentavos: l.valorCentavos,
        forma: l.forma,
        categoria: l.categoria,
        descricao: l.descricao,
        origemTipo: l.origemTipo,
        origemId: l.origemId,
        estornoDeId: l.estornoDeId,
        criadoPor: l.criadoPor.nome,
        criadoEm: l.criadoEm.toISOString(),
      })),
    };
  }
}
