import { randomUUID } from "node:crypto";
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
import { turnoParaLancamento } from "../caixa/sessao.js";
import { PrismaService } from "../prisma/prisma.service.js";
import {
  competenciaAtual,
  competenciaDe,
  nomeDoMes,
  primeiroDia,
  proximaCompetencia,
  type FormaPagamento,
} from "../mensalidades/regras.js";
import {
  custoPrevisto,
  matriculaValeNoMes,
  minutosDaTurmaNoMes,
  ratear,
  ratearIgual,
} from "./regras.js";

export type DadosPagamentoQuadra = {
  localId: string;
  competencia: string;
  valorCentavos: number;
  forma: FormaPagamento;
  data: string;
};

type TurmaComHorarios = {
  id: string;
  localId: string;
  inicio: Date;
  encerradaEm: Date | null;
  horarios: { diaSemana: number; inicio: number; fim: number }[];
};

/** Minutos de cada turma no mês (CUSTO-CA-02), na ordem recebida. */
function minutosNoMes(turmas: TurmaComHorarios[], competencia: string) {
  return turmas.map((t) => ({
    turmaId: t.id,
    minutos: minutosDaTurmaNoMes(
      {
        horarios: t.horarios,
        inicio: deDataDoBanco(t.inicio),
        encerradaEm: t.encerradaEm ? hojeEmSaoPaulo(t.encerradaEm) : null,
      },
      competencia,
    ),
  }));
}

function intervaloDoMes(competencia: string) {
  return {
    gte: paraDataDoBanco(primeiroDia(competencia)),
    lt: paraDataDoBanco(primeiroDia(proximaCompetencia(competencia))),
  };
}

type Valores = { receitaCentavos: number; custoCentavos: number };
const somar = (alvo: Valores, receita: number, custo: number) => {
  alvo.receitaCentavos += receita;
  alvo.custoCentavos += custo;
};
const comResultado = <T extends Valores>(v: T) => ({
  ...v,
  resultadoCentavos: v.receitaCentavos - v.custoCentavos,
});

