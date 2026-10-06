import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { AuditoriaService } from "../auditoria/auditoria.service.js";
import { Prisma } from "../generated/prisma/client.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { ehAdmin, negarForaDoEscopo, type Ator } from "./comum.js";
import {
  conflitosDeHorario,
  deDataDoBanco,
  horaDe,
  hojeEmSaoPaulo,
  matriculaValeEm,
  MENSAGENS_PRESENCA,
  paraDataDoBanco,
  temSobreposicaoInterna,
  validarDataDePresenca,
  type Horario,
  type Nivel,
  type TipoLocal,
} from "./regras.js";

type Tx = Prisma.TransactionClient;

export type DadosLocal = { nome: string; tipo: TipoLocal; endereco: string | null; ativo: boolean };
export type DadosTurma = {
  nome: string;
  nivel: Nivel;
  localId: string;
  professorId: string;
  vagas: number;
  horarios: Horario[];
};

export const MENSAGEM_SEM_VAGAS = "Turma sem vagas";
const MENSAGEM_TURMA_ENCERRADA = "Esta turma está encerrada.";
const DIAS = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

const descreverHorario = (h: Horario) =>
  `${DIAS[h.diaSemana]} ${horaDe(h.inicio)}–${horaDe(h.fim)}`;

@Injectable()
export class TurmasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditoria: AuditoriaService,
  ) {}

  // ---------- Locais (AULAS-CA-09) ----------

  listarLocais() {
    return this.prisma.local.findMany({ orderBy: [{ ativo: "desc" }, { nome: "asc" }] });
  }

  async criarLocal(ator: Ator, dados: DadosLocal) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const local = await tx.local.create({ data: dados });
        await this.auditoria.registrar(
          {
            acao: "LOCAL_CRIADO",
            atorId: ator.id,
            ip: ator.ip,
            alvoTipo: "Local",
            alvoId: local.id,
            detalhes: { nome: local.nome, tipo: local.tipo },
          },
          tx,
        );
        return local;
      });
    } catch (erro) {
      throw this.traduzirNomeRepetido(erro);
    }
  }

  async alterarLocal(ator: Ator, id: string, dados: DadosLocal) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const atual = await tx.local.findUnique({ where: { id } });
        if (!atual) throw new NotFoundException("Local não encontrado.");
        const local = await tx.local.update({ where: { id }, data: dados });
        await this.auditoria.registrar(
          {
            acao: "LOCAL_ALTERADO",
            atorId: ator.id,
            ip: ator.ip,
            alvoTipo: "Local",
            alvoId: id,
            detalhes: {
              de: { nome: atual.nome, tipo: atual.tipo, ativo: atual.ativo },
              para: dados,
            },
          },
          tx,
        );
        return local;
      });
    } catch (erro) {
      throw this.traduzirNomeRepetido(erro);
    }
  }

  private traduzirNomeRepetido(erro: unknown) {
    if (erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === "P2002") {
      return new ConflictException("Já existe um local com esse nome.");
    }
    return erro;
  }

  /** Quem pode dar aula: usuários ativos com perfil Professor ou Administrador (AULAS-CA-11). */
  listarProfessores() {
    return this.prisma.usuario.findMany({
      where: { ativo: true, perfil: { in: ["PROFESSOR", "ADMINISTRADOR"] } },
      select: { id: true, nome: true, perfil: true },
      orderBy: { nome: "asc" },
    });
  }

  // ---------- Turmas ----------

  private async ocupadas(cliente: Tx | PrismaService, turmaIds: string[]) {
    const contagem = await cliente.matricula.groupBy({
      by: ["turmaId"],
      where: { turmaId: { in: turmaIds }, fim: null },
      _count: { _all: true },
    });
    return new Map(contagem.map((c) => [c.turmaId, c._count._all]));
  }

  async listar(ator: Ator, situacao: "ativas" | "encerradas" | "todas") {
    const turmas = await this.prisma.turma.findMany({
      where: {
        ...(ehAdmin(ator) ? {} : { professorId: ator.id }),
        ...(situacao === "todas" ? {} : { ativa: situacao === "ativas" }),
      },
      include: {
        local: { select: { id: true, nome: true } },
        professor: { select: { id: true, nome: true } },
        horarios: { orderBy: [{ diaSemana: "asc" }, { inicio: "asc" }] },
      },
      orderBy: [{ ativa: "desc" }, { nome: "asc" }],
    });
    const ocupadas = await this.ocupadas(
      this.prisma,
      turmas.map((t) => t.id),
    );
    return turmas.map((t) => this.resumo(t, ocupadas.get(t.id) ?? 0));
  }

  private resumo(
    t: Prisma.TurmaGetPayload<{
      include: {
        local: { select: { id: true; nome: true } };
        professor: { select: { id: true; nome: true } };
        horarios: true;
      };
    }>,
    ocupadas: number,
  ) {
    return {
      id: t.id,
      nome: t.nome,
      nivel: t.nivel,
      vagas: t.vagas,
      ocupadas,
      livres: Math.max(0, t.vagas - ocupadas),
      ativa: t.ativa,
      inicio: deDataDoBanco(t.inicio),
      local: t.local,
      professor: t.professor,
      horarios: t.horarios.map((h) => ({ diaSemana: h.diaSemana, inicio: h.inicio, fim: h.fim })),
    };
  }

  /** Turma visível para o ator, ou 404 (auditado quando é o professor fora do escopo). */
  private async turmaDoAtor(ator: Ator, id: string) {
    const turma = await this.prisma.turma.findUnique({
      where: { id },
      include: {
        local: { select: { id: true, nome: true } },
        professor: { select: { id: true, nome: true } },
        horarios: { orderBy: [{ diaSemana: "asc" }, { inicio: "asc" }] },
      },
    });
    if (!turma) throw new NotFoundException("Turma não encontrada.");
    if (!ehAdmin(ator) && turma.professorId !== ator.id) {
      return negarForaDoEscopo(this.auditoria, ator, "turma", id);
    }
    return turma;
  }

  async buscar(ator: Ator, id: string) {
    const turma = await this.turmaDoAtor(ator, id);
    const matriculas = await this.prisma.matricula.findMany({
      where: { turmaId: id, fim: null },
      include: { aluno: { select: { id: true, nome: true, telefone: true } } },
      orderBy: { aluno: { nomeBusca: "asc" } },
    });
    return {
      ...this.resumo(turma, matriculas.length),
      matriculas: matriculas.map((m) => ({
        id: m.id,
        inicio: deDataDoBanco(m.inicio),
        aluno: m.aluno,
      })),
    };
  }

  /** AULAS-CA-10 a 12: local ativo, professor válido e horários sem conflito. */
  private async validarTurma(
    tx: Tx,
    dados: DadosTurma,
    turmaId: string | null,
    localAtual: string | null,
  ) {
    if (dados.horarios.length === 0)
      throw new BadRequestException("Informe pelo menos um horário.");
    if (temSobreposicaoInterna(dados.horarios)) {
      throw new BadRequestException("Os horários da turma se sobrepõem.");
    }
    const local = await tx.local.findUnique({ where: { id: dados.localId } });
    if (!local || (!local.ativo && local.id !== localAtual)) {
      throw new BadRequestException("Escolha um local ativo.");
    }
    const professor = await tx.usuario.findUnique({ where: { id: dados.professorId } });
    if (!professor || !professor.ativo || professor.perfil === "ATENDENTE") {
      throw new BadRequestException(
        "O professor precisa ser um usuário ativo com perfil Professor ou Administrador.",
      );
    }
    // Serializa as mudanças de turmas do mesmo professor para a checagem de conflito.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`turmas-professor:${dados.professorId}`}))`;
    const existentes = await tx.horarioTurma.findMany({
      where: {
        turma: {
          professorId: dados.professorId,
          ativa: true,
          ...(turmaId ? { id: { not: turmaId } } : {}),
        },
      },
      include: { turma: { select: { nome: true } } },
    });
    const conflito = conflitosDeHorario(dados.horarios, existentes)[0];
    if (conflito) {
      throw new ConflictException(
        `O professor já tem a turma "${conflito.turma.nome}" na ${descreverHorario(conflito)}.`,
      );
    }
  }

  async criar(ator: Ator, dados: DadosTurma) {
    return this.prisma.$transaction(async (tx) => {
      await this.validarTurma(tx, dados, null, null);
      const turma = await tx.turma.create({
        data: {
          nome: dados.nome,
          nivel: dados.nivel,
          localId: dados.localId,
          professorId: dados.professorId,
          vagas: dados.vagas,
          inicio: paraDataDoBanco(hojeEmSaoPaulo(new Date())),
          horarios: { create: dados.horarios },
        },
      });
      await this.auditoria.registrar(
        {
          acao: "TURMA_CRIADA",
          atorId: ator.id,
          ip: ator.ip,
          alvoTipo: "Turma",
          alvoId: turma.id,
          detalhes: { nome: turma.nome, professorId: turma.professorId, vagas: turma.vagas },
        },
        tx,
      );
      return { id: turma.id };
    });
  }

  private async travarTurma(tx: Tx, id: string) {
    await tx.$queryRaw`SELECT id FROM "Turma" WHERE id = ${id}::uuid FOR UPDATE`;
    const turma = await tx.turma.findUnique({ where: { id } });
    if (!turma) throw new NotFoundException("Turma não encontrada.");
    return turma;
  }

  /** AULAS-CA-16: vagas nunca abaixo dos matriculados. */
  async alterar(ator: Ator, id: string, dados: DadosTurma) {
    return this.prisma.$transaction(async (tx) => {
      const atual = await this.travarTurma(tx, id);
      if (!atual.ativa) throw new ConflictException(MENSAGEM_TURMA_ENCERRADA);
      await this.validarTurma(tx, dados, id, atual.localId);
      const ocupadas = (await this.ocupadas(tx, [id])).get(id) ?? 0;
      if (dados.vagas < ocupadas) {
        throw new ConflictException(
          `A turma tem ${ocupadas} alunos matriculados; as vagas não podem ficar abaixo disso.`,
        );
      }
      await tx.horarioTurma.deleteMany({ where: { turmaId: id } });
      await tx.turma.update({
        where: { id },
        data: {
          nome: dados.nome,
          nivel: dados.nivel,
          localId: dados.localId,
          professorId: dados.professorId,
          vagas: dados.vagas,
          horarios: { create: dados.horarios },
        },
      });
      await this.auditoria.registrar(
        {
          acao: "TURMA_ALTERADA",
          atorId: ator.id,
          ip: ator.ip,
          alvoTipo: "Turma",
          alvoId: id,
          detalhes: {
            de: {
              nome: atual.nome,
              professorId: atual.professorId,
              vagas: atual.vagas,
              localId: atual.localId,
            },
            para: {
              nome: dados.nome,
              professorId: dados.professorId,
              vagas: dados.vagas,
              localId: dados.localId,
            },
          },
        },
        tx,
      );
      return { id };
    });
  }

  /** AULAS-CA-13: encerrar a turma encerra as matrículas abertas. */
  async encerrar(ator: Ator, id: string) {
    return this.prisma.$transaction(async (tx) => {
      const turma = await this.travarTurma(tx, id);
      if (!turma.ativa) return { id, ativa: false };
      const encerradas = await tx.matricula.updateMany({
        where: { turmaId: id, fim: null },
        data: { fim: paraDataDoBanco(hojeEmSaoPaulo(new Date())) },
      });
      await tx.turma.update({ where: { id }, data: { ativa: false, encerradaEm: new Date() } });
      await this.auditoria.registrar(
        {
          acao: "TURMA_ENCERRADA",
          atorId: ator.id,
          ip: ator.ip,
          alvoTipo: "Turma",
          alvoId: id,
          detalhes: { matriculasEncerradas: encerradas.count },
        },
        tx,
      );
      return { id, ativa: false };
    });
  }

  // ---------- Matrículas (AULAS-CA-14 a 16) ----------

  async matricular(ator: Ator, turmaId: string, alunoId: string) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        // A trava na linha da turma faz matrículas simultâneas esperarem a vez.
        const turma = await this.travarTurma(tx, turmaId);
        if (!turma.ativa) throw new ConflictException(MENSAGEM_TURMA_ENCERRADA);
        const aluno = await tx.aluno.findUnique({ where: { id: alunoId } });
        if (!aluno) throw new NotFoundException("Aluno não encontrado.");
        if (!aluno.ativo) throw new ConflictException("Aluno inativo não pode ser matriculado.");
        const jaMatriculado = await tx.matricula.count({ where: { turmaId, alunoId, fim: null } });
        if (jaMatriculado > 0) throw new ConflictException("O aluno já está nessa turma.");
        const ocupadas = await tx.matricula.count({ where: { turmaId, fim: null } });
        if (ocupadas >= turma.vagas) throw new ConflictException(MENSAGEM_SEM_VAGAS);
        const matricula = await tx.matricula.create({
          data: { turmaId, alunoId, inicio: paraDataDoBanco(hojeEmSaoPaulo(new Date())) },
        });
        await this.auditoria.registrar(
          {
            acao: "MATRICULA_CRIADA",
            atorId: ator.id,
            ip: ator.ip,
            alvoTipo: "Matricula",
            alvoId: matricula.id,
            detalhes: { turmaId, alunoId },
          },
          tx,
        );
        return { id: matricula.id, ocupadas: ocupadas + 1, vagas: turma.vagas };
      });
    } catch (erro) {
      // Rede de segurança do índice único parcial (matrícula aberta repetida).
      if (erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === "P2002") {
        throw new ConflictException("O aluno já está nessa turma.");
      }
      throw erro;
    }
  }

  async encerrarMatricula(ator: Ator, id: string) {
    return this.prisma.$transaction(async (tx) => {
      const matricula = await tx.matricula.findUnique({ where: { id } });
      if (!matricula) throw new NotFoundException("Matrícula não encontrada.");
      if (matricula.fim) return { id, fim: deDataDoBanco(matricula.fim) };
      const hoje = hojeEmSaoPaulo(new Date());
      await tx.matricula.update({ where: { id }, data: { fim: paraDataDoBanco(hoje) } });
      await this.auditoria.registrar(
        {
          acao: "MATRICULA_ENCERRADA",
          atorId: ator.id,
          ip: ator.ip,
          alvoTipo: "Matricula",
          alvoId: id,
          detalhes: { turmaId: matricula.turmaId, alunoId: matricula.alunoId },
        },
        tx,
      );
      return { id, fim: hoje };
    });
  }

  // ---------- Presença (AULAS-CA-17 a 19) ----------

  private validarData(turma: { inicio: Date; horarios: Horario[] }, data: string) {
    const problema = validarDataDePresenca(
      data,
      turma.horarios,
      deDataDoBanco(turma.inicio),
      hojeEmSaoPaulo(new Date()),
    );
    if (problema) throw new BadRequestException(MENSAGENS_PRESENCA[problema]);
  }

  /** Alunos da aula: matriculados na data, mais quem já tem presença registrada nela. */
  private async alunosDaAula(cliente: Tx | PrismaService, turmaId: string, data: string) {
    const dia = paraDataDoBanco(data);
    const [matriculas, presencas] = await Promise.all([
      cliente.matricula.findMany({
        where: { turmaId, inicio: { lte: dia }, OR: [{ fim: null }, { fim: { gt: dia } }] },
        include: { aluno: { select: { id: true, nome: true, nomeBusca: true } } },
      }),
      cliente.presenca.findMany({
        where: { turmaId, data: dia },
        include: {
          aluno: { select: { id: true, nome: true, nomeBusca: true } },
          registradaPor: { select: { nome: true } },
        },
      }),
    ]);
    const alunos = new Map<string, { id: string; nome: string; nomeBusca: string }>();
    for (const m of matriculas) {
      if (
        matriculaValeEm(
          { inicio: deDataDoBanco(m.inicio), fim: m.fim ? deDataDoBanco(m.fim) : null },
          data,
        )
      ) {
        alunos.set(m.aluno.id, m.aluno);
      }
    }
    for (const p of presencas) alunos.set(p.aluno.id, p.aluno);
    const porAluno = new Map(presencas.map((p) => [p.alunoId, p]));
    return [...alunos.values()]
      .sort((a, b) => a.nomeBusca.localeCompare(b.nomeBusca))
      .map((a) => {
        const p = porAluno.get(a.id);
        return {
          alunoId: a.id,
          nome: a.nome,
          presente: p ? p.presente : null,
          registradaPor: p?.registradaPor.nome ?? null,
          registradaEm: p?.registradaEm.toISOString() ?? null,
        };
      });
  }

  async listaDePresenca(ator: Ator, turmaId: string, data: string) {
    const turma = await this.turmaDoAtor(ator, turmaId);
    this.validarData(turma, data);
    return {
      turmaId,
      data,
      ativa: turma.ativa,
      alunos: await this.alunosDaAula(this.prisma, turmaId, data),
    };
  }

  async registrarPresenca(
    ator: Ator,
    turmaId: string,
    data: string,
    registros: { alunoId: string; presente: boolean }[],
  ) {
    const turma = await this.turmaDoAtor(ator, turmaId);
    if (!turma.ativa) throw new ConflictException(MENSAGEM_TURMA_ENCERRADA);
    this.validarData(turma, data);
    const dia = paraDataDoBanco(data);

    return this.prisma.$transaction(async (tx) => {
      const lista = await this.alunosDaAula(tx, turmaId, data);
      const atuais = new Map(lista.map((a) => [a.alunoId, a.presente]));
      if (registros.some((r) => !atuais.has(r.alunoId))) {
        throw new BadRequestException("Há aluno que não está matriculado nessa turma nessa data.");
      }
      const mudancas = registros.filter((r) => atuais.get(r.alunoId) !== r.presente);
      const agora = new Date();
      for (const r of mudancas) {
        await tx.presenca.upsert({
          where: { turmaId_alunoId_data: { turmaId, alunoId: r.alunoId, data: dia } },
          create: {
            turmaId,
            alunoId: r.alunoId,
            data: dia,
            presente: r.presente,
            registradaPorId: ator.id,
          },
          update: { presente: r.presente, registradaPorId: ator.id, registradaEm: agora },
        });
      }
      if (mudancas.length > 0) {
        const correcoes = mudancas.filter((r) => atuais.get(r.alunoId) !== null).length;
        await this.auditoria.registrar(
          {
            acao: "PRESENCA_REGISTRADA",
            atorId: ator.id,
            ip: ator.ip,
            alvoTipo: "Turma",
            alvoId: turmaId,
            detalhes: { data, registros: mudancas.length, correcoes },
          },
          tx,
        );
      }
      return { turmaId, data, alunos: await this.alunosDaAula(tx, turmaId, data) };
    });
  }
}
