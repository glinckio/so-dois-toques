import type { Forma, Situacao } from "./formatacao";

export type Plano = {
  id: string;
  nome: string;
  aulasPorSemana: number;
  valorCentavos: number;
  ativo: boolean;
  alunos: number;
};

export type Assinatura = {
  id: string;
  plano: { id: string; nome: string; valorCentavos: number; aulasPorSemana: number };
  diaVencimento: number;
  descontoCentavos: number;
  motivoDesconto: string | null;
  valorCentavos: number;
  inicio: string;
  fim: string | null;
};

export type Assinaturas = { vigente: Assinatura | null; historico: Assinatura[] };

export type MensalidadeResumo = {
  id: string;
  aluno: { id: string; nome: string };
  competencia: string;
  valorCentavos: number;
  vencimento: string;
  situacao: Situacao;
  pagamento: { id: string; numeroRecibo: number; forma: Forma; data: string } | null;
};

export type ListaMensalidades = {
  competencia: string;
  totais: { previsto: number; recebido: number; emAberto: number; quantidade: number };
  itens: MensalidadeResumo[];
};

export type MensalidadeDetalhe = MensalidadeResumo & {
  cancelamento: { em: string; motivo: string | null } | null;
  pagamentos: {
    id: string;
    numeroRecibo: number;
    valorCentavos: number;
    forma: Forma;
    data: string;
    recebidoPor: string;
    recebidoEm: string;
    estorno: { em: string; motivo: string | null } | null;
  }[];
};

export type Inadimplentes = {
  totalCentavos: number;
  itens: {
    aluno: { id: string; nome: string; telefone: string };
    quantidade: number;
    totalCentavos: number;
    vencimentoMaisAntigo: string;
    diasDeAtraso: number;
  }[];
};

export type Recibo = {
  id: string;
  numero: number;
  aluno: string;
  competencia: string;
  valorCentavos: number;
  forma: Forma;
  data: string;
  recebidoPor: string;
  recebidoEm: string;
  estornado: boolean;
};

export type LinhaResumo = { entradas: number; saidas: number; saldo: number };

export type CaixaDoDia = {
  data: string;
  resumo: LinhaResumo & { porForma: Record<Forma, LinhaResumo> };
  lancamentos: {
    id: string;
    tipo: "ENTRADA" | "SAIDA";
    valorCentavos: number;
    forma: Forma;
    categoria: "MENSALIDADE" | "ESTORNO";
    descricao: string;
    origemTipo: string | null;
    origemId: string | null;
    estornoDeId: string | null;
    criadoPor: string;
    criadoEm: string;
  }[];
};
