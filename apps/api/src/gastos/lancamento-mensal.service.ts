import {
  Inject,
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnApplicationShutdown,
} from "@nestjs/common";
import { deDataDoBanco, hojeEmSaoPaulo, paraDataDoBanco } from "../aulas/regras.js";
import { ENV } from "../config.module.js";
import type { Env } from "../env.js";
import { competenciaDe, primeiroDia } from "../mensalidades/regras.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { descricaoDaParcela, origemDaParcela, parcelasDevidas } from "./regras.js";

const UMA_HORA = 60 * 60 * 1000;

/**
 * GASTO-CA-04: lança o aluguel dos contratos de quadra no dia do pagamento de cada mês,
 * na subida da API, a cada hora e ao registrar um contrato. O contrato guarda o último
 * mês lançado (lancadoAte), atualizado junto com o lançamento e com a linha do contrato
 * travada: duas execuções ao mesmo tempo não lançam o mês duas vezes, e um mês já
 * lançado não volta mesmo que o lançamento dele seja mexido no banco. O índice único
 * parcial (contrato e mês) segue como segunda proteção.
 */
@Injectable()
export class LancamentoMensalService implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(LancamentoMensalService.name);
  private timer: NodeJS.Timeout | undefined;

  constructor(
    @Inject(ENV) private readonly env: Env,
    private readonly prisma: PrismaService,
  ) {}

  onApplicationBootstrap() {
    if (!this.env.GERACAO_AUTOMATICA) return;
    void this.executar();
    this.timer = setInterval(() => void this.executar(), UMA_HORA);
    this.timer.unref();
  }

  onApplicationShutdown() {
    clearInterval(this.timer);
  }

  async executar(agora = new Date()) {
    try {
      return await this.lancar(agora);
    } catch (erro) {
      this.logger.error(`Falha no lançamento do aluguel das quadras: ${String(erro)}`);
      return null;
    }
  }

  /** Lança os meses devidos (de todos os contratos ou de um só); devolve quantos entraram. */
  async lancar(agora: Date, contratoId?: string) {
    const hoje = hojeEmSaoPaulo(agora);
    const contratos = await this.prisma.contratoQuadra.findMany({
      where: {
        ...(contratoId ? { id: contratoId } : {}),
        inicio: { lte: paraDataDoBanco(hoje) },
      },
      select: { id: true },
    });
    let total = 0;
    for (const { id } of contratos) total += await this.lancarContrato(id, hoje);
    if (total > 0) this.logger.log(`Aluguel de quadra lançado: ${total} mês(es).`);
    return total;
  }

  private lancarContrato(id: string, hoje: string) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "ContratoQuadra" WHERE id = ${id}::uuid FOR UPDATE`;
      const c = await tx.contratoQuadra.findUniqueOrThrow({
        where: { id },
        include: { quadra: { select: { nome: true } } },
      });
      const parcelas = parcelasDevidas(
        {
          inicio: competenciaDe(deDataDoBanco(c.inicio)),
          fim: c.fim ? competenciaDe(deDataDoBanco(c.fim)) : null,
          diaPagamento: c.diaPagamento,
          lancadoAte: c.lancadoAte ? competenciaDe(deDataDoBanco(c.lancadoAte)) : null,
        },
        hoje,
        hojeEmSaoPaulo(c.criadoEm),
      );
      const ultima = parcelas.at(-1);
      if (!ultima) return 0;
      // ON CONFLICT DO NOTHING: a chave do mês pode já existir no banco.
      const { count } = await tx.lancamento.createMany({
        data: parcelas.map((p) => ({
          tipo: "SAIDA" as const,
          categoria: "ALUGUEL_MENSAL" as const,
          valorCentavos: c.valorCentavos,
          forma: c.forma,
          data: paraDataDoBanco(p.data),
          descricao: descricaoDaParcela(c.quadra.nome, c, p.competencia),
          origemTipo: "ContratoQuadra",
          origemId: origemDaParcela(c.id, p.competencia),
          criadoPorId: c.criadoPorId,
        })),
        skipDuplicates: true,
      });
      await tx.contratoQuadra.update({
        where: { id },
        data: { lancadoAte: paraDataDoBanco(primeiroDia(ultima.competencia)) },
      });
      return count;
    });
  }
}
