import type { INestApplication } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { cliente, criarUsuario, SENHA_BOA } from "./apoio.js";

export type Api = ReturnType<typeof cliente>;

export async function logado(
  app: INestApplication,
  perfil: "ADMINISTRADOR" | "PROFESSOR" | "ATENDENTE",
) {
  const usuario = await criarUsuario(app, perfil);
  const api = cliente(app);
  return { usuario, api, token: await api.entrar(usuario.email, SENHA_BOA) };
}

export const unico = (prefixo: string) => `${prefixo} ${randomUUID().slice(0, 8)}`;

export function dadosAluno(extra: Record<string, unknown> = {}) {
  return {
    nome: unico("Aluno"),
    telefone: "(21) 99876-5432",
    nascimento: "1990-05-10",
    emergenciaNome: "Maria Contato",
    emergenciaTelefone: "21 3456-7890",
    consentimento: true,
    ...extra,
  };
}

export async function criarAluno(api: Api, token: string, extra: Record<string, unknown> = {}) {
  const resposta = await api.post("/alunos", dadosAluno(extra), token);
  if (resposta.status !== 201) throw new Error(`aluno: ${resposta.status} ${resposta.text}`);
  return resposta.body.id as string;
}

let proximoMinuto = 0;

/**
 * Turma com aula em todos os dias. Sem horário pedido, cada chamada recebe um minuto
 * só dela a partir das 21h: a quadra é uma só e duas turmas ativas não dividem horário
 * (FOCO-CA-04). A agenda é zerada no começo de cada arquivo (limpar-agenda.ts).
 */
export function todosOsDias(inicio?: number, fim?: number) {
  if (inicio === undefined) {
    inicio = 21 * 60 + proximoMinuto++;
    fim = inicio + 1;
  }
  const ate = fim ?? inicio + 60;
  return [0, 1, 2, 3, 4, 5, 6].map((diaSemana) => ({ diaSemana, inicio, fim: ate }));
}
export async function criarTurma(
  api: Api,
  token: string,
  dados: { professorId: string; vagas?: number; horarios?: unknown[] },
) {
  const resposta = await api.post(
    "/turmas",
    {
      nome: unico("Turma"),
      nivel: "INICIANTE",
      vagas: 10,
      horarios: todosOsDias(),
      ...dados,
    },
    token,
  );
  if (resposta.status !== 201) throw new Error(`turma: ${resposta.status} ${resposta.text}`);
  return resposta.body.id as string;
}
