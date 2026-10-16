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
import { competenciaDe } from "../mensalidades/regras.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { descricaoDaParcela, origemDaParcela, parcelasDevidas } from "./regras.js";

const UMA_HORA = 60 * 60 * 1000;

/**
 * GASTO-CA-04: lança o aluguel dos contratos de quadra no dia do pagamento de cada mês,
 * na subida da API, a cada hora e ao registrar um contrato. O índice único parcial
 * (contrato e mês) garante um lançamento só, mesmo com duas execuções ao mesmo tempo.
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
      include: { quadra: { select: { nome: true } } },
    });
    if (contratos.length === 0) return 0;
    const jaLancados = new Set(
      (
        await this.prisma.lancamento.findMany({
          where: {
            categoria: "ALUGUEL_MENSAL",
            origemTipo: "ContratoQuadra",
            OR: contratos.map((c) => ({ origemId: { startsWith: `${c.id}:` } })),
          },
          select: { origemId: true },
        })
      ).map((l) => l.origemId),
    );
    const novos = contratos.flatMap((c) =>
      parcelasDevidas(
        {
          inicio: competenciaDe(deDataDoBanco(c.inicio)),
          fim: c.fim ? competenciaDe(deDataDoBanco(c.fim)) : null,
          diaPagamento: c.diaPagamento,
        },
        hoje,
        hojeEmSaoPaulo(c.criadoEm),
      )
        .filter((p) => !jaLancados.has(origemDaParcela(c.id, p.competencia)))
        .map((p) => ({
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
    );
    if (novos.length === 0) return 0;
    // ON CONFLICT DO NOTHING: outra execução pode ter lançado o mesmo mês agora.
    const { count } = await this.prisma.lancamento.createMany({
      data: novos,
      skipDuplicates: true,
    });
    if (count > 0) this.logger.log(`Aluguel de quadra lançado: ${count} mês(es).`);
    return count;
  }
}
