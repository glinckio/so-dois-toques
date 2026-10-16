import { deDataDoBanco, descreverTurma, hojeEmSaoPaulo, horarioDaTurma } from "../aulas/regras.js";
import type { Prisma } from "../generated/prisma/client.js";
import type { PrismaService } from "../prisma/prisma.service.js";
import type { TurmaNaAgenda } from "./regras.js";

type Cliente = Prisma.TransactionClient | PrismaService;

/**
 * Turmas e bloqueios de uma quadra dividem a agenda dela. Quem cria ou muda turma ou
 * bloqueio trava a agenda daquela quadra até o fim da transação, para que duas mudanças
 * ao mesmo tempo não ocupem o mesmo horário (FOCO-CA-04 e 06, GASTO-CA-02).
 */
export async function travarAgenda(tx: Prisma.TransactionClient, quadraId: string) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`agenda-quadra:${quadraId}`}))`;
}

/** Turmas que dão aula a partir de `desde` (as encerradas antes disso ficam de fora). */
export async function turmasNaAgenda(
  cliente: Cliente,
  filtro: { quadraId: string; ativas?: boolean },
) {
  const turmas = await cliente.turma.findMany({
    where: { quadraId: filtro.quadraId, ...(filtro.ativas ? { ativa: true } : {}) },
    select: {
      id: true,
      nivel: true,
      categoria: true,
      diaSemana: true,
      horaInicio: true,
      horaFim: true,
      inicio: true,
      encerradaEm: true,
    },
  });
  return turmas.map((t): TurmaNaAgenda => ({
    id: t.id,
    nome: descreverTurma(t),
    desde: deDataDoBanco(t.inicio),
    ate: t.encerradaEm ? hojeEmSaoPaulo(t.encerradaEm) : null,
    horarios: [horarioDaTurma(t)],
  }));
}
