import type { Horario, Nivel, TipoLocal } from "./formatacao";

export type Local = {
  id: string;
  nome: string;
  tipo: TipoLocal;
  endereco: string | null;
  ativo: boolean;
};
export type Professor = { id: string; nome: string; perfil: string };

export type TurmaResumo = {
  id: string;
  nome: string;
  nivel: Nivel;
  vagas: number;
  ocupadas: number;
  livres: number;
  ativa: boolean;
  inicio: string;
  local: { id: string; nome: string };
  professor: { id: string; nome: string };
  horarios: Horario[];
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
    turma: { id: string; nome: string; nivel: Nivel; ativa: boolean };
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
