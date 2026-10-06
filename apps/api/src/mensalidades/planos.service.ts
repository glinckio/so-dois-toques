import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { deDataDoBanco, hojeEmSaoPaulo, paraDataDoBanco } from "../aulas/regras.js";
import type { Ator } from "../aulas/comum.js";
import { AuditoriaService } from "../auditoria/auditoria.service.js";
import { Prisma } from "../generated/prisma/client.js";
import { PrismaService } from "../prisma/prisma.service.js";
import {
  competenciaAtual,
  competenciaDe,
  primeiroDia,
  proximaCompetencia,
  valorDaMensalidade,
} from "./regras.js";

type Tx = Prisma.TransactionClient;

export type DadosPlano = {
  nome: string;
  aulasPorSemana: number;
  valorCentavos: number;
  ativo: boolean;
};

export type DadosAssinatura = {
  planoId: string;
  diaVencimento: number;
  descontoCentavos: number;
  motivoDesconto: string | null;
  inicio: string;
};

const MENSAGEM_NOME_REPETIDO = "Já existe um plano com esse nome.";

/**
 * Encerra a assinatura vigente do aluno: ela deixa de cobrar a partir do mês seguinte
 * ao atual (MENS-CA-04). Usada também ao inativar e anonimizar o aluno.
 */
export async function encerrarAssinaturaVigente(tx: Tx, alunoId: string, agora = new Date()) {
  const vigente = await tx.assinatura.findFirst({ where: { alunoId, fim: null } });
  if (!vigente) return null;
  const proximoMes = paraDataDoBanco(primeiroDia(proximaCompetencia(competenciaAtual(agora))));
  // Assinatura que ainda nem começou termina no próprio início (não cobra nada).
  const fim = vigente.inicio > proximoMes ? vigente.inicio : proximoMes;
  await tx.assinatura.update({ where: { id: vigente.id }, data: { fim } });
  return vigente.id;
}

function paraResposta(a: {
  id: string;
  diaVencimento: number;
  descontoCentavos: number;
  motivoDesconto: string | null;
  inicio: Date;
  fim: Date | null;
  criadaEm: Date;
  plano: { id: string; nome: string; valorCentavos: number; aulasPorSemana: number };
}) {
  return {
    id: a.id,
    plano: a.plano,
    diaVencimento: a.diaVencimento,
    descontoCentavos: a.descontoCentavos,
    motivoDesconto: a.motivoDesconto,
    valorCentavos: a.plano.valorCentavos - a.descontoCentavos,
    inicio: competenciaDe(deDataDoBanco(a.inicio)),
    fim: a.fim ? competenciaDe(deDataDoBanco(a.fim)) : null,
    criadaEm: a.criadaEm.toISOString(),
  };
}

const PLANO_RESUMO = { id: true, nome: true, valorCentavos: true, aulasPorSemana: true } as const;

