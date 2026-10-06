import type { Forma } from "@/lib/mensalidades/formatacao";

export type PagamentoQuadra = {
  id: string;
  valorCentavos: number;
  forma: Forma;
  data: string;
  pagoPor: string;
  estornadoEm: string | null;
  motivoEstorno: string | null;
};

export type CustoDoLocal = {
  id: string;
  nome: string;
  ativo: boolean;
  valorHoraCentavos: number | null;
  minutos: number;
  previstoCentavos: number | null;
  pagoCentavos: number;
  turmas: { id: string; nome: string; minutos: number }[];
  pagamentos: PagamentoQuadra[];
};

export type CustosDoMes = {
  competencia: string;
  locais: CustoDoLocal[];
  totais: { minutos: number; previstoCentavos: number; pagoCentavos: number };
};

export type Valores = { receitaCentavos: number; custoCentavos: number; resultadoCentavos: number };

export type ResultadoDoMes = {
  competencia: string;
  turmas: (Valores & {
    id: string;
    nome: string;
    local: string;
    professor: { id: string; nome: string };
  })[];
  semTurma: Valores;
  professores: (Valores & { id: string; nome: string; turmas: number })[];
  totais: Valores;
};
