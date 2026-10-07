import type { Forma } from "@/lib/mensalidades/formatacao";

export type TipoReserva = "RESERVA" | "BLOQUEIO";

export type Quadra = { id: string; nome: string };

export type Faixa = {
  id: string;
  diaSemana: number;
  horaInicio: number;
  horaFim: number;
  valorHoraCentavos: number;
};

export type ReservaNaGrade = {
  id: string;
  tipo: TipoReserva;
  horaInicio: number;
  horaFim: number;
  clienteNome: string | null;
  clienteTelefone: string | null;
  motivo: string | null;
  valorCentavos: number;
  serieId: string | null;
  pago: boolean;
};

export type Grade = {
  data: string;
  diaSemana: number;
  faixas: Omit<Faixa, "id" | "diaSemana">[];
  quadras: (Quadra & { reservas: ReservaNaGrade[] })[];
};

export type ReservaDetalhe = {
  id: string;
  tipo: TipoReserva;
  quadraId: string;
  quadra: string;
  data: string;
  horaInicio: number;
  horaFim: number;
  inicio: string;
  clienteNome: string | null;
  clienteTelefone: string | null;
  motivo: string | null;
  valorCentavos: number;
  criadaPor: string;
  criadaEm: string;
  canceladaEm: string | null;
  canceladaPor: string | null;
  motivoCancelamento: string | null;
  serie: { id: string; dataInicio: string; dataFim: string; encerrada: boolean } | null;
  pago: boolean;
  pagamentos: {
    id: string;
    valorCentavos: number;
    forma: Forma;
    data: string;
    recebidoPor: string;
    recebidoEm: string;
    estornadoEm: string | null;
    estornadoPor: string | null;
    motivoEstorno: string | null;
  }[];
};

export type Serie = {
  id: string;
  tipo: TipoReserva;
  quadra: string;
  diaSemana: number;
  horaInicio: number;
  horaFim: number;
  clienteNome: string | null;
  motivo: string | null;
  dataInicio: string;
  dataFim: string;
  proximas: number;
  proximasPagas: number;
};

export type ClientesAnonimizaveis = {
  antesDe: string;
  meses: number;
  reservas: number;
  series: number;
};
