import { z } from "zod";

const esquema = z
  .object({
    NODE_ENV: z.string().optional(),
    API_URL: z.url().default("http://localhost:3001"),
    INTERNAL_API_KEY: z.string().min(32, "INTERNAL_API_KEY precisa ter pelo menos 32 caracteres"),
    /** Quantos proxies da hospedagem ficam na frente do web (para achar o IP do visitante). */
    IP_SALTOS_CONFIAVEIS: z.coerce.number().int().min(1).max(5).default(1),
  })
  .superRefine((env, ctx) => {
    // LANC-CA-02: em produção, a chave do .env.example não serve.
    if (env.NODE_ENV === "production" && env.INTERNAL_API_KEY.includes("troque-por")) {
      ctx.addIssue({
        code: "custom",
        path: ["INTERNAL_API_KEY"],
        message: "Use uma chave gerada, não a de exemplo",
      });
    }
  });

export type EnvServidor = {
  API_URL: string;
  INTERNAL_API_KEY: string;
  IP_SALTOS_CONFIAVEIS: number;
};

/** Valida as variáveis do servidor do web; o erro cita só os nomes, nunca os valores. */
export function lerEnvServidor(bruto: Record<string, string | undefined>): EnvServidor {
  const resultado = esquema.safeParse(bruto);
  if (!resultado.success) {
    const campos = [...new Set(resultado.error.issues.map((i) => i.path.join(".")))].join(", ");
    throw new Error(`Variáveis de ambiente inválidas no web: ${campos}`);
  }
  const { API_URL, INTERNAL_API_KEY, IP_SALTOS_CONFIAVEIS } = resultado.data;
  return { API_URL, INTERNAL_API_KEY, IP_SALTOS_CONFIAVEIS };
}
