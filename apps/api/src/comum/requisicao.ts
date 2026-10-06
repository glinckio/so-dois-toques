import type { Request } from "express";
import type { PerfilUsuario } from "../acesso/regras.js";

export type UsuarioAutenticado = {
  id: string;
  nome: string;
  email: string;
  perfil: PerfilUsuario;
  trocarSenha: boolean;
};

export type RequisicaoApi = Request & {
  ipCliente?: string;
  usuario?: UsuarioAutenticado;
  sessaoId?: string;
};
