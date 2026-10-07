import { BadRequestException, Injectable } from "@nestjs/common";
import type { Ator } from "../aulas/comum.js";
import { deDataDoBanco, hojeEmSaoPaulo, paraDataDoBanco } from "../aulas/regras.js";
import { AuditoriaService } from "../auditoria/auditoria.service.js";
import { inicioDaHora, somarDias } from "../horarios/regras.js";
import {
  competenciaAtual,
  competenciaDe,
  primeiroDia,
  resumoDoCaixa,
} from "../mensalidades/regras.js";
import { PrismaService } from "../prisma/prisma.service.js";
import type { ConsultaContabil } from "./esquemas.js";
import {
  MENSAGENS_PERIODO,
  TURNOS,
  datasDoPeriodo,
  mesesAte,
  ocupacaoPorTurno,
  periodoDoMes,
  porcentagem,
  problemaDePeriodo,
  resumoFinanceiro,
  type Periodo,
} from "./regras.js";

const intervalo = ({ de, ate }: Periodo) => ({
  gte: paraDataDoBanco(de),
  lte: paraDataDoBanco(ate),
});

/** O Contábil só lê o que as outras áreas gravaram (fora a auditoria da exportação). */
@Injectable()
export class ContabilService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditoria: AuditoriaService,
  ) {}

  /** CONT-CA-03 */
  private periodo(consulta: ConsultaContabil): Periodo {
    const periodo =
      consulta.de && consulta.ate
        ? { de: consulta.de, ate: consulta.ate }
        : periodoDoMes(consulta.competencia ?? competenciaAtual(new Date()));
    const problema = problemaDePeriodo(periodo);
    if (problema) throw new BadRequestException(MENSAGENS_PERIODO[problema]);
    return periodo;
  }

  private async lancamentos(periodo: Periodo) {
    const linhas = await this.prisma.lancamento.findMany({
      where: { data: intervalo(periodo) },
      select: {
        tipo: true,
        forma: true,
        categoria: true,
        valorCentavos: true,
        data: true,
        estornoDe: { select: { categoria: true } },
      },
    });
    return linhas.map((l) => ({ ...l, categoriaOriginal: l.estornoDe?.categoria ?? null }));
  }

  async painel(consulta: ConsultaContabil) {
    const periodo = this.periodo(consulta);
    const agora = new Date();
    const hoje = hojeEmSaoPaulo(agora);

    // CONT-CA-01, 02 e 08
    const lancamentos = await this.lancamentos(periodo);
    const resumo = resumoFinanceiro(lancamentos);
    const { porForma } = resumoDoCaixa(lancamentos);

    // CONT-CA-04
    const meses = mesesAte(periodo.ate);
    const doComparativo = await this.lancamentos({
      de: primeiroDia(meses[0] as string),
      ate: periodoDoMes(meses.at(-1) as string).ate,
    });
    const comparativo = meses.map((competencia) => {
      const r = resumoFinanceiro(
        doComparativo.filter((l) => competenciaDe(deDataDoBanco(l.data)) === competencia),
      );
      return {
        competencia,
        receitas: r.totalReceitas,
        despesas: r.totalDespesas,
        resultado: r.resultado,
      };
    });

    // CONT-CA-05: vendas feitas no período (horário de São Paulo), sem as estornadas.
    const itens = await this.prisma.itemVenda.findMany({
      where: {
        venda: {
          estornadaEm: null,
          feitaEm: {
            gte: inicioDaHora(periodo.de, 0),
            lt: inicioDaHora(somarDias(periodo.ate, 1), 0),
          },
        },
      },
      select: { quantidade: true, precoCentavos: true, custoCentavos: true },
    });
    const vendido = itens.reduce((s, i) => s + i.quantidade * i.precoCentavos, 0);
    const custo = itens.reduce((s, i) => s + i.quantidade * i.custoCentavos, 0);

    // CONT-CA-06
    const [quadras, faixas, ocupacoes] = await Promise.all([
      this.prisma.quadra.findMany({ orderBy: { ordem: "asc" }, select: { id: true, nome: true } }),
      this.prisma.faixaPreco.findMany({
        select: { diaSemana: true, horaInicio: true, horaFim: true },
      }),
      this.prisma.reserva.findMany({
        where: { data: intervalo(periodo), canceladaEm: null },
        select: {
          id: true,
          quadraId: true,
          data: true,
          tipo: true,
          horaInicio: true,
          horaFim: true,
          valorCentavos: true,
          pagamentos: { where: { estornadoEm: null }, select: { id: true } },
        },
      }),
    ]);
    const porQuadra = ocupacaoPorTurno(
      quadras.map((q) => q.id),
      datasDoPeriodo(periodo),
      faixas,
      ocupacoes.map((o) => ({ ...o, data: deDataDoBanco(o.data) })),
    );
    const ocupacao = quadras.map((q) => {
      const turnos = porQuadra.get(q.id);
      const soma = (campo: "abertas" | "bloqueadas" | "reservadas") =>
        TURNOS.reduce((s, t) => s + (turnos?.[t][campo] ?? 0), 0);
      return {
        id: q.id,
        nome: q.nome,
        turnos,
        total: {
          abertas: soma("abertas"),
          bloqueadas: soma("bloqueadas"),
          reservadas: soma("reservadas"),
          ocupacaoPercentual: porcentagem(soma("reservadas"), soma("abertas") - soma("bloqueadas")),
        },
      };
    });

    // CONT-CA-07
    const atrasadas = await this.prisma.mensalidade.aggregate({
      where: { situacao: "ABERTA", vencimento: { lt: paraDataDoBanco(hoje) } },
      _count: true,
      _sum: { valorCentavos: true },
    });
    const reservasNaoPagas = ocupacoes.filter(
      (o) =>
        o.tipo === "RESERVA" &&
        o.pagamentos.length === 0 &&
        inicioDaHora(deDataDoBanco(o.data), o.horaInicio) <= agora,
    );

    return {
      periodo,
      ...resumo,
      porForma,
      comparativo,
      lanchonete: {
        vendidoCentavos: vendido,
        custoCentavos: custo,
        margemBrutaCentavos: vendido - custo,
        margemPercentual: porcentagem(vendido - custo, vendido),
      },
      ocupacao,
      aReceber: {
        mensalidades: {
          quantidade: atrasadas._count,
          valorCentavos: atrasadas._sum.valorCentavos ?? 0,
        },
        reservas: {
          quantidade: reservasNaoPagas.length,
          valorCentavos: reservasNaoPagas.reduce((s, r) => s + r.valorCentavos, 0),
        },
      },
    };
  }

  /** CONT-CA-09: lançamentos do período para a planilha; a exportação vai para a auditoria. */
  async exportacao(ator: Ator, consulta: ConsultaContabil) {
    const periodo = this.periodo(consulta);
    const linhas = await this.prisma.lancamento.findMany({
      where: { data: intervalo(periodo) },
      orderBy: [{ data: "asc" }, { criadoEm: "asc" }],
      select: {
        data: true,
        tipo: true,
        categoria: true,
        forma: true,
        valorCentavos: true,
        descricao: true,
        estornoDeId: true,
      },
    });
    await this.auditoria.registrar({
      acao: "CONTABIL_EXPORTADO",
      atorId: ator.id,
      ip: ator.ip,
      alvoTipo: "Lancamento",
      detalhes: { ...periodo, linhas: linhas.length },
    });
    return {
      periodo,
      lancamentos: linhas.map(({ estornoDeId, data, ...l }) => ({
        ...l,
        data: deDataDoBanco(data),
        estorno: estornoDeId !== null,
      })),
    };
  }
}
