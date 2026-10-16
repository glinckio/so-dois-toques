import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { AuditoriaService } from "../auditoria/auditoria.service.js";
import { Prisma } from "../generated/prisma/client.js";
import { travarAgenda } from "../horarios/agenda.js";
import { datasDeBloqueioSobreHorarios, formatarData } from "../horarios/regras.js";
import { PrismaService } from "../prisma/prisma.service.js";
import type { Ator } from "./comum.js";
import {
  conflitosDeHorario,
  deDataDoBanco,
  descreverTurma,
  hojeEmSaoPaulo,
  horarioDaTurma,
  matriculaValeEm,
  MENSAGENS_PRESENCA,
  paraDataDoBanco,
  validarDataDePresenca,
  type CategoriaTurma,
  type Nivel,
} from "./regras.js";

type Tx = Prisma.TransactionClient;

/** TURMA-CA-01 e GASTO-CA-02: a turma é uma quadra, um dia, um horário (minutos), um nível e as vagas. */
export type DadosTurma = {
  quadraId: string;
  diaSemana: number;
  horaInicio: number;
  horaFim: number;
  nivel: Nivel;
  categoria: CategoriaTurma;
  vagas: number;
};

const COM_QUADRA = { quadra: { select: { id: true, nome: true } } } as const;
type TurmaDoBanco = Prisma.TurmaGetPayload<{ include: typeof COM_QUADRA }>;

export const MENSAGEM_SEM_VAGAS = "Turma sem vagas";
const MENSAGEM_TURMA_ENCERRADA = "Esta turma está encerrada.";

@Injectable()
export class TurmasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditoria: AuditoriaService,
  ) {}

  // ---------- Turmas ----------

  private async ocupadas(cliente: Tx | PrismaService, turmaIds: string[]) {
    const contagem = await cliente.matricula.groupBy({
      by: ["turmaId"],
      where: { turmaId: { in: turmaIds }, fim: null },
      _count: { _all: true },
    });
    return new Map(contagem.map((c) => [c.turmaId, c._count._all]));
  }

  /** TURMA-CA-03: na ordem da semana e da hora. */
  async listar(situacao: "ativas" | "encerradas" | "todas") {
    const turmas = await this.prisma.turma.findMany({
      where: situacao === "todas" ? {} : { ativa: situacao === "ativas" },
      include: COM_QUADRA,
      orderBy: [{ ativa: "desc" }, { diaSemana: "asc" }, { horaInicio: "asc" }],
    });
    const ocupadas = await this.ocupadas(
      this.prisma,
      turmas.map((t) => t.id),
    );
    return turmas.map((t) => this.resumo(t, ocupadas.get(t.id) ?? 0));
  }

  private resumo(t: TurmaDoBanco, ocupadas: number) {
    return {
      id: t.id,
      quadraId: t.quadraId,
      quadra: t.quadra,
      diaSemana: t.diaSemana,
      horaInicio: t.horaInicio,
      horaFim: t.horaFim,
      nivel: t.nivel,
      categoria: t.categoria,
      descricao: descreverTurma(t),
      vagas: t.vagas,
      ocupadas,
      livres: Math.max(0, t.vagas - ocupadas),
      ativa: t.ativa,
      inicio: deDataDoBanco(t.inicio),
    };
  }

  private async turmaPorId(id: string) {
    const turma = await this.prisma.turma.findUnique({ where: { id }, include: COM_QUADRA });
    if (!turma) throw new NotFoundException("Turma não encontrada.");
    return turma;
  }

  async buscar(id: string) {
    const turma = await this.turmaPorId(id);
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

  /**
   * TURMA-CA-02, FOCO-CA-04 e 06, GASTO-CA-02: o horário não divide a quadra com outra
   * turma ativa nem cai sobre bloqueio dela a partir de hoje. Quadra desativada não
   * recebe turma (GASTO-CA-01); a turma que já está nela pode continuar.
   */
  private async validarTurma(
    tx: Tx,
    dados: DadosTurma,
    atual: { id: string; quadraId: string } | null,
  ) {
    const quadra = await tx.quadra.findUnique({ where: { id: dados.quadraId } });
    if (!quadra || (!quadra.ativa && quadra.id !== atual?.quadraId)) {
      throw new BadRequestException("Escolha uma quadra ativa.");
    }
    const horario = horarioDaTurma(dados);
    await travarAgenda(tx, quadra.id);
    const turmaId = atual?.id;
    const existentes = await tx.turma.findMany({
      where: {
        quadraId: quadra.id,
        ativa: true,
        diaSemana: dados.diaSemana,
        ...(turmaId ? { id: { not: turmaId } } : {}),
      },
    });
    const conflito = conflitosDeHorario(
      [horario],
      existentes.map((t) => ({ ...horarioDaTurma(t), turma: t })),
    )[0];
    if (conflito) {
      throw new ConflictException(`A quadra já tem a turma de ${descreverTurma(conflito.turma)}.`);
    }
    const bloqueios = await tx.bloqueio.findMany({
      where: {
        quadraId: quadra.id,
        canceladoEm: null,
        data: { gte: paraDataDoBanco(hojeEmSaoPaulo(new Date())) },
      },
      select: { data: true, horaInicio: true, horaFim: true },
    });
    const datas = datasDeBloqueioSobreHorarios(
      [horario],
      bloqueios.map((b) => ({ ...b, data: deDataDoBanco(b.data) })),
    );
    if (datas.length > 0) {
      throw new ConflictException(
        `A quadra está bloqueada nesse horário em ${datas.map(formatarData).join(", ")}.`,
      );
    }
  }

  async criar(ator: Ator, dados: DadosTurma) {
    return this.prisma.$transaction(async (tx) => {
      await this.validarTurma(tx, dados, null);
      const turma = await tx.turma.create({
        data: { ...dados, inicio: paraDataDoBanco(hojeEmSaoPaulo(new Date())) },
      });
      await this.auditoria.registrar(
        {
          acao: "TURMA_CRIADA",
          atorId: ator.id,
          ip: ator.ip,
          alvoTipo: "Turma",
          alvoId: turma.id,
          detalhes: { ...dados },
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
      await this.validarTurma(tx, dados, atual);
      const ocupadas = (await this.ocupadas(tx, [id])).get(id) ?? 0;
      if (dados.vagas < ocupadas) {
        throw new ConflictException(
          `A turma tem ${ocupadas} alunos matriculados; as vagas não podem ficar abaixo disso.`,
        );
      }
      await tx.turma.update({ where: { id }, data: dados });
      await this.auditoria.registrar(
        {
          acao: "TURMA_ALTERADA",
          atorId: ator.id,
          ip: ator.ip,
          alvoTipo: "Turma",
          alvoId: id,
          detalhes: {
            de: {
              quadraId: atual.quadraId,
              diaSemana: atual.diaSemana,
              horaInicio: atual.horaInicio,
              horaFim: atual.horaFim,
              nivel: atual.nivel,
              categoria: atual.categoria,
              vagas: atual.vagas,
            },
            para: { ...dados },
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

  private validarData(turma: TurmaDoBanco, data: string) {
    const problema = validarDataDePresenca(
      data,
      [horarioDaTurma(turma)],
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

  async listaDePresenca(turmaId: string, data: string) {
    const turma = await this.turmaPorId(turmaId);
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
    const turma = await this.turmaPorId(turmaId);
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
