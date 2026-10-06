import "server-only";
import { z } from "zod";

const esquema = z.object({
  API_URL: z.url().default("http://localhost:3001"),
  INTERNAL_API_KEY: z.string().min(32, "INTERNAL_API_KEY precisa ter pelo menos 32 caracteres"),
});

let cache: z.infer<typeof esquema> | undefined;

/** Variáveis do servidor do web; o erro cita só os nomes, nunca os valores. */
export function envServidor() {
  if (cache) return cache;
  const resultado = esquema.safeParse(process.env);
  if (!resultado.success) {
    const campos = resultado.error.issues.map((i) => i.path.join(".")).join(", ");
    throw new Error(`Variáveis de ambiente inválidas no web: ${campos}`);
  }
  cache = resultado.data;
  return cache;
}
