import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { createHmac } from "node:crypto";
import type { z } from "zod";
import type { Ator } from "../aulas/comum.js";
import { descreverTurma, hojeEmSaoPaulo } from "../aulas/regras.js";
import { AuditoriaService } from "../auditoria/auditoria.service.js";
import { ENV } from "../config.module.js";
import {
  MENSAGENS_PERIODO,
  mesesAte,
  problemaDePeriodo,
  type Periodo,
} from "../contabil/regras.js";
import type { Env } from "../env.js";
import type { Prisma } from "../generated/prisma/client.js";
import { somarDias } from "../horarios/regras.js";
import { PrismaService } from "../prisma/prisma.service.js";
import type { consultaPainelSchema, respostaSchema } from "./esquemas.js";
import {
  JANELA_ENVIOS_MS,
  limiteAtingido,
  mediasMensais,
  resumoDasNotas,
  textoOpcional,
} from "./regras.js";

/** Dias do período padrão do painel (FEED-CA-05). */
const DIAS_PADRAO = 30;
const FUSO = "-03:00";

const MENSAGEM_PAUSADO = "No momento não estamos recebendo respostas.";
const MENSAGEM_LIMITE = "Muitas respostas em pouco tempo. Tente de novo mais tarde.";

const turmaSelecionada = {
  id: true,
  diaSemana: true,
  horaInicio: true,
  horaFim: true,
  nivel: true,
  categoria: true,
} as const;

/** Início e fim (inclusive) do período, em datas de São Paulo. */
function instantes({ de, ate }: Periodo) {
  return {
    gte: new Date(`${de}T00:00:00.000${FUSO}`),
    lte: new Date(`${ate}T23:59:59.999${FUSO}`),
  };
}

