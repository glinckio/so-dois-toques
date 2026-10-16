import { randomUUID } from "node:crypto";
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { z } from "zod";
import type { Ator } from "../aulas/comum.js";
import {
  deDataDoBanco,
  descreverTurma,
  diaDaSemana,
  hojeEmSaoPaulo,
  horarioDaTurma,
  paraDataDoBanco,
} from "../aulas/regras.js";
import { AuditoriaService } from "../auditoria/auditoria.service.js";
import { Prisma } from "../generated/prisma/client.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { travarAgenda, turmasNaAgenda } from "./agenda.js";
import type { bloqueioSchema } from "./esquemas.js";
import {
  MENSAGENS_DATA,
  OCORRENCIAS_MAXIMAS,
  aulasDoDia,
  datasComAula,
  datasDaSerie,
  formatarData,
  inicioDaHora,
  problemaDeData,
  somarDias,
} from "./regras.js";

export type DadosBloqueio = z.infer<typeof bloqueioSchema>;

const ehUnico = (erro: unknown) =>
  erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === "P2002";

/** Violação de restrição de exclusão (23P01): bloqueio sobreposto. */
function ehSobreposicao(erro: unknown): boolean {
  if (!(erro instanceof Prisma.PrismaClientKnownRequestError)) return false;
  const causa = (erro.meta?.driverAdapterError as { cause?: { originalCode?: string } } | undefined)
    ?.cause;
  return causa?.originalCode === "23P01" || erro.message.includes("23P01");
}

const listaDeDatas = (datas: readonly string[]) => [...new Set(datas.map(formatarData))].join(", ");