@Injectable()
export class CustosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditoria: AuditoriaService,
  ) {}

  // ---------- Valor da hora (CUSTO-CA-01) ----------

  async definirValorHora(ator: Ator, localId: string, valorHoraCentavos: number | null) {
    return this.prisma.$transaction(async (tx) => {
      const local = await tx.local.findUnique({ where: { id: localId } });
      if (!local) throw new NotFoundException("Local não encontrado.");
      if (local.tipo !== "PARCEIRA") {
        throw new BadRequestException("Só local parceiro tem valor da hora.");
      }
      await tx.local.update({ where: { id: localId }, data: { valorHoraCentavos } });
      await this.auditoria.registrar(
        {
          acao: "LOCAL_VALOR_HORA_ALTERADO",
          atorId: ator.id,
          ip: ator.ip,
          alvoTipo: "Local",
          alvoId: localId,
          detalhes: { valorAnterior: local.valorHoraCentavos, valorNovo: valorHoraCentavos },
        },
        tx,
      );
      return { id: localId, valorHoraCentavos };
    });
  }

  // ---------- Horas, previsto e pagamentos do mês (CUSTO-CA-02) ----------

  async resumo(competencia: string) {
    const locais = await this.prisma.local.findMany({
      where: { tipo: "PARCEIRA" },
      orderBy: [{ ativo: "desc" }, { nome: "asc" }],
      include: {
        turmas: {
          select: {
            id: true,
            nome: true,
            localId: true,
            inicio: true,
            encerradaEm: true,
            horarios: { select: { diaSemana: true, inicio: true, fim: true } },
          },
          orderBy: { nome: "asc" },
        },
        pagamentosQuadra: {
          where: { competencia: paraDataDoBanco(primeiroDia(competencia)) },
          include: { pagoPor: { select: { nome: true } } },
          orderBy: [{ data: "asc" }, { criadoEm: "asc" }],
        },
      },
    });
    const lista = locais.map((local) => {
      const minutos = minutosNoMes(local.turmas, competencia);
      const turmas = local.turmas
        .map((t, i) => ({ id: t.id, nome: t.nome, minutos: minutos[i]?.minutos ?? 0 }))
        .filter((t) => t.minutos > 0);
      const totalMinutos = turmas.reduce((soma, t) => soma + t.minutos, 0);
      const pagoCentavos = local.pagamentosQuadra
        .filter((p) => !p.estornadoEm)
        .reduce((soma, p) => soma + p.valorCentavos, 0);
      return {
        id: local.id,
        nome: local.nome,
        ativo: local.ativo,
        valorHoraCentavos: local.valorHoraCentavos,
        minutos: totalMinutos,
        previstoCentavos:
          local.valorHoraCentavos === null
            ? null
            : custoPrevisto(totalMinutos, local.valorHoraCentavos),
        pagoCentavos,
        turmas,
        pagamentos: local.pagamentosQuadra.map((p) => ({
          id: p.id,
          valorCentavos: p.valorCentavos,
          forma: p.forma,
          data: deDataDoBanco(p.data),
          pagoPor: p.pagoPor.nome,
          estornadoEm: p.estornadoEm?.toISOString() ?? null,
          motivoEstorno: p.motivoEstorno,
        })),
      };
    });
    return {
      competencia,
      locais: lista,
      totais: {
        minutos: lista.reduce((s, l) => s + l.minutos, 0),
        previstoCentavos: lista.reduce((s, l) => s + (l.previstoCentavos ?? 0), 0),
        pagoCentavos: lista.reduce((s, l) => s + l.pagoCentavos, 0),
      },
    };
  }

  // ---------- Pagamento e estorno (CUSTO-CA-03, 04) ----------

  async pagar(ator: Ator, dados: DadosPagamentoQuadra) {
    const agora = new Date();
    if (dados.data > hojeEmSaoPaulo(agora)) {
      throw new BadRequestException("A data do pagamento não pode ser no futuro.");
    }
    if (dados.competencia > proximaCompetencia(competenciaAtual(agora))) {
      throw new BadRequestException("Só dá para pagar até o mês que vem.");
    }
    return this.prisma.$transaction(async (tx) => {
      const local = await tx.local.findUnique({ where: { id: dados.localId } });
      if (!local) throw new NotFoundException("Local não encontrado.");
      if (local.tipo !== "PARCEIRA") {
        throw new BadRequestException("Só local parceiro recebe pagamento de quadra.");
      }
      // O lançamento é imutável e vem antes do pagamento, então o id do pagamento
      // é gerado aqui para já entrar na origem. Sem dado pessoal: local e mês bastam.
      const pagamentoId = randomUUID();
      const sessaoId = await turnoParaLancamento(tx);
      const lancamento = await tx.lancamento.create({
        data: {
          sessaoId,
          tipo: "SAIDA",
          valorCentavos: dados.valorCentavos,
          forma: dados.forma,
          data: paraDataDoBanco(dados.data),
          categoria: "QUADRA_PARCEIRA",
          descricao: `Quadra ${local.nome} de ${nomeDoMes(dados.competencia)}`,
          origemTipo: "PagamentoQuadra",
          origemId: pagamentoId,
          criadoPorId: ator.id,
        },
      });
      const pagamento = await tx.pagamentoQuadra.create({
        data: {
          id: pagamentoId,
          localId: local.id,
          competencia: paraDataDoBanco(primeiroDia(dados.competencia)),
          valorCentavos: dados.valorCentavos,
          forma: dados.forma,
          data: paraDataDoBanco(dados.data),
          pagoPorId: ator.id,
          lancamentoId: lancamento.id,
        },
      });
      await this.auditoria.registrar(
        {
          acao: "PAGAMENTO_QUADRA_REGISTRADO",
          atorId: ator.id,
          ip: ator.ip,
          alvoTipo: "Local",
          alvoId: local.id,
          detalhes: {
            pagamentoId: pagamento.id,
            competencia: dados.competencia,
            valorCentavos: dados.valorCentavos,
            forma: dados.forma,
            data: dados.data,
            lancamentoId: lancamento.id,
          },
        },
        tx,
      );
      return { id: pagamento.id, lancamentoId: lancamento.id };
    });
  }

  async estornar(ator: Ator, id: string, motivo: string) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT id FROM "PagamentoQuadra" WHERE id = ${id}::uuid FOR UPDATE`;
        const pagamento = await tx.pagamentoQuadra.findUnique({
          where: { id },
          include: { local: { select: { nome: true } } },
        });
        if (!pagamento) throw new NotFoundException("Pagamento não encontrado.");
        if (pagamento.estornadoEm) throw new ConflictException("Este pagamento já foi estornado.");
        const competencia = competenciaDe(deDataDoBanco(pagamento.competencia));
        const sessaoId = await turnoParaLancamento(tx);
        const estorno = await tx.lancamento.create({
          data: {
            sessaoId,
            tipo: "ENTRADA",
            valorCentavos: pagamento.valorCentavos,
            forma: pagamento.forma,
            data: paraDataDoBanco(hojeEmSaoPaulo(new Date())),
            categoria: "ESTORNO",
            descricao: `Estorno: quadra ${pagamento.local.nome} de ${nomeDoMes(competencia)}`,
            origemTipo: "PagamentoQuadra",
            origemId: pagamento.id,
            estornoDeId: pagamento.lancamentoId,
            criadoPorId: ator.id,
          },
        });
        await tx.pagamentoQuadra.update({
          where: { id },
          data: {
            estornadoEm: new Date(),
            estornadoPorId: ator.id,
            motivoEstorno: motivo,
            estornoLancamentoId: estorno.id,
          },
        });
        await this.auditoria.registrar(
          {
            acao: "PAGAMENTO_QUADRA_ESTORNADO",
            atorId: ator.id,
            ip: ator.ip,
            alvoTipo: "Local",
            alvoId: pagamento.localId,
            detalhes: {
              pagamentoId: id,
              valorCentavos: pagamento.valorCentavos,
              lancamentoId: estorno.id,
              motivo,
            },
          },
          tx,
        );
        return { id, estornoLancamentoId: estorno.id };
      });
    } catch (erro) {
      if (erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === "P2002") {
        throw new ConflictException("Este pagamento já foi estornado.");
      }
      throw erro;
    }
  }

  // ---------- Resultado do mês (CUSTO-CA-05 a 07) ----------

  /**
   * Regime de caixa: entra no mês o que foi lançado com data nele. A receita de cada
   * pagamento de mensalidade vai em partes iguais para as turmas do aluno no mês da
   * mensalidade; o custo de cada pagamento à quadra vai para as turmas do local, na
   * proporção das horas no mês do pagamento. O que não tem turma fica em "Sem turma".
   * Estornos dividem igual ao original, com sinal trocado.
   */
  async resultado(competencia: string) {
    const lancamentos = await this.prisma.lancamento.findMany({
      where: {
        data: intervaloDoMes(competencia),
        categoria: { in: ["MENSALIDADE", "QUADRA_PARCEIRA", "ESTORNO"] },
      },
      select: {
        tipo: true,
        categoria: true,
        valorCentavos: true,
        origemId: true,
        estornoDe: { select: { categoria: true, origemId: true } },
      },
    });

    const receitas: { mensalidadeId: string; valor: number }[] = [];
    const custos: { pagamentoId: string; valor: number }[] = [];
    for (const l of lancamentos) {
      const original = l.categoria === "ESTORNO" ? l.estornoDe : l;
      if (!original?.origemId) continue;
      const sinal = l.categoria === "ESTORNO" ? -1 : 1;
      if (original.categoria === "MENSALIDADE") {
        receitas.push({ mensalidadeId: original.origemId, valor: sinal * l.valorCentavos });
      } else if (original.categoria === "QUADRA_PARCEIRA") {
        custos.push({ pagamentoId: original.origemId, valor: sinal * l.valorCentavos });
      }
    }

    const mensalidades = await this.prisma.mensalidade.findMany({
      where: { id: { in: [...new Set(receitas.map((r) => r.mensalidadeId))] } },
      select: { id: true, alunoId: true, competencia: true },
    });
    const pagamentos = await this.prisma.pagamentoQuadra.findMany({
      where: { id: { in: [...new Set(custos.map((c) => c.pagamentoId))] } },
      select: { id: true, localId: true, competencia: true },
    });
    const matriculas = await this.prisma.matricula.findMany({
      where: { alunoId: { in: [...new Set(mensalidades.map((m) => m.alunoId))] } },
      select: { alunoId: true, turmaId: true, inicio: true, fim: true },
    });
    const turmasDosLocais = await this.prisma.turma.findMany({
      where: { localId: { in: [...new Set(pagamentos.map((p) => p.localId))] } },
      select: {
        id: true,
        localId: true,
        inicio: true,
        encerradaEm: true,
        horarios: { select: { diaSemana: true, inicio: true, fim: true } },
      },
      orderBy: { id: "asc" },
    });

    const porTurma = new Map<string, Valores>();
    const daTurma = (id: string) => {
      let valores = porTurma.get(id);
      if (!valores) {
        valores = { receitaCentavos: 0, custoCentavos: 0 };
        porTurma.set(id, valores);
      }
      return valores;
    };
    const semTurma: Valores = { receitaCentavos: 0, custoCentavos: 0 };

    const mensalidadePorId = new Map(mensalidades.map((m) => [m.id, m]));
    for (const r of receitas) {
      const m = mensalidadePorId.get(r.mensalidadeId);
      const mes = m ? competenciaDe(deDataDoBanco(m.competencia)) : null;
      const turmas = [
        ...new Set(
          matriculas
            .filter(
              (mat) =>
                m &&
                mes &&
                mat.alunoId === m.alunoId &&
                matriculaValeNoMes(
                  {
                    inicio: deDataDoBanco(mat.inicio),
                    fim: mat.fim ? deDataDoBanco(mat.fim) : null,
                  },
                  mes,
                ),
            )
            .map((mat) => mat.turmaId),
        ),
      ].sort();
      const partes = ratearIgual(r.valor, turmas.length);
      if (!partes) {
        somar(semTurma, r.valor, 0);
        continue;
      }
      turmas.forEach((turmaId, i) => somar(daTurma(turmaId), partes[i] ?? 0, 0));
    }

    const pagamentoPorId = new Map(pagamentos.map((p) => [p.id, p]));
    for (const c of custos) {
      const p = pagamentoPorId.get(c.pagamentoId);
      const turmas = p ? turmasDosLocais.filter((t) => t.localId === p.localId) : [];
      const minutos = p
        ? minutosNoMes(turmas, competenciaDe(deDataDoBanco(p.competencia))).filter(
            (t) => t.minutos > 0,
          )
        : [];
      const partes = ratear(
        c.valor,
        minutos.map((t) => t.minutos),
      );
      if (!partes) {
        somar(semTurma, 0, c.valor);
        continue;
      }
      minutos.forEach((t, i) => somar(daTurma(t.turmaId), 0, partes[i] ?? 0));
    }

    // Turmas com valor no mês e as que estavam ativas nele (mesmo zeradas).
    const turmas = await this.prisma.turma.findMany({
      where: {
        OR: [
          { id: { in: [...porTurma.keys()] } },
          {
            inicio: { lt: intervaloDoMes(competencia).lt },
            OR: [{ encerradaEm: null }, { encerradaEm: { gte: intervaloDoMes(competencia).gte } }],
          },
        ],
      },
      select: {
        id: true,
        nome: true,
        local: { select: { nome: true } },
        professor: { select: { id: true, nome: true } },
      },
      orderBy: { nome: "asc" },
    });

    const linhas = turmas.map((t) => ({
      id: t.id,
      nome: t.nome,
      local: t.local.nome,
      professor: t.professor,
      ...comResultado(porTurma.get(t.id) ?? { receitaCentavos: 0, custoCentavos: 0 }),
    }));

    const porProfessor = new Map<string, Valores & { id: string; nome: string; turmas: number }>();
    for (const linha of linhas) {
      const atual = porProfessor.get(linha.professor.id) ?? {
        id: linha.professor.id,
        nome: linha.professor.nome,
        turmas: 0,
        receitaCentavos: 0,
        custoCentavos: 0,
      };
      atual.turmas += 1;
      somar(atual, linha.receitaCentavos, linha.custoCentavos);
      porProfessor.set(linha.professor.id, atual);
    }

    const totais: Valores = { receitaCentavos: 0, custoCentavos: 0 };
    for (const r of receitas) somar(totais, r.valor, 0);
    for (const c of custos) somar(totais, 0, c.valor);

    return {
      competencia,
      turmas: linhas,
      semTurma: comResultado(semTurma),
      professores: [...porProfessor.values()]
        .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
        .map(comResultado),
      totais: comResultado(totais),
    };
  }
}
