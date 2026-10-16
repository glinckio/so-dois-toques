import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { z } from "zod";
import type { Ator } from "../aulas/comum.js";
import { deDataDoBanco, hojeEmSaoPaulo, paraDataDoBanco } from "../aulas/regras.js";
import { AuditoriaService } from "../auditoria/auditoria.service.js";
import { periodoDoMes } from "../contabil/regras.js";
import { Prisma } from "../generated/prisma/client.js";
import {
  competenciaAtual,
  competenciaDe,
  primeiroDia,
  proximaCompetencia,
} from "../mensalidades/regras.js";
import { PrismaService } from "../prisma/prisma.service.js";
import type { contratoSchema, gastoSchema, locacaoSchema, saldoInicialSchema } from "./esquemas.js";
import { LancamentoMensalService } from "./lancamento-mensal.service.js";
import {
  descreverHorarioSemanal,
  ehTipoDeSaida,
  NOMES_DAS_SAIDAS,
  TIPOS_DE_SAIDA,
} from "./regras.js";

type Tx = Prisma.TransactionClient;

const ehUnico = (erro: unknown) =>
  erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === "P2002";

/** Até quantos meses à frente o contrato pode começar. */
const MESES_A_FRENTE = 12;

const MENSAGEM_JA_ESTORNADO = "Este lançamento já foi estornado.";

