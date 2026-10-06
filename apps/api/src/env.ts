import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  DATABASE_URL: z
    .string()
    .url()
    .refine((value) => /^postgres(ql)?:\/\//.test(value), {
      message: "DATABASE_URL precisa ser uma URL PostgreSQL",
    }),
  WEB_ORIGIN: z.string().url().default("http://localhost:3000"),
  /** Segredo compartilhado com o Next.js; só quem tem a chave fala com a API. */
  INTERNAL_API_KEY: z.string().min(32, "INTERNAL_API_KEY precisa ter pelo menos 32 caracteres"),
  /** Gera sozinha as mensalidades do mês (MENS-CA-07). Os testes de integração desligam. */
  GERACAO_AUTOMATICA: z
    .enum(["true", "false"])
    .default("true")
    .transform((valor) => valor === "true"),
});

export type Env = z.infer<typeof envSchema>;

export class InvalidEnvError extends Error {
  constructor(public readonly fields: string[]) {
    super(`Variáveis de ambiente inválidas: ${fields.join(", ")}`);
    this.name = "InvalidEnvError";
  }
}

/**
 * Valida as variáveis de ambiente. A mensagem de erro cita apenas os nomes
 * das variáveis, nunca os valores, para não vazar segredos em logs.
 */
export function parseEnv(raw: Record<string, string | undefined>): Env {
  const result = envSchema.safeParse(raw);
  if (!result.success) {
    const fields = [...new Set(result.error.issues.map((issue) => issue.path.join(".")))];
    throw new InvalidEnvError(fields);
  }
  return result.data;
}
