export type HealthStatus = { status: "ok" | "indisponivel"; database: "ok" | "indisponivel" };

type Queryable = { $queryRaw: (query: TemplateStringsArray) => Promise<unknown> };

/**
 * Verifica se o banco responde. Nunca devolve a mensagem do erro, que pode
 * conter endereço do servidor ou usuário do banco.
 */
export async function checkHealth(client: Queryable): Promise<HealthStatus> {
  try {
    await client.$queryRaw`SELECT 1`;
    return { status: "ok", database: "ok" };
  } catch {
    return { status: "indisponivel", database: "indisponivel" };
  }
}
