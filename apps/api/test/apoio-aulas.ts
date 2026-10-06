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

export async function criarLocal(api: Api, token: string) {
  const resposta = await api.post("/locais", { nome: unico("Arena"), tipo: "PARCEIRA" }, token);
  if (resposta.status !== 201) throw new Error(`local: ${resposta.status} ${resposta.text}`);
  return resposta.body.id as string;
}

/** Turma com aula em todos os dias, num horário único por professor para não conflitar. */
export function todosOsDias(inicio = 7 * 60, fim = 8 * 60) {
  return [0, 1, 2, 3, 4, 5, 6].map((diaSemana) => ({ diaSemana, inicio, fim }));
}

export async function criarTurma(
  api: Api,
  token: string,
  dados: { localId: string; professorId: string; vagas?: number; horarios?: unknown[] },
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
