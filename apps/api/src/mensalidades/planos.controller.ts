import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
} from "@nestjs/common";
import type { z } from "zod";
import type { Ator } from "../aulas/comum.js";
import { ExigeArea, IpCliente, SomenteAdministrador, UsuarioAtual } from "../comum/decoradores.js";
import type { UsuarioAutenticado } from "../comum/requisicao.js";
import { ZodPipe } from "../comum/zod.pipe.js";
import { assinaturaSchema, planoSchema } from "./esquemas.js";
import { PlanosService } from "./planos.service.js";

const ator = (u: UsuarioAutenticado, ip?: string): Ator => ({ id: u.id, perfil: u.perfil, ip });

/** Planos e o plano de cada aluno: só o administrador, dentro de Aulas. */
@ExigeArea("aulas")
@SomenteAdministrador()
@Controller()
export class PlanosController {
  constructor(private readonly planos: PlanosService) {}

  @Get("planos")
  listar() {
    return this.planos.listar();
  }

  @Post("planos")
  criar(
    @Body(new ZodPipe(planoSchema)) dados: z.infer<typeof planoSchema>,
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @IpCliente() ip: string | undefined,
  ) {
    return this.planos.criar(ator(usuario, ip), dados);
  }

  @Patch("planos/:id")
  alterar(
    @Param("id", ParseUUIDPipe) id: string,
    @Body(new ZodPipe(planoSchema)) dados: z.infer<typeof planoSchema>,
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @IpCliente() ip: string | undefined,
  ) {
    return this.planos.alterar(ator(usuario, ip), id, dados);
  }

  @Get("alunos/:id/assinaturas")
  assinaturas(@Param("id", ParseUUIDPipe) id: string) {
    return this.planos.assinaturasDoAluno(id);
  }

  @Put("alunos/:id/assinatura")
  definir(
    @Param("id", ParseUUIDPipe) id: string,
    @Body(new ZodPipe(assinaturaSchema)) dados: z.infer<typeof assinaturaSchema>,
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @IpCliente() ip: string | undefined,
  ) {
    return this.planos.definir(ator(usuario, ip), id, dados);
  }

  @Delete("alunos/:id/assinatura")
  encerrar(
    @Param("id", ParseUUIDPipe) id: string,
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @IpCliente() ip: string | undefined,
  ) {
    return this.planos.encerrar(ator(usuario, ip), id);
  }
}
