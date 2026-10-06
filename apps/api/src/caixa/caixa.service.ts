import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { Ator } from "../aulas/comum.js";
import { deDataDoBanco, hojeEmSaoPaulo, paraDataDoBanco } from "../aulas/regras.js";
import { AuditoriaService } from "../auditoria/auditoria.service.js";
import { Prisma } from "../generated/prisma/client.js";
import { resumoDoCaixa, type FormaPagamento } from "../mensalidades/regras.js";
import { PrismaService } from "../prisma/prisma.service.js";
import {
  CATEGORIAS_AVULSAS,
  ehCategoriaAvulsa,
  esperadoEmDinheiro,
  formaPermitida,
  resumoPorCategoria,
  type CategoriaAvulsa,
} from "./regras.js";
import { turnoParaLancamento } from "./sessao.js";

export type DadosAvulso = {
  categoria: CategoriaAvulsa;
  forma: FormaPagamento;
  valorCentavos: number;
  descricao: string;
};

const MENSAGEM_SEM_CAIXA = "Abra o caixa antes de lançar.";
const MENSAGEM_JA_ABERTO = "Já existe um caixa aberto.";
const ehUnico = (erro: unknown) =>
  erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === "P2002";

const NOMES = { select: { nome: true } } as const;

@Injectable()
export class CaixaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditoria: AuditoriaService,
  ) {}

  // ---------- Abertura (CAIXA-CA-01) ----------

  async abrir(ator: Ator, trocoInicialCentavos: number) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const turno = await tx.sessaoCaixa.create({
          data: { trocoInicialCentavos, abertaPorId: ator.id },
        });
        await this.auditoria.registrar(
          {
            acao: "CAIXA_ABERTO",
            atorId: ator.id,
            ip: ator.ip,
            alvoTipo: "SessaoCaixa",
            alvoId: turno.id,
            detalhes: { trocoInicialCentavos },
          },
          tx,
        );
        return { id: turno.id };
      });
    } catch (erro) {
      if (ehUnico(erro)) throw new ConflictException(MENSAGEM_JA_ABERTO);
      throw erro;
    }
  }

  /** Turno aberto agora, com o esperado em dinheiro até aqui; null se fechado. */
  async turnoAtual() {
    const aberto = await this.prisma.sessaoCaixa.findFirst({ where: { fechadaEm: null } });
    return { turno: aberto ? await this.relatorio(aberto.id) : null };
  }

  // ---------- Fechamento (CAIXA-CA-04) ----------

  async fechar(
    ator: Ator,
    id: string,
    dados: { contadoDinheiroCentavos: number; observacao: string | null },
  ) {
    return this.prisma.$transaction(async (tx) => {
      // Lançamentos em andamento seguram o turno com trava compartilhada (sessao.ts).
      await tx.$queryRaw`SELECT id FROM "SessaoCaixa" WHERE id = ${id}::uuid FOR UPDATE`;
      const turno = await tx.sessaoCaixa.findUnique({ where: { id } });
      if (!turno) throw new NotFoundException("Turno não encontrado.");
      if (turno.fechadaEm) throw new ConflictException("Este caixa já foi fechado.");
      const lancamentos = await tx.lancamento.findMany({ where: { sessaoId: id } });
      const esperado = esperadoEmDinheiro(turno.trocoInicialCentavos, lancamentos);
      const diferenca = dados.contadoDinheiroCentavos - esperado;
      if (diferenca !== 0 && !dados.observacao) {
        throw new BadRequestException(
          "O dinheiro contado não bate com o esperado: explique a diferença na observação.",
        );
      }
      await tx.sessaoCaixa.update({
        where: { id },
        data: {
          fechadaEm: new Date(),
          fechadaPorId: ator.id,
          esperadoDinheiroCentavos: esperado,
          contadoDinheiroCentavos: dados.contadoDinheiroCentavos,
          diferencaCentavos: diferenca,
          observacao: dados.observacao,
        },
      });
      await this.auditoria.registrar(
        {
          acao: "CAIXA_FECHADO",
          atorId: ator.id,
          ip: ator.ip,
          alvoTipo: "SessaoCaixa",
          alvoId: id,
          detalhes: {
            esperadoDinheiroCentavos: esperado,
            contadoDinheiroCentavos: dados.contadoDinheiroCentavos,
            diferencaCentavos: diferenca,
          },
        },
        tx,
      );
      return { id, esperadoDinheiroCentavos: esperado, diferencaCentavos: diferenca };
    });
  }

  // ---------- Turnos e relatório (CAIXA-CA-05) ----------

  async listar() {
    const turnos = await this.prisma.sessaoCaixa.findMany({
      orderBy: { abertaEm: "desc" },
      take: 100,
      include: { abertaPor: NOMES, fechadaPor: NOMES },
    });
    return turnos.map((t) => ({
      id: t.id,
      abertaEm: t.abertaEm.toISOString(),
      abertaPor: t.abertaPor.nome,
      fechadaEm: t.fechadaEm?.toISOString() ?? null,
      fechadaPor: t.fechadaPor?.nome ?? null,
      trocoInicialCentavos: t.trocoInicialCentavos,
      diferencaCentavos: t.diferencaCentavos,
    }));
  }

  async relatorio(id: string) {
    const turno = await this.prisma.sessaoCaixa.findUnique({
      where: { id },
      include: { abertaPor: NOMES, fechadaPor: NOMES },
    });
    if (!turno) throw new NotFoundException("Turno não encontrado.");
    const lancamentos = await this.prisma.lancamento.findMany({
      where: { sessaoId: id },
      include: { criadoPor: NOMES, estorno: { select: { id: true } } },
      orderBy: { criadoEm: "asc" },
    });
    return {
      id: turno.id,
      abertaEm: turno.abertaEm.toISOString(),
      abertaPor: turno.abertaPor.nome,
      fechadaEm: turno.fechadaEm?.toISOString() ?? null,
      fechadaPor: turno.fechadaPor?.nome ?? null,
      trocoInicialCentavos: turno.trocoInicialCentavos,
      // Aberto: o esperado é calculado agora; fechado: o que foi gravado no fechamento.
      esperadoDinheiroCentavos:
        turno.esperadoDinheiroCentavos ??
        esperadoEmDinheiro(turno.trocoInicialCentavos, lancamentos),
      contadoDinheiroCentavos: turno.contadoDinheiroCentavos,
      diferencaCentavos: turno.diferencaCentavos,
      observacao: turno.observacao,
      resumo: resumoDoCaixa(lancamentos),
      porCategoria: resumoPorCategoria(lancamentos),
      lancamentos: lancamentos.map((l) => ({
        id: l.id,
        tipo: l.tipo,
        valorCentavos: l.valorCentavos,
        forma: l.forma,
        data: deDataDoBanco(l.data),
        categoria: l.categoria,
        descricao: l.descricao,
        criadoPor: l.criadoPor.nome,
        criadoEm: l.criadoEm.toISOString(),
        estornado: l.estorno !== null,
      })),
    };
  }

  // ---------- Avulsos (CAIXA-CA-02, 06) ----------

  async lancarAvulso(ator: Ator, dados: DadosAvulso) {
    if (!formaPermitida(dados.categoria, dados.forma)) {
      throw new BadRequestException("Suprimento e sangria são só em dinheiro.");
    }
    return this.prisma.$transaction(async (tx) => {
      const sessaoId = await turnoParaLancamento(tx);
      if (!sessaoId) throw new ConflictException(MENSAGEM_SEM_CAIXA);
      const lancamento = await tx.lancamento.create({
        data: {
          sessaoId,
          tipo: CATEGORIAS_AVULSAS[dados.categoria].tipo,
          valorCentavos: dados.valorCentavos,
          forma: dados.forma,
          data: paraDataDoBanco(hojeEmSaoPaulo(new Date())),
          categoria: dados.categoria,
          descricao: dados.descricao,
          criadoPorId: ator.id,
        },
      });
      await this.auditoria.registrar(
        {
          acao: "LANCAMENTO_AVULSO_REGISTRADO",
          atorId: ator.id,
          ip: ator.ip,
          alvoTipo: "Lancamento",
          alvoId: lancamento.id,
          detalhes: {
            sessaoId,
            categoria: dados.categoria,
            forma: dados.forma,
            valorCentavos: dados.valorCentavos,
          },
        },
        tx,
      );
      return { id: lancamento.id };
    });
  }

  async estornarAvulso(ator: Ator, id: string, motivo: string) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const sessaoId = await turnoParaLancamento(tx);
        if (!sessaoId) throw new ConflictException(MENSAGEM_SEM_CAIXA);
        const original = await tx.lancamento.findUnique({
          where: { id },
          include: { estorno: { select: { id: true } } },
        });
        if (!original) throw new NotFoundException("Lançamento não encontrado.");
        if (!ehCategoriaAvulsa(original.categoria)) {
          throw new BadRequestException("Só lançamento avulso é estornado por aqui.");
        }
        if (original.estorno) throw new ConflictException("Este lançamento já foi estornado.");
        const estorno = await tx.lancamento.create({
          data: {
            sessaoId,
            tipo: original.tipo === "ENTRADA" ? "SAIDA" : "ENTRADA",
            valorCentavos: original.valorCentavos,
            forma: original.forma,
            data: paraDataDoBanco(hojeEmSaoPaulo(new Date())),
            categoria: "ESTORNO",
            descricao: `Estorno: ${original.descricao}`.slice(0, 200),
            origemTipo: "Lancamento",
            origemId: original.id,
            estornoDeId: original.id,
            criadoPorId: ator.id,
          },
        });
        await this.auditoria.registrar(
          {
            acao: "LANCAMENTO_AVULSO_ESTORNADO",
            atorId: ator.id,
            ip: ator.ip,
            alvoTipo: "Lancamento",
            alvoId: original.id,
            detalhes: {
              estornoId: estorno.id,
              sessaoId,
              valorCentavos: original.valorCentavos,
              motivo,
            },
          },
          tx,
        );
        return { id: estorno.id };
      });
    } catch (erro) {
      if (ehUnico(erro)) throw new ConflictException("Este lançamento já foi estornado.");
      throw erro;
    }
  }
}
