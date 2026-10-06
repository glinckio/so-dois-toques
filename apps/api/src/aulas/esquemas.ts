import { z } from "zod";
import {
  dataValida,
  HORARIO_MAXIMO,
  HORARIO_MINIMO,
  NIVEIS,
  normalizarTelefone,
  TIPOS_LOCAL,
  VAGAS_MAXIMO,
  VAGAS_MINIMO,
} from "./regras.js";

const MENSAGEM_TELEFONE = "Telefone inválido: informe DDD e número.";

const telefone = z
  .string()
  .max(30)
  .transform((valor, ctx) => {
    const digitos = normalizarTelefone(valor);
    if (!digitos) {
      ctx.addIssue({ code: "custom", message: MENSAGEM_TELEFONE });
      return z.NEVER;
    }
    return digitos;
  });

const textoOpcional = (maximo: number) =>
  z
    .string()
    .trim()
    .max(maximo)
    .nullish()
    .transform((v) => (v ? v : null));

const telefoneOpcional = z
  .string()
  .max(30)
  .nullish()
  .transform((valor, ctx) => {
    if (!valor || !valor.trim()) return null;
    const digitos = normalizarTelefone(valor);
    if (!digitos) {
      ctx.addIssue({ code: "custom", message: MENSAGEM_TELEFONE });
      return z.NEVER;
    }
    return digitos;
  });

const data = z.string().refine(dataValida, "Data inválida.");

export const alunoSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome do aluno.").max(120),
  telefone,
  nascimento: data.refine((d) => d >= "1900-01-01" && d <= new Date().toISOString().slice(0, 10), {
    message: "Data de nascimento inválida.",
  }),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .max(254)
    .nullish()
    .transform((v) => (v ? v : null))
    .refine((v) => v === null || z.email().safeParse(v).success, "E-mail inválido."),
  observacoes: textoOpcional(500),
  emergenciaNome: z.string().trim().min(2, "Informe o contato de emergência.").max(120),
  emergenciaTelefone: telefone,
  responsavelNome: textoOpcional(120),
  responsavelTelefone: telefoneOpcional,
});

/** AULAS-CA-02: o cadastro exige o consentimento marcado. */
export const novoAlunoSchema = alunoSchema.extend({
  consentimento: z.literal(true, {
    error: "Registre o consentimento do aluno (ou do responsável) para salvar o cadastro.",
  }),
});

export const consultaAlunosSchema = z.object({
  busca: z.string().max(120).optional(),
  situacao: z.enum(["ativos", "inativos", "todos"]).default("ativos"),
  pagina: z.coerce.number().int().min(1).max(10000).default(1),
});

export const localSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome do local.").max(80),
  tipo: z.enum(TIPOS_LOCAL),
  endereco: textoOpcional(200),
  ativo: z.boolean().default(true),
});

const horarioSchema = z
  .object({
    diaSemana: z.number().int().min(0).max(6),
    inicio: z.number().int().min(HORARIO_MINIMO, "As aulas começam a partir das 05:00."),
    fim: z.number().int().max(HORARIO_MAXIMO, "As aulas terminam até as 23:59."),
  })
  .refine((h) => h.fim > h.inicio, {
    message: "O fim da aula precisa ser depois do início.",
    path: ["fim"],
  });

export const turmaSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome da turma.").max(80),
  nivel: z.enum(NIVEIS),
  localId: z.uuid(),
  professorId: z.uuid(),
  vagas: z
    .number()
    .int()
    .min(VAGAS_MINIMO, "A turma precisa de pelo menos 1 vaga.")
    .max(VAGAS_MAXIMO, "No máximo 40 vagas."),
  horarios: z.array(horarioSchema).min(1, "Informe pelo menos um dia e horário.").max(14),
});

export const situacaoTurmasSchema = z.object({
  situacao: z.enum(["ativas", "encerradas", "todas"]).default("ativas"),
});

export const matriculaSchema = z.object({ alunoId: z.uuid() });

export const dataSchema = data;

export const presencaSchema = z.object({
  registros: z
    .array(z.object({ alunoId: z.uuid(), presente: z.boolean() }))
    .min(1)
    .max(VAGAS_MAXIMO * 3)
    .refine((r) => new Set(r.map((x) => x.alunoId)).size === r.length, "Aluno repetido na lista."),
});
