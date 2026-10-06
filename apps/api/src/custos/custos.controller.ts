import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
} from "@nestjs/common";
import type { z } from "zod";
import type { Ator } from "../aulas/comum.js";
import { ExigeArea, IpCliente, SomenteAdministrador, UsuarioAtual } from "../comum/decoradores.js";
import type { UsuarioAutenticado } from "../comum/requisicao.js";
import { ZodPipe } from "../comum/zod.pipe.js";
import { motivoSchema } from "../mensalidades/esquemas.js";
import { CustosService } from "./custos.service.js";
import { consultaCustosSchema, pagamentoQuadraSchema, valorHoraSchema } from "./esquemas.js";

const ator = (u: UsuarioAutenticado, ip?: string): Ator => ({ id: u.id, perfil: u.perfil, ip });

/** Custos das quadras parceiras e resultado das aulas: só o administrador (CUSTO-CA-08). */
@ExigeArea("aulas")
@SomenteAdministrador()
@Controller()
export class CustosController {
  constructor(private readonly custos: CustosService) {}

  @Put("locais/:id/valor-hora")
  definirValorHora(
    @Param("id", ParseUUIDPipe) id: string,
    @Body(new ZodPipe(valorHoraSchema)) dados: z.infer<typeof valorHoraSchema>,
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @IpCliente() ip: string | undefined,
  ) {
    return this.custos.definirValorHora(ator(usuario, ip), id, dados.valorHoraCentavos);
  }

  @Get("custos")
  resumo(@Query(new ZodPipe(consultaCustosSchema)) filtro: z.infer<typeof consultaCustosSchema>) {
    return this.custos.resumo(filtro.competencia);
  }

  @Get("custos/resultado")
  resultado(
    @Query(new ZodPipe(consultaCustosSchema)) filtro: z.infer<typeof consultaCustosSchema>,
  ) {
    return this.custos.resultado(filtro.competencia);
  }

  @Post("custos/pagamentos")
  pagar(
    @Body(new ZodPipe(pagamentoQuadraSchema)) dados: z.infer<typeof pagamentoQuadraSchema>,
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @IpCliente() ip: string | undefined,
  ) {
    return this.custos.pagar(ator(usuario, ip), dados);
  }

  @HttpCode(200)
  @Post("custos/pagamentos/:id/estornar")
  estornar(
    @Param("id", ParseUUIDPipe) id: string,
    @Body(new ZodPipe(motivoSchema)) dados: z.infer<typeof motivoSchema>,
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @IpCliente() ip: string | undefined,
  ) {
    return this.custos.estornar(ator(usuario, ip), id, dados.motivo);
  }
}
