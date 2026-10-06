import { createParamDecorator, SetMetadata, type ExecutionContext } from "@nestjs/common";
import type { Area } from "../acesso/regras.js";
import type { RequisicaoApi, UsuarioAutenticado } from "./requisicao.js";

export const PUBLICO = "publico";
/** Rota que não exige sessão (login). A chave interna continua obrigatória. */
export const Publico = () => SetMetadata(PUBLICO, true);

export const SEM_CHAVE_INTERNA = "semChaveInterna";
/** Rota aberta até sem a chave interna (apenas o health check). */
export const SemChaveInterna = () => SetMetadata(SEM_CHAVE_INTERNA, true);

export const PERMITE_TROCA_PENDENTE = "permiteTrocaPendente";
/** Rota liberada mesmo quando o usuário ainda precisa trocar a senha temporária. */
export const PermiteTrocaPendente = () => SetMetadata(PERMITE_TROCA_PENDENTE, true);

export const AREA = "area";
/** Área do sistema exigida pela rota; o perfil do usuário precisa ter acesso a ela. */
export const ExigeArea = (area: Area) => SetMetadata(AREA, area);

export const UsuarioAtual = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): UsuarioAutenticado =>
    ctx.switchToHttp().getRequest<RequisicaoApi>().usuario!,
);

export const IpCliente = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): string | undefined =>
    ctx.switchToHttp().getRequest<RequisicaoApi>().ipCliente,
);

export const SessaoAtual = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): string =>
    ctx.switchToHttp().getRequest<RequisicaoApi>().sessaoId!,
);