/** Etapa 19: formulário público de feedback e painel do administrador. */
@Injectable()
export class FeedbackService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditoria: AuditoriaService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  private async pausado(): Promise<boolean> {
    const formulario = await this.prisma.formularioFeedback.findUnique({ where: { id: 1 } });
    return formulario?.pausado ?? false;
  }

  /** O IP nunca é guardado: só um hash com a chave interna, para contar os envios. */
  private hashDoIp(ip: string | undefined): string {
    return createHmac("sha256", this.env.INTERNAL_API_KEY)
      .update(ip ?? "desconhecido")
      .digest("hex");
  }

  // ---------- Formulário público (FEED-CA-01 a 04) ----------

  /** FEED-CA-02: só o que a página pública precisa; nada de respostas nem de alunos. */
  async formulario() {
    const [pausado, turmas] = await Promise.all([
      this.pausado(),
      this.prisma.turma.findMany({
        where: { ativa: true },
        orderBy: [{ diaSemana: "asc" }, { horaInicio: "asc" }],
        select: turmaSelecionada,
      }),
    ]);
    return { pausado, turmas: turmas.map((t) => ({ id: t.id, descricao: descreverTurma(t) })) };
  }

  async responder(dados: z.infer<typeof respostaSchema>, ip: string | undefined) {
    if (await this.pausado()) throw new ConflictException(MENSAGEM_PAUSADO);
    const ipHash = this.hashDoIp(ip);
    const agora = new Date();
    const inicioJanela = new Date(agora.getTime() - JANELA_ENVIOS_MS);
    // FEED-CA-03: robô que preenche a armadilha recebe "ok" e nada é gravado.
    const robo = textoOpcional(dados.site) !== null;

    await this.prisma.$transaction(async (tx) => {
      // Um envio por vez do mesmo IP: a contagem e o registro não se cruzam.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${ipHash}))`;
      await tx.envioFeedback.deleteMany({ where: { criadoEm: { lt: inicioJanela } } });
      const envios = await tx.envioFeedback.count({
        where: { ipHash, criadoEm: { gte: inicioJanela } },
      });
      if (limiteAtingido(envios)) {
        throw new HttpException(MENSAGEM_LIMITE, HttpStatus.TOO_MANY_REQUESTS);
      }
      await tx.envioFeedback.create({ data: { ipHash } });
      if (robo) return;
      if (dados.turmaId) {
        const turma = await tx.turma.findUnique({ where: { id: dados.turmaId } });
        if (!turma || !turma.ativa) throw new BadRequestException("Escolha uma turma da lista.");
      }
      await tx.respostaFeedback.create({
        data: {
          nota: dados.nota,
          comentario: textoOpcional(dados.comentario),
          melhoria: textoOpcional(dados.melhoria),
          turmaId: dados.turmaId ?? null,
          nome: textoOpcional(dados.nome),
        },
      });
    });
    return { recebida: true };
  }

  // ---------- Painel (FEED-CA-05 a 08) ----------

  private periodo(consulta: z.infer<typeof consultaPainelSchema>): Periodo {
    if ((consulta.de === undefined) !== (consulta.ate === undefined)) {
      throw new BadRequestException("Informe o início e o fim do período.");
    }
    const hoje = hojeEmSaoPaulo(new Date());
    const periodo =
      consulta.de && consulta.ate
        ? { de: consulta.de, ate: consulta.ate }
        : { de: somarDias(hoje, -(DIAS_PADRAO - 1)), ate: hoje };
    const problema = problemaDePeriodo(periodo);
    if (problema) throw new BadRequestException(MENSAGENS_PERIODO[problema]);
    return periodo;
  }

  async painel(consulta: z.infer<typeof consultaPainelSchema>) {
    const periodo = this.periodo(consulta);
    const filtro: Prisma.RespostaFeedbackWhereInput = {
      turmaId: consulta.turmaId,
      nota: consulta.nota,
    };
    const meses = mesesAte(periodo.ate);
    const inicioDosMeses = { de: `${meses[0]}-01`, ate: periodo.ate };

    const [respostas, doAno, pausado, naoLidas, turmas] = await Promise.all([
      this.prisma.respostaFeedback.findMany({
        where: { ...filtro, criadaEm: instantes(periodo) },
        orderBy: { criadaEm: "desc" },
        include: { turma: { select: turmaSelecionada } },
      }),
      this.prisma.respostaFeedback.findMany({
        where: { ...filtro, criadaEm: instantes(inicioDosMeses) },
        select: { nota: true, criadaEm: true },
      }),
      this.pausado(),
      this.naoLidas(),
      this.prisma.turma.findMany({
        where: { OR: [{ ativa: true }, { feedbacks: { some: {} } }] },
        orderBy: [{ ativa: "desc" }, { diaSemana: "asc" }, { horaInicio: "asc" }],
        select: { ...turmaSelecionada, ativa: true },
      }),
    ]);

    return {
      periodo,
      pausado,
      naoLidas: naoLidas.quantidade,
      resumo: resumoDasNotas(respostas.map((r) => r.nota)),
      mensal: mediasMensais(doAno, meses),
      turmas: turmas.map((t) => ({ id: t.id, descricao: descreverTurma(t), ativa: t.ativa })),
      respostas: respostas.map((r) => ({
        id: r.id,
        nota: r.nota,
        comentario: r.comentario,
        melhoria: r.melhoria,
        turma: r.turma ? descreverTurma(r.turma) : null,
        nome: r.nome,
        lida: r.lidaEm !== null,
        criadaEm: r.criadaEm.toISOString(),
      })),
    };
  }

  /** FEED-CA-06 */
  async naoLidas() {
    return { quantidade: await this.prisma.respostaFeedback.count({ where: { lidaEm: null } }) };
  }

  async marcarLida(id: string) {
    const { count } = await this.prisma.respostaFeedback.updateMany({
      where: { id, lidaEm: null },
      data: { lidaEm: new Date() },
    });
    if (count === 0 && !(await this.prisma.respostaFeedback.findUnique({ where: { id } }))) {
      throw new NotFoundException("Resposta não encontrada.");
    }
    return { lida: true };
  }

  async marcarTodasLidas() {
    const { count } = await this.prisma.respostaFeedback.updateMany({
      where: { lidaEm: null },
      data: { lidaEm: new Date() },
    });
    return { marcadas: count };
  }

  /** FEED-CA-07: a auditoria guarda a nota e a data, não o texto nem o nome. */
  async remover(ator: Ator, id: string) {
    await this.prisma.$transaction(async (tx) => {
      const resposta = await tx.respostaFeedback.findUnique({ where: { id } });
      if (!resposta) throw new NotFoundException("Resposta não encontrada.");
      await tx.respostaFeedback.delete({ where: { id } });
      await this.auditoria.registrar(
        {
          acao: "FEEDBACK_REMOVIDO",
          atorId: ator.id,
          ip: ator.ip,
          alvoTipo: "RespostaFeedback",
          alvoId: id,
          detalhes: { nota: resposta.nota, recebidaEm: resposta.criadaEm.toISOString() },
        },
        tx,
      );
    });
    return { removida: true };
  }

  /** FEED-CA-04 e 07 */
  async definirPausa(ator: Ator, pausado: boolean) {
    await this.prisma.$transaction(async (tx) => {
      await tx.formularioFeedback.upsert({
        where: { id: 1 },
        create: { id: 1, pausado },
        update: { pausado },
      });
      await this.auditoria.registrar(
        {
          acao: pausado ? "FEEDBACK_PAUSADO" : "FEEDBACK_RETOMADO",
          atorId: ator.id,
          ip: ator.ip,
          alvoTipo: "FormularioFeedback",
        },
        tx,
      );
    });
    return { pausado };
  }
}