@Injectable()
export class HorariosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditoria: AuditoriaService,
  ) {}

  // ---------- Quadras (GASTO-CA-01) ----------

  /** As quadras, as ativas primeiro, na ordem do cadastro (a primeira é a principal). */
  quadras() {
    return this.prisma.quadra.findMany({
      orderBy: [{ ativa: "desc" }, { criadaEm: "asc" }],
      select: { id: true, nome: true, ativa: true },
    });
  }

  /** A quadra pedida ou, sem pedido, a ativa mais antiga. */
  async quadra(id?: string) {
    const quadra = id
      ? await this.prisma.quadra.findUnique({
          where: { id },
          select: { id: true, nome: true, ativa: true },
        })
      : await this.prisma.quadra.findFirst({
          where: { ativa: true },
          orderBy: { criadaEm: "asc" },
          select: { id: true, nome: true, ativa: true },
        });
    if (!quadra) throw new NotFoundException("Quadra não encontrada.");
    return quadra;
  }

  async criarQuadra(ator: Ator, nome: string) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const quadra = await tx.quadra.create({
          data: { nome },
          select: { id: true, nome: true, ativa: true },
        });
        await this.auditoria.registrar(
          {
            acao: "QUADRA_CRIADA",
            atorId: ator.id,
            ip: ator.ip,
            alvoTipo: "Quadra",
            alvoId: quadra.id,
            detalhes: { nome },
          },
          tx,
        );
        return quadra;
      });
    } catch (erro) {
      if (ehUnico(erro)) throw new ConflictException("Já existe uma quadra com esse nome.");
      throw erro;
    }
  }

  async alterarQuadra(ator: Ator, id: string, dados: { nome: string; ativa: boolean }) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const atual = await tx.quadra.findUnique({ where: { id } });
        if (!atual) throw new NotFoundException("Quadra não encontrada.");
        await tx.quadra.update({ where: { id }, data: dados });
        await this.auditoria.registrar(
          {
            acao: "QUADRA_ALTERADA",
            atorId: ator.id,
            ip: ator.ip,
            alvoTipo: "Quadra",
            alvoId: id,
            detalhes: { de: { nome: atual.nome, ativa: atual.ativa }, para: dados },
          },
          tx,
        );
        return { id, ...dados };
      });
    } catch (erro) {
      if (ehUnico(erro)) throw new ConflictException("Já existe uma quadra com esse nome.");
      throw erro;
    }
  }

  // ---------- Grade (FOCO-CA-05) ----------

  async grade(dataPedida?: string, quadraId?: string) {
    const data = dataPedida ?? hojeEmSaoPaulo(new Date());
    const dia = paraDataDoBanco(data);
    const quadra = await this.quadra(quadraId);
    const [turmas, bloqueios] = await Promise.all([
      this.prisma.turma.findMany({
        where: {
          quadraId: quadra.id,
          inicio: { lte: dia },
          diaSemana: diaDaSemana(data),
          // Encerrada no dia D: dá aula até o dia anterior.
          OR: [
            { encerradaEm: null },
            { encerradaEm: { gte: inicioDaHora(somarDias(data, 1), 0) } },
          ],
        },
        select: {
          id: true,
          nivel: true,
          categoria: true,
          vagas: true,
          diaSemana: true,
          horaInicio: true,
          horaFim: true,
          inicio: true,
          encerradaEm: true,
          _count: {
            select: {
              matriculas: {
                where: { inicio: { lte: dia }, OR: [{ fim: null }, { fim: { gt: dia } }] },
              },
            },
          },
        },
      }),
      this.prisma.bloqueio.findMany({
        where: { quadraId: quadra.id, data: dia, canceladoEm: null },
        orderBy: { horaInicio: "asc" },
        select: { id: true, horaInicio: true, horaFim: true, motivo: true, serieId: true },
      }),
    ]);
    const porId = new Map(turmas.map((t) => [t.id, t]));
    const aulas = aulasDoDia(
      turmas.map((t) => ({
        id: t.id,
        nome: descreverTurma(t),
        desde: deDataDoBanco(t.inicio),
        ate: t.encerradaEm ? hojeEmSaoPaulo(t.encerradaEm) : null,
        horarios: [horarioDaTurma(t)],
      })),
      data,
    ).map((a) => {
      const t = porId.get(a.turmaId)!;
      return {
        ...a,
        nivel: t.nivel,
        categoria: t.categoria,
        vagas: t.vagas,
        ocupadas: t._count.matriculas,
      };
    });
    return { data, diaSemana: diaDaSemana(data), quadra, aulas, bloqueios };
  }

  async bloqueio(id: string) {
    const b = await this.prisma.bloqueio.findUnique({
      where: { id },
      include: {
        quadra: { select: { id: true, nome: true } },
        criadoPor: { select: { nome: true } },
        canceladoPor: { select: { nome: true } },
        serie: { select: { id: true, dataInicio: true, dataFim: true, encerradaEm: true } },
      },
    });
    if (!b) throw new NotFoundException("Bloqueio não encontrado.");
    const data = deDataDoBanco(b.data);
    return {
      id: b.id,
      quadra: b.quadra,
      data,
      horaInicio: b.horaInicio,
      horaFim: b.horaFim,
      inicio: inicioDaHora(data, b.horaInicio).toISOString(),
      motivo: b.motivo,
      criadoPor: b.criadoPor.nome,
      criadoEm: b.criadoEm.toISOString(),
      canceladoEm: b.canceladoEm?.toISOString() ?? null,
      canceladoPor: b.canceladoPor?.nome ?? null,
      motivoCancelamento: b.motivoCancelamento,
      serie: b.serie
        ? {
            id: b.serie.id,
            dataInicio: deDataDoBanco(b.serie.dataInicio),
            dataFim: deDataDoBanco(b.serie.dataFim),
            encerrada: b.serie.encerradaEm !== null,
          }
        : null,
    };
  }

  // ---------- Bloqueios (FOCO-CA-06 e 07) ----------

  async bloquear(ator: Ator, dados: DadosBloqueio) {
    const { horaInicio, horaFim, motivo } = dados;
    const datas =
      dados.repeticao === "AVULSO"
        ? [dados.data]
        : datasDaSerie(dados.dataInicio, dados.dataFim, diaDaSemana(dados.dataInicio));
    if (datas.length === 0) {
      throw new BadRequestException("A data final precisa ser igual ou depois da inicial.");
    }
    if (datas.length > OCORRENCIAS_MAXIMAS) {
      throw new BadRequestException(`O bloqueio semanal vai até ${OCORRENCIAS_MAXIMAS} semanas.`);
    }
    const agora = new Date();
    const hoje = hojeEmSaoPaulo(agora);
    for (const data of [datas[0], datas.at(-1)] as string[]) {
      const problema = problemaDeData(data, horaInicio, hoje, agora);
      if (problema) throw new BadRequestException(MENSAGENS_DATA[problema]);
    }
    const diaSemana = diaDaSemana(datas[0] as string);

    try {
      return await this.prisma.$transaction(async (tx) => {
        const quadra = await tx.quadra.findUnique({ where: { id: dados.quadraId } });
        if (!quadra || !quadra.ativa) throw new BadRequestException("Escolha uma quadra ativa.");
        await travarAgenda(tx, quadra.id);
        const comAula = datasComAula(
          datas,
          horaInicio,
          horaFim,
          await turmasNaAgenda(tx, { quadraId: quadra.id, ativas: true }),
        );
        if (comAula.length > 0) {
          throw new ConflictException(`Tem aula nesse horário em ${listaDeDatas(comAula)}.`);
        }
        const ocupadas = await tx.bloqueio.findMany({
          where: {
            quadraId: quadra.id,
            data: { in: datas.map(paraDataDoBanco) },
            canceladoEm: null,
            horaInicio: { lt: horaFim },
            horaFim: { gt: horaInicio },
          },
          select: { data: true },
          orderBy: { data: "asc" },
        });
        if (ocupadas.length > 0) {
          const lista = listaDeDatas(ocupadas.map((o) => deDataDoBanco(o.data)));
          throw new ConflictException(`Esse horário já está bloqueado em ${lista}.`);
        }

        const serieId = dados.repeticao === "SEMANAL" ? randomUUID() : null;
        if (serieId) {
          await tx.serieBloqueio.create({
            data: {
              id: serieId,
              quadraId: quadra.id,
              diaSemana,
              horaInicio,
              horaFim,
              motivo,
              dataInicio: paraDataDoBanco(datas[0] as string),
              dataFim: paraDataDoBanco(datas.at(-1) as string),
              criadaPorId: ator.id,
            },
          });
        }
        const criados = await tx.bloqueio.createManyAndReturn({
          data: datas.map((data) => ({
            quadraId: quadra.id,
            data: paraDataDoBanco(data),
            horaInicio,
            horaFim,
            motivo,
            serieId,
            criadoPorId: ator.id,
          })),
          select: { id: true },
        });
        await this.auditoria.registrar(
          {
            acao: serieId ? "SERIE_CRIADA" : "BLOQUEIO_CRIADO",
            atorId: ator.id,
            ip: ator.ip,
            alvoTipo: serieId ? "SerieBloqueio" : "Bloqueio",
            alvoId: serieId ?? criados[0]?.id,
            detalhes: { quadraId: quadra.id, datas, horaInicio, horaFim, motivo },
          },
          tx,
        );
        return { id: criados[0]?.id as string, serieId, bloqueios: criados.length };
      });
    } catch (erro) {
      if (ehSobreposicao(erro)) {
        throw new ConflictException("Esse horário acabou de ser bloqueado. Escolha outro.");
      }
      throw erro;
    }
  }

  async cancelar(ator: Ator, id: string, motivo: string) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Bloqueio" WHERE id = ${id}::uuid FOR UPDATE`;
      const bloqueio = await tx.bloqueio.findUnique({ where: { id } });
      if (!bloqueio) throw new NotFoundException("Bloqueio não encontrado.");
      if (bloqueio.canceladoEm) throw new ConflictException("Este bloqueio já foi cancelado.");
      if (inicioDaHora(deDataDoBanco(bloqueio.data), bloqueio.horaInicio) <= new Date()) {
        throw new BadRequestException("Esse horário já começou e não pode ser cancelado.");
      }
      await tx.bloqueio.update({
        where: { id },
        data: { canceladoEm: new Date(), canceladoPorId: ator.id, motivoCancelamento: motivo },
      });
      await this.auditoria.registrar(
        {
          acao: "BLOQUEIO_CANCELADO",
          atorId: ator.id,
          ip: ator.ip,
          alvoTipo: "Bloqueio",
          alvoId: id,
          detalhes: { motivo },
        },
        tx,
      );
      return { id };
    });
  }

  async series() {
    const hoje = paraDataDoBanco(hojeEmSaoPaulo(new Date()));
    const series = await this.prisma.serieBloqueio.findMany({
      where: { encerradaEm: null, dataFim: { gte: hoje } },
      orderBy: [{ diaSemana: "asc" }, { horaInicio: "asc" }],
      include: {
        quadra: { select: { id: true, nome: true } },
        bloqueios: { where: { canceladoEm: null, data: { gte: hoje } }, select: { id: true } },
      },
    });
    return series.map((s) => ({
      id: s.id,
      quadra: s.quadra,
      diaSemana: s.diaSemana,
      horaInicio: s.horaInicio,
      horaFim: s.horaFim,
      motivo: s.motivo,
      dataInicio: deDataDoBanco(s.dataInicio),
      dataFim: deDataDoBanco(s.dataFim),
      proximos: s.bloqueios.length,
    }));
  }

  /** Encerra o bloqueio semanal: cancela os bloqueios que ainda não começaram. */
  async encerrarSerie(ator: Ator, id: string) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "SerieBloqueio" WHERE id = ${id}::uuid FOR UPDATE`;
      const serie = await tx.serieBloqueio.findUnique({ where: { id } });
      if (!serie) throw new NotFoundException("Bloqueio semanal não encontrado.");
      if (serie.encerradaEm) throw new ConflictException("Este bloqueio semanal já foi encerrado.");
      await tx.$queryRaw`
        SELECT id FROM "Bloqueio" WHERE "serieId" = ${id}::uuid AND "canceladoEm" IS NULL
        ORDER BY id FOR UPDATE`;
      const ocorrencias = await tx.bloqueio.findMany({
        where: { serieId: id, canceladoEm: null },
        select: { id: true, data: true, horaInicio: true },
      });
      const agora = new Date();
      const cancelados = ocorrencias
        .filter((o) => inicioDaHora(deDataDoBanco(o.data), o.horaInicio) > agora)
        .map((o) => o.id);
      await tx.bloqueio.updateMany({
        where: { id: { in: cancelados } },
        data: {
          canceladoEm: agora,
          canceladoPorId: ator.id,
          motivoCancelamento: "Bloqueio semanal encerrado",
        },
      });
      await tx.serieBloqueio.update({
        where: { id },
        data: { encerradaEm: agora, encerradaPorId: ator.id },
      });
      await this.auditoria.registrar(
        {
          acao: "SERIE_ENCERRADA",
          atorId: ator.id,
          ip: ator.ip,
          alvoTipo: "SerieBloqueio",
          alvoId: id,
          detalhes: { cancelados: cancelados.length },
        },
        tx,
      );
      return { id, cancelados: cancelados.length };
    });
  }
}
