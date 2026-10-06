import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import type { z } from "zod";
import { ExigeArea, IpCliente, SomenteAdministrador, UsuarioAtual } from "../comum/decoradores.js";
import type { UsuarioAutenticado } from "../comum/requisicao.js";
import { ZodPipe } from "../comum/zod.pipe.js";
import { AlunosService } from "./alunos.service.js";
import type { Ator } from "./comum.js";
import { alunoSchema, consultaAlunosSchema, novoAlunoSchema } from "./esquemas.js";

const ator = (u: UsuarioAutenticado, ip?: string): Ator => ({ id: u.id, perfil: u.perfil, ip });

@ExigeArea("aulas")
@Controller("alunos")
export class AlunosController {
  constructor(private readonly alunos: AlunosService) {}

  @Get()
  listar(
    @Query(new ZodPipe(consultaAlunosSchema)) filtro: z.infer<typeof consultaAlunosSchema>,
    @UsuarioAtual() usuario: UsuarioAutenticado,
  ) {
    return this.alunos.listar(ator(usuario), filtro);
  }

  @SomenteAdministrador()
  @Post()
  criar(
    @Body(new ZodPipe(novoAlunoSchema)) dados: z.infer<typeof novoAlunoSchema>,
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @IpCliente() ip: string | undefined,
  ) {
    const { consentimento: _, ...aluno } = dados;
    return this.alunos.criar(ator(usuario, ip), aluno);
  }

  @Get(":id")
  buscar(
    @Param("id", ParseUUIDPipe) id: string,
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @IpCliente() ip: string | undefined,
  ) {
    return this.alunos.buscar(ator(usuario, ip), id);
  }

  @SomenteAdministrador()
  @Patch(":id")
  alterar(
    @Param("id", ParseUUIDPipe) id: string,
    @Body(new ZodPipe(alunoSchema)) dados: z.infer<typeof alunoSchema>,
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @IpCliente() ip: string | undefined,
  ) {
    return this.alunos.alterar(ator(usuario, ip), id, dados);
  }

  @SomenteAdministrador()
  @Post(":id/inativar")
  @HttpCode(200)
  inativar(
    @Param("id", ParseUUIDPipe) id: string,
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @IpCliente() ip: string | undefined,
  ) {
    return this.alunos.inativar(ator(usuario, ip), id);
  }

  @SomenteAdministrador()
  @Post(":id/reativar")
  @HttpCode(200)
  reativar(
    @Param("id", ParseUUIDPipe) id: string,
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @IpCliente() ip: string | undefined,
  ) {
    return this.alunos.reativar(ator(usuario, ip), id);
  }

  @SomenteAdministrador()
  @Get(":id/exportacao")
  exportar(
    @Param("id", ParseUUIDPipe) id: string,
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @IpCliente() ip: string | undefined,
  ) {
    return this.alunos.exportar(ator(usuario, ip), id);
  }

  @SomenteAdministrador()
  @Post(":id/anonimizar")
  @HttpCode(200)
  anonimizar(
    @Param("id", ParseUUIDPipe) id: string,
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @IpCliente() ip: string | undefined,
  ) {
    return this.alunos.anonimizar(ator(usuario, ip), id);
  }
}
