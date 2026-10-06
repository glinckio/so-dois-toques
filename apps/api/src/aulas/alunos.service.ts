import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { AuditoriaService } from "../auditoria/auditoria.service.js";
import type { Prisma } from "../generated/prisma/client.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { ehAdmin, negarForaDoEscopo, type Ator } from "./comum.js";
import {
  dadosAnonimizados,
  deDataDoBanco,
  exigeResponsavel,
  hojeEmSaoPaulo,
  normalizarBusca,
  paraDataDoBanco,
} from "./regras.js";

export type DadosAluno = {
  nome: string;
  telefone: string;
  nascimento: string;
  email: string | null;
  observacoes: string | null;
  emergenciaNome: string;
  emergenciaTelefone: string;
  responsavelNome: string | null;
  responsavelTelefone: string | null;
};

export const TAMANHO_PAGINA_ALUNOS = 30;
export const MENSAGEM_RESPONSAVEL =
  "Para menores de 18 anos, informe o nome e o telefone do responsável.";
const MENSAGEM_ANONIMIZADO = "Este aluno foi anonimizado e não pode ser alterado.";

type Tx = Prisma.TransactionClient;

@Injectable()
export class AlunosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditoria: AuditoriaService,
  ) {}

  /** Professor só alcança alunos com matrícula aberta numa turma dele. */
  private escopo(ator: Ator): Prisma.AlunoWhereInput {
    return ehAdmin(ator)
      ? {}
      : { matriculas: { some: { fim: null, turma: { professorId: ator.id } } } };
  }

  /** AULAS-CA-05: busca por parte do nome (sem acento) ou do telefone. */
  async listar(
    ator: Ator,
    filtro: { busca?: string; situacao: "ativos" | "inativos" | "todos"; pagina: number },
  ) {
    const where: Prisma.AlunoWhereInput = { AND: [this.escopo(ator)] };
    const and = where.AND as Prisma.AlunoWhereInput[];
    if (filtro.situacao !== "todos") and.push({ ativo: filtro.situacao === "ativos" });
    if (!ehAdmin(ator) || filtro.situacao !== "todos") and.push({ anonimizadoEm: null });
    const busca = filtro.busca?.trim();
    if (busca) {
      const digitos = busca.replace(/\D/g, "");
      const termo = normalizarBusca(busca);
      and.push({
        OR: [
          ...(termo ? [{ nomeBusca: { contains: termo } }] : []),
          ...(digitos.length >= 3 ? [{ telefone: { contains: digitos } }] : []),
        ],
      });
    }
    const [total, itens] = await Promise.all([
      this.prisma.aluno.count({ where }),
      this.prisma.aluno.findMany({
        where,
        orderBy: [{ nomeBusca: "asc" }, { id: "asc" }],
        skip: (filtro.pagina - 1) * TAMANHO_PAGINA_ALUNOS,
        take: TAMANHO_PAGINA_ALUNOS,
        select: { id: true, nome: true, telefone: true, ativo: true, anonimizadoEm: true },
      }),
    ]);
    return {
      total,
      pagina: filtro.pagina,
      tamanho: TAMANHO_PAGINA_ALUNOS,
      itens: itens.map((a) => ({
        id: a.id,
        nome: a.nome,
        telefone: a.telefone,
        ativo: a.ativo,
        anonimizado: a.anonimizadoEm !== null,
      })),
    };
  }

  async buscar(ator: Ator, id: string) {
    const aluno = await this.prisma.aluno.findFirst({
      where: { id, ...this.escopo(ator) },
      include: {
        consentimentoRegistradoPor: { select: { nome: true } },
        matriculas: {
          where: ehAdmin(ator) ? {} : { turma: { professorId: ator.id } },
          orderBy: [{ fim: { sort: "desc", nulls: "first" } }, { inicio: "desc" }],
          include: { turma: { select: { id: true, nome: true, nivel: true, ativa: true } } },
        },
      },
    });
    if (!aluno) {
      if (!ehAdmin(ator)) return negarForaDoEscopo(this.auditoria, ator, "aluno", id);
      throw new NotFoundException("Aluno não encontrado.");
    }
    const matriculas = aluno.matriculas.map((m) => ({
      id: m.id,
      inicio: deDataDoBanco(m.inicio),
      fim: m.fim ? deDataDoBanco(m.fim) : null,
      turma: m.turma,
    }));
    const contato = {
      id: aluno.id,
      nome: aluno.nome,
      telefone: aluno.telefone,
      emergenciaNome: aluno.emergenciaNome,
      emergenciaTelefone: aluno.emergenciaTelefone,
      responsavelNome: aluno.responsavelNome,
      responsavelTelefone: aluno.responsavelTelefone,
      ativo: aluno.ativo,
      anonimizado: aluno.anonimizadoEm !== null,
      matriculas,
    };
    // O professor vê só o necessário para a aula (contato e emergência).
    if (!ehAdmin(ator)) return contato;
    return {
      ...contato,
      nascimento: aluno.nascimento ? deDataDoBanco(aluno.nascimento) : null,
      email: aluno.email,
      observacoes: aluno.observacoes,
      consentimentoEm: aluno.consentimentoEm.toISOString(),
      consentimentoPor: aluno.consentimentoPor,
      consentimentoRegistradoPor: aluno.consentimentoRegistradoPor.nome,
      anonimizadoEm: aluno.anonimizadoEm?.toISOString() ?? null,
      criadoEm: aluno.criadoEm.toISOString(),
    };
  }

  /** AULAS-CA-03: menor de idade precisa de responsável. */
  private validarResponsavel(dados: DadosAluno, hoje: string) {
    const menor = exigeResponsavel(dados.nascimento, hoje);
    if (menor && (!dados.responsavelNome || !dados.responsavelTelefone)) {
      throw new BadRequestException(MENSAGEM_RESPONSAVEL);
    }
    return menor;
  }

  private colunas(dados: DadosAluno) {
    return {
      nome: dados.nome,
      nomeBusca: normalizarBusca(dados.nome),
      telefone: dados.telefone,
      nascimento: paraDataDoBanco(dados.nascimento),
      email: dados.email,
      observacoes: dados.observacoes,
      emergenciaNome: dados.emergenciaNome,
      emergenciaTelefone: dados.emergenciaTelefone,
      responsavelNome: dados.responsavelNome,
      responsavelTelefone: dados.responsavelTelefone,
    };
  }

  /** AULAS-CA-01 a 03: cadastro com consentimento registrado. */
  async criar(ator: Ator, dados: DadosAluno) {
    const agora = new Date();
    const menor = this.validarResponsavel(dados, hojeEmSaoPaulo(agora));
    return this.prisma.$transaction(async (tx) => {
      const aluno = await tx.aluno.create({
        data: {
          ...this.colunas(dados),
          consentimentoEm: agora,
          consentimentoPor: menor ? "RESPONSAVEL" : "ALUNO",
          consentimentoRegistradoPorId: ator.id,
        },
        select: { id: true, nome: true },
      });
      await this.auditoria.registrar(
        { acao: "ALUNO_CRIADO", atorId: ator.id, ip: ator.ip, alvoTipo: "Aluno", alvoId: aluno.id },
        tx,
      );
      return aluno;
    });
  }

  private async travar(tx: Tx, id: string) {
    await tx.$queryRaw`SELECT id FROM "Aluno" WHERE id = ${id}::uuid FOR UPDATE`;
    const aluno = await tx.aluno.findUnique({ where: { id } });
    if (!aluno) throw new NotFoundException("Aluno não encontrado.");
    return aluno;
  }

  async alterar(ator: Ator, id: string, dados: DadosAluno) {
    const menor = this.validarResponsavel(dados, hojeEmSaoPaulo(new Date()));
    return this.prisma.$transaction(async (tx) => {
      const atual = await this.travar(tx, id);
      if (atual.anonimizadoEm) throw new ConflictException(MENSAGEM_ANONIMIZADO);
      const novas = this.colunas(dados);
      // Na auditoria vão só os nomes dos campos alterados, nunca os valores (LGPD).
      const campos = (Object.keys(novas) as (keyof typeof novas)[]).filter((campo) => {
        const antes = atual[campo];
        const depois = novas[campo];
        return antes instanceof Date && depois instanceof Date
          ? antes.getTime() !== depois.getTime()
          : antes !== depois;
      });
      await tx.aluno.update({
        where: { id },
        data: { ...novas, consentimentoPor: menor ? "RESPONSAVEL" : atual.consentimentoPor },
      });
      if (campos.length > 0) {
        await this.auditoria.registrar(
          {
            acao: "ALUNO_ALTERADO",
            atorId: ator.id,
            ip: ator.ip,
            alvoTipo: "Aluno",
            alvoId: id,
            detalhes: { campos: campos.filter((c) => c !== "nomeBusca") },
          },
          tx,
        );
      }
      return { id };
    });
  }

  private async encerrarMatriculas(tx: Tx, alunoId: string, hoje: string) {
    return tx.matricula.updateMany({
      where: { alunoId, fim: null },
      data: { fim: paraDataDoBanco(hoje) },
    });
  }

  /** AULAS-CA-06: inativar encerra as matrículas abertas. */
  async inativar(ator: Ator, id: string) {
    return this.prisma.$transaction(async (tx) => {
      const aluno = await this.travar(tx, id);
      if (!aluno.ativo) return { id, ativo: false };
      const encerradas = await this.encerrarMatriculas(tx, id, hojeEmSaoPaulo(new Date()));
      await tx.aluno.update({ where: { id }, data: { ativo: false } });
      await this.auditoria.registrar(
        {
          acao: "ALUNO_INATIVADO",
          atorId: ator.id,
          ip: ator.ip,
          alvoTipo: "Aluno",
          alvoId: id,
          detalhes: { matriculasEncerradas: encerradas.count },
        },
        tx,
      );
      return { id, ativo: false };
    });
  }

  async reativar(ator: Ator, id: string) {
    return this.prisma.$transaction(async (tx) => {
      const aluno = await this.travar(tx, id);
      if (aluno.anonimizadoEm) throw new ConflictException(MENSAGEM_ANONIMIZADO);
      if (aluno.ativo) return { id, ativo: true };
      await tx.aluno.update({ where: { id }, data: { ativo: true } });
      await this.auditoria.registrar(
        { acao: "ALUNO_REATIVADO", atorId: ator.id, ip: ator.ip, alvoTipo: "Aluno", alvoId: id },
        tx,
      );
      return { id, ativo: true };
    });
  }

  /** AULAS-CA-07: cópia dos dados do aluno (LGPD), registrada na auditoria. */
  async exportar(ator: Ator, id: string) {
    const aluno = await this.prisma.aluno.findUnique({
      where: { id },
      include: {
        matriculas: { include: { turma: { select: { nome: true } } }, orderBy: { inicio: "asc" } },
        presencas: { include: { turma: { select: { nome: true } } }, orderBy: { data: "asc" } },
      },
    });
    if (!aluno) throw new NotFoundException("Aluno não encontrado.");
    await this.auditoria.registrar({
      acao: "ALUNO_EXPORTADO",
      atorId: ator.id,
      ip: ator.ip,
      alvoTipo: "Aluno",
      alvoId: id,
    });
    return {
      geradoEm: new Date().toISOString(),
      aluno: {
        nome: aluno.nome,
        telefone: aluno.telefone,
        nascimento: aluno.nascimento ? deDataDoBanco(aluno.nascimento) : null,
        email: aluno.email,
        observacoes: aluno.observacoes,
        contatoDeEmergencia: { nome: aluno.emergenciaNome, telefone: aluno.emergenciaTelefone },
        responsavel: { nome: aluno.responsavelNome, telefone: aluno.responsavelTelefone },
        situacao: aluno.ativo ? "ativo" : "inativo",
        cadastradoEm: aluno.criadoEm.toISOString(),
      },
      consentimento: {
        registradoEm: aluno.consentimentoEm.toISOString(),
        dadoPor: aluno.consentimentoPor === "RESPONSAVEL" ? "responsável" : "aluno",
        finalidade: "Organização das aulas",
      },
      matriculas: aluno.matriculas.map((m) => ({
        turma: m.turma.nome,
        inicio: deDataDoBanco(m.inicio),
        fim: m.fim ? deDataDoBanco(m.fim) : null,
      })),
      presencas: aluno.presencas.map((p) => ({
        turma: p.turma.nome,
        data: deDataDoBanco(p.data),
        presente: p.presente,
      })),
    };
  }

  /** AULAS-CA-08: anonimização irreversível; as presenças continuam contando. */
  async anonimizar(ator: Ator, id: string) {
    return this.prisma.$transaction(async (tx) => {
      const aluno = await this.travar(tx, id);
      if (aluno.anonimizadoEm) throw new ConflictException("Este aluno já foi anonimizado.");
      await this.encerrarMatriculas(tx, id, hojeEmSaoPaulo(new Date()));
      await tx.aluno.update({
        where: { id },
        data: { ...dadosAnonimizados(), anonimizadoEm: new Date() },
      });
      await this.auditoria.registrar(
        { acao: "ALUNO_ANONIMIZADO", atorId: ator.id, ip: ator.ip, alvoTipo: "Aluno", alvoId: id },
        tx,
      );
      return { id, anonimizado: true };
    });
  }
}
