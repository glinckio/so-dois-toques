import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post } from "@nestjs/common";
import { z } from "zod";
import { PERFIS } from "../acesso/regras.js";
import { ExigeArea, IpCliente, UsuarioAtual } from "../comum/decoradores.js";
import type { UsuarioAutenticado } from "../comum/requisicao.js";
import { ZodPipe } from "../comum/zod.pipe.js";
import { UsuariosService } from "./usuarios.service.js";

const criarSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome").max(120),
  email: z.string().trim().max(254).email("E-mail inválido"),
  perfil: z.enum(PERFIS),
});

const perfilSchema = z.object({ perfil: z.enum(PERFIS) });

@ExigeArea("usuarios")
@Controller("usuarios")
export class UsuariosController {
  constructor(private readonly usuarios: UsuariosService) {}

  @Get()
  listar() {
    return this.usuarios.listar();
  }

  @Post()
  criar(
    @Body(new ZodPipe(criarSchema)) dados: z.infer<typeof criarSchema>,
    @UsuarioAtual() ator: UsuarioAutenticado,
    @IpCliente() ip: string | undefined,
  ) {
    return this.usuarios.criar(dados, { atorId: ator.id, ip });
  }

  @Patch(":id/perfil")
  alterarPerfil(
    @Param("id", ParseUUIDPipe) id: string,
    @Body(new ZodPipe(perfilSchema)) dados: z.infer<typeof perfilSchema>,
    @UsuarioAtual() ator: UsuarioAutenticado,
    @IpCliente() ip: string | undefined,
  ) {
    return this.usuarios.alterarPerfil(id, dados.perfil, { atorId: ator.id, ip });
  }

  @Post(":id/redefinir-senha")
  @HttpCode(200)
  redefinirSenha(
    @Param("id", ParseUUIDPipe) id: string,
    @UsuarioAtual() ator: UsuarioAutenticado,
    @IpCliente() ip: string | undefined,
  ) {
    return this.usuarios.redefinirSenha(id, { atorId: ator.id, ip });
  }

  @Post(":id/desativar")
  @HttpCode(200)
  desativar(
    @Param("id", ParseUUIDPipe) id: string,
    @UsuarioAtual() ator: UsuarioAutenticado,
    @IpCliente() ip: string | undefined,
  ) {
    return this.usuarios.desativar(id, { atorId: ator.id, ip });
  }
}
