import { deDataDoBanco, hojeEmSaoPaulo } from "../aulas/regras.js";
import type { Prisma } from "../generated/prisma/client.js";
import type { PrismaService } from "../prisma/prisma.service.js";
import type { TurmaNaAgenda } from "./regras.js";

type Cliente = Prisma.TransactionClient | PrismaService;

/**
 * Turmas, bloqueios e o nome da quadra dividem uma só agenda. Quem cria ou muda turma
 * ou bloqueio trava a agenda até o fim da transação, para que duas mudanças ao mesmo
 * tempo não ocupem o mesmo horário (FOCO-CA-04 e 06).
 */
export async function travarAgenda(tx: Prisma.TransactionClient) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('agenda-quadra'))`;
}

/** Turmas que dão aula a partir de `desde` (as encerradas antes disso ficam de fora). */
export async function turmasNaAgenda(cliente: Cliente, filtro: { ativas?: boolean } = {}) {
  const turmas = await cliente.turma.findMany({
    where: filtro.ativas ? { ativa: true } : {},
    select: {
      id: true,
      nome: true,
      inicio: true,
      encerradaEm: true,
      horarios: { select: { diaSemana: true, inicio: true, fim: true } },
    },
  });
  return turmas.map((t): TurmaNaAgenda => ({
    id: t.id,
    nome: t.nome,
    desde: deDataDoBanco(t.inicio),
    ate: t.encerradaEm ? hojeEmSaoPaulo(t.encerradaEm) : null,
    horarios: t.horarios,
  }));
}
