import { z } from "zod";
import {
  CATEGORIAS_TURMA,
  dataValida,
  HORARIO_MAXIMO,
  HORARIO_MINIMO,
  NIVEIS,
  normalizarTelefone,
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

export const telefoneOpcional = z
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

const camposDoAluno = z.object({
  nome: z.string().trim().min(2, "Informe o nome do aluno.").max(120),
  telefone,
  // ALU-CA-01: a data de nascimento é opcional; vazia vira null.
  nascimento: z
    .string()
    .trim()
    .nullish()
    .transform((v) => (v ? v : null))
    .refine(
      (d) =>
        d === null ||
        (dataValida(d) && d >= "1900-01-01" && d <= new Date().toISOString().slice(0, 10)),
      "Data de nascimento inválida.",
    ),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .max(254)
    .nullish()
    .transform((v) => (v ? v : null))
    .refine((v) => v === null || z.email().safeParse(v).success, "E-mail inválido."),
  observacoes: textoOpcional(500),
  // ALU-CA-02: o contato de emergência é opcional, mas nome e telefone andam juntos.
  emergenciaNome: textoOpcional(120),
  emergenciaTelefone: telefoneOpcional,
  responsavelNome: textoOpcional(120),
  responsavelTelefone: telefoneOpcional,
});
/** ALU-CA-02: contato de emergência pela metade (só nome ou só telefone) é recusado. */
const emergenciaCompleta = (a: {
  emergenciaNome: string | null;
  emergenciaTelefone: string | null;
}) => (a.emergenciaNome === null) === (a.emergenciaTelefone === null);
const MENSAGEM_EMERGENCIA =
  "Informe o nome e o telefone do contato de emergência, ou deixe os dois em branco.";

export const alunoSchema = camposDoAluno.refine(emergenciaCompleta, {
  message: MENSAGEM_EMERGENCIA,
  path: ["emergenciaNome"],
});

/** AULAS-CA-02: o cadastro exige o consentimento marcado. */
export const novoAlunoSchema = camposDoAluno
  .extend({
    consentimento: z.literal(true, {
      error: "Registre o consentimento do aluno (ou do responsável) para salvar o cadastro.",
    }),
  })
  .refine(emergenciaCompleta, { message: MENSAGEM_EMERGENCIA, path: ["emergenciaNome"] });

export const consultaAlunosSchema = z.object({
  busca: z.string().max(120).optional(),
  situacao: z.enum(["ativos", "inativos", "todos"]).default("ativos"),
  pagina: z.coerce.number().int().min(1).max(10000).default(1),
});

/** TURMA-CA-01 e 08: dia da semana, início e fim (minutos, 05:00 às 23:59), nível, categoria e vagas. */
export const turmaSchema = z
  .object({
    quadraId: z.uuid("Escolha a quadra."),
    diaSemana: z
      .number()
      .int()
      .min(0, "Escolha o dia da semana.")
      .max(6, "Escolha o dia da semana."),
    horaInicio: z.number().int().min(HORARIO_MINIMO, "As aulas começam a partir das 05:00."),
    horaFim: z.number().int().max(HORARIO_MAXIMO, "As aulas terminam até as 23:59."),
    nivel: z.enum(NIVEIS),
    categoria: z.enum(CATEGORIAS_TURMA, {
      error: "Escolha se a turma é masculina, mista ou feminina.",
    }),
    vagas: z
      .number()
      .int()
      .min(VAGAS_MINIMO, "A turma precisa de pelo menos 1 vaga.")
      .max(VAGAS_MAXIMO, "No máximo 40 vagas."),
  })
  .refine((t) => t.horaFim > t.horaInicio, {
    message: "O fim da aula precisa ser depois do início.",
    path: ["horaFim"],
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
