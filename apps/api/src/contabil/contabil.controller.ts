import { Controller, Get, Query } from "@nestjs/common";
import { ExigeArea, IpCliente, UsuarioAtual } from "../comum/decoradores.js";
import type { UsuarioAutenticado } from "../comum/requisicao.js";
import { ZodPipe } from "../comum/zod.pipe.js";
import { ContabilService } from "./contabil.service.js";
import { type ConsultaContabil, consultaContabilSchema } from "./esquemas.js";

/** Painel contábil: só o Administrador (CONT-CA-10). */
@ExigeArea("contabil")
@Controller("contabil")
export class ContabilController {
  constructor(private readonly contabil: ContabilService) {}

  @Get("painel")
  painel(@Query(new ZodPipe(consultaContabilSchema)) consulta: ConsultaContabil) {
    return this.contabil.painel(consulta);
  }

  @Get("lancamentos")
  lancamentos(
    @Query(new ZodPipe(consultaContabilSchema)) consulta: ConsultaContabil,
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @IpCliente() ip: string | undefined,
  ) {
    return this.contabil.exportacao({ id: usuario.id, perfil: usuario.perfil, ip }, consulta);
  }
}
