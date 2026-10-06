"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { chamarApi, type RespostaApi } from "@/lib/servidor/api";
import type { EstadoFormulario } from "./estado";

// As regras e a permissão de cada ação ficam na API; aqui só montamos o pedido.

const id = z.uuid();
const texto = (form: FormData, campo: string) => String(form.get(campo) ?? "").trim();

function erroDe(resposta: Extract<RespostaApi<unknown>, { ok: false }>): EstadoFormulario {
  return { erro: resposta.campos?.[0]?.mensagem ?? resposta.mensagem };
}

/**
 * Erro que mantém no formulário o que a pessoa já tinha preenchido. Só copia os campos
 * conhecidos: o nome dos campos vem do navegador e não pode virar chave arbitrária.
 */
function erroComValores(
  estado: EstadoFormulario,
  form: FormData,
  campos: readonly string[],
): EstadoFormulario {
  const valores = new Map<string, string>();
  for (const campo of campos) {
    const valor = form.get(campo);
    if (typeof valor === "string") valores.set(campo, valor);
  }
  return { ...estado, valores: Object.fromEntries(valores) };
}

const CAMPOS_ALUNO = [
  "nome",
  "telefone",
  "nascimento",
  "email",
  "observacoes",
  "emergenciaNome",
  "emergenciaTelefone",
  "responsavelNome",
  "responsavelTelefone",
  "consentimento",
] as const;

const CAMPOS_TURMA = ["nome", "nivel", "localId", "professorId", "vagas"] as const;

export async function salvarAluno(_: EstadoFormulario, form: FormData): Promise<EstadoFormulario> {
  const alunoId = texto(form, "id");
  if (alunoId && !id.safeParse(alunoId).success) return { erro: "Aluno inválido." };
  const dados = {
    nome: texto(form, "nome"),
    telefone: texto(form, "telefone"),
    nascimento: texto(form, "nascimento"),
    email: texto(form, "email"),
    observacoes: texto(form, "observacoes"),
    emergenciaNome: texto(form, "emergenciaNome"),
    emergenciaTelefone: texto(form, "emergenciaTelefone"),
    responsavelNome: texto(form, "responsavelNome"),
    responsavelTelefone: texto(form, "responsavelTelefone"),
  };
  const resposta = alunoId
    ? await chamarApi<{ id: string }>(`/alunos/${alunoId}`, { metodo: "PATCH", corpo: dados })
    : await chamarApi<{ id: string }>("/alunos", {
        metodo: "POST",
        corpo: { ...dados, consentimento: form.get("consentimento") === "on" },
      });
  if (!resposta.ok) return erroComValores(erroDe(resposta), form, CAMPOS_ALUNO);
  redirect(`/aulas/alunos/${resposta.dados.id}?salvo=1`);
}

async function acaoDeAluno(form: FormData, caminho: string): Promise<EstadoFormulario> {
  const alunoId = id.safeParse(form.get("id"));
  if (!alunoId.success) return { erro: "Aluno inválido." };
  const resposta = await chamarApi(`/alunos/${alunoId.data}/${caminho}`, { metodo: "POST" });
  if (!resposta.ok) return erroDe(resposta);
  refresh();
  return {};
}

export async function inativarAluno(_: EstadoFormulario, form: FormData) {
  return acaoDeAluno(form, "inativar");
}

export async function reativarAluno(_: EstadoFormulario, form: FormData) {
  return acaoDeAluno(form, "reativar");
}

/** AULAS-CA-08: pede a palavra ANONIMIZAR para confirmar uma ação sem volta. */
export async function anonimizarAluno(
  _: EstadoFormulario,
  form: FormData,
): Promise<EstadoFormulario> {
  if (texto(form, "confirmacao").toUpperCase() !== "ANONIMIZAR") {
    return { erro: "Digite ANONIMIZAR para confirmar." };
  }
  return acaoDeAluno(form, "anonimizar");
}

const localSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome do local.").max(80),
  tipo: z.enum(["PARCEIRA", "PROPRIA"], { error: "Escolha o tipo do local." }),
  endereco: z.string().trim().max(200),
});

export async function criarLocal(_: EstadoFormulario, form: FormData): Promise<EstadoFormulario> {
  const dados = localSchema.safeParse({
    nome: form.get("nome"),
    tipo: form.get("tipo"),
    endereco: form.get("endereco") ?? "",
  });
  if (!dados.success) return { erro: dados.error.issues[0]?.message ?? "Dados inválidos." };
  const resposta = await chamarApi("/locais", {
    metodo: "POST",
    corpo: { ...dados.data, ativo: true },
  });
  if (!resposta.ok) return erroDe(resposta);
  refresh();
  return { sucesso: `Local ${dados.data.nome} cadastrado.` };
}