@Injectable()
export class PlanosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditoria: AuditoriaService,
  ) {}

  // ---------- Planos (MENS-CA-01) ----------

  async listar() {
    const planos = await this.prisma.plano.findMany({
      orderBy: [{ ativo: "desc" }, { aulasPorSemana: "asc" }, { nome: "asc" }],
      include: { _count: { select: { assinaturas: { where: { fim: null } } } } },
    });
    return planos.map((p) => ({
      id: p.id,
      nome: p.nome,
      aulasPorSemana: p.aulasPorSemana,
      valorCentavos: p.valorCentavos,
      ativo: p.ativo,
      alunos: p._count.assinaturas,
    }));
  }

  async criar(ator: Ator, dados: DadosPlano) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const plano = await tx.plano.create({ data: dados });
        await this.auditoria.registrar(
          {
            acao: "PLANO_CRIADO",
            atorId: ator.id,
            ip: ator.ip,
            alvoTipo: "Plano",
            alvoId: plano.id,
            detalhes: { nome: plano.nome, valorCentavos: plano.valorCentavos },
          },
          tx,
        );
        return { id: plano.id };
      });
    } catch (erro) {
      if (erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === "P2002") {
        throw new ConflictException(MENSAGEM_NOME_REPETIDO);
      }
      throw erro;
    }
  }

  /** MENS-CA-06: o valor novo vale só para as mensalidades geradas depois. */
  async alterar(ator: Ator, id: string, dados: DadosPlano) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const atual = await tx.plano.findUnique({ where: { id } });
        if (!atual) throw new NotFoundException("Plano não encontrado.");
        await tx.plano.update({ where: { id }, data: dados });
        const alterados = (Object.keys(dados) as (keyof DadosPlano)[]).filter(
          (campo) => dados[campo] !== atual[campo],
        );
        await this.auditoria.registrar(
          {
            acao: "PLANO_ALTERADO",
            atorId: ator.id,
            ip: ator.ip,
            alvoTipo: "Plano",
            alvoId: id,
            detalhes: {
              campos: alterados,
              ...(alterados.includes("valorCentavos")
                ? { valorAnterior: atual.valorCentavos, valorNovo: dados.valorCentavos }
                : {}),
            },
          },
          tx,
        );
        return { id };
      });
    } catch (erro) {
      if (erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === "P2002") {
        throw new ConflictException(MENSAGEM_NOME_REPETIDO);
      }
      throw erro;
    }
  }

  // ---------- Assinaturas (MENS-CA-02 a 04) ----------

  async assinaturasDoAluno(alunoId: string) {
    const aluno = await this.prisma.aluno.findUnique({ where: { id: alunoId } });
    if (!aluno) throw new NotFoundException("Aluno não encontrado.");
    const assinaturas = await this.prisma.assinatura.findMany({
      where: { alunoId },
      include: { plano: { select: PLANO_RESUMO } },
      orderBy: [{ inicio: "desc" }, { criadaEm: "desc" }],
    });
    const lista = assinaturas.map(paraResposta);
    return { vigente: lista.find((a) => a.fim === null) ?? null, historico: lista };
  }

  /**
   * MENS-CA-02 e 03: define o plano do aluno a partir de um mês. A vigente é encerrada
   * nesse mês e a nova começa nele; o índice único parcial impede duas vigentes.
   */
  async definir(ator: Ator, alunoId: string, dados: DadosAssinatura) {
    const mesAtual = competenciaAtual(new Date());
    if (dados.inicio < mesAtual) {
      throw new BadRequestException("O plano só pode mudar a partir do mês atual.");
    }
    try {
      return await this.prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT id FROM "Aluno" WHERE id = ${alunoId}::uuid FOR UPDATE`;
        const aluno = await tx.aluno.findUnique({ where: { id: alunoId } });
        if (!aluno) throw new NotFoundException("Aluno não encontrado.");
        if (!aluno.ativo) throw new ConflictException("Aluno inativo não pode ter plano.");
        const plano = await tx.plano.findUnique({ where: { id: dados.planoId } });
        if (!plano) throw new NotFoundException("Plano não encontrado.");
        if (!plano.ativo) throw new ConflictException("Plano inativo não recebe aluno novo.");
        if (valorDaMensalidade(plano.valorCentavos, dados.descontoCentavos) === null) {
          throw new BadRequestException("O desconto precisa ser menor que o valor do plano.");
        }

        const inicio = paraDataDoBanco(primeiroDia(dados.inicio));
        const vigente = await tx.assinatura.findFirst({ where: { alunoId, fim: null } });
        if (vigente) {
          const fim = vigente.inicio > inicio ? vigente.inicio : inicio;
          await tx.assinatura.update({ where: { id: vigente.id }, data: { fim } });
        }
        const nova = await tx.assinatura.create({
          data: {
            alunoId,
            planoId: plano.id,
            diaVencimento: dados.diaVencimento,
            descontoCentavos: dados.descontoCentavos,
            motivoDesconto: dados.descontoCentavos > 0 ? dados.motivoDesconto : null,
            inicio,
            criadaPorId: ator.id,
          },
        });
        await this.auditoria.registrar(
          {
            acao: "ASSINATURA_DEFINIDA",
            atorId: ator.id,
            ip: ator.ip,
            alvoTipo: "Aluno",
            alvoId: alunoId,
            detalhes: {
              assinaturaId: nova.id,
              anteriorId: vigente?.id ?? null,
              planoId: plano.id,
              diaVencimento: dados.diaVencimento,
              descontoCentavos: dados.descontoCentavos,
              inicio: dados.inicio,
            },
          },
          tx,
        );
        return { id: nova.id };
      });
    } catch (erro) {
      if (erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === "P2002") {
        throw new ConflictException("O plano do aluno acabou de ser alterado. Tente de novo.");
      }
      throw erro;
    }
  }

  async encerrar(ator: Ator, alunoId: string) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Aluno" WHERE id = ${alunoId}::uuid FOR UPDATE`;
      const aluno = await tx.aluno.findUnique({ where: { id: alunoId } });
      if (!aluno) throw new NotFoundException("Aluno não encontrado.");
      const encerrada = await encerrarAssinaturaVigente(tx, alunoId);
      if (!encerrada) throw new ConflictException("O aluno não tem plano vigente.");
      await this.auditoria.registrar(
        {
          acao: "ASSINATURA_ENCERRADA",
          atorId: ator.id,
          ip: ator.ip,
          alvoTipo: "Aluno",
          alvoId: alunoId,
          detalhes: { assinaturaId: encerrada, hoje: hojeEmSaoPaulo(new Date()) },
        },
        tx,
      );
      return { id: encerrada };
    });
  }
}
