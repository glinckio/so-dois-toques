import { NotFoundException } from "@nestjs/common";
import type { PerfilUsuario } from "../acesso/regras.js";
import type { AuditoriaService } from "../auditoria/auditoria.service.js";

/** Quem está agindo: usado para o escopo do professor e para a auditoria. */
export type Ator = { id: string; perfil: PerfilUsuario; ip?: string };

export const ehAdmin = (ator: Ator) => ator.perfil === "ADMINISTRADOR";

/**
 * AULAS-CA-20: fora do escopo do professor respondemos "não encontrado" (sem
 * revelar se o registro existe) e registramos a tentativa na auditoria.
 */
export async function negarForaDoEscopo(
  auditoria: AuditoriaService,
  ator: Ator,
  recurso: "aluno" | "turma",
  id: string,
): Promise<never> {
  await auditoria.registrar({
    acao: "ACESSO_NEGADO",
    atorId: ator.id,
    ip: ator.ip,
    alvoTipo: recurso === "aluno" ? "Aluno" : "Turma",
    alvoId: id,
    detalhes: { area: "aulas", recurso },
  });
  throw new NotFoundException(
    recurso === "aluno" ? "Aluno não encontrado." : "Turma não encontrada.",
  );
}