/** Etapa 17: contratos de quadra, locações avulsas, outros gastos, estornos e saldo. */
@Injectable()
export class GastosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditoria: AuditoriaService,
    private readonly lancamentoMensal: LancamentoMensalService,
  ) {}

  private async quadraAtiva(tx: Tx, id: string) {
    const quadra = await tx.quadra.findUnique({ where: { id } });
    if (!quadra || !quadra.ativa) throw new BadRequestException("Escolha uma quadra ativa.");
    return quadra;
  }

  private naoNoFuturo(data: string) {
    if (data > hojeEmSaoPaulo(new Date())) {
      throw new BadRequestException("A data não pode ser no futuro.");
    }
  }

  // ---------- Contratos (GASTO-CA-03 e 04) ----------

  async contratos() {
    const contratos = await this.prisma.contratoQuadra.findMany({
      orderBy: [
        { fim: { sort: "desc", nulls: "first" } },
        { diaSemana: "asc" },
        { horaInicio: "asc" },
      ],
      include: { quadra: { select: { id: true, nome: true } } },
    });
    const hoje = competenciaAtual(new Date());
    return contratos.map((c) => {
      const fim = c.fim ? competenciaDe(deDataDoBanco(c.fim)) : null;
      return {
        id: c.id,
        quadra: c.quadra,
        diaSemana: c.diaSemana,
        horaInicio: c.horaInicio,
        horaFim: c.horaFim,
        horario: descreverHorarioSemanal(c),
        valorCentavos: c.valorCentavos,
        diaPagamento: c.diaPagamento,
        forma: c.forma,
        inicio: competenciaDe(deDataDoBanco(c.inicio)),
        fim,
        vigente: fim === null || fim > hoje,
      };
    });
  }

  async registrarContrato(ator: Ator, dados: z.infer<typeof contratoSchema>) {
    const atual = competenciaAtual(new Date());
    let limite = atual;
    for (let i = 0; i < MESES_A_FRENTE; i++) limite = proximaCompetencia(limite);
    if (dados.inicio < atual || dados.inicio > limite) {
      throw new BadRequestException("O contrato começa no mês atual ou em até 12 meses à frente.");
    }
    const contrato = await this.prisma.$transaction(async (tx) => {
      await this.quadraAtiva(tx, dados.quadraId);
      const { inicio, ...resto } = dados;
      const criado = await tx.contratoQuadra.create({
        data: { ...resto, inicio: paraDataDoBanco(primeiroDia(inicio)), criadoPorId: ator.id },
      });
      await this.auditoria.registrar(
        {
          acao: "CONTRATO_REGISTRADO",
          atorId: ator.id,
          ip: ator.ip,
          alvoTipo: "ContratoQuadra",
          alvoId: criado.id,
          detalhes: { ...dados },
        },
        tx,
      );
      return criado;
    });
    // GASTO-CA-04: o mês cujo dia de pagamento já passou entra hoje.
    const lancados = await this.lancamentoMensal.lancar(new Date(), contrato.id);
    return { id: contrato.id, lancados };
  }

  /** GASTO-CA-04: a partir do mês de encerramento, não lança mais. */
  async encerrarContrato(ator: Ator, id: string, fim: string) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "ContratoQuadra" WHERE id = ${id}::uuid FOR UPDATE`;
      const contrato = await tx.contratoQuadra.findUnique({ where: { id } });
      if (!contrato) throw new NotFoundException("Contrato não encontrado.");
      if (contrato.fim) throw new ConflictException("Este contrato já foi encerrado.");
      const inicio = competenciaDe(deDataDoBanco(contrato.inicio));
      if (fim <= inicio) {
        throw new BadRequestException("O encerramento precisa ser depois do mês de início.");
      }
      if (fim < competenciaAtual(new Date())) {
        throw new BadRequestException("O encerramento vale do mês atual em diante.");
      }
      await tx.contratoQuadra.update({
        where: { id },
        data: {
          fim: paraDataDoBanco(primeiroDia(fim)),
          encerradoEm: new Date(),
          encerradoPorId: ator.id,
        },
      });
      await this.auditoria.registrar(
        {
          acao: "CONTRATO_ENCERRADO",
          atorId: ator.id,
          ip: ator.ip,
          alvoTipo: "ContratoQuadra",
          alvoId: id,
          detalhes: { fim },
        },
        tx,
      );
      return { id, fim };
    });
  }

  // ---------- Saídas (GASTO-CA-05 e 06) ----------

  /** As saídas do mês (e os estornos delas), da mais nova para a mais antiga. */
  async saidas(competencia?: string) {
    const periodo = periodoDoMes(competencia ?? competenciaAtual(new Date()));
    const linhas = await this.prisma.lancamento.findMany({
      where: {
        categoria: { in: [...TIPOS_DE_SAIDA] },
        data: { gte: paraDataDoBanco(periodo.de), lte: paraDataDoBanco(periodo.ate) },
      },
      orderBy: [{ data: "desc" }, { criadoEm: "desc" }],
      include: {
        criadoPor: { select: { nome: true } },
        estorno: { select: { id: true, data: true, descricao: true } },
      },
    });
    return {
      periodo,
      saidas: linhas.map((l) => ({
        id: l.id,
        tipo: l.tipo,
        categoria: l.categoria,
        nomeCategoria: ehTipoDeSaida(l.categoria) ? NOMES_DAS_SAIDAS[l.categoria] : l.categoria,
        valorCentavos: l.valorCentavos,
        forma: l.forma,
        data: deDataDoBanco(l.data),
        descricao: l.descricao,
        criadoPor: l.criadoPor.nome,
        ehEstorno: l.estornoDeId !== null,
        estorno: l.estorno
          ? {
              id: l.estorno.id,
              data: deDataDoBanco(l.estorno.data),
              descricao: l.estorno.descricao,
            }
          : null,
      })),
    };
  }

  private async saida(
    ator: Ator,
    dados: {
      categoria: (typeof TIPOS_DE_SAIDA)[number];
      data: string;
      valorCentavos: number;
      forma: z.infer<typeof gastoSchema>["forma"];
      descricao: string;
      origem?: { tipo: string; id: string };
    },
    detalhes: Record<string, unknown>,
    tx: Tx,
  ) {
    const lancamento = await tx.lancamento.create({
      data: {
        tipo: "SAIDA",
        categoria: dados.categoria,
        valorCentavos: dados.valorCentavos,
        forma: dados.forma,
        data: paraDataDoBanco(dados.data),
        descricao: dados.descricao.slice(0, 200),
        origemTipo: dados.origem?.tipo ?? null,
        origemId: dados.origem?.id ?? null,
        criadoPorId: ator.id,
      },
    });
    await this.auditoria.registrar(
      {
        acao: "GASTO_REGISTRADO",
        atorId: ator.id,
        ip: ator.ip,
        alvoTipo: "Lancamento",
        alvoId: lancamento.id,
        detalhes: { categoria: dados.categoria, ...detalhes },
      },
      tx,
    );
    return { id: lancamento.id };
  }

  /** GASTO-CA-05: locação avulsa de quadra. */
  async registrarLocacao(ator: Ator, dados: z.infer<typeof locacaoSchema>) {
    this.naoNoFuturo(dados.data);
    return this.prisma.$transaction(async (tx) => {
      const quadra = await this.quadraAtiva(tx, dados.quadraId);
      const descricao = `Locação avulsa: ${quadra.nome}${dados.observacao ? `, ${dados.observacao}` : ""}`;
      return this.saida(
        ator,
        {
          categoria: "LOCACAO_AVULSA",
          data: dados.data,
          valorCentavos: dados.valorCentavos,
          forma: dados.forma,
          descricao,
          origem: { tipo: "Quadra", id: quadra.id },
        },
        { ...dados },
        tx,
      );
    });
  }

  /** GASTO-CA-05: equipamento, investimento ou outro gasto. */
  async registrarGasto(ator: Ator, dados: z.infer<typeof gastoSchema>) {
    this.naoNoFuturo(dados.data);
    return this.prisma.$transaction((tx) => this.saida(ator, dados, { ...dados }, tx));
  }

  /**
   * GASTO-CA-06: o estorno é uma entrada do mesmo tipo e valor, ligada à saída original,
   * com data de hoje. O livro-razão não deixa estornar duas vezes (estornoDeId único).
   */
  async estornar(ator: Ator, id: string, motivo: string) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT id FROM "Lancamento" WHERE id = ${id}::uuid FOR SHARE`;
        const original = await tx.lancamento.findUnique({
          where: { id },
          include: { estorno: { select: { id: true } } },
        });
        if (!original) throw new NotFoundException("Lançamento não encontrado.");
        if (
          original.tipo !== "SAIDA" ||
          original.estornoDeId !== null ||
          !ehTipoDeSaida(original.categoria)
        ) {
          throw new BadRequestException(
            "Aqui só se estornam aluguéis, locações e gastos. Mensalidade se estorna pelo recibo.",
          );
        }
        if (original.estorno) throw new ConflictException(MENSAGEM_JA_ESTORNADO);
        const estorno = await tx.lancamento.create({
          data: {
            tipo: "ENTRADA",
            categoria: original.categoria,
            valorCentavos: original.valorCentavos,
            forma: original.forma,
            data: paraDataDoBanco(hojeEmSaoPaulo(new Date())),
            descricao: `Estorno: ${motivo}`.slice(0, 200),
            estornoDeId: original.id,
            criadoPorId: ator.id,
          },
        });
        await this.auditoria.registrar(
          {
            acao: "LANCAMENTO_ESTORNADO",
            atorId: ator.id,
            ip: ator.ip,
            alvoTipo: "Lancamento",
            alvoId: original.id,
            detalhes: {
              estornoId: estorno.id,
              categoria: original.categoria,
              valorCentavos: original.valorCentavos,
              motivo,
            },
          },
          tx,
        );
        return { id: estorno.id };
      });
    } catch (erro) {
      if (ehUnico(erro)) throw new ConflictException(MENSAGEM_JA_ESTORNADO);
      throw erro;
    }
  }

  // ---------- Saldo (GASTO-CA-07) ----------

  /** Saldo em caixa: saldo inicial + entradas − saídas a partir da data dele. */
  async saldo() {
    const inicial = await this.prisma.lancamento.findFirst({
      where: { categoria: "SALDO_INICIAL" },
      select: { valorCentavos: true, data: true },
    });
    const somas = await this.prisma.lancamento.groupBy({
      by: ["tipo"],
      where: inicial ? { data: { gte: inicial.data } } : {},
      _sum: { valorCentavos: true },
    });
    const soma = (tipo: "ENTRADA" | "SAIDA") =>
      somas.find((s) => s.tipo === tipo)?._sum.valorCentavos ?? 0;
    return {
      saldoInicial: inicial
        ? { valorCentavos: inicial.valorCentavos, data: deDataDoBanco(inicial.data) }
        : null,
      saldoCentavos: soma("ENTRADA") - soma("SAIDA"),
    };
  }

  /** Só um saldo inicial: a migração cria o de 16/10/2026 quando já há administrador. */
  async registrarSaldoInicial(ator: Ator, dados: z.infer<typeof saldoInicialSchema>) {
    this.naoNoFuturo(dados.data);
    try {
      return await this.prisma.$transaction(async (tx) => {
        const lancamento = await tx.lancamento.create({
          data: {
            tipo: "ENTRADA",
            categoria: "SALDO_INICIAL",
            valorCentavos: dados.valorCentavos,
            forma: "DINHEIRO",
            data: paraDataDoBanco(dados.data),
            descricao: `Saldo que sobrou até ${dados.data.split("-").reverse().join("/")}`,
            criadoPorId: ator.id,
          },
        });
        await this.auditoria.registrar(
          {
            acao: "SALDO_INICIAL_REGISTRADO",
            atorId: ator.id,
            ip: ator.ip,
            alvoTipo: "Lancamento",
            alvoId: lancamento.id,
            detalhes: { ...dados },
          },
          tx,
        );
        return { id: lancamento.id };
      });
    } catch (erro) {
      if (ehUnico(erro)) throw new ConflictException("O saldo inicial já foi registrado.");
      throw erro;
    }
  }
}
