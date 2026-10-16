import type { PerfilUsuario } from "../acesso/regras.js";

/** Quem está agindo: usado para o que cada perfil vê e para a auditoria. */
export type Ator = { id: string; perfil: PerfilUsuario; ip?: string };

export const ehAdmin = (ator: Ator) => ator.perfil === "ADMINISTRADOR";
