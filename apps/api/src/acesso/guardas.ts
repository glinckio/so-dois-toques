import {
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
  type CanActivate,
  type ExecutionContext,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { timingSafeEqual } from "node:crypto";
import { AuditoriaService } from "../auditoria/auditoria.service.js";
import { AREA, PERMITE_TROCA_PENDENTE, PUBLICO, SEM_CHAVE_INTERNA } from "../comum/decoradores.js";
import type { RequisicaoApi } from "../comum/requisicao.js";
import { ENV } from "../config.module.js";
import type { Env } from "../env.js";
import { PrismaService } from "../prisma/prisma.service.js";
import {
  hashToken,
  podeAcessar,
  SESSAO_ATUALIZAR_USO_MS,
  sessaoValida,
  type Area,
} from "./regras.js";

const IP_VALIDO = /^[0-9a-fA-F:.]{2,64}$/;

function chavesIguais(recebida: string, esperada: string): boolean {
  const a = Buffer.from(recebida);
  const b = Buffer.from(esperada);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Só o Next.js (que tem a chave interna) fala com a API. */
@Injectable()
export class ChaveInternaGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(ENV) private readonly env: Env,
  ) {}

  canActivate(ctx: ExecutionContext): boolean {
    if (
      this.reflector.getAllAndOverride<boolean>(SEM_CHAVE_INTERNA, [
        ctx.getHandler(),
        ctx.getClass(),
      ])
    ) {
      return true;
    }
    const req = ctx.switchToHttp().getRequest<RequisicaoApi>();
    const chave = req.header("x-chave-interna");
    if (!chave || !chavesIguais(chave, this.env.INTERNAL_API_KEY)) {
      throw new UnauthorizedException("Não autenticado");
    }
    const ip = req.header("x-ip-cliente");
    req.ipCliente = ip && IP_VALIDO.test(ip) ? ip : undefined;
    return true;
  }
}

/** Confere a sessão do Bearer token (ACESSO-CA-05, 06, 07, 13, 14). */
@Injectable()
export class SessaoGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const alvos = [ctx.getHandler(), ctx.getClass()];
    if (
      this.reflector.getAllAndOverride<boolean>(PUBLICO, alvos) ||
      this.reflector.getAllAndOverride<boolean>(SEM_CHAVE_INTERNA, alvos)
    ) {
      return true;
    }
    const req = ctx.switchToHttp().getRequest<RequisicaoApi>();
    const [tipo, token] = (req.header("authorization") ?? "").split(" ");
    if (tipo !== "Bearer" || !token) throw new UnauthorizedException("Não autenticado");

    const sessao = await this.prisma.sessao.findUnique({
      where: { tokenHash: hashToken(token) },
      include: { usuario: true },
    });
    const agora = new Date();
    if (!sessao || !sessao.usuario.ativo || !sessaoValida(sessao, agora)) {
      if (sessao) await this.prisma.sessao.deleteMany({ where: { id: sessao.id } });
      throw new UnauthorizedException("Sessão expirada. Entre novamente.");
    }
    if (agora.getTime() - sessao.ultimoUsoEm.getTime() > SESSAO_ATUALIZAR_USO_MS) {
      await this.prisma.sessao.update({ where: { id: sessao.id }, data: { ultimoUsoEm: agora } });
    }

    const { usuario } = sessao;
    req.sessaoId = sessao.id;
    req.usuario = {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      perfil: usuario.perfil,
      trocarSenha: usuario.trocarSenha,
    };

    if (
      usuario.trocarSenha &&
      !this.reflector.getAllAndOverride<boolean>(PERMITE_TROCA_PENDENTE, alvos)
    ) {
      throw new ForbiddenException({
        statusCode: 403,
        message: "Defina uma nova senha para continuar.",
        codigo: "TROCA_DE_SENHA_OBRIGATORIA",
      });
    }
    return true;
  }
}

/** Confere se o perfil acessa a área da rota (ACESSO-CA-10). */
@Injectable()
export class PerfisGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly auditoria: AuditoriaService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const area = this.reflector.getAllAndOverride<Area | undefined>(AREA, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (!area) return true;
    const req = ctx.switchToHttp().getRequest<RequisicaoApi>();
    const usuario = req.usuario;
    if (usuario && podeAcessar(usuario.perfil, area)) return true;
    await this.auditoria.registrar({
      acao: "ACESSO_NEGADO",
      atorId: usuario?.id,
      ip: req.ipCliente,
      detalhes: { area, metodo: req.method, rota: req.path },
    });
    throw new ForbiddenException("Acesso negado");
  }
}
