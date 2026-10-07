import type { Forma } from "@/lib/mensalidades/formatacao";

export type Turno = "MANHA" | "TARDE" | "NOITE";

export type OcupacaoTurno = {
  abertas: number;
  bloqueadas: number;
  reservadas: number;
  ocupacaoPercentual: number | null;
};

export type Painel = {
  periodo: { de: string; ate: string };
  receitas: { AULAS: number; LOCACAO: number; LANCHONETE: number; OUTRAS: number };
  despesas: { ESTOQUE: number; QUADRAS_PARCEIRAS: number; OUTRAS: number };
  totalReceitas: number;
  totalDespesas: number;
  resultado: number;
  margemPercentual: number | null;
  gaveta: number;
  naoClassificado: number;
  entradas: number;
  saidas: number;
  confere: boolean;
  porForma: Record<Forma, { entradas: number; saidas: number; saldo: number }>;
  comparativo: { competencia: string; receitas: number; despesas: number; resultado: number }[];
  lanchonete: {
    vendidoCentavos: number;
    custoCentavos: number;
    margemBrutaCentavos: number;
    margemPercentual: number | null;
  };
  ocupacao: {
    id: string;
    nome: string;
    turnos: Record<Turno, OcupacaoTurno>;
    total: OcupacaoTurno;
  }[];
  aReceber: {
    mensalidades: { quantidade: number; valorCentavos: number };
    reservas: { quantidade: number; valorCentavos: number };
  };
};

export type LancamentoExportado = {
  data: string;
  tipo: "ENTRADA" | "SAIDA";
  categoria: string;
  forma: Forma;
  valorCentavos: number;
  descricao: string;
  estorno: boolean;
};
