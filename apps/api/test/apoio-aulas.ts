import type { INestApplication } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { cliente, criarUsuario, SENHA_BOA } from "./apoio.js";

export type Api = ReturnType<typeof cliente>;

export async function logado(app: INestApplication, perfil: "ADMINISTRADOR" | "ATENDENTE") {
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

/** Dia da semana de hoje em São Paulo (0 = domingo). */
export function diaDeHoje() {
  const hoje = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(
    new Date(),
  );
  return new Date(`${hoje}T12:00:00Z`).getUTCDay();
}

/**
 * Horário de turma só desta chamada: um minuto a partir das 21h, no dia de hoje (para a
 * presença de hoje funcionar). A quadra é uma só e duas turmas ativas não dividem horário
 * (TURMA-CA-02); a agenda é zerada no começo de cada arquivo (limpar-agenda.ts).
 */
export function horarioUnico(diaSemana = diaDeHoje()) {
  const horaInicio = 21 * 60 + proximoMinuto++;
  return { diaSemana, horaInicio, horaFim: horaInicio + 1 };
}

/** Turma (dia, horário, nível e vagas); sem horário pedido, usa um só dela. */
export async function criarTurma(
  api: Api,
  token: string,
  dados: {
    diaSemana?: number;
    horaInicio?: number;
    horaFim?: number;
    nivel?: string;
    vagas?: number;
  } = {},
) {
  const resposta = await api.post(
    "/turmas",
    { ...horarioUnico(dados.diaSemana), nivel: "INICIANTE", vagas: 10, ...dados },
    token,
  );
  if (resposta.status !== 201) throw new Error(`turma: ${resposta.status} ${resposta.text}`);
  return resposta.body.id as string;
}
