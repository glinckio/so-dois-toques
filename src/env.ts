import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z
    .string()
    .url()
    .refine((value) => /^postgres(ql)?:\/\//.test(value), {
      message: "DATABASE_URL precisa ser uma URL PostgreSQL",
    }),
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

let cached: Env | undefined;

export function getEnv(): Env {
  cached ??= parseEnv(process.env);
  return cached;
}
