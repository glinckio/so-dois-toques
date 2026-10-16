import type { Categoria, Nivel } from "./formatacao";

/** Etapa 16: a turma é um dia e um horário (minutos), com nível e vagas; não tem nome. */
export type TurmaResumo = {
  id: string;
  /** GASTO-CA-02: a quadra onde a turma acontece. */
  quadraId: string;
  quadra: { id: string; nome: string };
  diaSemana: number;
  horaInicio: number;
  horaFim: number;
  nivel: Nivel;
  categoria: Categoria;
  /** "Terça, 19:00 às 20:00 · Iniciante · Misto" */
  descricao: string;
  vagas: number;
  ocupadas: number;
  livres: number;
  ativa: boolean;
  inicio: string;
};

export type TurmaDetalhe = TurmaResumo & {
  matriculas: {
    id: string;
    inicio: string;
    aluno: { id: string; nome: string; telefone: string };
  }[];
};

export type AlunoResumo = {
  id: string;
  nome: string;
  telefone: string;
  ativo: boolean;
  anonimizado: boolean;
};
export type PaginaAlunos = { total: number; pagina: number; tamanho: number; itens: AlunoResumo[] };

export type AlunoDetalhe = {
  id: string;
  nome: string;
  telefone: string;
  emergenciaNome: string | null;
  emergenciaTelefone: string | null;
  responsavelNome: string | null;
  responsavelTelefone: string | null;
  ativo: boolean;
  anonimizado: boolean;
  matriculas: {
    id: string;
    inicio: string;
    fim: string | null;
    turma: { id: string; descricao: string; nivel: Nivel; ativa: boolean };
  }[];
  // Só para o administrador:
  nascimento?: string | null;
  email?: string | null;
  observacoes?: string | null;
  consentimentoEm?: string;
  consentimentoPor?: "ALUNO" | "RESPONSAVEL";
  consentimentoRegistradoPor?: string;
};

export type ListaPresenca = {
  turmaId: string;
  data: string;
  ativa: boolean;
  alunos: {
    alunoId: string;
    nome: string;
    presente: boolean | null;
    registradaPor: string | null;
    registradaEm: string | null;
  }[];
};
