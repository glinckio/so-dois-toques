import { BadRequestException, Injectable } from "@nestjs/common";
import type { Ator } from "../aulas/comum.js";
import { deDataDoBanco, hojeEmSaoPaulo, paraDataDoBanco } from "../aulas/regras.js";
import { AuditoriaService } from "../auditoria/auditoria.service.js";
import {
  competenciaAtual,
  competenciaDe,
  primeiroDia,
  resumoDoCaixa,
} from "../mensalidades/regras.js";
import { GastosService } from "../gastos/gastos.service.js";
import { PrismaService } from "../prisma/prisma.service.js";
import type { ConsultaContabil } from "./esquemas.js";
import {
  MENSAGENS_PERIODO,
  mesesAte,
  periodoDoMes,
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
    private readonly gastos: GastosService,
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
      },
    });
    return linhas;
  }

  /**
   * FOCO-CA-09 e GASTO-CA-08: recebido, estornos, gastos por tipo, resultado, formas,
   * a receber, saldo em caixa e 12 meses.
   */
  async painel(consulta: ConsultaContabil) {
    const periodo = this.periodo(consulta);
    const hoje = hojeEmSaoPaulo(new Date());

    const lancamentos = await this.lancamentos(periodo);
    const resumo = resumoFinanceiro(lancamentos);
    const { porForma } = resumoDoCaixa(lancamentos);

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
        recebido: r.recebido,
        estornos: r.estornos,
        gastos: r.totalGastos,
        resultado: r.resultado,
      };
    });

    const atrasadas = await this.prisma.mensalidade.aggregate({
      where: { situacao: "ABERTA", vencimento: { lt: paraDataDoBanco(hoje) } },
      _count: true,
      _sum: { valorCentavos: true },
    });

    return {
      periodo,
      ...resumo,
      caixa: await this.gastos.saldo(),
      porForma,
      comparativo,
      aReceber: {
        quantidade: atrasadas._count,
        valorCentavos: atrasadas._sum.valorCentavos ?? 0,
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
