import type { Forma } from "@/lib/mensalidades/formatacao";

type LinhaResumo = { entradas: number; saidas: number; saldo: number };

export type LancamentoDoTurno = {
  id: string;
  tipo: "ENTRADA" | "SAIDA";
  valorCentavos: number;
  forma: Forma;
  data: string;
  categoria: string;
  descricao: string;
  criadoPor: string;
  criadoEm: string;
  estornado: boolean;
};

export type Turno = {
  id: string;
  abertaEm: string;
  abertaPor: string;
  fechadaEm: string | null;
  fechadaPor: string | null;
  trocoInicialCentavos: number;
  esperadoDinheiroCentavos: number;
  contadoDinheiroCentavos: number | null;
  diferencaCentavos: number | null;
  observacao: string | null;
  resumo: LinhaResumo & { porForma: Record<Forma, LinhaResumo> };
  porCategoria: { categoria: string; entradas: number; saidas: number }[];
  lancamentos: LancamentoDoTurno[];
};

export type TurnoResumo = {
  id: string;
  abertaEm: string;
  abertaPor: string;
  fechadaEm: string | null;
  fechadaPor: string | null;
  trocoInicialCentavos: number;
  diferencaCentavos: number | null;
};
