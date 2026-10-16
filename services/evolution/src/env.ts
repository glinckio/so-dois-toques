import { z } from "zod";

const chave = (nome: string) => z.string().min(32, `${nome} precisa ter pelo menos 32 caracteres`);

const envSchema = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(3004),
  /** Chave que a API do sistema manda em x-internal-api-key. */
  INTERNAL_API_KEY: chave("INTERNAL_API_KEY"),
  EVOLUTION_API_URL: z.string().url(),
  EVOLUTION_API_KEY: z.string().min(1),
  /** Endereço deste serviço visto pelo Evolution, para o webhook automático da instância. */
  API_PUBLIC_URL: z.string().url().optional(),
  /** Token que o Evolution manda em ?token= no webhook. */
  WEBHOOK_TOKEN: chave("WEBHOOK_TOKEN"),
});

export type Env = z.infer<typeof envSchema>;

/**
 * CHAT-CA-01: valida as variáveis na subida. A mensagem de erro cita só os nomes,
 * nunca os valores, para não vazar segredos em logs.
 */
export function validarEnv(raw: Record<string, unknown>): Env {
  const resultado = envSchema.safeParse(raw);
  if (!resultado.success) {
    const campos = [...new Set(resultado.error.issues.map((i) => i.path.join(".")))];
    throw new Error(`Variáveis de ambiente inválidas: ${campos.join(", ")}`);
  }
  return resultado.data;
}
