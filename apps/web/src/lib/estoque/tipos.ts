import type { Forma } from "@/lib/mensalidades/formatacao";
import type { TIPOS_MOVIMENTO } from "./formatacao";

export type Produto = {
  id: string;
  nome: string;
  precoCentavos: number;
  estoqueMinimo: number;
  saldo: number;
  custoMedioCentavos: number;
  ativo: boolean;
  abaixoDoMinimo: boolean;
};

export type Extrato = {
  produto: Produto;
  movimentos: {
    id: string;
    tipo: keyof typeof TIPOS_MOVIMENTO;
    quantidade: number;
    saldoDepois: number;
    motivo: string | null;
    criadoPor: string;
    criadoEm: string;
  }[];
};

export type CompraDoProduto = {
  id: string;
  quantidade: number;
  totalCentavos: number;
  forma: Forma;
  data: string;
  feitaPor: string;
  estornadaEm: string | null;
  motivoEstorno: string | null;
};

export type VendasDoDia = {
  data: string;
  totalCentavos: number;
  vendas: {
    id: string;
    totalCentavos: number;
    forma: Forma;
    feitaPor: string;
    feitaEm: string;
    estornadaEm: string | null;
    motivoEstorno: string | null;
    itens: { produto: string; quantidade: number; precoCentavos: number }[];
  }[];
};
