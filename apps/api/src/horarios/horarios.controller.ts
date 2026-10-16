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
import type { Ator } from "../aulas/comum.js";
import { ExigeArea, IpCliente, SomenteAdministrador, UsuarioAtual } from "../comum/decoradores.js";
import type { UsuarioAutenticado } from "../comum/requisicao.js";
import { ZodPipe } from "../comum/zod.pipe.js";
import { motivoSchema } from "../mensalidades/esquemas.js";
import {
  alterarQuadraSchema,
  bloqueioSchema,
  consultaGradeSchema,
  quadraSchema,
} from "./esquemas.js";
import { HorariosService } from "./horarios.service.js";

const ator = (u: UsuarioAutenticado, ip?: string): Ator => ({ id: u.id, perfil: u.perfil, ip });

/** Agenda da quadra: todos os perfis veem; só o administrador mexe (FOCO-CA-08). */
@ExigeArea("horarios")
@Controller("horarios")
export class HorariosController {
  constructor(private readonly horarios: HorariosService) {}

  @Get("quadras")
  quadras() {
    return this.horarios.quadras();
  }

  @SomenteAdministrador()
  @Post("quadras")
  criarQuadra(
    @Body(new ZodPipe(quadraSchema)) dados: z.infer<typeof quadraSchema>,
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @IpCliente() ip: string | undefined,
  ) {
    return this.horarios.criarQuadra(ator(usuario, ip), dados.nome);
  }

  @SomenteAdministrador()
  @Patch("quadras/:id")
  alterarQuadra(
    @Param("id", ParseUUIDPipe) id: string,
    @Body(new ZodPipe(alterarQuadraSchema)) dados: z.infer<typeof alterarQuadraSchema>,
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @IpCliente() ip: string | undefined,
  ) {
    return this.horarios.alterarQuadra(ator(usuario, ip), id, dados);
  }

  @Get("grade")
  grade(@Query(new ZodPipe(consultaGradeSchema)) filtro: z.infer<typeof consultaGradeSchema>) {
    return this.horarios.grade(filtro.data, filtro.quadra);
  }

  @SomenteAdministrador()
  @Post("bloqueios")
  bloquear(
    @Body(new ZodPipe(bloqueioSchema)) dados: z.infer<typeof bloqueioSchema>,
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @IpCliente() ip: string | undefined,
  ) {
    return this.horarios.bloquear(ator(usuario, ip), dados);
  }

  @Get("bloqueios/:id")
  bloqueio(@Param("id", ParseUUIDPipe) id: string) {
    return this.horarios.bloqueio(id);
  }

  @SomenteAdministrador()
  @HttpCode(200)
  @Post("bloqueios/:id/cancelar")
  cancelar(
    @Param("id", ParseUUIDPipe) id: string,
    @Body(new ZodPipe(motivoSchema)) dados: z.infer<typeof motivoSchema>,
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @IpCliente() ip: string | undefined,
  ) {
    return this.horarios.cancelar(ator(usuario, ip), id, dados.motivo);
  }

  @Get("series")
  series() {
    return this.horarios.series();
  }

  @SomenteAdministrador()
  @HttpCode(200)
  @Post("series/:id/encerrar")
  encerrarSerie(
    @Param("id", ParseUUIDPipe) id: string,
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @IpCliente() ip: string | undefined,
  ) {
    return this.horarios.encerrarSerie(ator(usuario, ip), id);
  }
}
