import type { Prisma } from "../generated/prisma/client.js";

/**
 * CAIXA-CA-03: turno aberto em que o novo lançamento entra, ou null. A trava
 * compartilhada espera um fechamento em andamento: o lançamento entra no turno antes
 * de ele fechar, ou fica fora dele, nunca no meio da conta.
 */
export async function turnoParaLancamento(tx: Prisma.TransactionClient): Promise<string | null> {
  const linhas = await tx.$queryRaw<{ id: string }[]>`
    SELECT id FROM "SessaoCaixa" WHERE "fechadaEm" IS NULL FOR SHARE`;
  return linhas[0]?.id ?? null;
}
