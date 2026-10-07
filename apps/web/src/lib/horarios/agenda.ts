import { horaPassou, horasDeFuncionamento } from "./formatacao";
import type { Grade, ReservaNaGrade } from "./tipos";

/** Situação que dá a cor do bloco na grade (sempre acompanhada de texto). */
export type SituacaoDoHorario = "pago" | "a-pagar" | "fixa" | "bloqueio";

export const ROTULOS_DA_SITUACAO: Record<SituacaoDoHorario | "livre", string> = {
  pago: "Pago",
  "a-pagar": "A pagar",
  fixa: "Fixa",
  bloqueio: "Bloqueio",
  livre: "Livre",
};

/** Bloqueio vem primeiro; reserva fixa tem cor própria; a avulsa, pela situação do pagamento. */
export function situacaoDaReserva(
  r: Pick<ReservaNaGrade, "tipo" | "serieId" | "pago">,
): SituacaoDoHorario {
  if (r.tipo === "BLOQUEIO") return "bloqueio";
  if (r.serieId) return "fixa";
  return r.pago ? "pago" : "a-pagar";
}

export type MomentoDoBloco = "passou" | "agora" | "depois";

export type BlocoDaAgenda = {
  tipo: "bloco";
  reserva: ReservaNaGrade;
  situacao: SituacaoDoHorario;
  /** Linha da grade em que o bloco começa (1 = primeira hora de funcionamento). */
  linha: number;
  /** Quantas linhas (horas) o bloco ocupa. */
  linhas: number;
  /** Horas mostradas pelo bloco (a parte da reserva dentro do funcionamento). */
  horaInicio: number;
  horaFim: number;
  momento: MomentoDoBloco;
};

export type LivreDaAgenda = { tipo: "livre"; hora: number; linha: number; passou: boolean };

export type ColunaDaAgenda = {
  id: string;
  nome: string;
  /** Coluna da grade (a 1 é a das horas). */
  coluna: number;
  itens: (BlocoDaAgenda | LivreDaAgenda)[];
  /** Horários livres que ainda aceitam reserva. */
  livres: number;
};

export type HoraDaAgenda = { hora: number; linha: number; passou: boolean; agora: boolean };

export type Agenda = {
  horas: HoraDaAgenda[];
  colunas: ColunaDaAgenda[];
  /** Onde fica a linha da hora atual: a linha da hora e o quarto de hora (0 a 3). */
  agora: { linha: number; quarto: 0 | 1 | 2 | 3 } | null;
  /** Horas de cada situação, somando as quadras (legenda). */
  horasPorSituacao: Record<SituacaoDoHorario | "livre", number>;
  /** Horas de clientes (sem bloqueio) e horas em funcionamento, somando as quadras (anel). */
  reservadas: number;
  abertas: number;
  livresParaReservar: number;
};

/** O bloco não cresce além disso (limite das classes `row-span-*` liberadas na CSP). */
export const LINHAS_POR_BLOCO = 8;

function momentoDoBloco(
  data: string,
  hoje: string,
  minutoAtual: number,
  horaInicio: number,
  horaFim: number,
): MomentoDoBloco {
  if (data !== hoje) return data < hoje ? "passou" : "depois";
  if (minutoAtual >= horaFim * 60) return "passou";
  if (minutoAtual >= horaInicio * 60) return "agora";
  return "depois";
}

/**
 * VIVO-CA-06: monta a grade do dia como agenda de blocos. Cada hora de funcionamento
 * é uma linha; cada quadra, uma coluna. Uma reserva de várias horas vira um único
 * bloco que começa na linha da primeira hora e ocupa uma linha por hora. Horas fora
 * do funcionamento no meio da reserva (faixa mudada depois) dividem o bloco.
 */
export function agendaDoDia(grade: Grade, hoje: string, minutoAtual: number): Agenda {
  const lista = horasDeFuncionamento(grade.faixas);
  const horaAtual = Math.floor(minutoAtual / 60);
  const horas = lista.map((hora, i) => ({
    hora,
    linha: i + 1,
    passou: horaPassou(grade.data, hora, hoje, horaAtual),
    agora: grade.data === hoje && hora === horaAtual,
  }));
  const horasPorSituacao = { pago: 0, "a-pagar": 0, fixa: 0, bloqueio: 0, livre: 0 };
  const colunas = grade.quadras.map((quadra, q): ColunaDaAgenda => {
    const itens: (BlocoDaAgenda | LivreDaAgenda)[] = [];
    let aberto: BlocoDaAgenda | null = null;
    for (const h of horas) {
      const reserva = quadra.reservas.find((r) => r.horaInicio <= h.hora && h.hora < r.horaFim);
      if (!reserva) {
        aberto = null;
        itens.push({ tipo: "livre", hora: h.hora, linha: h.linha, passou: h.passou });
        horasPorSituacao.livre += 1;
        continue;
      }
      const situacao = situacaoDaReserva(reserva);
      horasPorSituacao[situacao] += 1;
      const continua =
        aberto !== null &&
        aberto.reserva.id === reserva.id &&
        aberto.horaFim === h.hora &&
        aberto.linhas < LINHAS_POR_BLOCO;
      if (aberto && continua) {
        aberto.linhas += 1;
        aberto.horaFim = h.hora + 1;
        continue;
      }
      aberto = {
        tipo: "bloco",
        reserva,
        situacao,
        linha: h.linha,
        linhas: 1,
        horaInicio: h.hora,
        horaFim: h.hora + 1,
        momento: "depois",
      };
      itens.push(aberto);
    }
    for (const item of itens) {
      if (item.tipo === "bloco") {
        item.momento = momentoDoBloco(grade.data, hoje, minutoAtual, item.horaInicio, item.horaFim);
      }
    }
    return {
      id: quadra.id,
      nome: quadra.nome,
      coluna: q + 2,
      itens,
      livres: itens.filter((i) => i.tipo === "livre" && !i.passou).length,
    };
  });
  const linhaAgora = horas.find((h) => h.agora)?.linha;
  return {
    horas,
    colunas,
    agora:
      linhaAgora === undefined
        ? null
        : { linha: linhaAgora, quarto: Math.floor((minutoAtual % 60) / 15) as 0 | 1 | 2 | 3 },
    horasPorSituacao,
    reservadas: horasPorSituacao.pago + horasPorSituacao["a-pagar"] + horasPorSituacao.fixa,
    abertas: horas.length * grade.quadras.length,
    livresParaReservar: colunas.reduce((t, c) => t + c.livres, 0),
  };
}