export async function alternarLocal(
  _: EstadoFormulario,
  form: FormData,
): Promise<EstadoFormulario> {
  const dados = localSchema.extend({ id, ativo: z.enum(["true", "false"]) }).safeParse({
    id: form.get("id"),
    nome: form.get("nome"),
    tipo: form.get("tipo"),
    endereco: form.get("endereco") ?? "",
    ativo: form.get("ativo"),
  });
  if (!dados.success) return { erro: "Dados inválidos." };
  const { id: localId, ativo, ...resto } = dados.data;
  const resposta = await chamarApi(`/locais/${localId}`, {
    metodo: "PATCH",
    corpo: { ...resto, ativo: ativo === "true" },
  });
  if (!resposta.ok) return erroDe(resposta);
  refresh();
  return {};
}

const horariosSchema = z.array(
  z.object({ diaSemana: z.number().int(), inicio: z.number().int(), fim: z.number().int() }),
);

export async function salvarTurma(_: EstadoFormulario, form: FormData): Promise<EstadoFormulario> {
  const turmaId = texto(form, "id");
  if (turmaId && !id.safeParse(turmaId).success) return { erro: "Turma inválida." };
  let horarios: unknown;
  try {
    horarios = JSON.parse(texto(form, "horarios") || "[]");
  } catch {
    return { erro: "Horários inválidos." };
  }
  const horariosValidos = horariosSchema.safeParse(horarios);
  if (!horariosValidos.success) return { erro: "Horários inválidos." };
  const corpo = {
    nome: texto(form, "nome"),
    nivel: texto(form, "nivel"),
    localId: texto(form, "localId"),
    professorId: texto(form, "professorId"),
    vagas: Number(texto(form, "vagas")),
    horarios: horariosValidos.data,
  };
  const resposta = turmaId
    ? await chamarApi<{ id: string }>(`/turmas/${turmaId}`, { metodo: "PATCH", corpo })
    : await chamarApi<{ id: string }>("/turmas", { metodo: "POST", corpo });
  if (!resposta.ok) return erroComValores(erroDe(resposta), form, CAMPOS_TURMA);
  redirect(`/aulas/turmas/${resposta.dados.id}?salva=1`);
}

export async function encerrarTurma(
  _: EstadoFormulario,
  form: FormData,
): Promise<EstadoFormulario> {
  const turmaId = id.safeParse(form.get("id"));
  if (!turmaId.success) return { erro: "Turma inválida." };
  const resposta = await chamarApi(`/turmas/${turmaId.data}/encerrar`, { metodo: "POST" });
  if (!resposta.ok) return erroDe(resposta);
  refresh();
  return {};
}

export async function matricular(_: EstadoFormulario, form: FormData): Promise<EstadoFormulario> {
  const dados = z.object({ turmaId: id, alunoId: id }).safeParse({
    turmaId: form.get("turmaId"),
    alunoId: form.get("alunoId"),
  });
  if (!dados.success) return { erro: "Dados inválidos." };
  const resposta = await chamarApi(`/turmas/${dados.data.turmaId}/matriculas`, {
    metodo: "POST",
    corpo: { alunoId: dados.data.alunoId },
  });
  if (!resposta.ok) return erroDe(resposta);
  refresh();
  return { sucesso: "Aluno matriculado." };
}

export async function encerrarMatricula(
  _: EstadoFormulario,
  form: FormData,
): Promise<EstadoFormulario> {
  const matriculaId = id.safeParse(form.get("id"));
  if (!matriculaId.success) return { erro: "Matrícula inválida." };
  const resposta = await chamarApi(`/matriculas/${matriculaId.data}/encerrar`, { metodo: "POST" });
  if (!resposta.ok) return erroDe(resposta);
  refresh();
  return {};
}

export async function salvarPresenca(
  _: EstadoFormulario,
  form: FormData,
): Promise<EstadoFormulario> {
  const turmaId = id.safeParse(form.get("turmaId"));
  const data = z.iso.date().safeParse(form.get("data"));
  if (!turmaId.success || !data.success) return { erro: "Dados inválidos." };
  const registros: { alunoId: string; presente: boolean }[] = [];
  for (const [chave, valor] of form.entries()) {
    if (!chave.startsWith("presenca:")) continue;
    const alunoId = id.safeParse(chave.slice("presenca:".length));
    if (alunoId.success && (valor === "presente" || valor === "ausente")) {
      registros.push({ alunoId: alunoId.data, presente: valor === "presente" });
    }
  }
  if (registros.length === 0)
    return { erro: "Marque presente ou ausente para pelo menos um aluno." };
  const resposta = await chamarApi(`/turmas/${turmaId.data}/presencas/${data.data}`, {
    metodo: "PUT",
    corpo: { registros },
  });
  if (!resposta.ok) return erroDe(resposta);
  refresh();
  return { sucesso: "Presença salva." };
}
