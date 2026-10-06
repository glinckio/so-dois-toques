import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
} from "@nestjs/common";
import type { z } from "zod";
import { ExigeArea, IpCliente, SomenteAdministrador, UsuarioAtual } from "../comum/decoradores.js";
import type { UsuarioAutenticado } from "../comum/requisicao.js";
import { ZodPipe } from "../comum/zod.pipe.js";
import type { Ator } from "./comum.js";
import {
  dataSchema,
  localSchema,
  matriculaSchema,
  presencaSchema,
  situacaoTurmasSchema,
  turmaSchema,
} from "./esquemas.js";
import { TurmasService } from "./turmas.service.js";

const ator = (u: UsuarioAutenticado, ip?: string): Ator => ({ id: u.id, perfil: u.perfil, ip });

@ExigeArea("aulas")
@Controller()
export class TurmasController {
  constructor(private readonly turmas: TurmasService) {}

  @SomenteAdministrador()
  @Get("locais")
  listarLocais() {
    return this.turmas.listarLocais();
  }

  @SomenteAdministrador()
  @Post("locais")
  criarLocal(
    @Body(new ZodPipe(localSchema)) dados: z.infer<typeof localSchema>,
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @IpCliente() ip: string | undefined,
  ) {
    return this.turmas.criarLocal(ator(usuario, ip), dados);
  }

  @SomenteAdministrador()
  @Patch("locais/:id")
  alterarLocal(
    @Param("id", ParseUUIDPipe) id: string,
    @Body(new ZodPipe(localSchema)) dados: z.infer<typeof localSchema>,
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @IpCliente() ip: string | undefined,
  ) {
    return this.turmas.alterarLocal(ator(usuario, ip), id, dados);
  }

  @SomenteAdministrador()
  @Get("professores")
  listarProfessores() {
    return this.turmas.listarProfessores();
  }

  @Get("turmas")
  listar(
    @Query(new ZodPipe(situacaoTurmasSchema)) filtro: z.infer<typeof situacaoTurmasSchema>,
    @UsuarioAtual() usuario: UsuarioAutenticado,
  ) {
    return this.turmas.listar(ator(usuario), filtro.situacao);
  }

  @SomenteAdministrador()
  @Post("turmas")
  criar(
    @Body(new ZodPipe(turmaSchema)) dados: z.infer<typeof turmaSchema>,
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @IpCliente() ip: string | undefined,
  ) {
    return this.turmas.criar(ator(usuario, ip), dados);
  }

  @Get("turmas/:id")
  buscar(
    @Param("id", ParseUUIDPipe) id: string,
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @IpCliente() ip: string | undefined,
  ) {
    return this.turmas.buscar(ator(usuario, ip), id);
  }

  @SomenteAdministrador()
  @Patch("turmas/:id")
  alterar(
    @Param("id", ParseUUIDPipe) id: string,
    @Body(new ZodPipe(turmaSchema)) dados: z.infer<typeof turmaSchema>,
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @IpCliente() ip: string | undefined,
  ) {
    return this.turmas.alterar(ator(usuario, ip), id, dados);
  }

  @SomenteAdministrador()
  @Post("turmas/:id/encerrar")
  @HttpCode(200)
  encerrar(
    @Param("id", ParseUUIDPipe) id: string,
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @IpCliente() ip: string | undefined,
  ) {
    return this.turmas.encerrar(ator(usuario, ip), id);
  }

  @SomenteAdministrador()
  @Post("turmas/:id/matriculas")
  matricular(
    @Param("id", ParseUUIDPipe) id: string,
    @Body(new ZodPipe(matriculaSchema)) dados: z.infer<typeof matriculaSchema>,
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @IpCliente() ip: string | undefined,
  ) {
    return this.turmas.matricular(ator(usuario, ip), id, dados.alunoId);
  }

  @SomenteAdministrador()
  @Post("matriculas/:id/encerrar")
  @HttpCode(200)
  encerrarMatricula(
    @Param("id", ParseUUIDPipe) id: string,
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @IpCliente() ip: string | undefined,
  ) {
    return this.turmas.encerrarMatricula(ator(usuario, ip), id);
  }

  @Get("turmas/:id/presencas/:data")
  listaDePresenca(
    @Param("id", ParseUUIDPipe) id: string,
    @Param("data", new ZodPipe(dataSchema)) data: string,
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @IpCliente() ip: string | undefined,
  ) {
    return this.turmas.listaDePresenca(ator(usuario, ip), id, data);
  }

  @Put("turmas/:id/presencas/:data")
  registrarPresenca(
    @Param("id", ParseUUIDPipe) id: string,
    @Param("data", new ZodPipe(dataSchema)) data: string,
    @Body(new ZodPipe(presencaSchema)) dados: z.infer<typeof presencaSchema>,
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @IpCliente() ip: string | undefined,
  ) {
    return this.turmas.registrarPresenca(ator(usuario, ip), id, data, dados.registros);
  }
}
