import { randomUUID } from "node:crypto";
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { z } from "zod";
import { ehAdmin, type Ator } from "../aulas/comum.js";
import { deDataDoBanco, diaDaSemana, hojeEmSaoPaulo, paraDataDoBanco } from "../aulas/regras.js";
import { AuditoriaService } from "../auditoria/auditoria.service.js";
import { turnoParaLancamento } from "../caixa/sessao.js";
import { Prisma } from "../generated/prisma/client.js";
import type { FormaPagamento } from "../mensalidades/regras.js";
import { PrismaService } from "../prisma/prisma.service.js";
import type { faixasSchema, reservaSchema } from "./esquemas.js";
import {
  CLIENTE_ANONIMIZADO,
  MENSAGENS_DATA,
  MESES_DE_GUARDA_DO_CLIENTE,
  OCORRENCIAS_MAXIMAS,
  conflitosDeFaixa,
  datasDaSerie,
  descreverHorario,
  inicioDaHora,
  limiteDeRetencao,
  problemaDeCancelamento,
  problemaDeData,
  valorDaReserva,
} from "./regras.js";

type Tx = Prisma.TransactionClient;
export type DadosFaixas = z.infer<typeof faixasSchema>;
export type DadosReserva = z.infer<typeof reservaSchema>;

const ehUnico = (erro: unknown) =>
  erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === "P2002";

/** Violação de restrição de exclusão (23P01): faixa ou reserva sobreposta. */
function ehSobreposicao(erro: unknown): boolean {
  if (!(erro instanceof Prisma.PrismaClientKnownRequestError)) return false;
  const causa = (erro.meta?.driverAdapterError as { cause?: { originalCode?: string } } | undefined)
    ?.cause;
  return causa?.originalCode === "23P01" || erro.message.includes("23P01");
}

const formatarData = (data: string) => data.split("-").reverse().slice(0, 2).join("/");

type ReservaComQuadra = {
  id: string;
  tipo: "RESERVA" | "BLOQUEIO";
  data: Date;
  horaInicio: number;
  horaFim: number;
  quadraId: string;
  quadra: { nome: string };
};

