import { Body, Controller, Get, HttpCode, Param, Post, Req } from "@nestjs/common";
import { z } from "zod";
import {
  IpCliente,
  PermiteTrocaPendente,
  Publico,
  SessaoAtual,
  UsuarioAtual,
} from "../comum/decoradores.js";
import type { RequisicaoApi, UsuarioAutenticado } from "../comum/requisicao.js";
import { ZodPipe } from "../comum/zod.pipe.js";
import { AuditoriaService } from "../auditoria/auditoria.service.js";
import { AuthService } from "./auth.service.js";
import { AREAS, areasDoPerfil, podeAcessar, SENHA_MAXIMO } from "./regras.js";

const loginSchema = z.object({
  email: z.string().trim().min(3).max(254),
  senha: z.string().min(1).max(1024),
});

const trocaSenhaSchema = z.object({
  senhaAtual: z.string().min(1).max(1024),
  novaSenha: z
    .string()
    .min(1)
    .max(SENHA_MAXIMO + 1),
});

const areaSchema = z.enum(AREAS);

@Controller()
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly auditoria: AuditoriaService,
  ) {}

  @Publico()
  @Post("auth/login")
  @HttpCode(200)
  login(
    @Body(new ZodPipe(loginSchema)) dados: z.infer<typeof loginSchema>,
    @IpCliente() ip: string | undefined,
    @Req() req: RequisicaoApi,
  ) {
    return this.auth.login(dados, { ip, agente: req.header("x-agente-cliente") });
  }

  @PermiteTrocaPendente()
  @Post("auth/logout")
  @HttpCode(204)
  async logout(
    @SessaoAtual() sessaoId: string,
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @IpCliente() ip: string | undefined,
  ): Promise<void> {
    await this.auth.logout(sessaoId, usuario.id, ip);
  }

  @PermiteTrocaPendente()
  @Get("auth/eu")
  eu(@UsuarioAtual() usuario: UsuarioAutenticado) {
    return { ...usuario, areas: areasDoPerfil(usuario.perfil) };
  }

  @PermiteTrocaPendente()
  @Post("auth/senha")
  @HttpCode(204)
  async trocarSenha(
    @Body(new ZodPipe(trocaSenhaSchema)) dados: z.infer<typeof trocaSenhaSchema>,
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @SessaoAtual() sessaoId: string,
    @IpCliente() ip: string | undefined,
  ): Promise<void> {
    await this.auth.trocarSenha(usuario.id, sessaoId, dados, ip);
  }

  /** Usado pelas telas para decidir se mostram a área ou "Acesso negado". */
  @Get("acesso/:area")
  async acesso(
    @Param("area", new ZodPipe(areaSchema)) area: z.infer<typeof areaSchema>,
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @IpCliente() ip: string | undefined,
  ) {
    const permitido = podeAcessar(usuario.perfil, area);
    if (!permitido) {
      await this.auditoria.registrar({
        acao: "ACESSO_NEGADO",
        atorId: usuario.id,
        ip,
        detalhes: { area, origem: "tela" },
      });
    }
    return { area, permitido };
  }
}