@Injectable()
export class HorariosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditoria: AuditoriaService,
  ) {}

  // ---------- Quadras e faixas (HOR-CA-01) ----------

  quadras() {
    return this.prisma.quadra.findMany({
      orderBy: { ordem: "asc" },
      select: { id: true, nome: true },
    });
  }

  async renomearQuadra(ator: Ator, id: string, nome: string) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const quadra = await tx.quadra.findUnique({ where: { id } });
        if (!quadra) throw new NotFoundException("Quadra não encontrada.");
        await tx.quadra.update({ where: { id }, data: { nome } });
        await this.auditoria.registrar(
          {
            acao: "QUADRA_RENOMEADA",
            atorId: ator.id,
            ip: ator.ip,
            alvoTipo: "Quadra",
            alvoId: id,
            detalhes: { nomeAnterior: quadra.nome, nomeNovo: nome },
          },
          tx,
        );
        return { id, nome };
      });
    } catch (erro) {
      if (ehUnico(erro)) throw new ConflictException("Já existe uma quadra com esse nome.");
      throw erro;
    }
  }

  faixas() {
    return this.prisma.faixaPreco.findMany({
      orderBy: [{ diaSemana: "asc" }, { horaInicio: "asc" }],
      select: {
        id: true,
        diaSemana: true,
        horaInicio: true,
        horaFim: true,
        valorHoraCentavos: true,
      },
    });
  }

  async criarFaixas(ator: Ator, dados: DadosFaixas) {
    const novas = dados.dias.map((diaSemana) => ({
      diaSemana,
      horaInicio: dados.horaInicio,
      horaFim: dados.horaFim,
      valorHoraCentavos: dados.valorHoraCentavos,
    }));
    try {
      return await this.prisma.$transaction(async (tx) => {
        const existentes = await tx.faixaPreco.findMany({
          where: { diaSemana: { in: dados.dias } },
        });
        if (conflitosDeFaixa(novas, existentes).existentes.length > 0) {
          throw new ConflictException("Essa faixa se sobrepõe a outra do mesmo dia.");
        }
        const criadas = await tx.faixaPreco.createManyAndReturn({ data: novas });
        await this.auditoria.registrar(
          {
            acao: "FAIXAS_CRIADAS",
            atorId: ator.id,
            ip: ator.ip,
            alvoTipo: "FaixaPreco",
            detalhes: { ...dados, ids: criadas.map((f) => f.id) },
          },
          tx,
        );
        return { ids: criadas.map((f) => f.id) };
      });
    } catch (erro) {
      if (ehSobreposicao(erro)) {
        throw new ConflictException("Essa faixa se sobrepõe a outra do mesmo dia.");
      }
      throw erro;
    }
  }

  async removerFaixa(ator: Ator, id: string) {
    return this.prisma.$transaction(async (tx) => {
      const faixa = await tx.faixaPreco.findUnique({ where: { id } });
      if (!faixa) throw new NotFoundException("Faixa não encontrada.");
      await tx.faixaPreco.delete({ where: { id } });
      await this.auditoria.registrar(
        {
          acao: "FAIXA_REMOVIDA",
          atorId: ator.id,
          ip: ator.ip,
          alvoTipo: "FaixaPreco",
          alvoId: id,
          detalhes: {
            diaSemana: faixa.diaSemana,
            horaInicio: faixa.horaInicio,
            horaFim: faixa.horaFim,
            valorHoraCentavos: faixa.valorHoraCentavos,
          },
        },
        tx,
      );
      return { id };
    });
  }

  // ---------- Grade e detalhe (HOR-CA-02) ----------

  async grade(dataPedida?: string) {
    const data = dataPedida ?? hojeEmSaoPaulo(new Date());
    const [faixas, quadras] = await Promise.all([
      this.prisma.faixaPreco.findMany({
        where: { diaSemana: diaDaSemana(data) },
        orderBy: { horaInicio: "asc" },
        select: { horaInicio: true, horaFim: true, valorHoraCentavos: true },
      }),
      this.prisma.quadra.findMany({
        orderBy: { ordem: "asc" },
        select: {
          id: true,
          nome: true,
          reservas: {
            where: { data: paraDataDoBanco(data), canceladaEm: null },
            orderBy: { horaInicio: "asc" },
            select: {
              id: true,
              tipo: true,
              horaInicio: true,
              horaFim: true,
              clienteNome: true,
              clienteTelefone: true,
              motivo: true,
              valorCentavos: true,
              serieId: true,
              pagamentos: { where: { estornadoEm: null }, select: { id: true } },
            },
          },
        },
      }),
    ]);
    return {
      data,
      diaSemana: diaDaSemana(data),
      faixas,
      quadras: quadras.map((q) => ({
        id: q.id,
        nome: q.nome,
        reservas: q.reservas.map(({ pagamentos, ...r }) => ({ ...r, pago: pagamentos.length > 0 })),
      })),
    };
  }

  async reserva(id: string) {
    const r = await this.prisma.reserva.findUnique({
      where: { id },
      include: {
        quadra: { select: { nome: true } },
        criadaPor: { select: { nome: true } },
        canceladaPor: { select: { nome: true } },
        serie: { select: { id: true, dataInicio: true, dataFim: true, encerradaEm: true } },
        pagamentos: {
          orderBy: { recebidoEm: "asc" },
          include: {
            recebidoPor: { select: { nome: true } },
            estornadoPor: { select: { nome: true } },
          },
        },
      },
    });
    if (!r) throw new NotFoundException("Reserva não encontrada.");
    const data = deDataDoBanco(r.data);
    return {
      id: r.id,
      tipo: r.tipo,
      quadraId: r.quadraId,
      quadra: r.quadra.nome,
      data,
      horaInicio: r.horaInicio,
      horaFim: r.horaFim,
      inicio: inicioDaHora(data, r.horaInicio).toISOString(),
      clienteNome: r.clienteNome,
      clienteTelefone: r.clienteTelefone,
      motivo: r.motivo,
      valorCentavos: r.valorCentavos,
      criadaPor: r.criadaPor.nome,
      criadaEm: r.criadaEm.toISOString(),
      canceladaEm: r.canceladaEm?.toISOString() ?? null,
      canceladaPor: r.canceladaPor?.nome ?? null,
      motivoCancelamento: r.motivoCancelamento,
      serie: r.serie
        ? {
            id: r.serie.id,
            dataInicio: deDataDoBanco(r.serie.dataInicio),
            dataFim: deDataDoBanco(r.serie.dataFim),
            encerrada: r.serie.encerradaEm !== null,
          }
        : null,
      pago: r.pagamentos.some((p) => !p.estornadoEm),
      pagamentos: r.pagamentos.map((p) => ({
        id: p.id,
        valorCentavos: p.valorCentavos,
        forma: p.forma,
        data: deDataDoBanco(p.data),
        recebidoPor: p.recebidoPor.nome,
        recebidoEm: p.recebidoEm.toISOString(),
        estornadoEm: p.estornadoEm?.toISOString() ?? null,
        estornadoPor: p.estornadoPor?.nome ?? null,
        motivoEstorno: p.motivoEstorno,
      })),
    };
  }

  // ---------- Reserva, série e bloqueio (HOR-CA-03 a 06) ----------

  async criar(ator: Ator, dados: DadosReserva) {
    if (dados.tipo === "BLOQUEIO" && !ehAdmin(ator)) {
      throw new ForbiddenException("Só o administrador bloqueia horários.");
    }
    const horaInicio = dados.horaInicio;
    const horaFim = dados.horaInicio + dados.duracao;
    const datas =
      dados.repeticao === "AVULSA"
        ? [dados.data]
        : datasDaSerie(dados.dataInicio, dados.dataFim, diaDaSemana(dados.dataInicio));
    if (datas.length === 0) {
      throw new BadRequestException("A data final precisa ser igual ou depois da inicial.");
    }
    if (datas.length > OCORRENCIAS_MAXIMAS) {
      throw new BadRequestException(`A reserva fixa vai até ${OCORRENCIAS_MAXIMAS} semanas.`);
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
        if (!quadra) throw new NotFoundException("Quadra não encontrada.");
        const faixas = await tx.faixaPreco.findMany({ where: { diaSemana } });
        const valor = valorDaReserva(faixas, horaInicio, horaFim);
        if (valor === null) {
          throw new BadRequestException("Esse horário está fora do funcionamento da quadra.");
        }
        const ocupadas = await tx.reserva.findMany({
          where: {
            quadraId: quadra.id,
            data: { in: datas.map(paraDataDoBanco) },
            canceladaEm: null,
            horaInicio: { lt: horaFim },
            horaFim: { gt: horaInicio },
          },
          select: { data: true },
          orderBy: { data: "asc" },
        });
        if (ocupadas.length > 0) {
          const lista = [...new Set(ocupadas.map((o) => formatarData(deDataDoBanco(o.data))))];
          throw new ConflictException(`Horário ocupado em ${lista.join(", ")}.`);
        }

        const cliente =
          dados.tipo === "RESERVA"
            ? {
                clienteNome: dados.clienteNome,
                clienteTelefone: dados.clienteTelefone,
                motivo: null,
                valorCentavos: valor,
              }
            : { clienteNome: null, clienteTelefone: null, motivo: dados.motivo, valorCentavos: 0 };
        const serieId = dados.repeticao === "SEMANAL" ? randomUUID() : null;
        if (serieId) {
          await tx.serieReserva.create({
            data: {
              id: serieId,
              tipo: dados.tipo,
              quadraId: quadra.id,
              diaSemana,
              horaInicio,
              horaFim,
              clienteNome: cliente.clienteNome,
              clienteTelefone: cliente.clienteTelefone,
              motivo: cliente.motivo,
              dataInicio: paraDataDoBanco(datas[0] as string),
              dataFim: paraDataDoBanco(datas.at(-1) as string),
              criadaPorId: ator.id,
            },
          });
        }
        const reservas = await tx.reserva.createManyAndReturn({
          data: datas.map((data) => ({
            tipo: dados.tipo,
            quadraId: quadra.id,
            data: paraDataDoBanco(data),
            horaInicio,
            horaFim,
            ...cliente,
            serieId,
            criadaPorId: ator.id,
          })),
          select: { id: true },
        });
        // Sem dado pessoal do cliente na auditoria: a reserva guarda.
        await this.auditoria.registrar(
          {
            acao: serieId ? "SERIE_CRIADA" : "RESERVA_CRIADA",
            atorId: ator.id,
            ip: ator.ip,
            alvoTipo: serieId ? "SerieReserva" : "Reserva",
            alvoId: serieId ?? reservas[0]?.id,
            detalhes: {
              tipo: dados.tipo,
              quadraId: quadra.id,
              datas,
              horaInicio,
              horaFim,
              valorCentavos: cliente.valorCentavos,
            },
          },
          tx,
        );
        return {
          id: reservas[0]?.id as string,
          serieId,
          reservas: reservas.length,
          valorCentavos: cliente.valorCentavos,
        };
      });
    } catch (erro) {
      if (ehSobreposicao(erro)) {
        throw new ConflictException("Esse horário acabou de ser ocupado. Escolha outro.");
      }
      throw erro;
    }
  }

  async series() {
    const hoje = paraDataDoBanco(hojeEmSaoPaulo(new Date()));
    const series = await this.prisma.serieReserva.findMany({
      where: { encerradaEm: null, dataFim: { gte: hoje } },
      orderBy: [{ diaSemana: "asc" }, { horaInicio: "asc" }],
      include: {
        quadra: { select: { nome: true } },
        reservas: {
          where: { canceladaEm: null, data: { gte: hoje } },
          select: { id: true, pagamentos: { where: { estornadoEm: null }, select: { id: true } } },
        },
      },
    });
    return series.map((s) => ({
      id: s.id,
      tipo: s.tipo,
      quadra: s.quadra.nome,
      diaSemana: s.diaSemana,
      horaInicio: s.horaInicio,
      horaFim: s.horaFim,
      clienteNome: s.clienteNome,
      motivo: s.motivo,
      dataInicio: deDataDoBanco(s.dataInicio),
      dataFim: deDataDoBanco(s.dataFim),
      proximas: s.reservas.length,
      proximasPagas: s.reservas.filter((r) => r.pagamentos.length > 0).length,
    }));
  }

  /** HOR-CA-05: cancela as ocorrências futuras não pagas que o ator pode cancelar. */
  async encerrarSerie(ator: Ator, id: string) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "SerieReserva" WHERE id = ${id}::uuid FOR UPDATE`;
      const serie = await tx.serieReserva.findUnique({ where: { id } });
      if (!serie) throw new NotFoundException("Reserva fixa não encontrada.");
      if (serie.tipo === "BLOQUEIO" && !ehAdmin(ator)) {
        throw new ForbiddenException("Só o administrador mexe em bloqueios.");
      }
      if (serie.encerradaEm) throw new ConflictException("Esta reserva fixa já foi encerrada.");
      await tx.$queryRaw`
        SELECT id FROM "Reserva" WHERE "serieId" = ${id}::uuid AND "canceladaEm" IS NULL
        ORDER BY id FOR UPDATE`;
      const ocorrencias = await tx.reserva.findMany({
        where: { serieId: id, canceladaEm: null },
        select: {
          id: true,
          data: true,
          horaInicio: true,
          pagamentos: { where: { estornadoEm: null }, select: { id: true } },
        },
      });
      const agora = new Date();
      const canceladas = ocorrencias
        .filter((o) => o.pagamentos.length === 0)
        .filter(
          (o) =>
            problemaDeCancelamento(
              inicioDaHora(deDataDoBanco(o.data), o.horaInicio),
              agora,
              ehAdmin(ator),
            ) === null,
        )
        .map((o) => o.id);
      const futuras = ocorrencias.filter(
        (o) => inicioDaHora(deDataDoBanco(o.data), o.horaInicio) > agora,
      ).length;
      await tx.reserva.updateMany({
        where: { id: { in: canceladas } },
        data: {
          canceladaEm: agora,
          canceladaPorId: ator.id,
          motivoCancelamento: "Reserva fixa encerrada",
        },
      });
      await tx.serieReserva.update({
        where: { id },
        data: { encerradaEm: agora, encerradaPorId: ator.id },
      });
      const mantidas = futuras - canceladas.length;
      await this.auditoria.registrar(
        {
          acao: "SERIE_ENCERRADA",
          atorId: ator.id,
          ip: ator.ip,
          alvoTipo: "SerieReserva",
          alvoId: id,
          detalhes: { canceladas: canceladas.length, mantidas },
        },
        tx,
      );
      return { id, canceladas: canceladas.length, mantidas };
    });
  }

  // ---------- Pagamento, estorno e cancelamento (HOR-CA-07, 08) ----------

  private async travar(tx: Tx, id: string) {
    await tx.$queryRaw`SELECT id FROM "Reserva" WHERE id = ${id}::uuid FOR UPDATE`;
    const reserva = await tx.reserva.findUnique({
      where: { id },
      include: {
        quadra: { select: { nome: true } },
        pagamentos: { where: { estornadoEm: null } },
      },
    });
    if (!reserva) throw new NotFoundException("Reserva não encontrada.");
    return reserva;
  }

  private descricao(r: ReservaComQuadra) {
    return `${r.quadra.nome}, ${descreverHorario(deDataDoBanco(r.data), r.horaInicio, r.horaFim)}`;
  }

  async pagar(ator: Ator, id: string, forma: FormaPagamento) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const reserva = await this.travar(tx, id);
        if (reserva.canceladaEm) throw new ConflictException("Esta reserva foi cancelada.");
        if (reserva.tipo === "BLOQUEIO") {
          throw new BadRequestException("Bloqueio não tem pagamento.");
        }
        if (reserva.pagamentos.length > 0) {
          throw new ConflictException("Esta reserva já está paga.");
        }
        const pagamentoId = randomUUID();
        const hoje = hojeEmSaoPaulo(new Date());
        const sessaoId = await turnoParaLancamento(tx);
        const lancamento = await tx.lancamento.create({
          data: {
            sessaoId,
            tipo: "ENTRADA",
            valorCentavos: reserva.valorCentavos,
            forma,
            data: paraDataDoBanco(hoje),
            categoria: "ALUGUEL_QUADRA",
            descricao: `Aluguel: ${this.descricao(reserva)}`,
            origemTipo: "PagamentoReserva",
            origemId: pagamentoId,
            criadoPorId: ator.id,
          },
        });
        await tx.pagamentoReserva.create({
          data: {
            id: pagamentoId,
            reservaId: id,
            valorCentavos: reserva.valorCentavos,
            forma,
            data: paraDataDoBanco(hoje),
            recebidoPorId: ator.id,
            lancamentoId: lancamento.id,
          },
        });
        await this.auditoria.registrar(
          {
            acao: "RESERVA_PAGA",
            atorId: ator.id,
            ip: ator.ip,
            alvoTipo: "Reserva",
            alvoId: id,
            detalhes: {
              pagamentoId,
              valorCentavos: reserva.valorCentavos,
              forma,
              lancamentoId: lancamento.id,
            },
          },
          tx,
        );
        return { id: pagamentoId, lancamentoId: lancamento.id, semTurno: sessaoId === null };
      });
    } catch (erro) {
      if (ehUnico(erro)) throw new ConflictException("Esta reserva já está paga.");
      throw erro;
    }
  }

  /** Estorna o pagamento valendo, dentro da transação de quem chamou. */
  private async estornarNaTx(
    tx: Tx,
    ator: Ator,
    reserva: ReservaComQuadra,
    pagamento: { id: string; valorCentavos: number; forma: FormaPagamento; lancamentoId: string },
    motivo: string,
  ) {
    const sessaoId = await turnoParaLancamento(tx);
    const estorno = await tx.lancamento.create({
      data: {
        sessaoId,
        tipo: "SAIDA",
        valorCentavos: pagamento.valorCentavos,
        forma: pagamento.forma,
        data: paraDataDoBanco(hojeEmSaoPaulo(new Date())),
        categoria: "ESTORNO",
        descricao: `Estorno: aluguel ${this.descricao(reserva)}`,
        origemTipo: "PagamentoReserva",
        origemId: pagamento.id,
        estornoDeId: pagamento.lancamentoId,
        criadoPorId: ator.id,
      },
    });
    await tx.pagamentoReserva.update({
      where: { id: pagamento.id },
      data: {
        estornadoEm: new Date(),
        estornadoPorId: ator.id,
        motivoEstorno: motivo,
        estornoLancamentoId: estorno.id,
      },
    });
    await this.auditoria.registrar(
      {
        acao: "PAGAMENTO_RESERVA_ESTORNADO",
        atorId: ator.id,
        ip: ator.ip,
        alvoTipo: "Reserva",
        alvoId: reserva.id,
        detalhes: {
          pagamentoId: pagamento.id,
          valorCentavos: pagamento.valorCentavos,
          lancamentoId: estorno.id,
          motivo,
        },
      },
      tx,
    );
    return estorno.id;
  }

  async estornarPagamento(ator: Ator, id: string, motivo: string) {
    return this.prisma.$transaction(async (tx) => {
      const reserva = await this.travar(tx, id);
      const pagamento = reserva.pagamentos[0];
      if (!pagamento) throw new ConflictException("Esta reserva não tem pagamento a estornar.");
      const estornoLancamentoId = await this.estornarNaTx(tx, ator, reserva, pagamento, motivo);
      return { id, estornoLancamentoId };
    });
  }

  async cancelar(ator: Ator, id: string, motivo: string) {
    return this.prisma.$transaction(async (tx) => {
      const reserva = await this.travar(tx, id);
      if (reserva.canceladaEm) throw new ConflictException("Esta reserva já foi cancelada.");
      if (reserva.tipo === "BLOQUEIO" && !ehAdmin(ator)) {
        throw new ForbiddenException("Só o administrador mexe em bloqueios.");
      }
      const inicio = inicioDaHora(deDataDoBanco(reserva.data), reserva.horaInicio);
      const problema = problemaDeCancelamento(inicio, new Date(), ehAdmin(ator));
      if (problema === "JA_COMECOU") {
        throw new BadRequestException("Esse horário já começou e não pode ser cancelado.");
      }
      if (problema === "SO_ADMIN") {
        throw new ForbiddenException("Faltam menos de 24 horas: só o administrador pode cancelar.");
      }
      const pagamento = reserva.pagamentos[0];
      const estornoLancamentoId = pagamento
        ? await this.estornarNaTx(
            tx,
            ator,
            reserva,
            pagamento,
            `Cancelamento: ${motivo}`.slice(0, 200),
          )
        : null;
      await tx.reserva.update({
        where: { id },
        data: { canceladaEm: new Date(), canceladaPorId: ator.id, motivoCancelamento: motivo },
      });
      await this.auditoria.registrar(
        {
          acao: "RESERVA_CANCELADA",
          atorId: ator.id,
          ip: ator.ip,
          alvoTipo: "Reserva",
          alvoId: id,
          detalhes: { motivo, estornoLancamentoId },
        },
        tx,
      );
      return { id, estornoLancamentoId };
    });
  }

  /** Filtro das reservas e séries com cliente identificável antes do limite. */
  private comClienteAntesDe(limite: string) {
    const antes = paraDataDoBanco(limite);
    const identificavel = {
      OR: [
        { clienteNome: { not: null, notIn: [CLIENTE_ANONIMIZADO] } },
        { clienteTelefone: { not: null } },
      ],
    };
    return {
      reservas: { data: { lt: antes }, ...identificavel },
      series: { dataFim: { lt: antes }, ...identificavel },
    };
  }

  /** Prévia: quantas reservas e séries passaram do prazo de guarda (LANC-CA-07). */
  async clientesAnonimizaveis() {
    const limite = limiteDeRetencao(hojeEmSaoPaulo(new Date()));
    const filtro = this.comClienteAntesDe(limite);
    const [reservas, series] = await Promise.all([
      this.prisma.reserva.count({ where: filtro.reservas }),
      this.prisma.serieReserva.count({ where: filtro.series }),
    ]);
    return { antesDe: limite, meses: MESES_DE_GUARDA_DO_CLIENTE, reservas, series };
  }

  /**
   * Apaga nome e telefone dos clientes de reservas e séries anteriores ao prazo de
   * guarda. Valores, pagamentos e lançamentos não mudam; não há como desfazer.
   */
  async anonimizarClientes(ator: Ator) {
    const limite = limiteDeRetencao(hojeEmSaoPaulo(new Date()));
    const filtro = this.comClienteAntesDe(limite);
    return this.prisma.$transaction(async (tx) => {
      const dados = { clienteNome: CLIENTE_ANONIMIZADO, clienteTelefone: null };
      const reservas = await tx.reserva.updateMany({ where: filtro.reservas, data: dados });
      const series = await tx.serieReserva.updateMany({ where: filtro.series, data: dados });
      await this.auditoria.registrar(
        {
          acao: "CLIENTES_ANONIMIZADOS",
          atorId: ator.id,
          ip: ator.ip,
          detalhes: { antesDe: limite, reservas: reservas.count, series: series.count },
        },
        tx,
      );
      return { antesDe: limite, reservas: reservas.count, series: series.count };
    });
  }
}
